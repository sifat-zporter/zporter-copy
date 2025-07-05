import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { CrmService } from './crm.service';
import {
  CreateGuessSupportTicketDto,
  CreateSupportTicketDto,
} from './dto/create-support-ticket.dto';

@ApiTags('CRM')
@Controller('crm')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('/create-support-ticket')
  @ApiOperation({
    summary: `Create a new support ticket`,
  })
  createSupportTicket(
    @AuthorizationAndGetUserId() roleId: string,
    @Body() createSupportTicketDto: CreateSupportTicketDto,
  ) {
    return this.crmService.createSupportTicket(roleId, createSupportTicketDto);
  }

  @Post('/create-support-ticket-for-guess')
  @Throttle(10, 60)
  @ApiOperation({
    summary: `Create a new support ticket`,
  })
  createSupportTicketForGuess(
    @Body() createGuessSupportTicketDto: CreateGuessSupportTicketDto,
  ) {
    return this.crmService.createGuessSupportTicket(
      createGuessSupportTicketDto,
    );
  }
}
