import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { TypeOfPost } from '../../feed/dto/feed.req.dto';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  content: string;
}

export class ListCommentQuery extends PaginationDto {
  @ApiProperty()
  @IsString()
  postId: string;

  @ApiProperty({ type: TypeOfPost })
  @IsEnum(TypeOfPost)
  typeOfPost: TypeOfPost;
}
