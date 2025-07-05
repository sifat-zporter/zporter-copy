import { MemberType } from '../../teams/dto/teams.req.dto';
import { NotificationType } from '../dto/notifications.req.dto';

//TODO: need to complete
export const generateTitleNotification = <
  //# We use generics T for prepare for the unknown future cases.
  T extends {
    [key: string]: any;
  },
>(
  notificationType: NotificationType,
  others?: T,
) => {
  switch (notificationType) {
    case NotificationType.ACCEPT_JOIN_TEAM:
      return 'Zporter';

    case NotificationType.REJECT_JOIN_TEAM:
      return 'Zporter';

    case NotificationType.BLOCK_MEMBER_TEAM:
      return 'Zporter';

    case NotificationType.DOWNGRADE_TEAM_MEMBER_TYPE:
      return `#${
        others.username
      } downgraded you to be the ${others.memberType.toLowerCase()} of ${
        others.teamName
      } team`;

    case NotificationType.UPGRADE_TEAM_MEMBER_TYPE:
      return `#${
        others.username
      } upgraded you to be the ${others.memberType.toLowerCase()} of ${
        others.teamName
      } team`;

    case NotificationType.ASK_JOIN_TEAM:
      return `#${others.username as string} is a ${others.memberType} of your ${
        others.teamName
      } team`;

    default:
      return 'Zporter';
      break;
  }
};
