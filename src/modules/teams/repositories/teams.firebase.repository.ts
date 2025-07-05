import { db, fb } from '../../../config/firebase.config';
import { JoinTeamStatus } from '../dto/teams.req.dto';

export class TeamsFirebaseService {
  async synchronizeTeamMemberIds(teamId: string) {
    try {
      const [teamSnapshot, teamRef, userTeamRef] = await Promise.all([
        fb.ref().child('chatRooms').child(teamId).get(),
        db.collection('teams').doc(teamId).get(),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('status', '==', JoinTeamStatus.ACCEPTED)
          .get(),
      ]);
      const clubRef = await db
        .collection('clubs')
        .doc(teamRef.data()?.clubId)
        .get();

      if (teamSnapshot.exists() && teamRef.exists) {
        const userTeamDocs = userTeamRef.docs;
        const memberIds = userTeamDocs.map((doc) => {
          return doc.data()?.userId;
        });

        await fb.ref('/chatRooms/' + teamId).update({
          chatRoomImage: teamRef.data()?.teamImage,
          chatRoomName: `${clubRef.data()?.clubName} - ${
            teamRef.data()?.teamName
          }`,
          memberIds,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  async removeTeamSnapshot(teamId: string) {
    const [teamSnapshot, teamRef] = await Promise.all([
      fb.ref().child('chatRooms').child(teamId).get(),
      db.collection('teams').doc(teamId).get(),
    ]);

    if (teamSnapshot.exists && !teamRef.exists) {
      teamSnapshot.ref.remove();
    }
  }
}
