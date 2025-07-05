import { PartialType } from '@nestjs/swagger';
import { CreatePermissionDto } from './create-permission.dto';
// import { CreatePermissionDto } from './create-permission.dto';
export class UpdatePermissionDto {
	role: string;
  userIds: Array<string>;
  routeIds: Array<string>;
  deleted?: boolean;
}
