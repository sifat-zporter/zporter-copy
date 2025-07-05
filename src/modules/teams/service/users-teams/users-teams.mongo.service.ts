import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ResponseMessage,
  UserInfoDto,
} from '../../../../common/constants/common.constant';
import { mappingUserInfoById } from '../../../../helpers/mapping-user-info';
import { removeDuplicatedElement } from '../../../../utils/remove-duplicated-elements';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../../notifications/notifications.service';
import { UsersMongoRepository } from '../../../users/repositories/users.mongo.repository';
import { UsersService } from '../../../users/v1/users.service';
import {
  BlockMemberTeamDto,
  JoinTeamStatus,
  MemberConfirm,
  MemberType,
  SearchTeamMemberQuery,
  TeamMemberType,
  UpdateTeamDto,
} from '../../dto/teams.req.dto';
import { TeamsRequestDto } from '../../dto/teams.request.dto';
import { UsersTeam } from '../../repositories/users-teams/users-team';
import { UsersTeamsUtils } from '../../utils/users-teams.utils';
import { IUsersTeamsMongoService } from './users-teams.mongo.service.interface';
import { generateTitleNotification } from '../../../notifications/utils/generate-title-notification';
import { Team } from '../../repositories/teams/team';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { AbstractService } from '../../../abstract/abstract.service';
import { IUsersTeamsMongoRepository } from '../../repositories/users-teams/users-teams.mongo.repository.interface';
import { UsersTeamsMongoRepository } from '../../repositories/users-teams/users-teams.mongo.repository';
@Injectable()
export class UsersTeamsMongoService
  extends AbstractService<IUsersTeamsMongoRepository>
  implements IUsersTeamsMongoService
{
  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly usersTeamsMongoRepository: UsersTeamsMongoRepository,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {
    super(usersTeamsMongoRepository);
  }
  async createWhenInitTeams(
    teamId: string,
    teamsRequestDto: TeamsRequestDto,
  ): Promise<void> {
    const userIds = teamsRequestDto?.memberIds || null;
    const currentUserId = teamsRequestDto.userId;

    try {
      //# create owner
      await this.validateInviteUserIds(teamId, [currentUserId]);
      await this.repository.createMany(
        teamId,
        [teamsRequestDto.userId],
        MemberType.OWNER,
        JoinTeamStatus.ACCEPTED,
      );

      //# create new members
      await this.createNewMember({
        teamId,
        teamName: teamsRequestDto.teamName,
        currentUserId,
        userIds,
      });
    } catch (error) {
      throw error;
    }
  }
  async createNewMember<
    T extends {
      teamId: string;
      teamName: string;
      currentUserId: string;
      userIds: string[];
    },
  >(createInfor: T): Promise<void> {
    try {
      if (createInfor.userIds.length != 0) {
        await this.validateInviteUserIds(
          createInfor.teamId,
          createInfor.userIds,
        );
        await this.repository.createMany(
          createInfor.teamId,
          createInfor.userIds,
          MemberType.MEMBER,
          JoinTeamStatus.PENDING,
        );

        await this.noticeInvitedUser(
          createInfor.teamId,
          createInfor.teamName,
          createInfor.currentUserId,
          createInfor.userIds,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async createJoinTeam<
    T extends {
      teamId: string;
      teamName: string;
      currentUserId: string;
      userIds: string[];
    },
  >(createInfor: T): Promise<void> {
    try {
      await this.validateInviteUserIds(createInfor.teamId, [
        createInfor.currentUserId,
      ]);
      await this.repository.createMany(
        createInfor.teamId,
        [createInfor.currentUserId],
        MemberType.MEMBER,
        JoinTeamStatus.PENDING,
      );

      await this.noticeManagerWhenCreateJoinRequest(
        createInfor.teamId,
        createInfor.teamName,
        createInfor.currentUserId,
      );
    } catch (error) {
      throw error;
    }
  }

  async checkSomeUserJoined(
    teamId: string,
    userIds: string[],
  ): Promise<boolean> {
    let isJoined = false;
    await Promise.all(
      userIds.map(async (userId) => {
        const isUserJoined = await this.checkIsUserJoined(teamId, userId);

        if (isUserJoined == true) {
          isJoined = true;
        }
      }),
    );
    return isJoined;
  }

  async checkUserFound(userIds: string[]): Promise<boolean> {
    let result = true;

    await userIds.forEach(async (userId) => {
      const user = await this.repository.getOne({
        userId,
        isDeleted: false,
      });

      if (user == null) {
        result = false;
      }
    });

    return result;
  }

  checkNullArray(userIds: string[]): boolean {
    if (userIds.length == 0) {
      return true;
    } else return false;
  }

  async getUsernameJoinedMoreThanFiveTeam(userIds: string[]): Promise<string> {
    let username;
    await Promise.all(
      userIds.map(async (userId) => {
        const joinedTeams = await this.repository.get({
          match: {
            userId,
            status: JoinTeamStatus.ACCEPTED,
            isDeleted: false,
          },
        });

        if (joinedTeams && joinedTeams.length >= 5) {
          username = await (await mappingUserInfoById(userId)).username;
        }
      }),
    );
    return username ? username : null;
  }

  async checkUsersTeamsExist(
    teamId: string,
    userIds: string[],
    joinTeamStatus?: JoinTeamStatus,
  ): Promise<boolean> {
    let result = true;
    await Promise.all(
      userIds.map(async (userId) => {
        const usersTeams = await this.repository.getOne({
          userId,
          teamId,
          status: joinTeamStatus,
          isDeleted: false,
        });

        if (usersTeams == null) {
          result = false;
        }
      }),
    );
    return result;
  }

  async validateInviteUserIds(
    teamId: string,
    userIds: string[],
  ): Promise<void> {
    const [
      checkSomeUserJoined,
      checkAlreadySendRequest,
      checkUserFound,
      getUsernameJoinedMoreThanFiveTeam,
    ] = await Promise.all([
      this.checkSomeUserJoined(teamId, userIds),
      this.checkAlreadySendRequest(teamId, userIds),
      this.checkUserFound(userIds),
      this.getUsernameJoinedMoreThanFiveTeam(userIds),
    ]);

    if (this.checkNullArray(userIds)) {
      throw new NotFoundException(ResponseMessage.User.NOT_FOUND);
    }
    if (checkSomeUserJoined) {
      throw new BadRequestException(ResponseMessage.Team.ALREADY_IN);
    }
    if (checkAlreadySendRequest) {
      throw new BadRequestException(ResponseMessage.Team.ALREADY_REQUEST);
    }
    if (checkUserFound == false) {
      throw new BadRequestException(ResponseMessage.User.NOT_FOUND);
    }
    if (getUsernameJoinedMoreThanFiveTeam != null) {
      throw new BadRequestException(
        `#${getUsernameJoinedMoreThanFiveTeam} joined more than 5 teams!`,
      );
    }
  }

  async checkAlreadySendRequest(teamId: string, userIds: string[]) {
    let isRequested = false;
    await Promise.all(
      userIds.map(async (userId) => {
        const joinedUsers = await this.repository.get({
          match: {
            userId,
            teamId,
            status: {
              $ne: 'ACCEPTED',
              // operator: '$ne',   // delete for new ConditionObject
              // value: 'ACCEPTED',
            },
          },
        });

        if (joinedUsers.length != 0) {
          isRequested = true;
        }
      }),
    );
    return isRequested;
  }

  async validateUsersTeams(
    teamId: string,
    userIds: string[],
    joinTeamStatus: JoinTeamStatus,
  ): Promise<void> {
    const checkUsersTeamsExist = await this.checkUsersTeamsExist(
      teamId,
      userIds,
      joinTeamStatus,
    );

    if (checkUsersTeamsExist == false) {
      throw new BadRequestException(ResponseMessage.Team.MEMBER_NOT_FOUND);
    }
  }

  async validateAlreadyBlocked(teamId: string, userIds: string[]) {
    const checkUsersTeamsIsBlock = await this.checkUsersTeamsAlreadyBlocked(
      teamId,
      userIds,
    );
    if (checkUsersTeamsIsBlock == true) {
      throw new BadRequestException(ResponseMessage.Team.ALREADY_BLOCKED);
    }
  }

  async validateNotBlocked(teamId: string, userIds: string[]) {
    const checkUsersTeamsIsBlock = await this.checkUsersTeamsAlreadyBlocked(
      teamId,
      userIds,
    );
    if (checkUsersTeamsIsBlock == false) {
      throw new BadRequestException(ResponseMessage.Team.NOT_BLOCKED);
    }
  }

  async checkUsersTeamsAlreadyBlocked(
    teamId: string,
    userIds: string[],
  ): Promise<boolean> {
    let result: boolean = false;
    await Promise.all(
      userIds.map(async (userId) => {
        const usersTeamsBlocked = await this.repository.getOne({
          teamId,
          userId,
          status: JoinTeamStatus.ACCEPTED,
          isBlocked: true,
        });
        if (usersTeamsBlocked !== null) {
          result = true;
        }
      }),
    );
    return result;
  }

  async noticeInvitedUser(
    teamId: string,
    teamName: string,
    currentUserId: string,
    userIds: string[],
  ): Promise<void> {
    const ownerInfo = await mappingUserInfoById(currentUserId);
    await Promise.all(
      userIds.map(async (userId) => {
        const memberInfo = await mappingUserInfoById(userId);

        const payload = new CreateNotificationDto();
        payload.token = memberInfo?.fcmToken || [];
        payload.notificationType = NotificationType.INVITE_MEMBER_TEAM;
        payload.receiverId = userId;
        payload.senderId = ownerInfo.userId as string;
        payload.title = `#${
          ownerInfo.username
        } added you to be a ${TeamMemberType.MEMBER.toLowerCase()} of ${teamName} team`;
        payload.largeIcon = ownerInfo.faceImage;
        payload.username = ownerInfo.username;
        payload.userType = ownerInfo.type;
        payload.others = {
          teamId,
          memberType: TeamMemberType.MEMBER,
        };

        return await this.notificationsService.sendMulticastNotification(
          payload,
          true,
        );
      }),
    );
  }

  async noticeManagerWhenCreateJoinRequest(
    teamId: string,
    teamName: string,
    currentUserId: string,
  ): Promise<void> {
    const admins = await this.repository.get({
      match: {
        teamId,
        memberType: TeamMemberType.ADMIN,
        status: JoinTeamStatus.ACCEPTED,
      },
    });
    const owners = await this.repository.get({
      match: {
        teamId,
        memberType: TeamMemberType.OWNER,
        status: JoinTeamStatus.ACCEPTED,
      },
    });
    const managerIds: string[] = admins
      .map((e) => e.userId.toString())
      .concat(owners.map((e) => e.userId.toString()));

    const memberInfo = await mappingUserInfoById(currentUserId);
    const memberType =
      memberInfo.type === UserTypes.COACH ? 'member' : 'player';

    await Promise.all(
      managerIds.map(async (managerId) => {
        const managerInfo = await mappingUserInfoById(managerId);

        const payload = new CreateNotificationDto();

        payload.token = managerInfo?.fcmToken as string[];
        payload.notificationType = NotificationType.ASK_JOIN_TEAM;
        payload.receiverId = managerId;
        payload.senderId = currentUserId;
        payload.title = generateTitleNotification(
          NotificationType.ASK_JOIN_TEAM,
          {
            username: memberInfo.username,
            memberType: memberType,
            teamName: teamName,
          },
        );
        payload.largeIcon = memberInfo.faceImage as string;
        payload.username = memberInfo.username as string;
        payload.userType = memberInfo.type as UserTypes;
        payload.others = {
          teamId,
        };

        await this.notificationsService.sendMulticastNotification(payload);
      }),
    );
  }

  async checkIsMemberType(
    userId: string,
    teamId: string,
    memberType: TeamMemberType,
  ): Promise<boolean> {
    const users_teams = await this.repository.getOne({
      teamId,
      userId,
      memberType,
    });
    if (users_teams == null) {
      return false;
    }
    return true;
  }

  async changeStatusJoin<T extends { userId: string; isChanged: number }>(
    senderId: string,
    teamId: string,
    userIds: string[],
    status: JoinTeamStatus,
  ): Promise<void> {
    try {
      await this.validateUsersTeams(teamId, userIds, JoinTeamStatus.PENDING);

      const listChangedUsersTeams: Array<T> = await this.repository.updateMany(
        teamId,
        userIds,
        status,
      );
      await this.noticeChangeStatusJoinTeam(
        status,
        senderId,
        teamId,
        listChangedUsersTeams,
      );
    } catch (error) {
      throw error;
    }
  }

  async noticeChangeStatusJoinTeam<
    T extends { userId: string; isChanged: number },
  >(
    status: JoinTeamStatus,
    senderId: string,
    teamId: string,
    listChangedUsersTeams: T[],
  ): Promise<void> {
    listChangedUsersTeams.forEach(async (result) => {
      if (status == JoinTeamStatus.ACCEPTED && result.isChanged == 1) {
        await this.notificationsService.noticeChangedStatusInUsersTeams({
          notificationType: NotificationType.ACCEPT_JOIN_TEAM,
          senderId: senderId,
          receiverId: result.userId,
          teamId: teamId,
        });
      }
      if (status == JoinTeamStatus.REJECTED && result.isChanged == 1) {
        await this.notificationsService.noticeChangedStatusInUsersTeams({
          notificationType: NotificationType.REJECT_JOIN_TEAM,
          senderId: senderId,
          receiverId: result.userId,
          teamId: teamId,
        });
      }
    });
  }

  async blockMember(
    currentUserId: string,
    blockMemberTeamDto: BlockMemberTeamDto,
    teamName: string,
  ): Promise<void> {
    try {
      await Promise.all([
        this.validateUsersTeams(
          blockMemberTeamDto.teamId,
          [blockMemberTeamDto.memberId],
          JoinTeamStatus.ACCEPTED,
        ),
        this.validateAlreadyBlocked(blockMemberTeamDto.teamId, [
          blockMemberTeamDto.memberId,
        ]),
      ]);
      const userTeam = await this.repository.getOne({
        teamId: blockMemberTeamDto.teamId,
        userId: blockMemberTeamDto.memberId,
        status: JoinTeamStatus.ACCEPTED,
      });
      userTeam.isBlocked = true;
      const blockedMember = await this.repository.createOrUpdate(userTeam);

      await this.noticeBlockMember({
        senderId: currentUserId,
        receiverId: blockMemberTeamDto.memberId,
        teamId: blockMemberTeamDto.teamId,
        oldMemberType: blockedMember.memberType,
        teamName,
      });
    } catch (error) {
      throw error;
    }
  }

  async noticeBlockMember<
    T extends {
      senderId: string;
      receiverId: string;
      teamId: string;
      oldMemberType: MemberType;
      teamName: string;
    },
  >(noticeInfo: T): Promise<void> {
    await this.notificationsService.noticeBlockMemberInTeam({
      notificationType: NotificationType.BLOCK_MEMBER_TEAM,
      senderId: noticeInfo.senderId,
      receiverId: noticeInfo.receiverId,
      others: {
        teamId: noticeInfo.teamId,
        nextNotificationType: NotificationType.MEMBER_CONFIRM_BLOCK_MEMBER_TEAM,
        oldMemberType: noticeInfo.oldMemberType,
        memberConfirm: MemberConfirm.MEMBER,
      },
      teamName: noticeInfo.teamName,
    });
  }

  async unlockMember(teamId: string, userId: string): Promise<void> {
    try {
      await Promise.all([
        this.validateUsersTeams(teamId, [userId], JoinTeamStatus.ACCEPTED),
        this.validateNotBlocked(teamId, [userId]),
      ]);
      await this.repository.deleteHard({
        teamId,
        userId,
      });
    } catch (error) {
      throw error;
    }
  }

  async getJoinedTeamsByUserId(userId: string): Promise<string[]> {
    const joinedUsersTeams = await this.repository.get({
      match: {
        userId,
        status: JoinTeamStatus.ACCEPTED,
        isDeleted: false,
        isBlocked: false,
      },
    });
    const arrayJoinedTeams = joinedUsersTeams.map((e) => e.teamId);
    return arrayJoinedTeams;
  }

  async getJoinedUsersByTeamId(teamId: string): Promise<string[]> {
    const joinedUsersTeams = await this.repository.get({
      match: {
        teamId,
        status: JoinTeamStatus.ACCEPTED,
        isDeleted: false,
        isBlocked: false,
      },
    });
    const arrayJoinedUsers = joinedUsersTeams.map((e) => e.userId);
    return arrayJoinedUsers;
  }

  async getAllMemberIdsFromJoinedTeam(userId: string): Promise<string[]> {
    const arrayTeamIds = await this.getJoinedTeamsByUserId(userId);

    const listUserIds = await Promise.all(
      arrayTeamIds.map(async (teamId) => {
        return this.getJoinedUsersByTeamId(teamId);
      }),
    );

    return removeDuplicatedElement<string>(listUserIds.flat());
  }

  async getMemberType(userId: string, teamId: string): Promise<MemberType> {
    try {
      const usersTeams = await this.repository.getOne({
        userId,
        teamId,
        isDeleted: false,
      });

      if (usersTeams) {
        if (usersTeams.status == JoinTeamStatus.ACCEPTED) {
          return usersTeams.memberType;
        }

        return MemberType.PENDING;
      } else {
        return MemberType.NOT_A_MEMBER;
      }
    } catch (error) {
      throw new BadRequestException('Error in check status join of user!');
    }
  }

  async getUserTeams(
    teamId: string,
    page: number,
    pageSize: number,
    userId?: string | '',
    status?: JoinTeamStatus | '',
    memberType?: MemberType | '',
  ): Promise<UsersTeam[]> {
    let joinedUsersTeams: Array<UsersTeam>;

    joinedUsersTeams = await this.repository.get({
      match: {
        teamId,
        status,
        userId,
        memberType,
        isDeleted: false,
        isBlocked: false,
      },
      page,
      pageSize,
      keySort: {
        memberType: 1,
      },
    });

    return joinedUsersTeams;
  }

  async getBlockedUsersByTeamId(
    teamId: string,
    page: number,
    pageSize: number,
  ): Promise<UsersTeam[]> {
    const blockedUsers = await this.repository.get({
      match: {
        teamId,
        isBlocked: true,
      },
      page,
      pageSize,
    });

    return blockedUsers;
  }

  async findUserByNameFromElastic(
    teamId: string,
    searchTeamMemberQuery: SearchTeamMemberQuery,
  ): Promise<UserInfoDto[]> {
    const {
      limit: pageSize,
      startAfter: page,
      memberType,
    } = searchTeamMemberQuery;

    const userIds = await this.usersService.getUserIdsByNameFromElastic(
      searchTeamMemberQuery,
    );

    const typeCondition = this.generateTypeCondition(memberType);
    const members = await this.getUserTeams(
      teamId,
      +page,
      +pageSize,
      '',
      JoinTeamStatus.ACCEPTED,
      typeCondition,
    );

    const memberIds = members.map((e) => e.userId);
    const commonUserIds = userIds.filter((userId) =>
      memberIds.includes(userId),
    );

    const userInfors = await Promise.all(
      commonUserIds.map((userId) => mappingUserInfoById(userId)),
    );

    return userInfors;
  }

  generateTypeCondition(teamMemberType: TeamMemberType): MemberType | null {
    switch (teamMemberType) {
      case TeamMemberType.ADMIN:
        return MemberType.ADMIN;

      case TeamMemberType.MEMBER:
        return MemberType.MEMBER;

      case TeamMemberType.OWNER:
        return MemberType.OWNER;

      default:
        return null;
    }
  }

  async deleteUserTeam(userId: string, teamId: string): Promise<void> {
    const userTeam = await this.repository.getOne({
      userId,
      teamId,
    });
    if (!userTeam) {
      throw new NotFoundException(ResponseMessage.Team.MEMBER_NOT_FOUND);
    }
    await this.repository.deleteHard({
      _id: userTeam._id.toString(),
    });
  }

  async validateAllUsersJoined(
    teamId: string,
    userIds: string[],
  ): Promise<void> {
    await Promise.all(
      userIds.map(async (userId) => {
        const checkJoined = await this.checkIsUserJoined(teamId, userId);

        if (checkJoined == false) {
          throw new BadRequestException(ResponseMessage.Team.MEMBER_NOT_FOUND);
        }
      }),
    );
  }

  async checkIsUserJoined(teamId: string, userId: string): Promise<boolean> {
    const joinedUsers = await this.repository.get({
      match: {
        userId,
        teamId,
        status: JoinTeamStatus.ACCEPTED,
      },
    });
    if (joinedUsers.length != 0) {
      return true;
    } else {
      return false;
    }
  }

  async validateSendJoinRequest(teamId: string, userId: string): Promise<void> {
    const userTeam = await this.repository.getOne({
      userId,
      teamId,
    });
    if (userTeam && userTeam.status == JoinTeamStatus.PENDING) {
      throw new NotFoundException(ResponseMessage.Team.ALREADY_REQUEST);
    }
    if (userTeam && userTeam.status == JoinTeamStatus.ACCEPTED) {
      throw new NotFoundException(ResponseMessage.Team.ALREADY_IN);
    }
  }

  async updateMemberType(
    currentUserId: string,
    team: Team,
    userIds: string[],
    type: MemberType,
  ): Promise<void> {
    await this.validateUsersTeams(
      team._id.toString(),
      userIds,
      JoinTeamStatus.ACCEPTED,
    );

    await Promise.all(
      userIds.map(async (userId) => {
        const userTeam = await this.repository.getOne({
          userId,
          teamId: team._id.toString(),
          status: JoinTeamStatus.ACCEPTED,
          memberType: {
            $ne: type,
          },
        });

        if (userTeam == null) return null;

        const oldType = userTeam.memberType;
        userTeam.memberType = type;

        await this.repository.createOrUpdate(userTeam);

        await this.noticeForChangeType(
          currentUserId,
          team._id.toString(),
          team.teamName,
          userId,
          oldType,
          type,
        );
      }),
    );
  }

  async noticeForChangeType(
    currentUserId: string,
    teamId: string,
    teamName: string,
    userId: string,
    oldType: MemberType,
    newType: MemberType,
  ) {
    if (
      newType == MemberType.MEMBER ||
      (oldType == MemberType.OWNER && newType == MemberType.ADMIN)
    ) {
      const sender = await mappingUserInfoById(currentUserId);
      const receiver = await mappingUserInfoById(userId);
      const payload = new CreateNotificationDto();
      payload.token = receiver.fcmToken;
      payload.notificationType = NotificationType.DOWNGRADE_TEAM_MEMBER_TYPE;
      payload.receiverId = userId;
      payload.senderId = currentUserId;
      payload.title = generateTitleNotification(
        NotificationType.DOWNGRADE_TEAM_MEMBER_TYPE,
        {
          username: sender.username,
          teamName,
          memberType: newType,
        },
      );
      payload.largeIcon = sender.faceImage;
      payload.username = receiver.username;
      payload.userType = receiver.type;
      payload.others = {
        teamId,
        memberType: TeamMemberType.OWNER,
      };
      await this.notificationsService.sendMulticastNotification(payload);
    }

    if (
      newType == MemberType.OWNER ||
      (oldType == MemberType.MEMBER && newType == MemberType.ADMIN)
    ) {
      const sender = await mappingUserInfoById(currentUserId);
      const receiver = await mappingUserInfoById(userId);
      const payload = new CreateNotificationDto();
      payload.token = receiver.fcmToken;
      payload.notificationType = NotificationType.UPGRADE_TEAM_MEMBER_TYPE;
      payload.receiverId = userId;
      payload.senderId = currentUserId;
      payload.title = generateTitleNotification(
        NotificationType.UPGRADE_TEAM_MEMBER_TYPE,
        {
          username: sender.username,
          teamName,
          memberType: newType,
        },
      );
      payload.largeIcon = sender.faceImage;
      payload.username = receiver.username;
      payload.userType = receiver.type;
      payload.others = {
        teamId,
        memberType: TeamMemberType.OWNER,
      };
      await this.notificationsService.sendMulticastNotification(payload);
    }
  }
}
