import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ReferenceRequest {
  @ApiProperty()
  @IsMongoId()
  subtypeId: string;

  @ApiProperty()
  @IsMongoId({ each: true })
  testIds: string[];
}
