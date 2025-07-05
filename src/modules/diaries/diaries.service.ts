/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { CountryDto } from './../../common/dto/country.dto';
import {
  PlayerCreateAwardDto,
  ConnectedClubDto,
} from './../achievements/dto/create-achievement.dto';
import { AchievementsService } from './../achievements/achievements.service';
import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import {
  levelDiary,
  painLevel,
  performanceLevel,
  ResponseMessage,
  ROLE_BY_GROUP,
  TagsTypes,
} from '../../common/constants/common.constant';
import { defaultCountry } from '../../common/constants/country';
import { db } from '../../config/firebase.config';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { calculatePercent } from '../../utils/calculate-percent';
import { calculateMinutesOfHours } from '../../utils/calculate-percent-of-hours';
import { calculatePercentPainChartColumn } from '../../utils/calculate-percent-pain-chart-column';
import { deleteCollection } from '../../utils/delete-subCollection';
import { findMostElementAppear } from '../../utils/find-most-el-appear';
import { formatInjuryBodyPart } from '../../utils/format-injury-body-part';
import {
  calculateMostVotesOfZtar,
  calculateZtarOfTheMatch,
} from '../../utils/formula-get-most-votes-match';
import { generateRandomQuotes } from '../../utils/generate-random-quotes';
import { getContentByFrequencyUpdateDiary } from '../../utils/get-content-by-frequency-update-diary';
import { collection } from '../../utils/query-collection';
import { AchievementType } from '../achievements/enum/achievement.enum';
import { ZPlayerAwardType } from '../achievements/enum/award-types.enum';
import { ConnectedClubType } from '../achievements/enum/connected-club.enum';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  BaseQueryBuilder,
  GetListDreamTeamQuery,
  ShareCapturedDreamTeamDto,
} from '../dashboard/dto/dashboard.req.dto';
import {
  OutputAveragePainColumnChart,
  TrainingCategoryDto,
} from '../dashboard/dto/dashboard.res.dto';
import { LastDateRange } from '../dashboard/enum/dashboard-enum';
import {
  PostQueryDto,
  SynchronizePostDto,
  TypeOfPost,
} from '../feed/dto/feed.req.dto';
import { AveragePainColumnChartDto } from '../feed/dto/feed.res.dto';
import { FeedService } from '../feed/feed.service';
import {
  CreateNotificationDto,
  NotificationTitle,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTagDto } from '../tags/dto/create-tag.dto';
import { TagsService } from '../tags/v1/tags.service';
import { TeamsService } from '../teams/teams.service';
import { UserTypes } from '../users/enum/user-types.enum';
import {
  CoachCreateDiaryMatchDto,
  CoachCreateDiaryTrainingDto,
  CoachReviewDiaryDto,
  CoachUpdateDiaryMatchDto,
  CoachUpdateDiaryTrainingDto,
  CreateCoachDiaryCapDto,
  CreateHistoricTrainingDto,
  CreatePlayerDiaryCapDto,
  DeleteDiaryQueryDto,
  DiaryQueryBuilder,
  GetOriginalDiaryCalendarStatusDto,
  GetOriginalDiaryDto,
  OriginalDiaryType,
  OutputDreamTeam,
  PlayerCreateDiaryMatchDto,
  PlayerCreateDiaryTrainingDto,
  PlayerUpdateDiaryMatchDto,
  PlayerUpdateDiaryTrainingDto,
  UpdateCoachDiaryCapDto,
  UpdateDiaryQueryDto,
  UpdateHistoricTrainingDto,
  UpdatePlayerDiaryCapDto,
  ZtarOfMatch,
} from './dto/diaries.req.dto';
import { OutputCreateDiary } from './dto/diaries.res.dto';

import { CreateInjuryDto, InjuryDto, UpdateInjuryDto } from './dto/injury.dto';
import {
  CoachMatchEventsDto,
  CoachMatchStatsDto,
  PlayerReviews,
} from './dto/match.dto';
import {
  Event,
  InjuryArea,
  MediaType,
  PainLevel,
  PhysicallyStrain,
  Role,
  TeamPerformance,
  TypeOfDiary,
  TypeOfTraining,
} from './enum/diaries.enum';
import { DiariesBigQueryService } from './repositories/diaries.repository';
import { getBioUrl } from '../../utils/get-bio-url';
import { GetBioUrl } from '../biography/interfaces/get-bio.url.interface';
import { ILastMatch } from './interfaces/lastMatch.interface';
import { ILastTraining } from './interfaces/lastTraining.interface';
import { InjectModel } from '@nestjs/mongoose';
import { UserMatch, USER_MATCH_MODEL } from './schemas/user-match.schema';
import { Model } from 'mongoose';
import { DreamTeam, DREAM_TEAM_MODEL } from './schemas/dream-team.schema';
import { UsersFantazyService } from '../users/users.fantazy.service';
import { FantazyService } from '../fantazy/fantazy.service';
import { MatchEventDto } from './dto/match.dto';
import { PlayerMatchDto } from './dto/match.dto';
import {
  fillEmptyTimestamp,
  filterDuplicateDayRecords,
} from './diaries.functional';

@Injectable()
export class DiaryService {
  constructor(
    @InjectModel(USER_MATCH_MODEL)
    private readonly userMatchModel: Model<UserMatch>,
    @InjectModel(DREAM_TEAM_MODEL)
    private readonly dreamTeamModel: Model<DreamTeam>,
    private tagService: TagsService,
    @Inject(forwardRef(() => FeedService))
    private feedService: FeedService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private teamsService: TeamsService,
    private diariesBigQueryService: DiariesBigQueryService,
    @Inject(forwardRef(() => DashboardService))
    private dashboardService: DashboardService,
    @Inject(forwardRef(() => AchievementsService))
    private achievementsService: AchievementsService,
    @Inject(forwardRef(() => UsersFantazyService))
    private usersFantazyService: UsersFantazyService,
    @Inject(forwardRef(() => FantazyService))
    private fantazyService: FantazyService,
  ) { }

  async sendNotificationRemindUpdateDiaries(userType: UserTypes) {
    const from = +moment.utc().startOf('day').subtract(4, 'day').format('x');
    const to = +moment.utc().endOf('day').subtract(1, 'day').format('x');

    let userRef = db.collection('users').where('account.isActive', '==', true);

    if (userType) {
      userRef = userRef.where('type', '==', userType);
    }

    const querySnapshot = await userRef.get();
    const userDocs = querySnapshot.docs;

    if (userDocs.length) {
      const checkDiariesExistAndRemind = userDocs.map(async (doc) => {
        const userId = doc.id;
        const userInfo = await mappingUserInfoById(userId);

        const diaryRef = await db
          .collection('diaries')
          .where('userId', '==', userId)
          .where('createdAt', '>=', from)
          .where('createdAt', '<=', to)
          .get();

        const checkNotificationExists = await db
          .collection('notifications')
          .where(
            'notificationType',
            '==',
            NotificationType.REMIND_ON_DIARY_UPDATE,
          )
          .where('receiverId', '==', userId)
          .where('createdAt', '>=', from)
          .where('createdAt', '<=', to)
          .orderBy('createdAt', 'desc')
          .get();

        const lastDayNotification =
          (checkNotificationExists.docs[0]?.data()?.body as string)?.split(
            'd',
          )[0] || 0;

        const payload = new CreateNotificationDto();

        const defaultDayRemind = 3;

        const content =
          +lastDayNotification > 0
            ? (+lastDayNotification + 1).toString()
            : defaultDayRemind.toString();

        payload.title = NotificationTitle.ZPORTER_DIARY;
        payload.username = 'Zporter';
        payload.token = userInfo.fcmToken;
        payload.senderId = '';
        payload.notificationType = NotificationType.REMIND_ON_DIARY_UPDATE;
        payload.receiverId = userId;
        payload.largeIcon = process.env.ZPORTER_IMAGE;
        payload.userType = UserTypes.SYS_ADMIN;
        payload.content = content;

        if (
          diaryRef.empty &&
          userInfo.notificationOptions.profileAndDiaryUpdates
        ) {
          await this.notificationsService.sendMulticastNotification(payload);
        }

        let i = 6;

        const last7Days = [];

        while (i >= 0) {
          last7Days.push({
            from: +moment.utc().startOf('day').subtract(i, 'day').format('x'),
            to: +moment.utc().endOf('day').subtract(i, 'day').format('x'),
          });
          i--;
        }

        const checkFrequencyUpdateDiary = last7Days.map(
          async ({ from, to }) => {
            const diariesRef = await db
              .collection('diaries')
              .orderBy('createdAt', 'desc')
              .where('userId', '==', userId)
              .where('createdAt', '>=', from)
              .where('createdAt', '<=', to)
              .get();

            const typeOfDiary = diariesRef.docs[0]?.data()?.typeOfDiary || null;

            return {
              day: from,
              type:
                typeOfDiary === 'TRAINING'
                  ? diariesRef.docs[0]?.data()?.training?.typeOfTraining
                  : typeOfDiary,
            };
          },
        );

        const data = await Promise.all(checkFrequencyUpdateDiary);

        let countFrequencyUpdateDiary = 0;
        data.forEach(({ type }) => {
          if (type !== null) {
            countFrequencyUpdateDiary++;
          }
        });

        const notiRemindUpdateDiariesRef = await db
          .collection('remind_update_diaries')
          .orderBy('createdAt', 'desc')
          .where('userId', '==', userId)
          .get();

        const synchronizePostDto = new SynchronizePostDto();
        synchronizePostDto.typeOfPost = TypeOfPost.REMIND_UPDATE_DIARIES;

        if (notiRemindUpdateDiariesRef?.docs[0]?.exists) {
          notiRemindUpdateDiariesRef?.docs[0].ref.set(
            {
              data,
              userId,
              content: getContentByFrequencyUpdateDiary(
                countFrequencyUpdateDiary,
              ),
              createdAt: +moment.utc().format('x'),
              updatedAt: +moment.utc().format('x'),
              typeOfPost: TypeOfPost.REMIND_UPDATE_DIARIES,
            },
            { merge: true },
          );

          synchronizePostDto.postId = notiRemindUpdateDiariesRef.docs[0].id;
        } else {
          const newRemindPost = await db
            .collection('remind_update_diaries')
            .add({
              data,
              userId,
              content: getContentByFrequencyUpdateDiary(
                countFrequencyUpdateDiary,
              ),
              createdAt: +moment.utc().format('x'),
              updatedAt: +moment.utc().format('x'),
              typeOfPost: TypeOfPost.REMIND_UPDATE_DIARIES,
            });

          synchronizePostDto.postId = newRemindPost.id;
        }

        this.feedService.synchronizePostsToMongoose(synchronizePostDto);
      });

      await Promise.all(checkDiariesExistAndRemind);
    }
  }

  async calculateOwnZtarOfTheMatch(
    currentUserId: string,
    fromDate: number,
    toDate: number,
  ) {
    const originalDiariesRef = await db
      .collection('original_diaries')
      .where('createdAt', '>=', fromDate)
      .where('createdAt', '<=', toDate)
      .get();

    const calculateZtarOfMatches = originalDiariesRef.docs.map(async (doc) => {
      const { originalDiaryId } = doc.data();

      const diariesRef = await db
        .collection('diaries')
        .where('originalDiaryId', '==', originalDiaryId)
        .where('typeOfDiary', '==', 'MATCH')
        .get();

      const gettingMvpOfMatches = diariesRef.docs.map(async (doc) => {
        const {
          match: { mvp },
          userId,
        } = doc.data();

        if (mvp?.yourTeam && mvp?.yourTeam !== '') {
          const value = await calculateMostVotesOfZtar(userId);

          const { yourTeam } = mvp;
          const result = yourTeam === currentUserId ? +value : 0;

          return result;
        } else {
          return 0;
        }
      });

      return Promise.all(gettingMvpOfMatches);
    });

    const totalZtarOfTheMatches = await Promise.all(calculateZtarOfMatches);

    return totalZtarOfTheMatches
      .map((e) => e.reduce((sum, e) => (sum += e), 0))
      .reduce((sum, e) => (sum += e), 0);
  }

  async getZtarOfTheMatch() {
    const from = +moment.utc().startOf('day').subtract(3, 'day').format('x');
    const to = +moment.utc().subtract(2, 'day').endOf('day').format('x');

    const originalDiariesRef = await db
      .collection('original_diaries')
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .get();

    originalDiariesRef.docs.map(async (doc) => {
      const { originalDiaryId, diaryId } = doc.data();

      const diariesRef = await db
        .collection('diaries')
        .where('originalDiaryId', '==', originalDiaryId)
        .where('typeOfDiary', '==', 'MATCH')
        .get();

      const mvpPlayers = <ZtarOfMatch[]>[];

      diariesRef.docs.map((doc) => {
        const {
          match: { mvp },
        } = doc.data();

        if (mvp?.yourTeam && mvp?.yourTeam !== '') {
          const { yourTeam } = mvp;

          const playerIdx = mvpPlayers.findIndex(
            ({ playerId }) => playerId === yourTeam,
          );

          if (playerIdx < 0) {
            mvpPlayers.push({
              diaryId: diaryId,
              playerId: yourTeam,
              value: 0,
            });
          }
        }
      });

      if (mvpPlayers.length) {
        const calculatePersonalZtar = mvpPlayers.map(
          async ({ playerId, value, diaryId }) => {
            const [{ matchInTotalStatistic }, ztarOfTheMatchPoint] =
              await Promise.all([
                await this.dashboardService.getMatchStats(
                  {
                    lastDateRange: LastDateRange.ALL,
                    fromDate: moment(from).format('YYYY-MM-DD'),
                    toDate: moment(to).format('YYYY-MM-DD'),
                  },
                  playerId,
                ),
                await this.calculateOwnZtarOfTheMatch(playerId, from, to),
              ]);

            value +=
              calculateZtarOfTheMatch(matchInTotalStatistic) +
              ztarOfTheMatchPoint;

            return {
              playerId,
              value,
              diaryId,
            };
          },
        );

        const result = await Promise.all(calculatePersonalZtar);

        const { diaryId, playerId } = result.reduce((highestVoted, acc) =>
          highestVoted.value > acc.value ? highestVoted : acc,
        );

        const [ztarRef, diaryRef] = await Promise.all([
          db
            .collection('ztar_of_the_matches')
            .where('diaryId', '==', diaryId)
            .where('userId', '==', playerId)
            .get(),
          db.collection('diaries').doc(diaryId).get(),
        ]);

        const diaryData = diaryRef.data();

        if (!ztarRef.empty) {
          return;
        }

        const playerCreateAwardDto: PlayerCreateAwardDto = {
          achievementType: AchievementType.award,
          awardType: ZPlayerAwardType.ZM,
          name: 'Ztar of the match',
          country: diaryData?.match?.country || defaultCountry,
          connectedClub: {
            connectedClubType: ConnectedClubType.Existing,
            clubId: diaryData?.match?.club?.clubId || null,
          } as ConnectedClubDto,
          date: moment().toISOString(),
          description: 'Ztar of the match auto generated',
          media: [],
        };
        await this.achievementsService.playerCreateAward(
          playerId,
          playerCreateAwardDto,
        );

        const [{ fcmToken, favoriteRoles }, newZtarOfTheMatch] =
          await Promise.all([
            mappingUserInfoById(playerId),
            db.collection('ztar_of_the_matches').add({
              title: 'Ztar of the match',
              diaryId,
              userId: playerId,
              createdAt: +moment.utc().format('x'),
              updatedAt: +moment.utc().format('x'),
              typeOfPost: TypeOfPost.ZTAR_OF_THE_MATCH,
            }),
          ]);

        try {
          await this.userMatchModel.create({
            userId: playerId,
            diaryId: diaryId,
            originalDiaryId: diaryData.originalId,
            country: diaryData?.match?.country?.name || defaultCountry?.name,
            favoriteRole: favoriteRoles[0],
            totalPointPerMatch: 30,
            dateTime: +moment(diaryData?.match?.dateTime).utc().format('x'),
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
          });
          console.log('Create ZM record successfully');
        } catch (error) {
          throw new HttpException(`${error}`, HttpStatus.BAD_REQUEST);
        }

        this.feedService.synchronizePostsToMongoose({
          postId: newZtarOfTheMatch.id,
          typeOfPost: TypeOfPost.ZTAR_OF_THE_MATCH,
        });

        const payload = new CreateNotificationDto();

        payload.senderId = '';
        payload.receiverId = playerId;
        payload.token = fcmToken;
        payload.title = 'Zporter';
        payload.largeIcon = `${process.env.ZPORTER_IMAGE}`;
        payload.notificationType = NotificationType.ZTAR_OF_THE_MATCH;
        payload.userType = UserTypes.SYS_ADMIN;

        return this.notificationsService.sendMulticastNotification(payload);
      }
    });
  }

