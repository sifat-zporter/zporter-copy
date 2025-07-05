import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { BloodPressureRecordDto } from '../../../dto/GoogleConnect/blood-pressure.dto';

@Injectable()
export class BloodPressure {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeBloodPressure(userId: string, dto: BloodPressureRecordDto) {
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
      existingSamples = data?.bloodPressure?.samples || [];
    }

    const isDuplicate = existingSamples.some(
      (sample) =>
        sample.time === dto.time &&
        sample.systolic === dto.systolic.value &&
        sample.diastolic === dto.diastolic.value,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        added_record_id: false,
        aggregated: false,
        message: 'Duplicate blood pressure record for this time already exists',
        sampleCount: existingSamples.length,
      };
    }

    const newSample = {
      id: uuidv4(),
      systolic: dto.systolic.value,
      diastolic: dto.diastolic.value,
      unit: dto.systolic.unit,
      time: dto.time,
      metadata: dto.metadata || {},
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        bloodPressure: {
          samples: updatedSamples,
          lastUpdated: new Date().toISOString(),
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
          type: 'BLOOD_PRESSURE',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return [
      {
        date,
        record_id: newSample.id,
        added_record_id: recordIdAdded,
        aggregated: false,
        message: 'Blood pressure record stored',
        sampleCount: updatedSamples.length,
      },
    ];
  }

  async getBloodPressure(
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
      if (!data || data.userId !== userId || data.type !== 'BLOOD_PRESSURE') {
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
      ? docSnap.data()?.bloodPressure?.samples || []
      : [];

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

  async deleteBloodPressure(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
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
      if (!data || data.userId !== userId || data.type !== 'BLOOD_PRESSURE') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error('A valid "date" string must be provided to delete data.');
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
        message: 'No blood pressure data found for this date',
        userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.bloodPressure?.samples || [];

    if (recordId) {
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No blood pressure record found with the provided ID',
          userId,
          date,
          deleted: false,
        };
      }

      await docRef.set(
        {
          bloodPressure: {
            samples: filteredSamples,
            lastUpdated: new Date().toISOString(),
          },
        },
        { merge: true },
      );

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
        message: 'Blood pressure sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // Delete all records of the day
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
        bloodPressure: {},
      },
      { merge: true },
    );

    return {
      message:
        'All blood pressure data for this date deleted, including record index docs',
      date,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
