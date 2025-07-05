import { TagsTypes } from '../../common/constants/common.constant';

export interface ITag {
  name?: string;
  type?: TagsTypes;
  createdAt?: Date;
}

export interface ICreateTag extends ITag {
  names?: string[];
}

export interface ISearchTag {
  query?: string;
  type?: TagsTypes;
}
