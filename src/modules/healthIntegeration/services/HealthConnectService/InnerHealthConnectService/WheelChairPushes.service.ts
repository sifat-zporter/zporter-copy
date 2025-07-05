import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { WheelchairPushesRecordDto } from '../../../dto/GoogleConnect/WheelChairPushesRecord.dto';

@Injectable()
export class HealthConnectServiceWheelchairPushes {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeWheelchairPushes(userId: string, dto: WheelchairPushesRecordDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const sameDay =
      start.toISOString().split('T')[0] === end.toISOString().split('T')[0];

    const storeAndTrack = async (
      userId: string,
      date: string,
      dto: WheelchairPushesRecordDto,
    ) => {
      const { record_id, sample_count } = await this.storeSampleByDate(
        userId,
        date,
        dto,
      );

      let recordIdAdded = false;
      try {
        const recordIdRef = db
          .collection('users')
          .doc(userId)
          .collection('healthIntegrationData')
          .doc('healthConnect')
          .collection('record_id')
          .doc(record_id);

        const existingRecordIdSnap = await recordIdRef.get();
        if (!existingRecordIdSnap.exists) {
          await recordIdRef.set({
            userId,
            type: 'WHEELCHAIR_PUSHES',
            date,
            path: `users/${userId}/healthIntegrationData/healthConnect/daily_summaries/${date}`,
          });
          recordIdAdded = true;
        }
      } catch (error) {
        console.error('Failed to store record_id index:', error);
      }

      return {
        record_id,
        added_record_id: recordIdAdded,
        aggregated: false,
        message: 'Wheelchair pushes record stored',
        sample_count,
      };
    };

    if (sameDay) {
      const date = this.dateService.getDateKey(start);
      const result = await storeAndTrack(userId, date, dto);
      return [result];
    } else {
      const midnight = new Date(start);
      midnight.setUTCHours(24, 0, 0, 0);

      const firstDate = this.dateService.getDateKey(start);
      const secondDate = this.dateService.getDateKey(end);

      const firstPart: WheelchairPushesRecordDto = {
        ...dto,
        endTime: midnight.toISOString(),
      };

      const secondPart: WheelchairPushesRecordDto = {
        ...dto,
        startTime: midnight.toISOString(),
      };

      const firstResult = await storeAndTrack(userId, firstDate, firstPart);
      const secondResult = await storeAndTrack(userId, secondDate, secondPart);

      return [firstResult, secondResult];
    }
  }

  private async storeSampleByDate(
    userId: string,
    date: string,
    dto: WheelchairPushesRecordDto,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const snap = await docRef.get();
    const existing = snap.exists
      ? snap.data()?.wheelchairPushes?.samples || []
      : [];

    const recordId = uuidv4();

    const sample = {
      id: recordId,
      start_time: dto.startTime,
      end_time: dto.endTime,
      count: dto.count,
      count_unit: dto.countUnit,
      start_zone_offset: dto.startZoneOffset || null,
      end_zone_offset: dto.endZoneOffset || null,
      metadata: dto.metadata || {},
    };

    const updatedSamples = [...existing, sample];

    await docRef.set(
      {
        wheelchairPushes: {
          samples: updatedSamples,
          last_updated: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    return {
      record_id: recordId,
      aggregated: false,
      message: 'Wheelchair pushes record stored',
      sample_count: updatedSamples.length,
    };
  }

  async getWheelchairPushes(
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

      const indexData = recordIndexSnap.data();
      if (
        !indexData ||
        indexData.userId !== userId ||
        indexData.type !== 'WHEELCHAIR_PUSHES'
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

    const data = docSnap.exists ? docSnap.data()?.wheelchairPushes : null;

    if (!data) {
      return {
        message: 'No wheelchair pushes data found for the specified date',
        date: targetDate,
        record_id: recordId ?? null,
      };
    }

    if (recordId && data.record_id !== recordId) {
      return {
        message: 'Record ID not found in wheelchair pushes data',
        date: targetDate,
        record_id: recordId,
      };
    }

    return {
      date: targetDate,
      aggregated: true,
      samples: [
        {
          total_value: data.total_value,
          unit: data.unit,
          metadata: data.metadata || {},
          record_id: data.record_id || null,
        },
      ],
    };
  }

  async deleteWheelchairPushes(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // Step 1: Lookup date from record_id if only recordId is provided
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
        data.type !== 'WHEELCHAIR_PUSHES'
      ) {
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
        'A valid "date" string must be provided to delete Wheelchair Pushes data.',
      );
    }

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    const wheelchairPushes = docSnap.data()?.wheelchairPushes?.samples;

    if (!docSnap.exists || !wheelchairPushes || wheelchairPushes.length === 0) {
      return {
        message: 'No Wheelchair Pushes data found for this date',

        date,
        aggregated: false,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Step 3: Delete the wheelchairPushes field
    await docRef.set(
      {
        wheelchairPushes: null,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Step 4: Delete from record_id index if recordId provided
    let deletedRecordIndex = false;
    if (recordId) {
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
    }

    return {
      message: 'Wheelchair Pushes data deleted for this date',
      date,
      aggregated: false,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
