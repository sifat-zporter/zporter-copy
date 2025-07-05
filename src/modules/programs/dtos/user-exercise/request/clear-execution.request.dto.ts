import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class ClearExecutionRequest {
  @ApiProperty()
  @IsMongoId()
  programId: string;
}
