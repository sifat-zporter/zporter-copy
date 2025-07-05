import * as functions from 'firebase-functions';
import { elasticClient } from '../config/elastic.config';
import { createFullnameArray } from '../helpers/convert-name-as-array';
import * as moment from 'moment';
import mongoose from 'mongoose';
import axios from 'axios';
import { GeneralUserDto } from '../modules/users/dto/user.dto';
import { UserProfileDto } from '../modules/users/dto/user/user-profile.dto';

export const updateUserIndex = functions
  .region(process.env.REGION)
  .firestore.document('users/{userId}')
  .onUpdate(async (change, context) => {
    const userData = change.after.data();
    const id = context.params.userId;
    try {
      const user = {
        profile: userData.profile,
        fcmToken: userData.fcmToken,
        deletedAt: userData.deletedAt,
        media: userData.media,
        account: userData.account,
        username: userData.username,
        type: userData.type,
        clubId:
          userData?.playerCareer?.clubId || userData?.coachCareer?.clubId || '',
        userId: userData?.userId || userData?.roleId,
      };

      if (user.deletedAt) {
        await elasticClient.delete({
          index: 'users',
          id,
        });
        return;
      }

      if (user.fcmToken) {
        delete user.fcmToken;
      }

      if (user.media.videoLinks) {
        delete user.media.videoLinks;
      }

      if (user.profile) {
        try {
          await elasticClient.delete({
            index: 'users',
            id,
          });

          await elasticClient.index({
            index: 'users',
            id,
            body: user,
          });

          console.log('updated new index: ', id);
        } catch (error) {
          if (error.meta.statusCode === 404) {
            console.log('not found index');
            await elasticClient.index({
              index: 'users',
              id,
              body: user,
            });
            console.log('updated new index ', id);
          }
        }
      }

      const fullName = createFullnameArray({
        firstName: user?.profile?.firstName,
        lastName: user?.profile?.lastName,
      });

      change.after.ref.set(
        {
          profile: {
            fullName,
          },
          updatedTime: moment.utc().toString(),
          createdTime: moment.utc(user?.account?.createdAt).toString(),
        },
        { merge: true },
      );

      return;
    } catch (error) {
      await elasticClient.delete({
        index: 'users',
        id,
      });
      console.log('Error on update => delete userId: ', id);
    }
  });

export const removeUserIndex = functions
  .region(process.env.REGION)
  .firestore.document('users/{userId}')
  .onDelete(async (snap, context) => {
    const id = context.params.userId;

    await elasticClient.delete({
      index: 'users',
      id,
    });
  });

export const updateUserToMongo = functions
  .region(process.env.REGION)
  .firestore.document('users/{userId}')
  .onWrite(async (change, context) => {
    try {
      const user = change.after.data();
      const id = context.params.userId;

      let userProfile = new UserProfileDto();

      userProfile = {
        ...user.profile,
      };

      const firstName = user.profile?.firstName.normalize('NFC') || null;
      const lastName = user.profile?.lastName.normalize('NFC') || null;

      userProfile.firstName = firstName;
      userProfile.lastName = lastName;

      const user2 = {
        ...user,
        profile: userProfile,
      };

      console.log('update data for userId: ', id);

      await axios.post(
        `${process.env.BACKEND_URL}/users/sync-users-to-mongo`,
        { ...user2, roleId: id } as GeneralUserDto,
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      console.log('get error when update user from firebase to mongo');
      console.log(error);
    }
  });
