import { DiaryService } from './../diaries/diaries.service';
import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as moment from 'moment';
import {
  AvgBMI,
  BestFootTypes,
  CacheId,
  ResponseMessage,
} from '../../common/constants/common.constant';
import { db } from '../../config/firebase.config';
import { aggregateSumByDate } from '../../utils/aggregate-sum-by-date';
import { calculatePercentChanged } from '../../utils/calculate-percent-change';
import {
  calculateArrow,
  ChangeValue,
  comparePercentChanges,
} from '../../utils/compare-percent-changes';
import { deleteNotFoundDocumentIndex } from '../../utils/delete-not-found-document-index-elastic';
import { setOfNearActiveSeasons } from '../../utils/get-current-seasons-array';
import { getDaysArray } from '../../utils/get-days-array';
import { mergeArray } from '../../utils/merge-array';
import { splitDate } from '../../utils/split-date-range';
import { AchievementsService } from '../achievements/achievements.service';
import { CountUserAchievementsDto } from '../achievements/dto/get-player-stats-trophies.dto';
import { CareersService } from '../careers/careers.service';
import { CareerTypes, GetCareersDto } from '../careers/dto/career.dto';
import { IHistoricCareerPlan } from '../careers/interfaces/career.interface';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  BaseQueryBuilder,
  DashboardQueryBuilder,
  DataChartByDateRange,
  DaysArray,
} from '../dashboard/dto/dashboard.req.dto';
import {
  MatchesHoursDto,
  MatchInTotalStatisticDto,
  MatchStatisticAverageDto,
  OutputMatchTab,
  OutputTrainingBio,
} from '../dashboard/dto/dashboard.res.dto';
import { DashBoardTab, LastDateRange } from '../dashboard/enum/dashboard-enum';
import { MediaDto } from '../diaries/dto/diary.dto';
import { TypeOfPost } from '../feed/dto/feed.req.dto';
import { FeedService } from '../feed/feed.service';
import {
  OutputCountFriendRelationship,
  OutputFriendRelationship,
} from '../friends/dto/friends.res.dto';
import { FriendsService } from '../friends/friends.service';
import { TeamsService } from '../teams/teams.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { ICoach } from '../users/interfaces/coaches.interface';
import { IPlayerOverallSkills } from '../users/interfaces/players.interface';
import { UsersService } from '../users/v1/users.service';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { CoachBioDto } from './dto/coach-bio-dto';
import { CoachBioStatsDto } from './dto/coach-bio-stats.dto';
import { Head2HeadDto } from './dto/head-2-head.dto';
import { PlayerBioStatsDto } from './dto/player-bio-stats.dto';
import { PlayerBioProfileDto, UserBioDto } from './dto/player-bio.dto';
import { QueryBioForFlippingDto } from './dto/query-bio-for-flipping.dto';
import { BioStatsTab } from './enum/bio-player-stats.enum';
import { TrendArrowsBioStats } from './enum/trend-arrows-bio.enum';
import { CoachBio } from './interfaces/coach-bio.interface';
import { UserForFlipping } from './interfaces/user-ids-flipping.interface';
import { BiographyBigQueryService } from './repositories/biography.repository';
import { SupporterBioDto } from './dto/supporter-bio-dto';
import { ISupporter } from '../users/interfaces/suppoters.inteface';
import { ClubService } from '../clubs/v1/clubs.service';
import { deleteNullValuesInArray } from '../../utils/delete-null-values-in-array';

import { getBioUrl } from '../../utils/get-bio-url';
import { PlayerRadar } from './dto/player-radar';
import { CoachRadar } from './dto/coach-radar';
import { UserUrlSEOResquest } from './dto/seo/user-url-SEO.request';
import { UserExercisesService } from '../programs/service/user-exercise/user-exercises.service';
import { UserTestService } from '../tests/service/user-test/user-test.service';
import { Status, TypeRequest } from '../friends/enum/friend.enum';

@Injectable()
export class BiographyService {
  constructor(
    @Inject(forwardRef(() => ClubService))
    private clubService: ClubService,
    private dashboardService: DashboardService,
    private careerService: CareersService,
    @Inject(forwardRef(() => AchievementsService))
    private achievementService: AchievementsService,
    private friendsService: FriendsService,
    private userService: UsersService,
    private teamsService: TeamsService,
    private biographyBigQueryService: BiographyBigQueryService,
    @Inject(forwardRef(() => FeedService))
    private feedService: FeedService,
    @Inject(forwardRef(() => DiaryService))
    private diaryService: DiaryService,

    private userExercisesService: UserExercisesService,
    private userTestService: UserTestService,
  ) {}

  async getVisitorStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    const data: DataChartByDateRange[] = [];
    let dayArrays: DaysArray[];
    const { lastDateRange } = baseQueryBuilder;

    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    let viewBiosRef = db
      .collection('view_biographies')
      .where('guestId', '==', currentUserId);

    let pastViewBiosRef = db
      .collection('view_biographies')
      .where('guestId', '==', currentUserId);

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      dayArrays = getDaysArray(fromDate, toDate);

