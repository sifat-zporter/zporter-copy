import { Role } from '../../modules/diaries/enum/diaries.enum';
import { NotificationOptionsDto } from '../../modules/users/dto/user/user-settings.dto';
import { UserTypes } from '../../modules/users/enum/user-types.enum';
import { CountryDto } from '../dto/country.dto';

export class UserInfoDto {
  email?: string;
  isActive?: boolean;
  birthCountry?: CountryDto;
  firstName?: string;
  fcmToken?: string[];
  gender?: GenderTypes;
  height?: number;
  weight?: number;
  motherHeight?: number;
  fatherHeight?: number;
  city?: string;
  settingCountryRegion?: string;
  settingCountryName?: string;
  clubId?: string;
  currentHubspotId?: string;
  age?: number;
  teamIds?: string[];
  favoriteRoles?: string[];
  currentTeams?: string[];
  lastName?: string;
  fullName?: string;
  faceImage?: string;
  username?: string;
  type?: UserTypes;
  userId?: string;
  isOnline?: boolean;
  clubName?: string;
  clubLogoUrl?: string;
  timezone?: string;
  lastActive?: number;
  birthDay?: string;
  createdAt?: number;
  updatedAt?: number;
  shirtNumber?: number;
  isRelationship?: boolean;
  isFriend?: boolean;
  isFollowed?: boolean;
  isTeammates?: boolean;
  isPublic?: boolean;
  notificationOn?: boolean;
  notificationOptions?: NotificationOptionsDto;
  uid?: string;
  bioUrl?: string;
}

export enum TagsTypes {
  Speciality = 'SPECIALITY',
  Injury = 'INJURY',
  Practice = 'PRACTICE',
}

export enum BigQueryTable {
  DIARIES = 'diaries',
  TRANSFERS = 'club_transfer_histories',
  USERS = 'users',
  ZPORTER_NEWS = 'zporter_news',
  RSS_NEWS = 'rss_news',
  PLAIN_POSTS = 'plain_posts',
  PLAYER_OF_THE_WEEK = 'player_of_the_weeks',
  ZTAR_OF_THE_MATCH = 'ztar_of_the_matches',
  SAVED_POSTS = 'saved_posts',
  FRIENDS = 'friends',
  FOLLOWS = 'follows',
  RSS_PROVIDERS = 'rss_providers',
  SHARED_BIOGRAPHIES = 'shared_biographies',
  USERS_TEAMS = 'users_teams',
  PERSONAL_GOALS = 'personal_goals',
  GROUPS = 'groups_table',
  TEAMS = 'teams',
  USERS_GROUPS = 'users_groups',
  VIEW_BIOGRAPHIES = 'view_biographies',
  BLACKLISTS = 'blacklists',
  REMIND_UPDATE_DIARIES = 'remind_update_diaries',
  SHARED_LEADERBOARD = 'shared_leaderboard',
  POSTS = 'posts',
  ORIGINAL_DIARIES = 'original_diaries',
  BIRTHDAYS = 'birthdays',
  DREAM_TEAMS = 'dream_teams',
  SHARED_DREAM_TEAMS = 'shared_dream_teams',
  DREAM_TEAM_POSTS = 'dream_team_posts',
  FANTAZY_TEAM_POSTS = 'fantazy_team_posts',
  CLUBS = 'clubs',
  FANTAZY_MANAGER_OF_THE_MONTH = 'fantazy_manager_of_the_month',
  USER_TEST_POST = 'user_test_posts',
}

export enum GenderTypes {
  Male = 'MALE',
  Female = 'FEMALE',
  LGBT = 'LGBT',
  Other = 'OTHER',
}

export enum BestFootTypes {
  Right = 'RIGHT',
  Left = 'LEFT',
  Two_Footed = 'TWO_FOOTED',
}

export const splitRangeDate = {
  30: {
    split: 4,
  },
  90: {
    split: 7,
  },
  180: {
    split: 14,
  },
  365: {
    split: 30,
  },
  1095: {
    split: 365,
  },
};

export const splitDateByMonths = {
  1: {
    split: 4,
  },
  3: {
    split: 7,
  },
  6: {
    split: 14,
  },
  12: {
    split: 30,
  },
  18: {
    split: 70,
  },
  24: {
    split: 100,
  },
  36: {
    split: 140,
  },
};

