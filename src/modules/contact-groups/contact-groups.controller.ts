import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { ContactGroupsService } from './contact-groups.service';
import {
  GetListContactQuery,
  GetPublicListContactQuery,
} from './dto/contact-groups.req.dto';

@ApiTags('Contact Group')
@Controller('contact-groups')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class ContactGroupsController {
  constructor(private readonly contactGroupsService: ContactGroupsService) {}

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('get-list-contacts')
  @ApiOperation({
    summary: `Get list contacts`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getListContacts(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getListContactQuery: GetListContactQuery,
  ) {
    return this.contactGroupsService.getListContacts(
      getListContactQuery,
      userRoleId,
    );
  }

  @Throttle(30, 60)
  @Get('public-get-list-contact')
  @ApiOperation({
    summary: `Get list teams`,
    description: 'public api',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getListTeams(
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Query() getListContactQuery: GetPublicListContactQuery,
  ) {
    userRoleId = 'unknown';
    return this.contactGroupsService.getListContacts(
      getListContactQuery,
      userRoleId,
    );
  }
}