  async updateRemindUpdateDiaryPost(userId: string) {
    const newPost = new PostQueryDto();
    newPost.typeOfPost = TypeOfPost.REMIND_UPDATE_DIARIES;

    const user = await db.collection('users').doc(userId).get();
    const timezone = user.data()?.timezone || 'UTC';

    let i = 30;
    const last7Days = [];
    while (i >= 0) {
      last7Days.push({
        from: +moment
          .tz(timezone)
          .startOf('day')
          .subtract(i, 'day')
          .format('x'),
        to: +moment.tz(timezone).endOf('day').subtract(i, 'day').format('x'),
      });
      i--;
    }

    const checkFrequencyUpdateDiary = last7Days.map(async ({ from, to }) => {
      const diariesRef = await db
        .collection('diaries')
        .orderBy('createdAt', 'desc')
        .where('userId', '==', userId)
        .where('createdAt', '>=', from)
        .where('createdAt', '<=', to)
        .get();

      const typeOfDiary = diariesRef.docs[0]?.data()?.typeOfDiary || null;

      return {
        day: from,
        type:
          typeOfDiary === 'TRAINING'
            ? diariesRef.docs[0]?.data()?.training?.typeOfTraining
            : typeOfDiary,
      };
    });

    const data = await Promise.all(checkFrequencyUpdateDiary);

    let countFrequencyUpdateDiary = 0;
    data.slice(-7).forEach(({ type }) => {
      if (type !== null) {
        countFrequencyUpdateDiary++;
      }
    });

    const notiRemindUpdateDiariesRef = await db
      .collection('remind_update_diaries')
      .orderBy('createdAt', 'desc')
      .where('userId', '==', userId)
      .get();

    if (!notiRemindUpdateDiariesRef.empty) {
      await notiRemindUpdateDiariesRef?.docs[0].ref.set(
        {
          data,
          userId,
          content: getContentByFrequencyUpdateDiary(countFrequencyUpdateDiary),
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
          typeOfPost: TypeOfPost.REMIND_UPDATE_DIARIES,
        },
        { merge: true },
      );

      newPost.postId = notiRemindUpdateDiariesRef?.docs[0].id;
    } else {
      const newRemindPost = await db.collection('remind_update_diaries').add({
        data,
        userId,
        content: getContentByFrequencyUpdateDiary(countFrequencyUpdateDiary),
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
        typeOfPost: TypeOfPost.REMIND_UPDATE_DIARIES,
      });

      newPost.postId = newRemindPost.id;
    }

    this.feedService.synchronizePostsToMongoose(newPost);

    return 'success';
  }

  async getPhysicallyStrainOfTeam(currentUserId: string, createdAt: number) {
    return this.diariesBigQueryService.getPhysicallyStrainOfTeam(
      currentUserId,
      createdAt,
    );
  }

  async getOriginalDiaries(
    currentUserId: string,
    getOriginalDiaryDto: GetOriginalDiaryDto,
  ) {
    const { startAfter: pageNumber } = getOriginalDiaryDto;

    if (+pageNumber <= 0 || !pageNumber) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.diariesBigQueryService.getOriginalDiaries(
      currentUserId,
      getOriginalDiaryDto,
    );

    return this.mappingDiariesInfo(data);
  }

  async getOriginalDiariesCalendarStatus(
    currentUserId: string,
    getOriginalDiaryDto: GetOriginalDiaryCalendarStatusDto,
    options: { timezone: string },
  ) {
    const data =
      await this.diariesBigQueryService.getOriginalDiariesCalendarStatus(
        currentUserId,
        getOriginalDiaryDto,
        options,
      );

    const filteredData = filterDuplicateDayRecords(data);

    return fillEmptyTimestamp(
      getOriginalDiaryDto.from,
      getOriginalDiaryDto.to,
      filteredData,
    );
  }

  async coachReviewDiary(
    currentUserId: string,
    diaryId: string,
    coachReviewDiaryDto: CoachReviewDiaryDto,
  ) {
    const { content } = coachReviewDiaryDto;
    const diariesRef = await db.collection('diaries').doc(diaryId).get();

    if (!diariesRef.exists) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    diariesRef.ref.set(
      {
        coachReviews: firebase.firestore.FieldValue.arrayUnion({
          userId: currentUserId,
          content,
        }),
      },
      { merge: true },
    );
  }

  async getDiaryById(currentUserId: string, diaryId: string) {
    const diaryRef = await db.collection('diaries').doc(diaryId).get();

    if (!diaryRef.exists) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const baseQueryBuilder: BaseQueryBuilder = {
      lastDateRange: LastDateRange.ALL,
    };

    const averagePainColumnChart: AveragePainColumnChartDto =
      await this.getAveragePainChartColumn(baseQueryBuilder);

    // get number of likes, comments in this diary
    const [queryLikes, queryComments] = await Promise.all([
      db.collection('diaries').doc(diaryId).collection('likes').get(),
      db.collection('diaries').doc(diaryId).collection('comments').get(),
    ]);

    const [likeUserIds, commentUserIds] = await Promise.all([
      queryLikes.docs.map((el) => el.data().userId),
      queryComments.docs.map((el) => el.data().userId),
    ]);
    const countLikes = queryLikes.docs.length;
    const countComments = queryComments.docs.length;

    let result: any = {
      postId: diaryId,
      ...diaryRef.data(),
      averagePainColumnChart,
      countLikes,
      countComments,
      isLiked: likeUserIds.includes(currentUserId) ? true : false,
      isCommented: commentUserIds.includes(currentUserId) ? true : false,
    };

    const {
      userId,
      training,
      match,
      createdAt,
      coachReviews = [],
      teamId,
      typeOfDiary,
      typeOfPost,
    } = diaryRef.data();

    const [getDiaryRoutineADay, injuryRef, userInfo] = await Promise.all([
      db
        .collection('diaries')
        .orderBy('createdAt', 'desc')
        .where('userId', '==', userId)
        .where('createdAt', '<=', createdAt)
        .select('energyLevel', 'eatAndDrink', 'sleep')
        .limit(7)
        .get(),
      db
        .collection('diaries')
        .doc(diaryId)
        .collection('injuries')
        .orderBy('createdAt', 'desc')
        .get(),
      mappingUserInfoById(userId),
    ]);

    // diary routine chart
    const sleepChart: number[] = [];
    const eatChart: number[] = [];
    const energyChart: number[] = [];

    getDiaryRoutineADay.forEach((x) => {
      const { energyLevel, eatAndDrink, sleep } = x.data();
      if (energyLevel) {
        energyChart.push(levelDiary[energyLevel]);
      }
      if (eatAndDrink) {
        eatChart.push(levelDiary[eatAndDrink]);
      }
      if (sleep) {
        sleepChart.push(levelDiary[sleep]);
      }
    });

    result = {
      ...result,
      userInfo,
      sleepChart: sleepChart.reverse(),
      eatChart: eatChart.reverse(),
      energyChart: energyChart.reverse(),
    };

    if (coachReviews?.length) {
      const mappingCoachInfo = coachReviews.map(async ({ userId, content }) => {
        const userInfo = await mappingUserInfoById(userId);

        return { userInfo, content };
      });

      const mappedCoachInfo = await Promise.all(mappingCoachInfo);

      result = {
        ...result,
        coachReviews: mappedCoachInfo,
      };
    }
    const { type } = userInfo;

    // calculate technical, tactical, mental, physical
    if (training) {
      const {
        technics = 0,
        tactics = 0,
        mental = 0,
        physics = 0,
        hoursOfPractice = 0,
        trainingMedia = [],
        practiceTags = [],
        physicallyStrain,
        typeOfTraining,
      } = training;

      const trainingCategoryOfTotalHours = calculateMinutesOfHours(
        [technics, tactics, mental, physics],
        hoursOfPractice,
      );

      const _trainingCategory = calculatePercent([
        technics,
        tactics,
        mental,
        physics,
      ]);

      const trainingCategoryDto = new TrainingCategoryDto();
      trainingCategoryDto.technical = _trainingCategory[0];
      trainingCategoryDto.tactics = _trainingCategory[1];
      trainingCategoryDto.mental = _trainingCategory[2];
      trainingCategoryDto.physical = _trainingCategory[3];

      if (type === UserTypes.COACH && teamId) {
        let { playerReviews = [] } = training;
        if (playerReviews?.length > 0) {
          const mappingUserInfo = (playerReviews as PlayerReviews[]).map(
            async ({ userId, matchReview, performance }) => {
              const userInfo = await mappingUserInfoById(userId);

              return {
                userInfo,
                matchReview,
                performance,
              };
            },
          );

          playerReviews = await Promise.all(mappingUserInfo);

          result = {
            ...result,
            training: { ...result.training, playerReviews },
          };
        }
      }

      result = {
        ...result,
        trainingCategory: trainingCategoryDto,
        training: {
          ...result.training,
          technics: trainingCategoryOfTotalHours[0],
          tactics: trainingCategoryOfTotalHours[1],
          mental: trainingCategoryOfTotalHours[2],
          physics: trainingCategoryOfTotalHours[3],
          trainingMedia: trainingMedia?.length ? trainingMedia.slice(0, 6) : [],
          practiceTags: practiceTags?.length ? practiceTags.slice(0, 6) : [],
        },
      };

      if (typeOfTraining === TypeOfTraining.TEAM_TRAINING) {
        // get average physicallyStrain of team in one day

        const listOfPhysicallyStrain = await this.getPhysicallyStrainOfTeam(
          userId,
          createdAt,
        );

        const teamPhysicallyStrain = listOfPhysicallyStrain.length
          ? findMostElementAppear(listOfPhysicallyStrain)?.physicallyStrain
          : null;

        result = {
          ...result,
          training: {
            ...result.training,
            yourPhysicallyStrain: physicallyStrain,
            teamPhysicallyStrain: teamPhysicallyStrain,
          },
        };
      }
    }

    // get match stats
    if (match) {
      let goals = 0;
      let assists = 0;
      let yellowCard = 0;
      let redCard = 0;
      let playingTime = 0;
      let commonRole;

      const {
        review,
        yourTeam,
        opponentTeam,
        mvp,
        stats = [],
        events = [],
        matchMedia = [],
      } = match;

      if (type === UserTypes.PLAYER) {
        if (stats?.length) {
          commonRole = findMostElementAppear(stats) || '?';

          stats.forEach((stat) => {
            playingTime += stat.minutesPlayed;
          });
        }

        if (events?.length) {
          events.forEach((e) => {
            // Count Personal Goals
            if (e.event === Event.GOAL) {
              goals++;
            }

            // Count Personal Assists
            if (e.event === Event.ASSIST) {
              assists++;
            }

            // Count Personal Yellow Card
            if (e.event === Event.YELLOW_CARD) {
              yellowCard++;
            }

            // Count Personal Red Card
            if (e.event === Event.RED_CARD) {
              redCard++;
            }
          });
        }
      }

      if (type === UserTypes.COACH && teamId) {
        let { playerReviews = [], stats = [], events = [] } = match;

        if (events?.length > 0) {
          const mappingUserInfo = (events as CoachMatchEventsDto[]).map(
            async ({ action, minute, player }) => {
              let result: any = {
                minute,
                action,
              };

              if (player !== '') {
                const userInfo = await mappingUserInfoById(player);

                result = {
                  ...result,
                  userInfo,
                };
              }

              return result;
            },
          );

          events = await Promise.all(mappingUserInfo);

          result = {
            ...result,
            match: { ...result.match, events },
          };
        }

        if (playerReviews?.length > 0) {
          const mappingUserInfo = (playerReviews as PlayerReviews[]).map(
            async ({ userId, matchReview, performance }) => {
              const userInfo = await mappingUserInfoById(userId);

              return {
                userInfo,
                matchReview,
                performance,
              };
            },
          );

          playerReviews = await Promise.all(mappingUserInfo);

          result = {
            ...result,
            match: { ...result.match, playerReviews },
          };
        }

        if (stats?.length > 0) {
          const mappingUserInfo = (stats as CoachMatchStatsDto[]).map(
            async ({ assist, goalScorer, minute }) => {
              let result: any = {
                minute,
              };

              if (assist !== '') {
                const assistInfo = await mappingUserInfoById(
                  assist,
                  null,
                  null,
                  ['fullName', 'shirtNumber', 'userId'],
                );

                result = { ...result, assistInfo };
              }

              if (goalScorer !== '') {
                const goalScorerInfo = await mappingUserInfoById(
                  goalScorer,
                  null,
                  null,
                  ['fullName', 'shirtNumber', 'userId'],
                );

                result = {
                  ...result,
                  goalScorerInfo,
                };
              }

              return result;
            },
          );

          stats = await Promise.all(mappingUserInfo);

          result = {
            ...result,
            match: { ...result.match, stats },
          };
        }
      }

      const matchStats = {
        role: commonRole?.role,
        playingTime,
        goals,
        assists,
        yellowCard,
        redCard,
      };

      result = {
        ...result,
        matchStats,
        playerPerformance: performanceLevel[review?.playerPerformance],
        match: {
          ...result.match,
          matchMedia: matchMedia?.length ? matchMedia.slice(0, 6) : [],
        },
      };

      if (yourTeam && yourTeam !== '' && yourTeam !== 'null') {
        const yourTeamInfo = await this.teamsService.findOne(yourTeam);

        result = {
          ...result,
          match: {
            ...result.match,
            yourTeam: yourTeamInfo,
          },
        };
      }

      if (opponentTeam && opponentTeam !== '' && opponentTeam !== 'null') {
        const opponentTeamInfo = await this.teamsService.findOne(opponentTeam);
        result = {
          ...result,
          match: {
            ...result.match,
            opponentTeam: opponentTeamInfo,
          },
        };
      }

      if (mvp?.yourTeam && mvp?.yourTeam !== '') {
        const { yourTeam } = mvp;
        const yourTeamInfo = await mappingUserInfoById(yourTeam);

        result = {
          ...result,
          match: {
            ...result.match,
            mvp: { yourTeam: yourTeamInfo },
          },
        };
      }

      if (mvp?.opponents && mvp?.opponents !== '') {
        const { opponents } = mvp;
        const opponentsInfo = await mappingUserInfoById(opponents);

        result = {
          ...result,
          match: {
            ...result.match,
            mvp: { opponents: opponentsInfo },
          },
        };
      }

      if (review) {
        const listOfPhysicallyStrain = await this.getPhysicallyStrainOfTeam(
          userId,
          createdAt,
        );

        const teamPhysicallyStrain = listOfPhysicallyStrain.length
          ? findMostElementAppear(listOfPhysicallyStrain)?.physicallyStrain
          : PhysicallyStrain.LOW;

        result = {
          ...result,
          match: {
            ...result.match,
            review: {
              ...review,
              teamPhysicallyStrain: teamPhysicallyStrain,
            },
          },
        };
      }
    }

    // Get injury trend
    const injuriesTrending: number[] = [];
    const injuryTags: string[] = [];
    const injuries: InjuryDto[] = [];

    injuryRef.forEach((doc) => {
      injuries.push(doc.data() as InjuryDto);
      injuryTags.push(...doc.data()?.injuryTags);
      injuriesTrending.push(painLevel[doc.data()?.painLevel]);
    });

    // Get highest pain level
    const injuryPain = diaryRef.data()?.injuries?.length
      ? Object.values(PainLevel)[
      Math.max(
        ...diaryRef.data()?.injuries.map((o) => painLevel[o.painLevel]),
      ) - 1
      ]
      : 'No';

    result = {
      ...result,
      diaryType:
        userInfo.type === UserTypes.COACH && typeOfDiary === TypeOfDiary.MATCH
          ? 'COACH_DIARY_MATCH'
          : typeOfPost,
      injuriesTrending: injuriesTrending.slice(0, 7),
      injuryTags: injuryTags.slice(0, 7),
      injuries: formatInjuryBodyPart(injuries),
      injuryPain,
    };

    return result;
  }

