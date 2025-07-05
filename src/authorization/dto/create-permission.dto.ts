export class CreatePermissionDto {
  role: string;
  userIds: Array<string>;
  routeIds: Array<string>;
  deleted?: boolean;
}
