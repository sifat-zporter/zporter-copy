import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { CyclingPedalingCadenceRecordDto } from '../../../dto/GoogleConnect/CyclingPedalingCadenceRecord.dto';

@Injectable()
export class CadenceRecord {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeCyclingCadence(
    userId: string,
    dto: CyclingPedalingCadenceRecordDto,
  ) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const sameDay =
      this.dateService.getDateKey(startTime) ===
      this.dateService.getDateKey(endTime);

    const plainMetadata = dto.metadata
      ? JSON.parse(JSON.stringify(dto.metadata))
      : {};

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const result = await this.storeSampleByDate(userId, date, {
        ...dto,
        metadata: plainMetadata,
      });

      return [{ date, ...result }];
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const firstPart: CyclingPedalingCadenceRecordDto = {
        ...dto,
        endTime: midnight.toISOString(),
        metadata: plainMetadata,
      };

      const secondPart: CyclingPedalingCadenceRecordDto = {
        ...dto,
        startTime: midnight.toISOString(),
        metadata: plainMetadata,
      };

      const [firstResult, secondResult] = await Promise.all([
        this.storeSampleByDate(userId, firstDate, firstPart),
        this.storeSampleByDate(userId, secondDate, secondPart),
      ]);

      return [
        { date: firstDate, ...firstResult },
        { date: secondDate, ...secondResult },
      ];
    }
  }

  private async storeSampleByDate(
    userId: string,
    date: string,
    dto: CyclingPedalingCadenceRecordDto,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();
    const existingSamples: any[] = docSnap.exists
      ? docSnap.data()?.cyclingCadence?.samples || []
      : [];

    const isDuplicate = existingSamples.some(
      (s) =>
        s.startTime === dto.startTime &&
        s.revolutionsPerMinute === dto.revolutionsPerMinute,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        added_record_id: false,
        aggregated: false,
        message:
          'Duplicate cycling cadence record for this time already exists',
        sampleCount: existingSamples.length,
      };
    }

    const newSample = {
      id: uuidv4(),
      revolutionsPerMinute: dto.revolutionsPerMinute,
      startTime: dto.startTime,
      endTime: dto.endTime,
      startZoneOffset: dto.startZoneOffset || null,
      endZoneOffset: dto.endZoneOffset || null,
      metadata: dto.metadata || {},
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        cyclingCadence: {
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
          type: 'CYCLING_CADENCE',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (err) {
      console.error('Failed to store record_id index:', err);
    }

    return {
      record_id: newSample.id,
      added_record_id: recordIdAdded,
      aggregated: false,
      message: 'Cycling cadence record stored',
      sampleCount: updatedSamples.length,
    };
  }

  async getCyclingCadence(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    if (!date && !recordId) {
      throw new Error('Either "date" or "recordId" must be provided.');
    }

    let targetDate = date;

    if (!date && recordId) {
      const indexSnap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!indexSnap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const indexData = indexSnap.data();
      if (
        !indexData ||
        indexData.userId !== userId ||
        indexData.type !== 'CYCLING_CADENCE'
      ) {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      targetDate = indexData.date;
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
      ? docSnap.data()?.cyclingCadence?.samples || []
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
  async deleteCyclingCadence(
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

      if (!data || data.userId !== userId || data.type !== 'CYCLING_CADENCE') {
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
        'A valid "date" string must be provided to delete cycling cadence data.',
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
        message: 'No cycling cadence data found for this date',
        userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.cyclingCadence?.samples || [];

    if (recordId) {
      // Delete specific sample by recordId
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No cadence record found with the provided ID',
          userId,
          date,
          deleted: false,
        };
      }

      // Update doc with filtered samples
      await docRef.set(
        {
          cyclingCadence: {
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
        message: 'Cycling cadence sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // If no recordId provided, delete all cadence data for the date

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
        cyclingCadence: {},
      },
      { merge: true },
    );

    return {
      message:
        'All cycling cadence data for this date deleted, including record index docs',
      date,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