  async mappingDiariesInfo(
    diaryDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[],
  ) {
    if (diaryDocs.length) {
      const userIds = new Set<string>();
      const teamIds = new Set<string>();

      diaryDocs.forEach((doc) => {
        const {
          coachReviews = [],
          teamId,
          typeOfDiary,
          match,
          userId,
        } = doc.data();

        userIds.add(userId);

        if (teamId) {
          teamIds.add(teamId);
        }

        coachReviews.forEach(({ userId: coachUserId }) => {
          userIds.add(coachUserId);
        });

        if (typeOfDiary === TypeOfDiary.MATCH) {
          const { playerReviews = [], stats = [], events = [], mvp } = match || {};

          playerReviews.forEach(({ userId: playerUserId }) => {
            userIds.add(playerUserId);
          });

          events.forEach(({ player }) => {
            if (player && player !== '') {
              userIds.add(player);
            }
          });

          stats.forEach(({ assist, goalScorer }) => {
            if (assist && assist !== '') {
              userIds.add(assist);
            }
            if (goalScorer && goalScorer !== '') {
              userIds.add(goalScorer);
            }
          });

          if (mvp) {
            if (mvp.yourTeam && mvp.yourTeam !== '') {
              userIds.add(mvp.yourTeam);
            }
            if (mvp.opponents && mvp.opponents !== '') {
              userIds.add(mvp.opponents);
            }
          }

          if (match?.yourTeam && match.yourTeam !== '') {
            teamIds.add(match.yourTeam);
          }
          if (match?.opponentTeam && match.opponentTeam !== '') {
            teamIds.add(match.opponentTeam);
          }
        }
      });

      const [userInfoCache, teamInfoCache] = await Promise.all([
        Promise.all(
          Array.from(userIds).map(async (userId) => {
            const userInfo = await mappingUserInfoById(userId);
            return { userId, userInfo };
          })
        ).then(results => {
          const cache = new Map();
          results.forEach(({ userId, userInfo }) => {
            cache.set(userId, userInfo);
          });
          return cache;
        }),

        Promise.all(
          Array.from(teamIds).map(async (teamId) => {
            const teamInfo = await this.teamsService.findOne(teamId);
            return { teamId, teamInfo };
          })
        ).then(results => {
          const cache = new Map();
          results.forEach(({ teamId, teamInfo }) => {
            cache.set(teamId, teamInfo);
          });
          return cache;
        })
      ]);

      const mappingDiaryInfo = diaryDocs.map(async (doc) => {
        const {
          coachReviews = [],
          teamId,
          typeOfDiary,
          match,
          userId,
        } = doc.data();

        const userInfo = userInfoCache.get(userId);

        let result: any = {
          ...doc.data(),
          diaryId: doc.id,
          userInfo,
        };

        if (coachReviews?.length) {
          const mappedCoachInfo = coachReviews.map(({ userId, content }) => {
            const userInfo = userInfoCache.get(userId);
            return { userInfo, content };
          });

          result = {
            ...result,
            coachReviews: mappedCoachInfo,
          };
        }

        if (teamId) {
          const teamDoc = teamInfoCache.get(teamId);
          result = {
            ...result,
            teamInfo: teamDoc,
          };
        }

        if (typeOfDiary === TypeOfDiary.MATCH) {
          let { playerReviews = [], stats = [], events = [], mvp } = match;

          if (teamId) {
            if (events?.length > 0) {
              const mappedEvents = await Promise.all(
                (events as CoachMatchEventsDto[]).map(
                  async ({ action, minute, player }) => {
                    let eventResult: any = {
                      minute,
                      action,
                    };
                    if (player !== '') {
                      const playerInfo = await mappingUserInfoById(
                        player,
                        null,
                        null,
                        [
                          'fullName',
                          'userId',
                          'firstName',
                          'lastName',
                          'shirtNumber',
                        ],
                      );

                      eventResult = {
                        ...eventResult,
                        playerInfo,
                      };
                    }

                    return eventResult;
                  },
                )
              );

              events = mappedEvents;

              result = {
                ...result,
                match: { ...result.match, events },
              };
            }

            if (playerReviews?.length > 0) {
              const mappedPlayerReviews = playerReviews.map(
                ({ userId, matchReview, performance, role }) => {
                  const userInfo = userInfoCache.get(userId);

                  return {
                    userId: userInfo.userId,
                    username: userInfo.username,
                    faceImage: userInfo.faceImage,
                    matchReview,
                    performance,
                    role,
                  };
                },
              );

              playerReviews = mappedPlayerReviews;

              result = {
                ...result,
                match: { ...result.match, playerReviews },
              };
            }

            if (stats?.length > 0) {
              const mappedStats = await Promise.all(
                (stats as CoachMatchStatsDto[]).map(
                  async ({ assist, goalScorer, minute }) => {
                    let statResult: any = {
                      minute,
                    };

                    if (assist !== '') {
                      const assistInfo = await mappingUserInfoById(
                        assist,
                        null,
                        null,
                        ['fullName', 'shirtNumber', 'userId'],
                      );

                      statResult = {
                        ...statResult,
                        assistInfo,
                      };
                    }

                    if (goalScorer !== '') {
                      const goalScorerInfo = await mappingUserInfoById(
                        goalScorer,
                        null,
                        null,
                        ['fullName', 'shirtNumber', 'userId'],
                      );

                      statResult = {
                        ...statResult,
                        goalScorerInfo,
                      };
                    }

                    return statResult;
                  },
                )
              );

              stats = mappedStats;

              result = {
                ...result,
                match: { ...result.match, stats },
              };
            }
          }

          if (mvp) {
            if (mvp?.yourTeam && mvp?.yourTeam !== '') {
              const yourTeam = userInfoCache.get(mvp.yourTeam);
              mvp = { ...mvp, yourTeam };
              result = {
                ...result,
                match: { ...result.match, mvp },
              };
            }
            if (mvp?.opponents && mvp?.opponents !== '') {
              const opponents = userInfoCache.get(mvp.opponents);
              mvp = { ...mvp, opponents };
              result = {
                ...result,
                match: { ...result.match, mvp },
              };
            }
          }

          if (
            doc.data()?.match?.yourTeam &&
            doc.data()?.match?.yourTeam !== ''
          ) {
            const yourTeam = teamInfoCache.get(doc.data()?.match?.yourTeam);

            result = {
              ...result,
              match: {
                ...result.match,
                yourTeam: yourTeam,
              },
            };
          }

          if (
            doc.data()?.match?.opponentTeam &&
            doc.data()?.match?.opponentTeam !== ''
          ) {
            const opponentTeam = teamInfoCache.get(doc.data()?.match?.opponentTeam);

            result = {
              ...result,
              match: {
                ...result.match,
                opponentTeam: opponentTeam,
              },
            };
          }
        }

        return result;
      });

      return Promise.all(mappingDiaryInfo);
    }

    return [];
  }

  async getFrequencyNotification(userId: string) {
    const fromDate = +moment
      .utc()
      .startOf('day')
      .subtract(12, 'hours')
      .format('x');
    const toDate = +moment.utc().startOf('day').add(12, 'hours').format('x');

    const frequencyNotification = await db
      .collection('notifications')
      .where('notificationType', 'in', [
        NotificationType.TEAM_TRAINING,
        NotificationType.MATCH,
      ])
      .where('receiverId', '==', userId)
      .where('createdAt', '>=', fromDate)
      .where('createdAt', '<', toDate)
      .get();

    return frequencyNotification.size;
  }

  async getListInjuries(diaryId: string): Promise<InjuryDto[]> {
    const injuries = [];
    const injuryRef = await db
      .collection('diaries')
      .doc(diaryId)
      .collection('injuries')
      .get();

    injuryRef.forEach((doc) => {
      injuries.push({ ...doc.data(), injuryId: doc.id });
    });
    return injuries;
  }

  async playerGetDiaryByQueries(
    diaryQueryBuilder: DiaryQueryBuilder,
    currentUserId: string,
  ) {
    const { createdAt } = diaryQueryBuilder;
    let diariesRef = collection('diaries')
      .where('userId', '==', currentUserId)
      .orderBy('createdAt', 'asc');

    if (createdAt) {
      const fromDate = +moment(+createdAt)
        .startOf('day')
        .format('x');
      const toDate = +moment(+createdAt)
        .endOf('day')
        .format('x');

      diariesRef = diariesRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<', toDate);
    }

    const querySnapshot = await diariesRef.get();

    const diaryDocs = querySnapshot.docs;

    const data = await this.mappingDiariesInfo(diaryDocs);

    return {
      data,
    };
  }

  async coachGetDiaryByQueries(
    diaryQueryBuilder: DiaryQueryBuilder,
    currentUserId: string,
  ) {
    const { createdAt } = diaryQueryBuilder;

    let diariesRef = collection('diaries')
      .where('userId', '==', currentUserId)
      .orderBy('createdAt', 'asc');

    if (createdAt) {
      const fromDate = moment(createdAt).format('x');
      const toDate = moment(createdAt).add(1, 'days').format('x');

      diariesRef = diariesRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<', toDate);
    }

    const querySnapshot = await diariesRef.get();

    const diaryDocs = querySnapshot.docs;

    const [data, unregisteredMatch, unregisteredTeamTraining] =
      await Promise.all([
        this.mappingDiariesInfo(diaryDocs),
        this.diariesBigQueryService.getCountUnRegisteredOriginalDiaries(
          currentUserId,
          OriginalDiaryType.MATCH,
        ),
        this.diariesBigQueryService.getCountUnRegisteredOriginalDiaries(
          currentUserId,
          OriginalDiaryType.TEAM_TRAINING,
        ),
      ]);
    // optional, nice to have, can be removed
    const motivationQuote = generateRandomQuotes();

    return {
      data,
      motivationQuote,
      unregisteredMatch,
      unregisteredTeamTraining,
    };
  }

