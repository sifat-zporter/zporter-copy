import { SendEmailService } from './../send-email/send-email.service';
import { Query } from '@google-cloud/bigquery';
import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as moment from 'moment';
import {
  BigQueryTable,
  developmentProgressLevel,
  GenderTypes,
  levelDiary,
  painLevel,
} from '../../common/constants/common.constant';
import { SendEmailDto } from '../../common/dto/send-email.dto';
import {
  PaginationDto,
  ResponsePagination,
  SortBy,
} from '../../common/pagination/pagination.dto';
import { bq, db } from '../../config/firebase.config';
import { commonPagination } from '../../helpers/common-pagination';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { aggregateSumByDate } from '../../utils/aggregate-sum-by-date';
import { calculatePercent } from '../../utils/calculate-percent';
import { calculatePercentOfHours } from '../../utils/calculate-percent-of-hours';
import { sendEmailTemplate } from '../../utils/email-service';
import { findMostElementAppear } from '../../utils/find-most-el-appear';
import { getDaysArray } from '../../utils/get-days-array';
import { getKeyByValue } from '../../utils/get-key-by-value';
import { mappedDataByDate } from '../../utils/mapping-data-by-date';
import { mergeArray } from '../../utils/merge-array';
import { collection } from '../../utils/query-collection';
import { splitDate } from '../../utils/split-date-range';
import { BiographyService } from '../biography/biography.service';
import { DiaryService } from '../diaries/diaries.service';
import {
  EatAndDrink,
  EnergyLevel,
  Event,
  PainLevel,
  Sleep,
  TypeOfGame,
  TypeOfTraining,
} from '../diaries/enum/diaries.enum';
import { Diary, Injury } from '../diaries/interfaces/diaries.interface';
import { TypeOfPost } from '../feed/dto/feed.req.dto';
import { FeedService } from '../feed/feed.service';
import { FriendsService } from '../friends/friends.service';
import { GetHealthChartQuery } from '../healths/dto/health.req.dto';
import { HealthsService } from '../healths/healths.service';
import {
  CreateNotificationDto,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { TypeOfDiary } from './../diaries/enum/diaries.enum';
import {
  BaseQueryBuilder,
  DashboardQueryBuilder,
  DaysArray,
  GetDevelopmentTalkChartDto,
  GetDiaryRoutineChartQuery,
  GetLeaderBoardQuery,
  GetListDiariesReportDto,
  GetListDiariesReportQuery,
  GetListDreamTeamQuery,
  GetMatchChartQuery,
  LeaderBoardCategory,
  ShareCapturedDreamTeamDto,
  ShareCapturedLeaderBoardDto,
} from './dto/dashboard.req.dto';
import {
  CommonChartDo,
  DayUsageDto,
  DevelopmentProgressPercent,
  DiaryRoutineDto,
  MatchesHoursDto,
  MatchInTotalStatisticDto,
  MatchResultsDto,
  MatchStatisticAverageDto,
  OutputDiaryRoutineChart,
  OutputInjuriesChart,
  OutputInjuryDto,
  OutputLeaderBoardDto,
  OutputListDiaryRoutine,
  OutputMatchesChart,
  OutputMatchTab,
  OutputTotalTab,
  OutputTrainingBio,
  OutputTrainingTab,
  SessionsRequestDto,
  TotalHoursDto,
  TrainingCategoryDto,
  TrainingCategoryOfTotalHoursDto,
  TrainingHoursDto,
  TrainingTypeDto,
  TrainingTypeOfTotalHoursDto,
} from './dto/dashboard.res.dto';
import {
  DashBoardTab,
  DiaryRoutine,
  LastDateRange,
  MatchChartType,
} from './enum/dashboard-enum';
import { DashboardBigQueryService } from './repositories/dashboard.repository';
import { mapArrayObject } from '../../helpers/map-object';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardBigQueryService: DashboardBigQueryService,
    private readonly notificationsService: NotificationsService,
    private readonly friendsService: FriendsService,
    private readonly healthsService: HealthsService,
    @Inject(forwardRef(() => BiographyService))
    private readonly biographyService: BiographyService,
    @Inject(forwardRef(() => DiaryService))
    private readonly diaryService: DiaryService,
    @Inject(forwardRef(() => FeedService))
    private readonly feedService: FeedService,
    @Inject(forwardRef(() => SendEmailService))
    private readonly sendEmailService: SendEmailService,
  ) {}

  async getListDreamTeams(getListDreamTeamQuery: GetListDreamTeamQuery) {
    return this.diaryService.getListDreamTeam(getListDreamTeamQuery);
  }

  async shareDreamTeam(
    currentUserId: string,
    shareCapturedDreamTeamDto: ShareCapturedDreamTeamDto,
  ) {
    return this.diaryService.shareDreamTeam(
      currentUserId,
      shareCapturedDreamTeamDto,
    );
  }

  async shareLeaderBoard(
    currentUserId: string,
    shareCapturedLeaderBoardDto: ShareCapturedLeaderBoardDto,
  ) {
    const newShareLeaderBoard = await db.collection('shared_leaderboard').add({
      ...shareCapturedLeaderBoardDto,
      userId: currentUserId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      typeOfPost: TypeOfPost.SHARED_LEADERBOARD,
    });

    return this.feedService.synchronizePostsToMongoose({
      postId: newShareLeaderBoard.id,
      typeOfPost: TypeOfPost.SHARED_LEADERBOARD,
    });
  }

  async monthlySendMailLeaderBoard() {
    const { data: top10LeaderboardUsers } = await this.getListLeaderBoards({
      lastDateRange: LastDateRange.THIRTY_DAY,
      limit: 10,
      startAfter: 1,
      category: LeaderBoardCategory.HOURS,
      sorted: SortBy.DESC,
    });

    if (top10LeaderboardUsers.length) {
      const sendEmailLeaderboard = top10LeaderboardUsers.map(
        async ({ userInfo: { userId, email, fullName } }) => {
          const [currentRank, prevRank] = await Promise.all([
            this.dashboardBigQueryService.getRankNumber(userId, 30),
            this.dashboardBigQueryService.getRankNumber(userId, 60),
          ]);
          const data = top10LeaderboardUsers
            .map(
              (
                {
                  userInfo: {
                    firstName,
                    lastName,
                    clubName,
                    birthCountry: { name },
                  },
                  value,
                }: OutputLeaderBoardDto,
                idx,
              ) => {
                const position = idx++ + 1;
                return {
                  [`firstName${position}`]: firstName,
                  [`lastName${position}`]: lastName,
                  [`clubName${position}`]: clubName,
                  [`hours${position}`]: value,
                  receiverName: fullName,
                  country: name,
                };
              },
            )
            .reduce((acc, e) => {
              return Object.assign(acc, e, {});
            });

          const dynamic_template_data = {
            ...data,
            curPosition: currentRank,
            prevPosition: prevRank,
          };

          await this.sendEmailService.sendMidMonthly({
            email,
            dynamic_template_data,
          });
        },
      );

      await Promise.all(sendEmailLeaderboard);
    }
  }

  async monthlySendMailVisitsAndVisitorsLeaderBoard() {
    const top10VisitorsLeaderBoard =
      await this.biographyService.getVisitorLeaderBoard();

    if (top10VisitorsLeaderBoard.length) {
      const sendEmailLeaderboard = top10VisitorsLeaderBoard.map(
        async ({ userInfo: { userId, email, fullName } }) => {
          const [curVisitsNum, curVisitorsNum, prevVisitsNum, prevVisitorsNum] =
            await Promise.all([
              this.biographyService.countVisitBiographies(userId, 30),
              this.biographyService.countVisitorBiographies(userId, 60),
              this.biographyService.countVisitBiographies(userId, 60),
              this.biographyService.countVisitorBiographies(userId, 60),
            ]);

          const data = top10VisitorsLeaderBoard
            .map(
              (
                {
                  userInfo: {
                    firstName,
                    lastName,
                    clubName,
                    birthCountry: { name },
                    type,
                  },
                },
                idx,
              ) => {
                const position = idx++ + 1;

                return {
                  [`firstName${position}`]: firstName,
                  [`lastName${position}`]: lastName,
                  [`role${position}`]:
                    type.substring(0, 1) +
                    type.substring(1, type.length).toLowerCase(),
                  [`clubName${position}`]: clubName,
                  receiverName: fullName,
                  country: name,
                };
              },
            )
            .reduce((acc, e) => {
              return Object.assign(acc, e, {});
            });

          const dynamic_template_data = {
            ...data,
            curVisitsNum,
            curVisitorsNum,
            prevVisitsNum,
            prevVisitorsNum,
          };

          await this.sendEmailService.sendMonthly({
            email,
            dynamic_template_data,
          });
        },
      );

      await Promise.all(sendEmailLeaderboard);
    }
  }

  async getFriendsStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.friendsService.getFriendsStats(currentUserId, baseQueryBuilder);
  }

  async getFansStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.friendsService.getFansStats(currentUserId, baseQueryBuilder);
  }

  async getVisitorStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.biographyService.getVisitorStats(
      currentUserId,
      baseQueryBuilder,
    );
  }

  async getVisitsStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    return this.biographyService.getVisitsStats(
      currentUserId,
      baseQueryBuilder,
    );
  }

  async getListLeaderBoards(
    getLeaderBoardQuery: GetLeaderBoardQuery,
    userId?: string,
  ): Promise<ResponsePagination<OutputLeaderBoardDto>> {
    const { category, startAfter } = getLeaderBoardQuery;
    const asValue = 'value';

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const categories = [
      {
        category: LeaderBoardCategory.HOURS,
        select: `, SUM(cast(json_value(${BigQueryTable.DIARIES}.DATA, '$.training.hoursOfPractice') AS numeric)) AS ${asValue}`,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
        joinOn: `ON json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        queryCondition: null,
      },
      {
        category: LeaderBoardCategory.SESSION,
        select: `, COUNT(json_query(${BigQueryTable.DIARIES}.data, '$.typeOfDiary')) as ${asValue}`,
        unnest: null,
        queryCondition: `\n
        WHERE
          json_value(${BigQueryTable.DIARIES}.data, '$.typeOfDiary') != '${TypeOfDiary.CAP}'
        AND
          json_value(${BigQueryTable.DIARIES}.data, '$.typeOfDiary') != '${TypeOfDiary.REST}'
        `,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
        joinOn: `ON json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
      },
      {
        category: LeaderBoardCategory.GOALS,
        select: `, COUNT(${LeaderBoardCategory.GOALS}) as ${asValue}`,
        unnest: `, UNNEST(json_extract_array(DATA, '$.match.events')) AS ${LeaderBoardCategory.GOALS}`,
        queryCondition: `\n WHERE json_value(${LeaderBoardCategory.GOALS}, '$.event') = 'GOAL'`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
        joinOn: `ON json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
      },
      {
        category: LeaderBoardCategory.ASSISTS,
        select: `, COUNT(${LeaderBoardCategory.ASSISTS}) as ${asValue}`,
        unnest: `, UNNEST(json_extract_array(DATA, '$.match.events')) AS ${LeaderBoardCategory.ASSISTS}`,
        queryCondition: `\n WHERE json_value(${LeaderBoardCategory.ASSISTS}, '$.event') = 'ASSIST'`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
        joinOn: `ON json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
      },
      {
        category: LeaderBoardCategory.POINTS,
        select: `, COUNT(${LeaderBoardCategory.POINTS}) as ${asValue}`,
        unnest: `, UNNEST(json_extract_array(DATA, '$.match.events')) AS ${LeaderBoardCategory.POINTS}`,
        queryCondition: `\n WHERE json_value(${LeaderBoardCategory.POINTS}, '$.event') IN ('ASSIST', 'GOAL')`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
        joinOn: `ON json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
      },
      {
        category: LeaderBoardCategory.CARDS,
        select: `, COUNT(${LeaderBoardCategory.CARDS}) as ${asValue}`,
        unnest: `, UNNEST(json_extract_array(DATA, '$.match.events')) AS ${LeaderBoardCategory.CARDS}`,
        queryCondition: `\n WHERE json_value(${LeaderBoardCategory.CARDS}, '$.event') IN ('RED_CARD', 'YELLOW_CARD')`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
        joinOn: `ON json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
      },
      {
        category: LeaderBoardCategory.REVIEWS,
        select: ` json_value(REVIEWS, '$.userId') AS userId,
                  ROUND(AVG(CAST(json_value(${LeaderBoardCategory.REVIEWS}, '$.performance') AS numeric))) as ${asValue}`,
        unnest: `, UNNEST(json_extract_array(DATA, '$.match.playerReviews')) AS ${LeaderBoardCategory.REVIEWS}`,
        joinOn: ` ON json_value(${LeaderBoardCategory.REVIEWS} , '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        timeFilter: ` CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)`,
        fromTable: ` FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`,
      },
      {
        category: LeaderBoardCategory.FRIENDS,
        select: ` json_value(${BigQueryTable.FRIENDS}.data, '$.userId') AS userId,
                  ARRAY_LENGTH(ARRAY_AGG(json_value(${BigQueryTable.FRIENDS}.data, '$.relationshipId'))) AS ${asValue}`,
        queryCondition: `\n WHERE json_value(${BigQueryTable.FRIENDS}.data, '$.status') = 'accepted'`,
        fromTable: `\nFROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}`,
        joinOn: ` ON json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        timeFilter: ` CAST(json_value(${BigQueryTable.FRIENDS}.DATA, '$.updatedAt') as numeric)`,
      },
      {
        category: LeaderBoardCategory.FANS,
        select: ` json_value(${BigQueryTable.FOLLOWS}.data, '$.relationshipId') AS userId,
                  ARRAY_LENGTH(ARRAY_AGG(json_value(${BigQueryTable.FOLLOWS}.data, '$.userId'))) AS ${asValue}`,
        queryCondition: `\n WHERE json_value(${BigQueryTable.FOLLOWS}.data, '$.status') = 'accepted'`,
        fromTable: `\nFROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FOLLOWS}_raw_latest\` AS ${BigQueryTable.FOLLOWS}`,
        joinOn: ` ON json_value(${BigQueryTable.FOLLOWS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`,
        timeFilter: ` CAST(json_value(${BigQueryTable.FOLLOWS}.DATA, '$.updatedAt') as numeric)`,
      },
    ];

    const select = categories.find((cat) => cat.category === category)?.select;
    const unnest = categories.find((cat) => cat.category === category)?.unnest;
    const fromTable = categories.find(
      (cat) => cat.category === category,
    )?.fromTable;
    const joinOn = categories.find((cat) => cat.category === category)?.joinOn;
    const timeFilter = categories.find(
      (cat) => cat.category === category,
    )?.timeFilter;
    const queryCondition = categories.find(
      (cat) => cat.category === category,
    )?.queryCondition;

    const { data, count } =
      await this.dashboardBigQueryService.getListLeaderBoardsV2(
        getLeaderBoardQuery,
        userId,
        select,
        unnest,
        queryCondition,
        fromTable,
        joinOn,
        timeFilter,
      );

    return commonPagination(getLeaderBoardQuery, data, count);
  }

  async countWinMatch(currentUserId: string, lastDateRange: LastDateRange) {
    let totalWinMatch = 0;

    const fromDate = +moment
      .utc()
      .subtract(+lastDateRange - 1, 'd')
      .format('x');

    const toDate = +moment.utc().format('x');

    const query = `
    SELECT
      json_value(${BigQueryTable.DIARIES}.data, '$.match.result.yourTeam') as yourTeam,
      json_value(${BigQueryTable.DIARIES}.data, '$.match.result.opponents') as opponents
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
    WHERE
    CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') AS numeric) BETWEEN ${fromDate} AND ${toDate}
    AND
      json_value(${BigQueryTable.DIARIES}.data, '$.typeOfDiary') = '${TypeOfDiary.MATCH}'
    AND
      json_value(${BigQueryTable.DIARIES}.data, '$.userId') = '${currentUserId}'
    LIMIT
      10`;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    rows.map(({ yourTeam, opponents }) => {
      if (yourTeam > opponents) {
        totalWinMatch++;
      }
    });

    return totalWinMatch;
  }

  async getPlayerOfTheWeek() {
    const fromDate = +moment.utc().subtract(6, 'd').format('x');
    const toDate = +moment.utc().format('x');
    const checkDay = moment.utc().format('YYYY-MM-DDT00:00:00+01:00');
    const fromCheck = Math.floor(new Date(checkDay).getTime());
    const toCheck = toDate + (3600000 * 24 - 1);

    const record = await this.feedService.getFeedPlayerOfTheWeek(
      fromCheck,
      toCheck,
    );
    if (record.length == 0) {
      const query = `
      SELECT
          json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') AS userId , COUNT(POINTS) as value
      FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES},
      UNNEST(json_extract_array(DATA, '$.match.events')) AS POINTS
      LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
      ON
          json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
      WHERE
          json_value(POINTS, '$.event') IN ('ASSIST', 'GOAL')
      AND
          CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric) BETWEEN ${fromDate} AND ${toDate}
      GROUP BY
          userId
      HAVING
        value > 0
      ORDER BY
          value DESC
      LIMIT
          1
      OFFSET
          0
      `;

      const options: Query = {
        query,
        location: process.env.REGION,
      };

      const [job] = await bq.createQueryJob(options);
      const [rows] = await job.getQueryResults();

      const userId = rows[0]?.userId;

      if (userId) {
        const [
          userInfo,
          wins,
          {
            data: [{ value: hours } = 0],
          },
          {
            data: [{ value: sessions } = 0],
          },
          {
            data: [{ value: goals } = 0],
          },
          {
            data: [{ value: assists } = 0],
          },
          {
            data: [{ value: ztar } = 0],
          },
          countRelationship,
        ] = await Promise.all([
          mappingUserInfoById(userId),
          this.countWinMatch(userId, LastDateRange.SEVEN_DAY),
          this.getListLeaderBoards(
            {
              lastDateRange: LastDateRange.SEVEN_DAY,
              limit: 1,
              startAfter: 1,
              category: LeaderBoardCategory.HOURS,
              sorted: SortBy.DESC,
            },
            userId,
          ) as any,
          this.getListLeaderBoards(
            {
              lastDateRange: LastDateRange.SEVEN_DAY,
              limit: 1,
              startAfter: 1,
              category: LeaderBoardCategory.SESSION,
              sorted: SortBy.DESC,
            },
            userId,
          ) as any,
          this.getListLeaderBoards(
            {
              lastDateRange: LastDateRange.SEVEN_DAY,
              limit: 1,
              startAfter: 1,
              category: LeaderBoardCategory.GOALS,
              sorted: SortBy.DESC,
            },
            userId,
          ) as any,
          this.getListLeaderBoards(
            {
              lastDateRange: LastDateRange.SEVEN_DAY,
              limit: 1,
              startAfter: 1,
              category: LeaderBoardCategory.ASSISTS,
              sorted: SortBy.DESC,
            },
            userId,
          ) as any,
          this.getListLeaderBoards(
            {
              lastDateRange: LastDateRange.SEVEN_DAY,
              limit: 1,
              startAfter: 1,
              category: LeaderBoardCategory.REVIEWS,
              sorted: SortBy.DESC,
            },
            userId,
          ) as any,
          this.friendsService.getCountRelationshipFromMongo(userId),
        ]);

        const newPoW = await db.collection('player_of_the_weeks').add({
          title: 'Player of the Week',
          userId,
          sessions: sessions || 0,
          wins: wins || 0,
          goals: goals || 0,
          assists: assists || 0,
          hours: hours || 0,
          ztar: ztar || 0,
          ...countRelationship,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
          typeOfPost: TypeOfPost.PLAYER_OF_THE_WEEK,
        });

        this.feedService.synchronizePostsToMongoose({
          postId: newPoW.id,
          typeOfPost: TypeOfPost.PLAYER_OF_THE_WEEK,
        });

        const payload = new CreateNotificationDto();

        payload.senderId = '';
        payload.receiverId = userId;
        payload.token = userInfo.fcmToken;
        payload.title = 'Zporter';
        payload.largeIcon = `${process.env.ZPORTER_IMAGE}`;
        payload.notificationType = NotificationType.PLAYER_OF_THE_WEEK;
        payload.userType = UserTypes.SYS_ADMIN;

        return this.notificationsService.sendMulticastNotification(payload);
      }
    } else {
      return;
    }
  }

  async getDiariesStats(
    dashboardQueryBuilder: DashboardQueryBuilder,
    userId: string,
    bioTrainingInTotal?: boolean,
  ): Promise<
    OutputTotalTab | OutputTrainingTab | OutputMatchTab | OutputTrainingBio
  > {
    const { dashboardTab, lastDateRange, fromDate, toDate, playerId } =
      dashboardQueryBuilder;

    const currentUserId = playerId ? playerId : userId;

    let personal = collection('diaries').where('userId', '==', currentUserId);

    let average = collection('diaries');

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      personal = personal
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);

      average = average
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    if (fromDate && toDate) {
      const start = +moment.utc(fromDate).format('x');
      const end = +moment.utc(toDate).format('x');

      personal = personal
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end);

      average = average
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end);
    }

    if (dashboardTab === DashBoardTab.TRAINING) {
      personal = personal
        .where('typeOfDiary', '==', DashBoardTab.TRAINING)
        .select(
          'createdAt',
          'training.typeOfTraining',
          'training.physicallyStrain',
          'training.hoursOfPractice',
          'training.technics',
          'training.tactics',
          'training.mental',
          'training.physics',
          'training.practiceTags',
          'userId',
          'typeOfDiary',
          'weeksTeam',
          'weeksPersonal',
          'avgTeam',
          'avgPersonal',
        );

      average = average
        .where('typeOfDiary', '==', DashBoardTab.TRAINING)
        .select(
          'createdAt',
          'training.typeOfTraining',
          'training.physicallyStrain',
          'training.hoursOfPractice',
          'training.technics',
          'training.tactics',
          'training.mental',
          'training.physics',
          'training.practiceTags',
          'userId',
          'typeOfDiary',
          'weeksTeam',
          'weeksPersonal',
          'avgTeam',
          'avgPersonal',
        );
    }

    if (dashboardTab === DashBoardTab.MATCH) {
      personal = personal
        .where('typeOfDiary', 'in', [dashboardTab, 'CAP'])
        .orderBy('createdAt')
        .select(
          'createdAt',
          'typeOfDiary',
          'match.opponentClub',
          'match.result',
          'match.events',
          'match.length',
          'cap.opponentClub',
          'cap.result',
          'cap.events',
          'cap.length',
          'userId',
        );

      average = average
        .where('typeOfDiary', 'in', [dashboardTab, 'CAP'])
        .orderBy('createdAt')
        .select(
          'createdAt',
          'typeOfDiary',
          'match.opponentClub',
          'match.result',
          'match.events',
          'match.length',
          'cap.opponentClub',
          'cap.result',
          'cap.events',
          'cap.length',
          'userId',
        );
    }

    const [personalDiaryRef, averageDiaryRef] = await Promise.all([
      personal.get(),
      average.get(),
    ]);

    if (
      dashboardTab === DashBoardTab.TRAINING ||
      dashboardTab === DashBoardTab.TOTAL
    ) {
      if (bioTrainingInTotal) {
        const personalStatsTotal = this.calculateDiaryStats(
          personalDiaryRef,
          dashboardTab,
          false,
          true,
        );
        const result = new OutputTrainingBio();

        result.sessions = personalStatsTotal.sessions;
        result.trainingHours = personalStatsTotal.trainingHours;
        result.trainingCategory = personalStatsTotal.trainingCategory;

        return result;
      }
      const personalStats = this.calculateDiaryStats(
        personalDiaryRef,
        dashboardTab,
      );

      const averageStats = this.calculateDiaryStats(
        averageDiaryRef,
        dashboardTab,
        true,
      );

      if (dashboardTab === DashBoardTab.TOTAL) {
        const dayUsage = await this.getDayUsage(
          currentUserId,
          dashboardQueryBuilder,
        );
        const result = new OutputTotalTab();

        result.personalTrainingHours = personalStats.trainingHours;
        result.averageTrainingHours = averageStats.trainingHours;
        result.personalMatchHours = personalStats.matchHours;
        result.averageMatchHours = averageStats.matchHours;
        result.personalTotalHours = personalStats.totalHours;
        result.averageTotalHours = averageStats.totalHours;
        result.trainingCategory = personalStats.trainingCategory;
        result.matchResults = personalStats.matchResults;
        result.dayUsage = dayUsage;

        return result;
      }

      if (dashboardTab === DashBoardTab.TRAINING) {
        const result = new OutputTrainingTab();

        result.personalSessions = personalStats.sessions;
        result.averageSessions = averageStats.sessions;

        result.personalTrainingHours = personalStats.trainingHours;
        result.averageTrainingHours = averageStats.trainingHours;

        result.personalMatchHours = personalStats.matchHours;
        result.averageMatchHours = averageStats.matchHours;

        result.personalTotalHours = personalStats.totalHours;
        result.averageTotalHours = averageStats.totalHours;

        result.personalTrainingCategory = personalStats.trainingCategory;
        result.averageTrainingCategory = averageStats.trainingCategory;

        result.trainingType = personalStats.trainingType;

        result.personalTrainingCategoryOfTotalHours =
          personalStats.trainingCategoryOfTotalHours;

        result.averageTrainingCategoryOfTotalHours =
          averageStats.trainingCategoryOfTotalHours;

        result.personalTrainingTypeOfTotalHours =
          personalStats.trainingTypeOfTotalHours;

        result.averageTrainingTypeOfTotalHours =
          averageStats.trainingTypeOfTotalHours;

        return result;
      }
    }

    if (dashboardTab === DashBoardTab.MATCH) {
      const matchStatistic: OutputMatchTab = await this.getMatchStats(
        dashboardQueryBuilder,
        currentUserId,
      );

      return { ...matchStatistic };
    }
  }

  async getListDiariesReport(
    getListDiariesReportQuery: GetListDiariesReportQuery,
    currentUserId: string,
  ): Promise<Diary[]> {
    let data = [];
    const { limit, startAfter, dashboardTab, playerId, sorted } =
      getListDiariesReportQuery;

    if (dashboardTab === DashBoardTab.TOTAL) {
      throw new HttpException(
        'Please choose one of them: Training or Match',
        HttpStatus.BAD_REQUEST,
      );
    }

    const diaryRef = db
      .collection('diaries')
      .orderBy('createdAt', sorted)
      .where('userId', '==', playerId ? playerId : currentUserId);

    if (dashboardTab === DashBoardTab.TRAINING) {
      let diaryTraining = diaryRef
        .where('typeOfDiary', '==', dashboardTab)
        .select(
          'createdAt',
          'typeOfDiary',
          'training.typeOfTraining',
          'training.physicallyStrain',
          'training.hoursOfPractice',
          'training.technics',
          'training.tactics',
          'training.mental',
          'training.physics',
          'training.practiceTags',
          'season',
          'weeksTeam',
          'avgTeam',
          'weeksPersonal',
          'avgPersonal',
          'avgHours',
        );

      if (startAfter) {
        diaryTraining = diaryTraining.startAfter(+startAfter).limit(+limit);
      }

      if (!startAfter) {
        diaryTraining = diaryTraining.limit(+limit);
      }

      const querySnapshot = await diaryTraining.get();
      querySnapshot.forEach((doc) => {
        const dataDoc = doc.data();
        if (
          dataDoc.training.typeOfTraining == TypeOfTraining.HISTORIC_TRAINING
        ) {
          const { weeksTeam, avgTeam, weeksPersonal, avgPersonal, avgHours } =
            dataDoc;
          const hours =
            avgHours * (weeksTeam * avgTeam + weeksPersonal * avgPersonal);
          data.push({ ...dataDoc, hours, diaryId: doc.id });
        } else {
          data.push({ ...dataDoc, diaryId: doc.id });
        }
      });
    }

    if (dashboardTab === DashBoardTab.MATCH) {
      let diaryMatch = diaryRef
        .where('typeOfDiary', '==', dashboardTab)
        .select(
          'createdAt',
          'typeOfDiary',
          'match.opponentClub',
          'match.result',
          'match.events',
          'match.stats',
          'match.dateTime',
        )
        .orderBy('match.dateTime', sorted);

      let diaryCap = diaryRef
        .where('typeOfDiary', '==', 'CAP')
        .select(
          'createdAt',
          'typeOfDiary',
          'cap.dateTime',
          'cap.opponentCountry',
          'cap.result',
          'cap.events',
          'cap.stats',
        )
        .orderBy('cap.dateTime', sorted);

      if (startAfter) {
        diaryMatch = diaryMatch.startAfter(+startAfter).limit(+limit);
        diaryCap = diaryCap.startAfter(+startAfter).limit(+limit);
      }

      if (!startAfter) {
        diaryMatch = diaryMatch.limit(+limit);
        diaryCap = diaryCap.limit(+limit);
      }

      const matchSnapshot = await diaryMatch.get();
      const capSnapshot = await diaryCap.get();
      matchSnapshot.forEach((doc) => {
        const dataDoc = doc.data();
        if (
          [TypeOfDiary.CAP, TypeOfDiary.MATCH].includes(dataDoc.typeOfDiary)
        ) {
          const match =
            dataDoc.typeOfDiary === TypeOfDiary.MATCH
              ? {
                  ...dataDoc?.match,
                  length: dataDoc.match?.stats?.reduce(
                    (prev, curr) => (prev += curr.minutesPlayed),
                    0,
                  ),
                }
              : {
                  ...dataDoc?.cap,
                  length: dataDoc.cap?.stats?.reduce(
                    (prev, curr) => (prev += curr.minutesPlayed),
                    0,
                  ),
                };

          data.push({ ...dataDoc, match, diaryId: doc.id });
        } else {
          data.push({ ...dataDoc, diaryId: doc.id });
        }
      });

      capSnapshot.forEach((doc) => {
        const dataDoc = doc.data();
        if (
          [TypeOfDiary.CAP, TypeOfDiary.MATCH].includes(dataDoc.typeOfDiary)
        ) {
          const match =
            dataDoc.typeOfDiary === TypeOfDiary.MATCH
              ? {
                  ...dataDoc?.match,
                  length: dataDoc.match?.stats?.reduce(
                    (prev, curr) => (prev += curr.minutesPlayed),
                    0,
                  ),
                }
              : {
                  ...dataDoc?.cap,
                  length: dataDoc.cap?.stats?.reduce(
                    (prev, curr) => (prev += curr.minutesPlayed),
                    0,
                  ),
                };

          data.push({ ...dataDoc, match, diaryId: doc.id });
        } else {
          data.push({ ...dataDoc, diaryId: doc.id });
        }
      });

      data.sort((a, b) => {
        const aDate = new Date(a.match?.dateTime ?? a.cap?.dateTime);
        const bDate = new Date(b.match?.dateTime ?? b.cap?.dateTime);
        if (sorted === SortBy.ASC) return aDate.getTime() - bDate.getTime();
        else return bDate.getTime() - aDate.getTime();
      });

      data = data.slice(0, +limit);
    }

    return data;
  }

  async getMatchStats(
    baseQueryBuilder: BaseQueryBuilder,
    currentUserId: string,
  ): Promise<OutputMatchTab> {
    const { fromDate, toDate, lastDateRange } = baseQueryBuilder;
    let seriesMatch = 0;
    let cupMatch = 0;
    let friendlyMatch = 0;
    let capMatch = 0;
    let otherMatch = 0;

    let matchWins = 0;
    let matchDraws = 0;
    let matchLosses = 0;

    let teamGoals = 0;
    let teamLetInGoals = 0;

    let role: { role: string; minutesPlayed: number };

    let teamPlayingTime = 0;
    let personalPlayingTime = 0;

    let personalGoals = 0;
    let personalAssists = 0;
    let personalYellowCard = 0;
    let personalRedCard = 0;

    let diaryRef = collection('diaries')
      .where('userId', '==', currentUserId)
      .where('typeOfDiary', 'in', [TypeOfDiary.MATCH, TypeOfDiary.CAP]);

    if (fromDate && toDate) {
      const from = +moment.utc(fromDate).startOf('day').format('x');
      const to = +moment.utc(toDate).endOf('day').format('x');

      diaryRef = diaryRef
        .where('createdAt', '>=', from)
        .where('createdAt', '<=', to);
    }

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      diaryRef = diaryRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const querySnapshot = await diaryRef.get();
    const totalRoles = new Map();

    querySnapshot.forEach((doc) => {
      const { match, typeOfDiary, cap } = doc.data();

      // Get total of quantity each type match
      if (match?.typeOfGame === TypeOfGame.CUP) {
        cupMatch++;
      }
      if (match?.typeOfGame === TypeOfGame.SERIES) {
        seriesMatch++;
      }
      if (match?.typeOfGame === TypeOfGame.FRIENDLY) {
        friendlyMatch++;
      }
      if (match?.typeOfGame === TypeOfGame.OTHER) {
        otherMatch++;
      }
      if (typeOfDiary === TypeOfDiary.CAP) {
        capMatch++;
      }
      // Sum of length match
      teamPlayingTime += match?.length || cap?.length || 0;

      // Sum of goals of team
      teamGoals += match?.result?.yourTeam || cap?.result?.yourTeam || 0;
      teamLetInGoals += match?.result?.opponents || cap?.result?.opponents || 0;

      // Count match draws
      if (
        (match?.length &&
          match?.result?.yourTeam === match?.result?.opponents) ||
        (cap?.length && cap?.result?.yourTeam === cap?.result?.opponents)
      ) {
        matchDraws++;
      }

      // Count match wins
      if (
        match?.result?.yourTeam > match?.result?.opponents ||
        cap?.result?.yourTeam > cap?.result?.opponents
      ) {
        matchWins++;
      }

      // Count match losses
      if (
        match?.result?.yourTeam < match?.result?.opponents ||
        cap?.result?.yourTeam < cap?.result?.opponents
      ) {
        matchLosses++;
      }

      // Get the most role of match and Personal minutes played
      if (match?.stats?.length) {
        match.stats.forEach((stat) => {
          personalPlayingTime += stat.minutesPlayed;
          if (!totalRoles.get(stat.role)) {
            totalRoles.set(stat.role, stat.minutesPlayed);
          } else {
            totalRoles.set(
              stat.role,
              totalRoles.get(stat.role) + stat.minutesPlayed,
            );
          }
        });
      }

      if (cap?.stats?.length) {
        cap.stats.forEach((stat) => {
          personalPlayingTime += stat.minutesPlayed;
          if (!totalRoles.get(stat.role)) {
            totalRoles.set(stat.role, stat.minutesPlayed);
          } else {
            totalRoles.set(
              stat.role,
              totalRoles.get(stat.role) + stat.minutesPlayed,
            );
          }
        });
      }

      if (match?.events?.length) {
        match.events.forEach((e) => {
          // Count Personal Goals
          if (e.event === Event.GOAL) {
            personalGoals++;
          }

          // Count Personal Assists
          if (e.event === Event.ASSIST) {
            personalAssists++;
          }

          // Count Personal Yellow Card
          if (e.event === Event.YELLOW_CARD) {
            personalYellowCard++;
          }

          // Count Personal Red Card
          if (e.event === Event.RED_CARD) {
            personalRedCard++;
          }
        });
      }
      if (cap?.events?.length) {
        cap.events.forEach((e) => {
          // Count Personal Goals
          if (e.event === Event.GOAL) {
            personalGoals++;
          }

          // Count Personal Assists
          if (e.event === Event.ASSIST) {
            personalAssists++;
          }

          // Count Personal Yellow Card
          if (e.event === Event.YELLOW_CARD) {
            personalYellowCard++;
          }

          // Count Personal Red Card
          if (e.event === Event.RED_CARD) {
            personalRedCard++;
          }
        });
      }
    });

    // Calculate Average Point
    const totalMatch =
      cupMatch + seriesMatch + friendlyMatch + capMatch + otherMatch;

    const gatherPoint = 3 * matchWins + 1 * matchDraws + matchLosses * 0;

    const averagePoint = totalMatch ? gatherPoint / totalMatch : 0;

    // Calculate Average Goals
    const averageGoal = totalMatch ? personalGoals / totalMatch : 0;

    // Calculate Average Assists
    const averageAssist = totalMatch ? personalAssists / totalMatch : 0;

    // Calculate Average Card
    const averageCard = totalMatch
      ? (personalYellowCard + personalRedCard) / totalMatch
      : 0;

    // Calculate Playing time
    const totalTeamPlayingTime = teamPlayingTime / 60;
    const totalPersonalPlayingTime = personalPlayingTime / 60;
    const playingTime = Math.floor(
      (totalPersonalPlayingTime / totalTeamPlayingTime) * 100,
    );

    // Calculate Net score
    const netScore =
      teamGoals - teamLetInGoals > 0 ? teamGoals - teamLetInGoals : 0;

    const matchType = new MatchesHoursDto();
    matchType.cupMatch = cupMatch;
    matchType.friendlyMatch = friendlyMatch;
    matchType.seriesMatch = seriesMatch;
    matchType.capMatch = capMatch;

    const matchStatisticAverage = new MatchStatisticAverageDto();
    matchStatisticAverage.totalMatchType = matchType;
    matchStatisticAverage.netScore = netScore || 0;
    matchStatisticAverage.averagePoint =
      Math.floor(averagePoint * 10) / 10 || 0;
    matchStatisticAverage.averagePlayingTime = playingTime || 0;
    matchStatisticAverage.averageGoal = Math.floor(averageGoal * 10) / 10 || 0;
    matchStatisticAverage.averageAssist =
      Math.floor(averageAssist * 10) / 10 || 0;
    matchStatisticAverage.averageCard = Math.floor(averageCard * 10) / 10 || 0;

    if ([...totalRoles.entries()].length) {
      const roleArr = [...totalRoles.entries()].reduce((a, e) =>
        e[1] > a[1] ? e : a,
      );
      role = { role: roleArr[0], minutesPlayed: roleArr[1] };
    }

    matchStatisticAverage.role = role?.role;
    if (!role?.role) {
      const user = await db.collection('users').doc(currentUserId).get();
      matchStatisticAverage.role = user.data().type == 'COACH' ? 'COACH' : null;
    }

    const matchInTotalStatistic = new MatchInTotalStatisticDto();
    matchInTotalStatistic.hours = Math.floor(teamPlayingTime / 60) || 0;
    matchInTotalStatistic.matches = totalMatch || 0;
    matchInTotalStatistic.points = gatherPoint || 0;
    matchInTotalStatistic.goals = personalGoals || 0;
    matchInTotalStatistic.assists = personalAssists || 0;
    matchInTotalStatistic.yel = personalYellowCard || 0;
    matchInTotalStatistic.red = personalRedCard || 0;
    matchInTotalStatistic.matchDraws = matchDraws || 0;
    matchInTotalStatistic.matchLosses = matchLosses || 0;
    matchInTotalStatistic.matchWins = matchWins || 0;

    return { matchStatisticAverage, matchInTotalStatistic };
  }

  async getDayUsage(
    currentUserId: string,
    dashboardQueryBuilder: DashboardQueryBuilder,
  ): Promise<DayUsageDto> {
    let training = 0;
    let match = 0;
    let rest = 0;
    const { playerId, lastDateRange } = dashboardQueryBuilder;

    let diaryRef = db
      .collection('diaries')
      .orderBy('createdAt', 'desc')
      .where('userId', '==', playerId ? playerId : currentUserId);

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      diaryRef = diaryRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const querySnapshot = await diaryRef.get();

    querySnapshot.forEach((doc) => {
      const { typeOfDiary } = doc.data();

      if (typeOfDiary === TypeOfDiary.TRAINING) {
        training++;
      }
      if (typeOfDiary === TypeOfDiary.MATCH) {
        match++;
      }
      if (typeOfDiary === TypeOfDiary.REST) {
        rest++;
      }
    });

    // Calculate day usage
    const _dayUsage = calculatePercent([training, match, rest]);

    const dayUsage = new DayUsageDto();
    dayUsage.training = _dayUsage[0];
    dayUsage.match = _dayUsage[1];
    dayUsage.rest = _dayUsage[2];

    return dayUsage;
  }

  async getMatchesChart(
    getMatchChartQuery: GetMatchChartQuery,
    currentUserId: string,
  ): Promise<OutputMatchesChart> {
    let dayArrays: DaysArray[];

    const { type, lastDateRange, playerId } = getMatchChartQuery;

    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    let personal = collection('diaries')
      .where('userId', '==', playerId ? playerId : currentUserId)
      .where('typeOfDiary', '==', 'MATCH')
      .orderBy('createdAt');

    let average = collection('diaries')
      .where('typeOfDiary', '==', 'MATCH')
      .orderBy('createdAt');

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      dayArrays = getDaysArray(fromDate, toDate);

      personal = personal
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);

      average = average
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const personalDiaryRef = await personal.get();
    const averageDiaryRef = await average.get();

    const personalMatchChart = this.calculateMatchChart(
      personalDiaryRef,
      dayArrays,
      type,
      lastDateRange,
    );

    const averageMatchChart = this.calculateMatchChart(
      averageDiaryRef,
      dayArrays,
      type,
      lastDateRange,
    );

    return { personalMatchChart, averageMatchChart };
  }

  async getDiariesRoutineChart(
    getDiaryRoutineChartQuery: GetDiaryRoutineChartQuery,
    currentUserId: string,
  ): Promise<OutputDiaryRoutineChart> {
    let dayArrays: DaysArray[];

    const { diaryRoutine, lastDateRange, playerId } = getDiaryRoutineChartQuery;
    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    let personal = db
      .collection('diaries')
      .where('userId', '==', playerId ? playerId : currentUserId)
      .orderBy('createdAt')
      .select(`${diaryRoutine}`, 'createdAt');

    let average = db
      .collection('diaries')
      .orderBy('createdAt')
      .select(`${diaryRoutine}`, 'createdAt');

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      dayArrays = getDaysArray(fromDate, toDate);

      personal = personal
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);

      average = average
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const [personalDiaryRef, averageDiaryRef] = await Promise.all([
      personal.get(),
      average.get(),
    ]);

    const personalDiaryRoutine = this.calculateDiaryRoutine(
      personalDiaryRef,
      diaryRoutine,
      dayArrays,
      lastDateRange,
    );

    const averageDiaryRoutine = this.calculateDiaryRoutine(
      averageDiaryRef,
      diaryRoutine,
      dayArrays,
      lastDateRange,
    );

    const result = new OutputDiaryRoutineChart();
    result.personalDiaryRoutineChart = personalDiaryRoutine.diaryRoutineChart;
    result.averageDiaryRoutineChart = averageDiaryRoutine.diaryRoutineChart;

    result.personalDiaryRoutinePieChart =
      personalDiaryRoutine.diaryRoutinePercent;

    result.averageDiaryRoutinePieChart =
      averageDiaryRoutine.diaryRoutinePercent;

    return result;
  }

  async getListDiariesRoutineReport(
    currentUserId: string,
    getListDiariesReportDto: GetListDiariesReportDto,
  ): Promise<OutputListDiaryRoutine[]> {
    const { limit, startAfter, playerId, sorted } = getListDiariesReportDto;
    const data: OutputListDiaryRoutine[] = [];
    let highestPainLevel = 0;

    let diaryRef = db
      .collection('diaries')
      .where('userId', '==', playerId ? playerId : currentUserId)
      .orderBy('createdAt', sorted)
      .select(
        'energyLevel',
        'sleep',
        'eatAndDrink',
        'createdAt',
        'injuries',
        'typeOfDiary',
      );

    if (startAfter) {
      diaryRef = diaryRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      diaryRef = diaryRef.limit(+limit);
    }

    const querySnapshot = await diaryRef.get();

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        const { createdAt, injuries = [], ...rest } = doc.data();

        if (injuries.length) {
          injuries.forEach((data) => {
            highestPainLevel = Math.max(painLevel[data?.painLevel]);
          });
        }

        const value = getKeyByValue(painLevel, highestPainLevel);

        const result = new OutputListDiaryRoutine();
        result.eatAndDrink = rest.eatAndDrink as EatAndDrink;
        result.energyLevel = rest.energyLevel as EnergyLevel;
        result.sleep = rest.sleep as Sleep;
        result.painLevel = (injuries.length > 0 ? value : 'No') as
          | PainLevel
          | string;
        result.createdAt = +moment.utc(createdAt).format('x') as number;
        result.diaryId = doc.id;
        result.typeOfDiary = rest.typeOfDiary;

        data.push({
          ...result,
        });
      });
    }

    return data;
  }

  async getListInjuriesReport(
    currentUserId: string,
    paginationDto: PaginationDto,
  ): Promise<Injury[]> {
    const { limit, startAfter } = paginationDto;
    const data = [];

    let injuryRef = db
      .collectionGroup('injuries')
      .where('userId', '==', currentUserId)
      .orderBy('createdAt', 'desc');

    if (startAfter) {
      injuryRef = injuryRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      injuryRef = injuryRef.limit(+limit);
    }

    const querySnapshot = await injuryRef.get();

    querySnapshot.forEach((doc) => {
      data.push({
        ...doc.data(),
        injuryId: doc.id,
        diaryId: doc.ref.parent.parent.id,
      });
    });

    return data;
  }

  async getInjuriesChart(
    baseQueryBuilder: BaseQueryBuilder,
    currentUserId: string,
  ): Promise<OutputInjuriesChart> {
    const { lastDateRange } = baseQueryBuilder;
    const data = [];

    let diaryRef = db
      .collectionGroup('injuries')
      .orderBy('createdAt')
      .where('userId', '==', currentUserId);

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      diaryRef = diaryRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const querySnapshot = await diaryRef.get();

    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const finalObj = {};
    data.forEach((data) => {
      const area = data?.injuryArea;
      if (finalObj[area]) {
        finalObj[area].push(data);
      } else {
        finalObj[area] = [data];
      }
    });
    const bodyChart: OutputInjuryDto[] = Object.keys(finalObj).map((area) => {
      let painLevelPoints = 0;
      let isFront: boolean;
      finalObj[area].forEach((value) => {
        painLevelPoints = Math.max(painLevel[value?.painLevel]) || 0;
        isFront = value.isFront;
      });

      return {
        injuryArea: area,
        value: painLevelPoints,
        isFront,
        total: finalObj[area].length,
      };
    });

    const columnChart = await this.diaryService.getAveragePainChartColumn(
      baseQueryBuilder,
    );

    return { bodyChart, columnChart };
  }

  async calculateDiaryMatchesStatsFromSnapshot(
    querySnapshot: FirebaseFirestore.QuerySnapshot,
  ) {
    let seriesMatch = 0;
    let cupMatch = 0;
    let friendlyMatch = 0;
    let capMatch = 0;

    let matchWins = 0;
    let matchDraws = 0;
    let matchLosses = 0;

    let teamGoals = 0;

    let role;

    let teamPlayingTime = 0;
    let personalPlayingTime = 0;

    let personalGoals = 0;
    let personalAssists = 0;
    let personalYellowCard = 0;
    let personalRedCard = 0;

    querySnapshot.forEach((doc) => {
      const { match, cap, typeOfDiary } = doc.data();
      // Get total of quantity each type match
      if (match.typeOfGame === TypeOfGame.CUP) {
        cupMatch++;
      }
      if (match.typeOfGame === TypeOfGame.SERIES) {
        seriesMatch++;
      }
      if (match.typeOfGame === TypeOfGame.FRIENDLY) {
        friendlyMatch++;
      }
      if (typeOfDiary === TypeOfDiary.CAP) {
        capMatch++;
      }

      // Sum of length match
      teamPlayingTime += match?.length || 0;

      // Sum of goals of team
      teamGoals += match?.result?.yourTeam || 0;

      // Count match draws
      if (
        match?.result?.yourTeam === match?.result?.opponents ||
        cap?.result?.yourTeam === cap?.result?.opponents
      ) {
        matchDraws++;
      }

      // Count match wins
      if (
        match?.result?.yourTeam > match?.result?.opponents ||
        cap?.result?.yourTeam > cap?.result?.opponents
      ) {
        matchWins++;
      }

      // Count match losses
      if (
        match?.result?.yourTeam < match?.result?.opponents ||
        cap?.result?.yourTeam < cap?.result?.opponents
      ) {
        matchLosses++;
      }

      // Get the most role of match and Personal minutes played
      if (match?.stats?.length) {
        role = findMostElementAppear(match.stats);
        match.stats.forEach((stat) => {
          personalPlayingTime += stat.minutesPlayed;
        });
      }

      if (match?.events?.length) {
        match.events.forEach((e) => {
          // Count Personal Goals
          if (e.event === Event.GOAL) {
            personalGoals++;
          }

          // Count Personal Assists
          if (e.event === Event.ASSIST) {
            personalAssists++;
          }

          // Count Personal Yellow Card
          if (e.event === Event.YELLOW_CARD) {
            personalYellowCard++;
          }

          // Count Personal Red Card
          if (e.event === Event.RED_CARD) {
            personalRedCard++;
          }
        });
      }
    });

    // Calculate Average Point
    const totalMatch = cupMatch + seriesMatch + friendlyMatch + capMatch;
    const gatherPoint = 3 * matchWins + 1 * matchDraws + matchLosses * 0;
    const averagePoint = gatherPoint / totalMatch;

    // Calculate Average Goals
    const averageGoal = personalGoals / totalMatch;

    // Calculate Average Assists
    const averageAssist = personalAssists / totalMatch;

    // Calculate Average Card
    const averageCard = (personalYellowCard + personalRedCard) / totalMatch;

    // Calculate Playing time
    const totalTeamPlayingTime = teamPlayingTime / 60;
    const totalPersonalPlayingTime = personalPlayingTime / 60;
    const playingTime = Math.floor(
      (totalPersonalPlayingTime / totalTeamPlayingTime) * 100,
    );

    // Calculate Net score
    const netScore =
      teamGoals - personalGoals > 0 ? teamGoals - personalGoals : 0;

    const matchType = new MatchesHoursDto();
    matchType.cupMatch = cupMatch;
    matchType.friendlyMatch = friendlyMatch;
    matchType.seriesMatch = seriesMatch;
    matchType.capMatch = capMatch;

    const matchStatisticAverage = new MatchStatisticAverageDto();
    matchStatisticAverage.totalMatchType = matchType;
    matchStatisticAverage.netScore = netScore || 0;
    matchStatisticAverage.averagePoint =
      Math.floor(averagePoint * 10) / 10 || 0;
    matchStatisticAverage.averagePlayingTime = playingTime || 0;
    matchStatisticAverage.averageGoal = Math.floor(averageGoal * 10) / 10 || 0;
    matchStatisticAverage.averageAssist =
      Math.floor(averageAssist * 10) / 10 || 0;
    matchStatisticAverage.averageCard = Math.floor(averageCard * 10) / 10 || 0;
    matchStatisticAverage.role = role?.role || null;

    const matchInTotalStatistic = new MatchInTotalStatisticDto();
    matchInTotalStatistic.hours = Math.floor(teamPlayingTime / 60) || 0;
    matchInTotalStatistic.matches = totalMatch || 0;
    matchInTotalStatistic.points = gatherPoint || 0;
    matchInTotalStatistic.goals = personalGoals || 0;
    matchInTotalStatistic.assists = personalAssists || 0;
    matchInTotalStatistic.yel = personalYellowCard || 0;
    matchInTotalStatistic.red = personalRedCard || 0;

    return { matchStatisticAverage, matchInTotalStatistic };
  }

  async getDevelopmentNotesRoutine(
    currentUserId: string,
    getDevelopmentTalkChartDto: GetDevelopmentTalkChartDto,
  ) {
    let dayArrays: DaysArray[];

    const { lastDateRange, userIdQuery } = getDevelopmentTalkChartDto;

    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userIdForQuery = userIdQuery ? userIdQuery : currentUserId;

    const userRef = await db.collection('users').doc(userIdForQuery).get();

    let devTalkRef = db
      .collection('development_talks')
      .orderBy('createdAt', 'desc')
      .select(
        'playerDevelopmentProgress',
        'coachDevelopmentProgress',
        'createdAt',
      );

    const userType = userRef.data()?.type;

    userType === UserTypes.PLAYER
      ? (devTalkRef = devTalkRef.where('playerId', '==', userIdForQuery))
      : (devTalkRef = devTalkRef.where('coachId', '==', userIdForQuery));

    if (lastDateRange) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      dayArrays = getDaysArray(fromDate, toDate);

      devTalkRef = devTalkRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const devTalkSnapshot = await devTalkRef.get();

    const personalDevTalkRoutine = this.calculateDevelopmentNotesChart(
      devTalkSnapshot,
      ['playerDevelopmentProgress'],
      dayArrays,
      lastDateRange,
    );

    const coachDevTalkRoutine = this.calculateDevelopmentNotesChart(
      devTalkSnapshot,
      ['coachDevelopmentProgress'],
      dayArrays,
      lastDateRange,
    );

    return {
      personalDevTalkRoutine,
      coachDevTalkRoutine,
    };
  }

  async getListDevelopmentNotes(
    currentUserId: string,
    paginationDto: PaginationDto,
  ) {
    const { limit, startAfter, sorted, userIdQuery } = paginationDto;

    let devTalkRef = db
      .collection('development_talks')
      .orderBy('createdAt', sorted);

    const userIdForQuery = userIdQuery ? userIdQuery : currentUserId;

    const userRef = await db.collection('users').doc(userIdForQuery).get();

    const userType = userRef.data()?.type;

    userType === UserTypes.PLAYER
      ? (devTalkRef = devTalkRef.where('playerId', '==', userIdForQuery))
      : (devTalkRef = devTalkRef.where('coachId', '==', userIdForQuery));

    if (startAfter) {
      devTalkRef = devTalkRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      devTalkRef = devTalkRef.limit(+limit);
    }

    const querySnapshot = await devTalkRef.get();

    const devTalkDocs = querySnapshot.docs;

    const userInfo = await mappingUserInfoById(userIdForQuery);

    if (devTalkDocs.length) {
      const data = devTalkDocs.map((doc) => {
        const {
          playerDevelopmentProgress = 'N/A',
          coachDevelopmentProgress = 'N/A',
        } = doc.data();

        return {
          ...doc.data(),
          userInfo,
          playerDevelopmentProgress,
          coachDevelopmentProgress,
          devTalkId: doc.id,
        };
      });

      return data;
    }

    return [];
  }

  async getListPersonalGoals(
    currentUserId: string,
    paginationDto: PaginationDto,
  ) {
    const { limit, startAfter, sorted, userIdQuery } = paginationDto;

    const userIdForQuery = userIdQuery ? userIdQuery : currentUserId;

    // const { type } = await mappingUserInfoById(userIdForQuery);

    let personalGoalsRef = db
      .collection('personal_goals')
      .where('userId', '==', userIdForQuery)
      // .where('userType', '==', type)
      .orderBy('createdAt', sorted);

    if (startAfter) {
      personalGoalsRef = personalGoalsRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      personalGoalsRef = personalGoalsRef.limit(+limit);
    }

    const querySnapshot = await personalGoalsRef.get();

    const personalGoalDocs = querySnapshot.docs;

    if (personalGoalDocs.length) {
      const data = personalGoalDocs.map((doc) => {
        return {
          ...doc.data(),
          personalGoalId: doc.id,
          deadlineUnix: +moment.utc(doc.data()?.deadline).format('x'),
          progress: doc.data().progress ? doc.data().progress : 0,
        };
      });

      return data;
    }

    return [];
  }

  async getListHealsReport(
    currentUserId: string,
    paginationDto: PaginationDto,
  ) {
    const { userIdQuery } = paginationDto;
    const userIdForQuery = userIdQuery ? userIdQuery : currentUserId;
    return this.healthsService.getListHealths(userIdForQuery, paginationDto);
  }

  async getHealthCharts(
    currentUserId: string,
    getHealthChartQuery: GetHealthChartQuery,
  ) {
    const { userIdQuery } = getHealthChartQuery;
    const userIdForQuery = userIdQuery ? userIdQuery : currentUserId;

    return this.healthsService.getHealthCharts(
      userIdForQuery,
      getHealthChartQuery,
    );
  }

  async getHeightPrediction(currentUserId: string) {
    const { gender, fatherHeight, motherHeight } = await mappingUserInfoById(
      currentUserId,
    );

    let heightPrediction = 0;

    let totalHeight = fatherHeight + motherHeight;

    if (totalHeight <= 0) {
      return {
        heightPrediction: 0,
      };
    } 

    if (gender === GenderTypes.Male) {
      totalHeight += 13;
    } else if (gender === GenderTypes.Female) {
      totalHeight -= 13;
    } else {
      // TODO check for genders other than Male and Female
      totalHeight = 240;
    }

    heightPrediction = Math.round(totalHeight / 2);

    if (heightPrediction <= 0) {
      return {
        heightPrediction: 0,
      };
    }

    return {
      heightPrediction,
    };
  }

  calculateDiaryStats(
    diaryRef: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
    dashboardTab: string,
    isAverage = false,
    isBioTrainingInToTal = false,
  ) {
    let teamTraining = 0;
    let groupTraining = 0;
    let personalTraining = 0;

    let teamTrainingSessions = 0;
    let groupTrainingSessions = 0;
    let personalTrainingSessions = 0;

    let technical = 0;
    let tactical = 0;
    let mentalTotal = 0;
    let physical = 0;

    let totalHoursHistoric = 0;
    let totalSessionHistoric = 0;

    let seriesMatch = 0;
    let cupMatch = 0;
    let friendlyMatch = 0;
    let capMatch = 0;

    let matchWins = 0;
    let matchDraws = 0;
    let matchLosses = 0;

    const userIdsGroupTraining = [];
    const userIdsTeamTraining = [];
    const userIdsPersonTraining = [];

    const userIdsCupMatch = [];
    const userIdsFriendlyMatch = [];
    const userIdsSeriesMatch = [];
    const userIdsCap = [];
    const userIds = [];

    const seasons = [];

    diaryRef.forEach((doc) => {
      const { season } = doc.data();
      if (season) {
        seasons.push(season);
      }
    });

    diaryRef.forEach((doc) => {
      const {
        training,
        match,
        cap,
        typeOfDiary,
        userId,
        weeksTeam,
        weeksPersonal,
        avgTeam,
        avgPersonal,
        season,
        createdAt,
      } = doc.data();

      const seasonDiary = String(moment.utc(createdAt).local().format('YYYY'));

      if (!userIds.includes(userId) && !seasons.includes(seasonDiary)) {
        userIds.push(userId);
      }

      // Training
      if (isBioTrainingInToTal) {
        if (
          training?.typeOfTraining === TypeOfTraining.GROUP_TRAINING &&
          !seasons.includes(seasonDiary)
        ) {
          if (!userIdsGroupTraining.includes(userId)) {
            userIdsGroupTraining.push(userId);
          }

          groupTraining += training?.hoursOfPractice;
          groupTrainingSessions++;
        }

        if (
          training?.typeOfTraining === TypeOfTraining.PERSONAL_TRAINING &&
          !seasons.includes(seasonDiary)
        ) {
          if (!userIdsPersonTraining.includes(userId)) {
            userIdsPersonTraining.push(userId);
          }

          personalTraining += training?.hoursOfPractice;
          personalTrainingSessions++;
        }

        if (
          training?.typeOfTraining === TypeOfTraining.TEAM_TRAINING &&
          !seasons.includes(seasonDiary)
        ) {
          if (!userIdsTeamTraining.includes(userId)) {
            userIdsTeamTraining.push(userId);
          }

          teamTraining += training?.hoursOfPractice;
          teamTrainingSessions++;
        }

        if (training && !seasons.includes(seasonDiary)) {
          technical += training?.technics;
          tactical += training?.tactics;
          mentalTotal += training?.mental;
          physical += training?.physics;
        }

        if (
          training?.typeOfTraining === TypeOfTraining.HISTORIC_TRAINING ||
          season ||
          seasons.includes(seasonDiary)
        ) {
          totalSessionHistoric +=
            weeksTeam * avgTeam + weeksPersonal * avgPersonal;
          const a = weeksTeam * avgTeam + weeksPersonal * avgPersonal;
          totalHoursHistoric += a * training?.hoursOfPractice;

          technical += training?.technics;
          tactical += training?.tactics;
          mentalTotal += training?.mental;
          physical += training?.physics;
        }
      } else {
        if (
          training?.typeOfTraining === TypeOfTraining.GROUP_TRAINING &&
          !seasons.includes(seasonDiary)
        ) {
          if (!userIdsGroupTraining.includes(userId)) {
            userIdsGroupTraining.push(userId);
          }

          groupTraining += training?.hoursOfPractice;
          groupTrainingSessions++;
        }

        if (
          training?.typeOfTraining === TypeOfTraining.PERSONAL_TRAINING &&
          !seasons.includes(seasonDiary)
        ) {
          if (!userIdsPersonTraining.includes(userId)) {
            userIdsPersonTraining.push(userId);
          }

          personalTraining += training?.hoursOfPractice;
          personalTrainingSessions++;
        }

        if (
          training?.typeOfTraining === TypeOfTraining.TEAM_TRAINING &&
          !seasons.includes(seasonDiary)
        ) {
          if (!userIdsTeamTraining.includes(userId)) {
            userIdsTeamTraining.push(userId);
          }

          teamTraining += training?.hoursOfPractice;
          teamTrainingSessions++;
        }

        if (training && !seasons.includes(seasonDiary)) {
          technical += training?.technics;
          tactical += training?.tactics;
          mentalTotal += training?.mental;
          physical += training?.physics;
        }
      }

      // Match
      if (match?.typeOfGame === TypeOfGame.CUP) {
        if (!userIdsCupMatch.includes(userId)) {
          userIdsCupMatch.push(userId);
        }

        match?.stats?.forEach(
          (stat) => (cupMatch += stat?.minutesPlayed || match?.length || 0),
        );
      }
      if (match?.typeOfGame === TypeOfGame.FRIENDLY) {
        if (!userIdsFriendlyMatch.includes(userId)) {
          userIdsFriendlyMatch.push(userId);
        }

        match?.stats?.forEach(
          (stat) =>
            (friendlyMatch += stat?.minutesPlayed || match?.length || 0),
        );
      }
      if (match?.typeOfGame === TypeOfGame.SERIES) {
        if (!userIdsSeriesMatch.includes(userId)) {
          userIdsSeriesMatch.push(userId);
        }

        match?.stats?.forEach(
          (stat) => (seriesMatch += stat?.minutesPlayed || match?.length || 0),
        );
      }
      if (typeOfDiary === TypeOfDiary.CAP) {
        if (!userIdsCap.includes(userId)) {
          userIdsCap.push(userId);
        }
        cap?.stats?.forEach(
          (stat) => (capMatch += stat?.minutesPlayed || cap?.length || 0),
        );
      }
      if (match?.result || cap?.result) {
        if (
          match?.result?.yourTeam === match?.result?.opponents ||
          cap?.result?.yourTeam === cap?.result?.opponents
        ) {
          matchDraws++;
        }
        if (
          match?.result?.yourTeam > match?.result?.opponents ||
          cap?.result?.yourTeam > cap?.result?.opponents
        ) {
          matchWins++;
        }
        if (
          match?.result?.yourTeam < match?.result?.opponents ||
          cap?.result?.yourTeam < cap?.result?.opponents
        ) {
          matchLosses++;
        }
      }
    });

    // Match Result Statistic
    const _matchResult = calculatePercent([matchWins, matchDraws, matchLosses]);

    const matchResults = new MatchResultsDto();
    matchResults.wins = _matchResult[0];
    matchResults.draws = _matchResult[1];
    matchResults.losses = _matchResult[2];

    const trainingHours = new TrainingHoursDto();
    if (isAverage) {
      trainingHours.group =
        Math.round(groupTraining / userIdsGroupTraining.length) || 0;
      trainingHours.personal =
        Math.round(personalTraining / userIdsPersonTraining.length) || 0;
      trainingHours.team =
        Math.round(teamTraining / userIdsTeamTraining.length) || 0;
      trainingHours.totalHistoric = totalHoursHistoric || 0;
    } else {
      trainingHours.group = groupTraining || 0;
      trainingHours.personal = personalTraining || 0;
      trainingHours.team = teamTraining || 0;
      trainingHours.totalHistoric = totalHoursHistoric || 0;
    }

    const matchHours = new MatchesHoursDto();
    if (isAverage) {
      matchHours.cupMatch =
        Math.round(Math.floor(cupMatch / 60) / userIdsCupMatch.length) || 0;

      matchHours.friendlyMatch =
        Math.round(
          Math.floor(friendlyMatch / 60) / userIdsFriendlyMatch.length,
        ) || 0;

      matchHours.seriesMatch =
        Math.round(Math.floor(seriesMatch / 60) / userIdsSeriesMatch.length) ||
        0;
      matchHours.capMatch =
        Math.round(Math.floor(capMatch / 60) / userIdsCap.length) || 0;
    } else {
      matchHours.cupMatch = Math.floor(cupMatch / 60) || 0;
      matchHours.friendlyMatch = Math.floor(friendlyMatch / 60) || 0;
      matchHours.seriesMatch = Math.floor(seriesMatch / 60) || 0;
      matchHours.capMatch = Math.floor(capMatch / 60) || 0;
    }

    //  Total Hours
    const totalHours = new TotalHoursDto();

    totalHours.training =
      trainingHours.group +
      trainingHours.personal +
      trainingHours.team +
      trainingHours.totalHistoric;

    totalHours.matches =
      matchHours.cupMatch +
      matchHours.friendlyMatch +
      matchHours.seriesMatch +
      matchHours.capMatch;

    //  Sessions
    const sessions = new SessionsRequestDto();
    if (isAverage) {
      sessions.group =
        Math.round(groupTrainingSessions / userIdsGroupTraining.length) || 0;
      sessions.personal =
        Math.round(personalTrainingSessions / userIdsPersonTraining.length) ||
        0;
      sessions.team =
        Math.round(teamTrainingSessions / userIdsTeamTraining.length) || 0;
      sessions.totalHistoric = totalSessionHistoric || 0;
    } else {
      sessions.group = groupTrainingSessions || 0;
      sessions.personal = personalTrainingSessions || 0;
      sessions.team = teamTrainingSessions || 0;
      sessions.totalHistoric = totalSessionHistoric || 0;
    }

    // Training Category
    const _trainingCategory = calculatePercent([
      technical,
      tactical,
      mentalTotal,
      physical,
    ]);
    const trainingCategory = new TrainingCategoryDto();
    trainingCategory.technical = _trainingCategory[0];
    trainingCategory.tactics = _trainingCategory[1];
    trainingCategory.mental = _trainingCategory[2];
    trainingCategory.physical = _trainingCategory[3];

    //  Training Type
    const _trainingType = calculatePercent([
      groupTrainingSessions,
      personalTrainingSessions,
      teamTrainingSessions,
    ]);
    const trainingType = new TrainingTypeDto();
    trainingType.group = _trainingType[0];
    trainingType.private = _trainingType[1];
    trainingType.team = _trainingType[2];

    //  Training Category of total hours
    const _trainingCategoryOfTotalHours = calculatePercentOfHours(
      [
        trainingCategory.technical,
        trainingCategory.tactics,
        trainingCategory.mental,
        trainingCategory.physical,
      ],
      totalHours.training,
    );

    const trainingCategoryOfTotalHours = new TrainingCategoryOfTotalHoursDto();
    trainingCategoryOfTotalHours.technical = _trainingCategoryOfTotalHours[0];
    trainingCategoryOfTotalHours.tactics = _trainingCategoryOfTotalHours[1];
    trainingCategoryOfTotalHours.mental = _trainingCategoryOfTotalHours[2];
    trainingCategoryOfTotalHours.physical = _trainingCategoryOfTotalHours[3];

    //  Training Type of total hours
    const _trainingTypeOfTotalHours = calculatePercentOfHours(
      [trainingType.group, trainingType.private, trainingType.team],
      totalHours.training,
    );
    const trainingTypeOfTotalHours = new TrainingTypeOfTotalHoursDto();
    trainingTypeOfTotalHours.group = _trainingTypeOfTotalHours[0];
    trainingTypeOfTotalHours.personal = _trainingTypeOfTotalHours[1];
    trainingTypeOfTotalHours.team = _trainingTypeOfTotalHours[2];

    if (dashboardTab === DashBoardTab.TOTAL) {
      totalHours.training =
        trainingHours.group + trainingHours.personal + trainingHours.team;
      return {
        trainingHours,
        matchHours,
        totalHours,
        trainingCategory,
        matchResults,
      };
    }

    if (dashboardTab === DashBoardTab.TRAINING) {
      return {
        sessions,
        trainingHours,
        trainingCategory,
        trainingType,
        trainingCategoryOfTotalHours,
        trainingTypeOfTotalHours,
      };
    }
  }

  calculateMatchChart(
    diaryRef: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
    dayArrays: DaysArray[],
    type: MatchChartType,
    lastDateRange: LastDateRange,
  ): CommonChartDo[] {
    const data = [];
    let cupMatch = 0;
    let seriesMatch = 0;
    let friendlyMatch = 0;
    let matchDraws = 0;
    let matchWins = 0;
    let matchLosses = 0;

    diaryRef.forEach((doc) => {
      const { match } = doc.data();
      if (match) {
        const {
          result: { yourTeam, opponents },
        } = match;
        if (type === MatchChartType.NET_SCORE) {
          const netScore = yourTeam - opponents;

          data.push({
            value: netScore > 0 ? netScore : 0,
            day: moment.utc(doc.data()?.createdAt).format('YYYY-MM-DD'),
          });
        }

        if (type === MatchChartType.AVG_POINT) {
          if (match.typeOfGame === TypeOfGame.CUP) {
            cupMatch++;
          }
          if (match.typeOfGame === TypeOfGame.SERIES) {
            seriesMatch++;
          }
          if (match.typeOfGame === TypeOfGame.FRIENDLY) {
            friendlyMatch++;
          }

          // Count match draws
          if (match?.result?.yourTeam === match?.result?.opponents) {
            matchDraws++;
          }

          // Count match wins
          if (match?.result?.yourTeam > match?.result?.opponents) {
            matchWins++;
          }

          // Count match losses
          if (match?.result?.yourTeam < match?.result?.opponents) {
            matchLosses++;
          }

          // Calculate Average Point
          const totalMatch = cupMatch + seriesMatch + friendlyMatch;
          const gatherPoint = 3 * matchWins + 1 * matchDraws + matchLosses * 0;
          const averagePoint = Math.round(gatherPoint / totalMatch) || 0;

          data.push({
            value: averagePoint,
            day: moment.utc(doc.data()?.createdAt).format('YYYY-MM-DD'),
          });
        }
      }
    });
    const result = aggregateSumByDate(data);

    const matchChart = mergeArray(dayArrays, result);

    if (matchChart.length >= 30) {
      return splitDate(matchChart, lastDateRange);
    }

    return matchChart;
  }

  calculateDiaryRoutine(
    diaryRef: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
    diaryRoutine: DiaryRoutine,
    dayArrays: DaysArray[],
    lastDateRange: LastDateRange,
  ) {
    let veryBad = 0;
    let bad = 0;
    let normal = 0;
    let good = 0;
    let veryGood = 0;

    const diaries = [];

    diaryRef.forEach((doc) => {
      const { createdAt, ...rest } = doc.data();
      switch (doc?.data()[diaryRoutine]) {
        case 'VERY_BAD':
          veryBad++;
          break;
        case 'BAD':
          bad++;
          break;
        case 'GOOD':
          good++;
          break;
        case 'VERY_GOOD':
          veryGood++;
          break;

        default:
          normal++;
          break;
      }

      diaries.push({
        ...rest,
        day: moment.utc(createdAt).format('YYYY-MM-DD'),
      });
    });
    const _diaryRoutinePercent = calculatePercent([
      veryBad,
      bad,
      normal,
      good,
      veryGood,
    ]);
    const diaryRoutinePercent = new DiaryRoutineDto();
    diaryRoutinePercent.veryBad = _diaryRoutinePercent[0];
    diaryRoutinePercent.bad = _diaryRoutinePercent[1];
    diaryRoutinePercent.normal = _diaryRoutinePercent[2];
    diaryRoutinePercent.good = _diaryRoutinePercent[3];
    diaryRoutinePercent.veryGood = _diaryRoutinePercent[4];

    const mappedDiaryRoutine = mappedDataByDate(diaries);
    const mostDiaryRoutineAppear = [];
    mappedDiaryRoutine.map((data) => {
      const result = findMostElementAppear(data.values);
      mostDiaryRoutineAppear.push(result);
    });

    const result = [];

    mostDiaryRoutineAppear.forEach((data) => {
      result.push({
        value: levelDiary[data[diaryRoutine]] || 0,
        day: data.day,
      });
    });

    const mergedArray = mergeArray(dayArrays, result);

    mergedArray.forEach((e) => {
      if (e.value == 0) {
        e.value = 3;
      }
    });

    if (mergedArray.length >= 30) {
      return {
        diaryRoutineChart: splitDate(mergedArray, lastDateRange),
        diaryRoutinePercent,
      };
    }

    return {
      diaryRoutineChart: mergedArray,
      diaryRoutinePercent,
    };
  }

  calculateDevelopmentNotesChart(
    developmentTalkRef: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
    developmentProgress: [
      'playerDevelopmentProgress' | 'coachDevelopmentProgress',
    ],
    dayArrays: DaysArray[],
    lastDateRange: LastDateRange,
  ) {
    let veryBad = 0;
    let bad = 0;
    let normal = 0;
    let good = 0;
    let veryGood = 0;

    const developmentNotes = [];

    developmentTalkRef.forEach((doc) => {
      const { createdAt, ...rest } = doc.data();
      if (doc?.data()[developmentProgress[0]] === 'VERY_BAD') {
        veryBad++;
      }
      if (doc?.data()[developmentProgress[0]] === 'BAD') {
        bad++;
      }
      if (doc?.data()[developmentProgress[0]] === 'NORMAL') {
        normal++;
      }
      if (doc?.data()[developmentProgress[0]] === 'GOOD') {
        good++;
      }
      if (doc?.data()[developmentProgress[0]] === 'VERY_GOOD') {
        veryGood++;
      }

      developmentNotes.push({
        ...rest,
        day: moment.utc(createdAt).format('YYYY-MM-DD'),
      });
    });

    const _developmentProgress = calculatePercent([
      veryBad,
      bad,
      normal,
      good,
      veryGood,
    ]);

    const devProgressPercent = new DevelopmentProgressPercent();
    devProgressPercent.veryBad = _developmentProgress[0];
    devProgressPercent.bad = _developmentProgress[1];
    devProgressPercent.normal = _developmentProgress[2];
    devProgressPercent.good = _developmentProgress[3];
    devProgressPercent.veryGood = _developmentProgress[4];

    const mappedDiaryRoutine = mappedDataByDate(developmentNotes);

    const mostDiaryRoutineAppear = [];
    mappedDiaryRoutine.map((data) => {
      const result = findMostElementAppear(data.values);
      mostDiaryRoutineAppear.push(result);
    });

    const result = [];
    mostDiaryRoutineAppear.forEach((data) => {
      result.push({
        value: developmentProgressLevel[data[developmentProgress[0]]] || 0,
        day: data.day,
      });
    });

    const mergedArray = mergeArray(dayArrays, result);

    if (mergedArray.length >= 30) {
      return {
        developmentProgressChart: splitDate(mergedArray, lastDateRange),
        devProgressPercent,
      };
    }

    return {
      developmentProgressChart: mergedArray,
      devProgressPercent,
    };
  }
}
