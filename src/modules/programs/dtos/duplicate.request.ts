import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { TargetType } from '../enums/target.type';

export class DuplicateRequest {
  @ApiProperty()
  @IsMongoId()
  targetId: string;

  @ApiProperty({ enum: TargetType })
  @IsEnum(TargetType)
  targetType: TargetType;
}
