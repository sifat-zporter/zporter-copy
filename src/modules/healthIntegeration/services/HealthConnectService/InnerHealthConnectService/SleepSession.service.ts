import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SleepSessionRecordDto } from '../../../dto/GoogleConnect/SleepSessionRecord.dto';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';

@Injectable()
export class HealthConnectServiceSleepSession {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeSleepSession(userId: string, dto: SleepSessionRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const startDateKey = this.dateService.getDateKey(startTime);
    const endDateKey = this.dateService.getDateKey(endTime);
    const sameDay = startDateKey === endDateKey;

    if (sameDay) {
      const result = await this.storeSessionForDate(userId, startDateKey, dto);
      return [result];
    }

    // Split across 2 days
    const localMidnight = new Date(startTime);
    localMidnight.setHours(24, 0, 0, 0);

    const firstPart: SleepSessionRecordDto = {
      ...dto,
      endTime: localMidnight.toISOString(),
    };

    const secondPart: SleepSessionRecordDto = {
      ...dto,
      startTime: localMidnight.toISOString(),
    };

    const firstResult = await this.storeSessionForDate(
      userId,
      startDateKey,
      firstPart,
    );
    const secondResult = await this.storeSessionForDate(
      userId,
      endDateKey,
      secondPart,
    );

    return [firstResult, secondResult];
  }

  private async storeSessionForDate(
    userId: string,
    date: string,
    dto: SleepSessionRecordDto,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();
    const existingSessions: any[] = docSnap.exists
      ? docSnap.data()?.sleepSessions || []
      : [];

    const recordId = uuidv4();
    const newSession = {
      id: recordId,
      title: dto.title || null,
      start_time: dto.startTime,
      end_time: dto.endTime,
      duration_in_minutes:
        (new Date(dto.endTime).getTime() - new Date(dto.startTime).getTime()) /
        60000,
      stages: dto.stages ? JSON.parse(JSON.stringify(dto.stages)) : [],
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : {},
    };

    const updatedSessions = [...existingSessions, newSession];

    await docRef.set(
      {
        sleepSessions: updatedSessions,
        last_updated: new Date().toISOString(),
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
          type: 'SLEEP_SESSION',
          date,
          path: docRef.path,
        });
        recordIdAdded = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      date,
      record_id: recordId,
      added_record_id: recordIdAdded,
      aggregated: true,
      message: 'Sleep session record stored',
      sample_count: updatedSessions.length,
    };
  }

  async getSleepSession(
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
      if (!data || data.userId !== userId || data.type !== 'SLEEP_SESSION') {
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
    const sessions: any[] = docSnap.exists
      ? docSnap.data()?.sleepSessions || []
      : [];

    if (recordId) {
      const session = sessions.find((s) => s.id === recordId);

      return session
        ? {
            date: targetDate,
            record_id: session.id,
            aggregated: true,
            sleep_sessions: [session],
          }
        : {
            message: 'Sleep session not found',
            date: targetDate,
            record_id: recordId,
          };
    }

    return {
      date: targetDate,
      aggregated: true,
      sleep_sessions: sessions,
    };
  }

  async deleteSleepSession(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // Step 1: If no date but recordId provided, fetch date from record_id index
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

      if (!data || data.userId !== userId || data.type !== 'SLEEP_SESSIONS') {
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
        'A valid "date" string must be provided to delete Sleep Sessions data.',
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

    const sleepSessions = docSnap.data()?.sleepSessions;

    if (!docSnap.exists || !sleepSessions || sleepSessions.length === 0) {
      return {
        message: 'No Sleep Sessions data found for this date',

        date,
        aggregated: false,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_sample_count: 0,
      };
    }

    // Step 3: Delete the sleepSessions field (clear the array)
    await docRef.set(
      {
        sleepSessions: [],
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

    // Step 4: Delete record_id index if recordId provided
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
      message: 'Sleep Sessions data deleted for this date',
      date,
      aggregated: false,
      deleted_record_id: recordId || null,
      deleted_record_index: deletedRecordIndex,
      remaining_sample_count: 0,
    };
  }
}
