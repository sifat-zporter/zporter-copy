import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import {
  ResponseMessage,
  ROLE_BY_GROUP,
  UserInfoDto,
  ZporterIcon,
} from '../../../../common/constants/common.constant';
import { ResponsePagination } from '../../../../common/pagination/pagination.dto';
import { db } from '../../../../config/firebase.config';
import { commonPagination } from '../../../../helpers/common-pagination';
import {
  mappingUserInfo,
  mappingUserInfoById,
} from '../../../../helpers/mapping-user-info';
import { checkIsSystemAdmin } from '../../../../utils/check-is-systemAdmin';
import { deleteNullValuesInArray } from '../../../../utils/delete-null-values-in-array';
import { ObjectMapper } from '../../../../utils/objectMapper';
import { AbstractService } from '../../../abstract/abstract.service';
import { ClubService } from '../../../clubs/v1/clubs.service';
import { IClubInfo } from '../../../clubs/interfaces/clubs.interface';
import { Role } from '../../../diaries/enum/diaries.enum';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { UsersService } from '../../../users/v1/users.service';
import { MemberUpdateRequestDto } from '../../dto/member.update.request.dto';
import { TeamUpdateRequestDto } from '../../dto/team.update.request.dto';
import { TeamInforResponseDto } from '../../dto/teams.infor.response.dto';
import {
  BlockMemberTeamDto,
  ChangeStatusJoinTeamDto,
  ChangeStatusJoinTeamQuery,
  CreateTeamDto,
  GetAllMembersInTeam,
  GetTeamByIdQuery,
  JoinTeamStatus,
  MemberType,
  SearchTeamMemberQuery,
  TeamMemberType,
  TeamTab,
  UnblockMembersTeamDto,
} from '../../dto/teams.req.dto';
import { TeamsRequestDto } from '../../dto/teams.request.dto';
import { TeamsResponseDto } from '../../dto/teams.response.dto';
import { Team } from '../../repositories/teams/team';
import { TeamsMongoRepository } from '../../repositories/teams/teams.mongo.repository';
import { ITeamsMongoRepository } from '../../repositories/teams/teams.mongo.repository.interface';
import { UsersTeam } from '../../repositories/users-teams/users-team';
import { TeamsUtils } from '../../utils/teams.utils';
import { UsersTeamsMongoService } from '../users-teams/users-teams.mongo.service';
import { IUsersTeamsMongoService } from '../users-teams/users-teams.mongo.service.interface';
import { ITeamsMongoService } from './teams.mongo.interface';

