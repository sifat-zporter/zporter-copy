export class RouteEntity {
  routeId: string;
  path: string;
  method: string;
  deleted: boolean;

  constructor(routeId: string, path: string, method: string, deleted: boolean) {
    this.routeId = routeId;
    this.path = path;
    this.method = method;
    this.deleted = deleted;
  }
}
