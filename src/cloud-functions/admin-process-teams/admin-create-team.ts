import * as functions from 'firebase-functions';
import { db } from '../../config/firebase.config';
import { convertTeamNameAsArray } from '../../helpers/convert-name-as-array';
import { createUserTeamAdmins } from './services/create-user-team-admins';
import { createUserTeamsMembers } from './services/create-user-team-members';
import { createUserTeamsOwners } from './services/create-user-team-owner';

export const handleAdminCreateTeam = functions
  .region(process.env.REGION)
  .firestore.document('teams/{teamId}')
  .onCreate(async (snapshot, context) => {
    const teamId = context.params.teamId;

    const teamData = snapshot.data();

    const flameLinkOwnerId = teamData?._fl_meta_?.createdBy;

    // only run if created by flamelink admin
    if (flameLinkOwnerId) {
      // const isAutoAccepted = teamData?.autoAccepted ? true : false;

      const clubId = teamData?.clubRef?.id;

      const ownerIds =
        (teamData?.owners?.map(
          (ownerRef: FirebaseFirestore.DocumentReference) => {
            return ownerRef?.id;
          },
        ) as string[]) || [];
      const uniqueOwnerIds = [...new Set(ownerIds)];

      if (uniqueOwnerIds.length) {
        await createUserTeamsOwners({
          ownerIds: uniqueOwnerIds,
          teamId: teamId,
          flameLinkOwnerId: flameLinkOwnerId,
          teamName: teamData?.teamName,
        });
      }

      const memberIds =
        (teamData?.members?.map(
          (memberRef: FirebaseFirestore.DocumentReference) => {
            return memberRef?.id;
          },
        ) as string[]) || [];
      const uniqueMemberIds = [...new Set(memberIds)];

      if (uniqueMemberIds.length) {
        await createUserTeamsMembers({
          memberIds: memberIds,
          teamId: teamId,
          flameLinkOwnerId: flameLinkOwnerId,
          teamName: teamData?.teamName,
        });
      }

      const adminIds =
        (teamData?.admins?.map(
          (adminRef: FirebaseFirestore.DocumentReference) => {
            return adminRef?.id;
          },
        ) as string[]) || [];

      const uniqueAdminIds = [...new Set(adminIds)];

      if (uniqueAdminIds.length) {
        await createUserTeamAdmins({
          adminIds: adminIds,
          teamId: teamId,
          flameLinkOwnerId: flameLinkOwnerId,
          teamName: teamData?.teamName,
        });
      }

      await Promise.all([
        db.collection('teams').doc(teamId).set(
          {
            clubId,
          },
          { merge: true },
        ),
        convertTeamNameAsArray(teamId),
      ]);

      return;
    }
  });
