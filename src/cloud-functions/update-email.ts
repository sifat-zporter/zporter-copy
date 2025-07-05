// import * as functions from 'firebase-functions';
// import { v4 as uuidv4 } from 'uuid';
// import { sendEmailTemplate } from '../common/email-service';

// export const onUpdateEmail = functions.region(process.env.REGION).firestore
//   .document('users/{userId}')
//   .onUpdate(async (change) => {
//     const user = change.after.data();

//     const oldUser = change.before.data();

//     if (
//       user?.account?.isVerified === false &&
//       oldUser?.account?.email !== user?.account?.email
//     ) {
//       const verifyCode = uuidv4();

//       const dynamic_template_data = {
//         verifyUrl: `${process.env.BACKEND_URL}/users/verify-email/${verifyCode}`,
//       };

//       await sendEmailTemplate(
//         user?.account?.email,
//         dynamic_template_data,
//         '[Zporter] Please verify your email address',
//       );
//     }
//   });
