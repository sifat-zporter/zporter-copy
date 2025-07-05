import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  BigQueryTable,
  CACHE_KEYS,
  painLevel,
  performanceLevel,
  ResponseMessage,
  UserInfoDto,
} from '../../common/constants/common.constant';
import { PaginationDto, SortBy } from '../../common/pagination/pagination.dto';
import { getPriorityOfPost } from '../../helpers/get-priority-of-posts';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { calculatePercent } from '../../utils/calculate-percent';
import { calculateMinutesOfHours } from '../../utils/calculate-percent-of-hours';
import { deleteNullValuesInArray } from '../../utils/delete-null-values-in-array';
import { deleteCollection } from '../../utils/delete-subCollection';
import { findMostElementAppear } from '../../utils/find-most-el-appear';
import { getPeriodTimeForQuery } from '../../utils/get-period-time-for-query';
import { BiographyService } from '../biography/biography.service';
import { PlayerBioProfileDto } from '../biography/dto/player-bio.dto';
import { CoachBio } from '../biography/interfaces/coach-bio.interface';
import { CacheManagerService } from '../cache-manager/cache-manager.service';
import { ClubService } from '../clubs/v1/clubs.service';
import { CommentService } from '../comment/comment.service';
import { CrmService } from '../crm/crm.service';
import {
  CreateSupportTicketDto,
  TicketPriority,
} from '../crm/dto/create-support-ticket.dto';
import { DashboardService } from '../dashboard/dashboard.service';
import { TrainingCategoryDto } from '../dashboard/dto/dashboard.res.dto';
import { DiaryService } from '../diaries/diaries.service';
import { MediaDto } from '../diaries/dto/diary.dto';
import { InjuryDto } from '../diaries/dto/injury.dto';
import {
  Event,
  PhysicallyStrain,
  TypeOfDiary,
  TypeOfTraining,
} from '../diaries/enum/diaries.enum';
import { Status } from '../friends/enum/friend.enum';
import { FriendsService } from '../friends/friends.service';
import {
  CreateNotificationDto,
  NotificationTitle,
  NotificationType,
} from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { JoinTeamStatus } from '../teams/dto/teams.req.dto';
import { TeamsService } from '../teams/teams.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { db } from './../../config/firebase.config';
import { MediaType } from './../diaries/enum/diaries.enum';
import {
  CreatePlainPostDto,
  FeedTab,
  GetListFeedQuery,
  GetListNewsOfProviderQuery,
  LikeQueryDto,
  PostQueryDto,
  Query,
  SynchronizePostDto,
  TypeOfPost,
  TypeOfProvider,
  UpdatePlainPostDto,
} from './dto/feed.req.dto';
import {
  BaseOutputListFeedDto,
  MatchStatsDto,
  OutputListNewsFeed,
  ProviderInfoDto,
} from './dto/feed.res.dto';
import { NewsRequest } from './dto/request/news.request';
import { FeedBigQueryService } from './repositories/feed.repository';
import { Feed, FEED_MODEL } from './schemas/feed.schemas';
@Injectable()
export class FeedService {
  constructor(
    @InjectModel(FEED_MODEL)
    private readonly feedModel: Model<Feed>,
    @Inject(forwardRef(() => DashboardService))
    private dashboardService: DashboardService,
    private friendsService: FriendsService,
    private commentService: CommentService,
    @Inject(forwardRef(() => ClubService))
    private clubService: ClubService,
    private notificationsService: NotificationsService,
    private teamsService: TeamsService,
    private feedBigQueryService: FeedBigQueryService,
    @Inject(forwardRef(() => BiographyService))
    private biographyService: BiographyService,
    private cacheManagerService: CacheManagerService,
    @Inject(forwardRef(() => DiaryService))
    private diaryService: DiaryService,
    @Inject(forwardRef(() => CrmService))
    private crmService: CrmService,
  ) {}

