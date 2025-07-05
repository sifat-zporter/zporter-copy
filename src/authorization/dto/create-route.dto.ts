export class CreateRouteDto {
  path: string;
  method: string;
  deleted?: boolean | false;
}