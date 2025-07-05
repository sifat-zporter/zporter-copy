import { GenderTypes, UserInfoDto } from '../common/constants/common.constant';
import { CountryDto } from '../common/dto/country.dto';
import { db } from '../config/firebase.config';
import { JoinTeamStatus } from '../modules/clubs/enum/club.enum';
import { FriendsService } from '../modules/friends/friends.service';
import { TeamsService } from '../modules/teams/teams.service';
import { CoachDto } from '../modules/users/dto/coach.dto';
import { PlayerDto } from '../modules/users/dto/player.dto';
import { UserTypes } from '../modules/users/enum/user-types.enum';
import * as moment from 'moment';
import { getBioUrl } from '../utils/get-bio-url';

export const mappingUserInfo = async (userData?: PlayerDto[] | CoachDto[]) => {
  const mappingUserInfo = userData.map(async (user) => {
    const userInfo = mappingUserInfoById(user.userId);

    return userInfo;
  });

  const data = await Promise.all(mappingUserInfo);

  return data;
};

export const mappingUserInfoById = async (
  userId: string,
  currentUserId?: string,
  relationship?: boolean,
  selectedFields?: Array<keyof UserInfoDto>,
): Promise<UserInfoDto> => {
  let isRelationship: boolean;
  const userRef = await db.collection('users').doc(userId).get();

  const user = userRef.data();

  //# TODO:
  //*-> this is for prevent error if user's undefined
  //*-> need to find other way to prevent it
  if (!userRef.exists) return;

  let clubId: string,
    clubDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
    shirtNumber: number;

  if (user?.type === UserTypes.PLAYER) {
    clubId = user?.playerCareer?.clubId;
    shirtNumber = user?.playerCareer?.shirtNumber;
  }

  if (user?.type === UserTypes.COACH) {
    clubId = user?.coachCareer?.clubId;
  }

  if (clubId) {
    clubDoc = await db.collection('clubs').doc(clubId).get();
  }
  const teamIds: string[] = [];
  const currentTeams = [];

  const userTeamRef = await db
    .collection('users_teams')
    .where('userId', '==', userId)
    .where('status', '==', JoinTeamStatus.ACCEPTED)
    .get();

  userTeamRef.forEach((doc) => {
    teamIds.push(doc?.data()?.teamId);
  });

  const mappingTeamInfo = teamIds.map(async (teamId) => {
    const teamRef = await db.collection('teams').doc(teamId).get();

    if (teamRef.exists && teamRef?.data()?.teamName) {
      currentTeams.push(teamRef?.data()?.teamName);
    }
  });

  await Promise.all(mappingTeamInfo);

  let isFriend = false;
  let isTeammates = false;
  let isFollowed = false;

  if (relationship) {
    const friendsService = new FriendsService();
    const [checkIsFriend, checkIsFollowed] = await Promise.all([
      friendsService.checkFriendRelationship(currentUserId, userId),
      friendsService.checkFollow(currentUserId, userId),
    ]);
    isFriend = checkIsFriend;
    isFollowed = checkIsFollowed;

    if (checkIsFriend) {
      isRelationship = checkIsFriend;
    } else if (checkIsFollowed) {
      isRelationship = checkIsFollowed;
    } else {
      const teamsService = new TeamsService();
      const checkIsTeammates = await teamsService.isTeammates(
        currentUserId,
        userId,
      );
      isRelationship = checkIsTeammates;
      isTeammates = checkIsTeammates;
    }
  }

  const currentYear = +moment.utc().format('YYYY');
  const age =
    currentYear - +(user?.profile?.birthDay as string)?.substring(0, 4);

  const userInfo = new UserInfoDto();

  userInfo.email = user?.account?.email;
  userInfo.isActive = user?.account?.isActive || false;
  userInfo.birthCountry =
    (user?.profile?.birthCountry as CountryDto) ||
    <CountryDto>{
      alpha2Code: 'SE',
      alpha3Code: 'SWE',
      flag: 'https://static.dwcdn.net/css/flag-icons/flags/1x1/se.svg',
      name: 'Sweden',
      region: 'Europe',
    };
  userInfo.fullName =
    ((user?.profile?.firstName as string) || 'Zporter') +
    ' ' +
    ((user?.profile?.lastName as string) || 'Anonymous');
  userInfo.clubId = clubId || 'N/A';
  userInfo.currentHubspotId = user?.hubspotId;
  userInfo.firstName = (user?.profile?.firstName as string) || 'Zporter';
  userInfo.fcmToken = (user?.fcmToken as string[]) || [];
  userInfo.city = user?.profile?.city as string;
  userInfo.settingCountryRegion = user?.settings?.country?.region as string;
  userInfo.settingCountryName = user?.settings?.country?.name as string;
  userInfo.favoriteRoles =
    (user?.playerCareer?.favoriteRoles as string[]) ||
    (user?.coachCareer?.role === undefined
      ? []
      : ([user?.coachCareer?.role] as string[])) ||
    [];
  userInfo.currentTeams = currentTeams as string[];
  userInfo.lastName = (user?.profile?.lastName as string) || 'Anonymous';
  userInfo.faceImage = user?.media?.faceImage
    ? (user?.media?.faceImage as string)
    : process.env.DEFAULT_IMAGE;
  userInfo.username = (user?.username as string) || '';
  userInfo.type = (user?.type as UserTypes) || ('N/A' as UserTypes);
  userInfo.userId = userRef.id as string;
  userInfo.uid = user?.uid as string;
  userInfo.teamIds = (user?.teamIds as string[]) || [];
  userInfo.isOnline = (user?.isOnline as boolean) || false;
  userInfo.clubName = (clubDoc?.data()?.clubName as string) || 'N/A';
  userInfo.clubLogoUrl = (clubDoc?.data()?.logoUrl as string) || 'N/A';
  userInfo.timezone = user?.timezone || process.env.DEFAULT_TIMEZONE;
  userInfo.lastActive = user?.lastActive || 0;
  userInfo.birthDay =
    (user?.profile?.birthDay as string) || '1987-01-01T00:00:00.000';
  userInfo.createdAt = (user?.account?.createdAt as number) || 0;
  userInfo.updatedAt = (user?.updatedAt as number) || 0;
  userInfo.shirtNumber = shirtNumber ? shirtNumber : null;
  userInfo.gender = user?.profile?.gender || GenderTypes.Other;
  userInfo.weight = user?.health?.weight?.value || 0;
  userInfo.height = user?.health?.height?.value || 0;
  userInfo.fatherHeight = user?.health?.fatherHeight || 0;
  userInfo.motherHeight = user?.health?.motherHeight || 0;
  userInfo.age = age || 0;
  userInfo.isRelationship = isRelationship;
  userInfo.isPublic = user?.settings?.public || false;
  userInfo.notificationOn = user?.settings?.notificationOn || false;
  userInfo.isFriend = isFriend;
  userInfo.isTeammates = isTeammates;
  userInfo.isFollowed = isFollowed;
  userInfo.bioUrl = getBioUrl({
    type: userInfo.type,
    username: userInfo.username,
    lastName: userInfo.lastName,
    firstName: userInfo.firstName,
  });
  userInfo.notificationOptions = user?.settings?.notificationOptions || {
    feedUpdates: false,
    inviteUpdates: false,
    messageUpdates: false,
    profileAndDiaryUpdates: false,
  };

  if (selectedFields) {
    const filteredFields = Object.keys(userInfo)
      .filter((key) => (selectedFields as string[]).includes(key))
      .reduce((obj, key) => {
        obj[key] = userInfo[key];
        return obj;
      }, {});

    return filteredFields;
  }

  return userInfo;
};
