import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId } from 'class-validator';

export class BookmarkRequestDto {
  @IsMongoId()
  @ApiProperty()
  programId: string;
}
