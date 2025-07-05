import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

interface StepsRecordDto {
  count: number;
  startTime: string;
  endTime: string;
  startZoneOffset?: string;
  endZoneOffset?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class HealthConnectServiceSteps {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeSteps(userId: string, dto: StepsRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const startDate = this.dateService.getDateKey(startTime);
    const endDate = this.dateService.getDateKey(endTime);

    const result = [];

    if (startDate === endDate) {
      const recordId = uuidv4();
      const stepCount = dto.count;

      const updateResult = await this.updateStepsForDate(
        userId,
        startDate,
        stepCount,
        dto.metadata,
        recordId,
      );

      result.push({
        record_id: recordId,
        added_record_id: updateResult.added_record_id,
        aggregated: true,
        message: 'Step data stored',
        step_count: stepCount,
        sample_count: updateResult.sample_count,
      });
    } else {
      // Split steps proportionally based on duration
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const totalDuration = endTime.getTime() - startTime.getTime();
      const firstDuration = midnight.getTime() - startTime.getTime();
      const secondDuration = endTime.getTime() - midnight.getTime();

      const stepsFirstDay = Math.round(
        dto.count * (firstDuration / totalDuration),
      );
      const stepsSecondDay = dto.count - stepsFirstDay;

      const recordId1 = uuidv4();
      const recordId2 = uuidv4();

      const updateResult1 = await this.updateStepsForDate(
        userId,
        startDate,
        stepsFirstDay,
        dto.metadata,
        recordId1,
      );
      const updateResult2 = await this.updateStepsForDate(
        userId,
        endDate,
        stepsSecondDay,
        dto.metadata,
        recordId2,
      );

      result.push({
        //  date: startDate,
        record_id: recordId1,
        added_record_id: updateResult1.added_record_id,
        aggregated: true,
        message: 'Step data stored',

        sample_count: updateResult1.sample_count,
      });

      result.push({
        //   date: endDate,
        record_id: recordId2,
        added_record_id: updateResult2.added_record_id,
        aggregated: true,
        message: 'Step data stored',

        sample_count: updateResult2.sample_count,
      });
    }

    return result;
  }

  private async updateStepsForDate(
    userId: string,
    date: string,
    steps: number,
    metadata: Record<string, any> | undefined,
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
    let existingSteps = 0;
    let sampleCount = 0;
    let sources: Set<string> = new Set();

    if (docSnap.exists) {
      const data = docSnap.data();
      existingSteps = data?.steps?.step_count || 0;
      sampleCount = data?.steps?.sample_count || 0;
      const existingSources = data?.steps?.metadata?.sources || [];
      sources = new Set(existingSources);
    }

    const totalSteps = existingSteps + steps;
    const newSampleCount = sampleCount + 1;
    if (metadata?.source) {
      sources.add(metadata.source);
    }

    await docRef.set(
      {
        steps: {
          step_count: totalSteps,
          last_updated: new Date().toISOString(),
          record_id: recordId,
          sample_count: newSampleCount,
          metadata: {
            sources: Array.from(sources),
          },
        },
      },
      { merge: true },
    );

    // Store record_id in record_id collection only if not exists
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
          type: 'STEPS',
          date,
          path: docRef.path,
        });
        recordIdAdded = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      sample_count: newSampleCount,
      added_record_id: recordIdAdded,
    };
  }

  async getSteps(
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
        indexData.type !== 'STEPS'
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

    const stepData = docSnap.exists ? docSnap.data()?.steps : null;

    if (!stepData) {
      return {
        date: targetDate,
        record_id: recordId ?? null,
        aggregated: true,
        samples: [],
      };
    }

    if (recordId && stepData.record_id !== recordId) {
      return {
        message: 'Step record with specified record_id not found',
        date: targetDate,
        record_id: recordId,
        aggregated: true,
        samples: [],
      };
    }

    return {
      date: targetDate,

      aggregated: true,
      samples: [
        {
          step_count: stepData.step_count || 0,
          metadata: stepData.metadata || {},
          record_id: stepData.record_id || null,
        },
      ],
    };
  }

  async deleteSteps(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // Resolve date from recordId if date not provided
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
      if (!data || data.userId !== userId || data.type !== 'STEPS') {
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
        'A valid "date" string must be provided to delete Steps data.',
      );
    }

    // Reference to the daily summary doc for the date
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    const stepsData = docSnap.data()?.steps;

    if (!docSnap.exists || stepsData == null) {
      return {
        message: 'No Steps data found for this date',
        userId,
        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Delete the steps field
    await docRef.set(
      {
        steps: null,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Delete record_id doc if recordId provided
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
      message: 'Steps data deleted for this date',

      date,
      aggregated: true,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
