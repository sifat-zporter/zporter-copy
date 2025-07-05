import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SpeedRecordDto } from '../../../dto/GoogleConnect/SpeedRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

@Injectable()
export class HealthConnectServiceSpeed {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeSpeed(userId: string, dto: SpeedRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const startDate = this.dateService.getDateKey(startTime);
    const endDate = this.dateService.getDateKey(endTime);

    const result = [];

    const recordId1 = uuidv4();
    const recordId2 = uuidv4();

    const isSameDay = startDate === endDate;

    if (isSameDay) {
      const updateResult = await this.updateSpeedForDate(
        userId,
        startDate,
        dto.samples,
        dto.metadata,
        recordId1,
      );

      result.push({
        record_id: recordId1,
        added_record_id: updateResult.added_record_id,
        aggregated: true,
        message: 'Speed data stored',
        sample_count: updateResult.sampleCount,
      });
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const splitIndex = dto.samples.findIndex(
        (sample) => new Date(sample.time) >= midnight,
      );

      const firstDaySamples = dto.samples.slice(0, splitIndex);
      const secondDaySamples = dto.samples.slice(splitIndex);

      const firstUpdate = await this.updateSpeedForDate(
        userId,
        startDate,
        firstDaySamples,
        dto.metadata,
        recordId1,
      );

      const secondUpdate = await this.updateSpeedForDate(
        userId,
        endDate,
        secondDaySamples,
        dto.metadata,
        recordId2,
      );

      result.push({
        record_id: recordId1,
        added_record_id: firstUpdate.added_record_id,
        aggregated: true,
        message: 'Speed data stored',
        sample_count: firstUpdate.sampleCount,
      });

      result.push({
        record_id: recordId2,
        added_record_id: secondUpdate.added_record_id,
        aggregated: true,
        message: 'Speed data stored',
        sample_count: secondUpdate.sampleCount,
      });
    }

    return result;
  }

  private async updateSpeedForDate(
    userId: string,
    date: string,
    samples: { time: string; metersPerSecond: number }[],
    metadata: Record<string, any> | undefined,
    recordId: string,
  ) {
    if (!samples.length) {
      return { sampleCount: 0, added_record_id: false };
    }

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
    let sources: Set<string> = new Set();

    if (docSnap.exists) {
      const data = docSnap.data();
      existingAvg = data?.speed?.average_value || 0;
      existingCount = data?.speed?.sample_count || 0;
      const existingSources = data?.speed?.metadata?.sources || [];
      sources = new Set(existingSources);
    }

    const newSum = samples.reduce(
      (sum, sample) => sum + sample.metersPerSecond,
      0,
    );
    const newCount = samples.length;
    const totalCount = existingCount + newCount;
    const newAvg = (existingAvg * existingCount + newSum) / totalCount;

    if (metadata?.source) {
      sources.add(metadata.source);
    }

    await docRef.set(
      {
        speed: {
          average_value: newAvg,
          sample_count: totalCount,
          unit: 'm/s',
          last_updated: new Date().toISOString(),
          record_id: recordId,
          metadata: {
            sources: Array.from(sources),
          },
        },
      },
      { merge: true },
    );

    // Store record_id in record_id collection
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
          type: 'SPEED',
          date,
          path: docRef.path,
        });
        recordIdAdded = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      sampleCount: totalCount,
      added_record_id: recordIdAdded,
    };
  }

  async getSpeed(
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
        indexData.type !== 'SPEED'
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

    const speedData = docSnap.exists ? docSnap.data()?.speed : null;

    if (!speedData) {
      return {
        date: targetDate,
        record_id: recordId ?? null,
        aggregated: true,
        samples: [],
      };
    }

    if (recordId && speedData.record_id !== recordId) {
      return {
        message: 'Speed record with specified record_id not found',
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
          average_value: speedData.average_value || 0,
          sample_count: speedData.sample_count || 0,
          unit: speedData.unit || 'm/s',
          metadata: speedData.metadata || {},
          record_id: speedData.record_id || null,
        },
      ],
    };
  }

  async deleteSpeed(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // Step 1: Resolve date from recordId if date not provided
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
      if (!data || data.userId !== userId || data.type !== 'SPEED') {
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
        'A valid "date" string must be provided to delete Speed data.',
      );
    }

    // Step 3: Get the document snapshot
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    const speedData = docSnap.data()?.speed;

    if (!docSnap.exists || speedData == null) {
      return {
        message: 'No Speed data found for this date',
        userId,
        date,
        aggregated: true,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Step 4: Delete the speed field
    await docRef.set(
      {
        speed: null,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Step 5: Delete the record_id index if recordId provided
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
      message: 'Speed data deleted for this date',

      date,
      aggregated: true,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
