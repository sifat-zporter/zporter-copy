import { UserTypes } from '../enum/user-types.enum';
import { IUser } from './users.interface';

export interface ISupporter extends IUser {
  supporterFootball?: ISupporterFootball;
  type?: UserTypes;
}

export interface ISupporterFootball {
  favoritePlayers: string[];
  favoriteClubs: string[];
  role: string;
  summary: string;
}
