import { Injectable } from '@nestjs/common';
import { db } from '../../config/firebase.config';
import { PermissionService } from './permission.service';
import { RouteService } from './route.service';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly routeService: RouteService,
  ) {}
  /**
   * Init and update permission when app start running.
   * @param stacks Stacks about information of this app
   */
  async updateWhenAppStart(stacks: any[]) {
    await this.routeService.initRouteWhenAppStart(stacks);
    await this.permissionService.updateSystemAdmin();
  }
}
