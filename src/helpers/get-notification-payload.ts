import { GenderTypes } from '../common/constants/common.constant';
import { NotificationType } from '../modules/notifications/dto/notifications.req.dto';

export const getNotificationPayload = (
  type: NotificationType,
  username?: string,
  content?: string,
) => {
  switch (type) {
    case NotificationType.REMIND_ON_DIARY_UPDATE:
      return `${content}d since you updated your diary now!`;

    case NotificationType.COMMENT_POST:
      return `${content}`;

    case NotificationType.LIKE_POST:
      return `#${username} liked your post.`;

    case NotificationType.FEED_UPDATE:
      return `New Feed has been posted`;

    case NotificationType.ASK_JOIN_TEAM:
      return `Is that correct?`;

    case NotificationType.TEAM_TRAINING:
      return `Did you participate as well?`;

    case NotificationType.MATCH:
      return `Did you participate as well?`;

    case NotificationType.COACH_CREATE_DIARY_TRAINING:
      return `Did you participate as well?`;

    case NotificationType.COACH_CREATE_DIARY_MATCH:
      return `Coach ${content} has made a review of your match performance.`;

    case NotificationType.ACCEPT_JOIN_TEAM:
      return `#${username} says Welcome.`;

    case NotificationType.REJECT_JOIN_TEAM:
      return `#${username} asks you to control your team settings!`;

    case NotificationType.FRIEND_REQUEST:
      return `#${username} sent you a friend request.`;

    case NotificationType.FOLLOW_REQUEST:
      return `#${username} sent you a follow request.`;

    case NotificationType.FOLLOW:
      return `#${username} follows you.`;

    case NotificationType.ACCEPTED_FRIEND_REQUEST:
      return `#${username} accepted your friend request.`;

    case NotificationType.ACCEPTED_FOLLOW_REQUEST:
      return `#${username} accepted your follow request.`;

    case NotificationType.REJECT_FRIEND_REQUEST:
      return `#${username} rejected your friend request.`;

    case NotificationType.REJECT_FOLLOW_REQUEST:
      return `#${username} rejected your follow request.`;

    case NotificationType.DELETE_MEMBER_TEAM:
      return `#${username} deleted you from ${content} team. Is there any mistake?`;

    case NotificationType.BLOCK_MEMBER_TEAM:
      return `#${username} blocked you from ${content} team. Is there any mistake?`;

    case NotificationType.MEMBER_CONFIRM_BLOCK_MEMBER_TEAM:
      return `#${username} doesn't want to be blocked in ${content} team. Is there any mistake?`;

    case NotificationType.MEMBER_CONFIRM_DELETE_MEMBER_TEAM:
      return `#${username} doesn't want to be deleted in ${content} team. Is there any mistake?`;

    case NotificationType.ADMIN_CONFIRM_BLOCK_MEMBER_TEAM:
      return `#${username} added you back to ${content} team`;

    case NotificationType.ADMIN_CONFIRM_DELETE_MEMBER_TEAM:
      return `#${username} added you back to ${content} team.`;

    case NotificationType.INVITE_MEMBER_GROUP:
      return `Is that correct?`;

    case NotificationType.INVITE_MEMBER_TEAM:
      return `Is that correct?`;

    case NotificationType.ASK_JOIN_GROUP:
      return `Want to accept?`;

    case NotificationType.SEND_MESSAGE:
      return `${content}`;

    case NotificationType.SEND_ALL_FROM_ADMIN:
      return `You got a message from Admin.`;

    case NotificationType.ASK_FOR_REVIEW_SKILL_UPDATES:
      return `#${username} has asked you for a skills review.`;

    case NotificationType.ASK_FOR_REVIEW_DEVELOPMENT_TALK:
      return `#${username} has shared a Development note with you.`;

    case NotificationType.PLAYER_OF_THE_WEEK:
      return `Congratulations, you are the Player of the Week`;

    case NotificationType.ZTAR_OF_THE_MATCH:
      return `Congrats, You are the Ztar of the Match`;

    case NotificationType.DREAM_TEAM:
      return `Congratulation, you are part of this weeks Dream Team.`;

    case NotificationType.COACH_COMMENT_DEVELOPMENT_NOTE:
      return `Coach #${username} has reviewed your Development note.`;

    case NotificationType.TAG_FEED:
      return `#${username} tagged you in ${
        content === GenderTypes.Male ? 'his' : 'her'
      } posts.`;

    case NotificationType.FANTAZY_TEAM_WINNER_OF_THE_WEEK:
      return `Congratulations, you are this weeks Fantasy Manager winner!`;

    case NotificationType.FANTAZY_TEAM_GET_RESULT:
      return `This week, Dream Team are now published, check it out.`;

    case NotificationType.FANTAZY_MANAGER_OF_THE_MONTH:
      return `Congrats, You are the Fantazy Manager of the Month`;

    case NotificationType.REMIND_EDIT_FANTAZY:
      return `Remember to edit your Fantazy Dream Team before 22:00 tonight.`;

    case NotificationType.HOW_MANY_PLAYER_IS_PICKED_IN_THE_FANTAZY_TEAM:
      return `Congrats, You are part of ${content} Fantazy Teams!`;

    case NotificationType.NOTIFY_ABOUT_RANKING_OF_THE_FANTAZY_MANAGER:
      return `This week, You are ${content}!`;

    case NotificationType.VERIFY_TEST_RECORD:
      return `Asks for a Test verification. ${content}, is that correct?`;

    case NotificationType.VERIFY_TEST_RECORD_UPDATE:
      return `Asks for a Test Updated verification. ${content}, is that correct?`;

    default:
      return '';
  }
};