  async limitPostLikes(userId: string) {
    const LIMIT_POSTS_LIKES_PER_DAY = 300;

    const from = +moment.utc().startOf('day').format('x');
    const to = +moment.utc().endOf('day').format('x');

    const likeRef = await db
      .collectionGroup('likes')
      .orderBy('createdAt', 'desc')
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .where('userId', '==', userId)
      .get();

    if (likeRef.size > LIMIT_POSTS_LIKES_PER_DAY) {
      throw new HttpException(
        `Limit of ${LIMIT_POSTS_LIKES_PER_DAY} post likes per day`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async synchronizePostsToMongoose(synchronizePostDto: SynchronizePostDto) {
    const { typeOfPost, postId } = synchronizePostDto;

    let userIds: string[] = [];
    let friendIds: string[] = [];
    let teammateIds: string[] = [];

    const { criteria, priority } = getPriorityOfPost(typeOfPost);

    const postRef = await db.collection(`${typeOfPost}`).doc(postId).get();

    const userId = postRef.data()?.userId;

    if (
      ![
        TypeOfPost.RSS_NEWS,
        TypeOfPost.ZPORTER_NEWS,
        TypeOfPost.DREAM_TEAM_POSTS,
      ].includes(typeOfPost)
    ) {
      [userIds, friendIds, teammateIds] = await Promise.all([
        this.getRelationshipUserIds(
          userId,
          criteria as 'team' | 'friend' | 'currentUser' | 'none',
        ),
        this.getRelationshipUserIds(userId, 'friend'),
        this.getRelationshipUserIds(userId, 'team'),
      ]);
    }

    const data: Record<string, any> = {
      ...postRef.data(),
      postId,
      typeOfPost: postRef.data().typeOfPost,
    };

    const [newFeed] = await this.mappingFeedsInfo(userId, [data]);

    const bioInfo = (newFeed as any)?.bioInfo;

    if (bioInfo) {
      const countVariables = ['friendCount', 'followCount', 'fanCount']

      countVariables.forEach((key) => {
        if (typeof bioInfo?.[key] !== 'number') {
          newFeed['bioInfo'][key] = bioInfo?.[key]?.count ?? 0;
        }
      });
    }

    await this.feedModel.findOneAndUpdate(
      {
        postId: postId,
      },
      {
        postId: postId,
        userIds,
        friendIds,
        teammateIds,
        data: JSON.parse(JSON.stringify(newFeed)),
        priority,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    return newFeed;
  }

  async getRemindUpdateDiaryPost(currentUserId: string) {
    const remindUpdateDiaryPost = await this.feedModel
      .find({
        'data.userId': currentUserId,
        'data.typeOfPost': TypeOfPost.REMIND_UPDATE_DIARIES,
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    return remindUpdateDiaryPost[0]?.data;
  }

  async getZporterNews(postIds: string[]) {
    const zporterNewsPost = await this.feedModel
      .find({
        postId: { $in: postIds },
      })
      .sort({ createdAt: -1 })
      .lean();

    return zporterNewsPost.map((e) => e.data);
  }
  async getRelationshipUserIds(
    currentUserId: string,
    criteria?: 'team' | 'friend' | 'currentUser' | 'none',
  ): Promise<string[]> {
    if (criteria === 'currentUser') {
      return [currentUserId];
    }

    if (criteria === 'friend') {
      return this.friendsService.getFriendIds(currentUserId);
    }

    if (criteria === 'team') {
      return this.teamsService.getMemberIdsFromTeams(currentUserId);
    }

    if (criteria === 'none') {
      return [];
    }

    const memberIdsTeam = await this.teamsService.getMemberIdsFromTeams(
      currentUserId,
    );

    const friendIds = await this.friendsService.getFriendIds(currentUserId);

    return [...new Set([...memberIdsTeam, ...friendIds, currentUserId])];
  }

  async cacheListPost(newPost: any) {
    const cachedPosts = (await this.cacheManagerService.get(
      CACHE_KEYS.GET_POSTS_CACHE_KEY,
    )) as string;

    if (cachedPosts) {
      const parsedData = JSON.parse(cachedPosts) as Array<any>;
      parsedData.push(newPost);

      return this.cacheManagerService.set(
        CACHE_KEYS.GET_POSTS_CACHE_KEY,
        JSON.stringify(parsedData),
      );
    }
  }

  private async mappingPlainPostsFeed(doc: any) {
    let result = {
      ...doc,
    };

    if (doc?.friendTags?.length) {
      const mappingUserInfo = doc?.friendTags.map(async (userId) => {
        const userInfo = await mappingUserInfoById(userId);

        return userInfo;
      });

      const friendTags = await Promise.all(mappingUserInfo);

      result = {
        ...result,
        friendTags,
      };
    }

    return result;
  }

  private async mappingPersonalGoalFeed(doc: any) {
    let result = {
      ...doc,
    };

    if (!doc?.progress) {
      result = {
        ...result,
        progress: 0,
      };
    }

    return result;
  }

  private async mappingSharedBiographyFeed(currentUserId: string, doc: any) {
    let result = {
      ...doc,
    };

    const {
      fanCount,
      followCount,
      friendCount,
      createdAt,
      updatedAt,
      ...rest
    } = doc;

    const userInfo = await mappingUserInfoById(currentUserId);

    result = {
      bioInfo: {
        ...rest,
        fanCount,
        followCount,
        friendCount,
      },
      createdAt,
      updatedAt,
      userInfo,
    };

    return result;
  }

  private async mappingZporterFeedInfo(currentUserId: string, doc: any) {
    const result = new OutputListNewsFeed();

    result.postId = doc.postId as string;
    result.headline = doc.headline as string;
    result.link =
      `${process.env.BACKEND_URL}/zporter-news/${doc.postId}` as string;
    result.excerptText = doc.excerptText as string;
    result.createdAt =
      doc?.createdAt ||
      (+moment
        .utc(moment(doc._fl_meta_.createdDate._seconds * 1000))
        .format('x') as number);
    result.typeOfPost = doc.typeOfPost as TypeOfPost;
    result.mediaLinks = doc?.mediaLinks.map((e) => {
      return {
        type: e.type,
        uniqueKey: e.uniqueKey,
        url: e.url,
      };
    }) as MediaDto[];
    result.posterImageUrl =
      doc?.posterImage ||
      ('https://firebasestorage.googleapis.com/v0/b/zporter-dev-media/o/media%2Ficon_zporter_white48.png?alt=media&token=d9e219c4-4474-4f76-8aaa-c8b1abc35cd4' as string);
    result.providerId =
      doc.providerId ||
      doc?._fl_meta_?.createdBy ||
      ('r9Wm3nR4ojdvfvxUSOmW7bU9Ywt1' as string);
    result.pinUntil = doc?.pinUntil || '';
    result.userId = doc?.createdBy as string;

    const providerInfo = await this.getProviderInfo(
      doc?.providerId || doc?._fl_meta_?.createdBy,
      currentUserId,
    );

    const userInfo = await mappingUserInfoById(doc.createdBy);

    return { ...result, userInfo, providerInfo };
  }

  private async mappingRssNewsFeedInfo(currentUserId: string, doc: any) {
    let result = {
      ...doc,
    };

    const providerInfo = await this.getProviderInfo(
      doc.providerId,
      currentUserId,
    );

    result = { ...result, providerInfo };

    return result;
  }

  private async mappingPlayerOfTheWeekFeedInfo(doc: any, userType: UserTypes) {
    const { fanCount, followCount, friendCount, ...rest } = doc;
    let result;
    let bioInfo: PlayerBioProfileDto | CoachBio;

    result = {
      ...doc,
    };

    if (userType === UserTypes.PLAYER) {
      bioInfo = await this.biographyService.getFormattedPlayerBio(doc.userId);
    }

    if (userType === UserTypes.COACH) {
      bioInfo = await this.biographyService.getFormattedCoachBio(doc.userId);
    }

    result = {
      ...rest,
      bioInfo: { ...bioInfo, fanCount, followCount, friendCount },
    };

    return result;
  }

  private async mappingBirthdayFeedInfo(doc: any, userType: UserTypes) {
    const { userId, ...rest } = doc;
    let result;
    let bioInfo: PlayerBioProfileDto | CoachBio;

    result = {
      ...doc,
    };

    if (userType === UserTypes.PLAYER) {
      bioInfo = await this.biographyService.getFormattedPlayerBio(doc.userId);
    }

    if (userType === UserTypes.COACH) {
      bioInfo = await this.biographyService.getFormattedCoachBio(doc.userId);
    }

    const countRelationship =
      await this.friendsService.getCountRelationshipFromMongo(userId);

    result = {
      ...rest,
      userId,
      bioInfo: { ...bioInfo, ...countRelationship },
    };

    return result;
  }

  private async mappingZtarOfTheMatchFeedInfo(doc: any, userType: UserTypes) {
    const { diaryId, userId, ...rest } = doc;
    let result;
    let bioInfo: PlayerBioProfileDto | CoachBio;

    result = {
      ...doc,
    };

    if (userType === UserTypes.PLAYER) {
      bioInfo = await this.biographyService.getFormattedPlayerBio(doc.userId);
    }

    if (userType === UserTypes.COACH) {
      bioInfo = await this.biographyService.getFormattedCoachBio(doc.userId);
    }
    const selectMatchFields = [
      'typeOfDiary',
      'originalDiaryId',
      'match.country',
      'match.result',
      'match.dateTime',
      'match.club',
      'match.arena',
      'match.length',
      'match.yourTeam',
      'match.opponentClub',
      'match.opponentTeam',
      'match.place',
      'teamId',
      'match.typeOfGame',
      'match.matchMedia',
      'createdAt',
      'userId',
    ];

    const [countRelationship, diaryRef] = await Promise.all([
      this.friendsService.getCountRelationshipFromMongo(userId),
      db
        .collection('diaries')
        .where(firebase.firestore.FieldPath.documentId(), '==', diaryId)
        .select(...selectMatchFields)
        .get(),
    ]);
    console.log(123, countRelationship);

    const diaryInfo = await this.diaryService.mappingDiariesInfo(diaryRef.docs);

    result = {
      ...rest,
      userId,
      diaryInfo: diaryInfo[0],
      bioInfo: { ...bioInfo, ...countRelationship },
    };

    return result;
  }

  private async mappingDiariesFeedInfo(doc: any) {
    let result = {
      ...doc,
      injuries: [],
    };

    const { training, match, userId, createdAt } = doc;

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

        const listOfPhysicallyStrain =
          await this.diaryService.getPhysicallyStrainOfTeam(userId, createdAt);

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
        stats = [],
        events = [],
        matchMedia = [],
      } = match;

      if (stats?.length) {
        commonRole = findMostElementAppear(match.stats) || '?';

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

      const matchStats: MatchStatsDto = {
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
          mvp: null,
          matchMedia: matchMedia?.length ? matchMedia.slice(0, 6) : [],
        },
      };

      if (yourTeam && yourTeam !== '') {
        const yourTeamInfo = await this.teamsService.findOne(yourTeam);

        result = {
          ...result,
          match: {
            ...result.match,
            yourTeam: yourTeamInfo,
          },
        };
      }

      if (opponentTeam && opponentTeam !== '') {
        const opponentTeamInfo = await this.teamsService.findOne(opponentTeam);

        result = {
          ...result,
          match: {
            ...result.match,
            opponentTeam: opponentTeamInfo,
          },
        };
      }

      if (review) {
        const listOfPhysicallyStrain =
          await this.diaryService.getPhysicallyStrainOfTeam(userId, createdAt);

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

    return result;
  }

  private async mappingDreamTeamFeed(doc: any) {
    const { dreamTeamId, userId, ...rest } = doc;
    let result;
    let bioInfo: PlayerBioProfileDto;

    result = {
      ...doc,
    };

    bioInfo = await this.biographyService.getFormattedPlayerBio(doc.userId);

    const selectMatchFields = [
      'country',
      'timeRange',
      'userIds',
      'createdAt',
      'updatedAt',
    ];

    const [countRelationship, diaryRef] = await Promise.all([
      this.friendsService.getCountRelationshipFromMongo(userId),
      db
        .collection('dream_teams')
        .where(firebase.firestore.FieldPath.documentId(), '==', dreamTeamId)
        .select(...selectMatchFields)
        .get(),
    ]);

    const diaryInfo = await this.diaryService.mappingDiariesInfo(diaryRef.docs);

    result = {
      ...rest,
      userId,
      diaryInfo: diaryInfo[0],
      bioInfo: { ...bioInfo, ...countRelationship },
    };

    return result;
  }

  private async mappingFeedsInfo(
    currentUserId: string | undefined,
    data: any[],
  ) {
    const mappingData = data.map(async (doc) => {
      let result: BaseOutputListFeedDto;
      let userInfo: UserInfoDto;

      const { postId, typeOfPost } = doc;

      const postQueryDto = new PostQueryDto();
      postQueryDto.typeOfPost = typeOfPost;
      postQueryDto.postId = postId;

      if (
        ![
          TypeOfPost.RSS_NEWS,
          TypeOfPost.ZPORTER_NEWS,
          TypeOfPost.DREAM_TEAM_POSTS,
        ].includes(typeOfPost)
      ) {
        userInfo = await mappingUserInfoById(doc.userId);
        if (userInfo == null) {
          return null;
        }
      }

      const [countLikes, countComments, usersLiked, usersSaved] =
        await Promise.all([
          this.countLikes(postQueryDto),
          this.countComments(postQueryDto),
          this.getUserIdsLikedPost(postQueryDto),
          this.getUserIdsSavedPost(postQueryDto),
        ]);

      result = {
        ...result,
        postId,
        typeOfPost,
        isSaved: false,
        isLiked: false,
        isCommented: countComments > 0 ? true : false,
        countLikes,
        countComments,
        usersLiked,
        usersSaved,
      };

      if (typeOfPost === TypeOfPost.DIARIES) {
        const mappedDiariesInfo = await this.mappingDiariesFeedInfo(doc);

        result = {
          ...result,
          ...mappedDiariesInfo,
          diaryType:
            userInfo.type === UserTypes.COACH &&
            doc.typeOfDiary === TypeOfDiary.MATCH
              ? 'COACH_DIARY_MATCH'
              : typeOfPost,
          userInfo,
        };
      }

      if (typeOfPost === TypeOfPost.TRANSFERS) {
        const mappingClubInfo = await this.clubService.getClubInfo(doc.postId);

        result = {
          userInfo,
          ...result,
          ...mappingClubInfo,
        };
      }

      if (typeOfPost === TypeOfPost.ZPORTER_NEWS) {
        const mappingZporterNewsInfo = await this.mappingZporterFeedInfo(
          currentUserId,
          doc,
        );

        result = {
          ...result,
          ...mappingZporterNewsInfo,
        };
      }

      if (typeOfPost === TypeOfPost.PLAYER_OF_THE_WEEK) {
        const mappingPlayerOfTheWeekFeedInfo =
          await this.mappingPlayerOfTheWeekFeedInfo(doc, userInfo.type);

        result = {
          ...result,
          ...mappingPlayerOfTheWeekFeedInfo,
        };
      }

      if (typeOfPost === TypeOfPost.BIRTHDAYS) {
        const mappingBirthdayFeedInfo = await this.mappingBirthdayFeedInfo(
          doc,
          userInfo.type,
        );

        result = {
          ...result,
          ...mappingBirthdayFeedInfo,
        };
      }

      if (typeOfPost === TypeOfPost.ZTAR_OF_THE_MATCH) {
        const mappingZtarOfTheMatchFeedInfo =
          await this.mappingZtarOfTheMatchFeedInfo(doc, userInfo.type);

        result = {
          ...result,
          ...mappingZtarOfTheMatchFeedInfo,
        };
      }

      if (typeOfPost === TypeOfPost.RSS_NEWS) {
        const mappingRssNewsInfo = await this.mappingRssNewsFeedInfo(
          currentUserId,
          doc,
        );

        result = {
          ...result,
          ...mappingRssNewsInfo,
        };
      }

      if (typeOfPost === TypeOfPost.SHARED_BIOGRAPHIES) {
        const mappingSharedBiographyFeed =
          await this.mappingSharedBiographyFeed(doc.userId, doc);

        result = {
          ...result,
          ...mappingSharedBiographyFeed,
        };
      }

      if (typeOfPost === TypeOfPost.PERSONAL_GOALS) {
        const mappingPersonalGoalFeed = await this.mappingPersonalGoalFeed(doc);

        result = {
          userInfo,
          ...result,
          ...mappingPersonalGoalFeed,
        };
      }

      if (typeOfPost === TypeOfPost.PLAIN_POSTS) {
        const mappingPlainPostsFeed = await this.mappingPlainPostsFeed(doc);

        result = {
          userInfo,
          ...result,
          ...mappingPlainPostsFeed,
        };
      }

      if (typeOfPost === TypeOfPost.REMIND_UPDATE_DIARIES) {
        result = {
          userInfo,
          ...result,
          ...doc,
        };
      }

      if (typeOfPost === TypeOfPost.SHARED_LEADERBOARD) {
        result = {
          userInfo,
          ...result,
          ...doc,
        };
      }

      if (typeOfPost === TypeOfPost.SHARED_DREAM_TEAMS) {
        result = {
          userInfo,
          ...result,
          ...doc,
        };
      }

      if (typeOfPost === TypeOfPost.DREAM_TEAM_POSTS) {
        result = {
          ...result,
          ...doc,
        };
      }

      if (typeOfPost === TypeOfPost.FANTAZY_TEAM_POSTS) {
        result = {
          userInfo,
          ...result,
          ...doc,
        };
      }

      if (typeOfPost === TypeOfPost.FANTAZY_MANAGER_OF_THE_MONTH) {
        result = {
          userInfo,
          ...result,
          ...doc,
        };
      }

      if (typeOfPost === TypeOfPost.USER_TEST_POST) {
        result = {
          userInfo,
          ...result,
          ...doc,
        };
      }

      return result;
    });

    const finalResult = await Promise.all(mappingData);

    return deleteNullValuesInArray(finalResult);
  }

  async createPlainPost(
    currentUserId: string,
    createPlainPostDto: CreatePlainPostDto,
  ) {
    const { mediaLinks, friendTags } = createPlainPostDto;
    if (mediaLinks) {
      mediaLinks.forEach((e) => {
        e.uniqueKey = uuidv4();
      });
    }
    const data = {
      ...createPlainPostDto,
      mediaLinks: JSON.parse(JSON.stringify(mediaLinks)),
      userId: currentUserId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      typeOfPost: TypeOfPost.PLAIN_POSTS,
    };
    const { username, type, faceImage, gender } = await mappingUserInfoById(
      currentUserId,
    );
    const newPost = await db.collection('plain_posts').add(data);
    if (friendTags.length) {
      const sendNotification = friendTags.map(async (userId) => {
        const { fcmToken } = await mappingUserInfoById(userId);
        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.notificationType = NotificationType.TAG_FEED;
        payload.receiverId = userId;
        payload.senderId = currentUserId;
        payload.title = `Zporter Feed`;
        payload.content = gender;
        payload.largeIcon = faceImage;
        payload.username = username;
        payload.userType = type;
        payload.others = {
          postId: newPost.id,
          typeOfPost: String(TypeOfPost.PLAIN_POSTS),
        };
        await this.notificationsService.sendMulticastNotification(payload);
      });
      await Promise.all(sendNotification);
    }
    return this.synchronizePostsToMongoose({
      postId: newPost.id,
      typeOfPost: TypeOfPost.PLAIN_POSTS,
    });
  }

  async updatePlainPost(
    currentUserId: string,
    postId: string,
    updatePlainPostDto: UpdatePlainPostDto,
  ) {
    const { mediaLinks = [] } = updatePlainPostDto;

    if (mediaLinks.length) {
      mediaLinks.forEach((e) => {
        e.uniqueKey = uuidv4();
      });
    }

    const postRef = await db
      .collection('plain_posts')
      .where(firebase.firestore.FieldPath.documentId(), '==', postId)
      .where('userId', '==', currentUserId)
      .get();

    if (postRef.empty) {
      throw new HttpException(
        ResponseMessage.Feed.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    postRef.forEach((doc) => {
      doc.ref.set(
        {
          ...updatePlainPostDto,
          updatedAt: +moment.utc().format('x'),
        },
        { merge: true },
      );
    });

    return ResponseMessage.Feed.UPDATED;
  }

  async deletePlainPost(currentUserId: string, postId: string) {
    const postRef = await db
      .collection('plain_posts')
      .where(firebase.firestore.FieldPath.documentId(), '==', postId)
      .where('userId', '==', currentUserId)
      .get();

    if (postRef.empty) {
      throw new HttpException(
        ResponseMessage.Feed.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    postRef.forEach((doc) => {
      doc.ref.delete();
    });

    return ResponseMessage.Feed.DELETED;
  }

  async getAllPosts(currentUserId: string, getListFeedQuery: GetListFeedQuery) {
    const result = await this.feedBigQueryService.getAllPosts(
      currentUserId,
      getListFeedQuery,
    );

    return this.mappingFeedsInfo(currentUserId, result);
  }

  async getAllPostsV1(
    currentUserId: string,
    getListFeedQuery: GetListFeedQuery,
  ) {
    const { limit, startAfter } = getListFeedQuery;

    const subscribedRef = await db
      .collection('subscribed')
      .where('userId', '==', currentUserId)
      .get();

    const unSubProviderIds = subscribedRef.docs.map((doc) => {
      return doc.data()?.providerId;
    });

    const now = moment().format('YYYY-MM-DDThh:mm');
    const zporterNewsRef = await db
      .collection('zporter_news')
      .where('pinUntil', '>=', now)
      .get();
    let postIds: string[] = [];

    zporterNewsRef.forEach(async (doc) => {
      postIds.push(doc.id);
    });

    if (zporterNewsRef.size > 0) {
      const result = await this.feedModel
        .find({
          $and: [
            {
              postId: { $nin: postIds },
            },
            {
              'data.typeOfDiary': {
                $nin: [`${TypeOfDiary.CAP}`, `${TypeOfDiary.REST}`],
              },
            },
            {
              'data.typeOfPost': { $ne: 'remind_update_diaries' },
            },
            {
              'data.providerId': {
                $nin: unSubProviderIds,
              },
            },
            {
              'data._fl_meta_.createdBy': {
                $nin: unSubProviderIds,
              },
            },
          ],
        })
        .sort({ createdAt: -1, priority: 1 })
        .limit(limit)
        .skip(limit * (startAfter - 1))
        .lean();

      const data = result.map(({ data }) => data);

      if (startAfter <= 1) {
        const zporterNewsPost = await this.getZporterNews(postIds);

        if (zporterNewsPost.length) {
          data.unshift(zporterNewsPost);
        }

        const remindUpdateDiaryPost = await this.getRemindUpdateDiaryPost(
          currentUserId,
        );

        if (remindUpdateDiaryPost) {
          data.unshift(remindUpdateDiaryPost);
        }
      }

      data.forEach((doc) => {
        if ((doc?.usersLiked as string[])?.includes(currentUserId)) {
          doc.isLiked = true;
        }

        if ((doc?.usersSaved as string[])?.includes(currentUserId)) {
          doc.isSaved = true;
        }
      });

      return data.flat();
    } else {
      const result = await this.feedModel
        .find({
          $and: [
            {
              'data.typeOfDiary': {
                $nin: [`${TypeOfDiary.CAP}`, `${TypeOfDiary.REST}`],
              },
            },
            {
              'data.typeOfPost': { $ne: 'remind_update_diaries' },
            },
            {
              'data.providerId': {
                $nin: unSubProviderIds,
              },
            },
            {
              'data._fl_meta_.createdBy': {
                $nin: unSubProviderIds,
              },
            },
          ],
        })
        .sort({ createdAt: -1, priority: 1 })
        .limit(limit)
        .skip(limit * (startAfter - 1))
        .lean();

      const data = result.map(({ data }) => data);

      if (startAfter <= 1) {
        const remindUpdateDiaryPost = await this.getRemindUpdateDiaryPost(
          currentUserId,
        );

        if (remindUpdateDiaryPost) {
          data.unshift(remindUpdateDiaryPost);
        }
      }

      data.forEach((doc) => {
        if ((doc?.usersLiked as string[])?.includes(currentUserId)) {
          doc.isLiked = true;
        }

        if ((doc?.usersSaved as string[])?.includes(currentUserId)) {
          doc.isSaved = true;
        }
      });

      return data;
    }
  }
  async getAllPostsV2(
    currentUserId: string,
    getListFeedQuery: GetListFeedQuery,
  ) {
    const { limit, startAfter, startAfterTime, startAfterPostId } =
      getListFeedQuery;

    //# NOTE: update remindDiaries before load feed news
    await this.diaryService.updateRemindUpdateDiaryPost(currentUserId);
    const subscribedRef = await db
      .collection('subscribed')
      .where('userId', '==', currentUserId)
      .get();

    const unSubProviderIds = subscribedRef.docs.map((doc) => {
      return doc.data()?.providerId;
    });

    const { fromTime, toTime } = getPeriodTimeForQuery(+startAfterTime);
    if (fromTime == null || toTime == null) {
      return [];
    }

    const now = moment().format('YYYY-MM-DDThh:mm');
    const zporterNewsRef = await db
      .collection('zporter_news')
      .where('pinUntil', '>=', now)
      .get();
    let postIds: string[] = zporterNewsRef.docs.map((d) => d.id);

    const conditions: Array<any> = [
      {
        'data.typeOfDiary': {
          $nin: [`${TypeOfDiary.CAP}`, `${TypeOfDiary.REST}`],
        },
      },
      {
        postId: { $nin: postIds },
      },
      {
        'data.typeOfPost': { $ne: 'remind_update_diaries' },
      },
      {
        'data.providerId': {
          $nin: unSubProviderIds,
        },
      },
      {
        'data._fl_meta_.createdBy': {
          $nin: unSubProviderIds,
        },
      },
      {
        createdAt: { $lte: +toTime },
      },
      {
        createdAt: { $gte: +fromTime },
      },
      {
        'data.postId': { $ne: startAfterPostId },
      },
    ];

    const result = await this.feedModel.aggregate([
      {
        $match: {
          $and: conditions,
        },
      },
      { $sort: { 'data.createdAt': -1, priority: 1, 'data.postId': -1 } },
      { $limit: +limit },
      {
        $project: {
          data: 1,
          _id: -1,
        },
      },
    ]);
    if (result.length == 0) {
      const condition: GetListFeedQuery = getListFeedQuery;
      condition.startAfterTime = fromTime;

      return this.getAllPostsV2(currentUserId, condition);
    }
    const data = result.map(({ data }) => data);

    if (postIds.length > 0 && startAfter <= 1) {
      const zporterNewsPost = await this.getZporterNews(postIds);

      if (zporterNewsPost.length) {
        data.unshift(...zporterNewsPost);
      }

      const remindUpdateDiaryPost = await this.getRemindUpdateDiaryPost(
        currentUserId,
      );

      if (remindUpdateDiaryPost) {
        data.unshift(remindUpdateDiaryPost);
      }
    } else if (startAfter <= 1) {
      const remindUpdateDiaryPost = await this.getRemindUpdateDiaryPost(
        currentUserId,
      );

      if (remindUpdateDiaryPost) {
        data.unshift(remindUpdateDiaryPost);
      }
    }

    await Promise.all(
      data.map(async (doc) => {
        if ((doc?.usersLiked as string[])?.includes(currentUserId)) {
          doc.isLiked = true;
        }

        if ((doc?.usersSaved as string[])?.includes(currentUserId)) {
          doc.isSaved = true;
        }

        //# preprocess for flag check whether currentUserId is friends with owner of this post.
        const createdBy = doc?.userInfo?.userId || '';
        if (createdBy != '') {
          const { isFan, isFollow, isFriend } =
            await this.friendsService.checkRelationshipV2(
              currentUserId,
              createdBy,
            );

          doc['isFriend'] = isFriend || false;
          doc['isFollow'] = isFollow || false;
          doc['isFan'] = isFan || false;
        } else {
          doc['isFriend'] = false;
          doc['isFollow'] = false;
          doc['isFan'] = false;
        }

        return doc;
      }),
    );
    return data;
  }

  getPeriodTimeForFeed(pointOfTime: number) {
    if (!pointOfTime) {
      return {
        fromTime: +moment.utc().subtract(2, 'd').format('x'),
        toTime: +moment.utc().format('x'),
      };
    }
    for (let index = 0; index < 30; index++) {
      const daysPerStep = 2;

      const toTime = +moment
        .utc()
        .subtract(index * daysPerStep, 'd')
        .format('x');
      const fromTime = +moment
        .utc()
        .subtract((index + 1) * daysPerStep, 'd')
        .format('x');

      if (fromTime < pointOfTime && pointOfTime <= toTime) {
        return {
          fromTime,
          toTime: pointOfTime,
        };
      }
    }
  }

  async getListPostV1(userId: string, getListFeedQuery: GetListFeedQuery) {
    const { feedTab, startAfter, limit, userIdQuery } = getListFeedQuery;
    let conditions = {};

    const currentUserId = userIdQuery ? userIdQuery : userId;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (feedTab === FeedTab.ALL) {
      return this.getAllPostsV2(currentUserId, getListFeedQuery);
    }

    if (feedTab === FeedTab.TEAM) {
      conditions = {
        $and: [
          { teammateIds: { $in: [currentUserId] } },
          { 'data.userId': { $ne: currentUserId } },
          { 'data.typeOfPost': { $ne: TypeOfPost.REMIND_UPDATE_DIARIES } },
        ],
      };
    }

    if (feedTab === FeedTab.YOURS) {
      conditions = {
        $and: [
          { 'data.userId': currentUserId },
          { 'data.typeOfPost': { $ne: TypeOfPost.REMIND_UPDATE_DIARIES } },
        ],
      };
    }

    if (feedTab === FeedTab.SAVED) {
      const result = await this.feedBigQueryService.getListSavedPost(
        currentUserId,
        getListFeedQuery,
      );

      const data = await this.mappingFeedsInfo(currentUserId, result);

      await Promise.all(
        data.map(async (doc) => {
          doc.isSaved = true;

          //# preprocess for flag check whether currentUserId is friends with owner of this post.
          // const postCreatedByUserId = doc?.userInfo?.userId || '';
          // doc['isFriend'] = friendIds.includes(postCreatedByUserId)
          //   ? true
          //   : false;
          const createdBy = doc?.userInfo?.userId || '';
          const { isFan, isFollow, isFriend } =
            await this.friendsService.checkRelationshipV2(
              currentUserId,
              createdBy,
            );
          doc['isFriend'] = isFriend || false;
          doc['isFollow'] = isFollow || false;
          doc['isFan'] = isFan || false;
        }),
      );

      return data;
    }

    if (feedTab === FeedTab.FRIENDS) {
      conditions = {
        $and: [
          { friendIds: { $in: [currentUserId] } },
          { 'data.userId': { $ne: currentUserId } },
          { 'data.typeOfPost': { $ne: TypeOfPost.REMIND_UPDATE_DIARIES } },
        ],
      };
    }

    if (feedTab === FeedTab.FAMILY) {
      const result = await this.feedBigQueryService.getListFamilyFeed(
        currentUserId,
        getListFeedQuery,
      );

      return this.mappingFeedsInfo(currentUserId, result);
    }

    const result = await this.feedModel
      .find(conditions)
      .sort({ createdAt: -1, priority: 1 })
      .limit(limit)
      .skip(limit * (startAfter - 1))
      .lean();

    const data = result.map(({ data }) => data);

    if (!data.length) return [];

    if (startAfter <= 1 && feedTab === FeedTab.YOURS) {
      const remindUpdateDiaryPost = await this.getRemindUpdateDiaryPost(
        currentUserId,
      );

      if (remindUpdateDiaryPost) {
        data.unshift(remindUpdateDiaryPost);
      }
    }

    await Promise.all(
      data.map(async (doc) => {
        if ((doc?.usersLiked as string[])?.includes(currentUserId)) {
          doc.isLiked = true;
        }

        if ((doc?.usersSaved as string[])?.includes(currentUserId)) {
          doc.isSaved = true;
        }

        //# preprocess for flag check whether currentUserId is friends with owner of this post.
        const createdBy = doc?.userInfo?.userId || '';
        const { isFan, isFollow, isFriend } =
          await this.friendsService.checkRelationshipV2(
            currentUserId,
            createdBy,
          );
        doc['isFriend'] = isFriend || false;
        doc['isFollow'] = isFollow || false;
        doc['isFan'] = isFan || false;

        return doc;
      }),
    );

    return data;
  }

  async getListPost(currentUserId: string, getListFeedQuery: GetListFeedQuery) {
    let conditions: string;
    let joinTable: string;
    const { feedTab, startAfter } = getListFeedQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (feedTab === FeedTab.ALL) {
      return this.getAllPostsV1(currentUserId, getListFeedQuery);
    }

    if (feedTab === FeedTab.TEAM) {
      const { teamIds } = await mappingUserInfoById(currentUserId);
      const convertTeamIds = teamIds.join("','");

      joinTable = `
      LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
      ON
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`;

      conditions = `
        json_value(${BigQueryTable.USERS}.DATA, '$.teamId') IN ('${convertTeamIds}')
      AND
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.status') = '${JoinTeamStatus.ACCEPTED}'
      AND
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') != '${currentUserId}'
      `;
    }

    if (feedTab === FeedTab.YOURS) {
      conditions = `json_value(typeOfPost.DATA, '$.userId') = '${currentUserId}'`;
    }

    if (feedTab === FeedTab.SAVED) {
      const result = await this.feedBigQueryService.getListSavedPost(
        currentUserId,
        getListFeedQuery,
      );

      return this.mappingFeedsInfo(currentUserId, result);
    }

    if (feedTab === FeedTab.FRIENDS) {
      joinTable = `
      LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FOLLOWS}_raw_latest\` AS ${BigQueryTable.FOLLOWS}
      ON
        json_value(${BigQueryTable.FOLLOWS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`;

      conditions = `
        json_value(${BigQueryTable.FOLLOWS}.DATA, '$.userId') = '${currentUserId}'
      AND
        json_value(${BigQueryTable.FOLLOWS}.DATA, '$.status') = '${Status.ACCEPTED}'
      `;
    }

    if (feedTab === FeedTab.FAMILY) {
      const result = await this.feedBigQueryService.getListFamilyFeed(
        currentUserId,
        getListFeedQuery,
      );

      return this.mappingFeedsInfo(currentUserId, result);
    }

    const result = await this.feedBigQueryService.getListPost(
      currentUserId,
      getListFeedQuery,
      joinTable,
      conditions,
    );

    return this.mappingFeedsInfo(currentUserId, result);
  }

  async getPostDetail(currentUserId: string, postQueryDto: PostQueryDto) {
    const { postId, typeOfPost } = postQueryDto;
    const data = [];

    const postRef = await db.collection(`${typeOfPost}`).doc(postId).get();

    if (!postRef.exists) {
      throw new HttpException(
        ResponseMessage.Feed.POST_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    data.push({ ...postRef.data(), postId, typeOfPost });

    const result = await this.mappingFeedsInfo(currentUserId, data);

    return result[0];
  }

  async deleteLikeAndCommentCol(postQueryDto: PostQueryDto) {
    const { postId, typeOfPost } = postQueryDto;

    const likePath = `${typeOfPost}/${postId}/likes/`;
    deleteCollection(db, likePath, 50);

    const listComments = [];
    const commentRef = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .get();

    commentRef.forEach((doc) => {
      listComments.push({ ...doc.data(), commentId: doc.id });
    });

    await Promise.all(
      listComments.map(async (x) => {
        const collectionPath = `${typeOfPost}/${postId}/comments/${x.commentId}/like_comments/`;
        await deleteCollection(db, collectionPath, 50);

        await db
          .collection(`${typeOfPost}`)
          .doc(postId)
          .collection('comments')
          .doc(x.commentId)
          .delete();
      }),
    );
  }

  formatInjuryBodyPart(injuries: InjuryDto[]) {
    const finalObj = {};
    injuries.forEach((data) => {
      const area = data?.injuryArea;
      if (finalObj[area]) {
        finalObj[area].push(data);
      } else {
        finalObj[area] = [data];
      }
    });

    const bodyChart = Object.keys(finalObj).map((area) => {
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
        description: injuries[0]?.description || '',
      };
    });

    return bodyChart;
  }

  async getUserIdsLikedPost(postQueryDto: PostQueryDto) {
    const { postId, typeOfPost } = postQueryDto;

    const likeRef = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('likes')
      .get();

    return likeRef.docs.map((doc) => doc.id);
  }

  async getUserIdsSavedPost(postQueryDto: PostQueryDto) {
    const { postId, typeOfPost } = postQueryDto;

    const savedPostRef = await db
      .collection('saved_posts')
      .where('postId', '==', postId)
      .where('typeOfPost', '==', typeOfPost)
      .get();

    return savedPostRef.docs.map((doc) => doc.data()?.userId);
  }

  async checkSavedPost(
    postQueryDto: PostQueryDto,
    currentUserId: string,
  ): Promise<boolean> {
    const { postId, typeOfPost } = postQueryDto;

    const checkSaved = await db
      .collection('saved_posts')
      .where('postId', '==', postId)
      .where('typeOfPost', '==', typeOfPost)
      .where('userId', '==', currentUserId)
      .get();

    const isSaved: boolean = checkSaved.size > 0 ? true : false;
    return isSaved;
  }

  async checkLikedPost(
    postQueryDto: PostQueryDto,
    currentUserId: string,
  ): Promise<boolean> {
    const { postId, typeOfPost } = postQueryDto;

    const checkLiked = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('likes')
      .doc(currentUserId)
      .get();

    const isLiked: boolean = checkLiked.data() ? true : false;
    return isLiked;
  }

  async savePost(
    currentUserId: string,
    postQueryDto: PostQueryDto,
  ): Promise<string> {
    const { postId, typeOfPost } = postQueryDto;
    let message: string;
    if (
      typeOfPost === TypeOfPost.RSS_NEWS ||
      typeOfPost === TypeOfPost.ZPORTER_NEWS
    ) {
      return;
    }

    const [postRef, checkSaved] = await Promise.all([
      db.collection(`${typeOfPost}`).doc(postId).get(),
      db
        .collection('saved_posts')
        .where('postId', '==', postId)
        .where('typeOfPost', '==', typeOfPost)
        .where('userId', '==', currentUserId)
        .get(),
    ]);

    if (!postRef.exists) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }

    if (!checkSaved.size) {
      await db.collection('saved_posts').add({
        postId,
        typeOfPost,
        userId: currentUserId,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      });

      message = ResponseMessage.Feed.SAVED;
    }

    if (checkSaved.size) {
      const savedRef = await db
        .collection('saved_posts')
        .where('postId', '==', postId)
        .where('typeOfPost', '==', typeOfPost)
        .where('userId', '==', currentUserId)
        .get();

      savedRef.forEach((doc) => {
        doc.ref.delete();
      });

      message = ResponseMessage.Feed.UNSAVED;
    }

    this.synchronizePostsToMongoose(postQueryDto);

    return message;
  }

  async likePost(
    currentUserId: string,
    likeQueryDto: LikeQueryDto,
  ): Promise<string> {
    let message: string;
    const { query, postId, typeOfPost } = likeQueryDto;

    const [postRef, likeRef] = await Promise.all([
      db.collection(`${typeOfPost}`).doc(postId).get(),
      db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('likes')
        .doc(currentUserId)
        .get(),
      this.limitPostLikes(currentUserId),
    ]);

    if (!postRef.data()) {
      throw new HttpException(
        ResponseMessage.Diary.DIARY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!likeRef.data() && query === Query.LIKE) {
      const likePost = db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('likes')
        .doc(currentUserId)
        .set(
          {
            postId,
            typeOfPost,
            createdAt: +moment.utc().format('x'),
            updatedAt: +moment.utc().format('x'),
            userId: currentUserId,
          },
          { merge: true },
        );

      const updatePostRef = postRef.ref.set(
        { updatedAt: +moment.utc().format('x') },
        { merge: true },
      );

      await Promise.all([likePost, updatePostRef]);

      if (
        ![TypeOfPost.RSS_NEWS, TypeOfPost.ZPORTER_NEWS].includes(typeOfPost)
      ) {
        const [ownerPostInfo, userInfo] = await Promise.all([
          mappingUserInfoById(postRef.data()?.userId),
          mappingUserInfoById(currentUserId),
        ]);

        if (
          ownerPostInfo.userId !== userInfo.userId &&
          ownerPostInfo.notificationOptions.feedUpdates
        ) {
          const payload = new CreateNotificationDto();
          payload.token = ownerPostInfo.fcmToken;
          payload.title = NotificationTitle.ZPORTER_FEED;
          payload.notificationType = NotificationType.LIKE_POST;
          payload.senderId = currentUserId;
          payload.receiverId = ownerPostInfo.userId;
          payload.username = userInfo.username;
          payload.largeIcon = userInfo.faceImage;
          payload.userType = userInfo.type;
          payload.others = {
            postId,
            typeOfPost: `${typeOfPost}`,
          };

          await this.notificationsService.sendMulticastNotification(payload);
        }
      }

      message = ResponseMessage.Feed.LIKE;
    }

    if (likeRef.data() && query === Query.UNLIKE) {
      await db
        .collection(`${typeOfPost}`)
        .doc(postId)
        .collection('likes')
        .doc(currentUserId)
        .delete();

      message = ResponseMessage.Feed.UNLIKE;
    }

    this.synchronizePostsToMongoose(likeQueryDto);

    return message;
  }

  async getListProviders(currentUserId: string): Promise<ProviderInfoDto[]> {
    const data = [] as ProviderInfoDto[];

    const providerRef = await db.collection('rss_providers').get();
    providerRef.forEach((doc) => {
      const providerInfo = new ProviderInfoDto();
      providerInfo.providerId = doc.id;
      providerInfo.name = doc.data().name as string;
      providerInfo.logo = doc.data().logo as string;
      providerInfo.region = doc.data().region as string;
      providerInfo.typeOfProvider = doc.data().typeOfProvider as TypeOfProvider;

      data.push(providerInfo);
    });

    const checkSubscribed = data.map(async (doc: ProviderInfoDto) => {
      const subRef = await db
        .collection('subscribed')
        .where('providerId', '==', doc.providerId)
        .where('userId', '==', currentUserId)
        .get();

      doc.isFollowed = !subRef.empty ? false : true;
    });

    await Promise.all(checkSubscribed);

    data
      .sort((a: any, b: any) => b.isFollowed - a.isFollowed)
      .forEach((doc, idx) => {
        if (doc.name === 'Zporter') {
          data.splice(idx, 1);
          data.unshift(doc);
        }
      });
    return data;
  }

  async getListNewsPost(paginationDto: PaginationDto, currentUserId: string) {
    const { startAfter } = paginationDto;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.feedBigQueryService.getListNewsPost(
      paginationDto,
      currentUserId,
    );

    return this.mappingFeedsInfo(currentUserId, data);
  }

  async getListNewsPostV1(paginationDto: NewsRequest, currentUserId: string) {
    const { limit, startAfter } = paginationDto;
    const subscribedRef = await db
      .collection('subscribed')
      .where('userId', '==', currentUserId)
      .get();

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const unSubProviderIds = subscribedRef.docs.map((doc) => {
      return doc.data()?.providerId;
    });

    const result = await this.feedModel
      .find({
        $and: [
          {
            'data.typeOfPost': {
              $in: [TypeOfPost.RSS_NEWS, TypeOfPost.ZPORTER_NEWS],
            },
          },
          {
            'data.providerId': {
              $nin: unSubProviderIds,
            },
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * (startAfter - 1))
      .lean();

    const data = result.map(({ data }) => data);

    data.forEach((doc) => {
      if ((doc?.usersLiked as string[])?.includes(currentUserId)) {
        doc.isLiked = true;
      }

      if ((doc?.usersSaved as string[])?.includes(currentUserId)) {
        doc.isSaved = true;
      }
    });

    return data;
  }

  async getListNewsOfProvider(
    getListNewsOfProviderQuery: GetListNewsOfProviderQuery,
    currentUserId: string, // : Promise<OutputListNewsFeed[]>
  ) {
    const data = [];
    const { limit, startAfter, providerId, typeOfProvider } =
      getListNewsOfProviderQuery;

    if (typeOfProvider === TypeOfProvider.RSS) {
      let newsRef = db
        .collection('rss_news')
        .orderBy('createdAt', 'desc')
        .where('providerId', '==', providerId);

      if (startAfter) {
        newsRef = newsRef.startAfter(+startAfter).limit(+limit);
      }

      if (!startAfter) {
        newsRef = newsRef.limit(+limit);
      }

      const querySnapshot = await newsRef.get();

      querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), postId: doc.id });
      });
    }

    if (typeOfProvider === TypeOfProvider.ZPORTER) {
      let zporterNewsRef = db
        .collection('zporter_news')
        .orderBy('createdAt', 'desc');

      if (startAfter) {
        zporterNewsRef = zporterNewsRef.startAfter(+startAfter).limit(+limit);
      }

      if (!startAfter) {
        zporterNewsRef = zporterNewsRef.limit(+limit);
      }

      const querySnapshot = await zporterNewsRef.get();

      querySnapshot.forEach((doc) => {
        if (doc.exists) {
          const formatData = new OutputListNewsFeed();
          formatData.postId = doc.id as string;
          formatData.headline = doc.data()?.headline as string;
          formatData.link =
            `${process.env.BACKEND_URL}/zporter-news/${doc.id}` as string;
          formatData.excerptText = doc.data()?.excerptText as string;
          formatData.createdAt =
            doc.data()?.createdAt ||
            (+moment
              .utc(moment(doc.data()._fl_meta_.createdDate._seconds * 1000))
              .format('x') as number);
          formatData.typeOfPost = doc.data()?.typeOfPost as TypeOfPost;
          formatData.mediaLinks = doc.data()?.mediaLinks as MediaDto[];
          // formatData.providerId = doc.data()._fl_meta_.createdBy as string;
          formatData.providerId = doc.data()?.providerId as string;

          data.push(formatData);
        }
      });
    }

    const mappingOtherInfo = data.map(async (doc: OutputListNewsFeed) => {
      const postQueryDto = new PostQueryDto();
      postQueryDto.typeOfPost = doc?.typeOfPost;
      postQueryDto.postId = doc?.postId;

      const [providerInfo, isLiked, countLikes, countComments] =
        await Promise.all([
          this.getProviderInfo(
            doc?.providerId || 'r9Wm3nR4ojdvfvxUSOmW7bU9Ywt1',
            currentUserId,
          ),
          this.checkLikedPost(postQueryDto, currentUserId),
          this.countLikes(postQueryDto),
          this.countComments(postQueryDto),
        ]);

      doc.providerInfo = providerInfo as ProviderInfoDto;
      doc.isLiked = isLiked as boolean;
      doc.countLikes = countLikes as number;
      doc.countComments = countComments as number;
    });

    await Promise.all(mappingOtherInfo);

    return data;
  }

  async getProviderInfo(
    providerId: string,
    currentUserId?: string,
  ): Promise<ProviderInfoDto> {
    const providerRef = await db
      .collection('rss_providers')
      .doc(providerId)
      .get();

    if (!providerRef.exists) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const isFollowed = true;
    const result = new ProviderInfoDto();
    result.name = providerRef.data().name as string;
    result.logo = providerRef.data().logo as string;
    result.region = providerRef.data().region as string;
    result.isFollowed = isFollowed;
    result.providerId = providerRef.id as string;
    result.typeOfProvider = providerRef.data().typeOfProvider as TypeOfProvider;

    return result;
  }

  async countLikes(postQueryDto: PostQueryDto) {
    const { postId, typeOfPost } = postQueryDto;

    const likeRef = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('likes')
      .get();

    return likeRef.size;
  }

  async countComments(postQueryDto: PostQueryDto) {
    const { postId, typeOfPost } = postQueryDto;

    const commentRef = await db
      .collection(`${typeOfPost}`)
      .doc(postId)
      .collection('comments')
      .get();

    return commentRef.size;
  }

  async subscribeProvider(
    providerId: string,
    currentUserId: string,
  ): Promise<string> {
    const providerRef = await db
      .collection('rss_providers')
      .doc(providerId)
      .get();

    if (providerRef.data().name === 'Zporter') {
      throw new HttpException('BAD_REQUEST', HttpStatus.BAD_REQUEST);
    }

    if (!providerRef.exists) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const subRef = await db
      .collection('subscribed')
      .where('providerId', '==', providerId)
      .where('userId', '==', currentUserId)
      .get();

    if (subRef.empty) {
      await db.collection('subscribed').add({
        userId: currentUserId,
        providerId,
        createdAt: +moment.utc().format('x'),
      });
      return ResponseMessage.Feed.UNSUBSCRIBED;
    }

    const subscribedRef = await db
      .collection('subscribed')
      .where('providerId', '==', providerId)
      .where('userId', '==', currentUserId)
      .get();

    subscribedRef.forEach((doc) => {
      doc.ref.delete();
    });

    return ResponseMessage.Feed.SUBSCRIBED;
  }
  async getFeedPlayerOfTheWeek(fromDate: number, toDate: number) {
    const record = await this.feedModel.find({
      $and: [
        {
          'data.typeOfPost': TypeOfPost.PLAYER_OF_THE_WEEK,
        },
        {
          createdAt: { $gte: fromDate },
        },
        { createdAt: { $lte: toDate } },
      ],
    });
    return record;
  }

  async deletePost(postId: string) {
    try {
      await this.feedModel.findOneAndRemove({ postId: postId });
    } catch (error) {
      console.log(error);
    }
  }

  async reportTests(userRoleId: string, postId: string, message: string) {
    try {
      const createSupportTicketDto: CreateSupportTicketDto = {
        subject: `Report test-result`,
        content:
          `#Report testsId: ${postId}.\n` +
          `Message from user: \"${message}\".`,
        priority: TicketPriority.Medium,
      };
      await this.crmService.createSupportTicket(
        userRoleId,
        createSupportTicketDto,
      );
      return 'Success';
    } catch (error) {
      throw new BadRequestException('Report fail!');
    }
  }
}
