import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { DistanceRecordDto } from '../../../dto/GoogleConnect/DistanceRecord.dto';
import { db } from '../../../../../config/firebase.config';

@Injectable()
export class Distance {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeDistanceRecord(userId: string, dto: DistanceRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const isSameDay =
      startTime.toISOString().split('T')[0] ===
      endTime.toISOString().split('T')[0];

    if (isSameDay) {
      const dateKey = this.dateService.getDateKey(startTime);
      const result = await this.storeAggregatedDistance(userId, dateKey, dto);
      return [{ date: dateKey, ...result }];
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const firstDto: DistanceRecordDto = {
        ...dto,
        endTime: midnight.toISOString(),
      };

      const secondDto: DistanceRecordDto = {
        ...dto,
        startTime: midnight.toISOString(),
      };

      const firstResult = await this.storeAggregatedDistance(
        userId,
        firstDate,
        firstDto,
      );
      const secondResult = await this.storeAggregatedDistance(
        userId,
        secondDate,
        secondDto,
      );

      return [
        { date: firstDate, ...firstResult },
        { date: secondDate, ...secondResult },
      ];
    }
  }

  private async storeAggregatedDistance(
    userId: string,
    date: string,
    dto: DistanceRecordDto,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const recordId = uuidv4();

    const sample = {
      id: recordId,
      distance: JSON.parse(JSON.stringify(dto.distance)),
      startTime: dto.startTime,
      endTime: dto.endTime,
      startZoneOffset: dto.startZoneOffset || null,
      endZoneOffset: dto.endZoneOffset || null,
      metadata: dto.metadata || {},
    };

    await docRef.set(
      {
        distance: {
          sample,
          lastUpdated: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    let recordIdAdded = false;

    try {
      const recordIdRef = db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId);

      const existingSnap = await recordIdRef.get();

      if (!existingSnap.exists) {
        await recordIdRef.set({
          userId,
          type: 'DISTANCE',
          date,
          path: docRef.path,
        });
        recordIdAdded = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      record_id: recordId,
      added_record_id: recordIdAdded,
      aggregated: true,
      sampleCount: 1,
      message: 'Distance record stored',
    };
  }

  async getDistanceRecord(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    if (!date && !recordId) {
      throw new Error('Either "date" or "recordId" must be provided.');
    }

    let targetDate = date;

    if (!date && recordId) {
      const recordSnap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!recordSnap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const indexData = recordSnap.data();
      if (
        !indexData ||
        indexData.userId !== userId ||
        indexData.type !== 'DISTANCE'
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

    const sample = docSnap.exists ? docSnap.data()?.distance?.sample : null;

    if (!sample) {
      return {
        date: targetDate,
        record_id: recordId ?? null,
        aggregated: true,
        samples: [],
      };
    }

    if (recordId && sample.id !== recordId) {
      return {
        message: 'Distance record with specified record_id not found',
        date: targetDate,
        record_id: recordId,
        aggregated: true,
        samples: [],
      };
    }

    return {
      date: targetDate,

      aggregated: true,
      samples: [sample],
    };
  }

  async deleteDistanceRecord(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // Step 1: Resolve date from recordId if not provided
    if (!date && recordId) {
      const recordSnap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!recordSnap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const data = recordSnap.data();
      if (!data || data.userId !== userId || data.type !== 'DISTANCE') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    // Step 2: Validate date
    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete Distance data.',
      );
    }

    // Step 3: Get the document for the specific date
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
        message: 'No Distance data found for this date',

        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    const sample = docSnap.data()?.distance?.sample;

    if (!sample) {
      return {
        message: 'No Distance data found for this date',

        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Step 4: If recordId is provided, ensure it matches the sample's ID
    if (recordId && sample.id !== recordId) {
      return {
        message: 'Distance record with specified record_id not found',

        date,
        aggregated: true,
        deleted_record_id: recordId,
        deleted_record_index: false,
        remaining_sample_count: 1,
      };
    }

    // Step 5: Delete distance data from the daily summary
    await docRef.set(
      {
        distance: {},
      },
      { merge: true },
    );

    // Step 6: Delete the record_id index entry
    let deletedRecordIndex = false;
    try {
      await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(sample.id)
        .delete();

      deletedRecordIndex = true;
    } catch (error) {
      console.error('Failed to delete record_id from index:', error);
    }

    return {
      message: 'Distance record deleted successfully',

      date,
      aggregated: true,
      deleted_record_id: sample.id,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
