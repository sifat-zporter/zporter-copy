import * as functions from 'firebase-functions';
import { TeamMemberType } from '../../modules/teams/dto/teams.req.dto';
import { createUserTeamAdmins } from './services/create-user-team-admins';
import { createUserTeamsMembers } from './services/create-user-team-members';
import { createUserTeamsOwners } from './services/create-user-team-owner';
import { deleteMembersOutOfTeam } from './services/delete-member';
import {
  sendAcceptNotiCreateTeam,
  sendRejectNotiCreateTeam,
} from './services/send-noti-create-team';

export const handleAdminUpdateTeam = functions
  .region(process.env.REGION)
  .firestore.document('teams/{teamId}')
  .onUpdate(async (change, context) => {
    const teamId = context.params.teamId;

    const newTeamData = change.after.data();

    const previousTeamData = change.before.data();

    if (newTeamData?.synced === true) {
      change.after.ref.set(
        {
          ...previousTeamData,
          synced: false,
        },
        { merge: true },
      );
      return;
    }

    const teamName = newTeamData?.teamName || previousTeamData?.teamName;

    const adminFlamelinkId =
      newTeamData?._fl_meta_?.createdBy ||
      previousTeamData?._fl_meta_?.createdBy;

    // only run if updated by admin flamelink
    if (adminFlamelinkId) {
      const newMemberIds =
        (newTeamData?.members?.map(
          (memberRef: FirebaseFirestore.DocumentReference) => {
            return memberRef?.id;
          },
        ) as string[]) || [];

      const previousMemberIds =
        (previousTeamData?.members?.map(
          (memberRef: FirebaseFirestore.DocumentReference) => {
            return memberRef?.id;
          },
        ) as string[]) || [];

      const deletedMemberIds = getDeletedUserIds({
        newUserIds: newMemberIds,
        previousUserIds: previousMemberIds,
      });

      const uniqueDeletedMembersIds = [...new Set(deletedMemberIds)];

      if (uniqueDeletedMembersIds?.length) {
        await deleteMembersOutOfTeam({
          adminFlamelinkId: adminFlamelinkId,
          memberIds: uniqueDeletedMembersIds,
          teamId: teamId,
          type: TeamMemberType.MEMBER,
        });
      }

      const newAddedMemberIds = getNewAddedUserIds({
        newUserIds: newMemberIds,
        previousUserIds: previousMemberIds,
      });

      const uniqueNewAddedMemberIds = [...new Set(newAddedMemberIds)];

      if (uniqueNewAddedMemberIds?.length) {
        await createUserTeamsMembers({
          memberIds: uniqueNewAddedMemberIds,
          teamId: teamId,
          flameLinkOwnerId: adminFlamelinkId,
          teamName: teamName,
        });
      }

      const newAdminIds =
        (newTeamData?.admins?.map(
          (adminRef: FirebaseFirestore.DocumentReference) => {
            return adminRef?.id;
          },
        ) as string[]) || [];

      const previousAdminIds =
        (previousTeamData?.admins?.map(
          (adminRef: FirebaseFirestore.DocumentReference) => {
            return adminRef?.id;
          },
        ) as string[]) || [];

      const deletedAdminIds = getDeletedUserIds({
        newUserIds: newAdminIds,
        previousUserIds: previousAdminIds,
      });

      const uniqueDeletedAdminIds = [...new Set(deletedAdminIds)];

      if (uniqueDeletedAdminIds?.length) {
        await deleteMembersOutOfTeam({
          adminFlamelinkId: adminFlamelinkId,
          memberIds: uniqueDeletedAdminIds,
          teamId: teamId,
          type: TeamMemberType.ADMIN,
        });
      }

      const newAddedAdminIds = getNewAddedUserIds({
        newUserIds: newAdminIds,
        previousUserIds: previousAdminIds,
      });

      const uniqueNewAddedAdminIds = [...new Set(newAddedAdminIds)];

      if (uniqueNewAddedAdminIds?.length) {
        await createUserTeamAdmins({
          adminIds: uniqueNewAddedAdminIds,
          teamId: teamId,
          flameLinkOwnerId: adminFlamelinkId,
          teamName: teamName,
        });
      }

      const newOwnerIds =
        (newTeamData?.owners?.map(
          (ownerRef: FirebaseFirestore.DocumentReference) => {
            return ownerRef?.id;
          },
        ) as string[]) || [];

      const previousOwnerIds =
        (previousTeamData?.owners?.map(
          (ownerRef: FirebaseFirestore.DocumentReference) => {
            return ownerRef?.id;
          },
        ) as string[]) || [];

      const deletedOwnerIds = getDeletedUserIds({
        newUserIds: newOwnerIds,
        previousUserIds: previousOwnerIds,
      });

      const uniqueDeletedOwnerIds = [...new Set(deletedOwnerIds)];

      if (uniqueDeletedOwnerIds?.length) {
        await deleteMembersOutOfTeam({
          adminFlamelinkId: adminFlamelinkId,
          memberIds: uniqueDeletedOwnerIds,
          teamId: teamId,
          type: TeamMemberType.OWNER,
        });
      }

      const newAddedOwnerIds = getNewAddedUserIds({
        newUserIds: newOwnerIds,
        previousUserIds: previousOwnerIds,
      });

      const uniqueNewAddedOwnerIds = [...new Set(newAddedOwnerIds)];

      if (uniqueNewAddedOwnerIds?.length) {
        await createUserTeamsOwners({
          ownerIds: uniqueNewAddedOwnerIds,
          teamId: teamId,
          flameLinkOwnerId: adminFlamelinkId,
          teamName: teamName,
        });
      }

      if (
        newTeamData?.isVerified === true &&
        newTeamData?.isApproved === true &&
        previousOwnerIds?.length
      ) {
        //send noti to user with accepted messages
        await sendAcceptNotiCreateTeam({
          ownerIds: previousOwnerIds,
          adminId: adminFlamelinkId,
          teamName: newTeamData?.teamName,
          teamId,
        });
      }

      if (
        newTeamData?.rejectMessage &&
        newTeamData?.isVerified === true &&
        newTeamData?.isApproved === false &&
        newTeamData?.createdBy
      ) {
        await sendRejectNotiCreateTeam({
          ownerIds: newTeamData?.createdBy,
          adminId: adminFlamelinkId,
          rejectMessage: newTeamData?.rejectMessage,
          teamName: newTeamData?.teamName,
          teamId,
        });
      }
    }
  });

class FilterUsers {
  newUserIds: string[];
  previousUserIds: string[];
}

function getDeletedUserIds(filterUsers: FilterUsers) {
  const { previousUserIds, newUserIds } = filterUsers;
  return previousUserIds?.filter((userId) => {
    const deletedOneId = !newUserIds?.includes(userId);
    return deletedOneId;
  });
}

function getNewAddedUserIds(filterUsers: FilterUsers) {
  const { previousUserIds, newUserIds } = filterUsers;
  return newUserIds?.filter((userId) => {
    const newAddedOneId = !previousUserIds?.includes(userId);
    return newAddedOneId;
  });
}