@Injectable()
export class TeamsMongoService
  extends AbstractService<ITeamsMongoRepository>
  implements ITeamsMongoService
{
  constructor(
    @Inject(UsersTeamsMongoService)
    private readonly usersTeamsMongoService: IUsersTeamsMongoService,
    private readonly clubService: ClubService,
    private readonly userService: UsersService,
    private readonly teamsMongoRepository: TeamsMongoRepository,
  ) {
    super(teamsMongoRepository);
  }
  // update(updateTeam: TeamsRequestDto): Promise<TeamsResponseDto> {
  //   throw new Error('Method not implemented.');
  // }
  // getTeamById(teamId: string): Promise<TeamsResponseDto> {
  //   throw new Error('Method not implemented.');
  // }
  // getTeamByUserId(teamId: string): Promise<TeamsRequestDto[]> {
  //   throw new Error('Method not implemented.');
  // }

  async createTeam(
    teamsRequestDto: TeamsRequestDto,
  ): Promise<TeamsResponseDto> {
    await this.validateTeamNameExisted(teamsRequestDto.teamName);

    const user = await mappingUserInfoById(teamsRequestDto.userId);

    this.validateJoinNotSameClub(user.clubId, teamsRequestDto.clubId);
    this.avoidPlayerJoinMoreThanFiveTeam(user.type, teamsRequestDto.userId);

    let team: Team;
    try {
      const newTeam: Team = new TeamsUtils().generateTeam(teamsRequestDto);
      team = await this.repository.createOrUpdate(newTeam, {
        teamName: teamsRequestDto.teamName,
        clubId: teamsRequestDto.clubId,
      });

      await this.usersTeamsMongoService.createWhenInitTeams(
        team._id.toString(),
        teamsRequestDto,
      );
      return new TeamsUtils().generateTeamsResponse(team);
    } catch (error) {
      if (team) {
        await this.repository.deleteHard({ _id: team._id });
      }
      throw error;
    }
  }

  async createTeamWhenSignUp(
    teamsRequestDto: TeamsRequestDto,
  ): Promise<TeamsResponseDto> {
    await this.validateTeamNameExisted(teamsRequestDto.teamName);

    let team: Team;
    try {
      const newTeam = new TeamsUtils().generateTeam(teamsRequestDto);

      team = await this.repository.createOrUpdate(newTeam, {
        teamName: teamsRequestDto.teamName,
        clubId: teamsRequestDto.clubId,
      });

      await this.usersTeamsMongoService.createWhenInitTeams(
        team._id.toString(),
        teamsRequestDto,
      );
      return new TeamsUtils().generateTeamsResponse(team);
    } catch (error) {
      if (team) {
        await this.repository.deleteHard({ _id: team._id });
      }
      throw error;
    }
  }

  validateJoinNotSameClub(userClubId: string, clubId: string) {
    if (userClubId !== clubId) {
      throw new BadRequestException("Can't create/join team at another club!");
    }
  }

  async avoidPlayerJoinMoreThanFiveTeam(
    userType: UserTypes,
    userId: string,
  ): Promise<void> {
    const joinedTeams =
      await this.usersTeamsMongoService.getJoinedTeamsByUserId(userId);
    if (userType == UserTypes.PLAYER && joinedTeams.length >= 5) {
      throw new BadRequestException(
        "Can't create /join team while already joined in 5 teams!",
      );
    }
  }

  async changeStatusJoin(
    currentUserId: string,
    changeStatusJoinTeamDto: ChangeStatusJoinTeamDto,
    changeStatusJoinTeamQuery: ChangeStatusJoinTeamQuery,
    isAdmin: boolean,
  ): Promise<string> {
    const { memberIds } = changeStatusJoinTeamDto;
    const { teamId, status } = changeStatusJoinTeamQuery;

    await this.validatePermissionInTeam(
      currentUserId,
      changeStatusJoinTeamQuery.teamId,
      isAdmin,
    );

    await this.usersTeamsMongoService.changeStatusJoin(
      currentUserId,
      teamId,
      memberIds,
      status,
    );
    return 'Success';
  }

  async validatePermissionInTeam(
    currentUserId: string,
    teamId: string,
    isAdmin: boolean,
  ): Promise<void> {
    if (isAdmin) {
      return;
    }

    const userIsAdmin = await this.usersTeamsMongoService.checkIsMemberType(
      currentUserId,
      teamId,
      TeamMemberType.ADMIN,
    );
    const userIsOwner = await this.usersTeamsMongoService.checkIsMemberType(
      currentUserId,
      teamId,
      TeamMemberType.OWNER,
    );

    if (userIsAdmin == false && userIsOwner == false) {
      throw new BadRequestException(ResponseMessage.Team.PERMISSION_DENY);
    }
  }

  async validateTeamExists(teamId: string): Promise<void> {
    const team = await this.repository.getOne({
      _id: teamId,
      isDeleted: false,
    });

    if (team == null) {
      throw new NotFoundException(ResponseMessage.Team.NOT_FOUND);
    }
  }

  validateBlockOrRemoveMember(currentUserId: string, memberId: string): void {
    if (currentUserId == memberId) {
      throw new BadRequestException(
        'The Owner/Admin of team can not block or remove itself!',
      );
    }
  }

  async blockMember(
    currentUserId: string,
    blockMemberTeamDto: BlockMemberTeamDto,
    isAdmin: boolean,
  ): Promise<string> {
    try {
      await Promise.all([
        this.validateTeamExists(blockMemberTeamDto.teamId),
        this.validatePermissionInTeam(
          currentUserId,
          blockMemberTeamDto.teamId,
          isAdmin,
        ),
      ]);
      this.validateBlockOrRemoveMember(
        currentUserId,
        blockMemberTeamDto.memberId,
      );

      const team = await this.repository.getOne({
        _id: blockMemberTeamDto.teamId,
      });

      const teamName = team.teamName;

      await this.usersTeamsMongoService.blockMember(
        currentUserId,
        blockMemberTeamDto,
        teamName,
      );

      return ResponseMessage.Team.BLOCKED;
    } catch (error) {
      throw error;
    }
  }

  async unblockMember(
    userRoleId: string,
    unblockMembersTeamDto: UnblockMembersTeamDto,
    isAdmin: boolean,
  ): Promise<string> {
    const { teamId, memberIds } = unblockMembersTeamDto;
    try {
      await Promise.all([
        this.validateTeamExists(unblockMembersTeamDto.teamId),
        this.validatePermissionInTeam(userRoleId, teamId, isAdmin),
      ]);

      await Promise.all(
        memberIds.map(async (userId) => {
          await this.usersTeamsMongoService.unlockMember(teamId, userId);
        }),
      );
      return ResponseMessage.Team.UNBLOCKED;
    } catch (error) {
      throw error;
    }
  }

  async getAllMemberFromJoinedTeams(
    userRoleId: string,
    getAllMembersInTeam: GetAllMembersInTeam,
  ): Promise<UserInfoDto[]> {
    const userIds =
      await this.usersTeamsMongoService.getAllMemberIdsFromJoinedTeam(
        userRoleId,
      );

    const userInformations = await this.mapUserInformation(userIds);

    if (getAllMembersInTeam?.userType) {
      const userInforAfterFilter = userInformations.filter(
        (e) => e.type == getAllMembersInTeam.userType,
      );
      return userInforAfterFilter;
    } else {
      return userInformations;
    }
  }

  async mapUserInformation(userIds: string[]): Promise<UserInfoDto[]> {
    const userInfors: UserInfoDto[] = await Promise.all(
      userIds.map(async (userId) => {
        return await mappingUserInfoById(userId);
      }),
    );
    const filteredUserInfors = deleteNullValuesInArray(userInfors);
    return filteredUserInfors;
  }

  async getTeamInforById(currentUserId: string, teamId: string) {
    try {
      await this.validateTeamExists(teamId);

      return await this.mappingTeamInfor(currentUserId, teamId);
    } catch (error) {
      throw error;
    }
  }

  async mappingTeamInfor(
    currentUserId: string,
    teamId: string,
  ): Promise<TeamInforResponseDto> {
    const team = await this.repository.getOne({
      _id: teamId,
    });
    const memberType = await this.usersTeamsMongoService.getMemberType(
      currentUserId,
      teamId,
    );
    const joinedUserIds =
      await this.usersTeamsMongoService.getJoinedUsersByTeamId(teamId);

    const clubInfor = await this.clubService.getClubById(team.clubId);

    const teamInfor = this.generateTeamInforResponse({
      team,
      memberType,
      userIds: joinedUserIds,
      club: clubInfor,
    });

    return teamInfor;
  }

  generateTeamInforResponse<
    T extends {
      team: Team;
      memberType: MemberType;
      userIds: string[];
      club: IClubInfo;
    },
  >(input: T): TeamInforResponseDto {
    const teamInfor: TeamInforResponseDto = {
      teamId: input.team._id.toString(),
      teamName: input.team.teamName,
      teamImage: input.team?.teamImage || process.env.DEFAULT_TEAM_COVER_IMAGE,

      memberType: input.memberType,
      userIds: input.userIds,

      clubId: input.team.clubId.toString(),
      clubName: input.club?.clubName || '',
      clubUrl: input.club?.logoUrl || '',
      nickName: input.club?.nickName || '',
      city: input.club?.city || '',
      country: input.club?.country || '',
      arena: input.club?.arena || '',
      websiteUrl: input.club?.websiteUrl || '',
    };
    return teamInfor;
  }

  async getTeamMemberByTeamId(
    userRoleId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ): Promise<ResponsePagination<UserInfoDto>> {
    try {
      await this.validateTeamExists(teamId);

      const { limit, startAfter, tab, role } = getTeamByIdQuery;

      const { status, memberType } = this.generateStatusAndMemberType(tab);

      const usersTeams = await this.getUserTeamsByTeamTab(
        tab,
        teamId,
        status,
        +startAfter,
        +limit,
        memberType,
      );

      const { data: userInfors } = await this.mappingDataMembers(
        usersTeams,
        userRoleId,
      );

      const filteredUserInfors = this.filterTeamMemberByRole(userInfors, role);

      return commonPagination<UserInfoDto>(
        getTeamByIdQuery,
        filteredUserInfors,
        filteredUserInfors.length,
      );
    } catch (error) {
      throw error;
    }
  }

  generateStatusAndMemberType(tab: TeamTab) {
    let status: JoinTeamStatus =
      tab == TeamTab.REQUEST ? JoinTeamStatus.PENDING : JoinTeamStatus.ACCEPTED;

    let memberType: MemberType;
    switch (tab) {
      case TeamTab.ADMIN:
        memberType = MemberType.ADMIN;
        break;

      case TeamTab.OWNER:
        memberType = MemberType.OWNER;
        break;

      default:
        memberType = MemberType.MEMBER;
        break;
    }

    return {
      status,
      memberType,
    };
  }

  async getUserTeamsByTeamTab(
    tab: TeamTab,
    teamId: string,
    status: JoinTeamStatus,
    page: number,
    pageSize: number,
    memberType: MemberType,
  ): Promise<UsersTeam[]> {
    if (tab == TeamTab.BLOCK) {
      const blockedUsersTeams =
        await this.usersTeamsMongoService.getBlockedUsersByTeamId(
          teamId,
          page,
          pageSize,
        );

      return blockedUsersTeams;
    } else {
      const joinedUsersTeams = await this.usersTeamsMongoService.getUserTeams(
        teamId,
        page,
        pageSize,
        '',
        status,
        memberType,
      );

      return joinedUsersTeams;
    }
  }

  async mappingDataMembers(data: any[], currentUserId: string) {
    const mappingUserInfo = data.map(async ({ userId, memberType }) => {
      const userInfo = await mappingUserInfoById(userId, currentUserId, true);

      return { ...userInfo, memberType };
    });

    const result = await Promise.all(mappingUserInfo);

    return { data: result };
  }

  filterTeamMemberByRole(
    userInfors: UserInfoDto[],
    role: Role,
  ): Array<UserInfoDto> {
    const _3MainRole = [Role.DEFENDERS, Role.MIDFIELDERS, Role.FORWARDS];
    if (!role) {
      return userInfors;
    }
    if (_3MainRole.includes(role)) {
      const roles = ROLE_BY_GROUP(role);

      return userInfors.filter((e) => {
        if (roles.some((role) => e.favoriteRoles.includes(role)) == true) {
          return e;
        }
      });
    } else {
      return userInfors.filter((e) => e.favoriteRoles.includes(role));
    }
  }

  async searchTeamMember(
    userRoleId: string,
    teamId: string,
    searchTeamMemberQuery: SearchTeamMemberQuery,
  ): Promise<{
    data: UserInfoDto[];
    count: number;
  }> {
    const teamMemberMatchedSearching =
      await this.usersTeamsMongoService.findUserByNameFromElastic(
        teamId,
        searchTeamMemberQuery,
      );

    return {
      data: teamMemberMatchedSearching,
      count: teamMemberMatchedSearching.length,
    };
  }

  async blockTeam(currentUserId: string, teamId: string): Promise<string> {
    await Promise.all([
      this.validateTeamExists(teamId),
      this.userService.validateUserId(currentUserId),
    ]);

    const checkBlockedTeam = await this.checkBlockedTeam(currentUserId, teamId);
    if (checkBlockedTeam == true) {
      throw new BadRequestException(ResponseMessage.Team.ALREADY_BLOCKED);
    }

    await this.usersTeamsMongoService.deleteUserTeam(currentUserId, teamId);
    await this.repository.addUserIdToBlackList(currentUserId, teamId);

    return ResponseMessage.Team.BLOCKED;
  }

  async checkBlockedTeam(userRoleId: string, teamId: string): Promise<boolean> {
    const blockedTeamForThisUser = await this.repository.getOne({
      _id: teamId,
    });

    if (blockedTeamForThisUser.blackList.includes(userRoleId) == true) {
      return true;
    } else {
      return false;
    }
  }

  async unblockTeam(currentUserId: string, teamId: string): Promise<string> {
    await Promise.all([
      this.validateTeamExists(teamId),
      this.userService.validateUserId(currentUserId),
    ]);

    const checkBlockedTeam = await this.checkBlockedTeam(currentUserId, teamId);
    if (checkBlockedTeam == false) {
      throw new BadRequestException(ResponseMessage.Team.TEAM_NOT_BLOCKED);
    }

    await this.repository.removeUserIdFromBlackList(currentUserId, teamId);
    return ResponseMessage.Team.UNBLOCKED;
  }

  async updateTeam(
    currentUserId: string,
    teamId: string,
    updateTeamDto: TeamUpdateRequestDto,
    isAdmin: boolean,
  ): Promise<string> {
    await Promise.all([
      this.validateTeamExists(teamId),
      this.userService.validateUserId(currentUserId),
      this.validatePermissionInTeam(currentUserId, teamId, isAdmin),
    ]);
    const team = await this.repository.getOne({
      _id: teamId,
    });

    if (updateTeamDto?.teamName && team.teamName != updateTeamDto.teamName) {
      await this.validateTeamNameExisted(updateTeamDto.teamName);
    }

    if (updateTeamDto.memberIds.length !== 0) {
      await this.usersTeamsMongoService.createNewMember({
        teamId,
        userIds: updateTeamDto.memberIds,
        teamName: updateTeamDto.teamName,
        currentUserId,
      });
    }

    delete updateTeamDto.memberIds;

    let newTeam: Team = {
      ...team,
      teamName: updateTeamDto.teamName,
      teamImage: updateTeamDto.teamImage,
      isPrivate: updateTeamDto.isPrivate,
    };

    await this.repository.createOrUpdate(newTeam, { _id: team._id.toString() });

    return ResponseMessage.Team.UPDATED;
  }

  async validateTeamNameExisted(newTeamName: string): Promise<void> {
    const duplicatedTeam = await this.repository.getOne({
      teamName: newTeamName,
    });
    if (duplicatedTeam) {
      throw new ForbiddenException(ResponseMessage.Team.TEAM_NAME_EXISTED);
    }
  }

  async updateTypeMember(
    currentUserId: string,
    teamId: string,
    updateMember: MemberUpdateRequestDto,
    isAdmin: boolean,
  ): Promise<void> {
    await Promise.all([
      this.userService.validateUserId(currentUserId),
      this.validatePermissionInTeam(currentUserId, teamId, isAdmin),
      this.validateTeamExists(teamId),
      this.usersTeamsMongoService.validateAllUsersJoined(
        teamId,
        updateMember.memberIds,
      ),
    ]);
    const team = await this.repository.getOne({
      _id: teamId,
    });

    await this.usersTeamsMongoService.updateMemberType(
      currentUserId,
      team,
      updateMember.memberIds,
      updateMember.memberType,
    );
  }

  async sendRequestJoinTeam(userId: string, teamId: string): Promise<void> {
    await Promise.all([
      this.userService.validateUserId(userId),
      this.validateTeamExists(teamId),
    ]);

    const user = await mappingUserInfoById(userId);
    const team = await this.getTeamInforById(userId, teamId);

    await Promise.all([
      this.validateJoinNotSameClub(user.clubId, team.clubId),
      this.avoidPlayerJoinMoreThanFiveTeam(user.type, userId),
      this.usersTeamsMongoService.validateSendJoinRequest(teamId, userId),
    ]);

    this.usersTeamsMongoService.createJoinTeam({
      currentUserId: userId,
      teamId,
      teamName: team.teamName,
      userIds: [userId],
    });
  }

  async cancelRequestJoinTeam(
    currentUserId: string,
    teamId: string,
  ): Promise<string> {
    await Promise.all([
      this.validateTeamExists(teamId),
      this.userService.validateUserId(currentUserId),
      this.usersTeamsMongoService.validateUsersTeams(
        teamId,
        [currentUserId],
        JoinTeamStatus.PENDING,
      ),
    ]);
    await this.usersTeamsMongoService.deleteUserTeam(currentUserId, teamId);

    return ResponseMessage.Team.CANCEL_REQUEST_JOIN_TEAM;
  }

  async leaveTeam(currentUserId: string, teamId: string): Promise<string> {
    await Promise.all([
      this.validateTeamExists(teamId),
      this.userService.validateUserId(currentUserId),
      this.usersTeamsMongoService.validateAllUsersJoined(teamId, [
        currentUserId,
      ]),
    ]);

    const userTeams: UsersTeam[] =
      await this.usersTeamsMongoService.getUserTeams(
        teamId,
        0,
        0,
        currentUserId,
        JoinTeamStatus.ACCEPTED,
      );
    const deleteUserTeam = userTeams[0];
    await this.usersTeamsMongoService.deleteUserTeam(currentUserId, teamId);

    const usersInTeam: UsersTeam[] =
      await this.usersTeamsMongoService.getUserTeams(
        teamId,
        0,
        0,
        '',
        JoinTeamStatus.ACCEPTED,
        '',
      );

    if (usersInTeam.length && deleteUserTeam.memberType == MemberType.OWNER) {
      const userTeam: UsersTeam = usersInTeam[0];
      const team = await this.repository.getOne({
        _id: teamId,
      });
      await this.usersTeamsMongoService.updateMemberType(
        deleteUserTeam.userId,
        team,
        [userTeam.userId],
        MemberType.OWNER,
      );
    } else if (!usersInTeam.length) {
      const team = await this.repository.getOne({
        _id: teamId,
      });
      await this.repository.createOrUpdate(
        { ...team, isDeleted: true },
        { _id: team._id.toString() },
      );
    }

    return ResponseMessage.Team.LEAVE_TEAM;
  }
}
