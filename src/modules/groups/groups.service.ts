import {
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as moment from 'moment';
import {
  BigQueryTable,
  ResponseMessage,
  UserInfoDto,
} from '../../common/constants/common.constant';
import { SortBy } from '../../common/pagination/pagination.dto';
import { db } from '../../config/firebase.config';
import {
  mappingUserInfo,
  mappingUserInfoById,
} from '../../helpers/mapping-user-info';
import { commonPagination } from '../../helpers/common-pagination';
import {
  ContactTab,
  GetListContactQuery,
} from '../contact-groups/dto/contact-groups.req.dto';
import { FriendsService } from '../friends/friends.service';
import {
  CreateNotificationDto,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MemberType } from '../teams/dto/teams.req.dto';
import { TeamsService } from '../teams/teams.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { convertGroupNameAsArray } from '../../helpers/convert-name-as-array';
import {
  BlockGroupType,
  BlockMemberDto,
  ChangeStatusJoinGroup,
  ChangeStatusJoinGroupDto,
  commonConstants,
  CreateGroupDto,
  GetGroupByIdQuery,
  GroupMemberType,
  JoinGroupStatus,
  SearchGroupMemberQuery,
  UnblockMembersDto,
  UpdateGroupDto,
  UpdateMemberDto,
} from './dto/group.req.dto';
import { GroupsFirebaseService } from './repositories/groups.firebase.repository';
import { GroupsBigQueryService } from './repositories/groups.repository';

@Injectable()
export class GroupsService {
  constructor(
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => FriendsService))
    private readonly friendsService: FriendsService,
    private readonly groupsFirebaseService: GroupsFirebaseService,
    private readonly groupsBigQueryService: GroupsBigQueryService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
  ) {}

  async getGroupById(currentUserId: string, groupId: string) {
    const groupRef = await db.collection('groups').doc(groupId).get();

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.mappingGroupInfo(currentUserId, groupId);
  }

  async mappingGroupInfo(currentUserId: string, groupId: string) {
    const groupRef = await db.collection('groups').doc(groupId).get();

    const [userGroupRef, checkJoinedGroup] = await Promise.all([
      db
        .collection('users_groups')
        .where('groupId', '==', groupRef.id)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get(),
      db
        .collection('users_groups')
        .where('userId', '==', currentUserId)
        .where('groupId', '==', groupRef.id)
        .get(),
    ]);

    let memberType: MemberType = MemberType.NOT_A_MEMBER;

    const usernames = [];
    const userImages = [];
    const userIds = [];
    const userGroupDocs = userGroupRef.docs;

    if (!checkJoinedGroup.empty) {
      checkJoinedGroup.docs.map((doc) => {
        const { status } = doc.data();

        if (status === JoinGroupStatus.ACCEPTED) {
          memberType = doc.data()?.memberType;
        } else {
          memberType = MemberType.PENDING;
        }
      });
    }

    const mappingUserGroupInfo = userGroupDocs
      .map(async (doc) => {
        try {
          const { userId } = doc.data();

          const { isActive, username, faceImage } = await mappingUserInfoById(
            userId,
          );

          if (!isActive) {
            const userGroupRef = await db
              .collection('users_groups')
              .where('groupId', '==', doc.id)
              .where('userId', '==', userId)
              .where('status', '==', JoinGroupStatus.ACCEPTED)
              .get();

            userGroupRef.forEach((doc) => {
              doc.ref.delete();
            });
          }

          if (usernames.length < commonConstants.LIMIT_USERNAME) {
            usernames.push(`#${username}`);
          }

          if (userImages.length < commonConstants.LIMIT_USER_IMAGES) {
            userImages.push(faceImage as string);
          }

          userIds.push(userId);
        } catch (error) {
          return null;
        }
      })
      .filter((e) => e);
    await Promise.all(mappingUserGroupInfo);

    return {
      ...groupRef.data(),
      groupId: groupRef.id,
      groupUrl: `${process.env.WEB_BASE_URL}/contacts/group/${groupRef.id}`,
      usernames,
      userImages,
      userIds,
      memberType,
    };
  }

  async isBlocked(groupId: string, memberId: string) {
    const blackListRef = await db
      .collection('blacklists')
      .where('userId', '==', memberId)
      .where('groupId', '==', groupId)
      .where('type', '==', BlockGroupType.BLOCK_MEMBER)
      .get();

    const groupRef = await db.collection('groups').doc(groupId).get();

    if (!blackListRef.empty) {
      throw new HttpException(
        `${groupRef.data()?.name}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return true;
  }

  async checkPermissionGroup(
    currentUserId: string,
    groupId: string,
    memberType: GroupMemberType[],
  ) {
    const userGroupRef = await db
      .collection('users_groups')
      .where('groupId', '==', groupId)
      .where('userId', '==', currentUserId)
      .where('status', '==', JoinGroupStatus.ACCEPTED)
      .where('memberType', 'in', [...memberType])
      .get();

    return userGroupRef.empty ? false : true;
  }

  async searchGroupMember(
    currentUserId: string,
    groupId: string,
    searchGroupMemberQuery: SearchGroupMemberQuery,
  ) {
    const data = [];
    const adminIds: string[] = [];
    const ownerIds: string[] = [];
    const memberIds: string[] = [];

    const { sorted, limit, startAfter, name, memberType } =
      searchGroupMemberQuery;

    const userGroupRef = await db
      .collection('users_groups')
      .where('groupId', '==', groupId)
      .where('status', '==', JoinGroupStatus.ACCEPTED)
      .get();

    userGroupRef.forEach((doc) => {
      const { memberType, userId } = doc.data();

      if (memberType === GroupMemberType.MEMBER) {
        memberIds.push(userId);
      }
      if (memberType === GroupMemberType.ADMIN) {
        adminIds.push(userId);
      }
      if (memberType === GroupMemberType.OWNER) {
        ownerIds.push(userId);
      }
    });

    let userRef = db
      .collection('users')
      .orderBy('profile.firstName', sorted)
      .where('account.isActive', '==', true);

    if (name) {
      userRef = userRef.where(
        'profile.fullName',
        'array-contains',
        name.replace(' ', '').toLowerCase(),
      );
    }

    if (startAfter) {
      userRef = userRef.startAfter(startAfter).limit(+limit);
    }

    if (!startAfter) {
      userRef = userRef.limit(+limit);
    }

    const userDocs = (await userRef.get()).docs;

    const filteringUserInfo = userDocs.map(async (doc) => {
      const blacklistRef = await db
        .collection('blacklists')
        .where('userId', '==', doc.id)
        .where('groupId', '==', groupId)
        .where('isDeleted', '==', false)
        .where('type', '==', BlockGroupType.BLOCK_GROUP)
        .get();

      if (blacklistRef.empty && doc.id !== currentUserId) {
        data.push({ ...doc.data(), userId: doc.id });
      }
    });

    await Promise.all(filteringUserInfo);

    const userInfoMapped = await mappingUserInfo(data);

    if (memberType === GroupMemberType.OWNER) {
      const adminsAndMembers = userInfoMapped.filter((e) => {
        return ![...ownerIds].includes(e.userId);
      });

      return {
        data: adminsAndMembers,
        count: adminsAndMembers.length,
      };
    }

    if (memberType === GroupMemberType.ADMIN) {
      let members: UserInfoDto[] = [];

      const ownerType = await this.checkPermissionGroup(
        currentUserId,
        groupId,
        [GroupMemberType.OWNER],
      );
      const adminType = await this.checkPermissionGroup(
        currentUserId,
        groupId,
        [GroupMemberType.ADMIN],
      );

      if (ownerType) {
        // filter all members ain't joined and ain't joined
        members = userInfoMapped.filter((e) => {
          return ![...adminIds].includes(e.userId);
        });
      }
      if (adminType) {
        members = userInfoMapped.filter((e) => {
          return ![...adminIds, ...ownerIds].includes(e.userId);
        });
      }

      return {
        data: members,
        count: members.length,
      };
    }

    if (memberType === GroupMemberType.MEMBER) {
      let members: UserInfoDto[] = [];

      const ownerType = await this.checkPermissionGroup(
        currentUserId,
        groupId,
        [GroupMemberType.OWNER],
      );
      const adminType = await this.checkPermissionGroup(
        currentUserId,
        groupId,
        [GroupMemberType.ADMIN],
      );

      // get all members aren't joined
      if (ownerType) {
        members = userInfoMapped.filter((e) => {
          return ![...memberIds].includes(e.userId);
        });
      }

      if (adminType) {
        members = userInfoMapped.filter((e) => {
          return ![...memberIds, ...ownerIds].includes(e.userId);
        });
      }

      return {
        data: members,
        count: members.length,
      };
    }
  }

  async getListGroups(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
  ) {
    const { startAfter, country, search, clubId } = getListContactQuery;

    const joinTable: string[] = [];

    const conditions: string[] = [];

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (country || clubId) {
      joinTable.push(` \n
      LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
      ON
        json_value(${BigQueryTable.GROUPS}.data, '$.createdBy') = ${BigQueryTable.USERS}.document_id
      `);
    }

    if (search) {
      conditions.push(` \n
      LOWER(json_value(${BigQueryTable.GROUPS}.DATA, '$.name')) like '%${search
        .trim()
        .toLowerCase()}%'
      `);
    }

    if (country) {
      conditions.push(`
        json_value(${BigQueryTable.GROUPS}.DATA, '$.country.name') LIKE '%${country}%'
      `);
    }

    if (clubId) {
      conditions.push(` \n
        json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
      OR
        json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
      `);
    }

    const { rows, count } = await this.groupsBigQueryService.getListGroups(
      currentUserId,
      getListContactQuery,
      joinTable,
      conditions,
    );

    const mappingGroupInfo = rows.map(async ({ groupId }) => {
      const result = await this.mappingGroupInfo(currentUserId, groupId);

      return result;
    });

    const data = await Promise.all(mappingGroupInfo);

    return commonPagination(getListContactQuery, data, count);
  }

  async getListGroupsName(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
  ) {
    const { startAfter, search } = getListContactQuery;

    const conditions: string[] = [];

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (search) {
      conditions.push(` \n
      LOWER(json_value(${BigQueryTable.GROUPS}.DATA, '$.name')) like '%${search
        .trim()
        .toLowerCase()}%'
      `);
    }

    getListContactQuery.tab = ContactTab.GROUPS;

    const { rows, count } = await this.groupsBigQueryService.getListGroups(
      currentUserId,
      getListContactQuery,
      [],
      conditions,
    );

    const data = rows.map(({ name }) => ({ name: name }));

    return commonPagination(getListContactQuery, data, count);
  }

  async getGroupMembersById(
    currentUserId: string,
    groupId: string,
    getGroupByIdQuery: GetGroupByIdQuery,
  ) {
    const { data, count } = await this.groupsBigQueryService.getListMembers(
      currentUserId,
      groupId,
      getGroupByIdQuery,
    );

    return commonPagination(getGroupByIdQuery, data, count);
  }

  async getListBlockedMembers(
    currentUserId: string,
    groupId: string,
    getGroupByIdQuery: GetGroupByIdQuery,
  ) {
    const { limit, sorted, startAfter } = getGroupByIdQuery;

    const data = [];
    const blockedMembers = [];

    let blackListsRef = db
      .collection('blacklists')
      .orderBy('createdAt', sorted)
      .where('groupId', '==', groupId)
      .where('type', '==', BlockGroupType.BLOCK_MEMBER)
      .where('isDeleted', '==', false);

    const countBlackListRef = await blackListsRef.get();

    if (!startAfter) {
      blackListsRef = blackListsRef.limit(+limit);
    }

    if (startAfter) {
      blackListsRef = blackListsRef.startAfter(+startAfter).limit(+limit);
    }

    const querySnapshot = await blackListsRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const mappingUserInfo = data.map(async (e) => {
      const userData = await mappingUserInfoById(e.userId, currentUserId, true);
      if (userData) {
        blockedMembers.push({
          ...userData,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        });
      }
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? blockedMembers.sort((a, b) => a.updatedAt - b.updatedAt)
      : blockedMembers.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: blockedMembers, count: countBlackListRef.size };
  }

  async getListAdmins(
    currentUserId: string,
    groupId: string,
    getGroupByIdQuery: GetGroupByIdQuery,
  ) {
    const data = [];
    const members = [];
    const { limit, sorted, startAfter } = getGroupByIdQuery;

    let userGroupRef = db
      .collection('users_groups')
      .orderBy('updatedAt', sorted)
      .where('groupId', '==', groupId)
      .where('status', '==', JoinGroupStatus.ACCEPTED)
      .where('memberType', 'in', [
        GroupMemberType.OWNER,
        GroupMemberType.ADMIN,
      ]);

    const countMember = await userGroupRef.get();

    if (!startAfter) {
      userGroupRef = userGroupRef.limit(+limit);
    }

    if (startAfter) {
      userGroupRef = userGroupRef.startAfter(+startAfter).limit(+limit);
    }

    const querySnapshot = await userGroupRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const mappingUserInfo = data.map(async (e) => {
      const userData = await mappingUserInfoById(e.userId, currentUserId, true);

      if (userData) {
        members.push({
          ...userData,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        });
      }
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? members.sort((a, b) => a.updatedAt - b.updatedAt)
      : members.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: members, count: countMember.size };
  }
  // async updateCountryForAllGroup(): Promise<string> {
  //   return 'Success.';
  // }

  async createGroup(userId: string, createGroupDto: CreateGroupDto) {
    const { name, memberIds, groupImage, isPrivate, country } = createGroupDto;

    if (memberIds.includes(userId)) {
      throw new HttpException(`Can't add yourself`, HttpStatus.BAD_REQUEST);
    }

    let newCountry = country;
    if (!country) {
      const query = await db.collection('users').doc(userId).get();
      newCountry = query.data().profile.birthCountry;
    }

    const [ownerInfo, newGroup] = await Promise.all([
      mappingUserInfoById(userId),
      db.collection('groups').add({
        name,
        country: JSON.parse(JSON.stringify(newCountry)),
        groupImage: groupImage ? groupImage : null,
        userImages: [],
        isPrivate,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
        createdBy: userId,
      }),
    ]);

    const userImages: string[] = [];
    userImages.push(ownerInfo.faceImage as string);

    let addingMembers = [];

    if (memberIds.length) {
      addingMembers = memberIds.map(async (memId) => {
        const [userGroupRef, memberInfo] = await Promise.all([
          db
            .collection('users_groups')
            .where('groupId', '==', newGroup.id)
            .where('userId', '==', memId)
            .get(),
          mappingUserInfoById(memId),
        ]);

        if (!memberInfo.isActive) {
          throw new HttpException(
            ResponseMessage.User.NOT_FOUND,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (!userGroupRef.empty) {
          throw new HttpException(
            ResponseMessage.Group.ALREADY_IN,
            HttpStatus.BAD_REQUEST,
          );
        }

        const payload = new CreateNotificationDto();
        payload.token = memberInfo.fcmToken as string[];
        payload.notificationType = NotificationType.INVITE_MEMBER_GROUP;
        payload.receiverId = memId;
        payload.senderId = ownerInfo.userId as string;
        payload.title = `#${
          ownerInfo.username
        } added you to be a ${GroupMemberType.MEMBER.toLowerCase()} of ${name} group`;
        payload.largeIcon = ownerInfo.faceImage as string;
        payload.username = ownerInfo.username as string;
        payload.userType = ownerInfo.type as UserTypes;
        payload.others = {
          groupId: newGroup.id,
          memberType: GroupMemberType.MEMBER,
        };

        await Promise.all([
          this.notificationsService.sendMulticastNotification(payload),
          db.collection('users_groups').add({
            groupId: newGroup.id,
            userId: memId,
            status: JoinGroupStatus.ACCEPTED,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            memberType: GroupMemberType.MEMBER,
          }),
        ]);
      });
    }

    await Promise.all([
      ...addingMembers,
      convertGroupNameAsArray(newGroup.id),
      db.collection('users_groups').add({
        groupId: newGroup.id,
        userId: userId,
        status: JoinGroupStatus.ACCEPTED,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
        memberType: GroupMemberType.OWNER,
      }),
    ]);

    const groupInfo = await this.mappingGroupInfo(userId, newGroup.id);

    return {
      groupId: newGroup.id,
      groupInfo,
      acceptedMemberIds: [...memberIds, userId],
    };
  }

  async updateGroup(
    currentUserId: string,
    groupId: string,
    updateGroupDto: UpdateGroupDto,
    isAdmin: boolean,
  ) {
    const { memberIds, groupImage, ...rest } = updateGroupDto;
    const groupRef = await db.collection('groups').doc(groupId).get();

    const checkPermission = await this.checkPermissionGroup(
      currentUserId,
      groupId,
      [GroupMemberType.ADMIN, GroupMemberType.OWNER],
    );
    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException('Forbidden resource!');
    }

    await groupRef.ref.set(
      {
        ...rest,
        groupImage: groupImage ? groupImage : null,
        updatedAt: +moment.utc().format('x'),
      },
      { merge: true },
    );

    rest.name && (await convertGroupNameAsArray(groupId));

    if (memberIds?.length) {
      await this.updateMemberType(currentUserId, groupId, updateGroupDto);
    }

    await this.groupsFirebaseService.synchronizeGroupMemberIds(groupId);

    return ResponseMessage.Group.UPDATED;
  }

  async updateMember(
    currentUserId: string,
    groupId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    const { memberType } = updateMemberDto;

    if (memberType === GroupMemberType.OWNER) {
      await this.updateOwnerType(currentUserId, groupId, updateMemberDto);
    }
    if (memberType === GroupMemberType.MEMBER) {
      await this.updateMemberType(currentUserId, groupId, updateMemberDto);
    }

    if (memberType === GroupMemberType.ADMIN) {
      await this.updateAdminType(currentUserId, groupId, updateMemberDto);
    }

    return this.groupsFirebaseService.synchronizeGroupMemberIds(groupId);
  }

  async updateOwnerType(
    currentUserId: string,
    groupId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    let title: string;
    const { memberIds } = updateMemberDto;

    const [groupRef, adminInfo] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      mappingUserInfoById(currentUserId),
      this.checkPermissionGroup(currentUserId, groupId, [
        GroupMemberType.OWNER,
      ]),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { username, faceImage, type } = adminInfo;

    if (memberIds.length) {
      const updateOwners = memberIds.map(async (memberId) => {
        const userGroupRef = await db
          .collection('users_groups')
          .where('groupId', '==', groupId)
          .where('userId', '==', memberId)
          .get();

        if (userGroupRef.empty) {
          await db.collection('users_groups').add({
            groupId,
            userId: memberId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            status: JoinGroupStatus.ACCEPTED,
            memberType: GroupMemberType.OWNER,
          });

          title = `#${username} added you to be an ${GroupMemberType.OWNER.toLowerCase()} of ${
            groupRef.data()?.name
          } group`;
        } else {
          userGroupRef.docs.map((doc) => {
            doc.ref.set(
              {
                memberType: GroupMemberType.OWNER,
                status: JoinGroupStatus.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );
          });

          title = `#${username} upgraded you to be an ${GroupMemberType.OWNER.toLowerCase()} of ${
            groupRef.data()?.name
          } group`;
        }

        const { fcmToken } = await mappingUserInfoById(memberId);

        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.notificationType = NotificationType.UPGRADE_GROUP_MEMBER_TYPE;
        payload.receiverId = memberId;
        payload.senderId = currentUserId;
        payload.title = title;
        payload.largeIcon = faceImage;
        payload.username = username;
        payload.userType = type;
        payload.others = {
          groupId,
          memberType: GroupMemberType.OWNER,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });
      await Promise.all(updateOwners);
    }
  }

  async updateMemberType(
    currentUserId: string,
    groupId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    let title: string;
    let notificationType: NotificationType;

    const { memberIds } = updateMemberDto;

    const [groupRef, adminInfo] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      mappingUserInfoById(currentUserId),
      this.checkPermissionGroup(currentUserId, groupId, [
        GroupMemberType.ADMIN,
        GroupMemberType.OWNER,
      ]),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { username, faceImage, type } = adminInfo;

    if (memberIds.length) {
      const updateMembers = memberIds.map(async (memberId) => {
        const userGroupRef = await db
          .collection('users_groups')
          .where('groupId', '==', groupId)
          .where('userId', '==', memberId)
          .get();

        if (userGroupRef.empty) {
          await db.collection('users_groups').add({
            groupId,
            userId: memberId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            status: JoinGroupStatus.ACCEPTED,
            memberType: GroupMemberType.MEMBER,
          });

          title = `#${username} added you to be a ${GroupMemberType.MEMBER.toLowerCase()} of ${
            groupRef.data()?.name
          } group`;

          notificationType = NotificationType.INVITE_MEMBER_TEAM;
        } else {
          userGroupRef.docs.map((doc) => {
            doc.ref.set(
              {
                memberType: GroupMemberType.MEMBER,
                status: JoinGroupStatus.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );
          });

          title = `#${username} are now downgraded to a ${GroupMemberType.MEMBER.toLowerCase()}`;

          notificationType = NotificationType.DOWNGRADE_GROUP_MEMBER_TYPE;
        }

        const { fcmToken } = await mappingUserInfoById(memberId);

        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.notificationType = notificationType;
        payload.receiverId = memberId;
        payload.senderId = currentUserId;
        payload.title = title;
        payload.largeIcon = faceImage;
        payload.username = username;
        payload.userType = type;
        payload.others = {
          groupId,
          memberType: GroupMemberType.MEMBER,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(updateMembers);
    }
  }

  async updateAdminType(
    currentUserId: string,
    groupId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    let title: string;
    let notificationType: NotificationType;

    const { memberIds } = updateMemberDto;

    const [groupRef, adminInfo] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      mappingUserInfoById(currentUserId),
      this.checkPermissionGroup(currentUserId, groupId, [
        GroupMemberType.ADMIN,
        GroupMemberType.OWNER,
      ]),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { username, faceImage, type } = adminInfo;

    if (memberIds.length) {
      const updateAdmins = memberIds.map(async (memberId) => {
        const userGroupRef = await db
          .collection('users_groups')
          .where('groupId', '==', groupId)
          .where('userId', '==', memberId)
          .get();

        if (userGroupRef.empty) {
          await db.collection('users_groups').add({
            groupId,
            userId: memberId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            status: JoinGroupStatus.ACCEPTED,
            memberType: GroupMemberType.ADMIN,
          });

          title = `#${username} added you to be an ${GroupMemberType.ADMIN.toLowerCase()} of ${
            groupRef.data()?.name
          } group`;

          notificationType = NotificationType.INVITE_MEMBER_GROUP;
        } else {
          userGroupRef.docs.map((doc) => {
            const { memberType } = doc.data();

            doc.ref.set(
              {
                memberType: GroupMemberType.ADMIN,
                status: JoinGroupStatus.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );

            if (memberType === GroupMemberType.OWNER) {
              title = `#${username} are now downgraded to an ${GroupMemberType.ADMIN.toLowerCase()}`;

              notificationType = NotificationType.DOWNGRADE_GROUP_MEMBER_TYPE;
            }

            if (memberType === GroupMemberType.MEMBER) {
              title = `#${username} upgraded you to be an ${GroupMemberType.ADMIN.toLowerCase()} of ${
                groupRef.data()?.name
              } group`;

              notificationType = NotificationType.UPGRADE_GROUP_MEMBER_TYPE;
            }
          });
        }

        const { fcmToken } = await mappingUserInfoById(memberId);

        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.notificationType = notificationType;
        payload.receiverId = memberId;
        payload.senderId = currentUserId;
        payload.title = title;
        payload.largeIcon = faceImage;
        payload.username = username;
        payload.userType = type;
        payload.others = {
          groupId,
          memberType: GroupMemberType.ADMIN,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(updateAdmins);
    }
    return true;
  }

  async sendRequestJoinGroup(userId: string, groupId: string) {
    const [groupRef, userGroupRef, adminsGroupRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', userId)
        .get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .where('memberType', 'in', [
          GroupMemberType.OWNER,
          GroupMemberType.ADMIN,
        ])
        .get(),
      this.isBlocked(groupId, userId),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    userGroupRef.forEach((doc) => {
      const { status } = doc.data();

      if (status === JoinGroupStatus.ACCEPTED) {
        throw new HttpException(
          ResponseMessage.Group.ALREADY_IN,
          HttpStatus.BAD_REQUEST,
        );
      }
    });

    if (!userGroupRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.ALREADY_REQUEST,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db.collection('users_groups').add({
      groupId,
      userId,
      status: JoinGroupStatus.PENDING,
      memberType: GroupMemberType.MEMBER,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });

    const adminIds: string[] = [];
    adminsGroupRef.forEach((doc) => {
      const { userId } = doc.data();

      adminIds.push(userId);
    });

    if (adminIds.length) {
      const memberInfo = await mappingUserInfoById(userId);

      const sendNotifications = adminIds.map(async (adminId) => {
        const adminInfo = await mappingUserInfoById(adminId);

        const payload = new CreateNotificationDto();
        payload.token = adminInfo.fcmToken as string[];
        payload.notificationType = NotificationType.ASK_JOIN_GROUP;
        payload.receiverId = adminId;
        payload.senderId = userId;
        payload.title = `#${memberInfo.username as string} asks to join ${
          groupRef.data()?.name
        } group`;
        payload.largeIcon = memberInfo.faceImage as string;
        payload.username = memberInfo.username as string;
        payload.userType = memberInfo.type as UserTypes;
        payload.others = {
          groupId,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(sendNotifications);
    }

    return ResponseMessage.Group.SEND_REQUEST_JOIN_GROUP;
  }

  async changeStatusJoin(
    currentUserId: string,
    changeStatusJoinGroupDto: ChangeStatusJoinGroupDto,
    changeStatusJoinGroup: ChangeStatusJoinGroup,
  ) {
    let message: string;
    const { memberIds } = changeStatusJoinGroupDto;
    const { groupId, status } = changeStatusJoinGroup;

    await this.checkPermissionGroup(currentUserId, groupId, [
      GroupMemberType.ADMIN,
      GroupMemberType.OWNER,
    ]);

    if (memberIds.length) {
      const changeStatusJoin = memberIds.map(async (memId) => {
        const userGroupRef = await db
          .collection('users_groups')
          .where('userId', '==', memId)
          .where('groupId', '==', groupId)
          .get();

        const userGroupDocs = userGroupRef.docs;

        const changingStatus = userGroupDocs.map(async (doc) => {
          if (doc.data()?.status === JoinGroupStatus.PENDING) {
            if (status === JoinGroupStatus.ACCEPTED) {
              await doc.ref.set(
                {
                  status: JoinGroupStatus[status],
                  updatedAt: +moment.utc().format('x'),
                },
                { merge: true },
              );

              message = ResponseMessage.Group.ACCEPTED;
            }

            if (status === JoinGroupStatus.REJECTED) {
              doc.ref.delete();
              message = ResponseMessage.Group.REJECTED;
            }
          }
        });

        await Promise.all(changingStatus);
      });

      await Promise.all(changeStatusJoin);

      await this.groupsFirebaseService.synchronizeGroupMemberIds(groupId);
      return message;
    }
  }

  async blockGroup(currentUserId: string, groupId: string) {
    const [groupRef, userGroupRef, blacklistRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', currentUserId)
        .get(),
      db
        .collection('blacklists')
        .where('userId', '==', currentUserId)
        .where('groupId', '==', groupId)
        .where('type', '==', BlockGroupType.BLOCK_GROUP)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!blacklistRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.ALREADY_BLOCKED,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!userGroupRef.empty) {
      const joinGroupStatus = userGroupRef.docs[0]?.data()?.status;

      // already in group -> leave group
      if (joinGroupStatus === JoinGroupStatus.ACCEPTED) {
        await this.leaveGroup(currentUserId, groupId);
      }

      // already send request join -> remove join request
      if (joinGroupStatus === JoinGroupStatus.PENDING) {
        userGroupRef.docs[0].ref.delete();
      }
    }

    const blockingGroup = db.collection('blacklists').add({
      userId: currentUserId,
      groupId,
      type: BlockGroupType.BLOCK_GROUP,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      isDeleted: false,
    });

    await Promise.all([
      blockingGroup,
      this.groupsFirebaseService.synchronizeGroupMemberIds(groupId),
    ]);
  }

  async unblockGroup(currentUserId: string, groupId: string) {
    const [groupRef, blacklistRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('blacklists')
        .where('userId', '==', currentUserId)
        .where('groupId', '==', groupId)
        .where('type', '==', BlockGroupType.BLOCK_GROUP)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (blacklistRef.empty) {
      throw new HttpException(
        'REQUEST_BLOCKED_NOT_FOUND',
        HttpStatus.BAD_REQUEST,
      );
    }

    blacklistRef.docs[0].ref.delete();

    return ResponseMessage.Group.UNBLOCKED;
  }

  async blockMember(
    currentUserId: string,
    blockMemberDto: BlockMemberDto,
    isAdmin: boolean,
  ) {
    const { groupId, memberId } = blockMemberDto;

    const [groupRef, userGroupRef, blacklistRef, getCurrentMemberType] =
      await Promise.all([
        db.collection('groups').doc(groupId).get(),
        db
          .collection('users_groups')
          .where('groupId', '==', groupId)
          .where('userId', '==', memberId)
          .get(),
        db
          .collection('blacklists')
          .where('userId', '==', memberId)
          .where('groupId', '==', groupId)
          .where('type', '==', BlockGroupType.BLOCK_MEMBER)
          .get(),
        db
          .collection('users_groups')
          .where('groupId', '==', groupId)
          .where('userId', '==', currentUserId)
          .where('status', '==', JoinGroupStatus.ACCEPTED)
          .get(),
      ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userGroupRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.MEMBER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const checkPermission = await this.checkPermissionGroup(
      currentUserId,
      groupId,
      [GroupMemberType.ADMIN, GroupMemberType.OWNER],
    );
    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException('Forbidden resource!');
    }

    if (!blacklistRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.ALREADY_BLOCKED,
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentMemberType = getCurrentMemberType.docs[0]?.data()?.memberType;

    const userGroupDocs = userGroupRef.docs;

    const removeMember = userGroupDocs.map(async (doc) => {
      const { memberType } = doc.data();
      if (
        memberType === GroupMemberType.OWNER &&
        currentMemberType !== GroupMemberType.OWNER
      ) {
        throw new HttpException(
          'Can not block the owner of the group',
          HttpStatus.BAD_REQUEST,
        );
      }

      await doc.ref.delete();
    });

    const blockMember = db.collection('blacklists').add({
      userId: memberId,
      groupId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      type: BlockGroupType.BLOCK_MEMBER,
      isDeleted: false,
    });

    await Promise.all([
      removeMember,
      blockMember,
      this.groupsFirebaseService.synchronizeGroupMemberIds(groupId),
    ]);

    return ResponseMessage.Group.BLOCKED;
  }

  async unblockMember(
    currentUserId: string,
    unblockMembersDto: UnblockMembersDto,
    isAdmin: boolean,
  ) {
    const { groupId, memberIds } = unblockMembersDto;

    if (memberIds.length) {
      const unblockMembers = memberIds.map(async (memId) => {
        const [groupRef, userGroupRef, blacklistRef] = await Promise.all([
          db.collection('groups').doc(groupId).get(),
          db
            .collection('users_groups')
            .where('groupId', '==', groupId)
            .where('userId', '==', memId)
            .get(),
          db
            .collection('blacklists')
            .where('userId', '==', memId)
            .where('groupId', '==', groupId)
            .where('type', '==', BlockGroupType.BLOCK_MEMBER)
            .get(),
        ]);

        if (!groupRef.exists) {
          throw new HttpException(
            ResponseMessage.Group.NOT_FOUND,
            HttpStatus.NOT_FOUND,
          );
        }

        const checkPermission = await this.checkPermissionGroup(
          currentUserId,
          groupId,
          [GroupMemberType.ADMIN, GroupMemberType.OWNER],
        );
        if (!checkPermission && !isAdmin) {
          throw new ForbiddenException('Forbidden resource!');
        }

        if (!userGroupRef.empty) {
          throw new HttpException(
            ResponseMessage.Group.MEMBER_NOT_FOUND,
            HttpStatus.NOT_FOUND,
          );
        }

        if (blacklistRef.empty) {
          throw new HttpException(
            ResponseMessage.Group.NOT_BLOCKED,
            HttpStatus.BAD_REQUEST,
          );
        }

        blacklistRef.forEach((doc) => {
          doc.ref.delete();
        });
      });

      await Promise.all(unblockMembers);

      return ResponseMessage.Group.UNBLOCKED;
    }
  }

  async deleteMember(
    currentUserId: string,
    groupId: string,
    memberId: string,
    isAdmin: boolean,
  ) {
    const [groupRef, userGroupRef, getCurrentMemberType] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', memberId)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const checkPermission = await this.checkPermissionGroup(
      currentUserId,
      groupId,
      [GroupMemberType.ADMIN, GroupMemberType.OWNER],
    );
    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException('Forbidden resource!');
    }

    const currentMemberType = getCurrentMemberType.docs[0]?.data()?.memberType;

    const userGroupDocs = userGroupRef.docs;

    const removeMember = userGroupDocs.map(async (doc) => {
      const { memberType } = doc.data();
      if (
        memberType === GroupMemberType.OWNER &&
        currentMemberType !== GroupMemberType.OWNER
      ) {
        throw new HttpException(
          'Can not delete the owner of the group',
          HttpStatus.BAD_REQUEST,
        );
      }

      await doc.ref.delete();
    });

    await Promise.all([
      removeMember,
      this.groupsFirebaseService.synchronizeGroupMemberIds(groupId),
    ]);

    return ResponseMessage.Group.DELETE_MEMBER;
  }

  async deleteGroup(currentUserId: string, groupId: string, isAdmin: boolean) {
    const [groupRef, userGroupRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db.collection('users_groups').where('groupId', '==', groupId).get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const checkPermission = await this.checkPermissionGroup(
      currentUserId,
      groupId,
      [GroupMemberType.OWNER],
    );
    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException('Forbidden resource!');
    }

    groupRef.ref.delete();

    if (userGroupRef.size) {
      userGroupRef.forEach((doc) => {
        doc.ref.delete();
      });
    }

    await this.groupsFirebaseService.removeGroupSnapshot(groupId);

    return ResponseMessage.Group.DELETE_GROUP;
  }

  async deleteJoinRequest(
    currentUserId: string,
    groupId: string,
    memberId: string,
    isAdmin: boolean,
  ) {
    const [groupRef, userGroupRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', memberId)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userGroupRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.REQUEST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const checkPermission = await this.checkPermissionGroup(
      currentUserId,
      groupId,
      [GroupMemberType.ADMIN, GroupMemberType.OWNER],
    );
    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException('Forbidden resource!');
    }

    userGroupRef.forEach((doc) => {
      const { status } = doc.data();

      if (status !== JoinGroupStatus.PENDING) {
        throw new HttpException(
          ResponseMessage.Group.REQUEST_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      doc.ref.delete();
    });

    return ResponseMessage.Group.DELETE_REQUEST;
  }

  async cancelRequestJoinGroup(currentUserId: string, groupId: string) {
    const [groupRef, userGroupRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinGroupStatus.PENDING)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userGroupRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.REQUEST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    userGroupRef.docs[0].ref.delete();

    return ResponseMessage.Group.CANCEL_REQUEST_JOIN_GROUP;
  }

  async deleteBlockRequest(
    currentUserId: string,
    groupId: string,
    memberId: string,
    isAdmin: boolean,
  ) {
    const [groupRef, blacklistRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('blacklists')
        .where('groupId', '==', groupId)
        .where('userId', '==', memberId)
        .where('type', '==', BlockGroupType.BLOCK_MEMBER)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (blacklistRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.NOT_BLOCKED,
        HttpStatus.NOT_FOUND,
      );
    }

    const checkPermission = await this.checkPermissionGroup(
      currentUserId,
      groupId,
      [GroupMemberType.ADMIN, GroupMemberType.OWNER],
    );
    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException('Forbidden resource!');
    }
    blacklistRef.forEach((doc) => {
      doc.ref.set({ isDeleted: true }, { merge: true });
    });

    return ResponseMessage.Group.DELETE_REQUEST;
  }

  async leaveGroup(currentUserId: string, groupId: string) {
    const memberIds: string[] = [];
    const [groupRef, userGroupRef, ownerGroupRef] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get(),
      db
        .collection('users_groups')
        .where('groupId', '==', groupId)
        .where('memberType', '==', GroupMemberType.OWNER)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get(),
    ]);

    if (!groupRef.exists) {
      throw new HttpException(
        ResponseMessage.Group.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userGroupRef.empty) {
      throw new HttpException(
        ResponseMessage.Group.MEMBER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userGroupDocs = userGroupRef.docs;

    const leavingGroup = userGroupDocs.map(async (doc) => {
      const userGroupRef = await db
        .collection('users_groups')
        .orderBy('updatedAt', 'asc')
        .where('groupId', '==', groupId)
        .where('status', '==', JoinGroupStatus.ACCEPTED)
        .get();

      const { memberType } = doc.data();

      if (memberType === GroupMemberType.OWNER) {
        if (userGroupRef.size === 1) {
          return this.deleteGroup(currentUserId, groupId, true);
        }

        if (ownerGroupRef.size === 1) {
          const admins = userGroupRef.docs.filter(
            (doc) => doc.data()?.memberType === GroupMemberType.ADMIN,
          );

          const members = userGroupRef.docs.filter(
            (doc) => doc.data()?.memberType === GroupMemberType.MEMBER,
          );

          if (admins[0]?.exists) {
            admins[0].ref.set(
              { memberType: GroupMemberType.OWNER },
              { merge: true },
            );

            memberIds.push(admins[0].data()?.userId);
          } else {
            members[0].ref.set(
              { memberType: GroupMemberType.OWNER },
              { merge: true },
            );

            memberIds.push(members[0].data()?.userId);
          }
        }

        await Promise.all([
          doc.ref.delete(),
          this.updateMember(currentUserId, groupId, {
            memberIds,
            memberType: GroupMemberType.OWNER,
          }),
        ]);
      } else {
        doc.ref.delete();
      }
    });

    Promise.all([
      leavingGroup,
      this.groupsFirebaseService.synchronizeGroupMemberIds(groupId),
    ]);

    return ResponseMessage.Group.LEAVE_GROUP;
  }
}
