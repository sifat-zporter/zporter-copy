import { db } from '../config/firebase.config';

export const convertFullNameAsArray = async (userId: string) => {
  const userRef = await db.collection('users').doc(userId).get();

  if (userRef.data()?.profile?.firstName) {
    const concat = (
      (userRef.data()?.profile?.firstName +
        userRef.data()?.profile?.lastName) as string
    ).toLowerCase();
    const fullName = [];

    for (let i = 1; i <= concat.length; i++) {
      fullName.push(concat.substring(0, i));
    }

    userRef.ref.set(
      {
        profile: {
          fullName,
        },
      },
      { merge: true },
    );
  }
};

export interface ProfileName {
  firstName: string;
  lastName: string;
}

export const createFullnameArray = (name: ProfileName): string[] => {
  if (!name.firstName) {
    name.firstName =
      'firstName' + (Math.random() + 1).toString(36).substring(7);
  }

  const concat = (name.firstName + name.lastName).toLowerCase();
  const fullName = [];

  for (let i = 1; i <= concat.length; i++) {
    fullName.push(concat.substring(0, i));
  }

  return fullName;
};

export const convertTeamNameAsArray = async (teamId: string) => {
  const teamRef = await db.collection('teams').doc(teamId).get();

  if (teamRef.data()?.teamName) {
    const lowerCaseName = (teamRef.data()?.teamName as string)
      .toLowerCase()
      .replace(' ', '');

    const teamNameAsArray = [];

    for (let i = 1; i <= lowerCaseName.length; i++) {
      teamNameAsArray.push(lowerCaseName.substring(0, i));
    }

    teamRef.ref.set(
      {
        teamNameAsArray,
      },
      { merge: true },
    );
  }
};

export const convertGroupNameAsArray = async (groupId: string) => {
  const groupRef = await db.collection('groups').doc(groupId).get();

  if (groupRef.data()?.name) {
    const lowerCaseName = (groupRef.data()?.name as string)
      .toLowerCase()
      .replace(' ', '');

    const groupNameAsArray = [];

    for (let i = 1; i <= lowerCaseName.length; i++) {
      groupNameAsArray.push(lowerCaseName.substring(0, i));
    }

    groupRef.ref.set(
      {
        groupNameAsArray,
      },
      { merge: true },
    );
  }
};