      viewBiosRef = viewBiosRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);

      const pastFromDate = +moment
        .utc()
        .subtract(+lastDateRange * 2 - 1, 'd')
        .format('x');

      const pastToDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      pastViewBiosRef = pastViewBiosRef
        .where('createdAt', '>=', pastFromDate)
        .where('createdAt', '<=', pastToDate);
    }

    const [visitorSnapshot, pastOfVisitorSnapshot] = await Promise.all([
      viewBiosRef.get(),
      pastViewBiosRef.get(),
    ]);

    const visitorCount = visitorSnapshot.size;
    const pastOfVisitorCount = pastOfVisitorSnapshot.size;

    const percentChanged = calculatePercentChanged(
      pastOfVisitorCount,
      visitorCount,
    );

    visitorSnapshot.forEach((doc) => {
      data.push({
        value: 1,
        day: moment.utc(doc.data()?.createdAt).format('YYYY-MM-DD'),
      });
    });

    const result = aggregateSumByDate(data);

    const visitorChart = mergeArray(dayArrays, result);

    if (visitorChart.length >= 30) {
      return {
        count: visitorCount,
        chart: splitDate(visitorChart, lastDateRange),
        percentChanged,
      };
    }

    return { count: visitorCount, chart: visitorChart, percentChanged };
  }

  async getVisitsStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    const data: DataChartByDateRange[] = [];
    let dayArrays: DaysArray[];
    const { lastDateRange } = baseQueryBuilder;

    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    let viewBiosRef = db
      .collection('view_biographies')
      .where('visitorId', '==', currentUserId);

    let pastViewBiosRef = db
      .collection('view_biographies')
      .where('visitorId', '==', currentUserId);

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      dayArrays = getDaysArray(fromDate, toDate);

      viewBiosRef = viewBiosRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);

      const pastFromDate = +moment
        .utc()
        .subtract(+lastDateRange * 2 - 1, 'd')
        .format('x');

      const pastToDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      pastViewBiosRef = pastViewBiosRef
        .where('createdAt', '>=', pastFromDate)
        .where('createdAt', '<=', pastToDate);
    }

    const [visitsSnapshot, pastOfVisitsSnapshot] = await Promise.all([
      viewBiosRef.get(),
      pastViewBiosRef.get(),
    ]);

    const visitsCount = visitsSnapshot.size;
    const pastOfVisitsCount = pastOfVisitsSnapshot.size;

    const percentChanged = calculatePercentChanged(
      pastOfVisitsCount,
      visitsCount,
    );

    visitsSnapshot.forEach((doc) => {
      data.push({
        value: 1,
        day: moment.utc(doc.data()?.createdAt).format('YYYY-MM-DD'),
      });
    });

    const result = aggregateSumByDate(data);

    const visitsChart = mergeArray(dayArrays, result);

    if (visitsChart.length >= 30) {
      return {
        count: visitsCount,
        chart: splitDate(visitsChart, lastDateRange),
        percentChanged,
      };
    }

    return { count: visitsCount, chart: visitsChart, percentChanged };
  }

  async getVisitorLeaderBoard() {
    return this.biographyBigQueryService.getVisitorLeaderBoard();
  }

  async countVisitBiographies(currentUserId: string, lastDateRange: number) {
    return this.biographyBigQueryService.countVisitBiographies(
      currentUserId,
      lastDateRange,
    );
  }

  async countVisitorBiographies(currentUserId: string, lastDateRange: number) {
    return this.biographyBigQueryService.countVisitorBiographies(
      currentUserId,
      lastDateRange,
    );
  }

  async countViewsBio(currentUserId: string, userId: string) {
    if (currentUserId !== userId) {
      return db.collection('view_biographies').add({
        visitorId: currentUserId,
        guestId: userId,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      });
    }
  }

  async getSupporterBio(currentUserId: string, userBioDto?: UserBioDto) {
    const { userIdQuery, username } = userBioDto;

    const friendRelationship = new OutputFriendRelationship();

    const friendUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    if (friendUserId && currentUserId) {
      const [getFriendRelationship] = await Promise.all([
        this.friendsService.getFriendRelationship(friendUserId, currentUserId),
        this.countViewsBio(currentUserId, friendUserId),
      ]);

      friendRelationship.friendStatus = getFriendRelationship.friendStatus;
      friendRelationship.followStatus = getFriendRelationship.followStatus;
      friendRelationship.isConfirmBox = getFriendRelationship.isConfirmBox;
      friendRelationship.isFollowed = getFriendRelationship.isFollowed;
    }

    const userIdForQuery = friendUserId ? friendUserId : currentUserId;

    const [getCountRelationship, supporterBio] = await Promise.all([
      this.friendsService.getCountRelationshipFromMongo(userIdForQuery),
      this.getFormattedSupporterBio(userIdForQuery),
    ]);
    const textSEO = await this.getSupporterBioForSEOV2(
      supporterBio,
      getCountRelationship,
    );

    const countFriendRelationship = new OutputCountFriendRelationship();
    countFriendRelationship.friendCount = getCountRelationship.friendCount;
    countFriendRelationship.followCount = getCountRelationship.followCount;
    countFriendRelationship.fanCount = getCountRelationship.fanCount;

    return {
      ...friendRelationship,
      ...countFriendRelationship,
      ...supporterBio,
      textSEO,
    };
  }

  async getCoachBio(currentUserId: string, userBioDto?: UserBioDto) {
    const { userIdQuery, username } = userBioDto;

    const friendRelationship = new OutputFriendRelationship();

    const friendUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    if (friendUserId && currentUserId) {
      const [getFriendRelationship] = await Promise.all([
        this.friendsService.getFriendRelationship(friendUserId, currentUserId),
        this.countViewsBio(currentUserId, friendUserId),
      ]);

      friendRelationship.friendStatus = getFriendRelationship.friendStatus;
      friendRelationship.followStatus = getFriendRelationship.followStatus;
      friendRelationship.isConfirmBox = getFriendRelationship.isConfirmBox;
      friendRelationship.isFollowed = getFriendRelationship.isFollowed;
    }

    const userIdForQuery = friendUserId ? friendUserId : currentUserId;

    const countCoachAchievementDto = {
      userId: userIdForQuery,
      userType: UserTypes.COACH,
    };

    const [
      getCountRelationship,
      coachBio,
      activeSeasons,
      totalTrophies,
      totalAwards,
      totalCaps,
    ] = await Promise.all([
      this.friendsService.getCountRelationshipFromMongo(userIdForQuery),
      this.getFormattedCoachBio(userIdForQuery),
      this.getListOfActiveSeason(userIdForQuery),
      this.achievementService.countTotalTrophies(countCoachAchievementDto),
      this.achievementService.countCoachTotalAwards(countCoachAchievementDto),
      this.achievementService.countTotalCaps(countCoachAchievementDto),
    ]);

    const lastMatch = coachBio.lastMatch;
    const lastTraining = coachBio.lastTraining;

    const listOfActiveSeasons = {
      activeSeasons,
    };

    const countFriendRelationship = new OutputCountFriendRelationship();
    countFriendRelationship.friendCount = getCountRelationship.friendCount;
    countFriendRelationship.followCount = getCountRelationship.followCount;
    countFriendRelationship.fanCount = getCountRelationship.fanCount;

    const textSEO = this.getCoachBioForSEOV2(
      coachBio,
      getCountRelationship,
      lastTraining,
      lastMatch,
    );

    return {
      ...friendRelationship,
      ...countFriendRelationship,
      ...coachBio,
      ...listOfActiveSeasons,
      textSEO,
      totalTrophies,
      totalAwards,
      totalCaps,
    };
  }

  async getFormattedSupporterBio(userId: string) {
    const supporterBio = new SupporterBioDto();

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      await deleteNotFoundDocumentIndex({
        indexName: 'users',
        documentId: userId,
      });

      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData: ISupporter = userDoc.data();

    if (!userData) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userData.type !== UserTypes.SUPPORTER) {
      throw new HttpException('UserId does not valid', HttpStatus.BAD_REQUEST);
    }

    const {
      profile,
      supporterFootball,
      media,
      username,
      socialLinks,
      circleCompleted,
      health,
    } = userData;

    supporterBio.userId = userDoc.id;
    supporterBio.lastUpdatedDate =
      moment(userData?.updatedAt).format('YYYY-MM-DD') || null;
    supporterBio.username = username || null;
    supporterBio.firstName = profile?.firstName || null;
    supporterBio.lastName = profile?.lastName || null;
    supporterBio.faceImageUrl = media?.faceImage || null;
    supporterBio.position = supporterFootball?.role || null;
    supporterBio.countryFlagUrl = profile.birthCountry.flag || null;
    supporterBio.birthDay = this.formatBirthDay(profile?.birthDay) || null;
    supporterBio.age = this.calculateAge(profile?.birthDay) || null;
    supporterBio.summary = supporterFootball?.summary || null;
    supporterBio.topVideoLinks = media?.videoLinks || [];
    supporterBio.circleCompleted = circleCompleted;
    supporterBio.socialLinks = socialLinks || null;
    supporterBio.userRole = userData.type;
    supporterBio.year = profile.birthDay
      ? new Date(profile.birthDay).getFullYear()
      : null;
    supporterBio.city = profile?.city || null;
    supporterBio.country = profile?.birthCountry.name || null;
    supporterBio.height = health?.height?.value || null;
    supporterBio.weight = health?.weight?.value || null;
    supporterBio.favoriteClubs = supporterFootball?.favoriteClubs;
    supporterBio.favoritePlayers = supporterFootball?.favoritePlayers;
    //# fix: error 500 server when exists null values in array => need to delete all null values
    const favoriteClubsArray = deleteNullValuesInArray(
      supporterFootball?.favoriteClubs,
    );
    const favoritePlayersArray = deleteNullValuesInArray(
      supporterFootball?.favoritePlayers,
    );

    supporterBio.supportingClubIconUrls =
      (await this.getSupportingClubs(favoriteClubsArray)) || [];
    supporterBio.supportingUserAvatarUrls =
      (await this.getSupportingUsers(favoritePlayersArray)) || [];
    // supporterBio.supportingClugetSupportingUsersbIconUrls =
    //   (await this.getSupportingClubs(supporterFootball?.favoriteClubs)) || [];
    // supporterBio.supportingUserAvatarUrls =
    //   (await this.getSupportingUsers(supporterFootball?.favoritePlayers)) || [];

    supporterBio.bioUrl = getBioUrl({
      type: UserTypes.SUPPORTER,
      username,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
    });

    return supporterBio;
  }

  async getFormattedCoachBio(userId: string): Promise<CoachBio> {
    const coachBio = new CoachBioDto();

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      await deleteNotFoundDocumentIndex({
        indexName: 'users',
        documentId: userId,
      });

      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData: ICoach = userDoc.data();
    if (!userData) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (userData.type !== UserTypes.COACH) {
      throw new HttpException('UserId does not valid', HttpStatus.BAD_REQUEST);
    }

    const {
      profile,
      coachCareer,
      coachSkills,
      media,
      username,
      socialLinks,
      circleCompleted,
      teamIds,
    } = userData;

    const getClub = await this.clubService.getClubByIdFromMongo(
      coachCareer.clubId,
    );

    coachBio.userId = userDoc.id;
    coachBio.lastUpdatedDate =
      moment(userData?.updatedAt).format('YYYY-MM-DD') || null;
    coachBio.username = username || null;
    coachBio.firstName = profile?.firstName || null;
    coachBio.lastName = profile?.lastName || null;
    coachBio.faceImageUrl = media?.faceImage || null;
    // not absolutely correct now but will be updated later
    coachBio.starRating =
      this.calculateStarRating(coachSkills?.overall) || null;
    coachBio.position = coachCareer?.role || null;

    // not absolutely correct now but will be updated later
    coachBio.currentClub = getClub?.clubName ?? '';
    coachBio.currentClubIconUrl = getClub?.logoUrl || null;

    coachBio.contractedUntil =
      moment(coachCareer?.contractedUntil).format('YYYY/MM') || null;

    coachBio.education = coachCareer?.highestCoachingEducation || null;
    coachBio.expLevel = coachCareer?.expLevel || null;
    coachBio.managementStyle = coachCareer?.managementStyle || null;
    coachBio.managementType = coachCareer?.managementType || null;
    coachBio.countryFlagUrl = profile.birthCountry.flag || null;
    coachBio.birthDay = this.formatBirthDay(profile?.birthDay) || null;
    coachBio.age = this.calculateAge(profile?.birthDay) || null;
    coachBio.summary = coachCareer?.summary || null;
    coachBio.topVideoLinks = media?.videoLinks || [];
    coachBio.coachRadarSkills = coachSkills?.radar || null;
    coachBio.specialities = coachSkills?.specialityTags || null;
    coachBio.circleCompleted = circleCompleted ? circleCompleted : 50;
    coachBio.socialLinks = socialLinks || null;
    coachBio.year = profile.birthDay
      ? new Date(profile?.birthDay).getFullYear()
      : null;
    coachBio.city = profile?.city || null;
    coachBio.userRole = userData.type;
    coachBio.teamIds = teamIds || [];
    coachBio.clubId = coachCareer?.clubId || null;
    // const getClub = await this.clubService.getClubById(coachCareer?.clubId);
    coachBio.currentClub = coachCareer?.contractedClub?.clubName || null;
    const currentTeam =
      coachCareer?.currentTeams?.length > 0
        ? JSON.parse(JSON.stringify(coachCareer.currentTeams[0]))
        : null;

    coachBio.country = profile?.birthCountry?.name || null;
    coachBio.lastMatch = userData?.lastMatch || null;
    coachBio.lastTraining = userData?.lastTraining || null;

    coachBio.currentTeamName = currentTeam?.teamName || null;
    coachBio.primaryTeam = null;
    coachBio.bioUrl = getBioUrl({
      type: UserTypes.COACH,
      username,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
    });
    coachBio.clubs = coachCareer.clubs;

    if (coachCareer?.primaryTeamId) {
      const { primaryTeamId: teamId } = coachCareer;

      const teamInfo = await this.teamsService.getTeamById(userId, teamId);
      coachBio.primaryTeam = teamInfo;
    }
    coachBio.favoriteRoles = [coachCareer?.role];
    return coachBio;
  }

  async getUserIdFromUsername(username: string) {
    let userId: string;

    const usernameAfterNormalized = username
      // remove spaces
      .replace(/\s/g, '')
      // remove special characters
      .normalize('NFC')
      .replace(/[\u0300-\u036f]/g, '');

    const userRef = await db
      .collection('users')
      .where('username', '==', usernameAfterNormalized)
      .get();

    if (userRef.empty) {
      throw new HttpException('Username not found', HttpStatus.NOT_FOUND);
    }

    userRef.forEach((user) => {
      userId = user.data()?.userId;
    });

    if (!userId) {
      throw new HttpException('Username is invalid', HttpStatus.NOT_FOUND);
    }
    return userId;
  }

  async getPlayerBio(
    currentUserId: string,
    userBioDto?: UserBioDto,
  ): Promise<PlayerBioProfileDto> {
    const { userIdQuery, username } = userBioDto;

    const friendRelationship = new OutputFriendRelationship();

    const friendUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    if (friendUserId && currentUserId) {
      const { friendStatus, followStatus, isConfirmBox, isFollowed } =
        await this.friendsService.getFriendRelationship(
          friendUserId,
          currentUserId,
        );

      await this.countViewsBio(currentUserId, friendUserId);

      friendRelationship.friendStatus = friendStatus;
      friendRelationship.followStatus = followStatus;
      friendRelationship.isConfirmBox = isConfirmBox;
      friendRelationship.isFollowed = isFollowed;
    }

    const userIdForQuery = friendUserId ? friendUserId : currentUserId;

    const [getCountRelationship, playerBio, activeSeasons] = await Promise.all([
      this.friendsService.getCountRelationship(userIdForQuery),
      this.getFormattedPlayerBio(userIdForQuery),
      this.getListOfActiveSeason(userIdForQuery),
    ]);

    const listOfActiveSeasons = {
      activeSeasons,
    };

    const countFriendRelationship = new OutputCountFriendRelationship();
    countFriendRelationship.friendCount = getCountRelationship.friendCount;
    countFriendRelationship.followCount = getCountRelationship.followCount;
    countFriendRelationship.fanCount = getCountRelationship.fanCount;

    return {
      ...friendRelationship,
      ...countFriendRelationship,
      ...playerBio,
      ...listOfActiveSeasons,
    };
  }

  async getPlayerBioV2(
    currentUserId?: string,
    userBioDto?: UserBioDto,
  ): Promise<PlayerBioProfileDto> {
    const { userIdQuery, username } = userBioDto;
    console.log(username)
    const friendRelationship = new OutputFriendRelationship();

    const friendUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    if (friendUserId && currentUserId) {
      const {
        friendStatus,
        followStatus,
        isConfirmBox,
        isFollowed,
        isHead2Head,
      } = await this.friendsService.getFriendRelationship(
        friendUserId,
        currentUserId,
      );

      await this.countViewsBio(currentUserId, friendUserId);

      friendRelationship.friendStatus = friendStatus;
      friendRelationship.followStatus = followStatus;
      friendRelationship.isConfirmBox = isConfirmBox;
      friendRelationship.isFollowed = isFollowed;
      friendRelationship.isHead2Head = isHead2Head;
    }

    const userIdForQuery = friendUserId ? friendUserId : currentUserId;

    const countUserAchievementDto: CountUserAchievementsDto = {
      userId: userIdForQuery,
      userType: UserTypes.PLAYER,
    };

    const [
      getCountRelationship,
      playerBio,
      activeSeasons,
      totalTrophies,
      totalAwards,
      totalCaps,
      totalProgram,
      totalTests,
    ] = await Promise.all([
      this.friendsService.getCountRelationshipFromMongo(userIdForQuery),
      this.getFormattedPlayerBioV2(userIdForQuery),
      this.getListOfActiveSeason(userIdForQuery),
      this.achievementService.countTotalTrophies(countUserAchievementDto),
      this.achievementService.countPlayerTotalAwards(countUserAchievementDto),
      this.achievementService.countTotalCaps(countUserAchievementDto),
      this.userExercisesService.statisticalProgramDone(userIdForQuery),
      this.userTestService.statisticalTotalTestsVerified(userIdForQuery),
    ]);
    const lastMatch = playerBio.lastMatch;
    const lastTraining = playerBio.lastTraining;

    const textSEO: string = this.getPlayerBioForSEOV2(
      playerBio,
      getCountRelationship,
      userIdForQuery,
      lastTraining,
      lastMatch,
    );

    // caculate estimated Height and Weight
    const { estimatedHeight, estimatedWeight } =
      this.estimateHeightAndWeight(playerBio);

    const listOfActiveSeasons = {
      activeSeasons,
    };

    const countFriendRelationship = new OutputCountFriendRelationship();
    countFriendRelationship.friendCount = getCountRelationship.friendCount;
    countFriendRelationship.followCount = getCountRelationship.followCount;
    countFriendRelationship.fanCount = getCountRelationship.fanCount;

    return {
      ...friendRelationship,
      ...countFriendRelationship,
      ...playerBio,
      ...listOfActiveSeasons,
      estimatedHeight,
      estimatedWeight,
      textSEO,
      totalTrophies,
      totalAwards,
      totalCaps,
      totalProgram,
      totalTests,
    };
  }

  estimateHeightAndWeight(playerBio: PlayerBioProfileDto) {
    const { fatherHeight, motherHeight } = playerBio;

    let parentsHeight: number =
      fatherHeight && motherHeight
        ? fatherHeight > motherHeight
          ? fatherHeight
          : motherHeight
        : null;

    let estimatedHeight: number = null;
    let estimatedWeight: number = null;

    if (parentsHeight) {
      parentsHeight = parentsHeight / 100;
      estimatedWeight = Math.round(AvgBMI * Math.pow(parentsHeight, 2));
      estimatedHeight = Math.round(Math.sqrt(estimatedWeight / AvgBMI) * 100);
    }
    return { estimatedHeight, estimatedWeight };
  }

  async getFormattedPlayerBio(userId: string) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      await deleteNotFoundDocumentIndex({
        indexName: 'users',
        documentId: userId,
      });

      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userDoc.data();

    if (userData.type !== UserTypes.PLAYER) {
      throw new HttpException('UserId does not valid', HttpStatus.BAD_REQUEST);
    }

    const playerBio = new PlayerBioProfileDto();

    const {
      profile,
      playerCareer,
      health,
      playerSkills,
      media,
      username,
      socialLinks,
      circleCompleted,
      settings,
      skillsUpdatedByCoach,
      teamIds,
    } = userData;

    const getClub = await this.clubService.getClubById(playerCareer.clubId);

    playerBio.userId = userDoc.id;
    playerBio.lastUpdatedDate =
      moment(userData?.updatedAt).format('YYYY-MM-DD') || null;
    playerBio.username = username || null;
    playerBio.firstName = profile?.firstName || null;
    playerBio.lastName = profile?.lastName || null;
    playerBio.faceImageUrl = media?.faceImage || null;
    playerBio.bodyImageUrl = media?.bodyImage || null;
    // not absolutely correct now but will be updated later
    playerBio.starRating =
      this.calculateStarRating(playerSkills?.overall) || null;
    playerBio.circleCompleted = circleCompleted ? circleCompleted : 50;
    playerBio.position = playerCareer?.favoriteRoles[0] || null;
    // set null for now and will update later
    playerBio.currentClubIconUrl = await this.getClubLogoUrl(
      playerCareer?.clubId,
    );
    playerBio.currentClub = getClub?.clubName;
    playerBio.contractedUntil =
      moment(playerCareer?.contractedUntil).format('YYYY/MM') || null;

    // will update marketValue later
    playerBio.estMarketValue = playerCareer?.estMarketValue || null;
    playerBio.leftFoot = playerSkills?.overall?.leftFoot || 0;
    playerBio.rightFoot = playerSkills?.overall?.rightFoot || 0;
    playerBio.bestFoot =
      this.checkBestFoot(playerBio.leftFoot, playerBio.rightFoot) || null;
    playerBio.height = health?.height?.value || null;
    playerBio.weight = health?.weight?.value || null;
    playerBio.fatherHeight = health?.fatherHeight || null;
    playerBio.motherHeight = health?.motherHeight || null;
    playerBio.countryFlagUrl = profile?.birthCountry?.flag || null;
    playerBio.country = profile?.birthCountry?.name || null;
    playerBio.city = profile?.city || null;
    playerBio.birthDay = this.formatBirthDay(profile?.birthDay) || null;
    playerBio.year = new Date(profile?.birthDay).getFullYear() || null;
    playerBio.age = this.calculateAge(profile?.birthDay) || null;
    playerBio.summary = playerCareer?.summary || null;
    playerBio.socialLinks = socialLinks || null;
    playerBio.topVideoLinks = media?.videoLinks || [];
    playerBio.playerRadarSkills = playerSkills?.radar || null;
    playerBio.playerRadarGKSkills = playerSkills?.radar_gk || null;
    // if no value, set default to 0
    playerBio.radarUpdatedByCoach = skillsUpdatedByCoach?.playerSkills
      ?.radar || {
      attacking: 0,
      defending: 0,
      dribbling: 0,
      passing: 0,
      shooting: 0,
      pace: 0,
      tackling: 0,
      heading: 0,
    };
    playerBio.radarGKUpdatedByCoach = skillsUpdatedByCoach?.playerSkills
      ?.radar_gk || {
      vision: 0,
      communication: 0,
      ball_control: 0,
      passing: 0,
      aerial_win: 0,
      shot_dive: 0,
      agility: 0,
      reactions: 0,
    };
    playerBio.specialities = playerSkills?.specialityTags || null;
    playerBio.isPublic = settings?.public;
    playerBio.userRole = userData.type;
    playerBio.teamIds = teamIds || [];
    playerBio.clubId = playerCareer?.clubId;
    playerBio.primaryTeam = null;
    playerBio.bioUrl = getBioUrl({
      type: UserTypes.PLAYER,
      username,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
    });
    playerBio.lastMatch = userData?.lastMatch || null;
    playerBio.lastTraining = userData?.lastTraining || null;

    if (playerCareer?.primaryTeamId) {
      const { primaryTeamId: teamId } = playerCareer;

      const teamInfo = await this.teamsService.getTeamForBio(userId, teamId);
      playerBio.primaryTeam = teamInfo;
    }

    playerBio.favoriteRoles = playerCareer?.favoriteRoles || [];

    return playerBio;
  }

  async getFormattedPlayerBioV2(userId: string) {
    const userDoc = await db
      .collection('users')
      .where('userId', '==', userId)
      .get();
    if (userDoc.empty) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userDoc.docs[0].data() as FirebaseFirestore.DocumentData;

    if (userData.type !== UserTypes.PLAYER) {
      throw new HttpException('UserId does not valid', HttpStatus.BAD_REQUEST);
    }

    const playerBio = new PlayerBioProfileDto();

    const {
      profile,
      playerCareer,
      health,
      playerSkills,
      media,
      username,
      socialLinks,
      circleCompleted,
      settings,
      skillsUpdatedByCoach,
      teamIds,
      sponsor,
    } = userData;

    const getClub = await this.clubService.getClubByIdFromMongo(
      playerCareer.clubId,
    );

    playerBio.userId = userData.userId;
    playerBio.lastUpdatedDate =
      moment(userData?.updatedAt).format('YYYY-MM-DD') || null;
    playerBio.username = username || null;
    playerBio.firstName = profile?.firstName || null;
    playerBio.lastName = profile?.lastName || null;
    playerBio.faceImageUrl = media?.faceImage || null;
    playerBio.bodyImageUrl = media?.bodyImage || null;
    // not absolutely correct now but will be updated later
    playerBio.starRating =
      this.calculateStarRating(playerSkills?.overall) || null;
    playerBio.circleCompleted = circleCompleted ? circleCompleted : 50;
    playerBio.position = Array.isArray(playerCareer?.favoriteRoles)
      ? playerCareer?.favoriteRoles[0]
      : null;
    // set null for now and will update later
    // playerBio.currentClubIconUrl = await this.getClubLogoUrl(
    //   playerCareer?.clubId,
    // );
    playerBio.currentClubIconUrl = getClub.logoUrl;
    playerBio.currentClub = getClub?.clubName;
    playerBio.contractedUntil =
      moment(playerCareer?.contractedUntil).format('YYYY/MM') || null;

    // will update marketValue later
    playerBio.estMarketValue = playerCareer?.estMarketValue || null;
    playerBio.leftFoot = playerSkills?.overall?.leftFoot || 0;
    playerBio.rightFoot = playerSkills?.overall?.rightFoot || 0;
    playerBio.bestFoot =
      this.checkBestFoot(playerBio.leftFoot, playerBio.rightFoot) || null;
    playerBio.height = health?.height?.value || null;
    playerBio.weight = health?.weight?.value || null;
    playerBio.fatherHeight = health?.fatherHeight || null;
    playerBio.motherHeight = health?.motherHeight || null;
    playerBio.countryFlagUrl = profile?.birthCountry?.flag || null;
    playerBio.country = profile?.birthCountry?.name || null;
    playerBio.city = profile?.city || null;
    playerBio.birthDay = this.formatBirthDay(profile?.birthDay) || null;
    playerBio.year = new Date(profile?.birthDay).getFullYear() || null;
    playerBio.age = this.calculateAge(profile?.birthDay) || null;
    playerBio.summary = playerCareer?.summary || null;
    playerBio.socialLinks = socialLinks || null;
    playerBio.topVideoLinks = media?.videoLinks || [];
    playerBio.playerRadarSkills = playerSkills?.radar || null;
    playerBio.playerRadarGKSkills = playerSkills?.radar_gk || null;
    // if no value, set default to 0
    playerBio.radarUpdatedByCoach = skillsUpdatedByCoach?.playerSkills
      ?.radar || {
      attacking: 0,
      defending: 0,
      dribbling: 0,
      passing: 0,
      shooting: 0,
      pace: 0,
      tackling: 0,
      heading: 0,
    };
    playerBio.radarGKUpdatedByCoach = skillsUpdatedByCoach?.playerSkills
      ?.radar_gk || {
      vision: 0,
      communication: 0,
      ball_control: 0,
      passing: 0,
      aerial_win: 0,
      shot_dive: 0,
      agility: 0,
      reactions: 0,
    };
    playerBio.specialities = playerSkills?.specialityTags || null;
    playerBio.isPublic = settings?.public;
    playerBio.userRole = userData.type;
    playerBio.teamIds = teamIds || [];
    playerBio.clubId = playerCareer?.clubId;
    playerBio.primaryTeam = null;
    playerBio.bioUrl = getBioUrl({
      type: UserTypes.PLAYER,
      username,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
    });
    playerBio.lastMatch = userData?.lastMatch || null;
    playerBio.lastTraining = userData?.lastTraining || null;
    playerBio.clubs = playerCareer?.clubs ?? [];

    if (playerCareer?.primaryTeamId) {
      const { primaryTeamId: teamId } = playerCareer;

      const teamInfo = await this.teamsService.getTeamForBio(userId, teamId);
      playerBio.primaryTeam = teamInfo;
    }

    playerBio.favoriteRoles = playerCareer?.favoriteRoles || [];
    playerBio.summaryUpdatedByCoach = skillsUpdatedByCoach?.summary;
    playerBio.specialityTagsUpdatedByCoach =
      skillsUpdatedByCoach?.specialityTags;

    playerBio.sponsor = sponsor || null;

    return playerBio;
  }

  getCoachBioForSEOV2(
    coachBio: CoachBio,
    getCountRelationship,
    lastTrainings,
    lastMatches,
  ): string {
    const {
      firstName,
      lastName,
      year,
      city,
      country,
      //# TODO: dang ko co currentClub va primaryTeam
      currentClub,
      currentTeamName,
      position,
      bioUrl,
      managementStyle,
      education,
      expLevel,
    } = coachBio;

    let basicText = `${firstName} ${lastName} born ${year} in ${city}, ${country} are ${position}`;
    basicText += currentClub ? ` in ${currentClub} ${currentTeamName}` : '';

    const eduText = `${firstName} has a ${education} education, ${managementStyle} leadership style and ${expLevel} experience level`;

    const { friendCount, fanCount, followCount } = getCountRelationship;
    const followsText: string = this.formatFollowsText(
      firstName,
      friendCount,
      fanCount,
      followCount,
    );
    const lastTrainingText = this.getLastTraining(firstName, lastTrainings);
    const lastMatchText = this.getLastMatch(firstName, lastName, lastMatches);
    const urlText = `${firstName} unique url on Zporter are ${bioUrl}`;

    const arrayText = [
      basicText,
      eduText,
      followsText,
      lastTrainingText,
      lastMatchText,
      urlText,
    ].filter((e) => e != null && e != '');

    return arrayText.join('. ');
  }

  async getCoachBioForSEO(
    currentUserId: string,
    userName: string,
  ): Promise<string> {
    //# get playerId
    let userIdFromUserName: string;
    if (userName) {
      const user = await db
        .collection('users')
        .where('username', '==', userName)
        .get();

      userIdFromUserName =
        user.docs.length > 0 ? user.docs[0].data().userId : null;
    }
    const coachId = currentUserId ? currentUserId : userIdFromUserName;

    //# throw exception if coachId is undefined
    if (!coachId) {
      throw new HttpException(
        ResponseMessage.Biography.GET_PLAYER_SEO_TEXT_FAIL,
        HttpStatus.BAD_REQUEST,
      );
    }
    //# get infor from player profile
    const coachBio: CoachBio = await this.getFormattedCoachBio(coachId);
    const {
      firstName,
      lastName,
      year,
      city,
      country,
      //# TODO: dang ko co currentClub va primaryTeam
      currentClub,
      currentTeamName,
      position,
      bioUrl,
      managementStyle,
      education,
      expLevel,
    } = coachBio;

    //# get Friends, Fans, Follows
    const [countRelationship, lastTrainingText, lastMatchText] =
      await Promise.all([
        this.friendsService.getCountRelationship(coachId),
        this.getLastTraining(coachId, firstName),
        this.getLastMatch(coachId, firstName, lastName),
      ]);

    const { friendCount, fanCount, followCount } = countRelationship;

    let basicText = `${firstName} ${lastName} born ${year} in ${city}, ${country} are ${position}`;
    basicText += currentClub ? ` in ${currentClub} ${currentTeamName}.` : '.';

    const eduText = `${firstName} has a ${education} education, ${managementStyle} leadership style and ${expLevel} experience level.`;

    const followsText: string = this.formatFollowsText(
      firstName,
      friendCount,
      fanCount,
      followCount,
    );

    return (
      `${basicText} ${eduText} ${followsText}\n` +
      `${lastTrainingText} ${lastMatchText} ${firstName} unique url on Zporter are ${bioUrl}`
    );
  }
  async getSupporterBioForSEOV2(
    supporterBio: SupporterBioDto,
    getCountRelationship,
  ): Promise<string> {
    const {
      firstName,
      lastName,
      year,
      city,
      country,
      userRole,
      favoriteClubs,
      favoritePlayers,
      summary,
    } = supporterBio;
    //# get Friends, Fans, Follows, club and players
    const queryClubs = favoriteClubs.map((element) => {
      return this.clubService.getClubById(element);
    });

    const queryPlayers = favoritePlayers.map(async (element) => {
      if (!element) return;

      const query = await db.collection('users').doc(element).get();
      if (query.exists) {
        return query.data().username;
      }
    });
    const [clubs, users] = await Promise.all([
      Promise.all(queryClubs),
      Promise.all(queryPlayers),
    ]);

    const { friendCount, fanCount, followCount } = getCountRelationship;
    let basicText = `${firstName} ${lastName} born ${year} in ${city}, ${country} are ${userRole}`;
    basicText +=
      clubs.length >= 2
        ? ` to ${clubs[0].clubName} to ${clubs[1]?.clubName}`
        : clubs.length == 1
        ? ` to ${clubs[0]?.clubName}`
        : '';

    const followsText: string = this.formatFollowsText(
      firstName,
      friendCount,
      fanCount,
      followCount,
    );

    let supportUsersText = `${firstName}`;
    supportUsersText +=
      users.length >= 2
        ? ` also supports ${users[0]} ${users[1]}`
        : users.length == 1
        ? ` also supports ${users[0]}`
        : '';
    supportUsersText += summary ? ` and describes himself as ${summary}` : '';

    const arrayText = [basicText, supportUsersText, followsText].filter(
      (e) => e != null && e != '',
    );

    return arrayText.join('. ');
  }
  async getSupporterBioForSEO(
    currentUserId: string,
    userName: string,
  ): Promise<string> {
    //# get playerId
    let userIdFromUserName: string;
    if (userName) {
      const user = await db
        .collection('users')
        .where('username', '==', userName)
        .get();

      userIdFromUserName =
        user.docs.length > 0 ? user.docs[0].data().userId : null;
    }
    const supporterId = currentUserId ? currentUserId : userIdFromUserName;

    //# throw exception if supporterId is undefined
    if (!supporterId) {
      throw new HttpException(
        ResponseMessage.Biography.GET_PLAYER_SEO_TEXT_FAIL,
        HttpStatus.BAD_REQUEST,
      );
    }

    //# get infor from player profile
    const supporterBio: SupporterBioDto = await this.getFormattedSupporterBio(
      currentUserId,
    );
    const {
      firstName,
      lastName,
      year,
      city,
      country,
      userRole,
      favoriteClubs,
      favoritePlayers,
      summary,
    } = supporterBio;

    //# get Friends, Fans, Follows, club and players
    const queryClubs = favoriteClubs.map((element) => {
      return this.clubService.getClubById(element);
    });
    const queryPlayers = favoritePlayers.map(async (element) => {
      if (!element) return;
      const query = await db.collection('users').doc(element).get();
      if (query.exists) {
        return query.data().username;
      }
    });
    const [countRelationship, clubs, users] = await Promise.all([
      this.friendsService.getCountRelationship(supporterId),
      Promise.all(queryClubs),
      Promise.all(queryPlayers),
    ]);

    const { friendCount, fanCount, followCount } = countRelationship;
    let basicText = `${firstName} ${lastName} born ${year} in ${city}, ${country} are ${userRole}`;
    basicText +=
      clubs.length >= 2
        ? ` to ${clubs[0].clubName} to ${clubs[1]?.clubName}.`
        : clubs.length == 1
        ? ` to ${clubs[0]?.clubName}.`
        : '.';

    const followsText: string = this.formatFollowsText(
      firstName,
      friendCount,
      fanCount,
      followCount,
    );

    let supportUsersText = `${firstName}`;
    supportUsersText +=
      users.length >= 2
        ? ` also supports ${users[0]} ${users[1]}`
        : users.length == 1
        ? ` also supports ${users[0]}`
        : '';
    supportUsersText += summary ? ` and describes himself as ${summary}.` : '.';

    return `${basicText} ${supportUsersText} ${followsText}`;
  }
  getPlayerBioForSEOV2(
    playerBio,
    countRelationship: OutputCountFriendRelationship,
    playerId: string,
    lastTrainings,
    lastMatches,
  ): string {
    const {
      firstName,
      lastName,
      year,
      city,
      country,
      userRole,
      currentClub,
      primaryTeam,
      height,
      weight,
      summary,
      bioUrl,
    } = playerBio;
    const teamName = primaryTeam?.teamName || '';

    //# get lastMatch, lastTraining and Friends, Fans, Follows
    const lastTrainingText = this.getLastTraining(firstName, lastTrainings);
    const lastMatchText = this.getLastMatch(firstName, lastName, lastMatches);

    const { friendCount, fanCount, followCount } = countRelationship;
    const basicText = this.formatBasicSEOText(
      firstName,
      lastName,
      year,
      city,
      country,
      userRole,
      currentClub,
      teamName,
    );
    const heightWeightText = this.formatHieghtWeightSEOText(
      firstName,
      height,
      weight,
      summary,
    );

    const relationshipText = `${firstName} has ${friendCount} Friends, ${fanCount} Fans and Follows ${followCount} on Zporter.co`;
    const urlText = `${firstName} unique url on Zporter are ${bioUrl}`;

    const arrayText = [
      basicText,
      heightWeightText,
      relationshipText,
      lastTrainingText,
      lastMatchText,
      urlText,
    ].filter((e) => e != null && e != '');

    return arrayText.join('. ');
  }

  async getPlayerBioForSEO(
    currentUserId: string,
    userName: string,
  ): Promise<string> {
    //# get playerId
    let userIdFromUserName;
    if (userName) {
      const user = await db
        .collection('users')
        .where('username', '==', userName)
        .get();

      userIdFromUserName =
        user.docs.length > 0 ? user.docs[0].data().userId : null;
    }
    const playerId = currentUserId ? currentUserId : userIdFromUserName;

    //# throw exception if playerId is undefined
    if (!playerId) {
      throw new HttpException(
        ResponseMessage.Biography.GET_PLAYER_SEO_TEXT_FAIL,
        HttpStatus.BAD_REQUEST,
      );
    }
    //# get infor from player profile
    const playerBio = await this.getFormattedPlayerBio(playerId);
    const {
      firstName,
      lastName,
      year,
      city,
      country,
      userRole,
      currentClub,
      primaryTeam,
      height,
      weight,
      summary,
      bioUrl,
    } = playerBio;
    const teamName = primaryTeam ? primaryTeam.teamName : null;

    //# get lastMatch, lastTraining and Friends, Fans, Follows
    const [lastTrainingText, lastMatchText, countRelationship] =
      await Promise.all([
        this.getLastTraining(playerId, firstName),
        this.getLastMatch(playerId, firstName, lastName),
        this.friendsService.getCountRelationship(playerId),
      ]);

    const { friendCount, fanCount, followCount } = countRelationship;
    const basicText = this.formatBasicSEOText(
      firstName,
      lastName,
      year,
      city,
      country,
      userRole,
      currentClub,
      teamName,
    );
    const heightWeightText = this.formatHieghtWeightSEOText(
      firstName,
      height,
      weight,
      summary,
    );

    return (
      `${basicText} ${heightWeightText} ${firstName} has ${friendCount} Friends, ${fanCount} Fans and Follows ${followCount} on Zporter.co.` +
      lastTrainingText +
      lastMatchText +
      ` ${firstName} unique url on Zporter are ${bioUrl}`
    );
  }
  formatBasicSEOText(
    firstName: string,
    lastName: string,
    year: number | string,
    city: string,
    country: string,
    userRole: string,
    currentClub: string,
    teamName: string,
  ): string {
    let text = `${firstName} ${lastName}`;

    text +=
      year && city && country ? ` born ${year} in ${city}, ${country}` : '';

    text += userRole ? ` are ${userRole}` : '';

    text += currentClub ? ` in ${currentClub} ${teamName}` : '';

    return text;
  }
  formatHieghtWeightSEOText(
    firstName: string,
    height: number | string,
    weight: number | string,
    summary: string,
  ): string {
    let text =
      height && weight
        ? `${firstName} is ${height} cm tall and weighs ${weight} kg`
        : '';
    text += summary ? ` and describes himself as ${summary}` : '';

    return text;
  }
  formatFollowsText(
    firstName: string,
    friends: any,
    fans: any,
    follows: any,
  ): string {
    return `${firstName} has ${friends} Friends, ${fans} Fans and Follows ${follows} on Zporter.co`;
  }
  getLastTraining(firstName: string, lastTraining): string {
    // check team training
    if (!lastTraining) {
      return '';
    }

    //# get from last training
    const trainingType = lastTraining?.training?.typeOfTraining || null;
    const date =
      moment(new Date(lastTraining?.createdAt)).format('DD/MM/YYYY') || null;
    const hours = lastTraining?.training?.hoursOfPractice || null;

    const lastTrainingText =
      trainingType && date && hours
        ? `${firstName} last training was a ${trainingType} on ${date} for ${hours} hours`
        : '';

    return lastTrainingText;
  }
  getLastMatch(firstName: string, lastName: string, lastMatch): string {
    // checkt match
    if (!lastMatch) {
      return '';
    }

    //# get info from last match
    const opponentClub = lastMatch?.match?.opponentClub?.clubName || null;
    const opponentTeam = lastMatch?.match?.opponentTeam || '';
    const matchResult = lastMatch?.match?.result || null;
    const teamName = lastMatch?.match?.yourTeam || '';

    const lastMatchText =
      opponentClub && teamName && matchResult
        ? `${firstName} ${lastName} last match was against ${opponentClub}` +
          ` ${opponentTeam}` +
          ` and the result was ${matchResult.yourTeam} - ${matchResult.opponents}`
        : '';

    return lastMatchText;
  }

  async getSupportingUsers(userIds: string[]) {
    return Promise.all(
      userIds.map(async (id) => {
        const {
          faceImage,
          username,
          userId,
          bioUrl,
          firstName,
          lastName,
          type,
        } = await mappingUserInfoById(id);
        return {
          faceImage,
          username,
          userId,
          bioUrl,
          firstName,
          lastName,
          type,
        };
      }),
    );
  }

  async getSupportingClubs(clubIds: string[]) {
    return Promise.all(
      clubIds.map(async (id) => {
        const { logoUrl, clubName, clubId } =
          await this.clubService.getClubById(id);

        return {
          logoUrl,
          clubName,
          clubId,
        };
      }),
    );
  }

  async getClubLogoUrl(clubId: string) {
    const club = await this.clubService.getClubById(clubId);

    return club?.logoUrl;
  }

  async getListOfActiveSeason(userId: string) {
    const listOfActiveSeason = [];
    const getNearestSeasons = setOfNearActiveSeasons(20);

    const checkSeasonExist = getNearestSeasons.map(async (range) => {
      const rangeString = range.toString();

      const from = +moment().startOf('year').year(range);
      const to = +moment().endOf('year').year(range);

      const [diarySnapshots, historicCareerSnapshots] = await Promise.all([
        db
          .collection('diaries')
          .where('createdAt', '>=', from)
          .where('createdAt', '<=', to)
          .where('userId', '==', userId)
          .get(),
        db
          .collection('careers')
          .where('type', '==', CareerTypes.Historic)
          .where('userId', '==', userId)
          .get(),
      ]);

      if (!diarySnapshots) {
        return;
      }

      if (diarySnapshots.size) {
        listOfActiveSeason.push(rangeString);
      }

      historicCareerSnapshots.forEach((doc) => {
        const fromTime = doc?.data()?.fromTime as string;
        const toTime = doc?.data().toTime as string;

        if (fromTime.includes(rangeString) || toTime.includes(rangeString)) {
          listOfActiveSeason.push(rangeString);
        }
      });
    });
    await Promise.all(checkSeasonExist);

    const sortedListOfActiveSeasons = [...new Set(listOfActiveSeason)].sort(
      (a, b) => b - a,
    );

    return sortedListOfActiveSeasons;
  }

  checkBestFoot(leftFootIndex: number, rightFootIndex: number): BestFootTypes {
    if (leftFootIndex === rightFootIndex) {
      return BestFootTypes.Two_Footed;
    }

    if (leftFootIndex > rightFootIndex) {
      return BestFootTypes.Left;
    } else {
      return BestFootTypes.Right;
    }
  }
  async calculatePlayersAvgRadarSkill() {
    const playerDocs = await db
      .collection('users')
      .where('type', '==', UserTypes.PLAYER)
      .orderBy('playerSkills')
      .get();

    let totalPlayerAttacking = 0;
    let totalPlayerDefending = 0;
    let totalPlayerDribbling = 0;
    let totalPlayerPace = 0;
    let totalPlayerPassing = 0;
    let totalPlayerShooting = 0;
    let totalPlayerTackling = 0;
    let totalPlayerHeading = 0;

    playerDocs.forEach((doc) => {
      const playerRadarSkills = doc.data().playerSkills?.radar;
      if (playerRadarSkills?.attacking) {
        totalPlayerAttacking += playerRadarSkills?.attacking;
      }
      if (playerRadarSkills?.defending) {
        totalPlayerDefending += playerRadarSkills?.defending;
      }
      if (playerRadarSkills?.dribbling) {
        totalPlayerDribbling += playerRadarSkills?.dribbling;
      }
      if (playerRadarSkills?.pace) {
        totalPlayerPace += playerRadarSkills?.pace;
      }
      if (playerRadarSkills?.passing) {
        totalPlayerPassing += playerRadarSkills?.passing;
      }
      if (playerRadarSkills?.shooting) {
        totalPlayerShooting += playerRadarSkills?.shooting;
      }
      if (playerRadarSkills?.tackling) {
        totalPlayerTackling += playerRadarSkills?.tackling;
      }
      if (playerRadarSkills?.heading) {
        totalPlayerHeading += playerRadarSkills?.heading;
      }
    });

    const avgPlayerAttacking = Math.floor(
      totalPlayerAttacking / playerDocs.size,
    );
    const avgPlayerDefending = Math.floor(
      totalPlayerDefending / playerDocs.size,
    );
    const avgPlayerDribbling = Math.floor(
      totalPlayerDribbling / playerDocs.size,
    );
    const avgPlayerPace = Math.floor(totalPlayerPace / playerDocs.size);
    const avgPlayerPassing = Math.floor(totalPlayerPassing / playerDocs.size);
    const avgPlayerShooting = Math.floor(totalPlayerShooting / playerDocs.size);
    const avgPlayerTackling = Math.floor(totalPlayerTackling / playerDocs.size);
    const avgPlayerHeading = Math.floor(totalPlayerHeading / playerDocs.size);

    const nowTime = +moment.utc().format('x');
    const avgRadar = {
      avgPlayerAttacking,
      avgPlayerDefending,
      avgPlayerDribbling,
      avgPlayerPace,
      avgPlayerPassing,
      avgPlayerShooting,
      avgPlayerTackling,
      avgPlayerHeading,
      updatedAt: nowTime,
    };
    db.collection('caches').doc(CacheId.PLAYER_AVG_RADAR).set(avgRadar);
    return avgRadar;
  }
  async getPlayersAvgRadarSkill(): Promise<PlayerRadar> {
    const avg = await db
      .collection('caches')
      .doc(CacheId.PLAYER_AVG_RADAR)
      .get();

    if (!avg.exists) {
      return await this.calculatePlayersAvgRadarSkill();
    }
    const data = new PlayerRadar();
    data.avgPlayerHeading = avg.data().avgPlayerHeading;
    data.avgPlayerTackling = avg.data().avgPlayerTackling;
    data.avgPlayerShooting = avg.data().avgPlayerShooting;
    data.avgPlayerPassing = avg.data().avgPlayerPassing;
    data.avgPlayerPace = avg.data().avgPlayerPace;
    data.avgPlayerDribbling = avg.data().avgPlayerDribbling;
    data.avgPlayerDefending = avg.data().avgPlayerDefending;
    data.avgPlayerAttacking = avg.data().avgPlayerAttacking;

    return data;
  }

  async calculateCoachesAvgRadarSkill() {
    const coachDocs = await db
      .collection('users')
      .where('type', '==', UserTypes.COACH)
      .orderBy('coachSkills')
      .get();

    let totalCoachAttacking = 0;
    let totalCoachDefending = 0;
    let totalCoachAnalytics = 0;
    let totalCoachSetPieces = 0;
    let totalCoachTurnovers = 0;
    let totalCoachPlayerDevelopment = 0;

    coachDocs.forEach((doc) => {
      const coachRadarSkills = doc.data().coachSkills?.radar;
      if (coachRadarSkills?.attacking) {
        totalCoachAttacking += coachRadarSkills?.attacking;
      }
      if (coachRadarSkills?.analytics) {
        totalCoachAnalytics += coachRadarSkills?.analytics;
      }
      if (coachRadarSkills?.defending) {
        totalCoachDefending += coachRadarSkills?.defending;
      }
      if (coachRadarSkills?.setPieces) {
        totalCoachSetPieces += coachRadarSkills?.setPieces;
      }
      if (coachRadarSkills?.turnovers) {
        totalCoachTurnovers += coachRadarSkills?.turnovers;
      }
      if (coachRadarSkills?.playerDevelopment) {
        totalCoachPlayerDevelopment += coachRadarSkills?.playerDevelopment;
      }
    });

    const avgCoachAttacking = Math.floor(totalCoachAttacking / coachDocs.size);
    const avgCoachDefending = Math.floor(totalCoachDefending / coachDocs.size);
    const avgCoachAnalytics = Math.floor(totalCoachAnalytics / coachDocs.size);
    const avgCoachSetPieces = Math.floor(totalCoachSetPieces / coachDocs.size);
    const avgCoachTurnovers = Math.floor(totalCoachTurnovers / coachDocs.size);
    const avgCoachPlayerDevelopment = Math.floor(
      totalCoachPlayerDevelopment / coachDocs.size,
    );
    const nowTime = +moment.utc().format('x');
    const avg = {
      avgCoachAttacking,
      avgCoachDefending,
      avgCoachAnalytics,
      avgCoachSetPieces,
      avgCoachTurnovers,
      avgCoachPlayerDevelopment,
      updatedAt: nowTime,
    };

    db.collection('caches').doc(CacheId.COACH_AVG_RADAR).set(avg);
    return avg;
  }
  async getCoachesAvgRadarSkill() {
    const avg = await db
      .collection('caches')
      .doc(CacheId.COACH_AVG_RADAR)
      .get();

    if (!avg.exists) {
      return await this.calculateCoachesAvgRadarSkill();
    }

    const data = new CoachRadar();

    data.avgCoachAnalytics = avg.data().avgCoachAnalytics;
    data.avgCoachAttacking = avg.data().avgCoachAttacking;
    data.avgCoachDefending = avg.data().avgCoachDefending;
    data.avgCoachPlayerDevelopment = avg.data().avgCoachPlayerDevelopment;
    data.avgCoachSetPieces = avg.data().avgCoachSetPieces;
    data.avgCoachTurnovers = avg.data().avgCoachTurnovers;

    return data;
  }

  calculateStarRating(overallSkill: IPlayerOverallSkills): number {
    const { mental, tactics, technics, physics } = overallSkill;
    const starRating = (mental + tactics + technics + physics) / 4;
    const inv = 1.0 / 0.5;
    return Math.round(starRating * inv) / inv;
  }

  formatBirthDay(birthDay: string): string {
    const dateObject = new Date(birthDay);
    const year = dateObject.getFullYear().toString().slice(2);

    const month = `0${dateObject.getMonth() + 1}`.slice(-2);
    const date = `0${dateObject.getDate()}`.slice(-2);

    return `${year}/${month}/${date}`;
  }

  formatContractedUntil(contractedUntilDate: Date): string | null {
    if (!contractedUntilDate) {
      return '?';
    }

    const dateObject = new Date(contractedUntilDate);

    const year = dateObject.getFullYear();
    const month = dateObject.getMonth() + 1;

    if (isNaN(year) || isNaN(month)) {
      return '?';
    }

    const yearString = year.toString();
    const monthString = `0${month}`.slice(-2);

    return `${yearString}/${monthString}`;
  }

  calculateAge(dateString: string): number {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async getPlayerStatsForDateRange(
    userId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { startDate, endDate, startAfter, season } = playerBioStatsDto;

    if (!startDate || !endDate) {
      throw new HttpException(
        'Date Range includes both startDate and EndDate for past season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dateRangeQuery: DashboardQueryBuilder = {
      dashboardTab: DashBoardTab.TRAINING,
      fromDate: startDate,
      toDate: endDate,
      lastDateRange: LastDateRange.ALL,
    };

    const countPlayerAchievementsDto = {
      userId,
      userType: UserTypes.PLAYER,
      fromDate: startDate,
      toDate: endDate,
    };

    const [
      matchData,
      trainingData,
      totalTrophies,
      totalAwards,
      totalCaps,
      playerBio,
      historicCareerDocs,
    ] = await Promise.all([
      this.dashboardService.getMatchStats(dateRangeQuery, userId),
      this.dashboardService.getDiariesStats(dateRangeQuery, userId, true),
      this.achievementService.countTotalTrophies(countPlayerAchievementsDto),
      this.achievementService.countPlayerTotalAwards(
        countPlayerAchievementsDto,
      ),
      this.achievementService.countTotalCaps(countPlayerAchievementsDto),
      this.getFormattedPlayerBio(userId),
      this.careerService.getClubCareers(userId, {
        limit: 20,
        startAfter,
        type: CareerTypes.Historic,
        season,
      }),
    ]);

    const { statsItems, matchInTotalStatistic } =
      this.combineHistoricAndAverageMatchesStats(
        matchData as OutputMatchTab,
        historicCareerDocs,
        UserTypes.PLAYER,
      );

    const trainingInTotalStatistics = this.formatTrainingInTotalStatistics(
      trainingData as OutputTrainingBio,
    );

    const {
      topVideoLinks,
      playerRadarSkills,
      specialities,
      leftFoot,
      rightFoot,
      radarUpdatedByCoach,
    } = playerBio;

    return {
      statsItems,
      matchInTotalStatistic,
      trainingInTotalStatistics,
      topVideoLinks,
      playerRadarSkills,
      radarUpdatedByCoach,
      specialities,
      leftFoot,
      rightFoot,
      totalTrophies,
      totalAwards,
      totalCaps,
    };
  }

  async getPlayerStatsForDateRangeV2(
    userId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { startDate, endDate, startAfter, season } = playerBioStatsDto;

    if (!startDate || !endDate) {
      throw new HttpException(
        'Date Range includes both startDate and EndDate for past season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const seasons = this.rangeOfSeasons(startDate, endDate);

    const dateRangeQuery: DashboardQueryBuilder = {
      dashboardTab: DashBoardTab.TRAINING,
      fromDate: startDate,
      toDate: endDate,
      lastDateRange: LastDateRange.ALL,
      seasons: seasons,
    };

    const [matchData, trainingData] = await Promise.all([
      this.dashboardService.getMatchStats(dateRangeQuery, userId),
      this.dashboardService.getDiariesStats(dateRangeQuery, userId, true),
    ]);

    let historicCareerDocs = [];

    const historicCareerPromises = seasons.map(async (season) => {
      const historicDocs = await this.careerService.getClubCareers(userId, {
        limit: 20,
        startAfter,
        type: CareerTypes.Historic,
        season,
      });

      historicCareerDocs = [...historicCareerDocs, ...historicDocs];
    });

    await Promise.all(historicCareerPromises);

    const { statsItems, matchInTotalStatistic } =
      this.combineHistoricAndAverageMatchesStats(
        matchData as OutputMatchTab,
        historicCareerDocs,
        UserTypes.PLAYER,
      );

    const trainingInTotalStatistics = this.formatTrainingInTotalStatistics(
      trainingData as OutputTrainingBio,
    );

    return {
      statsItems,
      matchInTotalStatistic,
      trainingInTotalStatistics,
    };
  }

  rangeOfSeasons(startDate: string, endDate: string) {
    const start = moment(startDate).year();
    let end = moment(endDate).year();

    if (start > end) {
      throw new HttpException(
        'Make sure you enter valid start & end date',
        HttpStatus.BAD_REQUEST,
      );
    }

    const arr = [];

    let c = end - start + 1;

    while (c--) {
      arr[c] = `${end--}`;
    }

    return arr;
  }

  async getPlayerStats(
    currentUserId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { statsTab, userIdQuery, username } = playerBioStatsDto;

    const otherUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    const userIdForQuery = otherUserId ? otherUserId : currentUserId;

    let result;

    if (statsTab === BioStatsTab.Total) {
      result = await this.getPlayerTotalStats(userIdForQuery);
    }

    if (statsTab === BioStatsTab.Current) {
      result = await this.getPlayerCurrentSeasonStats(
        userIdForQuery,
        playerBioStatsDto,
      );
    }

    if (statsTab === BioStatsTab.Season) {
      result = await this.getPlayerStatsForDateRange(
        userIdForQuery,
        playerBioStatsDto,
      );
    }

    return result;
  }

  async getCoachStats(
    currentUserId: string,
    coachBioStatsDto: CoachBioStatsDto,
  ) {
    const { statsTab, userIdQuery, username } = coachBioStatsDto;

    const otherUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    const userIdForQuery = otherUserId ? otherUserId : currentUserId;

    let result;

    if (statsTab === BioStatsTab.Total) {
      result = await this.getCoachTotalStats(userIdForQuery);
    }

    if (statsTab === BioStatsTab.Current) {
      result = await this.getCoachCurrentSeasonStats(
        userIdForQuery,
        coachBioStatsDto,
      );
    }

    if (statsTab === BioStatsTab.Season) {
      result = await this.getCoachStatsForDateRange(
        userIdForQuery,
        coachBioStatsDto,
      );
    }

    return result;
  }

  async getPlayerStatsV2(
    currentUserId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { statsTab, userIdQuery, username } = playerBioStatsDto;

    const otherUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    const userIdForQuery = otherUserId ? otherUserId : currentUserId;

    let result;

    if (statsTab === BioStatsTab.Total) {
      result = await this.getPlayerTotalStatsV2(userIdForQuery);
    }

    if (statsTab === BioStatsTab.Current) {
      result = await this.getPlayerCurrentSeasonStatsV2(
        userIdForQuery,
        playerBioStatsDto,
      );
    }

    if (statsTab === BioStatsTab.Season) {
      result = await this.getPlayerStatsForDateRangeV2(
        userIdForQuery,
        playerBioStatsDto,
      );
    }

    return result;
  }

  public formatTrainingInTotalStatistics(trainingData: OutputTrainingBio) {
    const { sessions, trainingHours, trainingCategory } =
      trainingData as OutputTrainingBio;

    const trainingInTotalStatistics = {
      trainingCategory,
      sessions:
        sessions.group +
        sessions.personal +
        sessions.team +
        sessions.totalHistoric,
      hours:
        trainingHours.group +
        trainingHours.personal +
        trainingHours.team +
        trainingHours.totalHistoric,
    };

    return trainingInTotalStatistics;
  }

  public combineHistoricAndAverageMatchesStats(
    diaryMatchData: OutputMatchTab,
    historicCareerDocs: any[],
    userTypes: UserTypes,
  ) {
    const historicMatchData = this.mappingHistoricMatchData(historicCareerDocs);

    const { matchStatisticAverage, matchInTotalStatistic } = diaryMatchData;

    // total historic items _+ 1 current item to get the avg
    const totalDivide =
      matchInTotalStatistic.matches > 0
        ? historicMatchData.length + 1
        : historicMatchData.length;

    historicMatchData.forEach((e) => {
      matchInTotalStatistic.hours += e.matchInTotalStatistic.hours;
      matchInTotalStatistic.matches += e.matchInTotalStatistic.matches;
      matchInTotalStatistic.points += e.matchInTotalStatistic.points;
      matchInTotalStatistic.goals += e.matchInTotalStatistic.goals;
      matchInTotalStatistic.assists += e.matchInTotalStatistic.assists;
      matchInTotalStatistic.yel += e.matchInTotalStatistic.yel;
      matchInTotalStatistic.red += e.matchInTotalStatistic.red;
      matchInTotalStatistic.matchDraws += e.matchInTotalStatistic.matchDraws;
      matchInTotalStatistic.matchLosses += e.matchInTotalStatistic.matchLosses;
      matchInTotalStatistic.matchWins += e.matchInTotalStatistic.matchWins;

      matchStatisticAverage.totalMatchType.cupMatch +=
        e.matchStatisticAverage.totalMatchType.cupMatch;
      matchStatisticAverage.totalMatchType.friendlyMatch +=
        e.matchStatisticAverage.totalMatchType.friendlyMatch;
      matchStatisticAverage.totalMatchType.seriesMatch +=
        e.matchStatisticAverage.totalMatchType.seriesMatch;

      matchStatisticAverage.netScore += e.matchStatisticAverage.netScore;
      matchStatisticAverage.averagePoint +=
        e.matchStatisticAverage.averagePoint;
      matchStatisticAverage.averageGoal += e.matchStatisticAverage.averageGoal;
      matchStatisticAverage.averagePlayingTime +=
        e.matchStatisticAverage.averagePlayingTime;
      matchStatisticAverage.averageAssist +=
        e.matchStatisticAverage.averageAssist;

      matchStatisticAverage.averageCard += e.matchStatisticAverage.averageCard;

      matchStatisticAverage.role = matchStatisticAverage.role
        ? matchStatisticAverage.role
        : e.matchStatisticAverage.role;
    });

    matchStatisticAverage.netScore =
      Math.floor((matchStatisticAverage.netScore / totalDivide) * 10) / 10 || 0;

    matchStatisticAverage.averagePoint =
      Math.floor((matchStatisticAverage.averagePoint / totalDivide) * 10) /
        10 || 0;

    matchStatisticAverage.averageGoal =
      Math.floor((matchStatisticAverage.averageGoal / totalDivide) * 10) / 10 ||
      0;

    matchStatisticAverage.averagePlayingTime =
      Math.floor(
        (matchStatisticAverage.averagePlayingTime / totalDivide) * 10,
      ) / 10 || 0;

    matchStatisticAverage.averageAssist =
      Math.floor((matchStatisticAverage.averageAssist / totalDivide) * 10) /
        10 || 0;

    matchStatisticAverage.averageCard =
      Math.floor((matchStatisticAverage.averageCard / totalDivide) * 10) / 10 ||
      0;

    const statsItems = this.transformAvgMatchStatsToStatsItems(
      matchStatisticAverage,
      userTypes,
    );

    return { statsItems, matchInTotalStatistic };
  }

  mappingHistoricMatchData(historicCareerDocs) {
    const historicMatchData: OutputMatchTab[] = historicCareerDocs.map(
      (e: IHistoricCareerPlan) => {
        const role = e.role || null;
        const totalMatches = e.wonMatches + e.drawMatches + e.lostMatches;
        const totalPoints =
          e.wonMatches * 3 + e.drawMatches * 1 + e.lostMatches * 0;
        const totalCards = e.yourRedCards + e.yourYellowCards;
        const averagePoint =
          Math.floor((totalPoints / totalMatches) * 10) / 10 || 0;
        const averageGoal =
          Math.floor((e.yourGoals / totalMatches) * 10) / 10 || 0;
        const averageAssist =
          Math.floor((e.yourAssists / totalMatches) * 10) / 10 || 0;
        const averageCard =
          Math.floor((totalCards / totalMatches) * 10) / 10 || 0;
        // 90 mins for a standard match and est player time is in percent
        const totalPlayedMinutes =
          totalMatches * 90 * (e.yourEstPlayTime / 100);
        const totalPlayedHours = Math.floor(totalPlayedMinutes / 60) || 0;
        const averagePlayingTime = e.yourEstPlayTime;

        const netScore =
          e.madeTeamGoals - e.yourGoals > 0 ? e.madeTeamGoals - e.yourGoals : 0;

        const totalMatchType = {
          cupMatch: e.cupMatches,
          friendlyMatch: e.friendlyMatches,
          seriesMatch: e.serieMatches,
        } as MatchesHoursDto;

        const matchStatisticAverage = {
          totalMatchType,
          netScore,
          averagePoint,
          averagePlayingTime,
          averageGoal,
          averageAssist,
          averageCard,
          role,
        } as MatchStatisticAverageDto;

        const matchInTotalStatistic = {
          hours: totalPlayedHours,
          matches: totalMatches,
          points: totalPoints,
          goals: e.yourGoals,
          assists: e.yourAssists,
          yel: e.yourYellowCards,
          red: e.yourRedCards,
          matchDraws: e.drawMatches,
          matchLosses: e.lostMatches,
          matchWins: e.wonMatches,
        } as MatchInTotalStatisticDto;

        return {
          matchStatisticAverage,
          matchInTotalStatistic,
        };
      },
    );

    return historicMatchData;
  }

  public transformAvgMatchStatsToStatsItems(
    matchStatisticAverage: MatchStatisticAverageDto,
    userTypes: UserTypes,
  ) {
    const {
      totalMatchType: { cupMatch, friendlyMatch, seriesMatch },
      averageAssist,
      averageCard,
      averageGoal,
      averagePlayingTime,
      averagePoint,
      netScore,
      role,
    } = matchStatisticAverage;

    let mostPlayedRole = role;

    if (mostPlayedRole === null) {
      mostPlayedRole = '?';
    }

    const playerStatsItems = [
      {
        title: 'Ser/Cup/Fri',
        value: `${seriesMatch}/${cupMatch}/${friendlyMatch}`,
      },
      {
        title: 'Avg. Points',
        value: `${Math.round((averagePoint + Number.EPSILON) * 100) / 100}`,
      },
      {
        title: 'Net Score',
        value: `${netScore}`,
      },
      {
        title: 'Role',
        value: `${mostPlayedRole}`,
      },
      {
        title: 'Play Time',
        value: `${
          Math.round((averagePlayingTime + Number.EPSILON) * 100) / 100
        }`,
      },
      {
        title: 'Avg. Goals',
        value: `${Math.round((averageGoal + Number.EPSILON) * 100) / 100}`,
      },
      {
        title: 'Avg. Assists',
        value: `${Math.round((averageAssist + Number.EPSILON) * 100) / 100}`,
      },
      {
        title: 'Avg. Cards',
        value: `${Math.round((averageCard + Number.EPSILON) * 100) / 100}`,
      },
    ];

    const coachStatsItems = [
      {
        title: 'Ser/Cup/Fri',
        value: `${seriesMatch}/${cupMatch}/${friendlyMatch}`,
      },
      {
        title: 'Avg. Points',
        value: `${Math.round((averagePoint + Number.EPSILON) * 100) / 100}`,
      },
      {
        title: 'Net Score',
        value: `${netScore}`,
      },
      {
        title: 'Avg. Goals',
        value: `${Math.round((averageGoal + Number.EPSILON) * 100) / 100}`,
      },
    ];

    const result =
      userTypes === UserTypes.PLAYER ? playerStatsItems : coachStatsItems;

    return result;
  }

  async getPlayerTotalStats(userId: string) {
    const dateRangeQueryForTotal: DashboardQueryBuilder = {
      dashboardTab: DashBoardTab.TRAINING,
      lastDateRange: LastDateRange.ALL,
    };

    const countPlayerAchievementsDto: CountUserAchievementsDto = {
      userId,
      userType: UserTypes.PLAYER,
    };

    const [
      statsItemsWithArrows,
      matchDataTotal,
      trainingDataTotal,
      playerBio,
      totalTrophies,
      totalAwards,
      totalCaps,
      historicCareerDocs,
    ] = await Promise.all([
      this.getMatchStatsWithArrows(userId, UserTypes.PLAYER),
      this.dashboardService.getMatchStats(dateRangeQueryForTotal, userId),
      this.dashboardService.getDiariesStats(
        dateRangeQueryForTotal,
        userId,
        true,
      ),
      this.getFormattedPlayerBio(userId),
      this.achievementService.countTotalTrophies(countPlayerAchievementsDto),
      this.achievementService.countPlayerTotalAwards(
        countPlayerAchievementsDto,
      ),
      this.achievementService.countTotalCaps(countPlayerAchievementsDto),
      this.careerService.getClubCareers(userId, {
        limit: 20,
        type: CareerTypes.Historic,
      }),
    ]);

    const matchStatsTotal = this.combineHistoricAndAverageMatchesStats(
      matchDataTotal,
      historicCareerDocs,
      UserTypes.PLAYER,
    );

    const { matchInTotalStatistic } = matchStatsTotal;

    const trainingInTotalStatistics = this.formatTrainingInTotalStatistics(
      trainingDataTotal as OutputTrainingBio,
    );

    const {
      topVideoLinks,
      playerRadarSkills,
      specialities,
      leftFoot,
      rightFoot,
      radarUpdatedByCoach,
    } = playerBio;

    //TODO
    /*
    programs
    challenges
    */

    return {
      statsItems: statsItemsWithArrows,
      matchInTotalStatistic,
      trainingInTotalStatistics,
      topVideoLinks,
      playerRadarSkills,
      radarUpdatedByCoach,
      specialities,
      leftFoot,
      rightFoot,
      totalTrophies,
      totalAwards,
      totalCaps,
    };
  }

  async getPlayerTotalStatsV2(userId: string) {
    const dateRangeQueryForTotal: DashboardQueryBuilder = {
      dashboardTab: DashBoardTab.TRAINING,
      lastDateRange: LastDateRange.ALL,
    };

    const [
      statsItemsWithArrows,
      matchDataTotal,
      trainingDataTotal,
      historicCareerDocs,
    ] = await Promise.all([
      this.getMatchStatsWithArrows(userId, UserTypes.PLAYER),
      this.dashboardService.getMatchStats(dateRangeQueryForTotal, userId),
      this.dashboardService.getDiariesStats(
        dateRangeQueryForTotal,
        userId,
        true,
      ),
      this.careerService.getClubCareers(userId, {
        limit: 20,
        type: CareerTypes.Historic,
      }),
    ]);

    const matchStatsTotal = this.combineHistoricAndAverageMatchesStats(
      matchDataTotal,
      historicCareerDocs,
      UserTypes.PLAYER,
    );

    const { matchInTotalStatistic, statsItems } = matchStatsTotal;

    // combine total Stats and arrows trend
    statsItemsWithArrows.forEach((arrow) => {
      statsItems.forEach((total) => {
        if (arrow.title === total.title) {
          arrow.value = total.value;
        }
      });
    });

    const trainingInTotalStatistics = this.formatTrainingInTotalStatistics(
      trainingDataTotal as OutputTrainingBio,
    );

    //TODO
    /*
    programs
    challenges
    */

    return {
      statsItems: statsItemsWithArrows,
      matchInTotalStatistic,
      trainingInTotalStatistics,
    };
  }

  async getPlayerCurrentSeasonStats(
    userId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { startDate, endDate } = playerBioStatsDto;

    if (!startDate || !endDate) {
      throw new HttpException(
        'Date Range includes both startDate and EndDate for past season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [statsItems, getCurrentSeasonData] = await Promise.all([
      await this.getMatchStatsWithArrows(userId, UserTypes.PLAYER),
      this.getPlayerStatsForDateRange(userId, playerBioStatsDto),
    ]);

    const {
      matchInTotalStatistic,
      trainingInTotalStatistics,
      topVideoLinks,
      playerRadarSkills,
      specialities,
      leftFoot,
      rightFoot,
      totalTrophies,
      totalAwards,
      totalCaps,
    } = getCurrentSeasonData;

    return {
      statsItems,
      matchInTotalStatistic,
      trainingInTotalStatistics,
      topVideoLinks,
      playerRadarSkills,
      specialities,
      leftFoot,
      rightFoot,
      totalTrophies,
      totalAwards,
      totalCaps,
    };
  }

  async getPlayerCurrentSeasonStatsV2(
    userId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { startDate, endDate } = playerBioStatsDto;

    if (!startDate || !endDate) {
      throw new HttpException(
        'Date Range includes both startDate and EndDate for past season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [statsItemsWithArrows, getCurrentSeasonData] = await Promise.all([
      await this.getMatchStatsWithArrows(userId, UserTypes.PLAYER),
      this.getPlayerStatsForDateRangeV2(userId, playerBioStatsDto),
    ]);

    const { matchInTotalStatistic, trainingInTotalStatistics, statsItems } =
      getCurrentSeasonData;

    // combine total Stats and arrows trend
    statsItemsWithArrows.forEach((arrow) => {
      statsItems.forEach((total) => {
        if (arrow.title === total.title) {
          arrow.value = total.value;
        }
      });
    });

    return {
      statsItems: statsItemsWithArrows,
      matchInTotalStatistic,
      trainingInTotalStatistics,
    };
  }

  async getMatchStatsWithArrows(userId: string, userType: UserTypes) {
    const today = moment.utc().format('YYYY-MM-DDTHH:mm:ssZ');

    const the30thDayBefore = moment(today)
      .subtract(30, 'd')
      .format('YYYY-MM-DDTHH:mm:ssZ');

    const the31thDayBefore = moment(today)
      .subtract(31, 'd')
      .format('YYYY-MM-DDTHH:mm:ssZ');

    const the60thDayBefore = moment(today)
      .subtract(60, 'd')
      .format('YYYY-MM-DDTHH:mm:ssZ');

    const [a, b] = await Promise.all([
      this.dashboardService.getMatchStats(
        {
          fromDate: the30thDayBefore,
          toDate: today,
          lastDateRange: LastDateRange.ALL,
        },
        userId,
      ),
      this.dashboardService.getMatchStats(
        {
          fromDate: the60thDayBefore,
          toDate: the31thDayBefore,
          lastDateRange: LastDateRange.ALL,
        },
        userId,
      ),
    ]);

    const matchStatsWithArrows = this.compareStatsItemsAndGetResults(
      a,
      b,
      userType,
    );

    return matchStatsWithArrows;
  }

  public compareStatsItemsAndGetResults(
    a: OutputMatchTab,
    b: OutputMatchTab,
    userTypes: UserTypes,
  ) {
    const {
      totalMatchType: {
        cupMatch: cupMatchA,
        friendlyMatch: friendlyMatchA,
        seriesMatch: seriesMatchA,
      },
      averageAssist: averageAssistA,
      averageCard: averageCardA,
      averageGoal: averageGoalA,
      averagePlayingTime: averagePlayingTimeA,
      averagePoint: averagePointA,
      netScore: netScoreA,
      role,
    } = a.matchStatisticAverage;

    let mostPlayedRole = role;

    if (mostPlayedRole === null) {
      mostPlayedRole = '?';
    }

    const {
      averageAssist: averageAssistB,
      averageCard: averageCardB,
      averageGoal: averageGoalB,
      averagePlayingTime: averagePlayingTimeB,
      averagePoint: averagePointB,
      netScore: netScoreB,
    } = b.matchStatisticAverage;

    const playerLatestStatsItems = [
      {
        title: 'Ser/Cup/Fri',
        value: `${seriesMatchA}/${cupMatchA}/${friendlyMatchA}`,
      },
      {
        title: 'Avg. Points',
        value: `${averagePointA}`,
        arrow: this.getArrow(averagePointA, averagePointB),
      },
      {
        title: 'Net Score',
        value: `${netScoreA}`,
        arrow: this.getArrow(netScoreA, netScoreB),
      },
      {
        title: 'Role',
        value: `${mostPlayedRole}`,
      },
      {
        title: 'Play Time',
        value: `${averagePlayingTimeA}`,
        arrow: this.getArrow(averagePlayingTimeA, averagePlayingTimeB),
      },
      {
        title: 'Avg. Goals',
        value: `${averageGoalA}`,
        arrow: this.getArrow(averageGoalA, averageGoalB),
      },
      {
        title: 'Avg. Assists',
        value: `${averageAssistA}`,
        arrow: this.getArrow(averageAssistA, averageAssistB),
      },
      {
        title: 'Avg. Cards',
        value: `${averageCardA}`,
        arrow: this.getArrow(averageCardA, averageCardB),
      },
    ];

    const coachLatestStatsItems = [
      {
        title: 'Ser/Cup/Fri',
        value: `${seriesMatchA}/${cupMatchA}/${friendlyMatchA}`,
      },
      {
        title: 'Avg. Points',
        value: `${averagePointA}`,
        arrow: this.getArrow(averagePointA, averagePointB),
      },
      {
        title: 'Net Score',
        value: `${netScoreA}`,
        arrow: this.getArrow(netScoreA, netScoreB),
      },
      {
        title: 'Avg. Goals',
        value: `${averageGoalA}`,
        arrow: this.getArrow(averageGoalA, averageGoalB),
      },
    ];

    const result =
      userTypes === UserTypes.PLAYER
        ? playerLatestStatsItems
        : coachLatestStatsItems;

    return result;
  }

  async getPlayerClubStats(
    currentUserId?: string,
    getCareersDto?: GetCareersDto,
  ) {
    const { startAfter, userIdQuery, username } = getCareersDto;

    const otherUserId = username
      ? await this.getUserIdFromUsername(username)
      : userIdQuery;

    const userIdForQuery = otherUserId ? otherUserId : currentUserId;

    const [historicCareers, futureCareers] = await Promise.all([
      this.careerService.getClubCareers(userIdForQuery, {
        limit: 20,
        startAfter,
        type: CareerTypes.Historic,
      }),
      this.careerService.getClubCareers(userIdForQuery, {
        limit: 20,
        startAfter,
        type: CareerTypes.Future,
      }),
    ]);

    const [historicClubs, existingClub, futureClubs] = await Promise.all([
      this.careerService.getHistoricClubCareersForBio(historicCareers),
      this.getExistingClubStats(userIdForQuery),
      this.careerService.getFutureClubCareersForBio(futureCareers),
    ]);

    return {
      historicClubs,
      existingClub,
      futureClubs,
    };
  }

  async getExistingClubStats(userId: string) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const teamIds = await this.teamsService.getListTeamIdsByUserId(userId);

    const clubId =
      userDoc.data()?.type === UserTypes.PLAYER
        ? userDoc.data()?.playerCareer?.clubId
        : userDoc.data()?.coachCareer?.clubId;

    const career =
      userDoc.data()?.type === UserTypes.PLAYER
        ? userDoc.data()?.playerCareer
        : userDoc.data()?.coachCareer;

    const [clubDoc, teamDoc] = await Promise.all([
      db.collection('clubs').doc(clubId).get(),
      db
        .collection('teams')
        .doc(teamIds[0] || '?')
        .get(),
    ]);
    const clubData = clubDoc.data();
    const teamData = teamDoc.data();

    const clubInfo = {
      club: {
        clubId: clubDoc.id,
        ...clubData,
      },
      team: {
        clubId: clubId,
        teamName: teamData?.teamName || 'N/A',
      },
      fromTime: moment(career.seasonStartDate).format('YYYY-MM-DD') || '?',
      toTime: moment(career.contractedUntil).format('YYYY-MM-DD') || '?',
      //TODO LEAGUE NAME
      league: {
        name: 'N/A',
      },
      role:
        (career?.favoriteRoles?.length && career?.favoriteRoles[0]) ||
        career?.role ||
        '?',
    };

    const summary = career.summary;

    const userExistingClubMatchesSnapshot = await db
      .collection('diaries')
      .where('match.club.clubId', '==', clubId)
      .where('userId', '==', userId)
      .get();

    const mediaLinks: MediaDto[] = [];

    userExistingClubMatchesSnapshot.forEach((e) => {
      mediaLinks.concat(e.data().match.matchMedia);
    });

    const [{ matchInTotalStatistic, matchStatisticAverage }, trophies] =
      await Promise.all([
        await this.dashboardService.calculateDiaryMatchesStatsFromSnapshot(
          userExistingClubMatchesSnapshot,
        ),
        await this.achievementService.countTrophyListForExistingClub(
          clubId,
          userId,
        ),
      ]);

    const statsItems = this.transformAvgMatchStatsToStatsItems(
      matchStatisticAverage,
      UserTypes.PLAYER,
    );

    return {
      clubInfo,
      statsItems,
      matchInTotalStatistic,
      trophies,
      summary,
      mediaLinks,
    };
  }

  getArrow(n1: number, n2: number) {
    const change: ChangeValue = comparePercentChanges(n1, n2);

    const arrow: TrendArrowsBioStats = calculateArrow(change);

    return arrow;
  }

  async getListPlayersForFlippingV3(
    currentUserId?: string,
    queryBioForFlippingDto?: QueryBioForFlippingDto,
  ) {
    const { pageSize, pageNumber } = queryBioForFlippingDto;

    if (+pageNumber <= 0) {
      throw new HttpException(
        'Page number have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const users = await this.userService.getFlippingFromMongo(
      currentUserId,
      queryBioForFlippingDto,
    );

    const userPromise = users.map(async (user) => {
      try {
        if (user?.type === UserTypes.PLAYER) {
          const playerBio = await this.getFormattedPlayerBioV2(user.userId);

          const {
            playerRadarSkills,
            socialLinks,
            topVideoLinks,
            specialities,
            ...playerBioForFlipping
          } = playerBio;

          return playerBioForFlipping;
        }

        if (user?.type === UserTypes.COACH) {
          const coachBio = await this.getFormattedCoachBio(user.userId);

          const {
            coachRadarSkills,
            socialLinks,
            topVideoLinks,
            specialities,
            ...coachBioForFlipping
          } = coachBio;

          return coachBioForFlipping;
        }

        if (user?.type === UserTypes.SUPPORTER) {
          const supporterBio = await this.getFormattedSupporterBio(user.userId);

          return supporterBio;
        }
      } catch (error) {
        return;
      }
    });

    const userBios = await Promise.all(userPromise);
    const result = userBios.filter((e) => e);

    return {
      totalItem: result.length,
      pageNumber,
      pageSize,
      data: result,
    };
  }
  async getListPlayersForFlippingV1(
    currentUserId: string,
    queryBioForFlippingDto: QueryBioForFlippingDto,
  ) {
    const { pageSize, pageNumber, query, startAfter, username } =
      queryBioForFlippingDto;

    const userIdForQuery = username
      ? await this.getUserIdFromUsername(username)
      : currentUserId;

    let userIdsForFlipping: UserForFlipping[] = [];

    if (query) {
      const searchResults = await this.userService.findAll({
        name: query,
        limit: pageSize,
        startAfter: startAfter,
      });

      userIdsForFlipping = searchResults.map((e: any) => {
        return {
          userId: e?.userId,
          type: e?.type,
        };
      });
    } else {
      const currentUserData = await mappingUserInfoById(userIdForQuery);

      const [myTeamMates, userSameAge, userSameCity, userSameCountry] =
        await Promise.all([
          // this.friendsService.getListUserIdsRelationships(userIdForQuery, {
          //   status: Status.ACCEPTED,
          //   type: TypeRequest.FRIEND,
          //   limit: 0,
          // }),
          // this.friendsService.getListUserIdsRelationships(userIdForQuery, {
          //   status: Status.ACCEPTED,
          //   type: TypeRequest.FOLLOW,
          //   limit: 0,
          // }),
          this.userService.getListPlayerIdsSameTeam(userIdForQuery, {
            clubId: currentUserData.clubId,
            acceptedTeamIds: currentUserData.teamIds,
          }),
          this.userService.getUserIdsSameAge({
            birthDay: currentUserData.birthDay,
            userType: UserTypes.PLAYER,
          }),
          this.userService.getUserIdsSameCity({
            city: currentUserData.city,
            userType: UserTypes.PLAYER,
          }),
          this.userService.getUserIdsSameCountry({
            country: currentUserData.settingCountryRegion,
            userType: UserTypes.PLAYER,
          }),
        ]);

      userIdsForFlipping.push(
        ...myTeamMates,
        ...userSameAge,
        ...userSameCity,
        ...userSameCountry,
      );

      userIdsForFlipping
        .map((item) => ({ ...item, sort: Math.random() })) // sort random
        .sort((a, b) => a?.sort - b?.sort);
    }

    const uniqueUserBios = userIdsForFlipping
      // filter valid user type and unique
      .reduce((uniqueUserBios: UserForFlipping[], user) => {
        if (
          !uniqueUserBios.some((obj) => obj.userId === user.userId) &&
          user.type
        ) {
          uniqueUserBios.push(user);
        }
        return uniqueUserBios;
      }, [])
      // mapping user bio
      .map(async (user) => {
        if (user?.type === UserTypes.PLAYER) {
          const playerBio = await this.getFormattedPlayerBio(user.userId);

          const {
            playerRadarSkills,
            socialLinks,
            topVideoLinks,
            specialities,
            ...playerBioForFlipping
          } = playerBio;

          return playerBioForFlipping;
        }

        if (user?.type === UserTypes.COACH) {
          const coachBio = await this.getFormattedCoachBio(user.userId);

          const {
            coachRadarSkills,
            socialLinks,
            topVideoLinks,
            specialities,
            ...coachBioForFlipping
          } = coachBio;

          return coachBioForFlipping;
        }

        if (user?.type === UserTypes.SUPPORTER) {
          const supporterBio = await this.getFormattedSupporterBio(user.userId);

          return supporterBio;
        }
      });

    const userBios = await Promise.all(uniqueUserBios);

    const offset = (pageNumber - 1) * pageSize;

    let end = pageSize;

    if (startAfter) {
      end = userBios.length;
    }

    if (end > 50) {
      end = 50;
    }

    const result = userBios.slice(offset).slice(0, end);

    return {
      totalItem: userBios.length,
      pageNumber,
      pageSize,
      data: result,
    };
  }

  async getListPlayersForFlippingV2(
    currentUserId: string,
    queryBioForFlippingDto: QueryBioForFlippingDto,
  ) {
    const { username } = queryBioForFlippingDto;

    const otherUserId =
      username && (await this.getUserIdFromUsername(username));

    const userIdForQuery = otherUserId ? otherUserId : currentUserId;

    const { count, pageNumber, pageSize, rows } =
      await this.biographyBigQueryService.getListUsersForFlipping(
        userIdForQuery,
        queryBioForFlippingDto,
      );

    const mappingUserInfo = rows.map(async ({ userId }) => {
      const { type: userType } = await mappingUserInfoById(userId);
      if (userType === UserTypes.PLAYER) {
        const playerBio = await this.getFormattedPlayerBio(userId);

        const {
          playerRadarSkills,
          socialLinks,
          topVideoLinks,
          specialities,
          ...playerBioForFlipping
        } = playerBio;

        return playerBioForFlipping;
      }

      if (userType === UserTypes.COACH) {
        const coachBio = await this.getFormattedCoachBio(userId);

        const {
          coachRadarSkills,
          socialLinks,
          topVideoLinks,
          specialities,
          ...coachBioForFlipping
        } = coachBio;

        return coachBioForFlipping;
      }
    });

    const data = await Promise.all(mappingUserInfo);
    const notNullData = data.filter((element) => {
      if (element !== undefined) {
        return element;
      }
    });

    return {
      totalItem: notNullData.length,
      pageNumber,
      pageSize,
      data: notNullData,
    };
  }

  calculatePercentChangenumA(numA: number, numB: number) {
    const total = numA + numB;
    const personNumA = total > 0 ? Math.abs(numA / total) * 100 : 50;
    return Math.round(personNumA);
  }

  head2HeadTrainings(trainingsUserA: any, trainingsUserB: any) {
    const sessionsUserA = this.calculatePercentChangenumA(
      trainingsUserA.sessions,
      trainingsUserB.sessions,
    );
    const sessions = {
      userA: sessionsUserA,
      totalUserA: trainingsUserA.sessions,
      userB: 100 - sessionsUserA,
      totalUserB: trainingsUserB.sessions,
    };

    const hoursUserA = this.calculatePercentChangenumA(
      trainingsUserA.hours,
      trainingsUserB.hours,
    );
    const hours = {
      userA: hoursUserA,
      totalUserA: trainingsUserA.hours,
      userB: 100 - hoursUserA,
      totalUserB: trainingsUserB.hours,
    };

    const technicalUserA = this.calculatePercentChangenumA(
      trainingsUserA.trainingCategory.technical,
      trainingsUserB.trainingCategory.technical,
    );
    const technical = {
      userA: technicalUserA,
      totalUserA: trainingsUserA.trainingCategory.technical,
      userB: 100 - technicalUserA,
      totalUserB: trainingsUserB.trainingCategory.technical,
    };

    const tacticsUserA = this.calculatePercentChangenumA(
      trainingsUserA.trainingCategory.tactics,
      trainingsUserB.trainingCategory.tactics,
    );
    const tactics = {
      userA: tacticsUserA,
      totalUserA: trainingsUserA.trainingCategory.tactics,
      userB: 100 - tacticsUserA,
      totalUserB: trainingsUserB.trainingCategory.tactics,
    };

    const physicalUserA = this.calculatePercentChangenumA(
      trainingsUserA.trainingCategory.physical,
      trainingsUserB.trainingCategory.physical,
    );
    const physical = {
      userA: physicalUserA,
      totalUserA: trainingsUserA.trainingCategory.physical,
      userB: 100 - physicalUserA,
      totalUserB: trainingsUserB.trainingCategory.physical,
    };

    const mentalUserA = this.calculatePercentChangenumA(
      trainingsUserA.trainingCategory.mental,
      trainingsUserB.trainingCategory.mental,
    );
    const mental = {
      userA: mentalUserA,
      totalUserA: trainingsUserA.trainingCategory.mental,
      userB: 100 - mentalUserA,
      totalUserB: trainingsUserB.trainingCategory.mental,
    };

    return {
      sessions,
      hours,
      technical,
      tactics,
      physical,
      mental,
    };
  }

  head2HeadMatches(
    matchUserA: MatchInTotalStatisticDto,
    matchUserB: MatchInTotalStatisticDto,
  ) {
    const hoursUserA = this.calculatePercentChangenumA(
      matchUserA.hours,
      matchUserB.hours,
    );
    const hours = {
      userA: hoursUserA,
      totalUserA: matchUserA.hours,
      userB: 100 - hoursUserA,
      totalUserB: matchUserB.hours,
    };

    const assistsUserA = this.calculatePercentChangenumA(
      matchUserA.assists,
      matchUserB.assists,
    );
    const assists = {
      userA: assistsUserA,
      totalUserA: matchUserA.assists,
      userB: 100 - assistsUserA,
      totalUserB: matchUserB.assists,
    };

    const goalsUserA = this.calculatePercentChangenumA(
      matchUserA.goals,
      matchUserB.goals,
    );
    const goals = {
      userA: goalsUserA,
      totalUserA: matchUserA.goals,
      userB: 100 - goalsUserA,
      totalUserB: matchUserB.goals,
    };

    const matchesUserA = this.calculatePercentChangenumA(
      matchUserA.matches,
      matchUserB.matches,
    );
    const matches = {
      userA: matchesUserA,
      totalUserA: matchUserA.matches,
      userB: 100 - matchesUserA,
      totalUserB: matchUserB.matches,
    };

    const pointsUserA = this.calculatePercentChangenumA(
      matchUserA.points,
      matchUserB.points,
    );
    const points = {
      userA: pointsUserA,
      totalUserA: matchUserA.points,
      userB: 100 - pointsUserA,
      totalUserB: matchUserB.points,
    };

    const yelUserA = this.calculatePercentChangenumA(
      matchUserA.yel,
      matchUserB.yel,
    );
    const yel = {
      userA: yelUserA,
      totalUserA: matchUserA.yel,
      userB: 100 - yelUserA,
      totalUserB: matchUserB.yel,
    };

    const redUserA = this.calculatePercentChangenumA(
      matchUserA.red,
      matchUserB.red,
    );
    const red = {
      userA: redUserA,
      totalUserA: matchUserA.red,
      userB: 100 - redUserA,
      totalUserB: matchUserB.red,
    };

    return {
      matches,
      points,
      hours,
      goals,
      assists,
      yel,
      red,
    };
  }

  async player2Head2Head(userId: string, head2HeadDto: Head2HeadDto) {
    const { userIdQuery } = head2HeadDto;

    const countAchiemeventUserA: CountUserAchievementsDto = {
      userId,
      userType: UserTypes.PLAYER,
    };

    const countAchiemeventUserB: CountUserAchievementsDto = {
      userId: userIdQuery,
      userType: UserTypes.PLAYER,
    };

    const [
      bioUserA,
      statsUserA,
      totalTrophiesUserA,
      totalAwardsUserA,
      totalCapsUserA,
      //
      bioUserB,
      statsUserB,
      totalTrophiesUserB,
      totalAwardsUserB,
      totalCapsUserB,
    ] = await Promise.all([
      // user A
      this.getFormattedPlayerBio(userId),
      this.getPlayerStatsForDateRangeV2(userId, head2HeadDto),
      this.achievementService.countTotalTrophies(countAchiemeventUserA),
      this.achievementService.countPlayerTotalAwards(countAchiemeventUserA),
      this.achievementService.countTotalCaps(countAchiemeventUserA),
      // user B
      this.getFormattedPlayerBio(userIdQuery),
      this.getPlayerStatsForDateRangeV2(userIdQuery, head2HeadDto),
      this.achievementService.countTotalTrophies(countAchiemeventUserB),
      this.achievementService.countPlayerTotalAwards(countAchiemeventUserB),
      this.achievementService.countTotalCaps(countAchiemeventUserB),
    ]);

    const bioCompare = {
      userA: bioUserA,
      userB: bioUserB,
    };
    const trophiesCompare = {
      userA: totalTrophiesUserA,
      userB: totalTrophiesUserB,
    };
    const awardsCompare = {
      userA: totalAwardsUserA,
      userB: totalAwardsUserB,
    };
    const capsCompare = {
      userA: totalCapsUserA,
      userB: totalCapsUserB,
    };

    const matchesCompare = this.head2HeadMatches(
      statsUserA.matchInTotalStatistic,
      statsUserB.matchInTotalStatistic,
    );
    const trainingsCompare = this.head2HeadTrainings(
      statsUserA.trainingInTotalStatistics,
      statsUserB.trainingInTotalStatistics,
    );

    const checkExistHead2Head = await db
      .collection(TypeRequest.HEAD_2_HEAD)
      .where('userIdA', '==', userId)
      .where('userIdB', '==', userIdQuery)
      .get();

    if (!checkExistHead2Head.docs.length) {
      await db.collection(TypeRequest.HEAD_2_HEAD).add({
        relationshipId: userId,
        userIdA: userId,
        userIdB: userIdQuery,
        status: Status.ACCEPTED,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      });
    }

    return {
      bioCompare,
      trophiesCompare,
      awardsCompare,
      capsCompare,
      matchesCompare,
      trainingsCompare,
    };
  }

  async shareBio(userId: string) {
    const { type } = await mappingUserInfoById(userId);

    let userInfoFormatted: PlayerBioProfileDto | CoachBio;

    if (type === UserTypes.PLAYER) {
      userInfoFormatted = await this.getFormattedPlayerBio(userId);
    }

    if (type === UserTypes.COACH) {
      userInfoFormatted = await this.getFormattedCoachBio(userId);
    }

    const countRelationship = await this.friendsService.getCountRelationship(
      userId,
    );

    const newShareBio = await db.collection('shared_biographies').add(
      JSON.parse(
        JSON.stringify({
          ...userInfoFormatted,
          ...countRelationship,
          createdAt: +moment().format('x'),
          updatedAt: +moment().format('x'),
          typeOfPost: TypeOfPost.SHARED_BIOGRAPHIES,
        }),
      ),
    );

    this.feedService.synchronizePostsToMongoose({
      postId: newShareBio.id,
      typeOfPost: TypeOfPost.SHARED_BIOGRAPHIES,
    });

    return 'Shared biography successfully';
  }

  async getCoachTotalStats(userId: string) {
    const dateRangeQueryForTotal: DashboardQueryBuilder = {
      dashboardTab: DashBoardTab.TRAINING,
      lastDateRange: LastDateRange.ALL,
    };

    const [
      statsItemsWithArrows,
      matchDataTotal,
      trainingDataTotal,
      historicCareerDocs,
    ] = await Promise.all([
      this.getMatchStatsWithArrows(userId, UserTypes.COACH),
      this.dashboardService.getMatchStats(dateRangeQueryForTotal, userId),
      this.dashboardService.getDiariesStats(
        dateRangeQueryForTotal,
        userId,
        true,
      ),
      this.careerService.getClubCareers(userId, {
        limit: 20,
        type: CareerTypes.Historic,
      }),
    ]);

    const matchStatsTotal = this.combineHistoricAndAverageMatchesStats(
      matchDataTotal,
      historicCareerDocs,
      UserTypes.COACH,
    );

    const { matchInTotalStatistic, statsItems } = matchStatsTotal;

    // combine total Stats and arrows trend
    statsItemsWithArrows.forEach((arrow) => {
      statsItems.forEach((total) => {
        if (arrow.title === total.title) {
          arrow.value = total.value;
        }
      });
    });

    const trainingInTotalStatistics = this.formatTrainingInTotalStatistics(
      trainingDataTotal as OutputTrainingBio,
    );

    //TODO
    /*
    programs
    challenges
    */

    return {
      statsItems: statsItemsWithArrows,
      matchInTotalStatistic,
      trainingInTotalStatistics,
    };
  }

  async getCoachCurrentSeasonStats(
    userId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { startDate, endDate } = playerBioStatsDto;

    if (!startDate || !endDate) {
      throw new HttpException(
        'Date Range includes both startDate and EndDate for past season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [statsItemsWithArrows, getCurrentSeasonData] = await Promise.all([
      await this.getMatchStatsWithArrows(userId, UserTypes.COACH),
      this.getPlayerStatsForDateRangeV2(userId, playerBioStatsDto),
    ]);

    const { matchInTotalStatistic, trainingInTotalStatistics, statsItems } =
      getCurrentSeasonData;

    // combine total Stats and arrows trend
    statsItemsWithArrows.forEach((arrow) => {
      statsItems.forEach((total) => {
        if (arrow.title === total.title) {
          arrow.value = total.value;
        }
      });
    });

    return {
      statsItems: statsItemsWithArrows,
      matchInTotalStatistic,
      trainingInTotalStatistics,
    };
  }

  async getCoachStatsForDateRange(
    userId: string,
    playerBioStatsDto: PlayerBioStatsDto,
  ) {
    const { startDate, endDate, startAfter, season } = playerBioStatsDto;

    if (!startDate || !endDate) {
      throw new HttpException(
        'Date Range includes both startDate and EndDate for past season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dateRangeQuery: DashboardQueryBuilder = {
      dashboardTab: DashBoardTab.TRAINING,
      fromDate: startDate,
      toDate: endDate,
      lastDateRange: LastDateRange.ALL,
    };

    const [matchData, trainingData, historicCareerDocs] = await Promise.all([
      this.dashboardService.getMatchStats(dateRangeQuery, userId),
      this.dashboardService.getDiariesStats(dateRangeQuery, userId, true),
      this.careerService.getClubCareers(userId, {
        limit: 20,
        startAfter,
        type: CareerTypes.Historic,
        season,
      }),
    ]);

    const { statsItems, matchInTotalStatistic } =
      this.combineHistoricAndAverageMatchesStats(
        matchData as OutputMatchTab,
        historicCareerDocs,
        UserTypes.COACH,
      );

    const trainingInTotalStatistics = this.formatTrainingInTotalStatistics(
      trainingData as OutputTrainingBio,
    );

    return {
      statsItems,
      matchInTotalStatistic,
      trainingInTotalStatistics,
    };
  }

  async getUserUrlForSEO(userSEORequest: UserUrlSEOResquest) {
    const users = await db.collection('users').get();

    const url = [];
    for (let index = 0; index < users.docs.length; index++) {
      if (userSEORequest.limit && url.length == userSEORequest.limit) {
        break;
      }
      const user = users.docs[index].data();

      if (user?.username && user?.profile?.firstName && user?.type) {
        url.push(
          getBioUrl({
            firstName: user?.profile?.firstName,
            lastName: user?.profile?.lastName,
            type: user?.type,
            username: user?.username,
          }),
        );
      }
    }

    return {
      message: 'Success',
      numberOfData: url.length,
      data: url,
    };
  }
  async getEducationTypeSummary(userId: string) {
    try {
      console.log('Incomming req');
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const educationList = userDoc.data()?.education || [];
      console.log(educationList);
      const summary = {
        Diploma: 0,
        Bachelor: 0,
        Master: 0,
        License: 0,
        Doctor: 0,
        Other: 0,
      };

      for (const edu of educationList) {
        const type = edu.typeOfDegree;
        if (summary.hasOwnProperty(type)) {
          summary[type]++;
        } else {
          summary.Other++;
        }
      }

      return summary;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get education summary',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
