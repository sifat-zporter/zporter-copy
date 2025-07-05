import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HeartRateRecordDto } from '../../../dto/GoogleConnect/HeartRate.dto';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

interface HeartRateSample {
  time: string;
  beatsPerMinute: number;
}

@Injectable()
export class HealthConnectServiceHeartRate {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeHeartRateRecord(userId: string, dto: HeartRateRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const sameDay =
      startTime.toISOString().split('T')[0] ===
      endTime.toISOString().split('T')[0];

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const result = await this.updateHeartRateForDate(
        userId,
        date,
        dto.samples,
        dto.metadata,
      );

      return result.record_ids.map((record_id) => ({
        record_id,
        aggregated: true,
        message: 'Heart rate record stored',
        sample_count: result.sample_count,
      }));
    } else {
      const samplesByDate = dto.samples.reduce((acc, sample) => {
        const dateKey = this.dateService.getDateKey(new Date(sample.time));
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(sample);
        return acc;
      }, {} as Record<string, HeartRateSample[]>);

      const updateResults = await Promise.all(
        Object.entries(samplesByDate).map(async ([date, samples]) => {
          const result = await this.updateHeartRateForDate(
            userId,
            date,
            samples,
            dto.metadata,
          );

          return result.record_ids.map((record_id) => ({
            record_id,
            aggregated: true,
            message: 'Heart rate record stored',
            sample_count: result.sample_count,
          }));
        }),
      );

      // Flatten array of arrays
      return updateResults.flat();
    }
  }

  private async updateHeartRateForDate(
    userId: string,
    date: string,
    samples: HeartRateSample[],
    metadata: Record<string, any> = {},
  ): Promise<{
    record_ids: string[];
    sample_count: number;
    added_record_ids: number;
  }> {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();
    let existingSamples: HeartRateSample[] = [];

    if (docSnap.exists) {
      const data = docSnap.data();
      existingSamples = data?.heartRateSamples || [];
    }

    const newSamplesWithIds = samples.map((sample) => {
      return {
        id: uuidv4(), // unique per sample
        time: sample.time,
        beatsPerMinute: sample.beatsPerMinute,
      };
    });

    // Merge existing + new samples by time, preferring new samples
    const mergedSamplesMap = new Map<string, any>();
    existingSamples.forEach((s: any) => mergedSamplesMap.set(s.time, s));
    newSamplesWithIds.forEach((s) => mergedSamplesMap.set(s.time, s));

    const mergedSamples = Array.from(mergedSamplesMap.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    await docRef.set(
      {
        heartRateSamples: mergedSamples,
        metadata,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true },
    );

    let addedCount = 0;
    // Store record_id docs for each new sample
    for (const sample of newSamplesWithIds) {
      try {
        const recordIdRef = db
          .collection('users')
          .doc(userId)
          .collection('healthIntegrationData')
          .doc('healthConnect')
          .collection('record_id')
          .doc(sample.id);

        const existingSnap = await recordIdRef.get();
        if (!existingSnap.exists) {
          await recordIdRef.set({
            userId,
            type: 'HEART_RATE',
            date,
            path: docRef.path,
          });
          addedCount++;
        }
      } catch (error) {
        console.error('Failed to store record_id index:', error);
      }
    }

    return {
      record_ids: newSamplesWithIds.map((s) => s.id),
      sample_count: mergedSamples.length,
      added_record_ids: addedCount,
    };
  }

  async getHeartRateRecord(
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

      if (!data || data.userId !== userId || data.type !== 'HEART_RATE') {
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
      ? docSnap.data()?.heartRateSamples || []
      : [];

    if (recordId) {
      const sample = samples.find((s) => s.id === recordId);
      console.log(recordId, sample, 'here');
      return sample
        ? {
            date: targetDate,
            record_id: sample.id,
            aggregated: false,
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
      aggregated: false,
      samples,
    };
  }

  async deleteHeartRateRecord(
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

      if (!data || data.userId !== userId || data.type !== 'HEART_RATE') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete heart rate data.',
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
        message: 'No heart rate data found for this date',
        userId,
        date,
        aggregated: false,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    const data = docSnap.data();
    const existingSamples: HeartRateSample[] = data?.heartRateSamples || [];

    if (existingSamples.length === 0) {
      return {
        message: 'No heart rate samples to delete',

        date,
        aggregated: false,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Delete all samples
    await docRef.set(
      {
        heartRateSamples: [],
        lastUpdated: new Date().toISOString(),
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
      message: 'Heart rate data deleted',

      date,
      aggregated: false,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
