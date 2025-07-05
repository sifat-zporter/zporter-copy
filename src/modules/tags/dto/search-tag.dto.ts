import { IsEnum, IsString } from 'class-validator';
import { TagsTypes } from '../../../common/constants/common.constant';
import { ISearchTag } from '../tags.interface';

export class SearchTagDto implements ISearchTag {
  @IsString()
  query: string;

  @IsEnum(TagsTypes)
  type: TagsTypes;
}
