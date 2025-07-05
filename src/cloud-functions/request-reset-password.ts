import * as functions from 'firebase-functions';
import * as firebase from 'firebase-admin';
import { sendEmailTemplate } from '../utils/email-service';
import { SendEmailDto } from '../common/dto/send-email.dto';

export const requestPasswordReset = functions
  .region(process.env.REGION)
  .firestore.document('reset_password_requests/{documentId}')
  .onCreate(async (snap, context) => {
    let email = snap.data().email;

    if (!email) {
      const userRef: FirebaseFirestore.DocumentReference = snap.data().user;
      const userDoc = await userRef.get();
      email = userDoc.data()?.account?.email;
    }

    if (email) {
      const resetPasswordUrl = await firebase
        .auth()
        .generatePasswordResetLink(email);

      const dynamic_template_data = {
        resetPasswordUrl: resetPasswordUrl,
      };

      const payload = new SendEmailDto();

      payload.email = email;
      payload.dynamic_template_data = dynamic_template_data;
      payload.subject = '[Zporter] Reset your password';
      payload.templateId = 'd-603fa52058c645dcaf0a6cf1a371aa66';

      await sendEmailTemplate(payload);
    }

    snap.ref.delete();
  });
