import { Injectable } from '@nestjs/common';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { HydrationRecordDto } from '../../../dto/GoogleConnect/HydrationRcord.dto';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class HydrationService {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeHydrationData(userId: string, dto: HydrationRecordDto) {
    const date = this.dateService.getDateKey(new Date(dto.time));
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
      existingAvg = data?.hydration?.averageValue || 0;
      existingCount = data?.hydration?.sampleCount || 0;
      const existingSources = data?.hydration?.metadata?.sources || [];
      sources = new Set(existingSources);
    }

    const newValue = dto.volume.value;
    const newCount = existingCount + 1;
    const newAvg = (existingAvg * existingCount + newValue) / newCount;

    if (dto.metadata?.source) {
      sources.add(dto.metadata.source);
    }

    await docRef.set(
      {
        hydration: {
          averageValue: newAvg,
          sampleCount: newCount,
          unit: dto.volume.unit,
          lastUpdated: new Date().toISOString(),
          metadata: {
            sources: Array.from(sources),
          },
        },
      },
      { merge: true },
    );

    // Create a record_id doc for indexing
    const recordId = uuidv4();
    let added_record_id = false;

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
          type: 'HYDRATION',
          date,
          path: docRef.path,
        });
        added_record_id = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        aggregated: true,

        sample_count: newCount,
        message: 'Hydration record stored',
        record_id: recordId,
        added_record_id,
      },
    ];
  }

  async getHydrationData(
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
      if (!data || data.userId !== userId || data.type !== 'HYDRATION') {
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

    if (!docSnap.exists) {
      return {
        message: 'Hydration sample not found',
        date: targetDate,
        record_id: recordId,
      };
    }

    const data = docSnap.data();

    // If recordId is provided, find the specific sample inside hydration.samples (assuming structure)
    if (recordId) {
      const samples: any[] = data?.hydration?.samples || [];
      const sample = samples.find((s) => s.id === recordId);
      if (!sample) {
        return {
          message: 'Hydration sample not found',
          date: targetDate,
          record_id: recordId,
        };
      }

      return {
        date: targetDate,
        record_id: sample.id,
        aggregated: false,
        samples: [sample],
      };
    }

    return {
      date: targetDate,
      aggregated: true,
      samples: [
        {
          average_value: data?.hydration?.averageValue || 0,
          sample_count: data?.hydration?.sampleCount || 0,
          unit: data?.hydration?.unit || null,
          metadata: data?.hydration?.metadata || {},
          last_updated: data?.hydration?.lastUpdated || null,
        },
      ],
    };
  }

  async deleteHydrationData(
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
          user_id: userId,
        };
      }

      const data = recordIndexSnap.data();

      if (!data || data.userId !== userId || data.type !== 'HYDRATION') {
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
        'A valid "date" string must be provided to delete hydration data.',
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
        message: 'No hydration data found for this date',
        aggregated: true,
        date,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    const data = docSnap.data();
    const hydrationData = data?.hydration;

    if (!hydrationData || Object.keys(hydrationData).length === 0) {
      return {
        message: 'Hydration data already empty for this date',
        aggregated: true,
        date,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    await docRef.set(
      {
        hydration: {},
        last_updated: new Date().toISOString(),
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
      message: 'Hydration data cleared',

      date,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
      aggregated: true,
    };
  }
}
