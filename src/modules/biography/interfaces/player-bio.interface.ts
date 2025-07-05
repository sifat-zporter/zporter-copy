import { BestFootTypes } from '../../../common/constants/common.constant';
import { Status } from '../../friends/enum/friend.enum';
import { IVideoLink } from '../../users/interfaces/common.interface';
import {
  IPlayerRadarGKSkills,
  IPlayerRadarSkills,
} from '../../users/interfaces/players.interface';
import { IUserSocialLinks } from '../../users/interfaces/users.interface';

export interface PlayerBio {
  lastUpdatedDate: string;
  firstName: string;
  faceImageUrl: string;
  lastName: string;
  username: string;
  position: string;
  currentClubIconUrl: string;
  contractedUntil: string;
  estMarketValue: number;
  leftFoot: number;
  rightFoot: number;
  bestFoot: BestFootTypes;
  age: number;
  birthDay: string;
  countryFlagUrl: string;
  height: number;
  weight: number;
  summary: string;
  topVideoLinks: IVideoLink[] | [];
  specialities: string[];
  starRating: number;
  circleCompleted: number;
  playerRadarSkills: IPlayerRadarSkills;
  playerRadarGKSkills: IPlayerRadarGKSkills;
  socialLinks: IUserSocialLinks;
  isPublic: boolean;
  friendStatus?: Status;
  followStatus?: Status;
  friendCount: number;
  followCount: number;
  fanCount: number;
  isConfirmBox: boolean;
  isFollowed: boolean;
}
