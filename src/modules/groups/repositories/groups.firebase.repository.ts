import { db, fb } from '../../../config/firebase.config';
import { JoinGroupStatus } from '../dto/group.req.dto';

export class GroupsFirebaseService {
  async synchronizeGroupMemberIds(groupId: string) {
    const [groupSnapshot, groupRef, userGroupRef] = await Promise.all([
      fb.ref().child('chatRooms').child(groupId).get(),
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get(),
    ]);

    if (groupSnapshot.exists() && groupRef.exists) {
      const userGroupDocs = userGroupRef.docs;

      const memberIds = userGroupDocs.map((doc) => {
        return doc.data()?.userId;
      });

      await fb.ref('/chatRooms/' + groupId).update({
        chatRoomImage: groupRef.data()?.groupImage || null,
        chatRoomName: groupRef.data()?.name,
        memberIds,
      });
    }
  }

  async removeGroupSnapshot(groupId: string) {
    const [groupSnapshot, groupRef] = await Promise.all([
      fb.ref().child('chatRooms').child(groupId).get(),
      db.collection('groups').doc(groupId).get(),
    ]);

    if (groupSnapshot.exists && !groupRef.exists) {
      groupSnapshot.ref.remove();
    }
  }
}
