import * as sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import { SendEmailDto } from '../common/dto/send-email.dto';

export const sendEmail = async (toEmail, content?, subject?) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'support@zporter.co',
      subject: subject,
      html: content,
    };
    return sgMail.send(msg);
  } catch (error) {
    console.log(error);
  }
};
export const sendEmailTemplate = async (sendEmailDto: SendEmailDto) => {
  const { email, subject, templateId, dynamic_template_data } = sendEmailDto;
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'support@zporter.co',
      subject: subject,
      templateId: templateId,
      dynamic_template_data,
    };
    return sgMail.send(msg);
  } catch (error) {
    console.log(error);
  }
};

export const sendVerifyEmail = async (email: string) => {
  try {
    const verifyCode = uuidv4();

    const dynamic_template_data = {
      verifyUrl: `${process.env.BACKEND_URL}/users/verify-email/${verifyCode}`,
    };

    await sendEmailTemplate({
      email,
      dynamic_template_data,
      subject: '[Zporter] Please verify your email address',
    });
  } catch (error) {
    console.log(error);
  }
};
