import { IsString } from 'class-validator';
export class OutputUserInfoDto {
  @IsString()
  inviterId: string;

  @IsString()
  username: string;

  @IsString()
  faceImage: string;

  @IsString()
  type: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
