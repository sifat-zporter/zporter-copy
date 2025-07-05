import { TargetType } from '../../../programs/enums/target.type';

export interface ILibRatingService {
  voteDoc(
    currentUserId: string,
    type: TargetType,
    docId: string,
    star: number,
  ): Promise<void>;
}
