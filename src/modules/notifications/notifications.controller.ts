import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import {
  CreateChatAllNotificationDto,
  DeleteNotificationQuery,
  RegistrationFCMTokenDto,
} from './dto/notifications.req.dto';
import { NotificationsService } from './notifications.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { AdminAuthorizationGuard } from '../../auth/guards/admin-authorization.guard';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('get-list-notifications')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `get list notifications`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListNotifications(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.notificationsService.getListNotifications(
      userRoleId,
      paginationDto,
    );
  }

  @Post('create-fcm-token')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `create fcm token`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Notification.CREATED_FCM_TOKEN,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createRegistrationFCMToken(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() registrationFCMTokenDto: RegistrationFCMTokenDto,
  ): Promise<string> {
    return this.notificationsService.createRegistrationFCMToken(
      userRoleId,
      registrationFCMTokenDto,
    );
  }

  /**
   * This function just for admin
   * @param userId except for this userId
   * @param createChatAllNotificationDto content of chatAll (include: content, link,...)
   * @returns "Successfully" || throw ForbiddenException()
   */
  @Post('chat-all')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard, AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Admin send message to all of users`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Get ids of all users.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async chatAll(
    @AuthorizationAndGetUserId() userId: string,
    @Body() createChatAllNotificationDto: CreateChatAllNotificationDto,
  ) {
    return await this.notificationsService.chatAll(
      userId,
      createChatAllNotificationDto,
    );
  }

  @Patch(':notificationId/check-notification')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `check notification`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Notification.CREATED_FCM_TOKEN,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async checkNotification(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.checkNotification(
      userRoleId,
      notificationId,
    );
  }

  @Put('mark-as-read-notification')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Mark as read all notifications`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Notification.MARK_AS_READ,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async markAsReadNotifications(
    @AuthorizationAndGetUserId() userRoleId: string,
  ) {
    return this.notificationsService.markAsReadNotifications(userRoleId);
  }

  @Delete('delete-notification')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `delete notification`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Notification.DELETE_NOTIFICATION,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteNotification(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() deleteNotificationQuery: DeleteNotificationQuery,
  ) {
    return this.notificationsService.deleteNotification(
      userRoleId,
      deleteNotificationQuery,
    );
  }
}
