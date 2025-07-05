import { UserInfoDto } from '../../../../common/constants/common.constant';
import { ResponsePagination } from '../../../../common/pagination/pagination.dto';
import { IClubInfo } from '../../../clubs/interfaces/clubs.interface';
import { Role } from '../../../diaries/enum/diaries.enum';
import { UserTypes } from '../../../users/enum/user-types.enum';
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
  TeamTab,
  UnblockMembersTeamDto,
} from '../../dto/teams.req.dto';
import { TeamsRequestDto } from '../../dto/teams.request.dto';
import { TeamsResponseDto } from '../../dto/teams.response.dto';
import { Team } from '../../repositories/teams/team';
import { UsersTeam } from '../../repositories/users-teams/users-team';

export interface ITeamsMongoService {
  /**
   * Create a new team on MongoDB.
   * @param createTeamDto data need to create a new team
   */
  createTeam(createTeamDto: TeamsRequestDto): Promise<TeamsResponseDto>;

  /**
   * A new user want to have a new team for its own.
   * @param teamsRequestDto
   */
  createTeamWhenSignUp(
    teamsRequestDto: TeamsRequestDto,
  ): Promise<TeamsResponseDto>;

  /**
   * Block member in team. (it means: the blocked member can not join or be invited to team)
   * @param currentUserId admin's / owner's id
   * @param blockMemberTeamDto information need to block member
   */
  blockMember(
    currentUserId: string,
    blockMemberTeamDto: BlockMemberTeamDto,
    isAdmin: boolean,
  ): Promise<string>;

  /**
   * An user want to block a team. So this user will get out this team or delete join request. This user can not search or rejoin. Others can not invite this user anymore.
   * @param currentUserId user want to block team.
   * @param teamId the team will be block
   */
  blockTeam(currentUserId: string, teamId: string): Promise<string>;

  /**
   * Change status join of users-teams.
   * @param currentUserId Admin's id / Owner's id
   * @param changeStatusJoinTeamDto include: memberUserIds[].
   * @param changeStatusJoinTeamQuery includes: teamId and status to change.
   */
  changeStatusJoin(
    currentUserId: string,
    changeStatusJoinTeamDto: ChangeStatusJoinTeamDto,
    changeStatusJoinTeamQuery: ChangeStatusJoinTeamQuery,
    isAdmin: boolean,
  ): Promise<string>;

  /**
   * Cancel that user who have sent join-request.
   * @param currentUserId
   * @param teamId
   */
  cancelRequestJoinTeam(currentUserId: string, teamId: string): Promise<string>;

  /**
   * Unblock for many already blocked users.
   * @param userRoleId
   * @param unblockMembersTeamDto includes: memberIds[], teamId
   */
  unblockMember(
    userRoleId: string,
    unblockMembersTeamDto: UnblockMembersTeamDto,
    isAdmin: boolean,
  ): Promise<string>;

  /**
   * This user will unblock the blocked team.
   * @param currentUserId
   * @param teamId
   */
  unblockTeam(currentUserId: string, teamId: string): Promise<string>;

  /**
   * Current user leave this team.
   * After user is the owner, if team still have another member, that member will be a new owner, otherwise this team will be deleted.
   * @param currentUserId
   * @param teamId
   */
  leaveTeam(currentUserId: string, teamId: string): Promise<string>;

  searchTeamMember(
    userRoleId: string,
    teamId: string,
    searchTeamMemberQuery: SearchTeamMemberQuery,
  ): Promise<{
    data: UserInfoDto[];
    count: number;
  }>;

  /**
   * Update information of team.
   * @param currentUserId an admin or an owner of team
   * @param teamId
   * @param updateTeamDto updateed information
   * @param isAdmin boolean check is system admin or not.
   */
  updateTeam(
    currentUserId: string,
    teamId: string,
    updateTeamDto: TeamUpdateRequestDto,
    isAdmin: boolean,
  ): Promise<string>;

  /**
   * This is a so strange function.
   * It helps to finds member from whole teams that this user joined.
   * @param userRoleId  : currentUserId
   * @param getAllMembersInTeam includes: userType
   */
  getAllMemberFromJoinedTeams(
    userRoleId: string,
    getAllMembersInTeam: GetAllMembersInTeam,
  ): Promise<UserInfoDto[]>;

  /**
   * Get all team member's information of this team.
   * @param userRoleId
   * @param teamId
   * @param getTeamByIdQuery
   */
  getTeamMemberByTeamId(
    userRoleId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ): Promise<ResponsePagination<UserInfoDto>>;

  /**
   * Get user member by team tab.
   * @param tab
   * @param teamId
   * @param status
   * @param page
   * @param pageSize
   * @param memberType
   */
  getUserTeamsByTeamTab(
    tab: TeamTab,
    teamId: string,
    status: JoinTeamStatus,
    page: number,
    pageSize: number,
    memberType: MemberType,
  ): Promise<UsersTeam[]>;

  getTeamInforById(
    currentUserId: string,
    teamId: string,
  ): Promise<TeamInforResponseDto>;

  sendRequestJoinTeam(userId: string, teamId: string): Promise<void>;

  // This function just get user information.
  mapUserInformation(userIds: string[]): Promise<UserInfoDto[]>;
  // This function get user's information and memberType
  mappingDataMembers(data: any[], currentUserId: string);
  mappingTeamInfor(
    currentUserId: string,
    teamId: string,
  ): Promise<TeamInforResponseDto>;

  filterTeamMemberByRole(
    userInfors: UserInfoDto[],
    role: Role,
  ): Array<UserInfoDto>;

  generateTeamInforResponse<
    T extends {
      team: Team;
      memberType: MemberType;
      userIds: string[];
      club: IClubInfo;
    },
  >(
    input: T,
  ): TeamInforResponseDto;
  generateStatusAndMemberType(tab: TeamTab);

  validateJoinNotSameClub(userClubId: string, clubId: string): void;
  avoidPlayerJoinMoreThanFiveTeam(
    userType: UserTypes,
    userId: string,
  ): Promise<void>;

  checkBlockedTeam(userRoleId: string, teamId: string): Promise<boolean>;

  validatePermissionInTeam(
    currentUserId: string,
    teamId: string,
    isAdmin: boolean,
  ): Promise<void>;
  validateTeamExists(teamId: string): Promise<void>;
  validateTeamNameExisted(newTeamName: string): Promise<void>;
  validateBlockOrRemoveMember(currentUserId: string, memberId: string): void;
}
