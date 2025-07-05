import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
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
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { SendInvitationCodeDto } from './dto/send-invitation-code.dto';
import { OutputUserInfoDto } from './dto/user-info.dto';
import { InvitationService } from './invitation.service';

@ApiTags('Invitations')
@Controller('invitations')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('send-email-invitation-code')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: `Send email invitation code` })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async sendInvitationCodeThroughEmail(
    @Body() sendInvitationCodeDto: SendInvitationCodeDto,
  ): Promise<string> {
    return this.invitationService.sendInvitationCodeThroughEmailService(
      sendInvitationCodeDto,
    );
  }

  @Post('generate-invitation-code')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: `Generate invitation code` })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async generateInvitationCode(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() generateCodeDto: GenerateCodeDto,
  ): Promise<string> {
    return this.invitationService.generateInvitationCodeService(
      generateCodeDto,
      userRoleId,
    );
  }

  @Get('/get-inviter-info/:inviteCode')
  @ApiOperation({ summary: `Get inviter information by invitation code` })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get data successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation code not found',
  })
  async getInfoByInvitationCode(
    @Param('inviteCode') inviteCode: string,
  ): Promise<OutputUserInfoDto> {
    return this.invitationService.getInviterByInvitationCodeService(inviteCode);
  }
}
