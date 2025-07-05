import { Injectable } from '@nestjs/common';
import { NutritionRecordDto } from '../../../dto/GoogleConnect/NutritionRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NutritionService {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeNutrition(userId: string, dto: NutritionRecordDto) {
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
      existingSamples = data?.nutrition?.samples || [];
    }

    const isDuplicate = existingSamples.some(
      (sample) =>
        sample.time === dto.time && sample.value === dto.nutrition.value,
    );

    if (isDuplicate) {
      return [
        {
          date,
          record_id: null,
          added_record_id: false,
          aggregated: false,
          message: 'Duplicate nutrition record for this time already exists',
          sample_count: existingSamples.length,
        },
      ];
    }

    const newSample = {
      id: uuidv4(),
      value: dto.nutrition.value,
      unit: dto.nutrition.unit,
      time: dto.time,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : {},
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        nutrition: {
          samples: updatedSamples,
          last_updated: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    let recordIdAdded = false;

    try {
      await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(newSample.id)
        .set({
          userId,
          type: 'NUTRITION',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        date: date,
        record_id: newSample.id,
        added_record_id: recordIdAdded,
        aggregated: false,
        message: 'Nutrition record stored',
        sample_count: updatedSamples.length,
      },
    ];
  }

  async getNutritionData(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    if (!date && !recordId) {
      throw new Error('Either "date" or "recordId" must be provided.');
    }

    let targetDate = date;

    if (!date && recordId) {
      const snap = await db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(recordId)
        .get();

      if (!snap.exists) {
        return {
          message: 'Record ID not found in index',
          record_id: recordId,
        };
      }

      const data = snap.data();
      if (!data || data.userId !== userId || data.type !== 'NUTRITION') {
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
    const nutritionData = docSnap.exists ? docSnap.data()?.nutrition || {} : {};
    const samples: any[] = nutritionData.samples || [];

    if (recordId) {
      const sample = samples.find((s) => s.id === recordId);
      return sample
        ? {
            date: targetDate,
            record_id: sample.id,
            aggregated: false,
            sample,
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

  async deleteNutritionRecord(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // If no date is provided but recordId is, get the date from the record_id index
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

      if (!data || data.userId !== userId || data.type !== 'NUTRITION') {
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
        'A valid "date" string must be provided to delete nutrition data.',
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

    if (!docSnap.exists) {
      return {
        message: 'No nutrition data found for this date',
        user_id: userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.nutrition?.samples || [];

    if (recordId) {
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No nutrition record found with the provided ID',
          user_id: userId,
          date,
          deleted: false,
        };
      }

      // Update doc with filtered samples
      await docRef.set(
        {
          nutrition: {
            samples: filteredSamples,
            lastUpdated: new Date().toISOString(),
          },
        },
        { merge: true },
      );

      // Delete record_id index doc
      let deletedRecordIndex = false;
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

      return {
        message: 'Nutrition sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // Delete all samples
    const batch = db.batch();

    for (const sample of existingSamples) {
      const recordIdDocRef = db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(sample.id);

      batch.delete(recordIdDocRef);
    }

    await batch.commit();

    await docRef.set(
      {
        nutrition: {},
      },
      { merge: true },
    );

    return {
      message:
        'All nutrition data for this date deleted, including record index docs',
      date,

      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