export const levelDiary = {
  VERY_BAD: 1,
  BAD: 2,
  NORMAL: 3,
  GOOD: 4,
  VERY_GOOD: 5,
};

export const developmentProgressLevel = {
  VERY_BAD: 1,
  BAD: 2,
  NORMAL: 3,
  GOOD: 4,
  VERY_GOOD: 5,
};

export const painLevel = {
  VERY_LOW: 1,
  LOW: 2,
  NORMAL: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

export const performanceLevel = {
  VERY_BAD: 1,
  BAD: 2,
  NORMAL: 3,
  GOOD: 4,
  VERY_GOOD: 5,
};

export const physicallyStrainLevel = {
  VERY_LOW: 1,
  LOW: 2,
  NORMAL: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

export const ROLE_BY_GROUP = (role: Role) => {
  const roles = [
    {
      roleByGroup: Role.DEFENDERS,
      specificRoles: [Role.CB, Role.RB, Role.LB],
    },
    {
      roleByGroup: Role.MIDFIELDERS,
      specificRoles: [Role.CDM, Role.CM, Role.CAM, Role.RM, Role.LM],
    },
    {
      roleByGroup: Role.FORWARDS,
      specificRoles: [Role.CF, Role.ST, Role.RW, Role.LW],
    },
  ];

  return roles.find(({ roleByGroup }) => roleByGroup === role).specificRoles;
};

export const CACHE_KEYS = {
  GET_POSTS_CACHE_KEY: 'GET_POSTS_CACHE',
  GET_TEAM_MEMBER: 'GET_TEAM_MEMBER',
};

export const ResponseMessage = {
  Common: {
    SUCCESS: 'Success',
    BAD_REQUEST: 'Bad Request. Try again',
    GET_SUCCESS: 'Get success',
    NOTHING_TO_SAVE: 'Nothing to save',
    DELETED: 'Deleted',
    FORBIDDEN_RESOURCE: `You don't have the permission to access this resource`,
  },
  User: {
    UPDATED_PLAYER_DATA: 'Updated Player successfully in database',
    UPDATED_COACH_DATA: 'Updated Coach successfully in database',
    CANNOT_UPDATE: 'Cannot update this user',
    NOT_FOUND: 'User not found',
    GET_SUCCESS: 'Successfully get user data',
    UPDATE_SETTINGS_SUCCESS: 'Update user settings successfully',
  },
  Biography: {
    GET_PLAYER_BIO_SUCCESS: 'Successfully get player biography',
    GET_PLAYER_SEO_TEXT_SUCCESS: 'Successfully get player SEO text',
    GET_PLAYER_SEO_TEXT_FAIL:
      'User name or roleId must be put for getting SEO text.',
    GET_SUPPORTER_SEO_TEXT_SUCCESS: 'Successfully get supporter SEO text',
    GET_COACH_SEO_TEXT_SUCCESS: 'Successfully get coach SEO text',
    GET_COACH_BIO_SUCCESS: 'Successfully get coach biography',
    GET_USERS_URL: 'Successfully get users URL.',
  },
  Education: {
    POST_EDUCATION: 'Successfully uploads education details.',
  },
  Tag: {
    CREATED_TAGS: 'Saved tags successfully in database',
    NOTHING_TO_SAVE: 'Nothing to save in database',
    CANNOT_CREATED: 'Cannot create',
    GET_SUCCESS: 'Successfully get tag data',
  },
  Club: {
    CREATED_NEW_CLUB: 'Saved a new club successfully in database',
    CREATED_NEW_TEAM: 'Saved a new team successfully in database',
    GET_SUCCESS: 'Successfully get teams data',
    UPDATE_CLUB: 'Update a club successfully in database',
    TEAM_NOT_FOUND: 'Team not found',
    MEMBER_NOT_FOUND: 'Member not found',
    NOT_AN_ADMIN: 'Not an admin of the team',
    NOT_PERMISSION: `You don't have permission to delete member`,
    ALREADY_BLOCKED: 'Member already blocked',
    DELETE_MEMBER_TEAM: 'Delete member team successfully ',
    BLOCK_MEMBER_TEAM: 'Block member team successfully ',
    ALREADY_IN_TEAM: `Member has already in the team`,
    ADD_MEMBER_TEAM: 'Add member team successfully',
    CONFIRM_MISTAKE: 'Confirm mistake successfully',
    BLOCKED_NOT_FOUND: 'Member has not been blocked from this team',
    CANNOT_LEAVE_TEAM: `Can't leave team. Please reassigned owner to others`,
    DELETE_TEAM: 'Delete team successfully',
    DELETE_CLUB: 'Delete club successfully',
  },
  Invitation: {
    NOT_FOUND: 'Invitation code not found',
    GENERATE_INVITATION_CODE: 'Generate invitation code successfully',
    SEND_EMAIL_INVITATION_CODE: 'Send email successfully',
  },
  Diary: {
    CREATE_DIARY: 'Create new diary successfully',
    CREATE_HISTORIC: 'Create new historic training successfully',
    UPDATE_DIARY: 'Update the diary successfully',
    UPDATE_HISTORIC: 'Update  historic training successfully',
    GET_DIARY: 'Get the diary by filter param',
    GET_DIARY_CALENDAR_STATUS: 'Get the diary calendar status successfully',
    DELETE_DIARY: 'Delete the diary successfully',
    DELETE_HISTORIC: 'Delete historic training successfully',
    UPDATE_INJURY: 'Update the injury successfully',
    DELETE_INJURY: 'Delete the injury successfully',
    DIARY_NOT_FOUND: 'Diary not found',
    HISTORIC_NOT_FOUND: 'Historic not found',
    INJURY_NOT_FOUND: 'Injury not found',
    LIMIT_10HOUR_DIARY: 'Only create maximum 5 hours per day',
    EVENT_MATCH_REQUIRED: 'Events is required. Please fill out!',
    STATS_OVER_TIME: 'Your stats is over time',
  },
  Email: {
    EMAIL_ALREADY_REGISTERED: 'Email is already registered',
  },
  Career: {
    NOT_FOUND: 'Career not found',
    INVALID_CAREER_ID: 'Invalid career',
    GET_HISTORIC_SUCCESS: 'Get historic career success',
    GET_FUTURE_SUCCESS: 'Get future career success',
    UPDATED_SUCCESS: 'Update career success',
    CREATED_SUCCESS: 'Created career success',
    DELETED_SUCCESS: 'Deleted career success',
  },
  Feed: {
    POST_NOT_FOUND: 'Post not found',
    SAVED: 'Saved post successfully',
    UNSAVED: 'Unsaved post successfully',
    ALREADY_SAVE: 'Already saved this post',
    COMMENT_NOT_FOUND: 'Comment not found',
    CREATED_COMMENT: 'Create comment successfully',
    BLOCKED_COMMENT: 'Blocked comment successfully',
    LIKE: 'Like successfully',
    UNLIKE: 'UnLike successfully',
    HAVE_BLOCKED: 'You have blocked comment this post',
    DELETED_COMMENT: 'Deleted comment successfully',
    SUBSCRIBED: 'Subscribe provider successfully',
    UNSUBSCRIBED: 'Unsubscribe provider successfully',
    CANNOT_BLOCK: {
      CANNOT_BLOCK_YOURSELF: `Can't block yourself`,
      CANNOT_BLOCK_FROM_OTHER_POST: `Can't block from other's post`,
    },
    CREATED: 'Created post successfully',
    UPDATED: 'Updated post successfully',
    DELETED: 'Deleted post successfully',
  },
  Friend: {
    LIST_RELATIONSHIPS: 'Get list relationship successfully',
    ALREADY_REQUEST: 'Have already send request',
    ACCEPTED: 'Accept request successfully',
    REJECTED: 'Reject request successfully',
    REMOVED: 'Remove relationship successfully',
    NOT_FOUND: 'Request not found',
    REQUESTED: 'Send request successfully',
    UNBLOCKED: 'Unblock friend successfully',
  },
  Achievement: {
    GET_ACHIEVEMENT_SUCCESS: 'Get ACHIEVEMENT successfully',
    CREATED_ACHIEVEMENT: 'Created a new ACHIEVEMENT successfully',
    UPDATED_ACHIEVEMENT: 'Updated ACHIEVEMENT successfully',
    INVALID_ACHIEVEMENT_ID: 'Invalid ACHIEVEMENT',
    NOT_FOUND_ACHIEVEMENT: 'ACHIEVEMENT not found',
    DELETED_ACHIEVEMENT_SUCCESS: 'Deleted ACHIEVEMENT success',
  },
  Notification: {
    CREATED_FCM_TOKEN: 'Create FCM Token successfully',
    DELETE_NOTIFICATION: 'Delete notification successfully',
    NOT_FOUND: 'Notification not found',
    CANNOT_DELETE_NOTIFICATION: `Can't delete notifications others`,
    CANNOT_CHECK_NOTIFICATION: `Can't check notifications others`,
    MARK_AS_READ: 'Mark as read all notifications',
  },
  Group: {
    NOT_FOUND: 'Group not found',
    CREATED: 'Created group successfully',
    UPDATED: 'Updated group successfully',
    EXISTED: 'Group already exists',
    SEND_REQUEST_JOIN_GROUP: 'Send request join group successfully',
    ALREADY_IN: 'Already in group',
    ALREADY_REQUEST: 'Already request',
    ALREADY_BLOCKED: 'Already blocked',
    ACCEPTED: 'Accepted successfully',
    REJECTED: 'Rejected successfully',
    INVITED: 'Invite member successfully',
    MEMBER_NOT_FOUND: 'Member not found',
    BLOCKED: 'Block successfully',
    UNBLOCKED: 'Unblock successfully',
    NOT_BLOCKED: 'Member is not blocked',
    DELETE_GROUP: 'Delete group successfully',
    REQUEST_NOT_FOUND: 'Request not found',
    DELETE_REQUEST: 'Delete request successfully',
    DELETE_MEMBER: 'Delete member successfully',
    INVITATION_NOT_FOUND: 'Invitation not found',
    LEAVE_GROUP: 'Leave group successfully',
    CANCEL_REQUEST_JOIN_GROUP: 'Cancel request join group successfully',
  },
  Team: {
    NOT_FOUND: 'Team not found',
    CREATED: 'Created team successfully',
    UPDATED: 'Updated team successfully',
    EXISTED: 'Team already exists',
    TEAM_NAME_EXISTED: 'Team name already exists!',
    SEND_REQUEST_JOIN_TEAM: 'Send request join team successfully',
    ALREADY_IN: 'User already joined in team',
    ALREADY_REQUEST: 'Already request',
    ALREADY_BLOCKED: 'Already blocked',
    ACCEPTED: 'Accepted successfully',
    REJECTED: 'Rejected successfully',
    INVITED: 'Invite member successfully',
    MEMBER_NOT_FOUND: 'Member not found',
    BLOCKED: 'Block successfully',
    UNBLOCKED: 'Unblock successfully',
    NOT_BLOCKED: 'Member is not blocked',
    TEAM_NOT_BLOCKED: 'Team is not blocked!',
    DELETE_TEAM: 'Delete team successfully',
    REQUEST_NOT_FOUND: 'Request not found',
    DELETE_REQUEST: 'Delete request successfully',
    DELETE_MEMBER: 'Delete member successfully',
    INVITATION_NOT_FOUND: 'Invitation not found',
    LEAVE_TEAM: 'Leave team successfully',
    CANCEL_REQUEST_JOIN_TEAM: 'Cancel request join team successfully',
    JOIN_FAIL: 'Join in team fail!',
    CREATE_FAIL: 'Create team fail!',
    PERMISSION_DENY: 'Only Owner or Admin can edit team!',
  },
  Development_Talk: {
    NOT_FOUND: 'Development note not found',
    CREATED: 'Create development note successfully',
    UPDATED: 'Update development note successfully',
    DELETED: 'Delete development note successfully',
  },
  Fantazy: {
    CREATED: 'Create fantazy team successfully',
    UPDATED: 'Update fantazy team successfully',
    DELETED: 'Delete fantazy team successfully',
  },
  Test: {
    CREATED: 'Create tests successfully',
    UPDATED: 'Update tests successfully',
    DELETED: 'Delete tests successfully',
    EXISTED_TEST_NAME: 'Test Name is existed. Please choose another name!',
    TEST_EXISTED_NAME_IN_DUPLICATE:
      'Can not duplicate due to the existed name! Please change test name.',
    TEST_NOT_FOUND: 'Not found test!',

    SUBTYPE_EXISTED_NAME:
      'Subtype name is existed. Please choose another name!',
    SUBTYPE_NOT_FOUND: 'Not found subtype!',

    USER_TEST_NOT_FOUND: 'Not fount test result!',
    USER_TEST_CAN_NOT_DELETED: 'Can not delete test result!',
    USER_TEST_CAN_NOT_DELETED_VERIFIED_RESULT:
      'Can not delete the verified result!',
    USER_TEST_CAN_NOT_VERIED: 'Can not verify test result!',
    USER_TEST_CAN_NOT_UPDATED: 'Can not update the verified result!',
    USER_TEST_CAN_NOT_SHARE:
      'You do not own the result. Can not share test result!',
    USER_TEST_CAN_NOT_SHARE_PRIVATE: 'Can not share the PRIVATE test result!',
    USER_TEST_CAN_NOT_SHARE_UNVERIFIED:
      'Can not share the UNVERIFIED test result!',
    USER_TEST_CAN_NOT_VERIFY_AGAIN: 'Can NOT verify again!',
    USER_TEST_ERROR_VERIFY_MYSELF_RESULT:
      'Please have another user to verify your test results!',
    USER_TEST_HAVING_1_UNVERIFIED:
      'Just having 1 unverified result for each test!',
  },
  Library: {
    HEADLINE_EXISTED: 'Headline existed. Please use another one!',
    NOT_FOUND: 'Not found!',
    WRONG_TYPE_LIBRARY: 'Type is wrong!',
  },
  Program: {
    NOT_FOUND: 'Not found program',
    DUPLICATED_HEADLINE: 'Headline existed. Please try another headline!',
    RATING_NOT_IN_RANGE:
      'Rating accept value from 0.5 to 5⭐️ (such as: 0.5, 1, 1.5, ...)',
    WRONG_TYPE: 'Type is wrong!',
    ERROR_SAVING: 'Error on saving!',
    FIELDS_REQUIRED: 'Headline, Ingress, Description is required!',
    PROGRAM_HEADLINE_MAX_LENGTH:
      'Program headline is no more than 60 signs long',
    SESSION_HEADLINE_MAX_LENGTH:
      'Session headline is no more than 60 signs long',
    EXERCISE_HEADLINE_MAX_LENGTH:
      'Exercise headline is no more than 60 signs long',
  },
  Session: {
    CAN_NOT_DELETE: 'Existed exercises. Cannot delete session!',
    NOT_FOUND: 'Not found session',
  },
  Exercise: {
    NOT_FOUND: 'Not found exercise',
    CANNOT_DELETE_EXERCISE:
      'Cannot delete the last exercise. Please add other test before!',
  },
  UserExercise: {
    ALREADY_DONE: 'Already done this exercise.',
    MUST_DONE_PREVIOUS_EXERCISE: 'You must finish the previous exercise.',
    DONE_SESSION_EXERCISE:
      'Good Work, Program Done and Icon added to you Biography',
  },
  TestsGroup: {
    CREATED: 'Created tests group successfully',
    FOUND: 'Found tests group successfully',
    NOT_FOUND: 'Not found tests group',
    DELETED: 'Deleted tests group successfully',
    UPDATED: 'Updated tests group successfully',
  },
  Events: {
    INVALID_MONTH: 'Invalid month',
    INVALID_YEAR: 'Invalid year',
    FOUND: 'Found events successfully',
    NOT_FOUND: 'Event not found',
    DELETED: 'Event deleted successfully',
    CREATED: 'Event created successfully',
    UPDATED: 'Event updated successfully',
    NOT_CREATED: 'Unable to create event',
    NOT_UPDATED: 'Unable to update event',
    NOT_DELETED: 'Unable to delete event',
    CLUB_NOT_FOUND: 'Club not found',
    TEAM_NOT_FOUND: 'Team not found',
    NOT_ALLOWED: 'You are not allowed to perform this action',
    NOT_TEAM_OWNER: 'You are not the owner of given team',
    TEAM_NOT_BELONG_TO_CLUB: 'Given team does not belong to given club',
    NOT_EVENT_OWNER: 'You are not the owner of given event',
    NO_USERS_TO_UPDATE: 'No users to update',
    UPDATED_ATTENDANCE_STATUS: 'Attendance status updated successfully',
    UPDATED_STATUS: 'status updated successfully',
    UPDATED_EVALUATION: 'evaluation updated successfully',
    USER_NOT_PARTICIPANT: 'User is not a participant of this event',
    PARTICIPANT_NOT_FOUND: 'Participant not found',
    INVALID_EVENT_DATA: 'Invalid event data',
    COMMENT: {
      ADDED: 'Comment added successfully',
      UPDATED: 'Comment updated successfully',
      DELETED: 'Comment deleted successfully',
    },
    REMINDER: {
      CREATED: 'Reminder Created successfully',
      UPDATED: 'Reminder updated successfully',
    },
    TEAM_TRAINING: {
      CREATED: 'Team training Created successfully',
      UPDATED: 'Team training updated successfully',
    },
    MATCH: {
      CREATED: 'Match Event Created successfully',
      UPDATED: 'Match Event updated successfully',
    },
    MEETING: {
      CREATED: 'Meeting Event Created successfully',
      UPDATED: 'Meeting Event updated successfully',
    },
    PERSONAL_TRAINING: {
      CREATED: 'Personal Training Event Created successfully',
      UPDATED: 'Personal Training Event updated successfully',
    },
    GROUP_TRAINING: {
      CREATED: 'Group Training Event Created successfully',
      UPDATED: 'Group Training Event updated successfully',
    },
    CAMP: {
      CREATED: 'Camp Event Created successfully',
      UPDATED: 'Camp Event updated successfully',
    },
    SEMINAR: {
      CREATED: 'Seminar Event Created successfully',
      UPDATED: 'Seminar Event updated successfully',
    },
    CUP: {
      CREATED: 'Cup Event Created successfully',
      UPDATED: 'Cup Event updated successfully',
    },
    SERIES: {
      CREATED: 'Series Event Created successfully',
      UPDATED: 'Series Event updated successfully',
    },
    OTHER: {
      CREATED: 'Other Event Created successfully',
      UPDATED: 'Other Event updated successfully',
    }
  }
};
export const EmailSubject = {
  SEND_PARENT_UNDER_13: 'Parent information about Zporter',
  RESET_PASSWORD: 'Reset your password',
  NEW_DEVICE_SIGN_IN: 'New sign in @ your Zporter Account',
  VERIFY_EMAIL: 'Verify your registered eMail address at Zporter',
  MONTHLY_VISIT: 'Your monthly Zporter Visit- and Visitor Stats',
  MID_MONTH_UPDATE: 'Mid month Zporter Leaderboard update',
  DRAFT_PLAYER_CONFIRMATION: 'Confirm your Zporter Draft Player',
  DRAFT_PLAYER_LINK: 'Please confirm your Zporter Player',
};

export const EmailTemplateId = {
  SEND_PARENT_UNDER_13: 'd-f03b3c4b417b4108801093a7c67c48df',
  RESET_PASSWORD: 'd-603fa52058c645dcaf0a6cf1a371aa66',
  NEW_DEVICE_SIGN_IN: 'd-acfba4d332d9416c858136e838b0e055',
  VERIFY_EMAIL: 'd-ca58ac7701004d2f9c29169f2d87279c',
  MONTHLY_VISIT: 'd-09bc04b53f8444c3a667f4a3293b55ac',
  MID_MONTH_UPDATE: 'd-0924a2a9433e44e98d1c9c89cbf350fd',
  DRAFT_PLAYER_CONFIRMATION: 'd-9143a40eacfe4c8aaaf543d87d0dd527',
  DRAFT_PLAYER_LINK: 'd-b1c42717daed453b90a118ca4d9a6305',
};

export const CacheId = {
  PLAYER_AVG_RADAR: 'playerAvgRadar',
  COACH_AVG_RADAR: 'coachAvgRadar',
};

export const ZporterIcon = {
  WHITE_ICON:
    'https://firebasestorage.googleapis.com/v0/b/zporter-dev-media/o/media%2Ficon_zporter_white48.png?alt=media&token=d9e219c4-4474-4f76-8aaa-c8b1abc35cd4',
  BLACK_ICON: 'https://zporter.co/assets/logoAndIcon/icon_zporter_Black40.png',
};

// Latest BMI = 23.2 (updated: 2022)
export const AvgBMI = 23.2;

export const MALE = ['man', 'men', 'boys', 'boy', 'male'];
export const FEMALE = [
  'woman',
  'women',
  'girls',
  'girl',
  'female',
  'fem',
  'lgbt',
  'other',
];

export const ZPORTER_DEFAULT_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/zporter-dev.appspot.com/o/files%2F10555.png?alt=media&token=5a9fbdb6-6c86-4126-abce-931e1f680fa3';

export const USER_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
};
