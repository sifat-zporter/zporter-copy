import { Module } from '@nestjs/common';
import { AuthorizationService } from './service/authorization.service';
import { AuthorizationController } from './authorization.controller';
import { RouteService } from './service/route.service';
import { PermissionService } from './service/permission.service';

@Module({
  controllers: [AuthorizationController],
  providers: [AuthorizationService, RouteService, PermissionService]
})
export class AuthorizationModule {}
