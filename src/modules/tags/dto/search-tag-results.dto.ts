import { IsArray } from 'class-validator';
import { ITag } from '../tags.interface';

export class SearchTagResultDto {
  @IsArray()
  tags: ITag[];
}
