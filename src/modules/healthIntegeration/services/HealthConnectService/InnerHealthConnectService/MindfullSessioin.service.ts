import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../config/firebase.config';
import { HealthServiceDate } from '../../CommonServicesUsedByAll/date-function.service';
import { MindfulnessSessionRecordDto } from '../../../dto/GoogleConnect/MindFullSsessionRecord.dto';

@Injectable()
export class HealthConnectServiceMindfulness {
  constructor(private readonly dateService: HealthServiceDate) {}

  async storeMindfulnessSession(
    userId: string,
    dto: MindfulnessSessionRecordDto,
  ) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const sameDay =
      this.dateService.getDateKey(startTime) ===
      this.dateService.getDateKey(endTime);

    const plainMetadata = dto.metadata
      ? JSON.parse(JSON.stringify(dto.metadata))
      : {};

    if (sameDay) {
      const date = this.dateService.getDateKey(startTime);
      const result = await this.storeSessionByDate(userId, date, {
        ...dto,
        metadata: plainMetadata,
      });
      return [{ date, ...result }];
    } else {
      // Split at local midnight (not UTC)
      const localMidnight = new Date(startTime);
      localMidnight.setHours(24, 0, 0, 0);

      const firstDate = this.dateService.getDateKey(startTime);
      const secondDate = this.dateService.getDateKey(endTime);

      const firstPart: MindfulnessSessionRecordDto = {
        ...dto,
        endTime: localMidnight.toISOString(),
        metadata: plainMetadata,
      };

      const secondPart: MindfulnessSessionRecordDto = {
        ...dto,
        startTime: localMidnight.toISOString(),
        metadata: plainMetadata,
      };

      const [firstResult, secondResult] = await Promise.all([
        this.storeSessionByDate(userId, firstDate, firstPart),
        this.storeSessionByDate(userId, secondDate, secondPart),
      ]);

      return [
        { date: firstDate, ...firstResult },
        { date: secondDate, ...secondResult },
      ];
    }
  }

  private async storeSessionByDate(
    userId: string,
    date: string,
    dto: MindfulnessSessionRecordDto,
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
      ? docSnap.data()?.mindfulness?.sessions || []
      : [];

    // Prevent duplicate sessions by start_time and title
    const isDuplicate = existingSessions.some(
      (session) =>
        session.start_time === dto.startTime && session.title === dto.title,
    );

    if (isDuplicate) {
      return {
        record_id: null,
        aggregated: false,
        message:
          'Duplicate mindfulness session record for this time and title already exists',
        sample_count: existingSessions.length,
      };
    }

    const newSession = {
      id: uuidv4(),
      title: dto.title,
      notes: dto.notes || '',
      start_time: dto.startTime,
      end_time: dto.endTime,
      start_zone_offset: dto.startZoneOffset || null,
      end_zone_offset: dto.endZoneOffset || null,
      metadata: dto.metadata || {},
    };

    const updatedSessions = [...existingSessions, newSession];

    await docRef.set(
      {
        mindfulness: {
          sessions: updatedSessions,
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
        .doc(newSession.id)
        .set({
          userId,
          type: 'MINDFULNESS_SESSION',
          date,
          path: docRef.path,
        });

      recordIdAdded = true;
    } catch (error) {
      console.error('Failed to store record_id index:', error);
    }

    return {
      record_id: newSession.id,
      added_record_id: recordIdAdded,
      aggregated: false,
      message: 'Mindfulness session record stored',
      sample_count: updatedSessions.length,
    };
  }

  async getMindfulnessSession(
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
      if (
        !data ||
        data.userId !== userId ||
        data.type !== 'MINDFULNESS_SESSION'
      ) {
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
      ? docSnap.data()?.mindfulness?.sessions || []
      : [];

    const lastUpdated = docSnap.exists
      ? docSnap.data()?.mindfulness?.last_updated || null
      : null;

    if (recordId) {
      const session = sessions.find((s) => s.id === recordId);
      return session
        ? {
            date: targetDate,
            record_id: session.id,
            aggregated: false,
            sample: session,
          }
        : {
            message: 'Session not found',
            date: targetDate,
            record_id: recordId,
          };
    }

    return {
      date: targetDate,
      aggregated: false,
      samples: sessions,
    };
  }

  async deleteMindfulnessSession(
    userId: string,
    { date, recordId }: { date?: string; recordId?: string },
  ) {
    // If no date but recordId provided, get the date from record_id index
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

      if (
        !data ||
        data.userId !== userId ||
        data.type !== 'MINDFULNESS_SESSION'
      ) {
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
        'A valid "date" string must be provided to delete mindfulness session data.',
      );
    }

    // Reference to daily summary doc for given date
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
        message: 'No mindfulness session data found for this date',
        userId,
        date,
      };
    }

    const data = docSnap.data();
    const existingSessions: any[] = data?.mindfulness?.sessions || [];

    if (recordId) {
      // Delete specific session by recordId
      const filteredSessions = existingSessions.filter(
        (session) => session.id !== recordId,
      );

      if (filteredSessions.length === existingSessions.length) {
        return {
          message: 'No mindfulness session found with the provided ID',
          userId,
          date,
          deleted: false,
        };
      }

      // Update doc with filtered sessions
      await docRef.set(
        {
          mindfulness: {
            sessions: filteredSessions,
            last_updated: new Date().toISOString(),
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
        message: 'Mindfulness session deleted',
        date,
        deleted_record_id: recordId,
        deleted_record_index: deletedRecordIndex,
        remaining_session_count: filteredSessions.length,
        aggregated: false,
      };
    }

    // If no recordId provided, delete all mindfulness sessions for the date

    // Delete all record_id docs for sessions of this date using batch
    const batch = db.batch();

    for (const session of existingSessions) {
      const recordIdDocRef = db
        .collection('users')
        .doc(userId)
        .collection('healthIntegrationData')
        .doc('healthConnect')
        .collection('record_id')
        .doc(session.id);

      batch.delete(recordIdDocRef);
    }

    await batch.commit();

    // Clear all sessions in the main doc
    await docRef.set(
      {
        mindfulness: {},
      },
      { merge: true },
    );

    return {
      message:
        'All mindfulness sessions for this date deleted, including record index docs',
      date,
      aggregated: false,
      deleted_record_id: null,
      deleted_record_index: true,
      remaining_session_count: 0,
    };
  }
}
