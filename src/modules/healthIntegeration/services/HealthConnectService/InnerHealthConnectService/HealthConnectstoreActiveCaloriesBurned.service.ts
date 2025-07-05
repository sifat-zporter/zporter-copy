import { Injectable } from '@nestjs/common';
import { ActiveCaloriesBurnedRecordDto } from '../../../dto/GoogleConnect/ActiveCaloriesBurnedRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HealthConnectServiceCaloriesBurned {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeActiveCaloriesBurned(
    userId: string,
    dto: ActiveCaloriesBurnedRecordDto,
  ) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const sameDay =
      startTime.toISOString().split('T')[0] ===
      endTime.toISOString().split('T')[0];

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const recordId = uuidv4();
      const result = await this.updateCaloriesForDate(
        userId,
        date,
        dto.energy.value,
        dto.metadata,
        recordId,
      );

      return {
        record_id: result.record_id,
        added_record_id: result.added_record_id,
        aggregated: true,
        message: 'Active calories burned record stored',
        sample_count: result.sample_count,
      };
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const totalDuration = endTime.getTime() - startTime.getTime();
      const firstDuration = midnight.getTime() - startTime.getTime();
      const secondDuration = endTime.getTime() - midnight.getTime();

      const caloriesFirstDay =
        dto.energy.value * (firstDuration / totalDuration);
      const caloriesSecondDay =
        dto.energy.value * (secondDuration / totalDuration);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const recordId1 = uuidv4();
      const recordId2 = uuidv4();

      const result1 = await this.updateCaloriesForDate(
        userId,
        firstDate,
        caloriesFirstDay,
        dto.metadata,
        recordId1,
      );

      const result2 = await this.updateCaloriesForDate(
        userId,
        secondDate,
        caloriesSecondDay,
        dto.metadata,
        recordId2,
      );

      return [
        {
          record_id: result1.record_id,
          added_record_id: result1.added_record_id,
          aggregated: true,
          message: 'Active calories burned record stored',
          sample_count: result1.sample_count,
        },
        {
          record_id: result2.record_id,
          added_record_id: result2.added_record_id,
          aggregated: true,
          message: 'Active calories burned record stored',
          sample_count: result2.sample_count,
        },
      ];
    }
  }

  private async updateCaloriesForDate(
    userId: string,
    date: string,
    calories: number,
    metadata: Record<string, any> = {},
    recordId: string,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    let existingCalories = 0;
    let sampleCount = 0;
    const storedMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {};

    if (docSnap.exists) {
      const data = docSnap.data();
      existingCalories = data?.activeCaloriesBurned?.value || 0;
      sampleCount = data?.activeCaloriesBurned?.sample_count || 0;
    }

    const totalCalories = existingCalories + calories;
    const newSampleCount = sampleCount + 1;

    await docRef.set(
      {
        activeCaloriesBurned: {
          value: totalCalories,
          unit: 'kcal',
          last_updated: new Date().toISOString(),
          metadata: storedMetadata,
          sample_count: newSampleCount,
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

      const existingRecordIdSnap = await recordIdRef.get();
      if (!existingRecordIdSnap.exists) {
        await recordIdRef.set({
          userId,
          type: 'ACTIVE_CALORIES',
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
      sample_count: newSampleCount,
    };
  }

  async getActiveCaloriesBurned(
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
      if (!data || data.userId !== userId || data.type !== 'ACTIVE_CALORIES') {
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
      ? docSnap.data()?.activeCaloriesBurned?.samples || []
      : [];

    if (recordId) {
      const sample = samples.find((s) => s.id === recordId);

      return sample
        ? {
            date: targetDate,
            record_id: sample.id,
            aggregated: true,
            samples: [sample],
          }
        : {
            message: 'Sample not found',
            date: targetDate,
            record_id: recordId,
          };
    }

    return {
      date: targetDate,
      aggregated: true,
      samples,
    };
  }

  async deleteActiveCaloriesBurned(
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

      if (!data || data.userId !== userId || data.type !== 'ACTIVE_CALORIES') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete Active Calories Burned data.',
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

    if (!docSnap.exists) {
      return {
        message: 'No Active Calories Burned data found for this date',

        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    const data = docSnap.data();
    const existingData = data?.activeCaloriesBurned || null;

    if (!existingData || Object.keys(existingData).length === 0) {
      return {
        message: 'No Active Calories Burned data to delete',

        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Delete the activeCaloriesBurned field
    await docRef.set(
      {
        activeCaloriesBurned: {},
      },
      { merge: true },
    );

    // Try deleting the recordId index entry, if recordId is provided
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
      message: 'Active Calories Burned data deleted',

      date,
      aggregated: true,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
