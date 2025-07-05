import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

interface StepsCadenceSample {
  time: string;
  stepsPerMinute: number;
}

interface StepsCadenceRecordDto {
  samples: StepsCadenceSample[];
  startTime: string;
  endTime: string;
  startZoneOffset?: string;
  endZoneOffset?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class HealthConnectServiceStepsCadence {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeStepsCadence(userId: string, dto: StepsCadenceRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const startDate = this.dateService.getDateKey(startTime);
    const endDate = this.dateService.getDateKey(endTime);

    const results = [];

    if (startDate === endDate) {
      const recordId = uuidv4();
      const updateResult = await this.updateCadenceForDate(
        userId,
        startDate,
        dto.samples,
        dto.metadata,
        recordId,
      );
      results.push({
        record_id: recordId,
        added_record_id: updateResult.added_record_id,
        aggregated: true,
        message: 'steps cadence data stored',
        sample_count: updateResult.sample_count,
      });
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const firstDaySamples = dto.samples.filter(
        (s) => new Date(s.time) < midnight,
      );
      const secondDaySamples = dto.samples.filter(
        (s) => new Date(s.time) >= midnight,
      );

      const recordId1 = uuidv4();
      const recordId2 = uuidv4();

      const updateResult1 = await this.updateCadenceForDate(
        userId,
        startDate,
        firstDaySamples,
        dto.metadata,
        recordId1,
      );
      const updateResult2 = await this.updateCadenceForDate(
        userId,
        endDate,
        secondDaySamples,
        dto.metadata,
        recordId2,
      );

      results.push({
        record_id: recordId1,
        added_record_id: updateResult1.added_record_id,
        aggregated: true,
        message: 'steps cadence data stored',
        sample_count: updateResult1.sample_count,
      });

      results.push({
        record_id: recordId2,
        added_record_id: updateResult2.added_record_id,
        aggregated: true,
        message: 'steps cadence data stored',
        sample_count: updateResult2.sample_count,
      });
    }

    return results;
  }

  private async updateCadenceForDate(
    userId: string,
    date: string,
    samples: StepsCadenceSample[],
    metadata: Record<string, any> | undefined,
    recordId: string,
  ) {
    if (!samples.length) return { sample_count: 0, added_record_id: false };

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    let existingAvg = 0;
    let existingCount = 0;
    let sources = new Set<string>();

    if (docSnap.exists) {
      const data = docSnap.data();
      existingAvg = data?.steps_cadence?.average_value || 0;
      existingCount = data?.steps_cadence?.sample_count || 0;
      const existingSources = data?.steps_cadence?.metadata?.sources || [];
      sources = new Set(existingSources);
    }

    const newSum = samples.reduce((sum, s) => sum + s.stepsPerMinute, 0);
    const newCount = samples.length;
    const totalCount = existingCount + newCount;
    const newAvg = (existingAvg * existingCount + newSum) / totalCount;

    if (metadata?.source) {
      sources.add(metadata.source);
    }

    await docRef.set(
      {
        steps_cadence: {
          average_value: newAvg,
          sample_count: totalCount,
          unit: 'steps/min',
          record_id: recordId,
          last_updated: new Date().toISOString(),
          metadata: {
            sources: Array.from(sources),
          },
        },
      },
      { merge: true },
    );

    // Store record_id only if not exists
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
          type: 'STEPS_CADENCE',
          date,
          path: docRef.path,
        });
        recordIdAdded = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return { sample_count: totalCount, added_record_id: recordIdAdded };
  }

  async getStepsCadence(
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
        indexData.type !== 'STEPS_CADENCE'
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

    const cadenceData = docSnap.exists ? docSnap.data()?.steps_cadence : null;

    if (!cadenceData) {
      return {
        date: targetDate,
        record_id: recordId ?? null,
        aggregated: true,
        samples: [],
      };
    }

    if (recordId && cadenceData.record_id !== recordId) {
      return {
        message: 'Steps cadence record with specified record_id not found',
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
          average_value: cadenceData.average_value,
          sample_count: cadenceData.sample_count,
          unit: cadenceData.unit,
          metadata: cadenceData.metadata || {},
          record_id: cadenceData.record_id || null,
        },
      ],
    };
  }

  async deleteStepsCadence(
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
      if (!data || data.userId !== userId || data.type !== 'STEPS_CADENCE') {
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
        'A valid "date" string must be provided to delete Steps Cadence data.',
      );
    }

    // Reference to daily summary doc
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    const cadenceData = docSnap.data()?.steps_cadence;

    if (!docSnap.exists || cadenceData == null) {
      return {
        message: 'No Steps Cadence data found for this date',
        userId,
        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Delete the steps_cadence field
    await docRef.set(
      {
        steps_cadence: null,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Delete record_id index if recordId provided
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
      message: 'Steps cadence data deleted for this date',

      date,
      aggregated: true,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
