import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString } from 'class-validator';
import { TagsTypes } from '../../../common/constants/common.constant';
import { ICreateTag } from '../tags.interface';

export class CreateTagDto implements ICreateTag {
  @ApiProperty({ default: [] })
  @IsString({ each: true })
  @IsArray()
  names: string[];

  @ApiProperty()
  @IsEnum(TagsTypes)
  type: TagsTypes;
}

export class CreateTagMongoDto {
  @ApiProperty()
  @IsString()
  tagId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEnum(TagsTypes)
  type: TagsTypes;
}