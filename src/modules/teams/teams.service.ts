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
  CACHE_KEYS,
  ResponseMessage,
  UserInfoDto,
  ZporterIcon,
} from '../../common/constants/common.constant';
import { SortBy } from '../../common/pagination/pagination.dto';
import { bq, db } from '../../config/firebase.config';
import {
  mappingUserInfo,
  mappingUserInfoById,
} from '../../helpers/mapping-user-info';
import { commonPagination } from '../../helpers/common-pagination';
import { deleteNotFoundDocumentIndex } from '../../utils/delete-not-found-document-index-elastic';
import { CacheManagerService } from '../cache-manager/cache-manager.service';
import { GetListContactQuery } from '../contact-groups/dto/contact-groups.req.dto';
import {
  CreateNotificationDto,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { convertTeamNameAsArray } from '../../helpers/convert-name-as-array';
import {
  BlockMemberTeamDto,
  BlockTeamType,
  ChangeStatusJoinTeamDto,
  ChangeStatusJoinTeamQuery,
  commonConstants,
  ConfirmBlockOrDeleteFromTeamQuery,
  CreateTeamDto,
  CreateTeamSignUpDto,
  GetAllMembersInTeam,
  GetTeamByIdQuery,
  JoinTeamStatus,
  MemberConfirm,
  MemberType,
  SearchTeamMemberQuery,
  TeamContactTab,
  TeamMemberType,
  TeamTab,
  UnblockMembersTeamDto,
  UpdateMemberDto,
  UpdateTeamDto,
} from './dto/teams.req.dto';
import { TeamsFirebaseService } from './repositories/teams.firebase.repository';
import { TeamsBigQueryService } from './repositories/teams.repository';
import { ClubService } from '../clubs/v1/clubs.service';
import { UsersService } from '../users/v1/users.service';
import { CommonResponse } from '../abstract/dto/common-response';
import { Query } from '@google-cloud/bigquery';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
    private readonly teamsFirebaseService?: TeamsFirebaseService,
    private readonly teamsBigQueryService?: TeamsBigQueryService,
    private readonly cacheManagerService?: CacheManagerService,
    @Inject(forwardRef(() => ClubService))
    private readonly clubsService?: ClubService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService?: UsersService,
  ) {}

  async setAdminSystemIsOwnerTeam(teamId: string) {
    const adminAccount = await this.usersService.getUserAdmin();
    if (!adminAccount) {
      return;
    }

    const checkExists = await db
      .collection('users_teams')
      .where('userId', '==', adminAccount.userId)
      .where('memberType', '==', MemberType.OWNER)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .where('teamId', '==', teamId)
      .get();

    if (checkExists.empty) {
      await db.collection('users_teams').add({
        teamId: teamId,
        userId: adminAccount.userId,
        status: JoinTeamStatus.ACCEPTED,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
        memberType: TeamMemberType.OWNER,
      });
    }
  }

  async synchronizeAdminManagerAllTeams() {
    const teamIds = [];

    const [adminAccount, teamQuery] = await Promise.all([
      this.usersService.getUserAdmin(),
      db.collection('teams').select('uid').get(),
    ]);

    if (!adminAccount) {
      throw new HttpException(
        `system don't have admin account`,
        HttpStatus.NOT_FOUND,
      );
    }
    teamQuery.docs.map((doc) => {
      if (doc.id !== 'undefined') teamIds.push(doc.id);
    });
    if (!teamIds.length) {
      return new CommonResponse(
        'add admin system to all teams successfully',
        HttpStatus.OK,
        null,
      );
    }

    const teamsExistsAdminIsOwner = await db
      .collection('users_teams')
      .where('userId', '==', adminAccount.userId)
      .where('memberType', '==', MemberType.OWNER)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .get();
    const teamIdsExistsAdmin = teamsExistsAdminIsOwner.docs.map(
      (doc) => doc.data().teamId,
    );

    for (let i = 0; i < teamIds.length; i++) {
      if (!teamIdsExistsAdmin.includes(teamIds[i])) {
        await db.collection('users_teams').add({
          teamId: teamIds[i],
          userId: adminAccount.userId,
          status: JoinTeamStatus.ACCEPTED,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
          memberType: TeamMemberType.OWNER,
        });
      }
    }

    return new CommonResponse(
      'add admin system to all teams successfully',
      HttpStatus.OK,
      null,
    );
  }

  async getMemberIdsFromTeams(currentUserId: string) {
    const userIds: string[] = [];
    const { teamIds } = await mappingUserInfoById(currentUserId);

    if (teamIds.length) {
      const gettingUserIds = teamIds.map(async (teamId) => {
        const userTeamRef = await db
          .collection('users_teams')
          .select('userId')
          .where('status', '==', JoinTeamStatus.ACCEPTED)
          .where('teamId', '==', teamId)
          .where('userId', '!=', currentUserId)
          .get();

        userTeamRef.docs.map((doc) => {
          const { userId } = doc.data();

          userIds.push(userId);
        });
      });

      await Promise.all(gettingUserIds);
    }

    return [...new Set(userIds)];
  }

  async updateTeamIdsInfo(currentUserId: string) {
    const [userRef, teamIds] = await Promise.all([
      db.collection('users').doc(currentUserId).get(),
      this.getListTeamIdsByUserId(currentUserId),
    ]);

    return userRef.ref.set({ teamIds }, { merge: true });
  }

  async mappingTeamInfo(currentUserId: string, teamId: string) {
    const teamRef = await db.collection('teams').doc(teamId).get();

    const clubId =
      teamRef.data()?.clubId || teamRef.data()?.clubRef?._path?.segments[1];

    const clubInfo = await this.clubsService.getClubById(clubId);
    if (!clubInfo) {
      return null;
    }
    const userTeamRef = await db
      .collection('users_teams')
      .where('teamId', '==', teamRef.id)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .get();

    const checkJoinedTeam = await db
      .collection('users_teams')
      .where('userId', '==', currentUserId)
      .where('teamId', '==', teamRef.id)
      .get();

    let memberType: MemberType = MemberType.NOT_A_MEMBER;

    if (!checkJoinedTeam.empty) {
      checkJoinedTeam.docs.map((doc) => {
        const { status } = doc.data();

        if (status === JoinTeamStatus.ACCEPTED) {
          memberType = doc.data()?.memberType;
        } else {
          memberType = MemberType.PENDING;
        }
      });
    }

    const userTeamDocs = userTeamRef.docs;

    const usernames: string[] = [];
    const userIds: string[] = [];

    const mappingUserTeamInfo = userTeamDocs
      .map(async (doc) => {
        try {
          const { userId, teamId } = doc.data();
          const { username, isActive } = await mappingUserInfoById(userId);

          if (!isActive) {
            const userTeamRef = await db
              .collection('users_teams')
              .where('teamId', '==', teamId)
              .where('userId', '==', userId)
              .where('status', '==', JoinTeamStatus.ACCEPTED)
              .get();

            userTeamRef.forEach((doc) => {
              doc.ref.delete();
            });
          }

          if (usernames.length < commonConstants.LIMIT_USERNAME) {
            usernames.push(`#${username}`);
          }

          userIds.push(userId);
        } catch (error) {
          return null;
        }
      })
      .filter((e) => e);

    await Promise.all(mappingUserTeamInfo);

    return {
      teamName: teamRef.data()?.teamName,
      teamImage:
        teamRef.data()?.teamImage || process.env.DEFAULT_TEAM_COVER_IMAGE,
      ...clubInfo,
      clubUrl: clubInfo.logoUrl,
      userIds,
      teamId: teamRef.id,
      usernames,
      memberType,
    };
  }

  async isTeammates(userIdA: string, userIdB: string) {
    let isTeammate = false;
    const [userATeams, userBTeams] = await Promise.all([
      db
        .collection('users_teams')
        .where('userId', '==', userIdA)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get(),
      db
        .collection('users_teams')
        .where('userId', '==', userIdB)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get(),
    ]);

    userATeams.docs.forEach((docA) => {
      userBTeams.docs.forEach((docB) => {
        if (docA.data()?.teamId === docB.data()?.teamId) {
          isTeammate = true;
        }
      });
    });

    return isTeammate;
  }

  async findOne(teamId: string) {
    const teamRef = await db.collection('teams').doc(teamId).get();

    const clubId =
      teamRef.data()?.clubId || teamRef.data()?.clubRef?._path?.segments[1];

    const clubInfo = await this.clubsService.getClubById(clubId);

    return {
      teamName: teamRef.exists ? teamRef.data()?.teamName : 'N/A',
      ...clubInfo,
      clubLogo: clubInfo?.logoUrl || ZporterIcon.BLACK_ICON,
      teamImage: teamRef?.data()?.teamImage || process.env.DEFAULT_IMAGE,
      teamId: teamRef.id,
    };
  }

  async isBlocked(memberId: string, teamIds: string[]) {
    const validTeamIds: string[] = [];
    const checkBlockInTeam = teamIds.map(async (teamId) => {
      const [blackListRef, teamRef] = await Promise.all([
        db
          .collection('blacklists')
          .where('userId', '==', memberId)
          .where('teamId', '==', teamId)
          .where('type', '==', BlockTeamType.BLOCK_MEMBER)
          .get(),
        db.collection('teams').doc(teamId).get(),
      ]);

      if (!blackListRef.empty) {
        throw new HttpException(
          `${teamRef.data()?.teamName}`,
          HttpStatus.FORBIDDEN,
        );
      }
      validTeamIds.push(teamId);
    });

    await Promise.all(checkBlockInTeam);

    return validTeamIds;
  }

  async mappingTeamNamesInfoByUserId(userId: string) {
    const teamIds: string[] = [];
    const currentTeams = [];

    const userTeamRef = await db
      .collection('users_teams')
      .where('userId', '==', userId)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .get();

    userTeamRef.forEach((doc) => {
      const { teamId } = doc.data();

      teamIds.push(teamId);
    });

    const mappingTeamInfo = teamIds.map(async (teamId) => {
      const teamRef = await db.collection('teams').doc(teamId).get();

      if (teamRef.exists) {
        currentTeams.push(teamRef.data()?.teamName);
      }
    });

    await Promise.all(mappingTeamInfo);

    return currentTeams;
  }

  async mappingTeamInfoByUserId(userId: string) {
    const teamIds = [];
    const currentTeams = [];

    const userTeamRef = await db
      .collection('users_teams')
      .where('userId', '==', userId)
      .get();

    userTeamRef.forEach((doc) => {
      const { teamId, status } = doc.data();

      teamIds.push({ teamId, status });
    });

    for (const id of teamIds) {
      const { teamId, status } = id;
      const teamRef = await db.collection('teams').doc(teamId).get();

      if (teamRef.exists) {
        currentTeams.push({
          clubId: teamRef.data()?.clubId,
          teamId,
          teamName: teamRef.data()?.teamName,
          teamImage: teamRef.data()?.teamImage,
          status,
        });
      }
    }

    return currentTeams;
  }

  async getListTeamIdsByUserId(userId: string, status?: JoinTeamStatus[]) {
    const teamIds = [];

    let userTeamRef = db
      .collection('users_teams')
      .where('userId', '==', userId);

    if (status?.length) {
      userTeamRef = userTeamRef.where('status', 'in', status);
    } else {
      userTeamRef = userTeamRef.where('status', '==', JoinTeamStatus.ACCEPTED);
    }

    const querySnapshot = await userTeamRef.get();

    const userTeamDocs = querySnapshot.docs;

    const checkTeamExistAndUpdateTeamIds = userTeamDocs.map(async (doc) => {
      const { teamId } = doc.data();

      const teamRef = await db.collection('teams').doc(teamId).get();

      if (teamRef.exists) {
        teamIds.push(teamId);
      }
    });

    await Promise.all(checkTeamExistAndUpdateTeamIds);

    return teamIds;
  }

  async getAllMemberFromJoinedTeams(
    userId: string,
    getAllMembersInTeam: GetAllMembersInTeam,
  ) {
    const { userType } = getAllMembersInTeam;

    let memberIds: string[] = [];

    const teamIds = await this.getListTeamIdsByUserId(userId);

    if (teamIds.length) {
      const gettingMemberIds = teamIds.map(async (teamId) => {
        const memberIdsV1 = await this.getAllMemberIds(userId, teamId);
        memberIds = [...memberIds, ...memberIdsV1];
      });

      await Promise.all(gettingMemberIds);
    }

    memberIds = [...new Set(memberIds)];

    if (memberIds.length) {
      const mappingUserInfo = memberIds.map(async (memberId) => {
        return mappingUserInfoById(memberId);
      });

      const result = await Promise.all(mappingUserInfo);

      if (userType) {
        return result.filter(({ type }) => type === userType);
      }

      return result;
    }

    return [];
  }

  async getAllMemberInTeam(
    userId: string,
    teamId: string,
    getAllMembersInTeam: GetAllMembersInTeam,
  ) {
    const { userType } = getAllMembersInTeam;

    const memberIds = await this.getAllMemberIds(userId, teamId);

    if (memberIds.length) {
      const mappingUserInfo = memberIds.map(async (memberId) => {
        return mappingUserInfoById(memberId);
      });

      const result = (await Promise.all(mappingUserInfo)).filter((e) => e);

      if (userType) {
        return result.filter(({ type }) => type === userType);
      }

      return result;
    }

    return [];
  }

  async getAllMemberIds(
    currentUserId: string,
    teamId: string,
    memberTypes?: TeamMemberType[],
    isJoined = false,
  ) {
    const memberIds: string[] = [];

    const teamRef = await db.collection('teams').doc(teamId).get();

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (isJoined) {
      const checkIsJoined = await db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get();

      if (checkIsJoined.empty) {
        return memberIds;
      }
    }

    let userTeamRef = db
      .collection('users_teams')
      .where('teamId', '==', teamId)
      .where('userId', '!=', currentUserId);

    if (memberTypes?.length) {
      userTeamRef = userTeamRef.where('memberType', 'in', memberTypes);
    } else {
      userTeamRef = userTeamRef.where('status', '==', JoinTeamStatus.ACCEPTED);
    }

    const querySnapshot = await userTeamRef.get();

    querySnapshot.forEach((doc) => {
      const { userId } = doc.data();

      memberIds.push(userId);
    });

    return memberIds;
  }

  async getListTeammates(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
  ) {
    return this.teamsBigQueryService.getListTeammates(
      currentUserId,
      getListContactQuery,
    );
  }

  async checkPermissionTeam(
    currentUserId: string,
    teamId: string,
    memberType: TeamMemberType[],
  ) {
    const userTeamRef = await db
      .collection('users_teams')
      .where('teamId', '==', teamId)
      .where('userId', '==', currentUserId)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .where('memberType', 'in', [...memberType])
      .get();

    if (userTeamRef.empty) {
      return false;
    }

    return true;
  }

  async searchTeamMember(
    currentUserId: string,
    teamId: string,
    searchTeamMemberQuery: SearchTeamMemberQuery,
    isAdmin: boolean,
  ) {
    const data = [];
    const adminIds: string[] = [];
    const ownerIds: string[] = [];
    const memberIds: string[] = [];

    const { sorted, limit, startAfter, name, memberType } =
      searchTeamMemberQuery;

    const { clubId } = await mappingUserInfoById(currentUserId);

    const userTeamRef = await db
      .collection('users_teams')
      .where('teamId', '==', teamId)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .get();

    userTeamRef.forEach((doc) => {
      const { userId, memberType } = doc.data();

      if (memberType === TeamMemberType.MEMBER) {
        memberIds.push(userId);
      }
      if (memberType === TeamMemberType.ADMIN) {
        adminIds.push(userId);
      }
      if (memberType === TeamMemberType.OWNER) {
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
        .where('teamId', '==', teamId)
        .where('isDeleted', '==', false)
        .where('type', '==', BlockTeamType.BLOCK_TEAM)
        .get();

      if (blacklistRef.empty && doc.id !== currentUserId) {
        data.push({ ...doc.data(), userId: doc.id });
      }
    });

    await Promise.all(filteringUserInfo);

    const userInfoMapped = await mappingUserInfo(data);

    if (memberType === TeamMemberType.ALL) {
      const allMembers = userInfoMapped
        .filter((e) => {
          return (
            [...memberIds, ...adminIds, ...ownerIds].includes(e.userId) &&
            e.clubId === clubId &&
            e.type !== UserTypes.COACH
          );
        })
        .sort((a, b) => a.shirtNumber - b.shirtNumber);

      return { data: allMembers, count: allMembers.length };
    }

    if (memberType === TeamMemberType.OWNER) {
      const adminsAndMembers = userInfoMapped.filter((e) => {
        return !ownerIds.includes(e.userId) && e.clubId === clubId;
      });
      return {
        data: adminsAndMembers,
        count: adminsAndMembers.length,
      };
    }

    if (memberType === TeamMemberType.ADMIN) {
      let members: UserInfoDto[] = [];
      const ownerType = await this.checkPermissionTeam(currentUserId, teamId, [
        TeamMemberType.OWNER,
      ]);
      const adminType = await this.checkPermissionTeam(currentUserId, teamId, [
        TeamMemberType.ADMIN,
      ]);

      // filter all members ain't joined and ain't joined
      if (ownerType) {
        // filter all members ain't joined and ain't joined
        members = userInfoMapped.filter((e) => {
          return !adminIds.includes(e.userId) && e.clubId === clubId;
        });
      }
      if (isAdmin || adminType) {
        members = userInfoMapped.filter((e) => {
          return (
            ![...adminIds, ...ownerIds].includes(e.userId) &&
            e.clubId === clubId
          );
        });
      }

      return {
        data: members,
        count: members.length,
      };
    }

    if (memberType === TeamMemberType.MEMBER) {
      let members: UserInfoDto[] = [];
      const ownerType = await this.checkPermissionTeam(currentUserId, teamId, [
        TeamMemberType.OWNER,
      ]);
      const adminType = await this.checkPermissionTeam(currentUserId, teamId, [
        TeamMemberType.ADMIN,
      ]);
      // get all members aren't joined
      if (ownerType) {
        members = userInfoMapped.filter((e) => {
          return ![...memberIds].includes(e.userId) && e.clubId === clubId;
        });
      }

      if (isAdmin || adminType) {
        members = userInfoMapped.filter((e) => {
          return (
            ![...memberIds, ...ownerIds].includes(e.userId) &&
            e.clubId === clubId
          );
        });
      }

      return {
        data: members,
        count: members.length,
      };
    }
  }

  async getTeamById(currentUserId: string, teamId: string) {
    const teamRef = await db.collection('teams').doc(teamId).get();

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.mappingTeamInfo(currentUserId, teamId);
  }
  async getTeamForBio(currentUserId: string, teamId: string) {
    const teamRef = await db.collection('teams').doc(teamId).get();

    if (!teamRef.exists) {
      return null;
    }

    return this.mappingTeamInfo(currentUserId, teamId);
  }

  async getListTeams(
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
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.CLUBS}_raw_latest\` AS ${BigQueryTable.CLUBS}
      ON
        json_value(${BigQueryTable.TEAMS}.data, '$.clubId') = ${BigQueryTable.CLUBS}.document_id
      OR
        TRIM(SPLIT(json_value(${BigQueryTable.TEAMS}.DATA, '$.clubRef'), '/')[OFFSET(1)]) = ${BigQueryTable.CLUBS}.document_id
      `);
    }

    if (search) {
      conditions.push(
        `\n LOWER(json_value(${
          BigQueryTable.TEAMS
        }.DATA, '$.teamName')) like '%${search.trim().toLowerCase()}%'
         \n OR LOWER(json_value(${
           BigQueryTable.CLUBS
         }.DATA, '$.clubName')) like '%${search.trim().toLowerCase()}%'`,
      );
    }

    if (country) {
      conditions.push(`
        json_value(${BigQueryTable.CLUBS}.DATA, '$.country') = '${country}'
      `);
    }

    if (clubId) {
      conditions.push(` \n
        json_value(${BigQueryTable.TEAMS}.DATA, '$.clubId') = '${clubId}'`);
    }

    conditions.push(` \n json_value(teams.DATA, '$.teamName') IS NOT NULL`);

    const { rows, count } = await this.teamsBigQueryService.getListTeams(
      currentUserId,
      getListContactQuery,
      joinTable,
      conditions,
    );

    const mappingTeamInfo = rows.map(async ({ teamId }) => {
      const result = await this.mappingTeamInfo(currentUserId, teamId);
      return result;
    });

    const data = await Promise.all(mappingTeamInfo);
    return commonPagination(
      getListContactQuery,
      data.filter((e) => e),
      count,
    );
  }

  async getTeamMemberById(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const { tab } = getTeamByIdQuery;
    if (tab === TeamTab.MEMBER) {
      // const dataCached = (await this.cacheManagerService.get(
      //   teamId + CACHE_KEYS.GET_TEAM_MEMBER,
      // )) as string;
      // if (dataCached) {
      //   return JSON.parse(dataCached as string) as Array<any>;
      // }
      // getTeamByIdQuery = {
      //   ...getTeamByIdQuery,
      //   limit: 30,
      // };
      // const { data, count } = await this.teamsBigQueryService.getListMembers(
      //   currentUserId,
      //   teamId,
      //   getTeamByIdQuery,
      // );
      // const result = commonPagination(getTeamByIdQuery, data, count);
      // this.cacheManagerService.set(
      //   teamId + CACHE_KEYS.GET_TEAM_MEMBER,
      //   JSON.stringify(result),
      //   { ttl: 5000 },
      // );
      // return commonPagination(getTeamByIdQuery, data, count);
    }

    const { data, count } = await this.teamsBigQueryService.getListMembers(
      currentUserId,
      teamId,
      getTeamByIdQuery,
    );

    return commonPagination(getTeamByIdQuery, data, count);
  }

  async getOwner(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const data = [];
    const owners = [];
    const { limit, sorted, startAfter } = getTeamByIdQuery;

    let userTeamRef = db
      .collection('users_teams')
      .orderBy('updatedAt', sorted)
      .where('teamId', '==', teamId)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .where('memberType', '==', TeamMemberType.OWNER);

    const countOwners = await userTeamRef.get();

    if (!startAfter) {
      userTeamRef = userTeamRef.limit(+limit);
    }

    if (startAfter) {
      userTeamRef = userTeamRef.startAfter(+startAfter).limit(+limit);
    }

    const querySnapshot = await userTeamRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const mappingUserInfo = data.map(async (e) => {
      const userData = await mappingUserInfoById(e.userId, currentUserId, true);

      owners.push({
        ...userData,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? owners.sort((a, b) => a.updatedAt - b.updatedAt)
      : owners.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: owners, count: countOwners.size };
  }

  async getListMembers(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const data = [];
    const members = [];
    const { limit, sorted, startAfter } = getTeamByIdQuery;

    let userTeamRef = db
      .collection('users_teams')
      .orderBy('updatedAt', sorted)
      .where('teamId', '==', teamId)
      .where('status', '==', JoinTeamStatus.ACCEPTED);

    const countMember = await userTeamRef.get();

    if (!startAfter) {
      userTeamRef = userTeamRef.limit(+limit);
    }

    if (startAfter) {
      userTeamRef = userTeamRef.startAfter(+startAfter).limit(+limit);
    }

    const querySnapshot = await userTeamRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const mappingUserInfo = data.map(async (e) => {
      const userData = await mappingUserInfoById(e.userId, currentUserId, true);

      members.push({
        ...userData,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? members.sort((a, b) => a.updatedAt - b.updatedAt)
      : members.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: members, count: countMember.size };
  }

  async getListMemberRequests(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const data = [];
    const members = [];
    const { limit, sorted, startAfter } = getTeamByIdQuery;

    let userTeamRef = db
      .collection('users_teams')
      .orderBy('updatedAt', sorted)
      .where('teamId', '==', teamId)
      .where('status', '==', JoinTeamStatus.PENDING);

    const count = await userTeamRef.get();

    if (!startAfter) {
      userTeamRef = userTeamRef.limit(+limit);
    }

    if (startAfter) {
      userTeamRef = userTeamRef.startAfter(+startAfter).limit(+limit);
    }

    const querySnapshot = await userTeamRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const mappingUserInfo = data.map(async (e) => {
      const userData = await mappingUserInfoById(e.userId, currentUserId, true);

      members.push({
        ...userData,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? members.sort((a, b) => a.updatedAt - b.updatedAt)
      : members.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: members, count: count.size };
  }

  async getListBlockedMembers(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const { limit, sorted, startAfter } = getTeamByIdQuery;
    const data = [];
    const blockedMembers = [];
    let blackListsRef = db
      .collection('blacklists')
      .orderBy('createdAt', sorted)
      .where('teamId', '==', teamId)
      .where('type', '==', BlockTeamType.BLOCK_MEMBER)
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

      blockedMembers.push({
        ...userData,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? blockedMembers.sort((a, b) => a.updatedAt - b.updatedAt)
      : blockedMembers.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: blockedMembers, count: countBlackListRef.size };
  }

  async getListAdmins(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const data = [];
    const members = [];
    const { limit, sorted, startAfter } = getTeamByIdQuery;

    let userTeamRef = db
      .collection('users_teams')
      .orderBy('updatedAt', sorted)
      .where('teamId', '==', teamId)
      .where('status', '==', JoinTeamStatus.ACCEPTED)
      .where('memberType', 'in', [TeamMemberType.OWNER, TeamMemberType.ADMIN]);

    const countMember = await userTeamRef.get();

    if (!startAfter) {
      userTeamRef = userTeamRef.limit(+limit);
    }

    if (startAfter) {
      userTeamRef = userTeamRef.startAfter(+startAfter).limit(+limit);
    }

    const querySnapshot = await userTeamRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const mappingUserInfo = data.map(async (e) => {
      const userData = await mappingUserInfoById(e.userId, currentUserId, true);

      members.push({
        ...userData,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    });

    await Promise.all(mappingUserInfo);

    sorted === SortBy.ASC
      ? members.sort((a, b) => a.updatedAt - b.updatedAt)
      : members.sort((a, b) => b.updatedAt - a.updatedAt);

    return { data: members, count: countMember.size };
  }

  async createTeamWhenSignUp(
    ip: string,
    createTeamSignUpDto: CreateTeamSignUpDto,
  ) {
    const { clubId, roleId, teamName, teamImage } = createTeamSignUpDto;

    const teamRef = await db
      .collection('teams')
      .where('teamName', '==', teamName)
      .get();

    if (!teamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.EXISTED,
        HttpStatus.CONFLICT,
      );
    }

    const newTeam = await db.collection('teams').add({
      ...createTeamSignUpDto,
      teamImage: teamImage ? teamImage : process.env.DEFAULT_TEAM_COVER_IMAGE,
      clubRef: db.doc(`/clubs/${clubId}`),
      clubId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      ipAddress: ip,
      isVerified: false,
      isApproved: false,
      createdBy: roleId,
    });

    const createOwner = db.collection('users_teams').add({
      teamId: newTeam.id,
      userId: roleId,
      status: JoinTeamStatus.ACCEPTED,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      memberType: TeamMemberType.OWNER,
    });

    const convertTeamName = convertTeamNameAsArray(newTeam.id);

    await Promise.all([
      createOwner,
      convertTeamName,
      this.setAdminSystemIsOwnerTeam(newTeam.id),
    ]);

    return {
      teamId: newTeam.id,
      teamName: createTeamSignUpDto.teamName,
      createdBy: roleId,
    };
  }

  async createTeam(
    ip: string,
    userId: string,
    clubId: string,
    createTeamDto: CreateTeamDto,
    isAdmin: boolean,
  ) {
    const { memberIds, ...rest } = createTeamDto;

    if (memberIds.includes(userId)) {
      throw new HttpException(`Can't add yourself`, HttpStatus.BAD_REQUEST);
    }

    const ownerInfo = await mappingUserInfoById(userId);

    const teamRef = await db
      .collection('teams')
      .where('clubId', '==', clubId)
      .where('teamName', '==', rest.teamName)
      .get();

    if (!teamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.EXISTED,
        HttpStatus.CONFLICT,
      );
    }

    if (ownerInfo.clubId !== clubId && !isAdmin) {
      throw new HttpException(
        `Can't create team at other club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      ownerInfo.type == UserTypes.PLAYER &&
      ownerInfo?.teamIds.length > 5 &&
      !isAdmin
    ) {
      throw new HttpException(
        `Can't create team while already joined in 5 teams`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const clubRef = db.doc(`/clubs/${clubId}`);

    const newTeam = await db.collection('teams').add({
      ...rest,
      teamImage: rest?.teamImage
        ? rest?.teamImage
        : process.env.DEFAULT_TEAM_COVER_IMAGE,
      clubRef,
      clubId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      ipAddress: ip,
      isVerified: false,
      isApproved: false,
      createdBy: userId,
    });

    if (memberIds.length) {
      const addingMember = memberIds.map(async (memId) => {
        const userTeamRef = await db
          .collection('users_teams')
          .where('teamId', '==', newTeam.id)
          .where('userId', '==', memId)
          .get();

        const userRef = await db.collection('users').doc(memId).get();

        if (!userRef.data()?.account?.isActive) {
          throw new HttpException(
            ResponseMessage.User.NOT_FOUND,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (!userTeamRef.empty) {
          throw new HttpException(
            ResponseMessage.Team.ALREADY_IN,
            HttpStatus.BAD_REQUEST,
          );
        }

        await db.collection('users_teams').add({
          teamId: newTeam.id,
          userId: memId,
          status: JoinTeamStatus.ACCEPTED,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
          memberType: TeamMemberType.MEMBER,
        });

        const memberInfo = await mappingUserInfoById(memId);

        const payload = new CreateNotificationDto();
        payload.token = memberInfo.fcmToken;
        payload.notificationType = NotificationType.INVITE_MEMBER_TEAM;
        payload.receiverId = memId;
        payload.senderId = ownerInfo.userId as string;
        payload.title = `#${
          ownerInfo.username
        } added you to be a ${TeamMemberType.MEMBER.toLowerCase()} of ${
          rest.teamName
        } team`;
        payload.largeIcon = ownerInfo.faceImage;
        payload.username = ownerInfo.username;
        payload.userType = ownerInfo.type;
        payload.others = {
          teamId: newTeam.id,
          memberType: TeamMemberType.MEMBER,
        };

        await Promise.all([
          this.updateTeamIdsInfo(memId),
          this.notificationsService.sendMulticastNotification(payload),
        ]);
      });

      await Promise.all(addingMember);
    }

    const createOwner = db.collection('users_teams').add({
      teamId: newTeam.id,
      userId: userId,
      status: JoinTeamStatus.ACCEPTED,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      memberType: TeamMemberType.OWNER,
    });

    const convertTeamName = convertTeamNameAsArray(newTeam.id);

    await Promise.all([
      createOwner,
      convertTeamName,
      this.setAdminSystemIsOwnerTeam(newTeam.id),
    ]);

    const teamInfo = await this.mappingTeamInfo(userId, newTeam.id);

    return {
      teamId: newTeam.id,
      teamInfo,
      teamName: createTeamDto.teamName,
      createdBy: userId,
      memberIds: [...memberIds, userId],
    };
  }

  async updateTeam(
    currentUserId: string,
    teamId: string,
    updateTeamDto: UpdateTeamDto,
    isAdmin: boolean,
  ) {
    const { memberIds, ...rest } = updateTeamDto;
    const teamRef = await db.collection('teams').doc(teamId).get();

    const checkPermission = await this.checkPermissionTeam(
      currentUserId,
      teamId,
      [TeamMemberType.ADMIN, TeamMemberType.OWNER],
    );

    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException("Can't update this team");
    }

    if (rest.teamName !== teamRef.data()?.teamName) {
      const teamRef = await db
        .collection('teams')
        .where('teamName', '==', rest.teamImage)
        .get();

      if (!teamRef.empty) {
        throw new HttpException(
          ResponseMessage.Team.EXISTED,
          HttpStatus.CONFLICT,
        );
      }
    }

    await teamRef.ref.set(
      {
        ...rest,
        autoAccepted: false,
        updatedAt: +moment.utc().format('x'),
      },
      { merge: true },
    );

    rest.teamName && (await convertTeamNameAsArray(teamId));

    if (memberIds?.length) {
      await this.updateMemberType(currentUserId, teamId, updateTeamDto);
    }

    await Promise.all([
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
      this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
    ]);

    return ResponseMessage.Team.UPDATED;
  }

  async updateMember(
    currentUserId: string,
    teamId: string,
    updateMemberDto: UpdateMemberDto,
    isAdmin: boolean,
  ) {
    const { memberType, memberIds } = updateMemberDto;

    const checkPermission = await this.checkPermissionTeam(
      currentUserId,
      teamId,
      [TeamMemberType.ADMIN, TeamMemberType.OWNER],
    );

    if (!checkPermission && !isAdmin) {
      throw new ForbiddenException(
        "You don't have permission to update this team.",
      );
    }

    if (memberType === TeamMemberType.OWNER) {
      await this.updateOwnerType(currentUserId, teamId, updateMemberDto);
    }
    if (memberType === TeamMemberType.MEMBER) {
      await this.updateMemberType(currentUserId, teamId, updateMemberDto);
    }

    if (memberType === TeamMemberType.ADMIN) {
      await this.updateAdminType(currentUserId, teamId, updateMemberDto);
    }

    if (memberIds.length) {
      const updateTeamIdsInfo = memberIds.map(async (memberId) => {
        return this.updateTeamIdsInfo(memberId);
      });

      Promise.all(updateTeamIdsInfo);
    }

    await Promise.all([
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
      this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
    ]);
  }

  async updateOwnerType(
    currentUserId: string,
    teamId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    let title: string;
    const { memberIds } = updateMemberDto;

    const [teamRef, adminInfo] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      mappingUserInfoById(currentUserId),
      this.checkPermissionTeam(currentUserId, teamId, [TeamMemberType.OWNER]),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { username, faceImage, type } = adminInfo;

    if (memberIds.length) {
      const updateOwners = memberIds.map(async (memberId) => {
        const userTeamRef = await db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', memberId)
          .get();

        if (userTeamRef.empty) {
          await db.collection('users_teams').add({
            teamId,
            userId: memberId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            status: JoinTeamStatus.ACCEPTED,
            memberType: TeamMemberType.OWNER,
          });

          title = `#${username} added you to be an ${TeamMemberType.OWNER.toLowerCase()} of ${
            teamRef.data()?.teamName
          } team`;
        } else {
          userTeamRef.docs.map((doc) => {
            doc.ref.set(
              {
                memberType: TeamMemberType.OWNER,
                status: JoinTeamStatus.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );
          });

          title = `#${username} upgraded you to be an ${TeamMemberType.OWNER.toLowerCase()} of ${
            teamRef.data()?.teamName
          } team`;
        }

        const { fcmToken } = await mappingUserInfoById(memberId);

        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.notificationType = NotificationType.UPGRADE_TEAM_MEMBER_TYPE;
        payload.receiverId = memberId;
        payload.senderId = currentUserId;
        payload.title = title;
        payload.largeIcon = faceImage;
        payload.username = username;
        payload.userType = type;
        payload.others = {
          teamId,
          memberType: TeamMemberType.OWNER,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });
      await Promise.all(updateOwners);
    }
  }

  async updateMemberType(
    currentUserId: string,
    teamId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    let title: string;
    let notificationType: NotificationType;

    const { memberIds } = updateMemberDto;

    const [teamRef, adminInfo] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      mappingUserInfoById(currentUserId),
      this.checkPermissionTeam(currentUserId, teamId, [
        TeamMemberType.ADMIN,
        TeamMemberType.OWNER,
      ]),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { username, faceImage, type } = adminInfo;

    if (memberIds.length) {
      const updateMembers = memberIds.map(async (memberId) => {
        const userTeamRef = await db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', memberId)
          .get();

        if (userTeamRef.empty) {
          await db.collection('users_teams').add({
            teamId,
            userId: memberId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            status: JoinTeamStatus.ACCEPTED,
            memberType: TeamMemberType.MEMBER,
          });

          title = `#${username} added you to be a ${TeamMemberType.MEMBER.toLowerCase()} of ${
            teamRef.data()?.teamName
          } team`;

          notificationType = NotificationType.INVITE_MEMBER_TEAM;
        } else {
          userTeamRef.docs.map((doc) => {
            doc.ref.set(
              {
                memberType: TeamMemberType.MEMBER,
                status: JoinTeamStatus.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );
          });

          title = `#${username} are now downgraded to a ${TeamMemberType.MEMBER.toLowerCase()}`;

          notificationType = NotificationType.DOWNGRADE_TEAM_MEMBER_TYPE;
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
          teamId,
          memberType: TeamMemberType.MEMBER,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(updateMembers);
    }
  }

  async updateAdminType(
    currentUserId: string,
    teamId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    let title: string;
    let notificationType: NotificationType;

    const { memberIds } = updateMemberDto;

    const [teamRef, adminInfo] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      mappingUserInfoById(currentUserId),
      this.checkPermissionTeam(currentUserId, teamId, [
        TeamMemberType.ADMIN,
        TeamMemberType.OWNER,
      ]),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const { username, faceImage, type } = adminInfo;

    if (memberIds.length) {
      const updateAdmins = memberIds.map(async (memberId) => {
        const userTeamRef = await db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', memberId)
          .get();

        if (userTeamRef.empty) {
          await db.collection('users_teams').add({
            teamId,
            userId: memberId,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            status: JoinTeamStatus.ACCEPTED,
            memberType: TeamMemberType.ADMIN,
          });

          title = `#${username} added you to be an ${TeamMemberType.ADMIN.toLowerCase()} of ${
            teamRef.data()?.teamName
          } team`;

          notificationType = NotificationType.INVITE_MEMBER_TEAM;
        } else {
          userTeamRef.docs.map((doc) => {
            const { memberType } = doc.data();

            doc.ref.set(
              {
                memberType: TeamMemberType.ADMIN,
                status: JoinTeamStatus.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );

            if (memberType === TeamMemberType.OWNER) {
              title = `#${username} are now downgraded to an ${TeamMemberType.ADMIN.toLowerCase()}`;

              notificationType = NotificationType.DOWNGRADE_TEAM_MEMBER_TYPE;
            }

            if (memberType === TeamMemberType.MEMBER) {
              title = `#${username} upgraded you to be an ${TeamMemberType.ADMIN.toLowerCase()} of ${
                teamRef.data()?.teamName
              } team`;

              notificationType = NotificationType.UPGRADE_TEAM_MEMBER_TYPE;
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
        payload.userType = type as UserTypes;
        payload.others = {
          teamId,
          memberType: TeamMemberType.ADMIN,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(updateAdmins);
    }
    return true;
  }

  async sendRequestJoinTeam(userId: string, teamId: string) {
    const [{ clubId, teamIds, type }, teamRef, userTeamRef, adminsTeamRef] =
      await Promise.all([
        mappingUserInfoById(userId),
        db.collection('teams').doc(teamId).get(),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', userId)
          .get(),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('status', '==', JoinTeamStatus.ACCEPTED)
          .where('memberType', '!=', TeamMemberType.MEMBER)
          .get(),
        this.isBlocked(userId, [teamId]),
      ]);

    if (clubId !== teamRef.data()?.clubId) {
      throw new HttpException(
        `Can't join team at other club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (type == UserTypes.PLAYER && teamIds.length > 5) {
      throw new HttpException(
        `Can't join more than 5 teams`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    userTeamRef.forEach((doc) => {
      const { status } = doc.data();

      if (status === JoinTeamStatus.ACCEPTED) {
        throw new HttpException(
          ResponseMessage.Team.ALREADY_IN,
          HttpStatus.BAD_REQUEST,
        );
      }
    });

    if (!userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.ALREADY_REQUEST,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db.collection('users_teams').add({
      teamId,
      userId,
      status: JoinTeamStatus.PENDING,
      memberType: TeamMemberType.MEMBER,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });

    const adminIds: string[] = [];
    adminsTeamRef.forEach((doc) => {
      const { userId } = doc.data();

      adminIds.push(userId);
    });

    if (adminIds.length) {
      const memberInfo = await mappingUserInfoById(userId);

      const sendNotifications = adminIds.map(async (adminId) => {
        const userInfo = await mappingUserInfoById(adminId);

        const memberType =
          memberInfo.type === UserTypes.COACH ? 'member' : 'player';

        const payload = new CreateNotificationDto();
        payload.token = userInfo?.fcmToken as string[];
        payload.notificationType = NotificationType.ASK_JOIN_TEAM;
        payload.receiverId = adminId;
        payload.senderId = userId;
        payload.title = `#${
          memberInfo.username as string
        } is a ${memberType} of your ${teamRef.data()?.teamName} team`;
        payload.largeIcon = memberInfo.faceImage as string;
        payload.username = memberInfo.username as string;
        payload.userType = memberInfo.type as UserTypes;
        payload.others = {
          teamId,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(sendNotifications);
    }

    return ResponseMessage.Team.SEND_REQUEST_JOIN_TEAM;
  }

  async changeStatusJoin(
    currentUserId: string,
    changeStatusJoinTeamDto: ChangeStatusJoinTeamDto,
    ChangeStatusJoinTeamQuery: ChangeStatusJoinTeamQuery,
  ) {
    let message: string;
    let notificationType: NotificationType;
    const { memberIds } = changeStatusJoinTeamDto;
    const { teamId, status } = ChangeStatusJoinTeamQuery;

    const currentUserInfo = await mappingUserInfoById(currentUserId);

    await this.checkPermissionTeam(currentUserId, teamId, [
      TeamMemberType.ADMIN,
      TeamMemberType.OWNER,
    ]);

    if (memberIds.length) {
      const changeStatusJoin = memberIds.map(async (memId) => {
        const userTeamRef = await db
          .collection('users_teams')
          .where('userId', '==', memId)
          .where('teamId', '==', teamId)
          .get();

        if (userTeamRef.empty) {
          throw new HttpException(
            ResponseMessage.Team.REQUEST_NOT_FOUND,
            HttpStatus.NOT_FOUND,
          );
        }

        const userTeamDocs = userTeamRef.docs;
        const changingStatus = userTeamDocs.map(async (doc) => {
          if (doc.data()?.status === JoinTeamStatus.PENDING) {
            if (status === JoinTeamStatus.ACCEPTED) {
              notificationType = NotificationType.ACCEPT_JOIN_TEAM;
              await doc.ref.set(
                {
                  status: JoinTeamStatus[status],
                  updatedAt: +moment.utc().format('x'),
                },
                { merge: true },
              );

              await this.updateTeamIdsInfo(memId);

              message = ResponseMessage.Team.ACCEPTED;
            }

            if (status === JoinTeamStatus.REJECTED) {
              notificationType = NotificationType.REJECT_JOIN_TEAM;
              doc.ref.delete();
              message = ResponseMessage.Team.REJECTED;
            }
          }
        });

        await Promise.all(changingStatus);

        if (notificationType) {
          const memberRef = await db.collection('users').doc(memId).get();

          const payload = new CreateNotificationDto();
          payload.notificationType = notificationType;
          payload.senderId = currentUserId;
          payload.receiverId = memId;
          payload.title = 'Zporter';
          payload.largeIcon = currentUserInfo.faceImage as string;
          payload.username = currentUserInfo.username as string;
          payload.userType = currentUserInfo.type as UserTypes;
          payload.token = memberRef.data()?.fcmToken as string[];
          payload.others = {
            teamId,
          };

          await this.notificationsService.sendMulticastNotification(payload);
        }
      });

      await Promise.all([
        changeStatusJoin,
        this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
        this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
      ]);

      return message;
    }
  }

  async blockTeam(currentUserId: string, teamId: string) {
    const [teamRef, userTeamRef, blacklistRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .get(),
      db
        .collection('blacklists')
        .where('userId', '==', currentUserId)
        .where('teamId', '==', teamId)
        .where('type', '==', BlockTeamType.BLOCK_TEAM)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!blacklistRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.ALREADY_BLOCKED,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!userTeamRef.empty) {
      const joinTeamStatus = userTeamRef.docs[0]?.data()?.status;

      // already in team -> leave team
      if (joinTeamStatus === JoinTeamStatus.ACCEPTED) {
        await this.leaveTeam(currentUserId, teamId);
      }

      // already send request join -> remove join request
      if (joinTeamStatus === JoinTeamStatus.PENDING) {
        userTeamRef.docs[0].ref.delete();
      }
    }

    const blockingTeam = db.collection('blacklists').add({
      userId: currentUserId,
      teamId,
      type: BlockTeamType.BLOCK_TEAM,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      isDeleted: false,
    });

    await Promise.all([
      blockingTeam,
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
    ]);
  }

  async unblockTeam(currentUserId: string, teamId: string) {
    const [teamRef, blacklistRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),

      db
        .collection('blacklists')
        .where('userId', '==', currentUserId)
        .where('teamId', '==', teamId)
        .where('type', '==', BlockTeamType.BLOCK_TEAM)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
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

    return ResponseMessage.Team.UNBLOCKED;
  }

  async blockMember(
    currentUserId: string,
    blockMemberTeamDto: BlockMemberTeamDto,
  ) {
    const { teamId, memberId } = blockMemberTeamDto;

    const [
      currentUserInfo,
      teamRef,
      userTeamRef,
      blacklistRef,
      memberInfo,
      getCurrentMemberType,
    ] = await Promise.all([
      mappingUserInfoById(currentUserId),
      db.collection('teams').doc(teamId).get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', memberId)
        .get(),
      db
        .collection('blacklists')
        .where('userId', '==', memberId)
        .where('teamId', '==', teamId)
        .where('type', '==', BlockTeamType.BLOCK_MEMBER)
        .get(),
      mappingUserInfoById(memberId),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.MEMBER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.checkPermissionTeam(currentUserId, teamId, [
      TeamMemberType.ADMIN,
      TeamMemberType.OWNER,
    ]);

    if (!blacklistRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.ALREADY_BLOCKED,
        HttpStatus.BAD_REQUEST,
      );
    }

    let oldMemberType: TeamMemberType;

    const currentMemberType = getCurrentMemberType.docs[0]?.data()?.memberType;

    const userTeamDocs = userTeamRef.docs;

    const removeMember = userTeamDocs.map(async (doc) => {
      const { memberType } = doc.data();

      oldMemberType = memberType as TeamMemberType;

      if (
        memberType === TeamMemberType.OWNER &&
        currentMemberType !== TeamMemberType.OWNER
      ) {
        throw new HttpException(
          'Can not block the owner of the team',
          HttpStatus.BAD_REQUEST,
        );
      }

      await doc.ref.delete();
    });

    const blockMember = db.collection('blacklists').add({
      userId: memberId,
      teamId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      type: BlockTeamType.BLOCK_MEMBER,
      isDeleted: false,
    });

    const payload = new CreateNotificationDto();
    payload.token = memberInfo.fcmToken as string[];
    payload.largeIcon = currentUserInfo.faceImage as string;
    payload.username = currentUserInfo.username as string;
    payload.title = 'Zporter';
    payload.notificationType = NotificationType.BLOCK_MEMBER_TEAM;
    payload.senderId = currentUserId;
    payload.receiverId = memberInfo.userId as string;
    payload.userType = currentUserInfo.type as UserTypes;
    payload.content = teamRef.data()?.teamName;
    payload.others = {
      teamId,
      nextNotificationType: NotificationType.MEMBER_CONFIRM_BLOCK_MEMBER_TEAM,
      oldMemberType,
      memberConfirm: MemberConfirm.MEMBER,
    };

    await Promise.all([
      removeMember,
      blockMember,
      this.notificationsService.sendMulticastNotification(payload),
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
      this.updateTeamIdsInfo(memberId),
      this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
    ]);

    return ResponseMessage.Team.BLOCKED;
  }

  async unblockMember(
    currentUserId: string,
    unblockMembersTeamDto: UnblockMembersTeamDto,
  ) {
    const { teamId, memberIds } = unblockMembersTeamDto;

    if (memberIds.length) {
      const unblockMembers = memberIds.map(async (memId) => {
        const [teamRef, userTeamRef, blacklistRef] = await Promise.all([
          db.collection('teams').doc(teamId).get(),
          db
            .collection('users_teams')
            .where('teamId', '==', teamId)
            .where('userId', '==', memId)
            .get(),
          db
            .collection('blacklists')
            .where('userId', '==', memId)
            .where('teamId', '==', teamId)
            .where('type', '==', BlockTeamType.BLOCK_MEMBER)
            .get(),
        ]);

        if (!teamRef.exists) {
          throw new HttpException(
            ResponseMessage.Team.NOT_FOUND,
            HttpStatus.NOT_FOUND,
          );
        }

        await this.checkPermissionTeam(currentUserId, teamId, [
          TeamMemberType.ADMIN,
          TeamMemberType.OWNER,
        ]);

        if (!userTeamRef.empty) {
          throw new HttpException(
            ResponseMessage.Team.MEMBER_NOT_FOUND,
            HttpStatus.NOT_FOUND,
          );
        }

        if (blacklistRef.empty) {
          throw new HttpException(
            ResponseMessage.Team.NOT_BLOCKED,
            HttpStatus.BAD_REQUEST,
          );
        }

        blacklistRef.forEach((doc) => {
          doc.ref.delete();
        });
      });

      await Promise.all(unblockMembers);

      return ResponseMessage.Team.UNBLOCKED;
    }
  }

  async deleteMember(currentUserId: string, teamId: string, memberId: string) {
    const [
      currentUserInfo,
      teamRef,
      userTeamRef,
      memberInfo,
      getCurrentMemberType,
    ] = await Promise.all([
      mappingUserInfoById(currentUserId),
      db.collection('teams').doc(teamId).get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', memberId)
        .get(),
      mappingUserInfoById(memberId),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.checkPermissionTeam(currentUserId, teamId, [
      TeamMemberType.ADMIN,
      TeamMemberType.OWNER,
    ]);

    let oldMemberType: TeamMemberType;

    const currentMemberType = getCurrentMemberType.docs[0]?.data()?.memberType;

    const userTeamDocs = userTeamRef.docs;

    const removeMember = userTeamDocs.map(async (doc) => {
      const { memberType } = doc.data();

      oldMemberType = memberType as TeamMemberType;
      if (
        memberType === TeamMemberType.OWNER &&
        currentMemberType !== TeamMemberType.OWNER
      ) {
        throw new HttpException(
          'Can not delete the owner of the team',
          HttpStatus.BAD_REQUEST,
        );
      }

      await doc.ref.delete();
    });

    await Promise.all(removeMember);

    const payload = new CreateNotificationDto();
    payload.token = memberInfo.fcmToken as string[];
    payload.largeIcon = currentUserInfo.faceImage as string;
    payload.username = currentUserInfo.username as string;
    payload.title = 'Zporter';
    payload.notificationType = NotificationType.DELETE_MEMBER_TEAM;
    payload.senderId = currentUserId;
    payload.receiverId = memberInfo.userId as string;
    payload.userType = currentUserInfo.type as UserTypes;
    payload.content = teamRef.data()?.teamName;
    payload.others = {
      teamId,
      oldMemberType,
      nextNotificationType: NotificationType.MEMBER_CONFIRM_DELETE_MEMBER_TEAM,
      memberConfirm: MemberConfirm.MEMBER,
    };

    await Promise.all([
      this.notificationsService.sendMulticastNotification(payload),
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
      this.updateTeamIdsInfo(memberId),
      this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
    ]);

    return ResponseMessage.Team.DELETE_MEMBER;
  }

  async deleteTeam(currentUserId: string, teamId: string) {
    const [teamRef, userTeamRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      db.collection('users_teams').where('teamId', '==', teamId).get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.checkPermissionTeam(currentUserId, teamId, [
      TeamMemberType.OWNER,
    ]);

    teamRef.ref.delete();

    if (userTeamRef.size) {
      userTeamRef.forEach((doc) => {
        doc.ref.delete();
      });
    }

    await this.teamsFirebaseService.removeTeamSnapshot(teamId);

    return ResponseMessage.Team.DELETE_TEAM;
  }

  async deleteJoinRequest(
    currentUserId: string,
    teamId: string,
    memberId: string,
  ) {
    const [teamRef, userTeamRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', memberId)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.REQUEST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.checkPermissionTeam(currentUserId, teamId, [
      TeamMemberType.ADMIN,
      TeamMemberType.OWNER,
    ]);

    userTeamRef.forEach((doc) => {
      const { status } = doc.data();

      if (status !== JoinTeamStatus.PENDING) {
        throw new HttpException(
          ResponseMessage.Team.REQUEST_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      doc.ref.delete();
    });

    return ResponseMessage.Team.DELETE_REQUEST;
  }

  async cancelRequestJoinTeam(currentUserId: string, teamId: string) {
    const [teamRef, userTeamRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinTeamStatus.PENDING)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.REQUEST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    userTeamRef.docs[0].ref.delete();

    return ResponseMessage.Team.CANCEL_REQUEST_JOIN_TEAM;
  }

  async deleteBlockRequest(
    currentUserId: string,
    teamId: string,
    memberId: string,
  ) {
    const [teamRef, blacklistRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      db
        .collection('blacklists')
        .where('teamId', '==', teamId)
        .where('userId', '==', memberId)
        .where('type', '==', BlockTeamType.BLOCK_MEMBER)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (blacklistRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.NOT_BLOCKED,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.checkPermissionTeam(currentUserId, teamId, [
      TeamMemberType.ADMIN,
      TeamMemberType.OWNER,
    ]);

    blacklistRef.forEach((doc) => {
      doc.ref.set({ isDeleted: true }, { merge: true });
    });

    return ResponseMessage.Team.DELETE_REQUEST;
  }

  async confirmDeleteOrBlockFromTeam(
    currentUserId: string,
    confirmBlockOrDeleteFromTeamQuery: ConfirmBlockOrDeleteFromTeamQuery,
  ) {
    const { memberConfirm } = confirmBlockOrDeleteFromTeamQuery;

    if (memberConfirm === MemberConfirm.ADMIN) {
      return this.adminConfirmDeleteOrBlockFromTeam(
        currentUserId,
        confirmBlockOrDeleteFromTeamQuery,
      );
    }

    return this.memberConfirmDeleteOrBlockFromTeam(
      currentUserId,
      confirmBlockOrDeleteFromTeamQuery,
    );
  }

  async memberConfirmDeleteOrBlockFromTeam(
    currentUserId: string,
    confirmBlockOrDeleteFromTeamQuery: ConfirmBlockOrDeleteFromTeamQuery,
  ) {
    const { teamId, confirmType, oldMemberType } =
      confirmBlockOrDeleteFromTeamQuery;

    const [teamRef, currentUserInfo, userTeamRef, userTeamRefs] =
      await Promise.all([
        db.collection('teams').doc(teamId).get(),
        mappingUserInfoById(currentUserId),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', currentUserId)
          .get(),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('memberType', '!=', TeamMemberType.MEMBER)
          .get(),
      ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.ALREADY_IN,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (confirmType === NotificationType.MEMBER_CONFIRM_BLOCK_MEMBER_TEAM) {
      const blacklistRef = await db
        .collection('blacklists')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .where('type', '==', BlockTeamType.BLOCK_MEMBER)
        .where('isDeleted', '==', false)
        .get();

      if (blacklistRef.empty) {
        throw new HttpException(
          ResponseMessage.Club.BLOCKED_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // ids of owner, admin of team
    const userIds: string[] = [];

    userTeamRefs.forEach((doc) => {
      const { userId } = doc.data();

      userIds.push(userId);
    });

    if (userIds.length) {
      const sendNotification = userIds.map(async (userId: string) => {
        const userInfo = await mappingUserInfoById(userId);

        const payload = new CreateNotificationDto();
        payload.token = userInfo.fcmToken as string[];
        payload.largeIcon = currentUserInfo.faceImage as string;
        payload.username = currentUserInfo.username as string;
        payload.title = 'Zporter';
        payload.notificationType = NotificationType[confirmType];
        payload.senderId = currentUserId;
        payload.receiverId = userId;
        payload.userType = currentUserInfo.type as UserTypes;
        payload.content = teamRef.data()?.teamName as string;
        payload.others = {
          teamId,
          oldMemberType,
          nextNotificationType:
            confirmType === NotificationType.MEMBER_CONFIRM_BLOCK_MEMBER_TEAM
              ? NotificationType.ADMIN_CONFIRM_BLOCK_MEMBER_TEAM
              : NotificationType.ADMIN_CONFIRM_DELETE_MEMBER_TEAM,
          memberConfirm: TeamContactTab.ADMIN,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      });

      await Promise.all(sendNotification);
    }

    return ResponseMessage.Club.CONFIRM_MISTAKE;
  }

  async adminConfirmDeleteOrBlockFromTeam(
    currentUserId: string,
    confirmBlockOrDeleteFromTeamQuery: ConfirmBlockOrDeleteFromTeamQuery,
  ) {
    const { teamId, confirmType, memberId, oldMemberType } =
      confirmBlockOrDeleteFromTeamQuery;

    const [teamRef, currentUserInfo, memberInfo, userTeamRef] =
      await Promise.all([
        db.collection('teams').doc(teamId).get(),
        mappingUserInfoById(currentUserId),
        mappingUserInfoById(memberId),
        db
          .collection('users_teams')
          .where('teamId', '==', teamId)
          .where('userId', '==', memberId)
          .get(),
      ]);

    if (!userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Club.ALREADY_IN_TEAM,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (confirmType === NotificationType.ADMIN_CONFIRM_BLOCK_MEMBER_TEAM) {
      const blacklistRef = await db
        .collection('blacklists')
        .where('teamId', '==', teamId)
        .where('userId', '==', memberId)
        .where('type', '==', BlockTeamType.BLOCK_MEMBER)
        .get();

      if (blacklistRef.empty) {
        throw new HttpException(
          'Member has not been blocked from this team',
          HttpStatus.BAD_REQUEST,
        );
      }

      blacklistRef.forEach((doc) => {
        doc.ref.delete();
      });
    }

    await db.collection('users_teams').add({
      teamId,
      userId: memberId,
      memberType: oldMemberType as TeamMemberType,
      status: JoinTeamStatus.ACCEPTED,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });

    const payload = new CreateNotificationDto();
    payload.token = memberInfo.fcmToken as string[];
    payload.largeIcon = currentUserInfo.faceImage as string;
    payload.username = currentUserInfo.username as string;
    payload.title = 'Zporter';
    payload.notificationType = NotificationType[confirmType];
    payload.senderId = currentUserId;
    payload.receiverId = memberInfo.userId;
    payload.userType = currentUserInfo.type as UserTypes;
    payload.content = teamRef.data()?.teamName as string;
    payload.others = {
      teamId,
      memberConfirm: TeamContactTab.ADMIN,
    };

    await Promise.all([
      this.notificationsService.sendMulticastNotification(payload),
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
      this.updateTeamIdsInfo(memberId),
      this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
    ]);

    return ResponseMessage.Club.ADD_MEMBER_TEAM;
  }

  async findTeamsInAClub(clubId: string) {
    const clubRef = db.collection('clubs').doc(clubId);

    const [clubDoc, teamRefs] = await Promise.all([
      clubRef.get(),
      db.collection('teams').where('clubRef', '==', clubRef).get(),
    ]);

    if (!clubDoc.exists) {
      await deleteNotFoundDocumentIndex({
        indexName: 'clubs',
        documentId: clubId,
      });
      throw new HttpException('Invalid Club ID', HttpStatus.NOT_FOUND);
    }

    const data = [];
    teamRefs.forEach((doc) => {
      data.push({ teamId: doc.id, ...doc.data() });
    });

    return data;
  }

  async leaveTeam(currentUserId: string, teamId: string) {
    const memberIds: string[] = [];
    const [teamRef, userTeamRef, ownerTeamRef] = await Promise.all([
      db.collection('teams').doc(teamId).get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('userId', '==', currentUserId)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get(),
      db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('memberType', '==', TeamMemberType.OWNER)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get(),
    ]);

    if (!teamRef.exists) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userTeamRef.empty) {
      throw new HttpException(
        ResponseMessage.Team.MEMBER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userTeamDocs = userTeamRef.docs;

    const leavingTeam = userTeamDocs.map(async (doc) => {
      const userTeamRef = await db
        .collection('users_teams')
        .where('teamId', '==', teamId)
        .where('status', '==', JoinTeamStatus.ACCEPTED)
        .get();

      const { memberType } = doc.data();

      if (memberType === TeamMemberType.OWNER) {
        if (userTeamRef.size === 1) {
          return this.deleteTeam(currentUserId, teamId);
        }

        if (ownerTeamRef.size === 1) {
          const admins = userTeamRef.docs.filter(
            (doc) => doc.data()?.memberType === TeamMemberType.ADMIN,
          );

          const members = userTeamRef.docs.filter(
            (doc) => doc.data()?.memberType === TeamMemberType.MEMBER,
          );

          if (admins[0]?.exists) {
            admins[0].ref.set(
              { memberType: TeamMemberType.OWNER },
              { merge: true },
            );

            memberIds.push(admins[0].data()?.userId);
          } else {
            members[0].ref.set(
              { memberType: TeamMemberType.OWNER },
              { merge: true },
            );

            memberIds.push(members[0].data()?.userId);
          }
        }

        await Promise.all([
          doc.ref.delete(),
          this.updateMember(
            currentUserId,
            teamId,
            {
              memberIds,
              memberType: TeamMemberType.OWNER,
            },
            true,
          ),
        ]);
      } else {
        await doc.ref.delete();
      }
    });

    Promise.all([
      leavingTeam,
      this.teamsFirebaseService.synchronizeTeamMemberIds(teamId),
      this.updateTeamIdsInfo(currentUserId),
      this.cacheManagerService.clear(teamId + CACHE_KEYS.GET_TEAM_MEMBER),
    ]);

    return ResponseMessage.Team.LEAVE_TEAM;
  }

  async getAllUserIds(): Promise<string[]> {
    const query = `SELECT DISTINCT json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') as userId
    FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}`;

    const options: Query = { query, location: process.env.REGION };
    const userIds = [];

    const querying = bq.createQueryJob(options);
    const [job] = await querying;
    const [rows] = await job.getQueryResults();

    rows.forEach((row) => userIds.push(row.userId));

    return userIds;
  }

  async checkUserTeams(userIds: string[]) {
    const excludeIds = process.env.EXCLUDE_USER_IDS;
    const excludeIdsArr = excludeIds.split(',');
    userIds.forEach(async (id) => {
      if (!excludeIdsArr.includes(id)) {
        const userDoc = await db
          .collection('users')
          .where('userId', '==', id)
          .get();

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const currentClub =
            userData?.playerCareer?.clubId ?? userData?.coachCareer?.clubId;
          if (currentClub) {
            const query = `
            SELECT 
              ${BigQueryTable.USERS_TEAMS}.document_id as documentId,
              json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId') AS teamId, 
              json_value(${BigQueryTable.TEAMS}.DATA, '$.clubId') AS clubId
            FROM
              \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
            LEFT JOIN 
              \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.TEAMS}_raw_latest\` AS ${BigQueryTable.TEAMS}
            ON
              json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId') = ${BigQueryTable.TEAMS}.document_id
            WHERE 
              json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') = '${id}'
            `;

            const options: Query = {
              query,
              location: process.env.REGION,
            };
            const [job] = await bq.createQueryJob(options);
            const [rows] = await job.getQueryResults();

            const existingTeams = [];
            rows.forEach(async (row) => {
              if (
                existingTeams.includes(row.teamId) ||
                row.clubId != currentClub
              ) {
                await db
                  .collection(BigQueryTable.USERS_TEAMS)
                  .doc(row.documentId)
                  .delete();
              } else {
                existingTeams.push(row.teamId);
              }
            });
          }
        }

        return true;
      }
    });
  }

  async syncUserTeams(updateOrderRequestDto: UpdateOrderRequestDto) {
    const { secretKey } = updateOrderRequestDto;
    const envSecretKey = process.env.UPDATE_SECRET_KEY;
    if (secretKey != envSecretKey) return false;

    const userIds = await this.getAllUserIds();
    await this.checkUserTeams(userIds);

    return true;
  }
}
