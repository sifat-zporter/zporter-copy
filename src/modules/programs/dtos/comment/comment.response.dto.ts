export class CommentResponse {
  id: string = '';

  content: string;

  createdBy: string;
  bioUrl: string;
  faceImage: string;

  likeUserIds: string[];

  createdAt: string;
}
