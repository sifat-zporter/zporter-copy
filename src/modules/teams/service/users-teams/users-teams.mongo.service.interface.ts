import { UserInfoDto } from '../../../../common/constants/common.constant';
import {
  BlockMemberTeamDto,
  JoinTeamStatus,
  MemberType,
  SearchTeamMemberQuery,
  TeamMemberType,
} from '../../dto/teams.req.dto';
import { TeamsRequestDto } from '../../dto/teams.request.dto';
import { Team } from '../../repositories/teams/team';
import { UsersTeam } from '../../repositories/users-teams/users-team';

export interface IUsersTeamsMongoService {
  /**
   * Create users-teams and notice for inviting memebers.
   * @param teamId
   * @param teamsRequestDto
   */
  createWhenInitTeams(
    teamId: string,
    teamsRequestDto: TeamsRequestDto,
  ): Promise<void>;

  createNewMember<
    T extends {
      teamId: string;
      teamName: string;
      currentUserId: string;
      userIds: string[];
    },
  >(
    createInfor: T,
  ): Promise<void>;

  createJoinTeam<
    T extends {
      teamId: string;
      teamName: string;
      currentUserId: string;
      userIds: string[];
    },
  >(
    createInfor: T,
  ): Promise<void>;

  updateMemberType(
    currentUserId: string,
    team: Team,
    userIds: string[],
    type: MemberType,
  ): Promise<void>;

  deleteUserTeam(userId: string, teamId: string): Promise<void>;

  /**
   * Block a member who joined in the team.
   * @param currentUserId Admin's id / Owner's id
   * @param blockMemberTeamDto includes: memberId and teamId
   * @param teamName
   */
  blockMember(
    currentUserId: string,
    blockMemberTeamDto: BlockMemberTeamDto,
    teamName: string,
  ): Promise<void>;

  /**
   * Change status of users-teams.
   * @param senderId
   * @param teamId
   * @param userIds
   * @param status
   */
  changeStatusJoin<T extends { userId: string; isChanged: number }>(
    senderId: string,
    teamId: string,
    userIds: string[],
    status: JoinTeamStatus,
  ): Promise<void>;

  noticeInvitedUser(
    teamId: string,
    teamName: string,
    currentUserId: string,
    userIds: string[],
  ): Promise<void>;

  noticeBlockMember<
    T extends {
      senderId: string;
      receiverId: string;
      teamId: string;
      oldMemberType: MemberType;
      teamName: string;
    },
  >(
    noticeInfo: T,
  ): Promise<void>;

  noticeChangeStatusJoinTeam<T extends { userId: string; isChanged: number }>(
    status: JoinTeamStatus,
    senderId: string,
    teamId: string,
    listChangedUsersTeams: T[],
  ): Promise<void>;

  checkSomeUserJoined(teamId: string, userIds: string[]): Promise<boolean>;
  checkUserFound(userIds: string[]): Promise<boolean>;
  checkNullArray(userIds: string[]): boolean;
  checkUsersTeamsExist(
    teamId: string,
    userIds: string[],
    joinTeamStatus?: JoinTeamStatus,
  ): Promise<boolean>;
  checkUsersTeamsAlreadyBlocked(
    teamId: string,
    userIds: string[],
  ): Promise<boolean>;
  checkIsMemberType(
    userId: string,
    teamId: string,
    memberType: TeamMemberType,
  ): Promise<boolean>;

  validateInviteUserIds(teamId: string, userIds: string[]): Promise<void>;
  validateUsersTeams(
    teamId: string,
    userIds: string[],
    joinTeamStatus: JoinTeamStatus,
  ): Promise<void>;
  validateAllUsersJoined(teamId: string, userIds: string[]): Promise<void>;
  validateSendJoinRequest(teamId: string, userId: string): Promise<void>;

  getUsernameJoinedMoreThanFiveTeam(userIds: string[]): Promise<string>;
  getJoinedTeamsByUserId(userId: string): Promise<string[]>;
  getAllMemberIdsFromJoinedTeam(userId: string): Promise<string[]>;
  getMemberType(userId: string, teamId: string): Promise<MemberType>;
  getJoinedUsersByTeamId(teamId: string): Promise<string[]>;
  getBlockedUsersByTeamId(
    teamId: string,
    page: number,
    pageSize: number,
  ): Promise<UsersTeam[]>;
  getUserTeams(
    teamId: string,
    page: number,
    pageSize: number,
    userId?: string | '',
    status?: JoinTeamStatus | '',
    memberType?: MemberType | '',
  ): Promise<UsersTeam[]>;

  findUserByNameFromElastic(
    teamId: string,
    searchTeamMemberQuery: SearchTeamMemberQuery,
  ): Promise<UserInfoDto[]>;

  unlockMember(teamId: string, userId: string): Promise<void>;
}
