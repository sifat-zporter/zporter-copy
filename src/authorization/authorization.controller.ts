import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeaders, ApiTags } from '@nestjs/swagger';
import { AdminAuthorizationGuard } from '../auth/guards/admin-authorization.guard';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../common/decorators/authorization.decorator';
import { UserTypes } from '../modules/users/enum/user-types.enum';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AuthorizationService } from './service/authorization.service';
import { PermissionService } from './service/permission.service';
import { RouteService } from './service/route.service';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Authorization')
@Controller('authorization')
export class AuthorizationController {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly permissionService: PermissionService,
    private readonly routeService: RouteService,
  ) {}

  @Post('create-new-permission')
  // @UseGuards(AdminAuthorizationGuard)
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.createNewPermission(createPermissionDto);
  }

  @Put('update-permission/:permissionId')
  updatePermission(
    @AuthorizationAndGetUserId() userId: boolean,
    @Param('permissionId') permissionId: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(updatePermissionDto, permissionId);
  }

  @Get('get-all-routes')
  getAll(@AuthorizationAndGetUserId() userId: boolean) {
    return this.routeService.getAllRoutes();
  }

  @Get('get-routes-by-permissionId/:permissionId')
  getRoutesByPermissionId(
    @AuthorizationAndGetUserId() userId: boolean,
    @Param('permissionId') permissionId: string,
  ) {
    return this.permissionService.getOneById(permissionId);
  }
}
