import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as moment from 'moment';
import { db } from '../../config/firebase.config';
import { UserTypes } from '../../modules/users/enum/user-types.enum';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { PermissionEntity } from '../entities/permission.entity';

@Injectable()
export class PermissionService {
  /**
   * Update routes for System Admin automatically when application starts to run.
   */
  async updateSystemAdmin() {
    const allRouteIds = await (
      await db.collection('routes').get()
    ).docs.map((route) => route.id);

    const adminPermission = await db
      .collection('permissions')
      .doc(UserTypes.SYS_ADMIN)
      .get();

    if (adminPermission.exists == false) {
      await this.createNewPermission({
        role: UserTypes.SYS_ADMIN,
        routeIds: allRouteIds,
        userIds: [],
        deleted: false,
      });
    } else {
      await this.update(
        {
          routeIds: allRouteIds,
        } as UpdatePermissionDto,
        UserTypes.SYS_ADMIN,
      );
    }
  }

  async createNewPermission(createPermissionDto: CreatePermissionDto) {
    const { role, userIds, routeIds } = createPermissionDto;
    const now = +moment.utc().format('x');

    const newPer = new PermissionEntity(
      role,
      role,
      userIds,
      routeIds,
      now,
      now,
      false,
    );

    const permission = await db.collection('permissions').doc(role).get();
    if (permission.exists == false) {
      await db
        .collection('permissions')
        .doc(role)
        .create({ ...newPer });
      return 'Success.';
    } else {
      throw new BadRequestException(
        'This permission has already been created!',
      );
    }
  }

  async update(updatePermissionDto: UpdatePermissionDto, permissionId: string) {
    const deleted = updatePermissionDto?.deleted || false;
    const now = +moment.utc().format('x');

    const permission = await db
      .collection('permissions')
      .doc(permissionId)
      .get();
    if (permission.exists == false) {
      throw new NotFoundException('Not found this permission');
    }

    await db
      .collection('permissions')
      .doc(permissionId)
      .set({ ...updatePermissionDto, updatedAt: now, deleted }, {merge: true});
    return 'Success.';
  }

  async getOneById(permissionId: string) {
    const permissionRef = await db.collection('permissions').doc(permissionId).get();
    if( !permissionRef.exists){
      throw new NotFoundException('Not found permission!');
    }
    else {
      return permissionRef.data() as PermissionEntity;
    }
  }
}
