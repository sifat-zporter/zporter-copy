import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { WeightRecordDto } from '../../../dto/GoogleConnect/WeightRecord.dto';

@Injectable()
export class HealthConnectServiceWeight {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeWeight(userId: string, dto: WeightRecordDto) {
    const time = new Date(dto.time);
    const date = this.dateService.getDateKey(time);

    const { recordId, sampleCount } = await this.updateWeightForDate(
      userId,
      date,
      dto,
    );

    // Check if recordId is newly added in the record_id collection
    let added_record_id = false;
    try {
      const recordIdRef = db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId);

      const recordIdSnap = await recordIdRef.get();
      if (!recordIdSnap.exists) {
        await recordIdRef.set({
          userId,
          type: 'WEIGHT',
          date,
          recordedAt: dto.time,
          path: `users/${userId}/healthIntegrationData/healthConnect/daily_summaries/${date}`,
        });
        added_record_id = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        date,
        record_id: recordId,
        aggregated: true,
        message: 'weight record stored with aggregation',
        sample_count: sampleCount,
        added_record_id,
      },
    ];
  }

  private async updateWeightForDate(
    userId: string,
    date: string,
    dto: WeightRecordDto,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();

    let existingWeightSum = 0;
    let existingSampleCount = 0;
    let sources: Set<string> = new Set();

    if (docSnap.exists) {
      const data = docSnap.data();
      const weightData = data?.weight;
      if (weightData) {
        existingWeightSum =
          (weightData?.value || 0) * (weightData?.sampleCount || 1);
        existingSampleCount = weightData?.sampleCount || 0;
        const existingSources = weightData?.metadata?.sources || [];
        sources = new Set(existingSources);
      }
    }

    if (dto.metadata?.source) {
      sources.add(dto.metadata.source);
    }

    const newSampleCount = existingSampleCount + 1;
    const newAverageWeight =
      (existingWeightSum + dto.weight.value) / newSampleCount;

    const recordId = uuidv4();

    await docRef.set(
      {
        weight: {
          value: newAverageWeight,
          unit: dto.weight.unit,
          sampleCount: newSampleCount,
          lastUpdated: new Date().toISOString(),
          metadata: {
            sources: Array.from(sources),
          },
          recordedAt: dto.time,
          recordId: recordId,
        },
      },
      { merge: true },
    );

    return {
      recordId,
      sampleCount: newSampleCount,
    };
  }

  async getWeight(
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
      if (!data || data.userId !== userId || data.type !== 'WEIGHT') {
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
      ? docSnap.data()?.weight?.samples || []
      : [];

    if (recordId) {
      const sample = samples.find((s) => s.id === recordId);

      return sample
        ? {
            date: targetDate,
            record_id: sample.id,
            aggregated: false,
            samples: [sample],
          }
        : {
            message: 'Weight sample not found',
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

  async deleteWeight(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // If no date provided but recordId is, fetch date from record_id index
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
          user_id: userId,
        };
      }

      const data = recordIndexSnap.data();

      if (!data || data.userId !== userId || data.type !== 'WEIGHT') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
          user_id: userId,
        };
      }

      date = data.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete weight data.',
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
        message: 'No weight data found for this date',

        date,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        deleted: false,
      };
    }

    const data = docSnap.data();
    const existingWeightData = data?.weight || null;

    if (!existingWeightData || Object.keys(existingWeightData).length === 0) {
      return {
        message: 'No weight data to delete',

        date,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        deleted: false,
      };
    }

    // Delete the weight field by setting it to null or empty object
    await docRef.set(
      {
        weight: {},
        lastUpdated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Try deleting the recordId index entry if recordId is provided
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
      message: 'Weight data deleted',
      aggregated: true,
      date,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
