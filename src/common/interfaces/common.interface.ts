export interface IResponseCommon {
  message: string;
  statusCode: number;
  body: object | object[] | null | any;
}
