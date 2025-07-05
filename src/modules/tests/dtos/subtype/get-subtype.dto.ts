import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, Max, Min } from 'class-validator';
import { TestType } from '../../enums/test-type';

export class GetSubtypeDto {
  @ApiProperty({ enum: TestType, default: TestType.PHYSICAL })
  @IsEnum(TestType)
  typeOfTest: TestType;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Max(20, { message: 'limit must be less than 20 !' })
  @Min(1, { message: 'limit must be more than 0 !' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  // @Max(20, { message: 'startAfter must be less than 20 !' })
  @Min(1, { message: 'startAfter must be more than 0 !' })
  startAfter: number;
}
