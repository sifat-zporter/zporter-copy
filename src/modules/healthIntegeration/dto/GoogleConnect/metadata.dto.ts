import { IsString } from 'class-validator';

export class MetadataDto {
  @IsString()
  source: string;

  @IsString()
  device: string;
}
