import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { ReportRequestDto } from './dto/feed.report.request.dto';
import {
  CreatePlainPostDto,
  GetListFeedQuery,
  GetListNewsOfProviderQuery,
  LikeQueryDto,
  PostQueryDto,
  SynchronizePostDto,
  UpdatePlainPostDto,
} from './dto/feed.req.dto';
import { OutputListNewsFeed, ProviderInfoDto } from './dto/feed.res.dto';
import { NewsRequest } from './dto/request/news.request';
import { ReportType } from './enum/report.type';
import { FeedService } from './feed.service';
import { FeedMongoService } from './service/feed.service';
import { IFeedService } from './service/feed.service.interface';

@ApiTags('Feed')
@Controller('feed')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    @Inject(FeedMongoService) private readonly feedMongoService: IFeedService,
  ) {}

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @Get('get-remind-update-diary-post')
  @ApiOperation({
    summary: `Get remind update diary`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Diary.GET_DIARY,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getRemindUpdateDiaryPost(
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.feedService.getRemindUpdateDiaryPost(userRoleId);
  }

  @ApiExcludeEndpoint()
  @Post('synchronize-posts-to-mongoose')
  @ApiOperation({
    summary: `synchronize-posts-to-mongoose`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async synchronizePostsToMongoose(
    @Body() synchronizePostDto: SynchronizePostDto,
  ) {
    return this.feedService.synchronizePostsToMongoose(synchronizePostDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('create-plain-post')
  @ApiOperation({
    summary: `Create plain post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createPlainPost(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createPlainPostDto: CreatePlainPostDto,
  ) {
    return this.feedService.createPlainPost(userRoleId, createPlainPostDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('report')
  @ApiOperation({
    summary: `Users report the fake post.`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async reportTest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() reportRequest: ReportRequestDto,
  ) {
    const { message, postId, reportType } = reportRequest;
    if (reportType == ReportType.TEST_REPORT) {
      return this.feedService.reportTests(userRoleId, postId, message);
    }
  }

  @Get('get-list-posts')
  @ApiOperation({
    summary: `Get list post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListPost(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getListFeedQuery: GetListFeedQuery,
  ) {
    return this.feedService.getListPostV1(userRoleId, getListFeedQuery);
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @Get('get-posts-detail')
  @ApiOperation({
    summary: `Get post detail`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getPostDetail(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() postQueryDto: PostQueryDto,
  ) {
    return this.feedService.getPostDetail(userRoleId, postQueryDto);
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @Get('get-list-news-post')
  @ApiOperation({
    summary: `Get list news post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListNewsPost(
    @Query() getListFeedQuery: NewsRequest,
    @AuthorizationAndGetUserId([false]) userRoleId: string,
  ) {
    if (!userRoleId) {
      return this.feedMongoService.getPublicNews(getListFeedQuery);
    }
    return this.feedService.getListNewsPostV1(getListFeedQuery, userRoleId);
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @Get('get-list-news-post-of-provider')
  @ApiOperation({
    summary: `Get list news post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListNewsOfProvider(
    @Query() getListNewsOfProviderQuery: GetListNewsOfProviderQuery,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<OutputListNewsFeed[]> {
    return this.feedService.getListNewsOfProvider(
      getListNewsOfProviderQuery,
      userRoleId,
    );
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @Get('get-list-news-providers')
  @ApiOperation({
    summary: `Get list news providers`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListProviders(
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<ProviderInfoDto[]> {
    return this.feedService.getListProviders(userRoleId);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('like-post')
  @Throttle(10, 60)
  @ApiOperation({
    summary: `Like post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async likePost(
    @Query() likeQueryDto: LikeQueryDto,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<string> {
    return this.feedService.likePost(userRoleId, likeQueryDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('save-post')
  @Throttle(10, 60)
  @ApiOperation({
    summary: `Save post`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Feed.SAVED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async savePost(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() postQueryDto: PostQueryDto,
  ): Promise<string> {
    return this.feedService.savePost(userRoleId, postQueryDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post(':providerId/subscribe-provider')
  @ApiOperation({
    summary: `Subscribe/unsubscribe provider`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Feed.SUBSCRIBED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async subscribeProvider(
    @Param('providerId') providerId: string,
    @AuthorizationAndGetUserId() userRoleId: string,
  ): Promise<string> {
    return this.feedService.subscribeProvider(providerId, userRoleId);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Patch(':postId/update-plain-post')
  @ApiOperation({
    summary: `Update plain post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updatePlainPost(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('postId') postId: string,
    @Body() updatePlainPostDto: UpdatePlainPostDto,
  ) {
    return this.feedService.updatePlainPost(
      userRoleId,
      postId,
      updatePlainPostDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete(':postId/delete-plain-post')
  @ApiOperation({
    summary: `Delete plain post`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deletePlainPost(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('postId') postId: string,
  ) {
    return this.feedService.deletePlainPost(userRoleId, postId);
  }

  @ApiExcludeEndpoint()
  @Delete('delete-posts-to-mongoose/:postId')
  @ApiOperation({
    summary: `delete-posts-to-mongoose`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deletePost(@Param('postId') postId: string) {
    return this.feedService.deletePost(postId);
  }
}
