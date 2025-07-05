import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResponseMessage } from '../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../common/decorators/authorization.decorator';
import { IsAdmin } from '../common/decorators/is-admin.decorator';
import { AuthService } from './auth.service';
import { ClaimAdminDto } from './dto/claim-admin.dto';
import { EmailLoginDto, UserNameLoginDto } from './dto/log-in.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
@ApiTags('Auth')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: `Log In` })
  @Post('log-in')
  @Throttle(10, 60)
  async loginWithEmail(@Body() emailLoginDto: EmailLoginDto): Promise<any> {
    return this.authService.logInWithEmail(emailLoginDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('claim/admin')
  async claimAdmins(
    @IsAdmin() isAdmin: boolean,
    @Body() request: ClaimAdminDto,
  ) {
    if (isAdmin == false) {
      throw new ForbiddenException(ResponseMessage.Common.FORBIDDEN_RESOURCE);
    }
    return this.authService.claimAdminsByUid(request.email);
  }

  @ApiOperation({ summary: `Request Reset Password` })
  @Post('request-reset-password/:email')
  @Throttle(10, 60)
  async requestResetPassword(@Param('email') email: string): Promise<any> {
    return this.authService.requestResetPassword(email);
  }

  @ApiOperation({ summary: `Login with username/ZporterID` })
  @Post('log-in-username')
  @Throttle(10, 60)
  async logInWithUsername(
    @Body() userNameLoginDto: UserNameLoginDto,
  ): Promise<any> {
    return this.authService.loginWithUsername(userNameLoginDto);
  }

  @ApiOperation({ summary: `Check email exists` })
  @Get('check-email/:email')
  @Throttle(10, 60)
  async checkEmailExist(@Param('email') email: string): Promise<any> {
    return this.authService.checkEmailExist(email);
  }

  @ApiOperation({ summary: `Check phone exists` })
  @Get('check-phone/:phone')
  @Throttle(10, 60)
  async checkPhoneExist(@Param('phone') phone: string): Promise<any> {
    return this.authService.checkPhoneExists(phone);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: `Detect new device log in` })
  @Patch('detect-new-device-login')
  @Throttle(10, 60)
  async detectNewDeviceLogin(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Ip() ip: string,
  ): Promise<any> {
    return this.authService.detectNewDevice(ip, userRoleId);
  }
}
