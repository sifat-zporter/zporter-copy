import { SendEmailService } from './../modules/send-email/send-email.service';
import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as firebaseAdmin from 'firebase-admin';
import * as firebaseAuth from 'firebase/auth';
import * as geoip from 'geoip-lite';
import * as momentTz from 'moment-timezone';
import { SendEmailDto } from '../common/dto/send-email.dto';
import { db } from '../config/firebase.config';
import { sendEmailTemplate } from '../utils/email-service';
import { EmailLoginDto, UserNameLoginDto } from './dto/log-in.dto';
import { AuthMessages } from './enum/auth-messages';
import { UserTypes } from '../modules/users/enum/user-types.enum';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => SendEmailService))
    private sendEmailService: SendEmailService,
  ) {}
  async logInWithEmail(emailLoginDto: EmailLoginDto) {
    try {
      const { email, password } = emailLoginDto;

      const auth = firebaseAuth.getAuth();

      const login = await firebaseAuth.signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      if (!auth.currentUser) {
        throw new HttpException(
          AuthMessages.INVALID_EMAIL_OR_PASSWORD,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        customToken: await this.generateCustomToken(auth.currentUser.uid),
        ...login,
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpException(
          AuthMessages.USER_NOT_EXIST,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error.code === 'auth/invalid-email') {
        throw new HttpException(
          AuthMessages.INVALID_EMAIL,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error.code === 'auth/wrong_password') {
        throw new HttpException(
          AuthMessages.INVALID_PASSWORD,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async generateCustomToken(uid: string) {
    const customToken = await firebaseAdmin.auth().createCustomToken(uid);
    return customToken;
  }

  async loginWithUsername(userNameLoginDto: UserNameLoginDto) {
    const { username, password } = userNameLoginDto;

    let email: string;

    const userRef = await db
      .collection('users')
      .where('username', '==', username)
      .get();

    if (userRef.empty) {
      throw new HttpException(
        AuthMessages.USER_NOT_EXIST,
        HttpStatus.BAD_REQUEST,
      );
    }

    userRef.forEach((user) => {
      email = user.data().account?.email;
    });

    if (!email) {
      throw new HttpException(
        AuthMessages.EMAIL_NOT_EXIST,
        HttpStatus.BAD_REQUEST,
      );
    }

    const login = await this.logInWithEmail({
      email: email,
      password: password,
    });

    if (!login) {
      throw new HttpException(
        AuthMessages.INVALID_USERNAME_OR_PASSWORD,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      customToken: await this.generateCustomToken(login.user.uid),
      ...login,
    };
  }

  async checkEmailExist(email: string) {
    const status = {
      emailExists: false,
    };
    try {
      const user = await firebaseAdmin.auth().getUserByEmail(email);
      if (user) {
        status.emailExists = true;
      }
      return status;
    } catch (error) {
      status.emailExists = false;
      return status;
    }
  }

  async checkPhoneExists(phone: string) {
    const status = {
      phoneExists: false,
    };
    try {
      const user = await firebaseAdmin.auth().getUserByPhoneNumber(phone);
      if (user) {
        status.phoneExists = true;
      }
      return status;
    } catch (error) {
      status.phoneExists = false;
      return status;
    }
  }

  async detectNewDevice(ipAddress: string, uid: string) {
    const location = geoip.lookup(ipAddress);

    if (location) {
      const userRef = await db
        .collection('users')
        .where('uid', '==', uid)
        .get();

      const userDocs = userRef.docs;

      const savingIpAddress = userDocs.map(async (doc) => {
        const { ips = [] } = doc.data();

        const email = doc.data()?.account.email;

        if (doc.data()?.ips?.length && email) {
          if (!ips.includes(ipAddress)) {
            const resetPasswordUrl = await firebaseAdmin
              .auth()
              .generatePasswordResetLink(email);

            const dynamic_template_data = {
              ipAddress,
              timestamp: momentTz()
                .tz(location.timezone)
                .format('D MMM YYYY HH:mm:ssZ'),
              location: `${location.city}/${location.country}`,
              resetPasswordUrl: resetPasswordUrl,
            };

            // const payload = new SendEmailDto();

            // payload.email = email;
            // payload.dynamic_template_data = dynamic_template_data;
            // payload.subject = '[Zporter] Security alert';
            // payload.templateId = 'd-acfba4d332d9416c858136e838b0e055';
            // await sendEmailTemplate(payload);

            await this.sendEmailService.sendNewDeviceLogin({
              email,
              dynamic_template_data,
            });
          }

          doc.ref.set(
            {
              ips: firebaseAdmin.firestore.FieldValue.arrayUnion(ipAddress),
            },
            { merge: true },
          );
        } else {
          doc.ref.set(
            {
              ips: [ipAddress],
            },
            { merge: true },
          );
        }
      });

      await Promise.all(savingIpAddress);
    }
  }

  async requestResetPassword(email: string) {
    try {
      const user = await firebaseAdmin.auth().getUserByEmail(email);

      if (user) {
        await db.collection('reset_password_requests').add({ email });
      }

      return {
        email,
        message: 'Check your inbox for the link to reset your password.',
        statusCode: 200,
      };
    } catch (error) {
      console.log(error);

      if (error.code === 'auth/user-not-found') {
        throw new HttpException(
          AuthMessages.USER_NOT_EXIST,
          HttpStatus.NOT_FOUND,
        );
      }

      if (error.code === 'auth/invalid-email') {
        throw new HttpException(
          AuthMessages.INVALID_EMAIL,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * @uid  uid of account that will be admin.
   *
   * Function for claiming an account to be admin account.
   */
  async claimAdminsByUid(email: string) {
    try {
      const account = await firebaseAdmin.auth().getUserByEmail(email);

      await firebaseAdmin.auth().setCustomUserClaims(account.uid, {
        admin: true,
      });
      return 'Claim successfully.';
    } catch (error) {
      throw new NotFoundException('Not found account!');
    }
  }
}
