import { CommentResponse } from '../../dtos/comment/comment.response.dto';
import { TargetType } from '../../enums/target.type';

export interface ICommentService {
  commentDoc(
    currentUserId: string,
    docId: string,
    content: string,
    type: TargetType,
  ): Promise<void>;

  getComment(targetId: string, type: TargetType): Promise<CommentResponse[]>;
}
