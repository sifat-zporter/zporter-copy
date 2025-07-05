import { UserTypes } from '../../enum/user-types.enum';

export class UserFlippingQueryDto {
  userType?: UserTypes;

  birthDay?: string;

  city?: string;

  country?: string;

  clubId?: string;

  acceptedTeamIds?: string[];
}
