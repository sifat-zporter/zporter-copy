import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { TotalCaloriesBurnedRecordDto } from '../../../dto/GoogleConnect/TotalCaloriesBurnedRecord.dto';

@Injectable()
export class HealthConnectServiceTotalCaloriesBurned {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeTotalCaloriesBurned(
    userId: string,
    dto: TotalCaloriesBurnedRecordDto,
  ) {
    const time = new Date(dto.time);
    const date = this.dateService.getDateKey(time);

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    let existingValue = 0;
    let sources: Set<string> = new Set();

    if (docSnap.exists) {
      const data = docSnap.data();
      existingValue = data?.total_calories_burned?.total_value || 0;
      const existingSources =
        data?.total_calories_burned?.metadata?.sources || [];
      sources = new Set(existingSources);
    }

    const newTotal = existingValue + dto.calories.value;

    if (dto.metadata?.source) {
      sources.add(dto.metadata.source);
    }

    const recordId = uuidv4();

    await docRef.set(
      {
        total_calories_burned: {
          total_value: newTotal,
          unit: dto.calories.unit,
          record_id: recordId,
          last_updated: new Date().toISOString(),
          metadata: {
            sources: Array.from(sources),
          },
        },
      },
      { merge: true },
    );

    // Track the record_id in the `record_id` collection
    let recordIdAdded = false;
    try {
      const recordIdRef = db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId);

      const existingRecordIdSnap = await recordIdRef.get();
      if (!existingRecordIdSnap.exists) {
        await recordIdRef.set({
          userId,
          type: 'TOTAL_CALORIES_BURNED',
          date,
          path: docRef.path,
        });
        recordIdAdded = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        record_id: recordId,
        added_record_id: recordIdAdded,
        aggregated: true,
        message: 'Total calories burned record stored',
        sample_count: 1, // One record per day
      },
    ];
  }

  async getTotalCaloriesBurned(
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
        indexData.type !== 'TOTAL_CALORIES_BURNED'
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

    const data = docSnap.exists ? docSnap.data()?.total_calories_burned : null;

    if (!data) {
      return {
        message: 'No total calories burned data found for the specified date',
        date: targetDate,
        record_id: recordId ?? null,
      };
    }

    if (recordId && data.record_id !== recordId) {
      return {
        message: 'Record ID not found in total calories burned data',
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
  async deleteTotalCaloriesBurned(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // If no date is provided but recordId is, fetch date from record_id index
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
        data.type !== 'TOTAL_CALORIES_BURNED'
      ) {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete Total Calories Burned data.',
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

    const totalCaloriesBurned = docSnap.data()?.total_calories_burned;

    if (!docSnap.exists || totalCaloriesBurned == null) {
      return {
        message: 'No Total Calories Burned data found for this date',
        userId,
        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Delete the total_calories_burned field
    await docRef.set(
      {
        total_calories_burned: null,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Delete from record_id index if recordId is provided
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
      message: 'Total Calories Burned data deleted for this date',

      date,
      aggregated: true,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
