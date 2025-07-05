import { Injectable } from '@nestjs/common';
import { ElevationGainedRecordDto } from '../../../dto/GoogleConnect/ElevationGainedRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HealthConnectServiceElevationGained {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeElevationGained(userId: string, dto: ElevationGainedRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const sameDay =
      startTime.toISOString().split('T')[0] ===
      endTime.toISOString().split('T')[0];

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const result = await this.storeSampleByDate(userId, date, dto);
      return [{ date, ...result }];
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const totalDuration = endTime.getTime() - startTime.getTime();
      const firstDuration = midnight.getTime() - startTime.getTime();
      const secondDuration = endTime.getTime() - midnight.getTime();

      const elevationFirstDay =
        dto.elevationGained.value * (firstDuration / totalDuration);
      const elevationSecondDay =
        dto.elevationGained.value * (secondDuration / totalDuration);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const firstResult = await this.storeSampleByDate(userId, firstDate, {
        ...dto,
        endTime: midnight.toISOString(),
        elevationGained: {
          value: elevationFirstDay,
          unit: dto.elevationGained.unit,
        },
      });

      const secondResult = await this.storeSampleByDate(userId, secondDate, {
        ...dto,
        startTime: midnight.toISOString(),
        elevationGained: {
          value: elevationSecondDay,
          unit: dto.elevationGained.unit,
        },
      });

      return [
        { date: firstDate, ...firstResult },
        { date: secondDate, ...secondResult },
      ];
    }
  }

  private async storeSampleByDate(
    userId: string,
    date: string,
    dto: ElevationGainedRecordDto,
  ) {
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
      existingSamples = data?.elevationGained?.samples || [];
    }

    // Deduplication check:
    const isDuplicate = existingSamples.some(
      (sample) =>
        sample.start_time === dto.startTime &&
        sample.end_time === dto.endTime &&
        sample.value === dto.elevationGained.value,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        added_record_id: false,
        aggregated: false,
        message:
          'Duplicate elevation gained record for this time already exists',
        sample_count: existingSamples.length,
      };
    }

    const plainMetadata = dto.metadata
      ? JSON.parse(JSON.stringify(dto.metadata))
      : {};

    const newSample = {
      id: uuidv4(),
      start_time: dto.startTime,
      end_time: dto.endTime,
      value: dto.elevationGained.value,
      unit: dto.elevationGained.unit,
      metadata: plainMetadata,
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        elevationGained: {
          samples: updatedSamples,
          last_updated: new Date().toISOString(),
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
          type: 'ELEVATION_GAINED',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      record_id: newSample.id,
      added_record_id: recordIdAdded,
      aggregated: false,
      message: 'Elevation gained record stored',
      sample_count: updatedSamples.length,
    };
  }

  async getElevationGainedRecord(
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
      if (!data || data.userId !== userId || data.type !== 'ELEVATION_GAINED') {
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
      ? docSnap.data()?.elevationGained?.samples || []
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

  async deleteElevationGainedRecord(
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

      if (!data || data.userId !== userId || data.type !== 'ELEVATION_GAINED') {
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
        'A valid "date" string must be provided to delete elevation gained data.',
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
        message: 'No elevation gained data found for this date',
        user_id: userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.elevationGained?.samples || [];

    if (recordId) {
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No elevation gained record found with the provided ID',

          date,
          deleted: false,
        };
      }

      // Update doc with filtered samples
      await docRef.set(
        {
          elevationGained: {
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
        message: 'Elevation gained record deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // Delete all samples and their record_id docs
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
        elevationGained: {},
      },
      { merge: true },
    );

    return {
      message:
        'All elevation gained records deleted for this date, including record index docs',
      date,

      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
