import { IsMongoId } from 'class-validator';

export class MemberLeaveRequestDto {
  @IsMongoId()
  public teamId: string;
}
