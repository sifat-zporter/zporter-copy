import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';

export class ShareResultRequest {
  @ApiProperty()
  @IsMongoId()
  userTestId: string;
}
