import * as functions from 'firebase-functions';
import { db } from '../../config/firebase.config';
import { JoinTeamStatus } from '../../modules/clubs/enum/club.enum';
import { MemberType } from './../../modules/teams/dto/teams.req.dto';

interface UpdateTeamMembersDto {
  owners: FirebaseFirestore.DocumentReference[];
  pendingOwners: FirebaseFirestore.DocumentReference[];
  admins: FirebaseFirestore.DocumentReference[];
  pendingAdmins: FirebaseFirestore.DocumentReference[];
  members: FirebaseFirestore.DocumentReference[];
  pendingMembers: FirebaseFirestore.DocumentReference[];
}

export const syncUserTeam = functions
  .region(process.env.REGION)
  .firestore.document('users_teams/{documentId}')
  .onWrite(async (change, context) => {
    // If the document does not exist, it has been deleted.
    const document = change.after.exists ? change.after.data() : null;

    const oldDocument = change.before.data();

    const teamId = document ? document?.teamId : oldDocument?.teamId;

    const userTeamRefs = await db
      .collection('users_teams')
      .where('teamId', '==', teamId)
      .get();

    const teamMembers: UpdateTeamMembersDto = {
      owners: [],
      pendingOwners: [],
      admins: [],
      pendingAdmins: [],
      members: [],
      pendingMembers: [],
    };

    userTeamRefs.forEach((userTeam) => {
      const userTeamDoc = userTeam.data();

      if (userTeamDoc?.memberType === MemberType.MEMBER) {
        if (userTeamDoc?.status === JoinTeamStatus.ACCEPTED) {
          teamMembers.members.push(db.doc(`users/${userTeamDoc?.userId}`));
        } else {
          teamMembers.pendingMembers.push(
            db.doc(`users/${userTeamDoc?.userId}`),
          );
        }
      }

      if (userTeamDoc?.memberType === MemberType.ADMIN) {
        if (userTeamDoc?.status === JoinTeamStatus.ACCEPTED) {
          teamMembers.admins.push(db.doc(`users/${userTeamDoc?.userId}`));
        } else {
          teamMembers.pendingAdmins.push(
            db.doc(`users/${userTeamDoc?.userId}`),
          );
        }
      }

      if (userTeamDoc?.memberType === MemberType.OWNER) {
        if (userTeamDoc?.status === JoinTeamStatus.ACCEPTED) {
          teamMembers.owners.push(db.doc(`users/${userTeamDoc?.userId}`));
        } else {
          teamMembers.pendingOwners.push(
            db.doc(`users/${userTeamDoc?.userId}`),
          );
        }
      }
    });

    await db
      .collection('teams')
      .doc(teamId)
      .set(
        {
          ...teamMembers,
          synced: true,
        },
        { merge: true },
      );
  });
