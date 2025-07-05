import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { SendEmailDto } from '../common/dto/send-email.dto';
import { elasticClient } from '../config/elastic.config';
import { db } from '../config/firebase.config';
import { sendEmailTemplate } from '../utils/email-service';

export const newUserSignup = functions
  .region(process.env.REGION)
  .auth.user()
  .onCreate(async (user) => {
    const verifyCode = uuidv4();
    const documentId = uuidv4();

    db.collection('users')
      .doc(documentId)
      .set({
        account: {
          phoneNumber: user?.phoneNumber || null,
          email: user?.email || null,
          isActive: false,
          isVerified: user.emailVerified,
          verifyCode,
          createdAt: +moment.utc().format('x'),
          expiredIn: +moment.utc().add(7, 'days').format('x'),
        },
        userId: documentId,
        uid: user.uid,
      });

    if (user?.email) {
      const dynamic_template_data = {
        verifyUrl: `${process.env.BACKEND_URL}/users/verify-email/${verifyCode}`,
      };

      const { email } = user;

      const payload = new SendEmailDto();

      payload.email = email;
      payload.dynamic_template_data = dynamic_template_data;
      payload.subject = '[Zporter] Please verify your email address';
      payload.templateId = 'd-ca58ac7701004d2f9c29169f2d87279c';

      await sendEmailTemplate(payload);
    }
  });

export const deleteUserAuth = functions
  .region(process.env.REGION)
  .auth.user()
  .onDelete(async (user) => {
    const FieldValue = firebase.firestore.FieldValue;

    // Remove the unneeded field from user document
    const userDoc = await db
      .collection('users')
      .where('uid', '==', user.uid)
      .get();

    userDoc.forEach((doc) => {
      // delete document
      db.collection('users')
        .doc(doc.id)
        .update({
          account: FieldValue.delete(),
          media: FieldValue.delete(),
          'profile.firstName': '',
          'profile.lastName': '',
          'profile.phone': '',
          socialLinks: FieldValue.delete(),
          username: FieldValue.delete(),
          inviterId: FieldValue.delete(),
          updatedAt: +moment.utc().format('x'),
          deletedAt: +moment.utc().format('x'),
        });

      // delete elastic index
      elasticClient.delete({
        index: 'users',
        id: doc.id,
      });
    });
  });
