export interface SendMessageToSlackPayload {
  title: string;
  logMessage: any;
  timestamp: string;
  endpoint: string;
  method: string;
  email: string;
  roleId: string;
  body: string;
  query: any;
  params: any;
}
