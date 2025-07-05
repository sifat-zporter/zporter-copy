import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { VideoLinkSources } from '../../enum/common.enum';
import { IVideoLink } from '../../interfaces/common.interface';
import { IUserMedia } from '../../interfaces/users.interface';

const defaultVideoLinks = [
  {
    url: 'https://www.youtube.com/watch?v=z0W4c_G3suI',
    source: VideoLinkSources.YOUTUBE,
    thumbnailUrl: 'https://img.youtube.com/vi/z0W4c_G3suI/sddefault.jpg',
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/zporter-dev.appspot.com/o/Y2Mate.is%20-%20Best%20Football%20Skills%202020%20-%20Skill%20Mix%20%20HD-bKZPo8eRvs8-720p-1635233611935.mp4?alt=media&token=caa67205-f849-4968-b272-9f97a73f02e4',
    source: VideoLinkSources.ZPORTER,
    thumbnailUrl:
      'https://storage.googleapis.com/zporter-dev.appspot.com/thumbnails/thumbnail-87155c22-5f56-48f7-9f0e-475a5874a245_3.png',
  },
];

export class UserVideoLinkDto implements IVideoLink {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsEnum(VideoLinkSources)
  source: VideoLinkSources;

  @ApiProperty()
  @IsString()
  thumbnailUrl: string;
}

export class UserMediaDto implements IUserMedia {
  @ApiProperty({ default: process.env.DEFAULT_IMAGE })
  @IsString()
  faceImage?: string;

  @ApiProperty({ default: '' })
  @IsOptional()
  @IsString()
  bodyImage?: string;

  @ApiProperty({ default: '' })
  @IsOptional()
  @IsString()
  teamImage?: string;

  @ApiProperty({ default: defaultVideoLinks })
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => UserVideoLinkDto)
  videoLinks?: UserVideoLinkDto[];
}

export class UpdateUserMediaDto extends PartialType(UserMediaDto) {}
