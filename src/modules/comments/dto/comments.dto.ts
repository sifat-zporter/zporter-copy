import { IsOptional, IsUUID } from 'class-validator';
import { CommentEntity } from '../ comments.entity';
import { PickType } from '@nestjs/swagger';
import { IsIntMin, IsIntNumber, IsObjectId } from '../comment.validator';

export class GetCommentDto {
  @IsOptional()
  @IsIntMin(1)
  @IsIntNumber()
  page?: number;

  @IsOptional()
  @IsIntMin(1)
  @IsIntNumber()
  limit?: number;
}

export class GetCommentResult {
  totalPage: number;
  body: CommentEntity[];
}

export class CreateCommentDto extends PickType(CommentEntity, [
  'comments',
  'type',
  'typeId',
  'userId',
] as const) {}

export class DeleteCommentPayload {
  @IsUUID()
  userId: string;

  @IsObjectId()
  id: string;
}

export type ResponseDelete = {
  status: string;
};
