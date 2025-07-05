import { Injectable } from '@nestjs/common';
import { RestingHeartRateRecordDto } from '../../../dto/GoogleConnect/RestingHeartRateRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class HealthConnectServiceRestingHeartRate {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeRestingHeartRate(userId: string, dto: RestingHeartRateRecordDto) {
    const date = this.dateService.getDateKey(new Date(dto.time));
    const recordId = uuidv4();

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
      existingAvg = data?.restingHeartRate?.averageBPM || 0;
      existingCount = data?.restingHeartRate?.sampleCount || 0;
      const existingSources = data?.restingHeartRate?.metadata?.sources || [];
      sources = new Set(existingSources);
    }

    const newValue = dto.beatsPerMinute;
    const newCount = existingCount + 1;
    const newAvg = (existingAvg * existingCount + newValue) / newCount;

    if (dto.metadata?.source) {
      sources.add(dto.metadata.source);
    }

    await docRef.set(
      {
        restingHeartRate: {
          averageBPM: newAvg,
          sampleCount: newCount,
          last_updated: new Date().toISOString(),
          metadata: {
            sources: Array.from(sources),
          },
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
          type: 'RESTING_HEART_RATE',
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
        date,
        record_id: recordId,
        added_record_id: recordIdAdded,

        sample_count: newCount,
        aggregated: true,
        message: 'Resting heart rate record stored',
      },
    ];
  }

  async getRestingHeartRate(
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
      if (
        !data ||
        data.userId !== userId ||
        data.type !== 'RESTING_HEART_RATE'
      ) {
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
      ? docSnap.data()?.restingHeartRate?.samples || []
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

  async deleteRestingHeartRateRecord(
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

      const indexData = recordIndexSnap.data();

      if (
        !indexData ||
        indexData.userId !== userId ||
        indexData.type !== 'RESTING_HEART_RATE'
      ) {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = indexData.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete Resting Heart Rate data.',
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

    const restingData = docSnap.data()?.restingHeartRate;

    if (
      !docSnap.exists ||
      !restingData ||
      Object.keys(restingData).length === 0
    ) {
      return {
        message: 'No Resting Heart Rate data found for this date',
        aggregated: true,
        remaining_sample_count: 0,
        date,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
      };
    }

    await docRef.set(
      {
        restingHeartRate: {
          averageBPM: 0,
          sampleCount: 0,
          last_updated: new Date().toISOString(),
          metadata: {
            sources: [],
          },
        },
      },
      { merge: true },
    );

    // Try deleting the recordId index entry, if provided
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
      message: 'Resting Heart Rate data deleted for this date',
      remaining_sample_count: 0,
      date,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      aggregated: true,
    };
  }
}
