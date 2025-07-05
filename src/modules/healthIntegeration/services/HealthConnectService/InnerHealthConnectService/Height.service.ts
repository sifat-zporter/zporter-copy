import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { HeightRecordDto } from '../../../dto/GoogleConnect/HeightRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

@Injectable()
export class HealthConnectServiceHeight {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeHeightRecord(userId: string, dto: HeightRecordDto) {
    const date = this.dateService.getDateKey(new Date(dto.time));

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();
    let existingSamples: any[] = [];

    if (docSnap.exists) {
      const data = docSnap.data();
      existingSamples = data?.height?.samples || [];
    }

    // Check for duplicates
    const isDuplicate = existingSamples.some(
      (sample) => sample.time === dto.time,
    );

    if (isDuplicate) {
      return [
        {
          record_id: null,
          added_record_id: false,
          aggregated: false,
          message: 'Duplicate height record for this time already exists',
          sample_count: existingSamples.length,
        },
      ];
    }

    const recordId = uuidv4();
    const newSample = {
      id: recordId,
      value: dto.height.value,
      unit: dto.height.unit,
      time: dto.time,
      zone_offset: dto.zoneOffset,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : {},
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        height: {
          samples: updatedSamples,
          last_updated: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    // Store the record ID in the `record_id` index
    let recordIdAdded = false;
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
          type: 'HEIGHT',
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
        aggregated: false,
        message: 'Height record stored',
        sample_count: updatedSamples.length,
      },
    ];
  }

  async getHeight(
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
      if (!data || data.userId !== userId || data.type !== 'HEIGHT') {
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

    // Height data is expected as a single object (not an array)
    const heightData = docSnap.exists ? docSnap.data()?.height : null;

    if (!heightData) {
      return {
        message: 'No height data found for the specified date',
        date: targetDate,
        record_id: recordId ?? null,
      };
    }

    if (recordId && heightData.record_id !== recordId) {
      return {
        message: 'Record ID not found in height data',
        date: targetDate,
        record_id: recordId,
      };
    }

    return {
      date: targetDate,
      aggregated: true,
      samples: [
        {
          value: heightData.value,
          unit: heightData.unit,
          metadata: heightData.metadata || {},
          record_id: heightData.record_id || null,
        },
      ],
    };
  }

  async deleteHeight(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // Step 1: Lookup date from record index if only recordId is provided
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

      if (!data || data.userId !== userId || data.type !== 'HEIGHT') {
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
        'A valid "date" string must be provided to delete Height data.',
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

    const heightData = docSnap.data()?.height?.samples;

    if (!docSnap.exists || !heightData || heightData.length === 0) {
      return {
        message: 'No Height data found for this date',

        date,
        aggregated: false,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Step 3: Delete the height field
    await docRef.set(
      {
        height: null,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Step 4: Delete from record_id index if recordId is provided
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
      message: 'Height data deleted for this date',
      date,
      aggregated: false,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
