import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ResponseMessage } from '../../common/constants/common.constant';
import { db } from '../../config/firebase.config';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import {
  CreateNotificationDto,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CoachCommentDevelopmentNoteDto,
  GetDevelopmentNoteQuery,
  PlayerCreateDevelopmentNoteDto,
  PlayerUpdateDevelopmentNoteDto,
} from './dto/development-talk.req.dto';

@Injectable()
export class DevelopmentTalkService {
  constructor(private readonly notificationsService: NotificationsService) {}
  async findOne(
    currentUserId: string,
    devTalkId: string,
  ): Promise<
    FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
  > {
    const devTalkRef = await db
      .collection('development_talks')
      .doc(devTalkId)
      .get();

    if (!devTalkRef.exists || devTalkRef.data()?.playerId !== currentUserId) {
      throw new HttpException(
        ResponseMessage.Development_Talk.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return devTalkRef;
  }

  async findOneByQuery(
    currentUserId: string,
    getDevelopmentNoteQuery: GetDevelopmentNoteQuery,
  ) {
    const { playerId, teamId, playerNotedAt } = getDevelopmentNoteQuery;

    let devTalkRef = db
      .collection('development_talks')
      .where('playerId', '==', playerId);

    if (teamId) {
      devTalkRef = devTalkRef.where('teamId', '==', teamId);
    }

    if (playerNotedAt) {
      const from = playerNotedAt
        ? +moment.utc(playerNotedAt).startOf('day').format('x')
        : +moment.utc().startOf('day').format('x');

      const to = playerNotedAt
        ? +moment.utc(playerNotedAt).endOf('day').format('x')
        : +moment.utc().endOf('day').format('x');

      devTalkRef = devTalkRef
        .where('createdAt', '>=', from)
        .where('createdAt', '<=', to);
    }

    const devTalkSnapshot = await devTalkRef.get();

    const devTalkDocs = devTalkSnapshot.docs;

    const data = devTalkDocs.map((doc) => {
      return { ...doc.data(), devTalkId: doc.id };
    });

    return data[0] || {};
  }

  async playerCreateDevelopmentNote(
    currentUserId: string,
    playerCreateDevelopmentTalkDto: PlayerCreateDevelopmentNoteDto,
  ) {
    const { playerNotedAt } = playerCreateDevelopmentTalkDto;

    const createdAt = playerNotedAt
      ? +moment.utc(playerNotedAt).format('x')
      : +moment.utc().format('x');

    const from = +moment.utc(createdAt).startOf('day').format('x');
    const to = +moment.utc(createdAt).endOf('day').format('x');

    const devTalkRef = await db
      .collection('development_talks')
      .where('playerId', '==', currentUserId)
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .get();

    if (!devTalkRef.empty) {
      throw new HttpException(
        'Limit 1 development note a day',
        HttpStatus.METHOD_NOT_ALLOWED,
      );
    }

    await db.collection('development_talks').add({
      ...playerCreateDevelopmentTalkDto,
      playerNotedAt: createdAt,
      playerId: currentUserId,
      createdAt,
      updatedAt: createdAt,
    });
  }

  async playerUpdateDevelopmentNote(
    developmentTalkId: string,
    currentUserId: string,
    playerUpdateDevelopmentNoteDto: PlayerUpdateDevelopmentNoteDto,
  ) {
    const devTalkRef = await this.findOne(currentUserId, developmentTalkId);

    devTalkRef.ref.set(
      {
        ...playerUpdateDevelopmentNoteDto,
      },
      { merge: true },
    );

    return ResponseMessage.Development_Talk.UPDATED;
  }

  async deleteDevelopmentNote(
    currentUserId: string,
    developmentTalkId: string,
  ) {
    const devTalkRef = await this.findOne(currentUserId, developmentTalkId);

    devTalkRef.ref.delete();

    return ResponseMessage.Development_Talk.DELETED;
  }

  async coachCommentDevelopmentNote(
    currentUserId: string,
    devTalkId: string,
    coachCommentDevelopmentNoteDto: CoachCommentDevelopmentNoteDto,
  ) {
    const { coachNotedAt } = coachCommentDevelopmentNoteDto;

    const devTalkRef = await db
      .collection('development_talks')
      .doc(devTalkId)
      .get();

    if (!devTalkRef.exists) {
      throw new HttpException(
        ResponseMessage.Development_Talk.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const createdAt = coachNotedAt
      ? +moment.utc(coachNotedAt).format('x')
      : +moment.utc().format('x');

    devTalkRef.ref.set(
      {
        ...coachCommentDevelopmentNoteDto,
        coachId: currentUserId,
        coachNotedAt: createdAt,
      },
      { merge: true },
    );

    const payload = new CreateNotificationDto();

    const [coachInfo, playerInfo, updatedDevTalkRef] = await Promise.all([
      mappingUserInfoById(currentUserId),
      mappingUserInfoById(devTalkRef.data()?.playerId),
      db.collection('development_talks').doc(devTalkId).get(),
    ]);

    payload.token = playerInfo.fcmToken;
    payload.senderId = coachInfo.userId;
    payload.receiverId = playerInfo.userId;
    payload.largeIcon = coachInfo.faceImage;
    payload.title = 'Development Notes';
    payload.username = coachInfo.username;
    payload.notificationType = NotificationType.COACH_COMMENT_DEVELOPMENT_NOTE;
    payload.userType = coachInfo.type;
    payload.others = {
      devTalkId,
      developmentNoteData: JSON.stringify(updatedDevTalkRef.data()),
    };

    await this.notificationsService.sendMulticastNotification(payload);

    return ResponseMessage.Development_Talk.UPDATED;
  }
}
