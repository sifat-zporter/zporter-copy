import axios from 'axios';
import * as functions from 'firebase-functions';
import { elasticClient } from '../config/elastic.config';
import { CreateClubDto } from '../modules/clubs/dto/club-data.dto';
import {
  sendAcceptNotiCreateClub,
  sendRejectNotiCreateClub,
} from './admin-process-clubs/send-noti';

export const createClubIndex = functions
  .region(process.env.REGION)
  .firestore.document('clubs/{clubId}')
  .onCreate(async (change, context) => {
    const club = change.data();
    const id = context.params.clubId;

    await elasticClient.index({
      index: 'clubs',
      id,
      body: club,
    });

    // send email to zproter admin
  });

export const updateClubIndex = functions
  .region(process.env.REGION)
  .firestore.document('clubs/{clubId}')
  .onUpdate(async (change, context) => {
    const newClub = change.after.data();
    const id = context.params.clubId;

    const adminFlamelinkId =
      newClub?._fl_meta_?.updatedBy || newClub?._fl_meta_?.createdBy;

    if (
      newClub?.rejectMessage &&
      newClub?.isVerified === true &&
      newClub?.isApproved === false &&
      newClub?.createdBy
    ) {
      try {
        await Promise.all([
          sendRejectNotiCreateClub({
            userId: newClub?.createdBy,
            adminId: adminFlamelinkId,
            rejectMessage: newClub?.rejectMessage,
            clubName: newClub?.clubName,
          }),
          elasticClient.delete({
            index: 'clubs',
            id,
          }),
        ]);
        console.log('delete successfully');
        
      } catch (error) {
        console.log(123456, error);
        
      }
    }

    if (newClub?.isVerified === true && newClub?.isApproved === true) {
      //send noti to user with accepted messages
      await sendAcceptNotiCreateClub({
        userId: newClub?.createdBy,
        adminId: adminFlamelinkId,
        clubName: newClub?.clubName,
      });
    }
    try {
      await elasticClient.update({
        index: 'clubs',
        id,
        body: {
          doc: newClub
        },
      });
      console.log('update successfully');
      
    } catch (error) {
      console.log(67890, error);
      
    }
  });

export const removeClubIndex = functions
  .region(process.env.REGION)
  .firestore.document('clubs/{clubId}')
  .onDelete(async (snap, context) => {
    const id = context.params.clubId;

    await elasticClient.delete({
      index: 'clubs',
      id,
    });
  });

  export const updateClubsToMongo = functions
  .region(process.env.REGION)
  .firestore.document('clubs/{clubId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists;
    const after = change.after.exists;

    const club = change.after.data();
    const id = context.params.clubId;
    
    try {

      if(before === true && after === false) {
        await axios.delete(
          `${process.env.BACKEND_URL}/clubs/sync-clubs-to-mongo/${id}`,
          );
        console.log('delete with clubId: ', id);
      } 
      else {
        await axios.post(
          `${process.env.BACKEND_URL}/clubs/sync-clubs-to-mongo`,
          { ...club, clubId: id} as CreateClubDto,
          // { headers: { clubId: id } },
          );
          
        console.log('sync successfully to ', `${process.env.BACKEND_URL}/clubs/sync-clubs-to-mongo`);
        console.log('update data for clubId: ', id);
      }
    } catch (error) {
      console.log('get error when update club from firebase to mongo');
      console.log(error);
    }
  });