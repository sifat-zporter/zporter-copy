import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UserInfoDto } from '../../common/constants/common.constant';
import { ResponsePagination } from '../../common/pagination/pagination.dto';
import { db } from '../../config/firebase.config';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { commonPagination } from '../../helpers/common-pagination';
import { GetListRelationshipsQuery } from '../friends/dto/friends.req.dto';
import { Status, TypeRequest } from '../friends/enum/friend.enum';
import { FriendsService } from '../friends/friends.service';
import { GroupsService } from '../groups/groups.service';
import { TeamsService } from '../teams/teams.service';
import { ContactTab, GetListContactQuery } from './dto/contact-groups.req.dto';
import { UsersService } from '../users/v1/users.service';
@Injectable()
export class ContactGroupsService {
  constructor(
    @Inject(forwardRef(() => FriendsService))
    private readonly friendsService: FriendsService,
    private readonly groupsService: GroupsService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async getListContacts(
    getListContactQuery: GetListContactQuery,
    currentUserId: string,
  ) {
    const { tab, limit, startAfter, sorted, clubId, country, search, role } =
      getListContactQuery;

    if (tab === ContactTab.ALL) {
      return this.usersService.getListUsersForListContact(
        currentUserId,
        getListContactQuery,
      );
    }

    if (tab === ContactTab.FRIENDS) {
      const [data, countFriendRequests] = await Promise.all([
        this.friendsService.getListRelationships(currentUserId, {
          limit: +limit,
          sorted,
          clubId,
          country,
          name: search,
          startAfter: +startAfter,
          status: Status.ACCEPTED,
          type: TypeRequest.FRIEND,
          role,
        } as GetListRelationshipsQuery),
        this.friendsService.getListRelationships(
          currentUserId,
          {
            limit: +limit,
            sorted,
            startAfter: +startAfter,
            status: Status.REQUESTED,
            type: TypeRequest.FRIEND,
            role,
          } as GetListRelationshipsQuery,
          true,
        ),
      ]);

      return {
        ...(data as ResponsePagination<UserInfoDto>),
        countFriendRequests: countFriendRequests as number,
      };
    }

    if (tab === ContactTab.FOLLOWERS) {
      return this.friendsService.getListRelationships(currentUserId, {
        limit: +limit,
        sorted,
        clubId,
        country,
        name: search,
        startAfter: +startAfter,
        status: Status.ACCEPTED,
        type: TypeRequest.FOLLOW,
        role,
      } as GetListRelationshipsQuery);
    }

    if (tab === ContactTab.FANS) {
      return this.friendsService.getListRelationships(currentUserId, {
        limit: +limit,
        sorted,
        clubId,
        country,
        startAfter: +startAfter,
        status: Status.ACCEPTED,
        type: TypeRequest.FAN,
        role,
      } as GetListRelationshipsQuery);
    }

    if (tab === ContactTab.TEAM) {
      return this.teamsService.getListTeams(currentUserId, getListContactQuery);
    }

    if (tab === ContactTab.GROUPS) {
      return this.groupsService.getListGroups(
        currentUserId,
        getListContactQuery,
      );
    }

    if (tab === ContactTab.GROUPS_NAME) {
      return this.groupsService.getListGroupsName(
        currentUserId,
        getListContactQuery,
      );
    }

    if (tab === ContactTab.BLOCKED) {
      return this.friendsService.getListBlockedFriends(
        currentUserId,
        getListContactQuery,
      );
    }

    if (tab === ContactTab.TEAMMATES) {
      const { data, count } = await this.teamsService.getListTeammates(
        currentUserId,
        getListContactQuery,
      );

      return commonPagination(getListContactQuery, data, count);
    }
  }

  async getAllContacts(
    getListContactQuery: GetListContactQuery,
    currentUserId: string,
  ) {
    const { sorted, limit, startAfter, clubId, country, role, search, teamId } =
      getListContactQuery;

    let userRef = db
      .collection('users')
      .orderBy('profile.firstName', sorted)
      .where('account.isActive', '==', true)
      .select(
        'media.faceImage',
        'playerCareer',
        'profile.firstName',
        'profile.lastName',
        'profile.birthCountry',
        'profile.birthDay',
        'profile.city',
        'username',
        'isOnline',
        'type',
      );

    let totalCount = db
      .collection('users')
      .orderBy('profile.firstName', sorted)
      .where('account.isActive', '==', true);

    if (search) {
      userRef = userRef.where(
        'profile.fullName',
        'array-contains',
        search.replace(' ', '').toLowerCase(),
      );

      totalCount = totalCount.where(
        'profile.fullName',
        'array-contains',
        search.replace(' ', '').toLowerCase(),
      );
    }

    if (clubId) {
      userRef = userRef.where('playerCareer.clubId', '==', clubId);
      totalCount = totalCount.where('playerCareer.clubId', '==', clubId);
    }

    if (teamId) {
      userRef = userRef.where('teamIds', 'array-contains', teamId);
      totalCount = totalCount.where('teamIds', 'array-contains', teamId);
    }

    if (country) {
      userRef = userRef.where('profile.birthCountry.name', '==', country);
      totalCount = totalCount.where('profile.birthCountry.name', '==', country);
    }

    if (role) {
      userRef = userRef.where('type', '==', role);
      totalCount = totalCount.where('type', '==', role);
    }

    const countNotIncludeSearch = await totalCount.get();

    if (startAfter) {
      userRef = userRef.startAfter(startAfter).limit(+limit);
    }

    if (!startAfter) {
      userRef = userRef.limit(+limit);
    }

    if (search && limit) {
      totalCount = totalCount.limit(+limit);
    }

    const [userSnapshot, count, blockedFriends, beBlockedFriends] =
      await Promise.all([
        userRef.get(),
        totalCount.get(),
        this.friendsService.getListBlockedFriends(currentUserId, {
          limit: 0,
          sorted,
        }),
        this.friendsService.getListToBeBlocked(currentUserId, {
          limit: 0,
          sorted,
        }),
      ]);

    const listBlocked = [...blockedFriends.data, ...beBlockedFriends.data];

    const userDocs = userSnapshot.docs;

    const userIds = [];

    userDocs
      .filter((doc) => !listBlocked.find(({ userId }) => doc.id === userId))
      .forEach((doc) => {
        if (doc.id !== currentUserId) {
          userIds.push(doc.id);
        }
      });

    const mappingUserInfo = userIds.map(async (userId) => {
      const userInfo = await mappingUserInfoById(userId, currentUserId, true);

      return userInfo;
    });

    const result = await Promise.all(mappingUserInfo);

    const countDoc = search
      ? result.length
      : countNotIncludeSearch.size - listBlocked.length;

    return {
      data: result,
      count: countDoc,
    };
  }
}