  async playerCreateDiaryTraining(
    playerUpdateDiaryTrainingDto: PlayerCreateDiaryTrainingDto,
    currentUserId: string,
  ): Promise<OutputCreateDiary> {
    const { injuries, createdAt, originalDiaryId, ...rest } =
      playerUpdateDiaryTrainingDto;

    let totalHoursOfPracticePerDay = 0;

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    const createdDate = createdAt
      ? moment(createdAt)
        .utc()
        .format('YYYY-MM-DDT00:00:00+' + createdAt.split('+')[1])
      : moment.utc().format('YYYY-MM-DDT00:00:00+07:00');
    const fromDate = Math.floor(new Date(createdDate).getTime());
    const toDate = fromDate + (3600000 * 24 - 1);

    const diaryRef = await db
      .collection('diaries')
      .where('userId', '==', currentUserId)
      .where('typeOfDiary', '==', TypeOfDiary.TRAINING)
      .where('createdAt', '>=', fromDate)
      .where('createdAt', '<=', toDate)
      .get();

    diaryRef.forEach((doc) => {
      totalHoursOfPracticePerDay += doc.data().training.hoursOfPractice;
    });

    if (
      totalHoursOfPracticePerDay >= 10 ||
      rest.training.hoursOfPractice + totalHoursOfPracticePerDay > 10
    ) {
      throw new HttpException(
        ResponseMessage.Diary.LIMIT_10HOUR_DIARY,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');

    const {
      training: { typeOfTraining },
      typeOfDiary,
    } = rest;
    rest.typeOfDiary = TypeOfDiary.TRAINING;

    if (typeOfTraining === TypeOfTraining.REST_DAY) {
      rest.typeOfDiary = TypeOfDiary.REST;
    }

    const originalId = !originalDiaryId
      ? db.collection('original_diaries').doc().id
      : originalDiaryId;

    const diary: ILastTraining = {
      ...rest,
      createdAt: createdTime,
      updatedAt: createdTime,
      userId: currentUserId,
      typeOfPost: TypeOfPost.DIARIES,
      originalDiaryId: originalId,
    };
    const [newDiary, originalDiaryRef] = await Promise.all([
      db.collection('diaries').add(JSON.parse(JSON.stringify(diary))),
      db
        .collection('original_diaries')
        .where('originalDiaryId', '==', originalId)
        .get(),
    ]);
    if (
      originalDiaryRef.empty &&
      typeOfDiary === TypeOfDiary.TRAINING &&
      [TypeOfTraining.GROUP_TRAINING, TypeOfTraining.TEAM_TRAINING].includes(
        typeOfTraining,
      )
    ) {
      await Promise.all([
        db.collection('original_diaries').add(
          JSON.parse(
            JSON.stringify({
              createdAt: createdTime,
              updatedAt: createdTime,
              originalDiaryId: originalId,
              diaryId: newDiary.id,
              typeOfDiary: typeOfTraining,
              userId: currentUserId,
            }),
          ),
        ),

        db
          .collection('users')
          .doc(currentUserId)
          .update(
            JSON.parse(
              JSON.stringify({
                lastTraining: diary,
              }),
            ),
          ),
      ]);
    }

    if (playerUpdateDiaryTrainingDto?.training?.practiceTags?.length) {
      this.createPracticeTags(
        playerUpdateDiaryTrainingDto.training.practiceTags,
      );
    }

    if (injuries) {
      await this.createInjury(newDiary.id, injuries, currentUserId);
    }

    const [injury] = await Promise.all([
      this.getListInjuries(newDiary.id),
      this.updateRemindUpdateDiaryPost(currentUserId),
    ]);

    let newFeed: Object;
    // caching
    if (![TypeOfDiary.REST, TypeOfDiary.CAP].includes(rest.typeOfDiary)) {
      const newPost = await db.collection('diaries').doc(newDiary.id).get();

      newFeed = await this.feedService.synchronizePostsToMongoose({
        postId: newPost.id,
        typeOfPost: TypeOfPost.DIARIES,
      });
    }

    // send notification
    if (rest.training.typeOfTraining === TypeOfTraining.TEAM_TRAINING) {
      const memberIds = await this.teamsService.getMemberIdsFromTeams(
        currentUserId,
      );

      const stopSendingNoti = await this.notSendingNotiForTeamTrainings(
        memberIds,
        createdTime,
      );

      if (memberIds.length && !stopSendingNoti) {
        const currentUserInfo = await mappingUserInfoById(currentUserId);

        const sendNotification = memberIds.map(async (memberId) => {
          const frequencyNotification = await this.getFrequencyNotification(
            memberId,
          );

          if (frequencyNotification <= 3) {
            const userInfo = await mappingUserInfoById(memberId);

            const date = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('D MMM');
            const time = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('HH:mm');

            const payload = new CreateNotificationDto();
            payload.token = userInfo.fcmToken;
            payload.title = `#${currentUserInfo.username} had a Team Training ${date} at ${time}.`;
            payload.username = currentUserInfo.username;
            payload.largeIcon = currentUserInfo.faceImage;
            payload.notificationType = NotificationType.TEAM_TRAINING;
            payload.bigPicture =
              (playerUpdateDiaryTrainingDto?.training?.trainingMedia?.filter(
                (e) => e.type === MediaType.IMAGE,
              )[0]?.url as string) || currentUserInfo.faceImage;
            payload.senderId = currentUserInfo.userId;
            payload.receiverId = userInfo.userId;
            payload.userType = currentUserInfo.type;

            const diariesRef = await db
              .collection('diaries')
              .doc(newDiary.id)
              .get();

            const diariesData = [];
            diariesData.push(diariesRef);

            const data = await this.mappingDiariesInfo(diariesData);

            payload.others = {
              diaryId: newDiary.id,
              playerDiaryData: JSON.stringify(data[0]),
            };

            await this.notificationsService.sendMulticastNotification(payload);
          }
        });

        Promise.all(sendNotification);
      }
    }

    return { diaryId: newDiary.id, post: newFeed, injuries: injury };
  }

  async notSendingNotiForTeamTrainings(
    memberIds: string[],
    createdUnixTimestamp: number,
  ) {
    const copiedArr = [...memberIds];
    while (copiedArr.length) {
      const batchMembers = copiedArr.splice(0, 10);
      const diaries = await db
        .collection('diaries')
        .where('typeOfDiary', '==', TypeOfDiary.TRAINING)
        .where('training.typeOfTraining', '==', TypeOfTraining.TEAM_TRAINING)
        .where('userId', 'in', [...batchMembers])
        .get();

      const createdDateFormatted = moment
        .unix(createdUnixTimestamp)
        .format('MM/DD/YYYY');

      diaries.docs.forEach((diary) => {
        const diaryData = diary.data();
        const diaryCreatedDateFormatted = moment
          .unix(diaryData?.createdAt)
          .format('MM/DD/YYYY');

        if (createdDateFormatted === diaryCreatedDateFormatted) {
          return true;
        }
      });
    }
    return false;
  }

  async notSendingNotiForMatches(
    memberIds: string[],
    createdUnixTimestamp: number,
  ) {
    const copiedArr = [...memberIds];
    while (copiedArr.length) {
      const batchMembers = copiedArr.splice(0, 10);

      const diaries = await db
        .collection('diaries')
        .where('typeOfDiary', '==', TypeOfDiary.MATCH)
        .where('userId', 'in', [...batchMembers])
        .get();

      const createdDateFormatted = moment
        .unix(createdUnixTimestamp)
        .format('MM/DD/YYYY');

      diaries.docs.forEach((diary) => {
        const diaryData = diary.data();
        const diaryCreatedDateFormatted = moment
          .unix(diaryData?.createdAt)
          .format('MM/DD/YYYY');

        if (createdDateFormatted === diaryCreatedDateFormatted) {
          return true;
        }
      });
    }

    return false;
  }

  async coachCreateDiaryTraining(
    coachCreateDiaryTrainingDto: CoachCreateDiaryTrainingDto,
    currentUserId: string,
  ) {
    const { createdAt, originalDiaryId, ...rest } = coachCreateDiaryTrainingDto;
    rest.typeOfDiary = TypeOfDiary.TRAINING;

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    let totalHoursOfPracticePerDay = 0;

    const createdDate = createdAt
      ? moment(createdAt)
        .utc()
        .format('YYYY-MM-DDT00:00:00+' + createdAt.split('+')[1])
      : moment.utc().format('YYYY-MM-DDT00:00:00+07:00');
    const fromDate = Math.floor(new Date(createdDate).getTime());
    const toDate = fromDate + (3600000 * 24 - 1);

    const diaryRef = await db
      .collection('diaries')
      .where('userId', '==', currentUserId)
      .where('typeOfDiary', '==', TypeOfDiary.TRAINING)
      .where('createdAt', '>=', fromDate)
      .where('createdAt', '<=', toDate)
      .get();

    diaryRef.forEach((doc) => {
      totalHoursOfPracticePerDay += doc.data().training.hoursOfPractice;
    });

    if (
      totalHoursOfPracticePerDay >= 10 ||
      rest.training.hoursOfPractice + totalHoursOfPracticePerDay > 10
    ) {
      throw new HttpException(
        ResponseMessage.Diary.LIMIT_10HOUR_DIARY,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');
    const {
      training: { typeOfTraining },
      typeOfDiary,
    } = rest;

    if (typeOfTraining === TypeOfTraining.REST_DAY) {
      rest.typeOfDiary = TypeOfDiary.REST;
    }

    const originalId = !originalDiaryId
      ? db.collection('original_diaries').doc().id
      : originalDiaryId;

    const diary: ILastTraining = JSON.parse(
      JSON.stringify({
        ...rest,
        createdAt: createdTime,
        updatedAt: createdTime,
        userId: currentUserId,
        typeOfPost: TypeOfPost.DIARIES,
        originalDiaryId: originalId,
      }),
    );
    const [newDiary, originalDiaryRef, _] = await Promise.all([
      db.collection('diaries').add(diary),
      db
        .collection('original_diaries')
        .where('originalDiaryId', '==', originalId)
        .get(),
      db
        .collection('users')
        .doc(currentUserId)
        .update(
          JSON.parse(
            JSON.stringify({
              lastTraining: diary,
            }),
          ),
        ),
    ]);
    if (
      originalDiaryRef.empty &&
      typeOfDiary === TypeOfDiary.TRAINING &&
      [TypeOfTraining.GROUP_TRAINING, TypeOfTraining.TEAM_TRAINING].includes(
        typeOfTraining,
      )
    ) {
      const originalDiaryData = JSON.parse(
        JSON.stringify({
          createdAt: createdTime,
          updatedAt: createdTime,
          originalDiaryId: originalId,
          diaryId: newDiary.id,
          typeOfDiary: typeOfTraining,
          userId: currentUserId,
        }),
      );
      await db.collection('original_diaries').add(originalDiaryData);
    }

    if (coachCreateDiaryTrainingDto?.training?.practiceTags?.length) {
      this.createPracticeTags(
        coachCreateDiaryTrainingDto.training.practiceTags,
      );
    }

    await this.updateRemindUpdateDiaryPost(currentUserId);

    let newFeed: Object;
    // caching
    if (![TypeOfDiary.REST, TypeOfDiary.CAP].includes(rest.typeOfDiary)) {
      const newPost = await db.collection('diaries').doc(newDiary.id).get();

      newFeed = await this.feedService.synchronizePostsToMongoose({
        postId: newPost.id,
        typeOfPost: TypeOfPost.DIARIES,
      });
    }

    // comment on player diary training with the same original diary id
    const playerDiariesRef = await db
      .collection('diaries')
      .where('originalDiaryId', '==', originalId)
      .where('typeOfDiary', '==', TypeOfDiary.TRAINING)
      .where('userId', '!=', currentUserId)
      .get();

    if (!playerDiariesRef.empty) {
      const commentingPlayerReviews = playerDiariesRef.docs.map(async (doc) => {
        const {
          training: { playerReviews },
        } = coachCreateDiaryTrainingDto;

        const content = playerReviews.find(
          ({ userId }) => userId === doc.data()?.userId,
        )?.trainingReview;

        if (content) {
          return this.coachReviewDiary(currentUserId, doc.id, {
            content,
          });
        }
      });

      await Promise.all(commentingPlayerReviews);
    }

    // send notification
    if (
      rest.training.typeOfTraining === TypeOfTraining.TEAM_TRAINING &&
      originalDiaryRef.empty
    ) {
      const memberIds = await this.teamsService.getAllMemberIds(
        currentUserId,
        rest.teamId,
        null,
        true,
      );

      let receivers = [];

      if (memberIds.length) {
        if (memberIds.length > 20) {
          // send max 20 noti, random members
          receivers = memberIds.sort(() => 0.5 - Math.random()).slice(0, 20);
        } else {
          receivers = memberIds;
        }
      }

      if (receivers.length) {
        const currentUserInfo = await mappingUserInfoById(currentUserId);

        const sendNotification = receivers.map(async (memberId) => {
          const frequencyNotification = await this.getFrequencyNotification(
            memberId,
          );

          if (frequencyNotification <= 3) {
            const userInfo = await mappingUserInfoById(memberId);

            const date = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('D MMM');
            const time = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('HH:mm');

            const payload = new CreateNotificationDto();
            payload.token = userInfo.fcmToken;
            payload.title = `#${currentUserInfo.username} had a Team Training ${date} at ${time}.`;
            payload.username = currentUserInfo.username;
            payload.largeIcon = currentUserInfo.faceImage;
            payload.notificationType =
              NotificationType.COACH_CREATE_DIARY_TRAINING;
            payload.bigPicture =
              (coachCreateDiaryTrainingDto?.training?.trainingMedia?.filter(
                (e) => e.type === MediaType.IMAGE,
              )[0]?.url as string) || currentUserInfo.faceImage;
            payload.senderId = currentUserInfo.userId;
            payload.receiverId = userInfo.userId;
            payload.userType = currentUserInfo.type;

            const diariesRef = await db
              .collection('diaries')
              .doc(newDiary.id)
              .get();

            const diariesData = [];
            diariesData.push(diariesRef);

            const data = await this.mappingDiariesInfo(diariesData);

            payload.others = {
              diaryId: newDiary.id,
              coachDiaryData: JSON.stringify(data[0]),
            };

            await this.notificationsService.sendMulticastNotification(payload);
          }
        });

        Promise.all(sendNotification);
      }
    }

    return { diaryId: newDiary.id, post: newFeed };
  }

  async checkConditionsMatch(validateDateTime: string, currentUserId: string) {
    const countMatch = await db
      .collection('diaries')
      .where('userId', '==', currentUserId)
      .where('match.dateTime', '==', validateDateTime)
      .get();

    if (countMatch.size >= 3) {
      throw new HttpException(
        'Only create maximum 3 match per day',
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
  }

  async checkTotalEventInMatch(events: MatchEventDto[]) {
    const eventsInMatch = [
      'RED_CARD',
      'YELLOW_CARD',
      'GOAL',
      'ASSIST',
      'FREE_KICK',
      'CORNER',
      'PENALTY',
      'THROW_INS',
      'SHOT_ON_GOAL',
      'SHOT_OF_GOAL',
    ];

    let totalEvents: any = {};
    eventsInMatch.map((eventType) => {
      const result = events.filter((e) => e.event === eventType);
      switch (eventType) {
        case Event.RED_CARD:
          totalEvents.totalRedCards = result.length;
          break;
        case Event.YELLOW_CARD:
          totalEvents.totalYellowCards = result.length;
          break;
        case Event.GOAL:
          totalEvents.totalGoals = result.length;
          break;
        case Event.ASSIST:
          totalEvents.totalAssists = result.length;
          break;
        case Event.FREE_KICK:
          totalEvents.totalFreeKicks = result.length;
          break;
        case Event.CORNER:
          totalEvents.totalConners = result.length;
          break;
        case Event.PENALTY:
          totalEvents.totalPenalties = result.length;
          break;
        case Event.ThROW_IN:
          totalEvents.totalThrowIn = result.length;
          break;
        case Event.SHOT_ON_GOAL:
          totalEvents.totalShotOnGoals = result.length;
          break;
        case Event.SHOT_OF_GOAL:
          totalEvents.totalShotOfGoals = result.length;
          break;
        default:
          break;
      }
    });

    return totalEvents;
  }

  async updateMatchPoint(
    match: PlayerMatchDto,
    totalEvents: any,
    currentUserId: string,
    diaryId: string,
    originalDiaryId: string,
    createdTime: number,
  ) {
    let matchPoint = 0;
    if (match.result.yourTeam > match.result.opponents) {
      matchPoint = 30;
    } else if (match.result.yourTeam == match.result.opponents) {
      matchPoint = 0;
    } else {
      matchPoint = -20;
    }
    const totalPoint =
      totalEvents.totalAssists * 10 +
      totalEvents.totalGoals * 20 +
      match.stats[0].minutesPlayed * 0.1 +
      matchPoint +
      totalEvents.totalRedCards * -50 +
      totalEvents.totalYellowCards * -20 +
      match.result.yourTeam * 5 +
      match.result.opponents * -5;

    try {
      const user = await mappingUserInfoById(currentUserId);
      await this.userMatchModel.create({
        userId: currentUserId,
        diaryId,
        originalDiaryId,
        country: match.club?.country,
        favoriteRole: user.favoriteRoles[0],
        totalPointPerMatch: totalPoint,
        dateTime: +moment(match.dateTime).utc().format('x'),
        createdAt: createdTime,
        updatedAt: createdTime,
      });
    } catch (error) {
      throw new InternalServerErrorException(`${error}`);
    }
  }

  async syncDiaryPostToMongoose(typeOfDiary: TypeOfDiary, newDiaryId: string) {
    if (![TypeOfDiary.REST, TypeOfDiary.CAP].includes(typeOfDiary)) {
      return await this.feedService.synchronizePostsToMongoose({
        postId: newDiaryId,
        typeOfPost: TypeOfPost.DIARIES,
      });
    } else return;
  }

  async getAndSaveCommentFromCoach(
    originalDiaryId: string,
    newDiaryId: string,
    currentUserId: string,
  ) {
    const { playerReviews, coachId } =
      await this.diariesBigQueryService.getPlayerReviewsOfCoachDiariesByOriginalId(
        originalDiaryId,
      );

    if (playerReviews.length) {
      const content = playerReviews
        .map((e) => JSON.parse(e))
        .find(({ userId }) => userId === currentUserId)?.matchReview;

      if (content) {
        await this.coachReviewDiary(coachId, newDiaryId, {
          content,
        });
      }
    }
  }

  async playerCreateDiaryMatch(
    playerCreateDiaryMatchDto: PlayerCreateDiaryMatchDto,
    currentUserId: string,
  ): Promise<OutputCreateDiary> {
    const { injuries, createdAt, originalDiaryId, ...rest } =
      playerCreateDiaryMatchDto;
    const validateDateTime = moment(rest.match.dateTime).format('YYYY-MM-DD');
    rest.match.dateTime = validateDateTime;
    await this.checkConditionsMatch(validateDateTime, currentUserId);

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    rest.typeOfDiary = TypeOfDiary.MATCH;

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');

    const originalId = !originalDiaryId
      ? db.collection('original_diaries').doc().id
      : originalDiaryId;

    let totalEvents: any = await this.checkTotalEventInMatch(rest.match.events);

    rest.match.totalEvents = totalEvents;
    rest.match.opponentTeam = rest.match?.opponentTeam || null;

    const diary: ILastMatch = {
      ...rest,
      injuries: [],
      createdAt: createdTime,
      updatedAt: createdTime,
      userId: currentUserId,
      typeOfPost: TypeOfPost.DIARIES,
      originalDiaryId: originalId,
    };
    const diaryForUser: ILastMatch = JSON.parse(JSON.stringify(diary));

    let newDiaryId, originalDiaryRef; //# this variable for transfer data through function
    try {
      const diaryRef = db.collection('diaries').doc();
      //# NOTE: transaction need read all before write.
      const originalDiaryRef1 = await db
        .collection('original_diaries')
        .where('originalDiaryId', '==', originalId)
        .get();

      if (diary.match.opponentTeam) {
        const teamRef = await db
          .collection('teams')
          .doc(diary.match.opponentTeam)
          .get();

        const teamName = teamRef.data().teamName;
        diaryForUser.match.opponentTeam = teamName;
      } else {
        diaryForUser.match.opponentTeam = null;
      }
      //# Create new diary
      const newDiary1 = await diaryRef.set(JSON.parse(JSON.stringify(diary)), {
        merge: true,
      });

      //# transfer data to variable outside of this function
      originalDiaryRef = originalDiaryRef1;
      newDiaryId = diaryRef.id;

      //# Save to original_diaries
      if (originalDiaryRef1.empty) {
        await db.collection('original_diaries').add(
          JSON.parse(
            JSON.stringify({
              createdAt: createdTime,
              updatedAt: createdTime,
              originalDiaryId: originalId,
              diaryId: newDiaryId,
              typeOfDiary: TypeOfDiary.MATCH,
              userId: currentUserId,
            }),
          ),
        );

        //# Save to user: lastMatch
        const yourTeamRef = await db
          .collection('teams')
          .doc(diary.match.yourTeam)
          .get();

        diaryForUser.match.yourTeam = yourTeamRef.data()?.teamName || null;

        await db.collection('users').doc(currentUserId).update({
          lastMatch: diaryForUser,
        });
      }
    } catch (error) {
      console.log(error);

      throw new BadRequestException('Error happens when create a diary!');
    }

    if (injuries) {
      await this.createInjury(newDiaryId, injuries, currentUserId);
    }

    const [injury, newFeed] = await Promise.all([
      this.getListInjuries(newDiaryId),
      this.syncDiaryPostToMongoose(rest.typeOfDiary, newDiaryId),
      this.updateRemindUpdateDiaryPost(currentUserId),
      this.getAndSaveCommentFromCoach(originalId, newDiaryId, currentUserId),
      this.updateMatchPoint(
        rest.match,
        totalEvents,
        currentUserId,
        newDiaryId,
        originalDiaryId,
        createdTime,
      ),
    ]);

    // send notification
    if (originalDiaryRef.empty) {
      // Send notification when the original diary is created
      const memberIds = await this.teamsService.getMemberIdsFromTeams(
        currentUserId,
      );

      if (memberIds.length) {
        const currentUserInfo = await mappingUserInfoById(currentUserId);

        const sendNotification = memberIds.map(async (memberId) => {
          const frequencyNotification = await this.getFrequencyNotification(
            memberId,
          );

          if (frequencyNotification <= 3) {
            const [userInfo, diariesRef] = await Promise.all([
              mappingUserInfoById(memberId),
              db.collection('diaries').doc(newDiaryId).get(),
            ]);

            const date = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('D MMM');
            const time = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('HH:mm');

            const payload = new CreateNotificationDto();
            payload.token = userInfo.fcmToken as string[];
            payload.title = `#${currentUserInfo.username} had a Match update ${date} at ${time}.`;
            payload.username = currentUserInfo.username as string;
            payload.largeIcon = currentUserInfo.faceImage;
            payload.notificationType = NotificationType.MATCH;
            payload.bigPicture =
              (playerCreateDiaryMatchDto?.match?.matchMedia?.filter(
                (e) => e.type === MediaType.IMAGE,
              )[0]?.url as string) || currentUserInfo.faceImage;
            payload.senderId = currentUserInfo.userId as string;
            payload.receiverId = userInfo.userId as string;
            payload.userType = currentUserInfo.type as UserTypes;

            const diariesData = [];
            diariesData.push(diariesRef);

            const data = await this.mappingDiariesInfo(diariesData);

            payload.others = {
              diaryId: newDiaryId,
              playerDiaryData: JSON.stringify(data[0]),
              originalDiaryId: originalId,
            };

            await this.notificationsService.sendMulticastNotification(payload);
          }
        });

        Promise.all(sendNotification);
      }
    }

    return { diaryId: newDiaryId, post: newFeed, injuries: injury };
  }

  async calculateTeamPerformace(playerReviews: PlayerReviews[]) {
    let teamPerformance: TeamPerformance;
    const teamPerformancePoint: number =
      playerReviews.reduce((total, currentValue) => {
        return total + Number(currentValue.performance);
      }, 0) / playerReviews.length || 0;

    if (teamPerformancePoint > 0 && teamPerformancePoint <= 1.5) {
      teamPerformance = TeamPerformance.VERY_BAD;
    } else if (teamPerformancePoint > 1.5 && teamPerformancePoint <= 2.5) {
      teamPerformance = TeamPerformance.BAD;
    } else if (teamPerformancePoint > 2.5 && teamPerformancePoint <= 3.5) {
      teamPerformance = TeamPerformance.NORMAL;
    } else if (teamPerformancePoint > 3.5 && teamPerformancePoint <= 4.5) {
      teamPerformance = TeamPerformance.GOOD;
    } else {
      teamPerformance = TeamPerformance.VERY_GOOD;
    }

    return teamPerformance;
  }

  async coachCreateDiaryMatch(
    coachCreateDiaryMatchDto: CoachCreateDiaryMatchDto,
    currentUserId: string,
  ) {
    const { createdAt, originalDiaryId, ...rest } = coachCreateDiaryMatchDto;
    const validateDateTime = moment(rest.match.dateTime).format('YYYY-MM-DD');
    rest.match.dateTime = validateDateTime;

    await this.checkConditionsMatch(rest.match.dateTime, currentUserId);

    let teamPerformance: TeamPerformance = await this.calculateTeamPerformace(
      rest.match.playerReviews,
    );

    rest.match.teamPerformance = teamPerformance;
    rest.match.opponentTeam = rest.match?.opponentTeam || null;

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    rest.typeOfDiary = TypeOfDiary.MATCH;

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');

    const originalId = !originalDiaryId
      ? db.collection('original_diaries').doc().id
      : originalDiaryId;

    const diary: ILastMatch = JSON.parse(
      JSON.stringify({
        ...rest,
        createdAt: createdTime,
        updatedAt: createdTime,
        userId: currentUserId,
        typeOfPost: TypeOfPost.DIARIES,
        originalDiaryId: originalId,
      }),
    );

    const [newDiary, originalDiaryRef, yourTeam] = await Promise.all([
      db.collection('diaries').add(diary),
      db
        .collection('original_diaries')
        .where('originalDiaryId', '==', originalId)
        .get(),
      db.collection('teams').doc(diary.match.yourTeam).get(),
    ]);

    //# NOTE: save lastMatch to user
    const diaryForUser = JSON.parse(JSON.stringify(diary));
    let opponentTeam;

    if (diaryForUser.match.opponentTeam) {
      opponentTeam = await db
        .collection('teams')
        .doc(`${diary.match.opponentTeam}`)
        .get();
      diaryForUser.match.opponentTeam = opponentTeam?.data()?.teamName || null;
    }
    diaryForUser.match.yourTeam = yourTeam.data()?.teamName || null;

    await db.collection('users').doc(currentUserId).update({
      lastMatch: diaryForUser,
    });

    //# Create connection original_diaries
    if (originalDiaryRef.empty) {
      await db.collection('original_diaries').add({
        createdAt: createdTime,
        updatedAt: createdTime,
        originalDiaryId: originalId,
        diaryId: newDiary.id,
        typeOfDiary: TypeOfDiary.MATCH,
        userId: currentUserId,
      });
    }

    await this.updateRemindUpdateDiaryPost(currentUserId);

    let newFeed: Object;
    // caching
    if (![TypeOfDiary.REST, TypeOfDiary.CAP].includes(rest.typeOfDiary)) {
      newFeed = await this.feedService.synchronizePostsToMongoose({
        postId: newDiary.id,
        typeOfPost: TypeOfPost.DIARIES,
      });
    }

    // comment on player diary match with the same original diary id
    const playerDiariesRef = await db
      .collection('diaries')
      .where('originalDiaryId', '==', originalId)
      .where('typeOfDiary', '==', TypeOfDiary.MATCH)
      .where('userId', '!=', currentUserId)
      .get();

    if (!playerDiariesRef.empty) {
      const commentingPlayerReviews = playerDiariesRef.docs.map(async (doc) => {
        const {
          match: { playerReviews },
        } = coachCreateDiaryMatchDto;

        const content = playerReviews.find(
          ({ userId }) => userId === doc.data()?.userId,
        )?.matchReview;

        if (content) {
          return this.coachReviewDiary(currentUserId, doc.id, {
            content,
          });
        }
      });

      await Promise.all(commentingPlayerReviews);
    }

    if (rest.match.playerReviews.length) {
      rest.match.playerReviews.forEach(async (player) => {
        await this.userMatchModel.create({
          userId: player.userId,
          diaryId: newDiary.id,
          originalDiaryId: originalId,
          country: rest.match.club?.country,
          favoriteRole: player.role || '',
          totalPointPerMatch: player.performance * 2,
          dateTime: +moment(rest.match.dateTime).utc().format('x'),
          createdAt: createdTime,
          updatedAt: createdTime,
        });
      });
    }

    // send notification
    if (originalDiaryRef.empty) {
      // Send notification when the original diary is created
      const memberIds = await this.teamsService.getAllMemberIds(
        currentUserId,
        rest.teamId,
        null,
        true,
      );

      if (memberIds.length) {
        const currentUserRef = await mappingUserInfoById(currentUserId);

        const sendNotification = memberIds.map(async (memberId) => {
          const frequencyNotification = await this.getFrequencyNotification(
            memberId,
          );

          if (frequencyNotification <= 3) {
            const userInfo = await mappingUserInfoById(memberId);

            const date = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('D MMM');
            const time = momentTz(createdTime)
              .tz(userInfo.timezone)
              .format('HH:mm');

            const payload = new CreateNotificationDto();
            payload.token = userInfo.fcmToken;
            payload.title = `#${currentUserRef.username} had a Match update ${date} at ${time}.`;
            payload.username = currentUserRef.username;
            payload.largeIcon = currentUserRef.faceImage;
            payload.notificationType =
              NotificationType.COACH_CREATE_DIARY_MATCH;
            payload.content = currentUserRef.firstName;
            payload.bigPicture =
              (coachCreateDiaryMatchDto?.match?.matchMedia?.filter(
                (e) => e.type === MediaType.IMAGE,
              )[0]?.url as string) || currentUserRef.faceImage;
            payload.senderId = currentUserRef.userId;
            payload.receiverId = userInfo.userId;
            payload.userType = currentUserRef.type;

            const diariesRef = await db
              .collection('diaries')
              .doc(newDiary.id)
              .get();

            const diariesData = [];
            diariesData.push(diariesRef);

            const data = await this.mappingDiariesInfo(diariesData);

            payload.others = {
              teamId: rest.teamId,
              diaryId: newDiary.id,
              coachDiaryData: JSON.stringify(data[0]),
              originalDiaryId: originalId,
            };

            await this.notificationsService.sendMulticastNotification(payload);
          }
        });

        Promise.all(sendNotification);
      }
    }

    return { diaryId: newDiary.id, post: newFeed };
  }

  async createPlayerDiaryCap(
    currentUserId: string,
    createPlayerDiaryCapDto: CreatePlayerDiaryCapDto,
  ) {
    const { injuries, createdAt, ...rest } = createPlayerDiaryCapDto;

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    rest.typeOfDiary = TypeOfDiary.CAP;

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');

    const diary = await db.collection('diaries').add(
      JSON.parse(
        JSON.stringify({
          ...rest,
          injuries: [],
          createdAt: createdTime,
          updatedAt: createdTime,
          userType: UserTypes.PLAYER,
          userId: currentUserId,
          typeOfPost: TypeOfPost.DIARIES,
        }),
      ),
    );

    if (injuries) {
      await this.createInjury(diary.id, injuries, currentUserId);
    }

    const injury = await this.getListInjuries(diary.id);

    return { diaryId: diary.id, injuries: injury };
  }

  async createCoachDiaryCap(
    currentUserId: string,
    createCoachDiaryCapDto: CreateCoachDiaryCapDto,
  ) {
    const { createdAt, ...rest } = createCoachDiaryCapDto;

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    rest.typeOfDiary = TypeOfDiary.CAP;

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');

    const data: FirebaseFirestore.DocumentData = JSON.parse(
      JSON.stringify({
        ...rest,
        createdAt: createdTime,
        updatedAt: createdTime,
        userType: UserTypes.COACH,
        userId: currentUserId,
        typeOfPost: TypeOfPost.DIARIES,
      }),
    );
    const diary = await db.collection('diaries').add(data);

    return { diaryId: diary.id };
  }

  async playerUpdateDiaryTraining(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    playerUpdateDiaryTrainingDto: PlayerUpdateDiaryTrainingDto,
    currentUserId: string,
    timezone?: string,
  ): Promise<InjuryDto[]> {
    const { diaryId, injuryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { injuries, createdAt, ...rest } = playerUpdateDiaryTrainingDto;

    const diariesRef = await db.collection('diaries').doc(diaryId).get();
    if (!diariesRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db
      .collection('diaries')
      .doc(diaryId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...rest,
            createdAt: +momentTz(createdAt).tz(timezone).format('x'),
            updatedAt: +moment.utc().format('x'),
          }),
        ),
        { merge: true },
      );

    if (injuries && injuryId) {
      updateDiaryQueryDto.diaryId = diaryId;
      updateDiaryQueryDto.injuryId = injuryId;

      await this.updateInjury(updateDiaryQueryDto, injuries);
    }

    if (injuries && !injuryId) {
      await this.createInjury(diaryId, injuries, currentUserId);
    }

    if (playerUpdateDiaryTrainingDto?.training?.practiceTags?.length) {
      this.createPracticeTags(
        playerUpdateDiaryTrainingDto.training.practiceTags,
      );
    }
    const injury = await this.getListInjuries(diaryId);

    await this.updateRemindUpdateDiaryPost(currentUserId);

    this.feedService.synchronizePostsToMongoose({
      postId: diaryId,
      typeOfPost: TypeOfPost.DIARIES,
    });

    return injury;
  }

  async coachUpdateDiaryTraining(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    coachUpdateDiaryTrainingDto: CoachUpdateDiaryTrainingDto,
    currentUserId: string,
    timezone?: string,
  ) {
    const { diaryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, ...rest } = coachUpdateDiaryTrainingDto;

    const diaryRef = await db.collection('diaries').doc(diaryId).get();

    if (!diaryRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db
      .collection('diaries')
      .doc(diaryId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...rest,
            ...(createdAt && {
              createdAt: +momentTz(createdAt).tz(timezone).format('x'),
            }),
            updatedAt: +moment.utc().format('x'),
          }),
        ),
        { merge: true },
      );

    if (coachUpdateDiaryTrainingDto?.training?.practiceTags?.length) {
      this.createPracticeTags(
        coachUpdateDiaryTrainingDto.training.practiceTags,
      );
    }

    await this.updateRemindUpdateDiaryPost(currentUserId);

    return this.feedService.synchronizePostsToMongoose({
      postId: diaryId,
      typeOfPost: TypeOfPost.DIARIES,
    });
  }

  async playerUpdateDiaryMatch(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    playerUpdateDiaryMatchDto: PlayerUpdateDiaryMatchDto,
    currentUserId: string,
    timezone?: string,
  ): Promise<InjuryDto[]> {
    const { diaryId, injuryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { injuries, createdAt, ...rest } = playerUpdateDiaryMatchDto;
    const validateDateTime = moment(rest.match.dateTime).format('YYYY-MM-DD');
    rest.match.dateTime = validateDateTime;

    const diariesRef = await db.collection('diaries').doc(diaryId).get();
    if (!diariesRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const eventsInMatch = [
      'RED_CARD',
      'YELLOW_CARD',
      'GOAL',
      'ASSIST',
      'FREE_KICK',
      'CORNER',
      'PENALTY',
      'THROW_INS',
      'SHOT_ON_GOAL',
      'SHOT_OF_GOAL',
    ];

    let totalEvents: any = {};

    eventsInMatch.map((eventType) => {
      const result = rest.match.events.filter((e) => e.event === eventType);

      switch (eventType) {
        case Event.RED_CARD:
          totalEvents.totalRedCards = result.length;
          break;
        case Event.YELLOW_CARD:
          totalEvents.totalYellowCards = result.length;
          break;
        case Event.GOAL:
          totalEvents.totalGoals = result.length;
          break;
        case Event.ASSIST:
          totalEvents.totalAssists = result.length;
          break;
        case Event.FREE_KICK:
          totalEvents.totalFreeKicks = result.length;
          break;
        case Event.CORNER:
          totalEvents.totalConners = result.length;
          break;
        case Event.PENALTY:
          totalEvents.totalPenalties = result.length;
          break;
        case Event.ThROW_IN:
          totalEvents.totalThrowIn = result.length;
          break;
        case Event.SHOT_ON_GOAL:
          totalEvents.totalShotOnGoals = result.length;
          break;
        case Event.SHOT_OF_GOAL:
          totalEvents.totalShotOfGoals = result.length;
          break;
        default:
          break;
      }
    });

    rest.match.totalEvents = totalEvents;

    await db
      .collection('diaries')
      .doc(diaryId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...rest,
            ...(createdAt && {
              createdAt: +momentTz(createdAt).tz(timezone).format('x'),
            }),
            updatedAt: +moment.utc().format('x'),
          }),
        ),
        { merge: true },
      );
    let matchPoint = 0;
    if (rest.match.result.yourTeam > rest.match.result.opponents) {
      matchPoint = 30;
    } else if (rest.match.result.yourTeam == rest.match.result.opponents) {
      matchPoint = 0;
    } else {
      matchPoint = -20;
    }
    const totalPoint =
      totalEvents.totalAssists * 10 +
      totalEvents.totalGoals * 20 +
      rest.match.stats[0].minutesPlayed * 0.1 +
      matchPoint +
      totalEvents.totalRedCards * -50 +
      totalEvents.totalYellowCards * -20 +
      rest.match.result.yourTeam * 5 +
      rest.match.result.opponents * -5;
    try {
      await this.userMatchModel.findOneAndUpdate(
        {
          diaryId: diaryId,
          userId: currentUserId,
          createdAt: diariesRef.data()?.createdAt,
        },
        {
          country: rest.match.club?.country,
          totalPointPerMatch: totalPoint,
          dateTime: +moment(rest.match.dateTime).utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(`${error}`);
    }
    if (injuries && injuryId) {
      updateDiaryQueryDto.diaryId = diaryId;
      updateDiaryQueryDto.injuryId = injuryId;

      await this.updateInjury(updateDiaryQueryDto, injuries);
    }
    if (injuries && !injuryId) {
      await this.createInjury(diaryId, injuries, currentUserId);
    }

    const injury = await this.getListInjuries(diaryId);

    await this.updateRemindUpdateDiaryPost(currentUserId);

    this.feedService.synchronizePostsToMongoose({
      postId: diaryId,
      typeOfPost: TypeOfPost.DIARIES,
    });

    return injury;
  }

  async coachUpdateDiaryMatch(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    coachUpdateDiaryMatchDto: CoachUpdateDiaryMatchDto,
    currentUserId: string,
    timezone?: string,
  ) {
    const { diaryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, ...rest } = coachUpdateDiaryMatchDto;
    const validateDateTime = moment(rest.match.dateTime).format('YYYY-MM-DD');
    rest.match.dateTime = validateDateTime;

    let teamPerformance: TeamPerformance;
    const teamPerformanceNumber: number =
      rest.match.playerReviews.reduce((total, currentValue) => {
        return total + Number(currentValue.performance);
      }, 0) / rest.match.playerReviews.length || 0;

    if (teamPerformanceNumber > 0 && teamPerformanceNumber <= 1) {
      teamPerformance = TeamPerformance.VERY_BAD;
    } else if (teamPerformanceNumber > 1 && teamPerformanceNumber <= 2) {
      teamPerformance = TeamPerformance.BAD;
    } else if (teamPerformanceNumber > 2 && teamPerformanceNumber <= 3) {
      teamPerformance = TeamPerformance.NORMAL;
    } else if (teamPerformanceNumber > 3 && teamPerformanceNumber <= 4) {
      teamPerformance = TeamPerformance.GOOD;
    } else {
      teamPerformance = TeamPerformance.VERY_GOOD;
    }

    rest.match.teamPerformance = teamPerformance;

    const diaryRef = await db.collection('diaries').doc(diaryId).get();

    if (!diaryRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db
      .collection('diaries')
      .doc(diaryId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...rest,
            ...(createdAt && {
              createdAt: +momentTz(createdAt).tz(timezone).format('x'),
            }),
            updatedAt: +moment.utc().format('x'),
          }),
        ),
        { merge: true },
      );

    await this.updateRemindUpdateDiaryPost(currentUserId);

    if (rest.match.playerReviews.length) {
      rest.match.playerReviews.forEach(async (player) => {
        await this.userMatchModel.findOneAndUpdate(
          {
            diaryId: diaryId,
            userId: player.userId,
          },
          {
            totalPointPerMatch: player.performance * 2,
          },
        );
      });
    }

    this.feedService.synchronizePostsToMongoose({
      postId: diaryId,
      typeOfPost: TypeOfPost.DIARIES,
    });

    return ResponseMessage.Diary.CREATE_DIARY;
  }

  async updatePlayerDiaryCap(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    updatePlayerDiaryCapDto: UpdatePlayerDiaryCapDto,
    currentUserId: string,
    timezone?: string,
  ) {
    const { diaryId, injuryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { injuries, createdAt, ...rest } = updatePlayerDiaryCapDto;

    const diariesRef = await db.collection('diaries').doc(diaryId).get();

    if (!diariesRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db
      .collection('diaries')
      .doc(diaryId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...rest,
            ...(createdAt && {
              createdAt: +momentTz(createdAt).tz(timezone).format('x'),
            }),
            updatedAt: +moment.utc().format('x'),
          }),
        ),
        { merge: true },
      );

    if (injuries && injuryId) {
      updateDiaryQueryDto.diaryId = diaryId;
      updateDiaryQueryDto.injuryId = injuryId;

      await this.updateInjury(updateDiaryQueryDto, injuries);
    }
    if (injuries && !injuryId) {
      await this.createInjury(diaryId, injuries, currentUserId);
    }

    const injury = await this.getListInjuries(diaryId);
    return injury;
  }

  async updateCoachDiaryCap(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    updateCoachDiaryCapDto: UpdateCoachDiaryCapDto,
    currentUserId: string,
    timezone?: string,
  ) {
    const { diaryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, ...rest } = updateCoachDiaryCapDto;

    const diariesRef = await db.collection('diaries').doc(diaryId).get();

    if (!diariesRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db
      .collection('diaries')
      .doc(diaryId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...rest,
            ...(createdAt && {
              createdAt: +momentTz(createdAt).tz(timezone).format('x'),
            }),
            updatedAt: +moment.utc().format('x'),
          }),
        ),
        { merge: true },
      );
    return { diaryId };
  }

  async createInjury(
    diaryId: string,
    createInjuryDto: CreateInjuryDto,
    currentUserId: string,
  ): Promise<InjuryDto> {
    const { createdAt } = createInjuryDto;

    if (createdAt && createdAt.length !== 25) {
      throw new HttpException(`Wrong format createdAt`, HttpStatus.BAD_REQUEST);
    }

    const checkExist = await db.collection('diaries').doc(diaryId).get();
    if (!checkExist.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const createdTime = createdAt
      ? +moment.utc(createdAt).format('x')
      : +moment.utc().format('x');

    await db
      .collection('diaries')
      .doc(diaryId)
      .collection('injuries')
      .add(
        JSON.parse(
          JSON.stringify({
            ...createInjuryDto,
            createdAt: createdTime,
            updatedAt: createdTime,
            userId: currentUserId,
            typeOfPost: TypeOfPost.DIARIES,
          }),
        ),
      );

    if (createInjuryDto?.injuryTags?.length) {
      await this.createInjuryTags(createInjuryDto.injuryTags);
    }
    return createInjuryDto;
  }

  async updateInjury(
    updateDiaryQueryDto: UpdateDiaryQueryDto,
    updateInjuryDto: UpdateInjuryDto,
    timezone?: string,
  ): Promise<string> {
    const { diaryId, injuryId } = updateDiaryQueryDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, ...rest } = updateInjuryDto;
    const injuryRef = db
      .collection('diaries')
      .doc(diaryId)
      .collection('injuries')
      .doc(injuryId);

    const querySnapshot = await injuryRef.get();
    if (!querySnapshot.data()) {
      throw new HttpException(
        ResponseMessage.Diary.INJURY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await injuryRef.set(
      JSON.parse(
        JSON.stringify({
          ...rest,
          ...(createdAt && {
            createdAt: +momentTz(createdAt).tz(timezone).format('x'),
          }),
          updatedAt: +moment.utc().format('x'),
        }),
      ),
      { merge: true },
    );

    return ResponseMessage.Diary.UPDATE_INJURY;
  }

  async getAveragePainChartColumn(
    baseQueryBuilder: BaseQueryBuilder,
  ): Promise<OutputAveragePainColumnChart> {
    const { lastDateRange } = baseQueryBuilder;
    const data = [];
    let injuryRef = db.collectionGroup('injuries').orderBy('createdAt', 'desc');

    if (+lastDateRange) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');
      const toDate = +moment.utc().format('x');

      injuryRef = injuryRef
        .where('createdAt', '>=', fromDate)
        .where('createdAt', '<=', toDate);
    }

    const querySnapshot = await injuryRef.get();
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });

    const [frontInjuryArea] = [InjuryArea].map((doc) =>
      Object.values(doc)
        .filter((area) => area.slice(0, 1) === 'F')
        .map((area) => area.slice(0, 2).concat(area.slice(4, area.length))),
    );

    const [backInjuryArea] = [InjuryArea].map((doc) =>
      Object.values(doc)
        .filter((area) => area.slice(0, 1) === 'B')
        .map((area) => area.slice(0, 2).concat(area.slice(4, area.length))),
    );

    const front = [...new Set(frontInjuryArea)];
    const back = [...new Set(backInjuryArea)];

    const filterByInjuryArea = data.reduce(function (r, a) {
      r[
        a.injuryArea
          .slice(0, 2)
          .concat(a.injuryArea.slice(4, a.injuryArea.length))
      ] =
        r[
        a.injuryArea
          .slice(0, 2)
          .concat(a.injuryArea.slice(4, a.injuryArea.length))
        ] || [];
      r[
        a.injuryArea
          .slice(0, 2)
          .concat(a.injuryArea.slice(4, a.injuryArea.length))
      ].push(a);
      return r;
    }, Object.create(null));

    const injuryAreaF = calculatePercentPainChartColumn(
      front,
      filterByInjuryArea,
    );

    const injuryAreaB = calculatePercentPainChartColumn(
      back,
      filterByInjuryArea,
    );

    return { injuryAreaF, injuryAreaB };
  }

  async deleteDiary(diaryId: string): Promise<string> {
    const diaryRef = await db.collection('diaries').doc(diaryId).get();
    if (!diaryRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    const { userId } = diaryRef.data();
    await db.collection('diaries').doc(diaryId).delete();
    await this.userMatchModel.findOneAndDelete({
      diaryId: diaryId,
    });

    const injuriesPath = `diaries/${diaryId}/injuries/`;
    deleteCollection(db, injuriesPath, 50);

    const postQueryDto = new PostQueryDto();
    postQueryDto.postId = diaryId;
    postQueryDto.typeOfPost = TypeOfPost.DIARIES;

    await Promise.all([
      this.feedService.deleteLikeAndCommentCol(postQueryDto),
      this.feedService.deletePost(diaryId),
      this.updateRemindUpdateDiaryPost(userId),
    ]);

    return ResponseMessage.Diary.DELETE_DIARY;
  }

  async deleteInjury(
    deleteDiaryQueryDto: DeleteDiaryQueryDto,
  ): Promise<string> {
    const { diaryId, injuryId } = deleteDiaryQueryDto;
    const injuryRef = await db
      .collection('diaries')
      .doc(diaryId)
      .collection('injuries')
      .doc(injuryId)
      .get();

    if (!injuryRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.INJURY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db
      .collection('diaries')
      .doc(diaryId)
      .collection('injuries')
      .doc(injuryId)
      .delete();

    return ResponseMessage.Diary.DELETE_INJURY;
  }

  async createPracticeTags(practiceTags: string[]) {
    const createTagDto: CreateTagDto = {
      names: practiceTags,
      type: TagsTypes.Practice,
    };

    return this.tagService.saveTags(createTagDto);
  }

  async createInjuryTags(injuryTags: string[]) {
    const createTagDto: CreateTagDto = {
      names: injuryTags,
      type: TagsTypes.Injury,
    };

    return this.tagService.saveTags(createTagDto);
  }

  async createDreamTeam() {
    const data =
      (await this.diariesBigQueryService.createDreamTeam()) as OutputDreamTeam[];

    if (data.length < 100) {
      return;
    }

    const from = moment().subtract(7, 'day').format('YYYY-MM-DD');
    const to = moment().subtract(2, 'day').format('YYYY-MM-DD');

    const timeRange = `${from.split('-')[2]}-${to.split('-')[2]}th of ${moment(
      from,
    ).format('MMM')} ${moment(from).format('YYYY')}`;

    await Promise.all(
      data.map(async ({ userIds, country, age, gender }) => {
        const mappingUserInfo = (userIds as string[]).map(async (userId) => {
          const { favoriteRoles, birthCountry, clubId } =
            await mappingUserInfoById(userId);

          const role = favoriteRoles[0] as Role;

          const [{ matchInTotalStatistic }, ztarOfTheMatchPoint] =
            await Promise.all([
              await this.dashboardService.getMatchStats(
                {
                  lastDateRange: LastDateRange.ALL,
                  fromDate: from,
                  toDate: to,
                },
                userId,
              ),
              await this.calculateOwnZtarOfTheMatch(
                userId,
                +moment(from).format('x'),
                +moment(to).format('x'),
              ),
            ]);

          const value =
            calculateZtarOfTheMatch(matchInTotalStatistic) +
            ztarOfTheMatchPoint;

          return { userId, value, role, birthCountry, clubId };
        });

        const data = await Promise.all(mappingUserInfo);

        const defenders = [];
        const midfielders = [];
        const forwards = [];
        const goalKeepers = [];

        data.forEach((e) => {
          const { role } = e;
          if (ROLE_BY_GROUP(Role.DEFENDERS).includes(role)) {
            defenders.push(e);
          } else if (ROLE_BY_GROUP(Role.MIDFIELDERS).includes(role)) {
            midfielders.push(e);
          } else if (ROLE_BY_GROUP(Role.FORWARDS).includes(role)) {
            forwards.push(e);
          } else if (role === Role.GK) {
            goalKeepers.push(e);
          }
        });

        const highestDefenders = defenders
          .sort((a, b) => a.value - b.value)
          .slice(-4);
        const highestMidfielders = midfielders
          .sort((a, b) => a.value - b.value)
          .slice(-3);
        const highestForwards = forwards
          .sort((a, b) => a.value - b.value)
          .slice(-3);
        const highestGoalKeepers = goalKeepers
          .sort((a, b) => a.value - b.value)
          .slice(-1);

        const result = [
          ...highestDefenders,
          ...highestMidfielders,
          ...highestForwards,
          ...highestGoalKeepers,
        ];

        const dreamTeamSize = 11;
        if (result.length === dreamTeamSize) {
          const userIds = result.map(
            ({ userId, value, role, birthCountry, clubId }) => {
              const playerCreateAwardDto: PlayerCreateAwardDto = {
                achievementType: AchievementType.award,
                awardType: ZPlayerAwardType.DT,
                name: 'D.T - Dream Team',
                country: {
                  alpha2Code: birthCountry.alpha2Code,
                  alpha3Code: birthCountry.alpha3Code,
                  name: birthCountry.name,
                } as CountryDto,
                connectedClub: {
                  connectedClubType: ConnectedClubType.Historic,
                  clubId,
                } as ConnectedClubDto,
                date: moment().toISOString(),
                description: 'Dream team was created from cronjob',
                media: [],
              };
              this.achievementsService.playerCreateAward(
                userId,
                playerCreateAwardDto,
              );

              return {
                userId,
                value,
                role,
              };
            },
          );
          await Promise.all(userIds);

          const newDreamTeam = db.collection('dream_teams').add({
            userIds,
            country,
            age,
            gender,
            timeRange,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
          });

          const sendNotification = Promise.all(
            result.map(async ({ userId }) => {
              const { fcmToken } = await mappingUserInfoById(userId);

              const payload = new CreateNotificationDto();
              payload.token = fcmToken;
              payload.title = 'Zporter';
              payload.senderId = '';
              payload.receiverId = userId;
              payload.userType = UserTypes.SYS_ADMIN;
              payload.largeIcon = process.env.ZPORTER_IMAGE;
              payload.notificationType = NotificationType.DREAM_TEAM;

              await this.notificationsService.sendMulticastNotification(
                payload,
              );
            }),
          );

          return Promise.all([newDreamTeam, sendNotification]);
        }
      }),
    );
  }

  async createDreamTeamV2() {
    const data =
      (await this.diariesBigQueryService.createDreamTeamV2()) as OutputDreamTeam[];

    const from = moment().subtract(8, 'day').format('YYYY-MM-DD');
    const to = moment().subtract(2, 'day').format('YYYY-MM-DD');

    const timeRange = `${from.split('-')[2]}-${to.split('-')[2]}th of ${moment(
      from,
    ).format('MMM')} ${moment(from).format('YYYY')}`;

    await Promise.all(
      data.map(async ({ userIds, country }) => {
        const mappingUserInfo = (userIds as string[]).map(async (userId) => {
          const {
            favoriteRoles,
            birthCountry,
            clubId,
            type,
            username,
            firstName,
            lastName,
          } = await mappingUserInfoById(userId);

          const bioGetUrl: GetBioUrl = {
            type: type,
            username: username,
            firstName: firstName,
            lastName: lastName,
          };
          const bioUrl = getBioUrl(bioGetUrl);

          const role = favoriteRoles[0] as Role;

          const [{ matchInTotalStatistic }, ztarOfTheMatchPoint] =
            await Promise.all([
              this.dashboardService.getMatchStats(
                {
                  lastDateRange: LastDateRange.ALL,
                  fromDate: from,
                  toDate: to,
                },
                userId,
              ),
              this.calculateOwnZtarOfTheMatch(
                userId,
                +moment(from).format('x'),
                +moment(to).format('x'),
              ),
            ]);
          const value =
            calculateZtarOfTheMatch(matchInTotalStatistic) +
            ztarOfTheMatchPoint;

          return { userId, value, role, bioUrl, birthCountry, clubId };
        });
        const data = await Promise.all(mappingUserInfo);

        const defenders = [];
        const midfielders = [];
        const forwards = [];
        const goalKeepers = [];

        data.forEach((e) => {
          const { role } = e;
          if (ROLE_BY_GROUP(Role.DEFENDERS).includes(role)) {
            defenders.push(e);
          } else if (ROLE_BY_GROUP(Role.MIDFIELDERS).includes(role)) {
            midfielders.push(e);
          } else if (ROLE_BY_GROUP(Role.FORWARDS).includes(role)) {
            forwards.push(e);
          } else if (role === Role.GK) {
            goalKeepers.push(e);
          }
        });

        const highestDefenders = defenders
          .sort((a, b) => a.value - b.value)
          .slice(-4);
        const highestMidfielders = midfielders
          .sort((a, b) => a.value - b.value)
          .slice(-3);
        const highestForwards = forwards
          .sort((a, b) => a.value - b.value)
          .slice(-3);
        const highestGoalKeepers = goalKeepers
          .sort((a, b) => a.value - b.value)
          .slice(-1);

        const result = [
          ...highestDefenders,
          ...highestMidfielders,
          ...highestForwards,
          ...highestGoalKeepers,
        ];

        if (result.length > 0) {
          const userIds = result.map(
            ({ userId, value, role, bioUrl, birthCountry, clubId }) => {
              const playerCreateAwardDto: PlayerCreateAwardDto = {
                achievementType: AchievementType.award,
                awardType: ZPlayerAwardType.DT,
                name: 'D.T - Dream Team',
                country: {
                  alpha2Code: birthCountry.alpha2Code,
                  alpha3Code: birthCountry.alpha3Code,
                  name: birthCountry.name,
                } as CountryDto,
                connectedClub: {
                  connectedClubType: ConnectedClubType.Historic,
                  clubId,
                } as ConnectedClubDto,
                date: moment().toISOString(),
                description: 'Dream team was created from cronjob',
                media: [],
              };
              this.achievementsService.playerCreateAward(
                userId,
                playerCreateAwardDto,
              );

              return {
                userId,
                bioUrl,
                value,
                role,
              };
            },
          );
          await Promise.all(userIds);

          const newDreamTeam = db.collection('dream_teams').add({
            userIds,
            country,
            timeRange,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
          });

          const sendNotification = Promise.all(
            result.map(async ({ userId }) => {
              const { fcmToken } = await mappingUserInfoById(userId);

              const payload = new CreateNotificationDto();
              payload.token = fcmToken;
              payload.title = 'Zporter';
              payload.senderId = '';
              payload.receiverId = userId;
              payload.userType = UserTypes.SYS_ADMIN;
              payload.largeIcon = process.env.ZPORTER_IMAGE;
              payload.notificationType = NotificationType.DREAM_TEAM;

              await this.notificationsService.sendMulticastNotification(
                payload,
              );
            }),
          );

          return Promise.all([newDreamTeam, sendNotification]);
        }
      }),
    );
  }

  async createDreamTeamV3() {
    const from = moment().subtract(8, 'day').format('YYYY-MM-DD');
    const to = moment().subtract(2, 'day').format('YYYY-MM-DD');

    const fromUtc = +moment()
      .utc()
      .subtract(8, 'day')
      .startOf('day')
      .format('x');
    const toUtc = +moment().utc().subtract(2, 'day').endOf('day').format('x');

    const timeRange = `${from.split('-')[2]}-${to.split('-')[2]}th of ${moment(
      from,
    ).format('MMM')} ${moment(from).format('YYYY')}`;

    const [defendersRef, midfieldersRef, forwardsRef, goalKeepersRef] =
      await Promise.all([
        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['CB', 'RB', 'LB'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: {
                userId: '$userId',
                country: '$country',
                favoriteRole: '$favoriteRole',
              },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },
          {
            $limit: 4,
          },

          {
            $group: {
              _id: '$_id.country',
              data: {
                $push: {
                  userId: '$_id.userId',
                  country: '$_id.country',
                  favoriteRole: '$_id.favoriteRole',
                  totalPoint: '$totalPoint',
                },
              },
            },
          },
        ]),

        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['CDM', 'CM', 'CAM', 'RM', 'LM'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: {
                userId: '$userId',
                country: '$country',
                favoriteRole: '$favoriteRole',
              },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },

          {
            $limit: 3,
          },
          {
            $group: {
              _id: '$_id.country',
              data: {
                $push: {
                  userId: '$_id.userId',
                  country: '$_id.country',
                  favoriteRole: '$_id.favoriteRole',
                  totalPoint: '$totalPoint',
                },
              },
            },
          },
        ]),

        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['CF', 'ST', 'RW', 'LW'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: {
                userId: '$userId',
                country: '$country',
                favoriteRole: '$favoriteRole',
              },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },
          {
            $limit: 3,
          },
          {
            $group: {
              _id: '$_id.country',
              data: {
                $push: {
                  userId: '$_id.userId',
                  country: '$_id.country',
                  favoriteRole: '$_id.favoriteRole',
                  totalPoint: '$totalPoint',
                },
              },
            },
          },
        ]),

        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['GK'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: {
                userId: '$userId',
                country: '$country',
                favoriteRole: '$favoriteRole',
              },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },
          {
            $limit: 1,
          },
          {
            $group: {
              _id: '$_id.country',
              data: {
                $push: {
                  userId: '$_id.userId',
                  country: '$_id.country',
                  favoriteRole: '$_id.favoriteRole',
                  totalPoint: '$totalPoint',
                },
              },
            },
          },
        ]),
      ]);

    let [defenders, midfielders, forwards, goalKeepers] = await Promise.all([
      defendersRef.map((el) => {
        return {
          country: el._id,
          data: el.data,
        };
      }),

      midfieldersRef.map((el) => {
        return {
          country: el._id,
          data: el.data,
        };
      }),

      forwardsRef.map((el) => {
        return {
          country: el._id,
          data: el.data,
        };
      }),

      goalKeepersRef.map((el) => {
        return {
          country: el._id,
          data: el.data,
        };
      }),
    ]);

    const result = [...defenders, ...midfielders, ...forwards, ...goalKeepers];

    const newResult = [];
    result.forEach((el) => {
      const existing = newResult.filter(function (v, i) {
        return v.country == el.country;
      });

      if (existing.length) {
        const existingIndex = newResult.indexOf(existing[0]);
        newResult[existingIndex].data = newResult[existingIndex].data.concat(
          el.data,
        );
      } else {
        if (typeof el.data == 'string') el.data = el.data;
        newResult.push(el);
      }
    });

    let userIds = [];
    let userEl = [];
    if (newResult.length > 0) {
      userIds = newResult.map(async (el) => {
        userEl = await el.data.map(async (e) => {
          const {
            type,
            username,
            firstName,
            lastName,
            userId,
            birthCountry,
            clubId,
          } = await mappingUserInfoById(e.userId);

          const playerCreateAwardDto: PlayerCreateAwardDto = {
            achievementType: AchievementType.award,
            awardType: ZPlayerAwardType.DT,
            name: 'D.T - Dream Team',
            country: {
              alpha2Code: birthCountry.alpha2Code,
              alpha3Code: birthCountry.alpha3Code,
              name: birthCountry.name,
            } as CountryDto,
            connectedClub: {
              connectedClubType: ConnectedClubType.Historic,
              clubId,
            } as ConnectedClubDto,
            date: moment().toISOString(),
            description: 'Dream team was created from cronjob',
            media: [],
          };

          this.achievementsService.playerCreateAward(
            userId,
            playerCreateAwardDto,
          );

          return {
            userId: e.userId,
            value: e.totalPoint,
            role: e.favoriteRole,
            bioUrl: getBioUrl({
              firstName,
              lastName,
              type,
              username,
            }),
          };
        });

        const usersEl = await Promise.all(userEl);

        const [newDreamTeam, dreamTeamPost] = await Promise.all([
          db.collection('dream_teams').add({
            userIds: usersEl,
            country: el.country,
            timeRange,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
          }),
          db.collection('dream_team_posts').add({
            age: '',
            country: el.country,
            timeRange,
            userId: '',
            data: JSON.stringify(usersEl),
            typeOfPost: TypeOfPost.DREAM_TEAM_POSTS,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
          }),
        ]);

        const sendNotification = el.data.map(async ({ userId }) => {
          const { fcmToken } = await mappingUserInfoById(userId);

          const payload = new CreateNotificationDto();
          payload.token = fcmToken;
          payload.title = 'Zporter';
          payload.senderId = '';
          payload.receiverId = userId;
          payload.userType = UserTypes.SYS_ADMIN;
          payload.largeIcon = process.env.ZPORTER_IMAGE;
          payload.notificationType = NotificationType.DREAM_TEAM;

          await this.notificationsService.sendMulticastNotification(payload);
        });

        this.feedService.synchronizePostsToMongoose({
          postId: dreamTeamPost.id,
          typeOfPost: TypeOfPost.DREAM_TEAM_POSTS,
        });
      });
      await Promise.all(userIds);
    }
  }

  async createDreamTeamV4() {
    const from = moment().subtract(8, 'day').format('YYYY-MM-DD');
    const to = moment().subtract(2, 'day').format('YYYY-MM-DD');

    let postFix = '';

    switch (to.charAt(to.length - 1).toString()) {
      case '1':
        postFix = 'st';
        break;
      case '2':
        postFix = 'nd';
        break;
      case '3':
        postFix = 'rd';
        break;
      default:
        postFix = 'th';
        break;
    }

    const fromUtc = +moment().utc().startOf('w').format('x');
    const toUtc = +moment().utc().endOf('w').format('x');

    const timeRange = `${from.split('-')[2]}-${to.split('-')[2]
      }${postFix} of ${moment(to).format('MMM')} ${moment(to).format('YYYY')}`;

    const [defendersRef, midfieldersRef, forwardsRef, goalKeepersRef] =
      await Promise.all([
        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['CB', 'RB', 'LB'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: { userId: '$userId', favoriteRole: '$favoriteRole' },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },
          // {
          //   $limit: 4
          // },
        ]),

        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['CDM', 'CM', 'CAM', 'RM', 'LM'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: { userId: '$userId', favoriteRole: '$favoriteRole' },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },

          // {
          //   $limit: 3
          // },
        ]),

        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['CF', 'ST', 'RW', 'LW'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: { userId: '$userId', favoriteRole: '$favoriteRole' },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },
          // {
          //   $limit: 3
          // },
        ]),

        this.userMatchModel.aggregate([
          {
            $match: {
              $and: [
                { favoriteRole: { $in: ['GK'] } },
                { dateTime: { $gte: fromUtc } },
                { dateTime: { $lte: toUtc } },
              ],
            },
          },
          {
            $group: {
              _id: { userId: '$userId', favoriteRole: '$favoriteRole' },
              totalPoint: { $sum: '$totalPointPerMatch' },
            },
          },
          { $sort: { totalPoint: -1 } },
          // {
          //   $limit: 1
          // },
        ]),
      ]);

    await this.usersFantazyService.savePointToUser([
      ...defendersRef,
      ...midfieldersRef,
      ...forwardsRef,
      ...goalKeepersRef,
    ]);

    // filter: to get enough for Dream Team
    const result = [
      ...defendersRef.filter((_, idx) => idx < 4),
      ...midfieldersRef.filter((d, idx) => idx < 3),
      ...forwardsRef.filter((d, idx) => idx < 3),
      ...goalKeepersRef.filter((d, idx) => idx < 1),
    ];
    let usersInfo = [];

    if (result.length > 0) {
      const users = result.map(async (el) => {
        const {
          type,
          username,
          firstName,
          lastName,
          userId,
          birthCountry,
          clubId,
          fullName,
          faceImage,
          clubName,
          shirtNumber,
        } = await mappingUserInfoById(el._id.userId);

        const playerCreateAwardDto: PlayerCreateAwardDto = {
          achievementType: AchievementType.award,
          awardType: ZPlayerAwardType.DT,
          name: 'D.T - Dream Team',
          country: birthCountry,
          connectedClub: {
            connectedClubType: ConnectedClubType.Historic,
            clubId,
          } as ConnectedClubDto,
          date: moment().toISOString(),
          description: 'Dream team was created from cronjob',
          media: [],
        };

        this.achievementsService.playerCreateAward(
          userId,
          playerCreateAwardDto,
        );
        usersInfo.push({
          fullName,
          faceImage,
          userId: el._id.userId,
          clubName,
          shirtNumber,
          value: el.totalPoint,
          role: el._id.favoriteRole,
          bioUrl: getBioUrl({
            firstName,
            lastName,
            type,
            username,
          }),
        });
        return {
          userId: el._id.userId,
          value: el.totalPoint,
          role: el._id.favoriteRole,
          bioUrl: getBioUrl({
            firstName,
            lastName,
            type,
            username,
          }),
        };
      });
      const userIds = await Promise.all(users);

      const [newDreamTeam, dreamTeamPost] = await Promise.all([
        db.collection('dream_teams').add({
          userIds,
          country: '',
          timeRange,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        }),
        db.collection('dream_team_posts').add({
          age: '',
          country: '',
          timeRange,
          userId: '',
          data: JSON.stringify(usersInfo),
          typeOfPost: TypeOfPost.DREAM_TEAM_POSTS,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        }),
      ]);

      await this.feedService.synchronizePostsToMongoose({
        postId: dreamTeamPost.id,
        typeOfPost: TypeOfPost.DREAM_TEAM_POSTS,
      });

      const sendNotification = userIds.map(async ({ userId }) => {
        const { fcmToken } = await mappingUserInfoById(userId);

        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.postId = dreamTeamPost.id;
        payload.typeOfPost = TypeOfPost.DREAM_TEAM_POSTS;
        payload.title = 'Zporter';
        payload.senderId = '';
        payload.receiverId = userId;
        payload.userType = UserTypes.SYS_ADMIN;
        payload.largeIcon = process.env.ZPORTER_IMAGE;
        payload.notificationType = NotificationType.DREAM_TEAM;
      });

      const fantazyTeamOfTheLastWeek =
        await this.fantazyService.getFantazyOfTheWeek(fromUtc, toUtc);
      fantazyTeamOfTheLastWeek.forEach(async (doc) => {
        const { fcmToken } = await mappingUserInfoById(doc.userId);

        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.postId = dreamTeamPost.id;
        payload.typeOfPost = TypeOfPost.DREAM_TEAM_POSTS;
        payload.title = 'Zporter';
        payload.senderId = '';
        payload.receiverId = doc.userId;
        payload.userType = UserTypes.SYS_ADMIN;
        payload.largeIcon = process.env.ZPORTER_IMAGE;
        payload.notificationType = NotificationType.FANTAZY_TEAM_GET_RESULT;

        await this.notificationsService.sendMulticastNotification(payload);
      });
    }
  }

  async mappingDreamTeamFeedInfo(doc: any) {
    const { userIds, ...rest } = doc;

    let result = {
      ...rest,
    };

    const usersInfo = await Promise.all(
      userIds.map(async ({ userId, value, role, bioUrl }) => {
        const userInfo = await mappingUserInfoById(userId, null, null, [
          'fullName',
          'clubName',
          'faceImage',
          'userId',
          'shirtNumber',
        ]);

        return { ...userInfo, value, role, bioUrl };
      }),
    );

    result = {
      ...result,
      usersInfo,
    };

    return result;
  }

  async getListDreamTeam(getListDreamTeamQuery: GetListDreamTeamQuery) {
    const data = await this.diariesBigQueryService.getListDreamTeam(
      getListDreamTeamQuery,
    );

    const mappingDreamTeamInfo = data.map(async (doc) => {
      return this.mappingDreamTeamFeedInfo(doc);
    });

    return Promise.all(mappingDreamTeamInfo);
  }

  async shareDreamTeam(
    currentUserId: string,
    shareCapturedDreamTeamDto: ShareCapturedDreamTeamDto,
  ) {
    const newShareDreamTeam = await db.collection('shared_dream_teams').add({
      ...shareCapturedDreamTeamDto,
      userId: currentUserId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      typeOfPost: TypeOfPost.SHARED_DREAM_TEAMS,
    });

    this.feedService.synchronizePostsToMongoose({
      postId: newShareDreamTeam.id,
      typeOfPost: TypeOfPost.SHARED_DREAM_TEAMS,
    });

    return 'Shared successfully';
  }

  async createHistoricTraining(
    currentUserId: string,
    createHistoricTrainingDto: CreateHistoricTrainingDto,
  ) {
    const { season } = createHistoricTrainingDto;
    const seasonNow = moment().format('YYYY');
    if (season >= seasonNow) {
      throw new HttpException(
        'You can only create historic training for the ealier season',
        HttpStatus.BAD_REQUEST,
      );
    }

    const historicRef = await db
      .collection('diaries')
      .where('userId', '==', currentUserId)
      .where('season', '==', createHistoricTrainingDto.season)
      .get();

    if (!historicRef.empty || historicRef.size != 0) {
      throw new HttpException(
        'You have information in this season!',
        HttpStatus.BAD_REQUEST,
      );
    }

    const createdTime = +moment.utc().format('x');
    const createdSeason = +moment.utc(season).startOf('year').format('x');

    const newDiary = await db.collection('diaries').add(
      JSON.parse(
        JSON.stringify({
          ...createHistoricTrainingDto,
          userId: currentUserId,
          typeOfDiary: TypeOfDiary.TRAINING,
          typeOfPost: TypeOfPost.DIARIES,
          createdAt: createdSeason,
          updatedAt: createdTime,
        }),
      ),
    );

    if (createHistoricTrainingDto?.training?.practiceTags) {
      this.createPracticeTags(createHistoricTrainingDto.training.practiceTags);
    }

    return { diaryId: newDiary.id };
  }

  async updateHistoricTraining(
    diaryId: string,
    updateHistoricTrainigDto: UpdateHistoricTrainingDto,
    timezone?: string,
  ) {
    const { createdAt } = updateHistoricTrainigDto;
    const historicTrainingRef = await db
      .collection('diaries')
      .doc(diaryId)
      .get();
    if (!historicTrainingRef.exists) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      await db
        .collection('diaries')
        .doc(diaryId)
        .set(
          JSON.parse(
            JSON.stringify({
              ...updateHistoricTrainigDto,
              ...(createdAt && {
                createdAt: +momentTz(createdAt).tz(timezone).format('x'),
              }),
              updatedAt: +moment.utc().format('x'),
            }),
          ),
          {
            merge: true,
          },
        );
    } catch (error) {
      throw new InternalServerErrorException(`${error}`);
    }

    return {
      message: 'Update historic training successfully',
    };
  }

  async deleteHistoricTraining(diaryId: string) {
    const historicRef = await db.collection('diaries').doc(diaryId).get();
    if (!historicRef.exists) {
      throw new HttpException(
        ResponseMessage.Diary.HISTORIC_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      await db.collection('diaries').doc(diaryId).delete();
    } catch (error) {
      throw new InternalServerErrorException(`${error}`);
    }
    return ResponseMessage.Diary.DELETE_HISTORIC;
  }
}
