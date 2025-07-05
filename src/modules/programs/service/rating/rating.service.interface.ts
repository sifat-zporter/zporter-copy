import { TargetType } from '../../enums/target.type';

export interface IRatingService {
  voteDoc(
    currentUserId: string,
    type: TargetType,
    docId: string,
    star: number,
  ): Promise<void>;
}
