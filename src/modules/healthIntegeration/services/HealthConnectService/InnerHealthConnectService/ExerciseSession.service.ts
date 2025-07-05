import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { ExerciseSessionRecordDto } from '../../../dto/GoogleConnect/ExcerciseSessionRecord.dto';

@Injectable()
export class ExerciseSession {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeExerciseSession(userId: string, dto: ExerciseSessionRecordDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const startLocalDate = this.dateService.getDateKey(startTime);
    const endLocalDate = this.dateService.getDateKey(endTime);

    const sameDay = startLocalDate === endLocalDate;

    if (sameDay) {
      const date = startLocalDate;
      const result = await this.saveSessionForDate(userId, date, dto);
      return [
        {
          date,
          record_id: result.record_id,
          added_record_id: result.added_record_id,
          aggregated: true,
          message: 'exercise session record stored',
          sample_count: result.sample_count,
        },
      ];
    } else {
      // Split session at LOCAL midnight
      const localMidnight = new Date(startTime);
      localMidnight.setHours(24, 0, 0, 0); // <-- Local time midnight

      const firstDate = startLocalDate;
      const secondDate = endLocalDate;

      const firstPart: ExerciseSessionRecordDto = {
        ...dto,
        endTime: localMidnight.toISOString(),
      };

      const secondPart: ExerciseSessionRecordDto = {
        ...dto,
        startTime: localMidnight.toISOString(),
      };

      const firstResult = await this.saveSessionForDate(
        userId,
        firstDate,
        firstPart,
      );
      const secondResult = await this.saveSessionForDate(
        userId,
        secondDate,
        secondPart,
      );

      return [
        {
          date: firstDate,
          record_id: firstResult.record_id,
          added_record_id: firstResult.added_record_id,
          aggregated: true,
          message: 'exercise session record stored',
          sample_count: firstResult.sample_count,
        },
        {
          date: secondDate,
          record_id: secondResult.record_id,
          added_record_id: secondResult.added_record_id,
          aggregated: true,
          message: 'exercise session record stored',
          sample_count: secondResult.sample_count,
        },
      ];
    }
  }

  private async saveSessionForDate(
    userId: string,
    date: string,
    dto: ExerciseSessionRecordDto,
  ) {
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('healthIntegrationData')
      .doc('healthConnect')
      .collection('daily_summaries')
      .doc(date);

    const docSnap = await docRef.get();
    let existingSessions: any[] = [];

    if (docSnap.exists) {
      existingSessions = docSnap.data()?.sessions || [];
    }

    const recordId = uuidv4();

    const newSession = {
      id: recordId,
      title: dto.title || null,
      notes: dto.notes || null,
      exercise_type: dto.exerciseType,
      start_time: dto.startTime,
      end_time: dto.endTime,
      start_zone_offset: dto.startZoneOffset || null,
      end_zone_offset: dto.endZoneOffset || null,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : {},
    };

    const updatedSessions = [...existingSessions, newSession];

    await docRef.set(
      {
        sessions: updatedSessions,
        last_updated: new Date().toISOString(),
      },
      { merge: true },
    );

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
          type: 'EXERCISE_SESSION',
          date,
          path: docRef.path,
        });
        added_record_id = true;
      }
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      record_id: recordId,
      sample_count: updatedSessions.length,
      added_record_id,
    };
  }

  async getExerciseSessions(
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
      if (!data || data.userId !== userId || data.type !== 'EXERCISE_SESSION') {
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
        message: 'No exercise sessions found for date',
        date: targetDate,
        samples: [],
      };
    }

    const sessions: any[] = docSnap.data()?.sessions || [];

    if (recordId) {
      const session = sessions.find((s) => s.id === recordId);
      if (!session) {
        return {
          message: 'Exercise session not found',
          date: targetDate,
          record_id: recordId,
        };
      }

      return {
        date: targetDate,
        record_id: session.id,
        aggregated: true,

        samples: [session],
      };
    }

    return {
      date: targetDate,
      aggregated: true,

      samples: sessions,
    };
  }

  async deleteExerciseSession(
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

      if (!data || data.userId !== userId || data.type !== 'EXERCISE_SESSION') {
        return {
          message: 'Record ID does not match user or type',
          record_id: recordId,
        };
      }

      date = data.date;
    }

    if (!date || typeof date !== 'string' || date.trim() === '') {
      throw new Error(
        'A valid "date" string must be provided to delete exercise session data.',
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
        message: 'No exercise session data found for this date',
        date,
        deleted_record_id: recordId || null,
        deleted_record_index: false,
        remaining_session_count: 0,
      };
    }

    const existingSessions: any[] = docSnap.data()?.sessions || [];

    if (recordId) {
      const filtered = existingSessions.filter((s) => s.id !== recordId);

      if (filtered.length === existingSessions.length) {
        return {
          message: 'No session found for the specified record_id',
          date,
          deleted_record_id: recordId,
          deleted_record_index: false,
          remaining_session_count: existingSessions.length,
          aggregated: true,
        };
      }

      await docRef.set(
        {
          sessions: filtered,
        },
        { merge: true },
      );

      // Try deleting the recordId index entry, if recordId is provided
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
        message: 'Exercise session deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_session_count: filtered.length,
        aggregated: true,
      };
    }

    // If no recordId provided, delete all sessions for that date
    await docRef.set(
      {
        sessions: [],
      },
      { merge: true },
    );

    return {
      message: 'All exercise sessions deleted for this date',
      date,
      deleted_record_id: null,
      deleted_record_index: false,
      remaining_session_count: 0,
      aggregated: true,
    };
  }
}
