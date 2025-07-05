import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { TargetType } from '../../enums/target.type';

export class GetCommentRequest {
  @IsMongoId()
  @ApiProperty()
  targetId: string;

  @ApiProperty()
  @IsEnum(TargetType)
  type: TargetType;
}
