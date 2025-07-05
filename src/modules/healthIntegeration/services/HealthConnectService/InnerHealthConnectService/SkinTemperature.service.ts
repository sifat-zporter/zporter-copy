import { Injectable } from '@nestjs/common';
import { SkinTemperatureRecordDto } from '../../../dto/GoogleConnect/SkinTemperatureRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class HealthConnectServiceSkinTemperature {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeSkinTemperature(userId: string, dto: SkinTemperatureRecordDto) {
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
      existingSamples = data?.skinTemperature?.samples || [];
    }

    const isDuplicate = existingSamples.some(
      (sample) =>
        sample.time === dto.time && sample.value === dto.temperature.value,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        added_record_id: false,
        aggregated: false,
        message:
          'Duplicate skin temperature record for this time already exists',
        sampleCount: existingSamples.length,
      };
    }

    const plainMetadata = dto.metadata
      ? JSON.parse(JSON.stringify(dto.metadata))
      : {};

    const newSample = {
      id: uuidv4(),
      value: dto.temperature.value,
      unit: dto.temperature.unit,
      time: dto.time,
      metadata: plainMetadata,
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        skinTemperature: {
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
          type: 'SKIN_TEMPERATURE',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        date,
        record_id: newSample.id,
        added_record_id: recordIdAdded,
        aggregated: false,
        message: 'Skin temperature record stored',
        sampleCount: updatedSamples.length,
      },
    ];
  }

  async getSkinTemperature(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    if (!date && !recordId) {
      throw new Error('Either "date" or "recordId" must be provided.');
    }

    let targetDate = date;

    if (!date && recordId) {
      const snap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!snap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const data = snap.data();
      if (!data || data.userId !== userId || data.type !== 'SKIN_TEMPERATURE') {
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
    const skinData = docSnap.exists
      ? docSnap.data()?.skinTemperature || {}
      : {};
    const samples: any[] = skinData.samples || [];

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
      aggregated: false,
      date: targetDate,
      samples,
    };
  }

  async deleteSkinTemperatureData(
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

      if (!data || data.userId !== userId || data.type !== 'SKIN_TEMPERATURE') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    // Validate date
    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete skin temperature data.',
      );
    }

    // Reference to the daily summary doc
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
        message: 'No skin temperature data found for this date',
        user_id: userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.skinTemperature?.samples || [];

    if (recordId) {
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No skin temperature record found with the provided ID',
          user_id: userId,
          date,
          deleted: false,
        };
      }

      // Update the doc with filtered samples
      await docRef.set(
        {
          skinTemperature: {
            samples: filteredSamples,
            lastUpdated: new Date().toISOString(),
          },
        },
        { merge: true },
      );

      // Delete from record_id index
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
        message: 'Skin temperature sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // If no recordId provided, delete all samples
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
        skinTemperature: {},
      },
      { merge: true },
    );

    return {
      message:
        'All skin temperature data for this date deleted, including record index docs',
      date,
      user_id: userId,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
