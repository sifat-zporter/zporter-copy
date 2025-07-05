import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { TestType } from '../../enums/test-type';

export class SubtypeRequest {
  @ApiProperty({ enum: TestType, default: TestType.PHYSICAL })
  @IsEnum(TestType)
  typeOfTest: TestType;

  @ApiProperty()
  @IsString()
  subtype: string;
}
