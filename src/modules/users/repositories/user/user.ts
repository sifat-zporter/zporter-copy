import mongoose from 'mongoose';
import { Diary } from '../../../diaries/entities/diaries.entity';
import { Friend } from '../../../friends/entities/friends.entity';
import { CoachCareerDto } from '../../dto/coach/coach-career.dto';
import { CoachSkillsDto } from '../../dto/coach/coach-skills.dto';
import { PlayerCareerDto } from '../../dto/player/player-career.dto';
import { PlayerSkillsDto } from '../../dto/player/player-skills.dto';
import { UserMediaDto } from '../../dto/user/user-media.dto';
import { UserProfileDto } from '../../dto/user/user-profile.dto';
import { UserSettingsDto } from '../../dto/user/user-settings.dto';
import { UserSocialLinksDto } from '../../dto/user/user-social-links.dto';
import { UserTypes } from '../../enum/user-types.enum';
import { Health } from './health';

//TODO: need to clear DTO -> entity for repository
export class User {
  _id: mongoose.Types.ObjectId;
  uid: string;
  account: {
    email: string;
    isActive: boolean;
    createdAt: number;
    expiredIn: number;
    isVerified: boolean;
    verifyCode: string;
  };
  fullName: string;
  profile: UserProfileDto;
  media: UserMediaDto;
  settings: UserSettingsDto;
  health: Health;
  socialLinks: UserSocialLinksDto;
  timezone: string;
  type: UserTypes;
  username: string;
  circleCompleted: number;
  fcmToken: string[];
  isOnline: boolean;
  playerCareer: PlayerCareerDto;
  coachCareer: CoachCareerDto;
  career: PlayerCareerDto | CoachCareerDto;
  skills: PlayerSkillsDto | CoachSkillsDto;
  friends: Friend[];
  diaries: Diary[];
  teamIds: string[];
  roleId: string;
  userId: string;
  totalPoint: number;
  timeoutTotalPoint: number;

  updatedAt: number;
  isDeleted: boolean;
}
