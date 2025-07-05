import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BasalMetabolicRateRecordDto } from '../../../dto/GoogleConnect/BasicMetabolicRateRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

@Injectable()
export class BasalMetabolicRate {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeBasalMetabolicRate(
    userId: string,
    dto: BasalMetabolicRateRecordDto,
  ) {
    const date = this.dateService.getDateKey(new Date(dto.time));

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();
    let existingSamples: any[] = [];

    if (docSnap.exists) {
      const data = docSnap.data();
      existingSamples = data?.basalMetabolicRate?.samples || [];
    }

    const isDuplicate = existingSamples.some(
      (sample) =>
        sample.time === dto.time &&
        sample.value === dto.basalMetabolicRate.value,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        added_record_id: false,
        aggregated: false,
        message: 'Duplicate BMR record for this time already exists',
        sampleCount: existingSamples.length,
      };
    }

    const plainMetadata = dto.metadata
      ? JSON.parse(JSON.stringify(dto.metadata))
      : {};

    const newSample = {
      id: uuidv4(),
      value: dto.basalMetabolicRate.value,
      unit: dto.basalMetabolicRate.unit,
      time: dto.time,
      metadata: plainMetadata,
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        basalMetabolicRate: {
          samples: updatedSamples,
          lastUpdated: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    let recordIdAdded = false;

    try {
      await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(newSample.id)
        .set({
          userId,
          type: 'BASAL_METABOLIC_RATE',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        record_id: newSample.id,
        added_record_id: recordIdAdded,
        aggregated: false,
        message: 'Basal metabolic rate record stored',
        sampleCount: updatedSamples.length,
      },
    ];
  }

  async getBasalMetabolicRate(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    if (!date && !recordId) {
      throw new Error('Either "date" or "recordId" must be provided.');
    }

    let targetDate = date;

    if (!date && recordId) {
      const recordIndexSnap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!recordIndexSnap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const data = recordIndexSnap.data();
      if (
        !data ||
        data.userId !== userId ||
        data.type !== 'BASAL_METABOLIC_RATE'
      ) {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      targetDate = data.date;
    }

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(targetDate);

    const docSnap = await docRef.get();
    const samples: any[] = docSnap.exists
      ? docSnap.data()?.basalMetabolicRate?.samples || []
      : [];

    if (recordId) {
      const sample = samples.find((s) => s.id === recordId);

      return sample
        ? {
            date: targetDate,
            record_id: sample.id,
            aggregated: false,
            sample,
          }
        : {
            message: 'Sample not found',
            date: targetDate,
            record_id: recordId,
          };
    }

    return {
      date: targetDate,
      aggregated: false,
      samples,
    };
  }

  async deleteBasalMetabolicRate(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // If no date is provided but recordId is, get the date from the record_id index
    if (!date && recordId) {
      const recordIndexSnap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!recordIndexSnap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const data = recordIndexSnap.data();

      if (
        !data ||
        data.userId !== userId ||
        data.type !== 'BASAL_METABOLIC_RATE'
      ) {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    // Validate date after potentially fetching it
    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete BMR data.',
      );
    }

    // Reference to the daily summary doc for the given date
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return {
        message: 'No BMR data found for this date',
        userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.basalMetabolicRate?.samples || [];

    if (recordId) {
      // Delete specific sample by recordId
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No BMR record found with the provided ID',
          userId,
          date,
          deleted: false,
        };
      }

      // Update doc with filtered samples
      await docRef.set(
        {
          basalMetabolicRate: {
            samples: filteredSamples,
            lastUpdated: new Date().toISOString(),
          },
        },
        { merge: true },
      );

      // Delete record_id index doc
      let deletedRecordIndex = false;
      try {
        await db
          .collection('users')
          .doc(userId)
          .collection('healthIntegrationData')
          .doc('healthConnect')
          .collection('record_id')
          .doc(recordId)
          .delete();
        deletedRecordIndex = true;
      } catch (err) {
        console.error('Failed to delete record from index:', err);
      }

      return {
        message: 'BMR sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // If no recordId provided, delete all BMR data for the date

    // Delete all record_id docs for samples of this date using batch
    const batch = db.batch();

    for (const sample of existingSamples) {
      const recordIdDocRef = db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(sample.id);

      batch.delete(recordIdDocRef);
    }

    await batch.commit();

    // Clear all samples in the main doc
    await docRef.set(
      {
        basalMetabolicRate: {},
      },
      { merge: true },
    );

    return {
      message:
        'All BMR data for this date deleted, including record index docs',
      date,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
      //add all the fields here also
    };
  }
}
