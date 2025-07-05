import { UserTypes } from '../../users/enum/user-types.enum';

export class CreateHubspotContactDto {
  firstname: string;
  lastname?: string;
  email: string;
  user_id?: string;
  user_type?: UserTypes;
  club?: string;
  team_name?: string;
  date_of_birth?: string;
  city?: string;
  phone?: string;
}
