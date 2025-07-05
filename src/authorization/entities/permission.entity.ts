export class PermissionEntity {
  permissionId: string;
  role: string;
  userIds: Array<string>;
  routeIds: Array<string>;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;

  constructor(
    permissionId: string,
    role: string,
    userIds: Array<string>,
    routeIds: Array<string>,
    createdAt?: number,
    updatedAt?: number,
    deleted?: boolean,
  ) {
    this.permissionId = permissionId;
    this.role = role;
    this.userIds = userIds;
    this.routeIds = routeIds;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deleted = deleted;
  }

}
