import { UserSocialLinksDto } from '../../users/dto/user/user-social-links.dto';
import { UserTypes } from '../../users/enum/user-types.enum';
import { IVideoLink } from '../../users/interfaces/common.interface';

export interface SupportingClubForBio {
  logoUrl: string;
  clubName: string;
  clubId: string;
}

export interface SupportingUserForBio {
  faceImage: string;
  username: string;
  userId: string;
}

export interface SupporterBio {
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
}
