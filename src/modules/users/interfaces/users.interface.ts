import { GenderTypes } from '../../../common/constants/common.constant';
import { IVideoLink } from './common.interface';

export interface IUser {
  username?: string;
  health?: IUserHealth;
  media?: IUserMedia;
  profile?: IUserProfile;
  settings?: IUserSettings;
  socialLinks?: IUserSocialLinks;
  inviterId?: string;
  updatedAt?: any;
  circleCompleted?: number;
}

export interface IUserSocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  veoHighlites?: string;
  tiktok?: string;
}

export interface IUserSettings {
  country?: ICountry;
  language?: string;
  public?: boolean;
}

export interface ICountry {
  alpha2Code?: string;
  name?: string;
  flag?: string;
  region?: string;
  alpha3Code?: string;
}

export interface IUserProfile {
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string[];
  gender?: GenderTypes;
  birthCountry?: ICountry;
  birthDay?: string;
  homeAddress?: string;
  postNumber?: string;
  region?: string;
  city?: string;
}

export interface IHeight {
  value?: number;
  updatedAt?: string;
}

export interface IWeight {
  value?: number;
  updatedAt?: string;
}

export interface IUserHealth {
  height?: IHeight;
  weight?: IWeight;
  leftFootLength?: number;
  rightFootLength?: number;
}

export interface IUserMedia {
  bodyImage?: string;
  faceImage?: string;
  teamImage?: string;
  videoLinks?: IVideoLink[] | [];
}

export interface SponsorInfoDto {
  sum?: number;
  exchange?: string;
  variable?: string;
  limitCost?: number;
  frequency?: string;
  headline?: string;
  uploadImageUrl?: string;
  message?: string;
}