import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TestType } from '../../../enums/test-type';

export class GetUserTestByType {
  @ApiProperty({ enum: TestType })
  @IsEnum(TestType)
  typeOfTest: TestType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userIdQuery?: string;
}

export class GetListUserTestByCategory extends OmitType(GetUserTestByType, [
  'userIdQuery',
]) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId: string;
}
