import { Injectable } from '@nestjs/common';
import { db } from '../../../../../config/firebase.config';
import { v4 as uuidv4 } from 'uuid';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { FloorsClimbedRecordDto } from '../../../dto/GoogleConnect/FloorClimbedRecord.dto';

@Injectable()
export class HealthConnectServiceFloorsClimbed {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeFloorsClimbed(userId: string, dto: FloorsClimbedRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const sameDay =
      startTime.toISOString().split('T')[0] ===
      endTime.toISOString().split('T')[0];

    const plainMetadata = dto.metadata
      ? JSON.parse(JSON.stringify(dto.metadata))
      : {};

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const result = await this.storeSampleByDate(userId, date, {
        start_time: dto.startTime,
        end_time: dto.endTime,
        value: dto.floors.value,
        unit: dto.floors.unit,
        metadata: plainMetadata,
      });

      return [result];
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const totalDuration = endTime.getTime() - startTime.getTime();
      const firstDuration = midnight.getTime() - startTime.getTime();
      const secondDuration = endTime.getTime() - midnight.getTime();

      const floorsFirstDay = dto.floors.value * (firstDuration / totalDuration);
      const floorsSecondDay =
        dto.floors.value * (secondDuration / totalDuration);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const [firstResult, secondResult] = await Promise.all([
        this.storeSampleByDate(userId, firstDate, {
          start_time: dto.startTime,
          end_time: midnight.toISOString(),
          value: floorsFirstDay,
          unit: dto.floors.unit,
          metadata: plainMetadata,
        }),
        this.storeSampleByDate(userId, secondDate, {
          start_time: midnight.toISOString(),
          end_time: dto.endTime,
          value: floorsSecondDay,
          unit: dto.floors.unit,
          metadata: plainMetadata,
        }),
      ]);

      return [firstResult, secondResult];
    }
  }

  private async storeSampleByDate(
    userId: string,
    date: string,
    sample: {
      start_time: string;
      end_time: string;
      value: number;
      unit: string;
      metadata: Record<string, any>;
    },
  ) {
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
      existingSamples = data?.floorsClimbed?.samples || [];
    }

    const isDuplicate = existingSamples.some(
      (s) => s.start_time === sample.start_time && s.value === sample.value,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        added_record_id: false,
        aggregated: false,
        message: 'Duplicate floors climbed record for this time already exists',
        sample_count: existingSamples.length,
      };
    }

    const newSample = {
      id: uuidv4(),
      ...sample,
    };

    const updatedSamples = [...existingSamples, newSample];

    await docRef.set(
      {
        floorsClimbed: {
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
          type: 'FLOORS_CLIMBED',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      record_id: newSample.id,
      added_record_id: recordIdAdded,
      aggregated: false,
      message: 'Floors climbed record stored',
      sample_count: updatedSamples.length,
    };
  }

  async getFloorsClimbedRecord(
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
      if (!data || data.userId !== userId || data.type !== 'FLOORS_CLIMBED') {
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
      ? docSnap.data()?.floorsClimbed?.samples || []
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
  async deleteFloorsClimbedRecord(
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

      if (!data || data.userId !== userId || data.type !== 'FLOORS_CLIMBED') {
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
        'A valid "date" string must be provided to delete floors climbed data.',
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
        message: 'No floors climbed data found for this date',
        userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.floorsClimbed?.samples || [];

    if (recordId) {
      // Delete specific sample by recordId
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No floors climbed record found with the provided ID',
          userId,
          date,
          deleted: false,
        };
      }

      // Update doc with filtered samples
      await docRef.set(
        {
          floorsClimbed: {
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
        message: 'Floors climbed sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // If no recordId provided, delete all floors climbed data for the date

    // Delete all record_id docs for samples of this date using batch
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

    // Clear all samples in the main doc
    await docRef.set(
      {
        floorsClimbed: {},
      },
      { merge: true },
    );

    return {
      message:
        'All floors climbed data for this date deleted, including record index docs',
      date,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
