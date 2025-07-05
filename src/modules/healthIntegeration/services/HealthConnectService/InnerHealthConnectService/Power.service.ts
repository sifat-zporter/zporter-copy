import { Injectable } from '@nestjs/common';
import { PowerRecordDto } from '../../../dto/GoogleConnect/PowerRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HealthConnectServicePower {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storePower(userId: string, dto: PowerRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const sameDay =
      startTime.toISOString().split('T')[0] ===
      endTime.toISOString().split('T')[0];

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const records = await this.storeSamplesByDate(
        userId,
        date,
        dto.samples,
        dto.metadata,
      );
      return records;
    } else {
      const midnight = new Date(startTime);
      midnight.setUTCHours(24, 0, 0, 0);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const firstDaySamples = dto.samples.filter(
        (sample) => new Date(sample.time).getTime() < midnight.getTime(),
      );
      const secondDaySamples = dto.samples.filter(
        (sample) => new Date(sample.time).getTime() >= midnight.getTime(),
      );

      const records1 = await this.storeSamplesByDate(
        userId,
        firstDate,
        firstDaySamples,
        dto.metadata,
      );
      const records2 = await this.storeSamplesByDate(
        userId,
        secondDate,
        secondDaySamples,
        dto.metadata,
      );

      return [...records1, ...records2];
    }
  }

  private async storeSamplesByDate(
    userId: string,
    date: string,
    samples: { time: string; watts: number }[],
    metadata?: Record<string, any>,
  ) {
    if (!samples.length) return [];

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
      existingSamples = data?.power?.samples || [];
    }

    const plainMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {};

    const results: any[] = [];

    for (const sample of samples) {
      const isDuplicate = existingSamples.some(
        (s) => s.time === sample.time && s.watts === sample.watts,
      );

      if (isDuplicate) {
        results.push({
          date,
          record_id: null,
          aggregated: false,
          message: 'Duplicate power record for this time already exists',
          sample_count: existingSamples.length,
        });
        continue;
      }

      const id = uuidv4();
      const newSample = {
        id,
        time: sample.time,
        watts: sample.watts,
        metadata: plainMetadata,
      };

      existingSamples.push(newSample);
      let recordIdAdded = false;
      try {
        await db
          .collection('users')
          .doc(userId)
          .collection('healthIntegrationData')
          .doc('healthConnect')
          .collection('record_id')
          .doc(id)
          .set({
            userId,
            type: 'POWER',
            date,
            path: docRef.path,
          });
        recordIdAdded = true;
      } catch (error) {
        console.error('Failed to store record_id index:', error);
      }

      results.push({
        date,
        record_id: id,
        aggregated: false,
        message: 'Power record stored',
        sample_count: 1,
        added_record_id: recordIdAdded,
      });
    }

    await docRef.set(
      {
        power: {
          samples: existingSamples,
          lastUpdated: new Date().toISOString(),
        },
      },
      { merge: true },
    );

    return results;
  }

  async getPowerData(
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
      if (!data || data.userId !== userId || data.type !== 'POWER') {
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
    const powerData = docSnap.exists ? docSnap.data()?.power || {} : {};
    const samples: any[] = powerData.samples || [];

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

  async deletePowerRecord(
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

      if (!data || data.userId !== userId || data.type !== 'POWER') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    // Validate date after potentially fetching it
    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete power data.',
      );
    }

    // Reference to the daily summary doc for the given date
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
        message: 'No power data found for this date',
        userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSamples: any[] = data?.power?.samples || [];

    if (recordId) {
      const filteredSamples = existingSamples.filter(
        (sample) => sample.id !== recordId,
      );

      if (filteredSamples.length === existingSamples.length) {
        return {
          message: 'No power record found with the provided ID',
          userId,
          date,
          deleted: false,
        };
      }

      // Update doc with filtered samples
      await docRef.set(
        {
          power: {
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
        message: 'Power sample deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_sample_count: filteredSamples.length,
        aggregated: false,
      };
    }

    // If no recordId provided, delete all power data for the date
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
        power: {},
      },
      { merge: true },
    );

    return {
      message:
        'All power data for this date deleted, including record index docs',
      date,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_sample_count: 0,
    };
  }
}
