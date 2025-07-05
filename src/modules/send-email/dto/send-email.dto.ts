export class SendEmailDto {
  email: string | string[];
  // eslint-disable-next-line @typescript-eslint/ban-types
  dynamic_template_data?: {};
  subject?: string;
  templateId?: string;
}

export class SendEmailToParentDto {
  email: string | string[];
  dynamic_template_data: {
    firstname: string;
    lastname: string;
  };
}
export class SendVerifyEmailDto {
  email: string;
  dynamic_template_data: {
    verifyUrl: string;
  };
}
// export class DynamicTemplateNewDeviceLogin {
//   ipAddress: string;
//   timestamp: string;
//   location: string;
//   resetPasswordUrl: string;
// }
export class SendNewDeviceLoginDto {
  email: string;
  dynamic_template_data: {
    ipAddress: string;
    timestamp: string;
    location: string;
    resetPasswordUrl: string;
  };
}

export class SendResetPasswordDto {
  email: string;
  dynamic_template_data: {
    resetPasswordUrl: string;
  };
}

export class MonthlyVisitDto {
  email: string;
  dynamic_template_data: {
    receiverName: string;
    country: string;
    curVisitsNum: string | number;
    curVisitorsNum: string | number;
    prevVisitsNum: string | number;
    prevVisitorsNum: string | number;
  };
}

export class MidMonthlytVisitDto {
  email: string;
  dynamic_template_data: {
    curPosition: string | number;
    prevPosition: string | number;
    receiverName: string;
    country: string;
  };
}

export class SendDraftPlayerLinkDto {
  email: string;
  dynamic_template_data: {
    username: string;
    firstname: string;
    lastname: string;
    clubName: string;
    url: string;
  };
}

export class SendDraftPlayerConfirmationDto {
  email: string;
  dynamic_template_data: {
    username: string;
    url: string;
  };
}

export class sendEmailDto {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  imageUrl?: string;
}