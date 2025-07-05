/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SendEmailService } from '../../send-email/send-email.service';
import { TypeOfPost } from '../../feed/dto/feed.req.dto';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { RequestBody } from '@elastic/elasticsearch/lib/Transport';
import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import {
  BigQueryTable,
  ResponseMessage,
  TagsTypes,
  USER_STATUS,
  UserInfoDto,
  ZPORTER_DEFAULT_IMAGE,
} from '../../../common/constants/common.constant';
import {
  PaginationDto,
  ResponsePagination,
} from '../../../common/pagination/pagination.dto';
import { elasticClient } from '../../../config/elastic.config';
import { createFullnameArray } from '../../../helpers/convert-name-as-array';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { sendVerifyEmail } from '../../../utils/email-service';
import { getYouTubeId } from '../../../utils/get-youtube-id';
import { ClubService } from '../../clubs/v1/clubs.service';
import { JoinTeamStatus } from '../../clubs/enum/club.enum';
import { GetListRelationshipsQuery } from '../../friends/dto/friends.req.dto';
import { TypeRequest } from '../../friends/enum/friend.enum';
import { FriendsService } from '../../friends/friends.service';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateTagDto } from '../../tags/dto/create-tag.dto';
import { TagsService } from '../../tags/v1/tags.service';
import { SearchTeamMemberQuery } from '../../teams/dto/teams.req.dto';
import { TeamsService } from '../../teams/teams.service';
import { bq, db } from '../../../config/firebase.config';
import { Status } from '../../friends/enum/friend.enum';
import { AskForReviewsDto, CategoryReview } from '../dto/ask-for-reviews.dto';
import { CreateCoachDto, UpdateCoachDto } from '../dto/coach.dto';
import {
  AdminCreatePlayerDto,
  CoachCreatePlayerDto,
  ConfirmDraftPlayerDto,
  CreatePlayerDto,
  UpdatePlayerDto,
} from '../dto/player.dto';
import { CoachUpdatePlayerSkillsDto } from '../dto/player/player-skills.dto';
import { UserPresenceQuery } from '../dto/presence-status';
import { Query, QueryBuilder } from '../dto/query-builder';
import { SearchUserDto } from '../dto/search-user.dto';
import { CreateSupporterDto, UpdateSupporterDto } from '../dto/supporter.dto';
import { GenerateUsernameDto } from '../dto/user/generate-username.dto';
import { UserFlippingQueryDto } from '../dto/user/user-fliping-query.dto';
import { VideoLinkSources } from '../enum/common.enum';
import { UserTypes } from '../enum/user-types.enum';
import { UserAccountRole } from '../interfaces/user-role.interface';
import { UsersFirebaseService } from '../repositories/users.firebase.repository';
import { FeedService } from '../../feed/feed.service';
import { GetListContactQuery } from '../../contact-groups/dto/contact-groups.req.dto';
import { UsersBigQueryService } from '../repositories/users.repository';
import { GeneralUserDto, UpdateUserDto } from '../dto/user.dto';
import { commonPagination } from '../../../helpers/common-pagination';
import { IVerifyEmail } from '../interfaces/verify-email.interface';
import { getBioUrl } from '../../../utils/get-bio-url';
import { UserForMongo } from '../entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { USER_MODEL } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { UserProfileDto } from '../dto/user/user-profile.dto';
import { QueryBioForFlippingDto } from '../../biography/dto/query-bio-for-flipping.dto';
import { hubspotClient } from '../../../config/hubspot.config';
import { CrmService } from '../../crm/crm.service';
import { CreateHubspotContactDto } from '../../crm/dto/create-hubspot-contact.dto';
import { Age } from '../../dashboard/dto/dashboard.req.dto';
import { deleteNullValuesInArray } from '../../../utils/delete-null-values-in-array';
import { UsersMongoRepository } from '../repositories/users.mongo.repository';
import { DraftUsersMongoRepository } from '../repositories/draft-users.mongo.repository';
import { ClubRepository } from '../../clubs/repository/club.repository';
import { TeamsMongoRepository } from '../../teams/repositories/teams/teams.mongo.repository';
import mongoose from 'mongoose';
import { EducationDto } from '../dto/education.dto';
const FieldValue = firebase.firestore.FieldValue;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserForMongo>,
    private tagService: TagsService,
    @Inject(forwardRef(() => ClubService))
    private clubService: ClubService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => FriendsService))
    private friendsService: FriendsService,
    private teamsService: TeamsService,
    @Inject(forwardRef(() => FeedService))
    private feedService: FeedService,
    @Inject(forwardRef(() => SendEmailService))
    private sendEmailService: SendEmailService,
    @Inject(forwardRef(() => CrmService))
    private crmService: CrmService,
    @Inject(forwardRef(() => UsersMongoRepository))
    private usersMongoRepository: UsersMongoRepository,
    private draftUsersRepository: DraftUsersMongoRepository,
    private clubRepository: ClubRepository,
    private teamsRepository: TeamsMongoRepository,
    private usersFirebaseService: UsersFirebaseService,
    private usersBigQueryService: UsersBigQueryService,
  ) { }

  async getUserAdmin() {
    let resp = await db
      .collection('users')
      .where(
        'account.email',
        '==',
        process.env.ACCOUNT_ADMIN || 'admin@zporter.co',
      )
      .where('type', '==', UserTypes.PLAYER)
      .get();

    if (resp.docs.length > 0) {
      return resp.docs[0].data();
    }

    resp = await db
      .collection('users')
      .where(
        'account.email',
        '==',
        process.env.ACCOUNT_ADMIN || 'admin@zporter.co',
      )
      .where('type', '==', UserTypes.COACH)
      .get();

    if (resp.docs.length > 0) {
      return resp.docs[0].data();
    }
  }

  async getListUsers(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
  ) {
    const { startAfter } = getListContactQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.usersBigQueryService.getListUsers(
      currentUserId,
      getListContactQuery,
    );
  }
  async getListUsersForListContact(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
  ) {
    const { startAfter } = getListContactQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.usersBigQueryService.getListUsers(
      currentUserId,
      getListContactQuery,
    );

    const { data, count } = result;
    if (data && count) {
      return commonPagination(getListContactQuery, data, count);
    }
    return result;
  }

  async askForReviews(
    currentUserId: string,
    askForReviewsDto: AskForReviewsDto,
  ) {
    const { categoryReview, coachIds, teamId, playerNotedAt } =
      askForReviewsDto;

    const categoriesReview = [
      {
        category: CategoryReview.SKILL_UPDATES,
        notificationType: NotificationType.ASK_FOR_REVIEW_SKILL_UPDATES,
      },
      {
        category: CategoryReview.DEVELOPMENT_TALK,
        notificationType: NotificationType.ASK_FOR_REVIEW_DEVELOPMENT_TALK,
      },
    ];

    const userInfo = await mappingUserInfoById(currentUserId);

    const sendNotification = coachIds.map(async (coachId) => {
      const coachInfo = await mappingUserInfoById(coachId);

      const payload = new CreateNotificationDto();
      payload.senderId = userInfo.userId;
      payload.receiverId = coachInfo.userId;
      payload.token = coachInfo.fcmToken;
      payload.largeIcon = userInfo.faceImage;
      payload.username = userInfo.username;
      payload.title = `Ask for reviews`;
      payload.notificationType = categoriesReview.find(
        ({ category }) => category === categoryReview,
      ).notificationType;
      payload.userType = userInfo.type;

      if (teamId) {
        const teamInfo = await this.teamsService.findOne(teamId);

        payload.others = {
          teamId,
          teamInfo: JSON.stringify(teamInfo),
        };
      }

      if (playerNotedAt) {
        payload.others = {
          ...payload.others,
          playerNotedAt,
        };
      }

      payload.others = {
        ...payload.others,
        fullName: userInfo.firstName + ' ' + userInfo.lastName,
      };

      await this.notificationsService.sendMulticastNotification(payload);
    });

    await Promise.all(sendNotification);

    return 'success';
  }

  async checkPermission(currentUserId: string, userRoles: UserTypes[]) {
    const userRef = await db.collection('users').doc(currentUserId).get();

    if (!userRoles.includes(userRef.data()?.type)) {
      return false;
    }

    return true;
  }

  async updatePlayerSkills(
    coachId: string,
    playerId: string,
    coachUpdatePlayerSkillsDto: CoachUpdatePlayerSkillsDto,
  ) {
    const checkPermission = await this.checkPermission(coachId, [
      UserTypes.COACH,
    ]);

    const [coachRef, playerRef] = await Promise.all([
      db.collection('users').doc(coachId).get(),
      db.collection('users').doc(playerId).get(),
    ]);

    if (!coachRef.exists) {
      throw new HttpException('COACH NOT FOUND', HttpStatus.NOT_FOUND);
    }

    if (!playerRef.exists) {
      throw new HttpException('PLAYER NOT FOUND', HttpStatus.NOT_FOUND);
    }

    const coachClubId = coachRef.data()?.coachCareer?.clubId;
    const playerClubId = playerRef.data()?.playerCareer?.clubId;

    if (!checkPermission || coachClubId !== playerClubId) {
      throw new HttpException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    await db
      .collection('users')
      .doc(playerId)
      .set(
        {
          skillsUpdatedByCoach: {
            ...JSON.parse(JSON.stringify(coachUpdatePlayerSkillsDto)),
            coachId,
          },
        },
        { merge: true },
      );

    return ResponseMessage.User.UPDATED_PLAYER_DATA;
  }

  async changeUserPresenceStatus(
    currentUserId: string,
    userPresenceQuery: UserPresenceQuery,
  ) {
    const { status } = userPresenceQuery;

    await db
      .collection('users')
      .doc(currentUserId)
      .set(
        {
          isOnline: status.toString() === 'true' ? true : false,
          lastActive: +moment.utc().format('x'),
        },
        { merge: true },
      );
  }

  async findAllV2(searchUserDto: SearchUserDto) {
    const { name, limit: limitFromDto, startAfter: page } = searchUserDto;

    const limit = limitFromDto > 1000 ? 1000 : limitFromDto;

    const nameQuery = name ? name.normalize('NFC') : 'a'.normalize('NFC');

    const users = await this.userModel.aggregate([
      {
        $search: {
          index: 'users_indexes_full_text_search',
          text: {
            query: `${nameQuery}`,
            path: ['profile.firstName', 'profile.lastName'],
            fuzzy: {},
          },
        },
      },
      {
        $project: {
          _id: 0,
          profile: 1,
          playerCareer: 1,
          media: 1,
          username: 1,
          roleId: 1,
          type: 1,
          userId: 1,
          score: { $meta: 'searchScore' },
        },
      },
      { $skip: +(page * limit) },
      { $limit: +limit },
    ]);

    const results = users.map((user) => {
      return {
        birthCountry: user?.profile?.birthCountry,
        firstName: user?.profile?.firstName,
        lastName: user?.profile?.lastName,
        username: user?.username || '',
        city: user?.profile?.city,
        favoriteRoles: user?.playerCareer?.favoriteRoles || [],
        currentTeams: user?.playerCareer?.currentTeams || [],
        faceImage: user?.media?.faceImage
          ? user?.media?.faceImage
          : process.env.DEFAULT_IMAGE,
        type: user?.type,
        userId: user?.userId,
        clubName: user?.playerCareer?.contractedClub?.clubName || 'N/A',
      };
    });

    return results;
  }

  async findAll(searchUserDto: SearchUserDto) {
    const { name, limit, startAfter } = searchUserDto;

    const pattern = /([\!\*\+\-\=\<\>\&\|\(\)\[\]\{\}\^\~\?\:\\/"])/g;

    const searchQuery = name.replace(pattern, '\\$1');

    const params: Search<RequestBody<Record<string, any>>> = {
      index: 'users',
      body: {
        query: {
          query_string: {
            query: `*${searchQuery}*`,
            fields: ['profile.firstName', 'profile.lastName'],
          },
        },
      },
    };

    if (!startAfter) {
      params['size'] = limit;
    }

    if (startAfter) {
      params['size'] = limit;
      params['from'] = startAfter;
    }

    if (limit > 10000) {
      params['size'] = 10000;
    }

    const searchRes = await elasticClient.search(params);

    const hits = searchRes.body.hits.hits;

    const gettingUserClubAndTeamPromises = hits.map(async (hit: any) => {
      return await mappingUserInfoById(hit._id);
      // let clubData: any;

      // if (hit._source?.playerCareer?.clubId) {
      //   const clubDoc = await db
      //     .collection('clubs')
      //     .doc(hit._source?.playerCareer?.clubId)
      //     .get();
      //   clubData = clubDoc.data();
      // }

      // const currentTeams = await this.teamsService.mappingTeamNamesInfoByUserId(
      //   hit._id,
      // );

      // const userHit = {
      //   birthCountry: hit._source?.profile?.birthCountry,
      //   firstName: hit._source?.profile?.firstName,
      //   city: hit._source?.profile?.city,
      //   favoriteRoles: hit._source?.playerCareer?.favoriteRoles || [],
      //   currentTeams: currentTeams,
      //   lastName: hit._source?.profile?.lastName,
      //   faceImage: hit._source?.media?.faceImage
      //     ? hit._source?.media?.faceImage
      //     : process.env.DEFAULT_IMAGE,
      //   username: hit._source?.username || '',
      //   type: hit._source?.type,
      //   userId: hit._id,
      //   clubName: clubData?.clubName || 'N/A',
      // };

      // return userHit;
    });

    const searchResults = await Promise.all(gettingUserClubAndTeamPromises);

    const sortedByAge = searchResults.sort((a: any, b: any) =>
      a?.firstName?.localeCompare(b?.firstName),
    );

    return sortedByAge;
  }

  async getUserIdsSameAge(userFlippingQuery: UserFlippingQueryDto) {
    const users = [];

    const { userType, birthDay } = userFlippingQuery;

    const usersRef = await db
      .collection('users')
      .where('type', '==', userType)
      .where('account.isActive', '==', true)
      .get();

    const currentUserAge = moment(birthDay).format('YYYY');
    usersRef.forEach((doc) => {
      const userAge = moment(doc.data()?.profile?.birthDay).format('YYYY');
      if (currentUserAge === userAge) {
        users.push({
          userId: doc.id,
          type: doc.data().type,
          createdAt: doc.data()?.account?.createdAt,
          updatedAt: doc.data().updatedAt,
        });
      }
    });

    return users;
  }

  async getUserIdsSameCity(userFlippingQuery: UserFlippingQueryDto) {
    const users = [];

    const { userType, city: currentUserCity } = userFlippingQuery;

    const usersRef = await db
      .collection('users')
      .where('type', '==', userType)
      .where('account.isActive', '==', true)
      .get();

    usersRef.forEach((doc) => {
      const userCity = doc.data()?.profile?.city;

      if (currentUserCity === userCity) {
        users.push({
          userId: doc.id,
          type: doc.data().type,
          createdAt: doc.data()?.account?.createdAt,
          updatedAt: doc.data().updatedAt,
        });
      }
    });

    return users;
  }

  async getUserIdsSameCountry(userFlippingQuery: UserFlippingQueryDto) {
    const users = [];

    const { userType, country: currentUserCountry } = userFlippingQuery;

    const usersRef = await db
      .collection('users')
      .where('type', '==', userType)
      .where('account.isActive', '==', true)
      .get();

    usersRef.forEach((doc) => {
      const userCountry = doc.data()?.settings?.country?.region;

      if (currentUserCountry === userCountry) {
        users.push({
          userId: doc.id,
          type: doc.data().type,
          createdAt: doc.data()?.account?.createdAt,
          updatedAt: doc.data().updatedAt,
        });
      }
    });

    return users;
  }

  async getListPlayerIdsSameTeam(
    currentUserId: string,
    userFlippingQuery: UserFlippingQueryDto,
  ) {
    const players = [];

    const { acceptedTeamIds } = userFlippingQuery;

    if (!acceptedTeamIds.length) {
      return [];
    }

    acceptedTeamIds.map(async (teamId) => {
      const memberIds = await this.teamsService.getAllMemberIds(
        currentUserId,
        teamId,
      );

      if (memberIds.length) {
        memberIds.map(async (memberId) => {
          const userInfo = await mappingUserInfoById(memberId);
          if (userInfo) {
            players.push({
              userId: userInfo.userId,
              type: userInfo.type,
              createdAt: userInfo.createdAt,
              updatedAt: userInfo.updatedAt,
            });
          }
        });
      }
    });

    return players;
  }

  async checkRelationship(currentUserId: string, userIdQuery: string) {
    let isFriendmate = false;
    let isTeammate = false;

    isFriendmate = await this.friendsService.checkFriendRelationship(
      currentUserId,
      userIdQuery,
    );

    if (isFriendmate) {
      return {
        isRelationship: true,
      };
    }

    const result = await this.userModel.aggregate([
      {
        $match: {
          userId: { $in: [currentUserId, userIdQuery] },
        },
      },
      {
        $group: {
          _id: 0,
          user1: { $first: '$teamIds' },
          user2: { $last: '$teamIds' },
        },
      },
      {
        $project: {
          userId: 1,
          teamIds: 1,
          commonTeams: { $setIntersection: ['$user1', '$user2'] },
        },
      },
    ]);

    isTeammate = result[0].commonTeams.length > 0 ? true : false;

    return {
      isRelationship: isTeammate,
    };
  }

  async getListUsersByQuery(queryBuilder: QueryBuilder, currentUserId: string) {
    const { query } = queryBuilder;

    if (query === Query.TEAM) {
      const { data } = await this.teamsService.getListTeammates(currentUserId, {
        limit: 10,
        startAfter: 1,
        tab: null,
      });

      return data.sort((a: any, b: any) => b.isOnline - a.isOnline);
    }

    if (query === Query.FRIEND) {
      const getListFriendQuery: GetListRelationshipsQuery = {
        limit: 10,
        startAfter: 1,
        status: Status.ACCEPTED,
        type: TypeRequest.FRIEND,
      };

      const { data } = (await this.friendsService.getListRelationships(
        currentUserId,
        getListFriendQuery,
      )) as ResponsePagination<UserInfoDto>;

      return data.sort((a: any, b: any) => b.isOnline - a.isOnline);
    }
  }

  async getUserRoles(uid: string): Promise<UserAccountRole[]> {
    const accounts = [];

    const userDocs = await db.collection('users').where('uid', '==', uid).get();

    if (userDocs.empty) {
      return [];
    }

    userDocs.forEach((doc) => {
      const userData = doc.data();

      const account: UserAccountRole = {
        roleId: doc.id,
        firstName: userData.profile?.firstName || 'firstName',
        lastName: userData.profile?.lastName || 'lastName',
        username: userData.username || 'username',
        faceImageUrl: userData.media?.faceImage || 'faceImage',
        role: userData.type,
        position: '?',
      };

      if (account.role === UserTypes.COACH) {
        account.position = userData?.coachCareer.role as string;
      } else if (account.role === UserTypes.PLAYER) {
        account.position = userData?.playerCareer.favoriteRoles[0] as string;
      } else if (account.role === UserTypes.SUPPORTER) {
        account.position = 'Supporter';
      }

      accounts.push(account);
    });

    return accounts;
  }

  async getUserBalance(userId: string): Promise<any> {
    const userDoc = await db.collection('balance').doc(userId).get();
    const userData = userDoc.data();

    return userData;
  }
  async getCoachProfile(userId: string) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userDoc.data();

    if (userData.type !== UserTypes.COACH) {
      throw new HttpException(
        ResponseMessage.Common.FORBIDDEN_RESOURCE,
        HttpStatus.FORBIDDEN,
      );
    }

    delete userData?.health?.fatherHeight;
    delete userData?.health?.motherHeight;

    // quick fix coachCareer model response, this issue need to fix in the future
    if (userData?.coachCareer) {
      if (
        !userData.coachCareer?.acceptedTeamIds ||
        (typeof userData.coachCareer.acceptedTeamIds === 'object' &&
          !Array.isArray(userData.coachCareer.acceptedTeamIds))
      ) {
        userData.coachCareer.acceptedTeamIds = [];
      }
      if (
        !userData.coachCareer?.pendingTeamIds ||
        (typeof userData.coachCareer.pendingTeamIds === 'object' &&
          !Array.isArray(userData.coachCareer.pendingTeamIds))
      ) {
        userData.coachCareer.pendingTeamIds = [];
      }
      if (
        !userData.coachCareer?.teamIds ||
        (typeof userData.coachCareer.teamIds === 'object' &&
          !Array.isArray(userData.coachCareer.teamIds))
      ) {
        userData.coachCareer.teamIds = [];
      }

      const currentTeams = await this.teamsService.mappingTeamInfoByUserId(
        userId,
      );

      userData.coachCareer.currentTeams = currentTeams;
    }

    const result = {
      userId: userDoc.id,
      ...userData,
    };

    return result;
  }

  async getSupporterProfile(userId: string) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userDoc.data();

    if (userData.type !== UserTypes.SUPPORTER) {
      throw new HttpException(
        ResponseMessage.Common.FORBIDDEN_RESOURCE,
        HttpStatus.FORBIDDEN,
      );
    }

    const favoriteClubPromises =
      userData?.supporterFootball?.favoriteClubs
        ?.filter((e) => e)
        .map(
          async (clubId: string) => await this.clubService.getClubById(clubId),
        ) || [];

    const favoritePlayerPromises = userData?.supporterFootball?.favoritePlayers
      ?.filter((e) => e)
      .map(async (id: string) => {
        const user = await mappingUserInfoById(id);
        if (user) {
          return {
            userId: user.userId,
            fullName: user.fullName,
            username: user.username,
          };
        } else return null;
      });

    userData.supporterFootball.favoriteClubs = await Promise.all(
      favoriteClubPromises,
    );
    userData.supporterFootball.favoritePlayers = await Promise.all(
      favoritePlayerPromises,
    );

    delete userData?.health?.fatherHeight;
    delete userData?.health?.motherHeight;

    return userData;
  }

  async getPlayerProfile(
    userId: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userDoc.data();

    if (userData.type !== UserTypes.PLAYER) {
      throw new HttpException(
        ResponseMessage.Common.FORBIDDEN_RESOURCE,
        HttpStatus.FORBIDDEN,
      );
    }

    const currentTeams = await this.teamsService.mappingTeamInfoByUserId(
      userId,
    );

    userData.playerCareer.currentTeams = currentTeams;

    const result = {
      userId: userDoc.id,
      ...userData,
    };

    return result;
  }

  async getMyTeams(currentUserId: string, userIdQuery: string) {
    const userIdForQuery = userIdQuery ? userIdQuery : currentUserId;
    const currentTeams = await this.teamsService.mappingTeamInfoByUserId(
      userIdForQuery,
    );
    return currentTeams;
  }

  async verifyEmail(code: string): Promise<IVerifyEmail> {
    const userDoc = await db
      .collection('users')
      .where('account.verifyCode', '==', code)
      .get();
    const data = [];
    userDoc.forEach((doc) => {
      data.push({ ...doc.data(), id: doc.id });
    });
    if (moment.utc(data[0]?.account?.expiredIn) < moment.utc()) {
      throw new HttpException('Verify code is expired', HttpStatus.BAD_REQUEST);
    }
    if (Array.isArray(data) && data[0]) {
      await db.collection('users').doc(`${data[0].id}`).update({
        'account.isVerified': true,
        'account.verifyCode': '',
      });
      return {
        isVerified: true,
        bioUrl: getBioUrl({
          type: data[0]?.type,
          username: data[0]?.username as string,
          firstName: data[0]?.profile?.firstName,
          lastName: data[0]?.profile?.lastName,
        }),
      };
    }
    return {
      isVerified: false,
      bioUrl: null,
    };
  }

  async updateUserSettings(userId: string, updateUserDto: UpdateUserDto) {
    const { email, ...rest } = updateUserDto;
    const { media, profile } = rest;
    const currentUserData = await mappingUserInfoById(userId);
    const updateData = {
      updatedAt: +moment.utc().format('x'),
      account: {},
      username: currentUserData?.username,
      ...rest,
    };

    if (email) {
      await this.processingUserChangesEmail(userId, email);
      updateData.account = {
        email: email,
        isVerified: false,
      };
    } else {
      delete updateData.account;
    }

    if (media?.videoLinks?.length) {
      const videoLinks = media?.videoLinks;

      media.videoLinks = videoLinks.map((item) => {
        if (item.source === VideoLinkSources.YOUTUBE) {
          if (!item.thumbnailUrl) {
            const youtubeId = getYouTubeId(item.url);
            item.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`;
          }
        } else {
          if (!item.thumbnailUrl) {
            item.thumbnailUrl = ZPORTER_DEFAULT_IMAGE;
          }
        }
        return item;
      });
    }
    return updateData;
  }

  async updatePlayerSettingsV2(
    userId: string,
    updatePlayerSettingsDto: UpdatePlayerDto,
  ) {
    const { email, ...rest } = updatePlayerSettingsDto;

    const { playerCareer, playerSkills, profile } = rest;

    const [currentUserData, updateData] = await Promise.all([
      mappingUserInfoById(userId),
      this.updateUserSettings(userId, updatePlayerSettingsDto),
    ]);

    if (profile) {
      const newUniqueUsername = await this.generateUniqueUsername({
        userType: UserTypes.PLAYER,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        birthDay: profile?.birthDay,
      });
      updateData.username = newUniqueUsername;
    } else if (!profile) {
      delete updateData.username;
    }

    const currentClubId = currentUserData.clubId;
    const newClubId = playerCareer?.clubId;

    if (playerCareer?.clubId) {
      if (currentClubId !== newClubId) {
        await Promise.all([
          this.processingUserChangesClub(userId, newClubId),
          this.clubService.createClubTransferHistory(
            currentClubId,
            newClubId,
            userId,
          ),
        ]);

        playerCareer.teamIds = [];
      }
    }

    // handle side effects
    if (playerCareer?.teamIds) {
      const { teamIds } = playerCareer;

      const clubId = currentClubId !== newClubId ? currentClubId : newClubId;

      await this.processSettingsTeamIds(userId, teamIds, clubId);
    }

    if (playerSkills?.specialityTags?.length) {
      await this.createTags([...playerSkills.specialityTags]);
    }
    await Promise.all([
      this.setUserData(userId, updateData),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    return ResponseMessage.User.UPDATE_SETTINGS_SUCCESS;
  }

  async updateCoachSettingsV2(
    userId: string,
    updateCoachSettingsDto: UpdateCoachDto,
  ) {
    const { email, ...rest } = updateCoachSettingsDto;

    const { coachCareer, coachSkills, profile } = rest;

    const [currentUserData, updateData] = await Promise.all([
      mappingUserInfoById(userId),
      this.updateUserSettings(userId, updateCoachSettingsDto),
    ]);

    if (profile) {
      const newUniqueUsername = await this.generateUniqueUsername({
        userType: UserTypes.COACH,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        birthDay: profile?.birthDay,
      });

      updateData.username = newUniqueUsername;
      updateData.profile.fullName = createFullnameArray({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    } else if (!profile) {
      delete updateData.username;
    }

    const currentClubId = currentUserData.clubId;
    const newClubId = coachCareer?.clubId;

    if (coachCareer?.clubId) {
      if (currentClubId !== newClubId) {
        await Promise.all([
          this.processingUserChangesClub(userId, newClubId),
          this.clubService.createClubTransferHistory(
            currentClubId,
            newClubId,
            userId,
          ),
        ]);

        coachCareer.teamIds = [];
      }
    }

    // handle side effects
    if (coachCareer?.teamIds) {
      const { teamIds } = coachCareer;

      const clubId = currentClubId !== newClubId ? currentClubId : newClubId;

      await this.processSettingsTeamIds(userId, teamIds, clubId);
    }

    if (coachSkills?.specialityTags?.length) {
      await this.createTags([...coachSkills.specialityTags]);
    }

    await Promise.all([
      this.setUserData(userId, updateData),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    return ResponseMessage.User.UPDATE_SETTINGS_SUCCESS;
  }

  async updateSupporterSettingsV2(
    userId: string,
    updateSupporterSettingsDto: UpdateSupporterDto,
  ) {
    const { email, ...rest } = updateSupporterSettingsDto;

    const { profile } = rest;

    const updateData = await this.updateUserSettings(
      userId,
      updateSupporterSettingsDto,
    );

    if (profile) {
      const newUniqueUsername = await this.generateUniqueUsername({
        userType: UserTypes.SUPPORTER,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        birthDay: profile?.birthDay,
      });

      updateData.username = newUniqueUsername;
      updateData.profile.fullName = createFullnameArray({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    } else if (!profile) {
      delete updateData.username;
    }

    await Promise.all([
      this.setUserData(userId, updateData),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    return ResponseMessage.User.UPDATE_SETTINGS_SUCCESS;
  }

  async updatePlayerSettings(
    uid: string,
    userId: string,
    updatePlayerSettingsDto: UpdatePlayerDto,
  ) {
    const { email, ...rest } = updatePlayerSettingsDto;

    const { media, playerCareer, playerSkills, profile } = rest;

    const currentUserData = await mappingUserInfoById(userId);

    const updateData = {
      updatedAt: +moment.utc().format('x'),
      account: {},
      username: currentUserData?.username,
      ...rest,
    };

    if (email) {
      await this.processingUserChangesEmail(uid, email);
      updateData.account = {
        email: email,
        isVerified: false,
      };
    } else {
      delete updateData.account;
    }

    if (profile) {
      const newUniqueUsername = await this.generateUniqueUsername({
        userType: UserTypes.PLAYER,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        birthDay: profile?.birthDay,
      });
      updateData.username = newUniqueUsername;

      const { currentHubspotId } = await mappingUserInfoById(userId);

      const properties = {
        firstname: profile.firstName,
        lastname: profile.lastName,
        email: email,
        user_id: uid,
        user_type: UserTypes.PLAYER,
        phone: profile.phone,
        date_of_birth: moment.utc(profile.birthDay).format('LL'),
        city: profile.city,
      };
      const ContactObject = { properties };

      if (currentHubspotId) {
        try {
          await hubspotClient.crm.contacts.basicApi.update(
            currentHubspotId,
            ContactObject,
          );
        } catch (error) {
          error.message === 'Contact already exists. Existing ID: 64351'
            ? console.error(JSON.stringify(error.response, null, 2))
            : console.error(error);
        }
      }
    } else if (!profile) {
      delete updateData.username;
    }

    if (media?.videoLinks?.length) {
      const videoLinks = media?.videoLinks;

      media.videoLinks = videoLinks.map((item) => {
        if (item.source === VideoLinkSources.YOUTUBE) {
          if (!item.thumbnailUrl) {
            const youtubeId = getYouTubeId(item.url);
            item.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`;
          }
        } else {
          if (!item.thumbnailUrl) {
            item.thumbnailUrl = ZPORTER_DEFAULT_IMAGE;
          }
        }
        return item;
      });
    }

    const currentClubId = currentUserData.clubId;
    const newClubId = playerCareer?.clubId;

    if (playerCareer?.clubId) {
      if (currentClubId !== newClubId) {
        await Promise.all([
          this.processingUserChangesClub(userId, newClubId),
          this.clubService.createClubTransferHistory(
            currentClubId,
            newClubId,
            userId,
          ),
        ]);

        playerCareer.teamIds = [];
      }
    }

    // handle side effects
    if (playerCareer?.teamIds) {
      const { teamIds } = playerCareer;

      const clubId = currentClubId !== newClubId ? currentClubId : newClubId;

      await this.processSettingsTeamIds(userId, teamIds, clubId);
    }

    if (playerSkills?.specialityTags?.length) {
      await this.createTags([...playerSkills?.specialityTags]);
    }

    await this.setUserData(userId, updateData);

    await this.usersFirebaseService.synchronizeUserInfo(userId);

    return ResponseMessage.User.UPDATE_SETTINGS_SUCCESS;
  }

  async processSettingsTeamIds(
    userId: string,
    teamIds: string[],
    clubId: string,
  ) {
    const [curAcceptedAndPendingReq, curAcceptedReq, curPendingReq] =
      await Promise.all([
        this.teamsService.getListTeamIdsByUserId(userId, [
          JoinTeamStatus.ACCEPTED,
          JoinTeamStatus.PENDING,
        ]),
        this.teamsService.getListTeamIdsByUserId(userId),
        this.teamsService.getListTeamIdsByUserId(userId, [
          JoinTeamStatus.PENDING,
        ]),
        ,
      ]);

    // get new request to join team not included in curAcceptedAndPendingReq
    const requestJoinTeamIds = teamIds.filter(
      (teamId) => !curAcceptedAndPendingReq.includes(teamId),
    );

    if (requestJoinTeamIds.length) {
      await this.processUserRequestJoinTeams(
        userId,
        requestJoinTeamIds,
        clubId,
      );
    }

    // check current teamIds after changing -> remains accepted teamIds
    const remainsAcceptedTeamIds = teamIds.filter((teamId) =>
      curAcceptedReq.includes(teamId),
    );

    // check teamIds that are no longer included in curAcceptedReq -> leave teamIds
    const leaveTeamIds = curAcceptedReq.filter(
      (teamId) => !remainsAcceptedTeamIds.includes(teamId),
    );

    const cancelReqPendingTeamIds = curPendingReq.filter(
      (teamId) => !teamIds.includes(teamId),
    );

    if (leaveTeamIds.length) {
      await this.processUserLeaveTeams(userId, leaveTeamIds, clubId);
    }

    if (remainsAcceptedTeamIds.length) {
      await this.setUserData(userId, {
        teamIds: remainsAcceptedTeamIds,
      });
    }

    if (cancelReqPendingTeamIds.length) {
      const removingJoinRequest = cancelReqPendingTeamIds.map(
        async (teamId) => {
          await this.teamsService.cancelRequestJoinTeam(userId, teamId);
        },
      );

      await Promise.all(removingJoinRequest);
    }

    return this.teamsService.updateTeamIdsInfo(userId);
  }

  async processUserLeaveTeams(
    userId: string,
    leaveTeamIds: string[],
    clubId: string,
  ) {
    const teams = await db
      .collection('teams')
      .where(firebase.firestore.FieldPath.documentId(), 'in', leaveTeamIds)
      .get();
    if (teams.docs.length !== leaveTeamIds.length) {
      throw new HttpException(
        ResponseMessage.Team.NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }

    await Promise.all([
      leaveTeamIds.map(async (teamId) => {
        // This for issue #ZPOWEB-1249
        await this.teamsService.leaveTeam(userId, teamId);
      }),
      this.sendNotificationLeavingTeam(userId, leaveTeamIds),
    ]);
  }

  async processingUserChangesClub(newClubId: string, userId: string) {
    return db
      .collection('users')
      .doc(userId)
      .set(
        {
          playerCareer: {
            clubId: newClubId,
            contractedFrom: '',
            contractedUntil: '',
          },
        },
        { merge: true },
      );
  }

  async sendNotificationLeavingTeam(currentUserId: string, teamIds: string[]) {
    const userInfo = await mappingUserInfoById(currentUserId);

    if (teamIds.length) {
      const sendNotiLeaveTeam = teamIds.map(async (teamId) => {
        const memberIds = await this.teamsService.getAllMemberIds(
          currentUserId,
          teamId,
        );

        if (memberIds.length) {
          const mappingUserInfoAndSendNotification = memberIds.map(
            async (memberId) => {
              const memberInfo = await mappingUserInfoById(memberId);

              const payload = new CreateNotificationDto();

              payload.token = memberInfo.fcmToken as string[];
              payload.largeIcon = userInfo.faceImage as string;
              payload.username = userInfo.username as string;
              payload.title =
                `#${userInfo.username} has left the team.` as string;
              payload.notificationType = NotificationType.LEAVE_TEAM;
              payload.senderId = currentUserId;
              payload.receiverId = memberId as string;
              payload.userType = userInfo.type as UserTypes;
              payload.others = {
                teamId,
              };

              await this.notificationsService.sendMulticastNotification(
                payload,
              );
            },
          );

          await Promise.all(mappingUserInfoAndSendNotification);
        }
      });

      await Promise.all(sendNotiLeaveTeam);
    }
  }

  async processingUserChangesEmail(uid: string, email: string) {
    const existingEmail = await db
      .collection('users')
      .where('account.email', '==', email)
      .get();

    if (!existingEmail.empty) {
      throw new HttpException(
        ResponseMessage.Email.EMAIL_ALREADY_REGISTERED,
        HttpStatus.BAD_REQUEST,
      );
    }

    firebase.auth().updateUser(uid, {
      email: email,
    });

    await sendVerifyEmail(email);
  }

  async updateCoachSettings(
    userId: string,
    updateCoachSettingsDto: UpdateCoachDto,
  ) {
    const { email, ...rest } = updateCoachSettingsDto;

    const currentUserData = await mappingUserInfoById(userId);

    const updateData = {
      updatedAt: +moment.utc().format('x'),
      account: {},
      username: currentUserData?.username,
      ...rest,
    };

    if (email) {
      await this.processingUserChangesEmail(userId, email);
      updateData.account = {
        email: email,
        isVerified: false,
      };
    } else {
      delete updateData.account;
    }

    const { media, coachCareer, coachSkills, profile } = rest;

    if (profile) {
      const newUniqueUsername = await this.generateUniqueUsername({
        userType: UserTypes.COACH,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        birthDay: profile?.birthDay,
      });

      updateData.username = newUniqueUsername;
      updateData.profile.fullName = createFullnameArray({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });

      const { currentHubspotId } = await mappingUserInfoById(userId);

      const properties = {
        firstname: profile.firstName,
        lastname: profile.lastName,
        email: email,
        user_type: UserTypes.COACH,
        phone: profile.phone,
        date_of_birth: moment.utc(profile.birthDay).format('LL'),
        city: profile.city,
      };
      const ContactObject = { properties };

      if (currentHubspotId) {
        try {
          await hubspotClient.crm.contacts.basicApi.update(
            currentHubspotId,
            ContactObject,
          );
        } catch (error) {
          error.message === 'Contact already exists. Existing ID: 64351'
            ? console.error(JSON.stringify(error.response, null, 2))
            : console.error(error);
        }
      }
    } else if (!profile) {
      delete updateData.username;
    }

    if (media?.videoLinks?.length) {
      const videoLinks = media?.videoLinks;

      media.videoLinks = videoLinks.map((item) => {
        if (item.source === VideoLinkSources.YOUTUBE) {
          if (!item.thumbnailUrl) {
            const youtubeId = getYouTubeId(item.url);
            item.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`;
          }
        } else {
          if (!item.thumbnailUrl) {
            item.thumbnailUrl = ZPORTER_DEFAULT_IMAGE;
          }
        }
        return item;
      });
    }

    const currentClubId = currentUserData.clubId;
    const newClubId = coachCareer?.clubId;

    if (coachCareer?.clubId) {
      if (currentClubId !== newClubId) {
        await Promise.all([
          this.processingUserChangesClub(userId, newClubId),
          this.clubService.createClubTransferHistory(
            currentClubId,
            newClubId,
            userId,
          ),
        ]);

        coachCareer.teamIds = [];
      }
    }

    // handle side effects
    if (coachCareer?.teamIds) {
      const { teamIds } = coachCareer;

      const clubId = currentClubId !== newClubId ? currentClubId : newClubId;

      await this.processSettingsTeamIds(userId, teamIds, clubId);
    }

    if (coachSkills?.specialityTags?.length) {
      await this.createTags([...coachSkills?.specialityTags]);
    }

    await this.setUserData(userId, updateData);

    await this.usersFirebaseService.synchronizeUserInfo(userId);

    return ResponseMessage.User.UPDATE_SETTINGS_SUCCESS;
  }

  async updateSupporterSettings(
    userId: string,
    updateSupporterSettingsDto: UpdateSupporterDto,
  ) {
    const { email, ...rest } = updateSupporterSettingsDto;

    const currentUserData = await mappingUserInfoById(userId);

    const updateData = {
      updatedAt: +moment.utc().format('x'),
      account: {},
      username: currentUserData?.username,
      ...rest,
    };

    if (email) {
      await this.processingUserChangesEmail(userId, email);
      updateData.account = {
        email: email,
        isVerified: false,
      };
    } else {
      delete updateData.account;
    }

    const { media, profile } = rest;

    if (profile) {
      const newUniqueUsername = await this.generateUniqueUsername({
        userType: UserTypes.SUPPORTER,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        birthDay: profile?.birthDay,
      });

      updateData.username = newUniqueUsername;
      updateData.profile.fullName = createFullnameArray({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });

      const { currentHubspotId } = await mappingUserInfoById(userId);

      const properties = {
        firstname: profile.firstName,
        lastname: profile.lastName,
        email: email,
        phone: profile.phone,
        date_of_birth: moment.utc(profile.birthDay).format('LL'),
        city: profile.city,
      };
      const ContactObject = { properties };

      if (currentHubspotId) {
        try {
          await hubspotClient.crm.contacts.basicApi.update(
            currentHubspotId,
            ContactObject,
          );
        } catch (error) {
          error.message === 'Contact already exists. Existing ID: 64351'
            ? console.error(JSON.stringify(error.response, null, 2))
            : console.error(error);
        }
      }
    } else if (!profile) {
      delete updateData.username;
    }

    if (media?.videoLinks?.length) {
      const videoLinks = media?.videoLinks;

      media.videoLinks = videoLinks.map((item) => {
        if (item.source === VideoLinkSources.YOUTUBE) {
          if (!item.thumbnailUrl) {
            const youtubeId = getYouTubeId(item.url);
            item.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`;
          }
        } else {
          if (!item.thumbnailUrl) {
            item.thumbnailUrl = ZPORTER_DEFAULT_IMAGE;
          }
        }
        return item;
      });
    }

    await this.setUserData(userId, updateData);

    await this.usersFirebaseService.synchronizeUserInfo(userId);

    return ResponseMessage.User.UPDATE_SETTINGS_SUCCESS;
  }

  async createFirstUserDocumentId(
    uid: string,
    roleId: string,
    email?: string,
    phone?: string,
  ) {
    const verifyCode = uuidv4();

    await db
      .collection('users')
      .doc(roleId)
      .set({
        account: {
          email: email || null,
          phone: phone || null,
          isActive: false,
          isVerified: false,
          verifyCode,
          createdAt: +moment.utc().format('x'),
          expiredIn: +moment.utc().add(7, 'days').format('x'),
        },
        userId: roleId,
        uid: uid,
      });

    if (email) {
      const dynamic_template_data = {
        verifyUrl: `${process.env.BACKEND_URL}/users/verify-email/${verifyCode}`,
      };

      // const payload = new SendEmailDto();

      // payload.email = email;
      // payload.dynamic_template_data = dynamic_template_data;
      // payload.subject = '[Zporter] Please verify your email address';
      // payload.templateId =
      //   process.env.SENDGRID_VERIFY_TEMPLATE_ID ||
      //   'd-ca58ac7701004d2f9c29169f2d87279c';

      // await sendEmailTemplate(payload);
      await this.sendEmailService.sendVerifyEmail({
        email,
        dynamic_template_data,
      });
    }

    return roleId;
  }

  async createFirstUserDocumentIdV2(
    roleId: string,
    email?: string,
    phone?: string,
  ) {
    const verifyCode = uuidv4();

    await db
      .collection('users')
      .doc(roleId)
      .set({
        account: {
          email: email || null,
          phone: phone || null,
          isActive: false,
          isVerified: false,
          verifyCode,
          createdAt: +moment.utc().format('x'),
          expiredIn: +moment.utc().add(7, 'days').format('x'),
        },
        userId: roleId,
      });

    return roleId;
  }

  async createAnotherUserDocumentId(
    uid: string,
    roleId: string,
    email?: string,
    phone?: string,
  ) {
    await db
      .collection('users')
      .doc(roleId)
      .set({
        account: {
          email: email || null,
          phone: phone || null,
          isActive: false,
          isVerified: true,
          verifyCode: '',
          createdAt: +moment.utc().format('x'),
          expiredIn: +moment.utc().add(7, 'days').format('x'),
        },
        userId: roleId,
        uid: uid,
      });

    return roleId;
  }

  async createAnotherUserDocumentIdV2(
    roleId: string,
    email?: string,
    phone?: string,
  ) {
    await db
      .collection('users')
      .doc(roleId)
      .set({
        status: USER_STATUS.DRAFT,
        account: {
          email: email || null,
          phone: phone || null,
          isActive: false,
          isVerified: true,
          verifyCode: '',
          createdAt: +moment.utc().format('x'),
          expiredIn: +moment.utc().add(7, 'days').format('x'),
        },
        userId: roleId,
      });

    return roleId;
  }

  async getUserDocumentId(
    uid: string,
    roleId: string,
    type: UserTypes,
    email?: string,
    phone?: string,
  ): Promise<string | null> {
    const userRoles = await this.getUserRoles(uid);

    // never signed up for an account
    if (!userRoles.length) {
      return this.createFirstUserDocumentId(uid, roleId, email, phone);
    }

    const roles = userRoles.map((role) => role.role);

    // already signed up with specified profile type
    if (roles.includes(type)) {
      throw new HttpException(
        `You are already an user with type ${type}`,
        HttpStatus.BAD_REQUEST,
      );
    } else {
      // already signed up account but never created the profile type specified
      return this.createAnotherUserDocumentId(uid, roleId, email, phone);
    }
  }

  async getUserDocumentIdV2(
    roleId: string,
    email?: string,
    phone?: string,
  ): Promise<string | null> {
    // already signed up account but never created the profile type specified
    return this.createAnotherUserDocumentIdV2(roleId, email, phone);
  }

  async supporterSignUp(
    uid: string,
    createSupporterDto: CreateSupporterDto,
    email?: string,
    phone?: string,
  ) {
    const { profile, roleId } = createSupporterDto;

    createSupporterDto.settings.country = profile.birthCountry;

    profile.fullName = createFullnameArray({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    const generateUsernameDto = {
      userType: UserTypes.SUPPORTER,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDay: profile.birthDay,
    };

    const [userId, uniqueUsername] = await Promise.all([
      this.getUserDocumentId(uid, roleId, UserTypes.SUPPORTER, email, phone),
      this.generateUniqueUsername(generateUsernameDto),
    ]);

    await this.setUserData(userId, {
      account: {
        isActive: true,
      },
      ...createSupporterDto,
      username: uniqueUsername,
      type: UserTypes.SUPPORTER,
      updatedAt: +moment.utc().format('x'),
      circleCompleted: 50, // always be 50 when created an account
      isOnline: true,
      lastActive: +moment.utc().format('x'),
    });

    //# create supporter for hubspot
    const [hubspotContact, user] = await Promise.all([
      this.createUserToHubspot(
        userId,
        profile,
        uid,
        UserTypes.SUPPORTER,
        email,
        phone,
      ),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    await this.setUserData(userId, {
      hubspotId: hubspotContact.id,
    });

    return { roleId: userId };
  }

  async adminDraftPlayerSignUp(createPlayerDto: AdminCreatePlayerDto) {
    // handle logic import club from externalClub
    if (createPlayerDto.externalClub) {
      const club = await this.clubRepository.getAll({
        clubName: createPlayerDto.externalClub.name,
        country: createPlayerDto.externalClub.country,
        limit: 1,
      });

      if (club.length > 0) {
        createPlayerDto.club = club[0].toObject();
      } else {
        // create new club
        const newClub = await this.clubService.createClub(null, null, {
          clubName: createPlayerDto.externalClub.name,
          country: createPlayerDto.externalClub.country,
          logoUrl: createPlayerDto.externalClub.logoUrl,
        });

        createPlayerDto.club = newClub;
      }
    }

    let draftPlayer;
    if (createPlayerDto._id) {
      draftPlayer = await this.draftUsersRepository.findById(
        createPlayerDto._id,
      );
    }

    const payload: any = {
      ...createPlayerDto,
      _id: createPlayerDto._id || new mongoose.Types.ObjectId().toString(),
      creatorId: null,
      roleId: draftPlayer?.roleId || uuidv4(),
      secret: draftPlayer?.secret || uuidv4(),
    };

    await this.draftUsersRepository.upsert(payload._id, payload);

    // if status = pending, create draft player
    // check firebase user has userId is payload.roleId
    const userInfo = await db.collection('users').doc(payload.roleId).get();
    if (payload.status === 'pending' && !userInfo.exists) {
      const payloadDraftPlayer: any = {
        health: payload.health || null,
        media: {
          faceImage: payload.faceImage || null,
          bodyImage: payload.bodyImage || null,
        },
        profile: {
          phone: payload.phone || null,
          firstName: payload.firstName || null,
          lastName: payload.lastName || null,
          birthDay: payload.birthDay || null,
          email: payload.email || null,
          parentEmail: payload.parentEmail || null,
          birthCountry: null,
          gender: payload.gender || null,
          city: payload.city || null,
        },
        playerCareer: {
          clubId: payload.club?.clubId || null,
          teamIds: payload.team?.map((team) => team.teamId) || null,
          favoriteRoles: (payload.playerRole && [payload.playerRole]) || null,
          shirtNumber: payload.shirtNumber || null,
        },
        playerSkills: {
          specialityTags: [],
          overall: {
            mental: 0,
            physics: 0,
            tactics: 0,
            technics: 0,
            leftFoot: 0,
            rightFoot: 0,
          },
          radar: {
            attacking: 0,
            defending: 0,
            dribbling: 0,
            passing: 0,
            shooting: 0,
            pace: 0,
            heading: 0,
            tackling: 0,
          },
          radar_gk: {
            vision: 0,
            communication: 0,
            ball_control: 0,
            passing: 0,
            aerial_win: 0,
            shot_dive: 0,
            agility: 0,
            reactions: 0,
          },
        },
        settings: {},
        roleId: payload.roleId,
      };
      await this.draftPlayerSignUp(payloadDraftPlayer);
    }

    // if status = pending & createPlayerDto.email is not null, send email to creator
    if (payload.status === 'pending' && payload.email) {
      await this.sendEmailService.sendDraftPlayerLink({
        email: payload.email,
        dynamic_template_data: {
          username: 'Admin',
          firstname: payload.firstName,
          lastname: payload.lastName,
          clubName: payload.club?.clubName,
          url: `${process.env.WEB_BASE_URL}/draft-profile/player/${payload.secret}`,
        },
      });
    }

    return ResponseMessage.Common.SUCCESS;
  }

  async adminGetListDraft(query: any) {
    const queryFilter = {};
    const pagination = {
      limit: query.limit || 10,
      skip: query.offset || 0,
    };
    const draftPlayers = await this.draftUsersRepository.find(
      queryFilter,
      pagination,
    );

    const newDraftPlayers = await Promise.all(
      draftPlayers.map(async (draftPlayer: any) => {
        const clubInfo =
          draftPlayer?.clubId &&
          (await this.clubRepository.getClubById(draftPlayer?.clubId));
        draftPlayer.clubInfo = clubInfo;

        const teamsInfo =
          draftPlayer?.teamIds &&
          (await this.teamsRepository.get({
            match: { teamId: draftPlayer.teamIds },
          }));
        draftPlayer.teamInfo = teamsInfo;

        return draftPlayer;
      }),
    );

    return newDraftPlayers;
  }

  async adminDeleteDraftPlayer(draftPlayerId: string) {
    await this.draftUsersRepository.delete(draftPlayerId);
    return ResponseMessage.Common.SUCCESS;
  }

  async getDraftPlayerById(draftPlayerId: string) {
    return this.draftUsersRepository.findById(draftPlayerId);
  }

  async getDraftPlayerBySecret(secret: string) {
    const draftPlayer: any = await this.draftUsersRepository.findBySecret(
      secret,
    );

    if (!draftPlayer) {
      throw new HttpException('Not found draft player', HttpStatus.NOT_FOUND);
    }

    const [clubInfo, teamInfo] = await Promise.all([
      this.clubRepository.getClubById(
        draftPlayer.payload.playerCareer.clubId || '',
      ),
      this.teamsRepository.get({
        match: { teamId: draftPlayer.payload.playerCareer.teamIds || [] },
      }),
    ]);

    draftPlayer.payload.playerCareer.club = clubInfo;
    draftPlayer.payload.playerCareer.teams = teamInfo;

    const generateUsernameDto = {
      userType: UserTypes.PLAYER,
      firstName: draftPlayer.payload.profile.firstName,
      lastName: draftPlayer.payload.profile.lastName,
      birthDay: draftPlayer.payload.profile.birthDay,
    };

    draftPlayer.payload.profile.username = await this.generateUniqueUsername(
      generateUsernameDto,
    );

    return draftPlayer;
  }

  async confirmDraftPlayer(
    secret: string,
    confirmDraftPlayerDto: ConfirmDraftPlayerDto,
  ) {
    const draftPlayer = await this.draftUsersRepository.findBySecret(secret);
    if (!draftPlayer || draftPlayer.status === 'confirmed') {
      throw new HttpException('Not found draft player', HttpStatus.NOT_FOUND);
    }

    const {
      birthDay,
      email,
      password,
      faceImage,
      bodyImage,
      cardType,
      cardImage,
    } = confirmDraftPlayerDto;

    // create firebase user
    const user = await firebase
      .auth()
      .createUser({
        email,
        password,
      })
      .catch((error) => {
        if (error?.errorInfo?.code === 'auth/email-already-exists') {
          throw new HttpException('Email already exists', HttpStatus.CONFLICT);
        }
        throw error;
      });

    // find user has userId is draftPlayer.roleId
    const userInfo = await db.collection('users').doc(draftPlayer.roleId).get();

    if (!userInfo.exists) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const userInfoData = userInfo.data();
    if (userInfoData.status !== USER_STATUS.DRAFT) {
      throw new HttpException('User is not draft', HttpStatus.CONFLICT);
    }

    // update user info
    await db.collection('users').doc(draftPlayer.roleId).update({
      status: USER_STATUS.ACTIVE,
      uid: user.uid,
    });

    // update status of draft player
    await this.draftUsersRepository.update(draftPlayer._id, {
      cardType: cardType,
      cardImage: cardImage,
      status: 'confirmed',
    });

    // send email to user creator
    const creatorInfo = await this.userModel.findOne({
      userId: draftPlayer.creatorId,
    });
    if (creatorInfo?.account?.email) {
      this.sendEmailService.sendDraftPlayerConfirmation({
        email: creatorInfo.account.email,
        dynamic_template_data: {
          username: userInfoData.username,
          url: getBioUrl({
            type: UserTypes.PLAYER,
            username: userInfoData.username,
            firstName: userInfoData.firstName,
            lastName: userInfoData.lastName,
          }),
        },
      });
    }

    return ResponseMessage.Common.SUCCESS;
  }

  async coachDraftPlayerSignUp(
    userId: string,
    createPlayerDto: CoachCreatePlayerDto,
  ) {
    const payload = {
      _id: new mongoose.Types.ObjectId().toString(),
      creatorId: userId,
      secret: uuidv4(),
      role: 'player',
      email: createPlayerDto.profile?.email || null,
      phone: createPlayerDto.profile?.phone || null,
      birthDay: createPlayerDto.profile?.birthDay || null,
      gender: null,
      firstName: createPlayerDto.profile?.firstName,
      lastName: createPlayerDto.profile?.lastName,
      country: createPlayerDto.profile?.birthCountry || null,
      city: createPlayerDto.profile?.city || null,
      club: createPlayerDto.playerCareer?.clubId
        ? { _id: createPlayerDto.playerCareer.clubId }
        : null,
      team: createPlayerDto.playerCareer?.teamIds
        ? createPlayerDto.playerCareer.teamIds.map((id) => ({ _id: id }))
        : [],
      playerRole: createPlayerDto.playerCareer?.favoriteRoles?.[0] || null,
      shirtNumber: createPlayerDto.playerCareer?.shirtNumber || null,
      payload: createPlayerDto,
    };

    await this.draftUsersRepository.upsert(payload._id, payload);

    return {
      secret: payload.secret,
      link: `${process.env.WEB_BASE_URL}/draft-profile/player/${payload.secret}`,
    };
  }

  async playerSignUp(
    uid: string,
    createPlayerDto: CreatePlayerDto,
    email?: string,
    phone?: string,
  ) {
    const { playerSkills, profile, roleId } = createPlayerDto;

    createPlayerDto.settings.country = profile.birthCountry;

    profile.fullName = createFullnameArray({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    const { teamIds, clubId } = createPlayerDto.playerCareer;

    const generateUsernameDto = {
      userType: UserTypes.PLAYER,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDay: profile.birthDay,
    };

    const [userId, uniqueUsername] = await Promise.all([
      this.getUserDocumentId(uid, roleId, UserTypes.PLAYER, email, phone),
      this.generateUniqueUsername(generateUsernameDto),
    ]);

    let acceptedTeamIds: string[] = [];

    //# fix error in empty image when sign up
    createPlayerDto.media.faceImage =
      createPlayerDto?.media?.faceImage || process.env.DEFAULT_IMAGE;
    // create user first so we can handle team update notifications
    await this.setUserData(userId, {
      account: {
        isActive: true,
      },
      ...createPlayerDto,
      username: uniqueUsername,
      type: UserTypes.PLAYER,
      updatedAt: +moment.utc().format('x'),
      circleCompleted: 50, // always be 50 when created an account
      isOnline: true,
      lastActive: +moment.utc().format('x'),
    });

    if (teamIds) {
      // copy acceptedTeamIds for save
      acceptedTeamIds = await this.teamsService.getListTeamIdsByUserId(userId);

      const requestJoinTeamIds = teamIds.filter(
        (teamId) => !acceptedTeamIds.includes(teamId),
      );

      if (requestJoinTeamIds.length) {
        await this.processUserRequestJoinTeams(
          userId,
          requestJoinTeamIds,
          clubId,
        );
      }
    }

    if (playerSkills.specialityTags.length) {
      await this.createTags(playerSkills.specialityTags);
    }

    if (profile.parentEmail && profile.parentEmail != '') {
      this.sendEmailService.sendEmailToParent({
        email: profile.parentEmail,
        dynamic_template_data: {
          firstname: profile.firstName,
          lastname: profile.lastName,
        },
      });
    }

    //# create hubspot contact for player
    const hubspotContact: any = await this.createUserToHubspot(
      userId,
      profile,
      uid,
      UserTypes.PLAYER,
      email,
      phone,
    ).catch((error) => {
      console.log(error);
    });

    await Promise.all([
      this.setUserData(userId, {
        teamIds: acceptedTeamIds,
        playerCareer: {
          teamIds: FieldValue.delete(),
          acceptedTeamIds: FieldValue.delete(),
          pendingTeamIds: FieldValue.delete(),
        },
        hubspotId: hubspotContact?.id,
      }),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    return { roleId: userId };
  }

  async draftPlayerSignUp(createPlayerDto: CreatePlayerDto) {
    const { playerSkills, profile, roleId } = createPlayerDto;

    createPlayerDto.settings.country = profile.birthCountry;

    profile.fullName = createFullnameArray({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    const { teamIds, clubId } = createPlayerDto.playerCareer;

    const generateUsernameDto = {
      userType: UserTypes.PLAYER,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDay: profile.birthDay,
    };

    const [userId, uniqueUsername] = await Promise.all([
      this.getUserDocumentIdV2(roleId),
      this.generateUniqueUsername(generateUsernameDto),
    ]);

    let acceptedTeamIds: string[] = [];

    createPlayerDto.media.faceImage =
      createPlayerDto?.media?.faceImage || process.env.DEFAULT_IMAGE;

    await this.setUserData(userId, {
      account: {
        isActive: true,
      },
      ...createPlayerDto,
      username: uniqueUsername,
      type: UserTypes.PLAYER,
      updatedAt: +moment.utc().format('x'),
      circleCompleted: 50,
      isOnline: true,
      lastActive: +moment.utc().format('x'),
    });

    if (teamIds) {
      acceptedTeamIds = await this.teamsService.getListTeamIdsByUserId(userId);

      const requestJoinTeamIds = teamIds.filter(
        (teamId) => !acceptedTeamIds.includes(teamId),
      );

      if (requestJoinTeamIds.length) {
        await this.processUserRequestJoinTeams(
          userId,
          requestJoinTeamIds,
          clubId,
        );
      }
    }

    if (playerSkills.specialityTags.length) {
      await this.createTags(playerSkills.specialityTags);
    }

    if (profile.parentEmail && profile.parentEmail != '') {
      this.sendEmailService.sendEmailToParent({
        email: profile.parentEmail,
        dynamic_template_data: {
          firstname: profile.firstName,
          lastname: profile.lastName,
        },
      });
    }

    await Promise.all([
      this.setUserData(userId, {
        teamIds: acceptedTeamIds,
        playerCareer: {
          teamIds: FieldValue.delete(),
          acceptedTeamIds: FieldValue.delete(),
          pendingTeamIds: FieldValue.delete(),
        },
      }),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    return { roleId: userId };
  }

  async createUserToHubspot(
    userId: string,
    profile: UserProfileDto,
    uid: string,
    userType: UserTypes,
    email?: string,
    phone?: string,
  ) {
    const { clubName, currentTeams, currentHubspotId } =
      await mappingUserInfoById(userId);

    const properties: CreateHubspotContactDto = {
      firstname: profile.firstName,
      lastname: profile.lastName,
      email: email,
      user_id: uid,
      user_type: userType,
      date_of_birth: moment.utc(profile.birthDay).format('LL'),
      city: profile.city,
      phone: phone,
      club: clubName,
      team_name: currentTeams.length ? currentTeams[0] : 'N/A',
    };
    return await this.crmService.createHubspotContact(properties);
  }

  async processUserRequestJoinTeams(
    userId: string,
    requestJoinTeamIds: string[],
    clubId: string,
  ) {
    // check pending teamIds exists in club or not
    const checkTeamInClubPromises = requestJoinTeamIds.map(async (teamId) => {
      const teamRef = await db
        .collection('teams')
        .where(firebase.firestore.FieldPath.documentId(), '==', teamId)
        .where('clubId', '==', clubId)
        .get();

      if (teamRef.empty) {
        throw new HttpException(
          ResponseMessage.Club.TEAM_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [checkTeamInClubResponse, validTeamIds] = await Promise.all([
      checkTeamInClubPromises,
      // check user is blocked from team or not
      this.teamsService.isBlocked(userId, requestJoinTeamIds),
    ]);

    if (validTeamIds.length) {
      const sendRequestJoinTeam = validTeamIds.map(async (teamId) => {
        await this.teamsService.sendRequestJoinTeam(userId, teamId);
      });

      await Promise.all(sendRequestJoinTeam);
    }
  }

  async coachSignUp(
    uid: string,
    createCoachDto: CreateCoachDto,
    email?: string,
    phone?: string,
  ) {
    const { coachSkills, profile, roleId } = createCoachDto;

    createCoachDto.settings.country = profile.birthCountry;

    profile.fullName = createFullnameArray({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    const { teamIds, clubId } = createCoachDto.coachCareer;

    const generateUsernameDto = {
      userType: UserTypes.COACH,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDay: profile.birthDay,
    };

    const [userId, uniqueUsername] = await Promise.all([
      this.getUserDocumentId(uid, roleId, UserTypes.COACH, email, phone),
      this.generateUniqueUsername(generateUsernameDto),
    ]);

    // create user first so we can handle team update notifications
    await this.setUserData(userId, {
      account: {
        isActive: true,
      },
      ...createCoachDto,
      type: UserTypes.COACH,
      updatedAt: +moment.utc().format('x'),
      circleCompleted: 50, // always be 50 when created an account
      isOnline: true,
      lastActive: +moment.utc().format('x'),
      username: uniqueUsername,
    });

    let acceptedTeamIds = [];

    if (teamIds) {
      // copy acceptedTeamIds for save
      acceptedTeamIds = await this.teamsService.getListTeamIdsByUserId(userId);

      const requestJoinTeamIds = teamIds.filter(
        (teamId) => !acceptedTeamIds.includes(teamId),
      );

      if (requestJoinTeamIds.length) {
        await this.processUserRequestJoinTeams(
          userId,
          requestJoinTeamIds,
          clubId,
        );
      }
    }

    if (coachSkills?.specialityTags?.length) {
      await this.createTags(coachSkills.specialityTags);
    }

    //# create hubspot contact for coach
    const hubspotContact = await this.createUserToHubspot(
      userId,
      profile,
      uid,
      UserTypes.COACH,
      email,
      phone,
    );

    await Promise.all([
      this.setUserData(userId, {
        teamIds: acceptedTeamIds,
        coachCareer: {
          teamIds: FieldValue.delete(),
          acceptedTeamIds: FieldValue.delete(),
          pendingTeamIds: FieldValue.delete(),
        },
        hubspotId: hubspotContact.id,
      }),
      this.usersFirebaseService.synchronizeUserInfo(userId),
    ]);

    return { roleId: userId };
  }

  async createTags(specialityTags: string[]) {
    const createTagDto: CreateTagDto = {
      names: specialityTags,
      type: TagsTypes.Speciality,
    };

    await this.tagService.saveTags(createTagDto);
  }

  async setUserData(userId: string, data: any) {
    return db
      .collection('users')
      .doc(userId)
      .set(JSON.parse(JSON.stringify(data)), { merge: true });
  }

  async generateUniqueUsername(generateUsernameDto: GenerateUsernameDto) {
    const basicUsername = this.generateBasicUsername(generateUsernameDto);
    const uniqueUsername = await this.keepUsernameUnique(basicUsername);
    return uniqueUsername;
  }

  async keepUsernameUnique(username: string): Promise<string> {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let uniqueUsername =
      username + `${alphabet[Math.floor(Math.random() * alphabet.length)]}`;

    const usernameDoc = await db
      .collection('users')
      .where('username', '==', username)
      .get();

    if (!usernameDoc.empty) {
      uniqueUsername = await this.keepUsernameUnique(uniqueUsername);
      return uniqueUsername;
    } else {
      return username;
    }
  }

  generateBasicUsername(generateUsernameDto: GenerateUsernameDto): string {
    const { firstName, lastName, birthDay, userType } = generateUsernameDto;

    const dateObject = new Date(birthDay);
    const year = dateObject.getFullYear().toString().substr(2, 2);
    const month = `0${dateObject.getMonth() + 1}`.slice(-2);
    const date = `0${dateObject.getDate()}`.slice(-2);

    const a = firstName
      // remove spaces
      .replace(/\s/g, '')
      // remove special characters
      .normalize('NFC')
      .replace(/[\u0300-\u036f]/g, '')
      // take first 3 chracters
      .substring(0, 3);
    const b = lastName
      .replace(/\s/g, '')
      .normalize('NFC')
      .replace(/[\u0300-\u036f]/g, '')
      .substring(0, 3);

    const c = `${year}${month}${date}`;

    let username = `${a}${b}${c}`;

    if (userType !== UserTypes.PLAYER) {
      username += userType[0];
    }

    return username;
  }

  async remove(userId: string, uid: string) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    // Remove contact in hubspot
    try {
      await hubspotClient.crm.contacts.basicApi.archive(
        userDoc.data().hubspotId,
      );
    } catch (error) {
      console.log(error);
    }

    // Remove the unneeded field from user document
    await userDoc.ref.update({
      account: FieldValue.delete(),
      media: FieldValue.delete(),
      'profile.firstName': '',
      'profile.lastName': '',
      'profile.phone': '',
      'profile.fullName': [],
      socialLinks: FieldValue.delete(),
      username: FieldValue.delete(),
      inviterId: FieldValue.delete(),
      updatedAt: +moment.utc().format('x'),
      deletedAt: +moment.utc().format('x'),
      uid: FieldValue.delete(),
      userId: FieldValue.delete(),
      hubspotId: FieldValue.delete(),
    });

    const userRefs = await db.collection('users').where('uid', '==', uid).get();

    if (userRefs.empty) {
      // Remove user account from firebase
      await firebase.auth().deleteUser(uid);
    }

    return ResponseMessage.Common.DELETED;
  }

  async updateAccountEmail(uid: string, email: string) {
    const [updateAuthEmail, userRefs] = await Promise.all([
      firebase.auth().updateUser(uid, {
        email: email,
      }),
      db.collection('users').where('uid', '==', uid).get(),
    ]);

    if (userRefs.empty) {
      throw new HttpException(`uid ${uid} not found`, HttpStatus.NOT_FOUND);
    }

    if (updateAuthEmail.email) {
      userRefs.forEach((user) => {
        user.ref.update({
          'account.email': email,
        });
      });
    }

    return {
      statsusCode: 200,
      message: `updated email ${email} to profile of uid: ${uid}`,
    };
  }

  async getPlayerSkillsById(playerRoleId: string) {
    const userRef = await db.collection('users').doc(playerRoleId).get();

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userRef.data();
    console.log(
      '🚀 ~ UsersService ~ getPlayerSkillsById ~ userData:',
      userData,
    );

    if (userData.type !== UserTypes.PLAYER) {
      throw new HttpException(
        ResponseMessage.Common.FORBIDDEN_RESOURCE,
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      ...userData.playerSkills,
      summary: userData.playerCareer.summary,
      skillsUpdatedByCoach: {
        coachId: userData.skillsUpdatedByCoach?.coachId,
        overall: userData.skillsUpdatedByCoach?.overall,
        radar: userData.skillsUpdatedByCoach?.radar,
        radar_gk: userData.skillsUpdatedByCoach?.radar_gk,
        specialityTags: userData.skillsUpdatedByCoach?.specialityTags,
        summary: userData.skillsUpdatedByCoach?.summary,
      },
    };
  }

  async createBirthdayPost() {
    const today = moment.utc().format('MM-DD');

    const query = `
    SELECT
      ${BigQueryTable.USERS}.document_id as userId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    WHERE
      SUBSTRING (json_value(${BigQueryTable.USERS}.DATA, '$.profile.birthDay'), 6, 5) = '${today}'
    `;

    const options = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows.length) {
      const createNewBirthdayPost = rows.map(async ({ userId }) => {
        const { firstName } = await mappingUserInfoById(userId, null, null, [
          'firstName',
        ]);

        const newBirthday = await db.collection('birthdays').add({
          userId,
          title: `Happy Birthday ${firstName}`,
          typeOfPost: TypeOfPost.BIRTHDAYS,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        });

        this.feedService.synchronizePostsToMongoose({
          postId: newBirthday.id,
          typeOfPost: TypeOfPost.BIRTHDAYS,
        });
      });

      await Promise.all(createNewBirthdayPost);
    }
  }

  async synchronizeUsersToMongoose(synchronizeUser: GeneralUserDto) {
    const { userId } = synchronizeUser;

    await this.userModel.findOneAndUpdate(
      {
        userId,
      },
      synchronizeUser,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return synchronizeUser;
  }

  async getFlippingFromMongo(
    currentUserId?: string,
    queryBioForFlippingDto?: QueryBioForFlippingDto,
  ) {
    const {
      pageSize,
      pageNumber,
      query,
      startAfter,
      username,
      age,
      gender,
      clubId,
      teamId,
      country,
      role,
      sortBy,
    } = queryBioForFlippingDto;

    const currentUser: UserForMongo = username
      ? await this.userModel.findOne({ username })
      : await this.userModel.findOne({ userId: currentUserId });

    if (currentUser == null || currentUser == undefined) {
      throw new HttpException('Not found user!', HttpStatus.NOT_FOUND);
    }
    const birthYear = currentUser.profile.birthDay.substring(0, 4);

    const limit: number = +pageSize;
    const page: number = +pageNumber - 1;

    const listConditions = {
      teamId,
      age,
      gender,
      country,
      clubId,
      role,
    };

    const arrayConditions = Object.entries(listConditions).filter((e) => e[1]);

    const arrayConditions2: Array<any> = arrayConditions.map((e, idx) => {
      switch (e[0]) {
        case 'role':
          return { type: { $eq: e[1] } };

        case 'country':
          return { 'profile.birthCountry.name': { $eq: e[1] } };

        case 'teamId':
          return { teamIds: { $in: [e[1]] } };

        case 'clubId':
          return { clubId: { $in: [e[1]] } };

        case 'age': {
          if (age == Age.ADULT) {
            return { yearSubstring: { $lt: '2002' } };
          }
          return { yearSubstring: { $eq: age } };
        }

        case 'gender': {
          return { 'profile.gender': gender };
        }
        default:
          return;
      }
    });
    arrayConditions2.push({ username: { $ne: [null, currentUser.username] } });

    const arrayForAggregate: Array<any> = [
      {
        $set: {
          yearSubstring: {
            $substr: ['$profile.birthDay', 0, 4],
          },
          clubId: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$type', 'PLAYER'] },
                  then: ['$playerCareer.clubId'],
                },
                {
                  case: { $eq: ['$type', 'COACH'] },
                  then: ['$coachCareer.clubId'],
                },
              ],
              default: '$supporterFootball.favoriteClubs',
            },
          },
        },
      },
      {
        $match: {
          $and: arrayConditions2,
          'profile.firstName': { $ne: null },
        },
      },
      { $limit: limit * page + limit },

      { $skip: page * limit },
    ];

    if (sortBy) {
      const sort = sortBy == 'asc' ? 1 : -1;
      arrayForAggregate.push({ $sort: { 'profile.firstName': sort } });
    } else {
      arrayForAggregate.push({ $sample: { size: limit } });
    }

    const users = await this.userModel.aggregate(arrayForAggregate);

    return users;
  }
  async getUserByIdFromMongo(userId: string) {
    const user = await this.userModel.findOne({
      userId,
    });

    if (!user) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  async getListUsersForAdmin(userId: string) {
    const userRef = await db
      .collection('users')
      .where('profile.firstName', '!=', null)
      .get();

    if (userRef.empty) return [];

    const listUserForAdmin = userRef.docs
      .filter(
        (e) =>
          e &&
          e.data().userId != `${userId}` &&
          e.data().account &&
          e.data().profile.firstName,
      )
      .map((e) => {
        return {
          userId: e.data().userId,
          userType: e.data().type,
          username: e.data().username,
        };
      });
    return listUserForAdmin;
  }

  async getUserIdsByNameFromElastic(
    searchTeamMemberQuery: SearchTeamMemberQuery,
  ): Promise<string[]> {
    const { name } = searchTeamMemberQuery;
    const params: Object = {
      index: 'users',
      body: {
        size: 50,
        query: {
          combined_fields: {
            query: `*${name}*`,
            fields: ['profile.firstName', 'profile.lastName'],
            operator: 'or',
          },
        },
      },
    };

    const searchRes = await elasticClient.search(params);

    const hits = searchRes.body.hits.hits;
    const results = hits.map((hit) => {
      hit._source.clubId = hit._id;
      return hit._source.userId;
    });
    return deleteNullValuesInArray(results);
  }

  async validateUserId(userId: string) {
    try {
      const user = await this.usersMongoRepository.customedFindOne({
        userId,
        //# TODO: enable after update all user data to mong with right form.
        // isDeleted: false,
      });

      if (!user) {
        throw new NotFoundException('User not found!');
      }
    } catch (error) {
      throw error;
    }
  }

  async addEducation(userRoleId: string, educationData: EducationDto) {
    try {
      const now = Date.now();

      // Validate the user exists
      await this.validateUserId(userRoleId);
      const userDocRef = db.collection('users').doc(userRoleId);

      // Generate a unique ID for the education record
      const educationId = uuidv4(); // This will generate a unique ID for each record

      // Deep serialize the DTO to a plain object, including the unique ID
      const educationPlain = JSON.parse(
        JSON.stringify({
          ...educationData,
          createdAt: now,
          updatedAt: now,
          shareAble: false,
          educationId: educationId, // Add the unique education ID
        }),
      );

      // If not a duplicate, add the education record
      await userDocRef.update({
        education: FieldValue.arrayUnion(educationPlain),
      });

      return { message: 'Education added successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add education',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getListEducationRecord(
    currentUserId: string,
    paginationDto: PaginationDto,
  ) {
    const { limit, startAfter, sorted, userIdQuery } = paginationDto;
    const userIdForQuery = userIdQuery || currentUserId;
    //Rest of the code
    const userDoc = await db.collection('users').doc(userIdForQuery).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    const userData = userDoc.data();
    const educationRecords: any[] = Array.isArray(userData?.education)
      ? [...userData.education]
      : [];
    const sortOrder = sorted === 'desc' ? -1 : 1;
    educationRecords.sort((a, b) =>
      (a.createdAt || 0) > (b.createdAt || 0) ? sortOrder : -sortOrder,
    );
    let startIndex = 0;
    if (startAfter) {
      const startAfterIndex = educationRecords.findIndex(
        (record) => record.createdAt === +startAfter,
      );
      startIndex = startAfterIndex !== -1 ? startAfterIndex + 1 : 0;
    }

    const paginated = educationRecords.slice(startIndex, startIndex + +limit);
    return paginated.map((record, idx) => ({
      id: startIndex + idx,
      institution: record.instituteSchoolName,
      degree: record.typeOfDegree,
      fieldOfStudy: record.fieldOfStudy,
      startDate: record.startDate,
      endDate: record.endingDate,
      createdAt: record.createdAt,
      grade: record.result,
      educationId: record.educationId,
      userId: userIdForQuery,
    }));
  }
  async getOneEducationRecord(userId: string, educationId: string) {
    try {
      // Validate the user ID
      await this.validateUserId(userId);

      const userDocRef = db.collection('users').doc(userId);
      const userSnapshot = await userDocRef.get();

      if (!userSnapshot.exists) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const userData = userSnapshot.data();
      const educationRecords = Array.isArray(userData?.education)
        ? userData.education
        : [];

      // Find the education record by educationId
      const educationRecord = educationRecords.find(
        (record) => record.educationId === educationId,
      );

      // If no record was found
      if (!educationRecord) {
        throw new HttpException(
          'Education record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Return the found education record
      return {
        id: educationRecord.educationId,
        instituteSchoolName: educationRecord.instituteSchoolName || '',
        typeOfDegree: educationRecord.typeOfDegree || '',
        fieldOfStudy: educationRecord.fieldOfStudy || '',
        result: educationRecord.result || '',
        gradeSummary: educationRecord.gradeSummary || 0,
        statingDate: educationRecord.statingDate || '',
        endingDate: educationRecord.endingDate || '',
        description: {
          media: Array.isArray(educationRecord.description?.media)
            ? educationRecord.description.media
            : [],
          text: educationRecord.description?.text || '',
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch education record',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async deleteEducationRecord(userId: string, educationId: string) {
    try {
      // Validate the user ID
      await this.validateUserId(userId);

      const userDocRef = db.collection('users').doc(userId);
      const userSnapshot = await userDocRef.get();

      if (!userSnapshot.exists) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const userData = userSnapshot.data();
      const educationRecords = Array.isArray(userData?.education)
        ? userData.education
        : [];

      // Find the education record by educationId
      const educationRecord = educationRecords.find(
        (record) => record.educationId === educationId,
      );

      // If no record was found
      if (!educationRecord) {
        throw new HttpException(
          'Education record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Remove the education record from the user's education array
      await userDocRef.update({
        education: FieldValue.arrayRemove(educationRecord),
      });

      // Return a success message
      return { message: 'Education record deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete education record',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateEducationRecord(
    userId: string,
    educationId: string,
    updatedData: Partial<EducationDto>,
  ) {
    try {
      const userDocRef = db.collection('users').doc(userId);
      const userSnapshot = await userDocRef.get();

      if (!userSnapshot.exists) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const userData = userSnapshot.data();
      const educationArray = userData?.education || [];

      const index = educationArray.findIndex(
        (edu) => edu.educationId === educationId,
      );

      if (index === -1) {
        throw new HttpException(
          'Education record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Preserve original education ID and merge data
      const updatedEducation = {
        ...educationArray[index],
        ...updatedData,
        updatedAt: Date.now(),
      };

      // Replace the old record
      educationArray[index] = updatedEducation;

      await userDocRef.update({ education: educationArray });

      return { message: 'Education record updated successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update education record',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getEducationRecordForSharing(userId: string, educationId: string) {
    try {
      const userDocRef = db.collection('users').doc(userId);
      const userSnapshot = await userDocRef.get();

      if (!userSnapshot.exists) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const userData = userSnapshot.data();
      const educationArray = userData?.education || [];

      const faceImage = userData?.media?.faceImage || null;
      const alpha2Code = userData?.profile?.birthCountry?.alpha2Code || null;
      const city = userData?.profile?.city || null;
      const fullName = userData?.profile?.fullName || [];
      const userName = userData?.username || null;
      const favoriteRoles = userData?.playerCareer?.favoriteRoles || [];
      const clubId = userData?.playerCareer?.clubId;
      let clubName = null;
      if (clubId) {
        const clubDoc = await db.collection('clubs').doc(clubId).get();
        if (clubDoc.exists) {
          const clubData = clubDoc.data();
          clubName = clubData?.clubName || null;
        }
      }
      const record = educationArray.find(
        (edu) => edu.educationId === educationId,
      );

      if (!record) {
        throw new HttpException(
          'Education record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        education: record,
        userInfo: {
          faceImage,
          alpha2Code,
          city,
          fullName,
          userName,
          favoriteRoles,
          clubName,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch education record',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserInfoById(userId: string) {
    const userRef = await db.collection('users').doc(userId).get();

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = userRef.data();

    return { ...userData };
  }

  async saveSponsorInfo(userId: string, payload: any) {
    const userRef = db.collection('users').doc(userId);

    const doc = await userRef.get();

    if (!doc.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await userRef.update({
      sponsor: { ...payload },
    });

    return { message: 'Sponsor info saved successfully' };
  }

  async getSponsorInfo(userId: string) {
    const userRef = db.collection('users').doc(userId);

    const doc = await userRef.get();

    if (!doc.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userData = doc.data();

    return {
      sponsor: userData?.sponsor, 
      profile: userData?.profile, 
      media: userData?.media,
      type: userData?.type,
      username: userData?.username,
    };
  }
}
