import * as functions from 'firebase-functions';
import mongoose from 'mongoose';
import axios from 'axios';
import { IFriend, IFollow } from '../modules/friends/schemas/friend.schemas';

export const createFriendToMongo = functions
  .region(process.env.REGION)
  .firestore.document('friends/{friendId}')
  .onCreate(async (snap, context) => {
    const id = context.params.friendId;
    const friend: IFriend = snap.data() as IFriend;

    try {
      await axios.post(
        `${process.env.BACKEND_URL}/friends/create-friends-to-mongo/${id}`,
        { ...friend },
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when create friend from firebase to mongo');
      }
    }
  });

export const createFollowToMongo = functions
  .region(process.env.REGION)
  .firestore.document('follows/{followId}')
  .onCreate(async (snap, context) => {
    const id = context.params.followId;
    const follow: IFollow = snap.data() as IFollow;

    try {
      await axios.post(
        `${process.env.BACKEND_URL}/friends/create-follows-to-mongo/${id}`,
        { ...follow },
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when create follow from firebase to mongo');
      }
    }
  });

export const updateFriendToMongo = functions
  .region(process.env.REGION)
  .firestore.document('friends/{friendId}')
  .onUpdate(async (snap, context) => {
    const id = context.params.friendId;
    const friend: IFriend = snap.after.data() as IFriend;

    try {
      await axios.patch(
        `${process.env.BACKEND_URL}/friends/update-friends-to-mongo/${id}`,
        { ...friend },
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when update friend from firebase to mongo');
      }
    }
  });

export const updateFollowToMongo = functions
  .region(process.env.REGION)
  .firestore.document('follows/{followId}')
  .onUpdate(async (snap, context) => {
    const id = context.params.followId;
    const follow: IFollow = snap.after.data() as IFollow;

    try {
      await axios.patch(
        `${process.env.BACKEND_URL}/friends/update-follows-to-mongo/${id}`,
        { ...follow },
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when create follow from firebase to mongo');
      }
    }
  });

export const deleteFriendToMongo = functions
  .region(process.env.REGION)
  .firestore.document('friends/{friendId}')
  .onDelete(async (snap, context) => {
    const id = context.params.friendId;
    // const friend: IFriend = snap.id as IFriend;

    try {
      await axios.delete(
        `${process.env.BACKEND_URL}/friends/delete-friends-to-mongo/${id}`,
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when create friend from firebase to mongo');
      }
    }
  });

export const deleteFollowToMongo = functions
  .region(process.env.REGION)
  .firestore.document('follows/{followId}')
  .onDelete(async (snap, context) => {
    const id = context.params.followId;
    // const friend: IFriend = snap.id as IFriend;

    try {
      await axios.delete(
        `${process.env.BACKEND_URL}/friends/delete-follows-to-mongo/${id}`,
        {
          headers: {
            roleId: id,
            secureCode: Buffer.from(process.env.SECURE_CODE).toString('base64'),
          },
        },
      );
    } catch (error) {
      if (error.meta.statusCode === 404) {
        console.log('get error when create follow from firebase to mongo');
      }
    }
  });
