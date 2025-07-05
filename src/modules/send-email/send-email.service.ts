import {
  SendEmailDto,
  SendNewDeviceLoginDto,
  SendVerifyEmailDto,
  SendResetPasswordDto,
  MonthlyVisitDto,
  MidMonthlytVisitDto,
  SendEmailToParentDto,
  SendDraftPlayerConfirmationDto,
  sendEmailDto,
  SendDraftPlayerLinkDto,
} from './dto/send-email.dto';
import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import {
  EmailSubject,
  EmailTemplateId,
} from '../../common/constants/common.constant';

@Injectable()
export class SendEmailService {
  async sendEmail(sendEmailDto: SendEmailDto) {
    const { email, dynamic_template_data, subject, templateId } = sendEmailDto;

    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'support@zporter.co',
        subject,
        templateId,
        dynamic_template_data,
      };
      await sgMail.send(msg);
      console.log('success');
    } catch (error) {
      console.log(error);
    }
  }

  async sendEmailToParent(sendEmailToParentDto: SendEmailToParentDto) {
    const { email, dynamic_template_data } = sendEmailToParentDto;
    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.SEND_PARENT_UNDER_13,
      templateId: EmailTemplateId.SEND_PARENT_UNDER_13,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendVerifyEmail(sendVerifyEmailDto: SendVerifyEmailDto) {
    const { email, dynamic_template_data } = sendVerifyEmailDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.VERIFY_EMAIL,
      templateId: EmailTemplateId.VERIFY_EMAIL,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendNewDeviceLogin(sendNewDeviceLoginDto: SendNewDeviceLoginDto) {
    const { email, dynamic_template_data } = sendNewDeviceLoginDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.NEW_DEVICE_SIGN_IN,
      templateId: EmailTemplateId.NEW_DEVICE_SIGN_IN,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendResetPassword(sendResetPasswordDto: SendResetPasswordDto) {
    const { email, dynamic_template_data } = sendResetPasswordDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.RESET_PASSWORD,
      templateId: EmailTemplateId.RESET_PASSWORD,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendMonthly(monthlyVisitDto: MonthlyVisitDto) {
    const { email, dynamic_template_data } = monthlyVisitDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.MONTHLY_VISIT,
      templateId: EmailTemplateId.MONTHLY_VISIT,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendMidMonthly(midMonthlytVisitDto: MidMonthlytVisitDto) {
    const { email, dynamic_template_data } = midMonthlytVisitDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.MID_MONTH_UPDATE,
      templateId: EmailTemplateId.MID_MONTH_UPDATE,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendDraftPlayerLink(sendDraftPlayerLinkDto: SendDraftPlayerLinkDto) {
    const { email, dynamic_template_data } = sendDraftPlayerLinkDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.DRAFT_PLAYER_LINK,
      templateId: EmailTemplateId.DRAFT_PLAYER_LINK,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendDraftPlayerConfirmation(
    sendDraftPlayerConfirmationDto: SendDraftPlayerConfirmationDto,
  ) {
    const { email, dynamic_template_data } = sendDraftPlayerConfirmationDto;

    const sendEmailDto: SendEmailDto = {
      email,
      dynamic_template_data,
      subject: EmailSubject.DRAFT_PLAYER_CONFIRMATION,
      templateId: EmailTemplateId.DRAFT_PLAYER_CONFIRMATION,
    };
    await this.sendEmail(sendEmailDto);
  }

  async sendEmailWithImageURL(
    sendEmailDto: sendEmailDto,
  ) {
    const {from, to, subject, text, imageUrl} = sendEmailDto;

    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'support@zporter.co',
        subject,
        text,
        html: `
          <p>${text}</p>
          ${imageUrl ? `<img src="${imageUrl}" alt="Receipt" style="max-width: 500px;" />` : ''}
        `,
      }
      await sgMail.send(msg);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }
}
