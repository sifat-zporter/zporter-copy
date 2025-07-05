import { UserSocialLinksDto } from '../../users/dto/user/user-social-links.dto';
import { UserTypes } from '../../users/enum/user-types.enum';
import { IVideoLink } from '../../users/interfaces/common.interface';
import {
  SupporterBio,
  SupportingClubForBio,
  SupportingUserForBio,
} from '../interfaces/supporter-bio.interface';

export class SupporterBioDto implements SupporterBio {
  userId: string;
  lastUpdatedDate: string;
  username: string;
  faceImageUrl: string;
  firstName: string;
  lastName: string;
  position: string;
  supportingClubIconUrls: SupportingClubForBio[];
  supportingUserAvatarUrls: SupportingUserForBio[];
  birthDay: string;
  countryFlagUrl: string;
  age: number;
  summary: string;
  topVideoLinks: IVideoLink[] | [];
  circleCompleted: number;
  socialLinks: UserSocialLinksDto;
  userRole: UserTypes;
  bioUrl: string;
  year: number | string;
  city: string;
  country: string;
  height: number | string;
  weight: number | string;
  favoriteClubs: string[];
  favoritePlayers: string[];
}
