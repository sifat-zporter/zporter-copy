import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import { ISupporterFootball } from '../../interfaces/suppoters.inteface';

export class SupporterFootballDto implements ISupporterFootball {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  //   @ArrayMaxSize(5)
  favoritePlayers: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  //   @ArrayMaxSize(5)
  favoriteClubs: string[];

  @ApiProperty({ default: 'user bio summary paragraph' })
  @IsString()
  summary: string;

  @ApiProperty({ default: 'Supporter' })
  @IsString()
  role = 'Supporter';
}

export class UpdateSupporterFootballDto extends PartialType(
  SupporterFootballDto,
) {}
