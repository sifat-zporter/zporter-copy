import { IsEnum, IsMongoId, IsString } from 'class-validator';
import { TargetType } from '../../enums/target.type';
import { ApiProperty } from '@nestjs/swagger';

export class CommentRequestDto {
  @IsMongoId()
  @ApiProperty()
  targetId: string;

  @ApiProperty()
  @IsEnum(TargetType)
  type: TargetType;

  @ApiProperty()
  @IsString()
  content: string;
}
