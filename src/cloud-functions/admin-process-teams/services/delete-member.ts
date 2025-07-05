import { HttpException, HttpStatus } from '@nestjs/common';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { db } from '../../../config/firebase.config';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../../modules/notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import {
  MemberConfirm,
  TeamMemberType,
} from '../../../modules/teams/dto/teams.req.dto';
import { UserTypes } from '../../../modules/users/enum/user-types.enum';

const notificationsService = new NotificationsService();

class DeleteMemberOutOfTeamDto {
  adminFlamelinkId: string;
  memberIds: string[];
  teamId: string;
  type: TeamMemberType;
}

export const deleteMembersOutOfTeam = async (
  deleteMemberOutOfTeamDto: DeleteMemberOutOfTeamDto,
) => {
  const { adminFlamelinkId, memberIds, teamId, type } =
    deleteMemberOutOfTeamDto;

  const deleteMembers = memberIds.map(async (memberId) => {
    const [adminFlamelinkRef, teamRef, userTeamRef, memberRef] =
      await Promise.all([
        db.collection('users').doc(adminFlamelinkId).get(),
        db.collection('teams').doc(teamId).get(),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', memberId)
          .get(),
        db.collection('users').doc(memberId).get(),
      ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    let oldMemberType: TeamMemberType = type;
    userTeamRef.forEach((doc) => {
      if (doc.data()?.memberType) {
        oldMemberType = doc.data()?.memberType as TeamMemberType;
      }
      doc.ref.delete();
    });

    const payload = new CreateNotificationDto();
    payload.token = memberRef.data()?.fcmToken as string[];
    payload.largeIcon =
      process.env.ZPORTER_IMAGE ||
      (adminFlamelinkRef.data()?.media?.faceImage as string);
    // payload.username = adminFlamelinkRef?.data()?.username as string;
    payload.username = 'Zporter' as string;
    payload.title = 'Zporter';
    payload.notificationType = NotificationType.DELETE_MEMBER_TEAM;
    payload.senderId = adminFlamelinkId;
    payload.receiverId = memberRef.id as string;
    payload.userType = memberRef.data()?.type as UserTypes;
    payload.content = teamRef.data()?.teamName;
    payload.others = {
      teamId,
      oldMemberType,
      nextNotificationType: NotificationType.MEMBER_CONFIRM_DELETE_MEMBER_TEAM,
      memberConfirm: MemberConfirm.MEMBER,
    };

    await notificationsService.sendMulticastNotification(payload);
  });

  await Promise.all(deleteMembers);
};
