import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { LikeQueryDto, PostQueryDto } from '../feed/dto/feed.req.dto';
import { UserCommentDto } from '../feed/dto/feed.res.dto';
import { CommentService } from './comment.service';
import { CreateCommentDto, ListCommentQuery } from './dto/comment.req.dto';
import { ResponseCreateCommentDto } from './dto/comment.res.dto';

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Comments')
@Controller('comment')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('get-list-comments')
  @ApiOperation({
    summary: `Get list comment`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListComments(
    @Query() listCommentQuery: ListCommentQuery,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.commentService.getListComments(listCommentQuery, userRoleId);
  }

  @Post('create-comment')
  @Throttle(10, 60)
  @ApiOperation({
    summary: `Create comment on post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Feed.CREATED_COMMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  createComment(
    @Body() createCommentDto: CreateCommentDto,
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() postQueryDto: PostQueryDto,
  ) {
    return this.commentService.createComment(
      createCommentDto,
      postQueryDto,
      userRoleId,
    );
  }

  @Post('like-comment')
  @Throttle(10, 60)
  @ApiOperation({
    summary: `Like comment on post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async likeComment(
    @Query() likeQueryDto: LikeQueryDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<string> {
    return this.commentService.likeComment(userRoleId, likeQueryDto);
  }

  @Post('block-comment/:commentId')
  @ApiOperation({
    summary: `Block user comment from post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Feed.BLOCKED_COMMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  blockComment(
    @Query() postQueryDto: PostQueryDto,
    @Param('commentId') commentId: string,
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.commentService.blockComment(
      postQueryDto,
      commentId,
      userRoleId,
    );
  }

  @Delete('delete-comment/:commentId')
  @ApiOperation({
    summary: `Delete comment from post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Feed.DELETED_COMMENT,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  deleteComment(
    @Query() postQueryDto: PostQueryDto,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.deleteComment(postQueryDto, commentId);
  }
}
