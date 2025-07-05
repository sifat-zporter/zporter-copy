export class SendEmailDto {
  email: string | string[];
  dynamic_template_data?: { [key: string]: string | number };
  subject?: string;
  templateId?: string;
}
