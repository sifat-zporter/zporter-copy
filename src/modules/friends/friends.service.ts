import * as admin from 'firebase-admin';
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
  ResponseMessage,
  UserInfoDto,
} from '../../common/constants/common.constant';
import { ResponsePagination } from '../../common/pagination/pagination.dto';
import { bq, db } from '../../config/firebase.config';
import { commonPagination } from '../../helpers/common-pagination';
import { aggregateSumByDate } from '../../utils/aggregate-sum-by-date';
import { calculatePercentChanged } from '../../utils/calculate-percent-change';
import { getDaysArray } from '../../utils/get-days-array';
import { mergeArray } from '../../utils/merge-array';
import { splitDate } from '../../utils/split-date-range';
import { ContactGroupsService } from '../contact-groups/contact-groups.service';
import { BaseQueryBuilder } from '../dashboard/dto/dashboard.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import {
  CreateNotificationDto,
  NotificationType,
} from './../notifications/dto/notifications.req.dto';
import {
  AddMultiFriendDto,
  GetListBlockedFriend,
  GetListRelationshipsQuery,
  RequestRelationshipDto,
  ResponseRelationshipDto,
  SearchNotFriendQuery,
  UnblockFriendsDto,
} from './dto/friends.req.dto';
import {
  OutputCountFriendRelationship,
  OutputFriendRelationship,
} from './dto/friends.res.dto';
import { Status, TypeRequest } from './enum/friend.enum';
import { FriendsBigQueryService } from './repositories/friends.repository';
import { Query } from '@google-cloud/bigquery';
import { InjectModel } from '@nestjs/mongoose';
import {
  FOLLOW_MODEL,
  FRIEND_MODEL,
  IFollow,
  IFriend,
} from './schemas/friend.schemas';
import { Model } from 'mongoose';
import { FriendsMongoRepository } from './repositories/friends.mongo.repository';
import { FollowsMongoRepository } from './repositories/follows.mongo.repository';

@Injectable()
export class FriendsService {
  constructor(
    private readonly notificationsService?: NotificationsService,
    @Inject(forwardRef(() => ContactGroupsService))
    private readonly contactGroupsService?: ContactGroupsService,
    private readonly friendsBigQueryService?: FriendsBigQueryService,
    @InjectModel(FRIEND_MODEL)
    private readonly friendModel?: Model<IFriend>,
    @InjectModel(FOLLOW_MODEL)
    private readonly followModel?: Model<IFollow>,
    private readonly friendsMongoRepository?: FriendsMongoRepository,
    private readonly followsMongoRepository?: FollowsMongoRepository,
  ) { }

  async checkRelationshipV2(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{
    isFollow: boolean;
    isFan: boolean;
    isFriend: boolean;
  }> {
    const [
      currentUserFriendRequest,
      targetUserFriendRequest,
      followRequest,
      fanRequest,
    ] = await Promise.all([
      this.friendsMongoRepository.customedFindOne({
        sender: currentUserId,
        relationshipId: targetUserId,
        status: Status.ACCEPTED,
      }),
      this.friendsMongoRepository.customedFindOne({
        sender: targetUserId,
        relationshipId: currentUserId,

        status: Status.ACCEPTED,
      }),
      this.followsMongoRepository.customedFindOne({
        userId: currentUserId,
        relationshipId: targetUserId,
        status: Status.ACCEPTED,
      }),
      this.followsMongoRepository.customedFindOne({
        userId: targetUserId,
        relationshipId: currentUserId,
        status: Status.ACCEPTED,
      }),
    ]);

    const isFriend: boolean =
      currentUserFriendRequest || targetUserFriendRequest ? true : false;
    const isFollow: boolean = followRequest ? true : false;
    const isFan: boolean = fanRequest ? true : false;

    return { isFriend, isFan, isFollow };
  }

  async limitRelationshipRequests(
    currentUserId: string,
    requestRelationshipDto: RequestRelationshipDto,
  ) {
    const { type } = requestRelationshipDto;

    const LIMIT_RELATIONSHIP_REQUESTS_PER_DAY = 100;

    const from = +moment.utc().startOf('day').format('x');
    const to = +moment.utc().endOf('day').format('x');

    const relationshipRef = await db
      .collection(type)
      .orderBy('createdAt', 'desc')
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .where('userId', '==', currentUserId)
      .get();

    if (relationshipRef.size > LIMIT_RELATIONSHIP_REQUESTS_PER_DAY) {
      throw new HttpException(
        `Limit of ${LIMIT_RELATIONSHIP_REQUESTS_PER_DAY} relationship requests per day`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getFriendIds(currentUserId: string) {
    const friendRef = await db
      .collection('friends')
      .select('relationshipId')
      .where('userId', '==', currentUserId)
      .where('status', '==', Status.ACCEPTED)
      .where('relationshipId', '!=', currentUserId)
      .get();

    return friendRef.docs.map((doc) => {
      return doc.data()?.relationshipId;
    });
  }

  async getFriendsStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    const data = [];
    const { lastDateRange } = baseQueryBuilder;

    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fromDate = +moment
      .utc()
      .subtract(+lastDateRange - 1, 'd')
      .format('x');
    const toDate = +moment.utc().format('x');

    const pastFromDate = +moment
      .utc()
      .subtract(+lastDateRange * 2 - 1, 'd')
      .format('x');

    const pastToDate = +moment
      .utc()
      .subtract(+lastDateRange - 1, 'd')
      .format('x');

    const dayArrays = getDaysArray(fromDate, toDate);

    const friendsRef = db
      .collection('friends')
      .where('userId', '==', currentUserId)
      .where('status', '==', Status.ACCEPTED)
      .where('createdAt', '>=', fromDate)
      .where('createdAt', '<=', toDate);

    const pastFriendsRef = db
      .collection('friends')
      .where('userId', '==', currentUserId)
      .where('status', '==', Status.ACCEPTED)
      .where('createdAt', '>=', pastFromDate)
      .where('createdAt', '<=', pastToDate);

    const [friendsSnapshot, pastOfFriendsSnapshot] = await Promise.all([
      friendsRef.get(),
      pastFriendsRef.get(),
    ]);

    const friendsCount = friendsSnapshot.size;
    const pastOfFriendsCount = pastOfFriendsSnapshot.size;

    const percentChanged = calculatePercentChanged(
      pastOfFriendsCount,
      friendsCount,
    );

    friendsSnapshot.forEach((doc) => {
      data.push({
        value: 1,
        day: moment.utc(doc.data()?.createdAt).format('YYYY-MM-DD'),
      });
    });

    const result = aggregateSumByDate(data);

    const friendsChart = mergeArray(dayArrays, result);

    if (friendsChart.length >= 30) {
      return {
        count: friendsCount,
        chart: splitDate(friendsChart, lastDateRange),
        percentChanged,
      };
    }

    return { count: friendsCount, chart: friendsChart, percentChanged };
  }

  async getFansStats(
    currentUserId: string,
    baseQueryBuilder: BaseQueryBuilder,
  ) {
    const data = [];
    const { lastDateRange } = baseQueryBuilder;

    if (!+lastDateRange) {
      throw new HttpException(
        'Last date range have to greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fromDate = +moment
      .utc()
      .subtract(+lastDateRange - 1, 'd')
      .format('x');
    const toDate = +moment.utc().format('x');

    const dayArrays = getDaysArray(fromDate, toDate);

    const pastFromDate = +moment
      .utc()
      .subtract(+lastDateRange * 2 - 1, 'd')
      .format('x');

    const pastToDate = +moment
      .utc()
      .subtract(+lastDateRange - 1, 'd')
      .format('x');

    const fansRef = db
      .collection('follows')
      .where('relationshipId', '==', currentUserId)
      .where('status', '==', Status.ACCEPTED)
      .where('createdAt', '>=', fromDate)
      .where('createdAt', '<=', toDate);

    const pastFansRef = db
      .collection('follows')
      .where('relationshipId', '==', currentUserId)
      .where('status', '==', Status.ACCEPTED)
      .where('createdAt', '>=', pastFromDate)
      .where('createdAt', '<=', pastToDate);

    const [fansSnapshot, pastOfFansSnapshot] = await Promise.all([
      fansRef.get(),
      pastFansRef.get(),
    ]);

    const fansCount = fansSnapshot.size;
    const pastOfFansCount = pastOfFansSnapshot.size;

    const percentChanged = calculatePercentChanged(pastOfFansCount, fansCount);

    fansSnapshot.forEach((doc) => {
      data.push({
        value: 1,
        day: moment.utc(doc.data()?.createdAt).format('YYYY-MM-DD'),
      });
    });

    const result = aggregateSumByDate(data);

    const fansChart = mergeArray(dayArrays, result);

    if (fansChart.length >= 30) {
      return {
        count: fansCount,
        chart: splitDate(fansChart, lastDateRange),
        percentChanged,
      };
    }

    return { count: fansCount, chart: fansChart, percentChanged };
  }

  async checkFriendRelationship(senderId: string, receiverId: string) {
    const [friendsRefA, friendsRefB] = await Promise.all([
      db
        .collection('friends')
        .where('relationshipId', '==', senderId)
        .where('userId', '==', receiverId)
        .where('status', '==', Status.ACCEPTED)
        .get(),
      db
        .collection('friends')
        .where('userId', '==', senderId)
        .where('relationshipId', '==', receiverId)
        .where('status', '==', Status.ACCEPTED)
        .get(),
    ]);

    if (friendsRefA.empty && friendsRefB.empty) {
      return false;
    }

    return true;
  }

  async checkFollow(senderId: string, receiverId: string) {
    const [followerRefA, followerRefB] = await Promise.all([
      db
        .collection('follows')
        .where('relationshipId', '==', senderId)
        .where('userId', '==', receiverId)
        .where('status', '==', Status.ACCEPTED)
        .get(),
      db
        .collection('follows')
        .where('userId', '==', senderId)
        .where('relationshipId', '==', receiverId)
        .where('status', '==', Status.ACCEPTED)
        .get(),
    ]);

    if (followerRefA.empty && followerRefB.empty) {
      return false;
    }

    return true;
  }

  async searchUsersIsNotFriend(
    currentUserId: string,
    searchNotFriendQuery: SearchNotFriendQuery,
  ) {
    const { startAfter } = searchNotFriendQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.friendsBigQueryService.searchUserIsNotFriend(
      currentUserId,
      searchNotFriendQuery,
    );
  }

  async addMultiFriends(
    currentUserId: string,
    addMultiFriendDto: AddMultiFriendDto,
  ) {
    const { userIds } = addMultiFriendDto;

    const addingFriends = userIds.map(async (userId) => {
      await this.requestRelationship(userId, currentUserId, {
        type: TypeRequest.FRIEND,
      });
    });

    const result = await Promise.allSettled(addingFriends);

    const failedUserIds: string[] = [];
    const failedUserInfo = [];
    result.forEach((doc, idx) => {
      if (doc.status === 'rejected') {
        failedUserIds.push(userIds[idx]);
      }
    });

    if (failedUserIds.length) {
      const mappingUserInfo = failedUserIds.map(async (userId) => {
        const userInfoMapped = await mappingUserInfoById(userId);
        failedUserInfo.push(userInfoMapped);
      });

      await Promise.all(mappingUserInfo);
    }

    return ResponseMessage.Friend.REQUESTED;
  }

  // TODO: need to query for list of relationship exactly
  async getListRelationshipsOnMongo(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    getCountOnly?: boolean,
  ) {
    const { status, type, userId } = getListRelationshipsQuery;

    const userIdQuery = userId ? userId : currentUserId;

    let data;

    if (type === TypeRequest.FRIEND) {
      data = await this.friendModel.aggregate([
        {
          $match: {
            status: status,
            relationshipId: userIdQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'relationshipId',
            foreignField: 'roleId',
            as: 'users',
          },
        },
        {
          $project: {
            user: { $arrayElemAt: ['$users', 0] },
          },
        },
      ]);
    } else if (type === TypeRequest.FOLLOW) {
      data = await this.followModel.aggregate([
        {
          $match: {
            status: status,
            userId: userIdQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'relationshipId',
            foreignField: 'roleId',
            as: 'users',
          },
        },
        {
          $project: {
            user: { $arrayElemAt: ['$users', 0] },
          },
        },
      ]);
    } else {
      data = await this.followModel.aggregate([
        {
          $match: {
            status: status,
            relationshipId: userIdQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'roleId',
            as: 'users',
          },
        },
        {
          $project: {
            user: { $arrayElemAt: ['$users', 0] },
          },
        },
      ]);
    }
    if (getCountOnly) {
      return data.length;
    }
    return { data, count: data.length };
  }

  async getAllFriendsToMongo() {
    const friends = await db.collection('friends').get();

    const promises = friends.docs.map(async (fr) => {
      const friend: IFriend = fr.data() as IFriend;
      return this.createFriendsToMongo(friend, fr.id);
    });

    await Promise.all(promises);
  }

  async createFriendsToMongo(friend: IFriend, id: string) {
    const newFriend = new this.friendModel({
      ...friend,
      _id: id,
    });
    await newFriend.save();

    return friend;
  }

  async updateFriendsToMongo(friend: IFriend, id: string) {
    await this.friendModel.findOneAndUpdate(
      {
        _id: id,
      },
      {
        ...friend,
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async deleteFriendsToMongo(id: string) {
    await this.friendModel.findByIdAndDelete(id);
  }

  async createFollowsToMongo(follow: IFollow, id: string) {
    const newFollow = new this.followModel({
      ...follow,
      _id: id,
    });
    await newFollow.save();

    return newFollow;
  }

  async updateFollowToMongo(friend: IFollow, id: string) {
    await this.followModel.findOneAndUpdate(
      {
        _id: id,
      },
      {
        ...friend,
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async deleteFollowToMongo(id: string) {
    await this.followModel.findByIdAndDelete(id);
  }

  async getListRelationships(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    getCountOnly?: boolean,
  ): Promise<number | ResponsePagination<UserInfoDto>> {
    const { startAfter } = getListRelationshipsQuery;
    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { data, count } = await this.getListUserIdsRelationships(
      currentUserId,
      getListRelationshipsQuery,
      getCountOnly,
    );

    if (data && count) {
      return commonPagination(getListRelationshipsQuery, data, count);
    }

    return this.getListUserIdsRelationships(
      currentUserId,
      getListRelationshipsQuery,
      getCountOnly,
    );
  }

  async getListUserIdsRelationships(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    getCountOnly?: boolean,
  ) {
    const { status, type, userId } = getListRelationshipsQuery;

    const userIdQuery = userId ? userId : currentUserId;

    if (type === TypeRequest.FRIEND && status === Status.ACCEPTED) {
      return this.friendsBigQueryService.getListFriendsV2(
        userIdQuery,
        getListRelationshipsQuery,
        getCountOnly,
      );
    }

    if (type === TypeRequest.FRIEND && status === Status.REQUESTED) {
      return this.friendsBigQueryService.getListFriendRequest(
        userIdQuery,
        getListRelationshipsQuery,
        getCountOnly,
      );
    }

    if (type === TypeRequest.FRIEND && status === Status.OWN_REQUESTED) {
      return this.friendsBigQueryService.getListRequestedFriendsV2(
        userIdQuery,
        getListRelationshipsQuery,
        getCountOnly,
      );
    }

    if (type === TypeRequest.FOLLOW) {
      return this.friendsBigQueryService.getListFollowedV2(
        userIdQuery,
        getListRelationshipsQuery,
        getCountOnly,
      );
    }

    if (type === TypeRequest.FAN) {
      return this.friendsBigQueryService.getListFansV2(
        userIdQuery,
        getListRelationshipsQuery,
        getCountOnly,
      );
    }
  }

  async getListBlockedFriends(
    currentUserId: string,
    getListBlockedFriend: GetListBlockedFriend,
  ) {
    const data = [];
    const { limit, startAfter, sorted } = getListBlockedFriend;
    let blacklistRef = db
      .collection('blacklists')
      .orderBy('updatedAt', sorted)
      .where('senderId', '==', currentUserId)
      .where('isDeleted', '==', false);

    const count = await blacklistRef.get();

    if (!startAfter) {
      blacklistRef = blacklistRef.limit(+limit);
    }

    if (startAfter) {
      blacklistRef = blacklistRef.startAfter(+startAfter).limit(0);
    }

    const blockedFriends = (await blacklistRef.get()).docs;

    const mappingBlockedFriends = blockedFriends.map(async (doc) => {
      const userInfoMapped = await mappingUserInfoById(doc.data()?.receiverId);

      if (userInfoMapped) {
        userInfoMapped.createdAt = doc.data()?.createdAt;
        userInfoMapped.updatedAt = doc.data()?.updatedAt;
        data.push(userInfoMapped);
      }
    });

    await Promise.all(mappingBlockedFriends);

    return { data, count: count.size };
  }

  async getListToBeBlocked(
    currentUserId: string,
    getListBlockedFriend: GetListBlockedFriend,
  ) {
    const data = [];
    const { limit, startAfter, sorted } = getListBlockedFriend;
    let blacklistRef = db
      .collection('blacklists')
      .orderBy('updatedAt', sorted)
      .where('receiver', '==', currentUserId)
      .where('isDeleted', '==', false);

    const count = await blacklistRef.get();

    if (!startAfter) {
      blacklistRef = blacklistRef.limit(+limit);
    }

    if (startAfter) {
      blacklistRef = blacklistRef.startAfter(+startAfter).limit(+limit);
    }

    const blockedFriends = (await blacklistRef.get()).docs;

    const mappingBlockedFriends = blockedFriends.map(async (doc) => {
      const userInfoMapped = await mappingUserInfoById(doc.data()?.senderId);
      userInfoMapped.createdAt = doc.data()?.createdAt;
      userInfoMapped.updatedAt = doc.data()?.updatedAt;
      data.push(userInfoMapped);
    });

    await Promise.all(mappingBlockedFriends);

    return { data, count: count.size };
  }

  async getFriendRelationship(
    userId: string,
    currentUserId: string,
  ): Promise<OutputFriendRelationship> {
    let friendStatus: Status;
    let followStatus: Status;
    let isConfirmBox: boolean;
    let isFollowed: boolean;

    const [reqFriend, reqFollowA, reqFollowB, reqHead2Head] = await Promise.all([
      db
        .collection('friends')
        .where('userId', '==', currentUserId)
        .where('relationshipId', '==', userId)
        .get(),

      db
        .collection('follows')
        .where('relationshipId', '==', userId)
        .where('userId', '==', currentUserId)
        .get(),

      db
        .collection('follows')
        .where('relationshipId', '==', currentUserId)
        .where('userId', '==', userId)
        .get(),

      db
        .collection(TypeRequest.HEAD_2_HEAD)
        .where('userIdA', '==', currentUserId)
        .where('userIdB', '==', userId)
        .get(),
    ]);

    reqFriend.forEach((doc) => {
      if (doc.data()?.status === Status.REQUESTED) {
        doc.data()?.sender === currentUserId
          ? (friendStatus = doc.data()?.status)
          : (friendStatus = Status.RESPONSE);
      }

      if (doc.data()?.status !== Status.REQUESTED) {
        friendStatus = doc.data()?.status;
      }
    });

    reqFollowA.forEach((doc) => {
      if (doc.data()?.status === Status.REQUESTED) {
        followStatus = Status.REQUESTED;
      }

      if (doc.data()?.status !== Status.REQUESTED) {
        followStatus = doc.data()?.status;

        doc.data()?.status === Status.ACCEPTED
          ? (isFollowed = true)
          : (isFollowed = false);
      }
    });

    reqFollowB.forEach((doc) => {
      if (doc.data()?.status === Status.REQUESTED) {
        isConfirmBox = true;
      }

      if (doc.data()?.status === Status.ACCEPTED) {
        doc.data()?.status === Status.ACCEPTED && !followStatus
          ? (followStatus = Status.FOLLOW_BACK)
          : Status.ACCEPTED;
      }
    });

    return {
      friendStatus: friendStatus ? friendStatus : Status.NON_FRIEND,
      followStatus: followStatus ? followStatus : Status.NON_FRIEND,
      isConfirmBox: isConfirmBox ? isConfirmBox : false,
      isFollowed: isFollowed ? isFollowed : false,
      isHead2Head: !!reqHead2Head.docs.length,
    };
  }

  // TODO: this is fast built for Demo,
  // need to finish get list Friends, Follows, Fans completely
  // SUGGESTION: using aggreagate with $lookup and $pipeline
  async getCountRelationshipFromMongo(
    currentUserId: string,
  ): Promise<OutputCountFriendRelationship> {
    const [countFriend, countFollow, countFan] = await Promise.all([
      this.friendModel.aggregate([
        {
          $match: {
            status: 'accepted',
            userId: currentUserId,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'relationshipId',
            foreignField: 'userId',
            as: 'users',
          },
        },
        { $unwind: '$users' },
        { $match: { 'users.profile.firstName': { $ne: null } } },
      ]),

      this.followModel.aggregate([
        {
          $match: {
            status: 'accepted',
            userId: currentUserId,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'relationshipId',
            foreignField: 'userId',
            as: 'users',
          },
        },
        { $unwind: '$users' },
        { $match: { 'users.profile.firstName': { $ne: null } } },
      ]),

      this.followModel.aggregate([
        {
          $match: {
            status: 'accepted',
            relationshipId: currentUserId,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'users',
          },
        },
        { $unwind: '$users' },
        { $match: { 'users.profile.firstName': { $ne: null } } },
      ]),
    ]);

    return {
      friendCount: countFriend.length as number,
      followCount: countFollow.length as number,
      fanCount: countFan.length as number,
    };
  }

  async getCountRelationship(
    currentUserId: string,
  ): Promise<OutputCountFriendRelationship> {
    const [countFriend, countFollow, countFan] = await Promise.all([
      this.getListRelationships(
        currentUserId,
        <GetListRelationshipsQuery>{
          status: Status.ACCEPTED,
          type: TypeRequest.FRIEND,
          limit: 1,
          startAfter: 1,
        },
        true,
      ),
      this.getListRelationships(
        currentUserId,
        <GetListRelationshipsQuery>{
          status: Status.ACCEPTED,
          type: TypeRequest.FOLLOW,
          limit: 1,
          startAfter: 1,
        },
        true,
      ),
      this.getListRelationships(
        currentUserId,
        <GetListRelationshipsQuery>{
          status: Status.ACCEPTED,
          type: TypeRequest.FAN,
          limit: 1,
          startAfter: 1,
        },
        true,
      ),
    ]);

    return {
      friendCount: countFriend as number,
      followCount: countFollow as number,
      fanCount: countFan as number,
    };
  }

  async requestRelationship(
    userId: string,
    currentUserId: string,
    requestRelationshipDto: RequestRelationshipDto,
  ): Promise<string> {
    const { type } = requestRelationshipDto;

    const [requestA, requestB, requesterInfo, requesteeInfo] =
      await Promise.all([
        db
          .collection(type)
          .where('relationshipId', '==', userId)
          .where('userId', '==', currentUserId)
          .get(),
        db
          .collection(type)
          .where('relationshipId', '==', currentUserId)
          .where('userId', '==', userId)
          .get(),
        mappingUserInfoById(currentUserId),
        mappingUserInfoById(userId),
        this.limitRelationshipRequests(currentUserId, requestRelationshipDto),
      ]);

    if (currentUserId === userId) {
      throw new HttpException(`Can't add yourself`, HttpStatus.BAD_REQUEST);
    }

    if (type === TypeRequest.FRIEND && (!requestA.empty || !requestB.empty)) {
      throw new HttpException(
        ResponseMessage.Friend.ALREADY_REQUEST,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (type === TypeRequest.FOLLOW && !requestA.empty) {
      throw new HttpException(
        ResponseMessage.Friend.ALREADY_REQUEST,
        HttpStatus.BAD_REQUEST,
      );
    }

    const payload = new CreateNotificationDto();
    payload.receiverId = requesteeInfo.userId;
    payload.senderId = requesterInfo.userId;
    payload.title = 'Zporter';
    payload.token = requesteeInfo.fcmToken as string[];
    payload.username = requesterInfo.username as string;
    payload.largeIcon = requesterInfo.faceImage as string;
    payload.userType = requesterInfo.type as UserTypes;

    const requestee = await db.collection('users').doc(userId).get();

    if (type === TypeRequest.FOLLOW) {
      if (!requestee.data()?.settings?.public) {
        await db.collection(type).add({
          userId: currentUserId,
          relationshipId: userId,
          status: Status.REQUESTED,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        });

        payload.notificationType = NotificationType.FOLLOW_REQUEST;
      }

      if (requestee.data()?.settings?.public) {
        await db.collection(type).add({
          userId: currentUserId,
          relationshipId: userId,
          status: Status.ACCEPTED,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        });

        payload.notificationType = NotificationType.FOLLOW;
      }
    }

    if (type === TypeRequest.FRIEND) {
      await Promise.all([
        db.collection(type).add({
          relationshipId: currentUserId,
          userId: userId,
          sender: currentUserId,
          status: Status.REQUESTED,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        }),
        db.collection(type).add({
          relationshipId: userId,
          userId: currentUserId,
          sender: currentUserId,
          status: Status.REQUESTED,
          createdAt: +moment.utc().format('x'),
          updatedAt: +moment.utc().format('x'),
        }),
      ]);

      payload.notificationType = NotificationType.FRIEND_REQUEST;
    }

    await this.notificationsService.sendMulticastNotification(payload);

    return ResponseMessage.Friend.REQUESTED;
  }

  async responseRelationship(
    responseRelationshipDto: ResponseRelationshipDto,
    currentUserId: string,
  ) {
    let messageResponse: string;

    const { status, userId, type, userIds = [] } = responseRelationshipDto;

    if (userId) {
      const [requester, requestee, currentUserInfo, userInfo] =
        await Promise.all([
          db
            .collection(type)
            .where('relationshipId', '==', userId)
            .where('userId', '==', currentUserId)
            .get(),
          db
            .collection(type)
            .where('relationshipId', '==', currentUserId)
            .where('userId', '==', userId)
            .get(),
          mappingUserInfoById(currentUserId),
          mappingUserInfoById(userId),
        ]);

      const payload = new CreateNotificationDto();
      payload.token = userInfo.fcmToken;
      payload.title = 'Zporter';
      payload.senderId = currentUserId;
      payload.receiverId = userId;
      payload.userType = currentUserInfo.type;
      payload.username = currentUserInfo.username;
      payload.largeIcon = currentUserInfo.faceImage;

      if (type === TypeRequest.FRIEND) {
        if (requester.empty && requestee.empty) {
          throw new HttpException(
            ResponseMessage.Friend.NOT_FOUND,
            HttpStatus.NOT_FOUND,
          );
        }

        requester.forEach((doc) => {
          if (
            status === Status.ACCEPTED &&
            doc.data()?.status === Status.REQUESTED &&
            doc.data().sender !== currentUserId
          ) {
            doc.ref.set(
              {
                status: Status.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );

            payload.notificationType = NotificationType.ACCEPTED_FRIEND_REQUEST;

            this.notificationsService.sendMulticastNotification(payload);

            messageResponse = ResponseMessage.Friend.ACCEPTED;
          }

          if (
            status === Status.REJECTED &&
            doc.data()?.status === Status.REQUESTED
          ) {
            doc.ref.delete();

            payload.notificationType = NotificationType.REJECT_FRIEND_REQUEST;

            this.notificationsService.sendMulticastNotification(payload);

            messageResponse = ResponseMessage.Friend.REJECTED;
          }
        });

        requestee.forEach((doc) => {
          if (
            status === Status.ACCEPTED &&
            doc.data()?.status === Status.REQUESTED &&
            doc.data().sender !== currentUserId
          ) {
            doc.ref.set(
              {
                status: Status.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );
          }

          if (
            status === Status.REJECTED &&
            doc.data()?.status === Status.REQUESTED
          ) {
            doc.ref.delete();
          }
        });
      }

      if (type === TypeRequest.FOLLOW) {
        const followRef = await db
          .collection(type)
          .where('relationshipId', '==', currentUserId)
          .where('userId', '==', userId)
          .get();

        followRef.forEach((doc) => {
          if (
            status === Status.ACCEPTED &&
            doc.data()?.status === Status.REQUESTED &&
            doc.data().userId !== currentUserId
          ) {
            doc.ref.set(
              {
                status: Status.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );

            payload.notificationType = NotificationType.ACCEPTED_FOLLOW_REQUEST;

            this.notificationsService.sendMulticastNotification(payload);

            return ResponseMessage.Friend.ACCEPTED;
          }

          if (
            status === Status.REJECTED &&
            doc.data()?.status === Status.REQUESTED &&
            doc.data().sender !== currentUserId
          ) {
            doc.ref.delete();

            payload.notificationType = NotificationType.REJECT_FOLLOW_REQUEST;

            this.notificationsService.sendMulticastNotification(payload);

            return ResponseMessage.Friend.REJECTED;
          }
        });
      }
    }

    const userIdsTransformed = [];
    if (userIds?.length > 0) {
      const transformUserIds = Array.isArray(userIds) ? userIds : [userIds];
      userIdsTransformed.push(...transformUserIds);
    }

    if (userIdsTransformed?.length) {
      const mappingRequestIds = userIdsTransformed.map(async (userId) => {
        const [requester, requestee] = await Promise.all([
          db
            .collection(type)
            .where('relationshipId', '==', userId)
            .where('userId', '==', currentUserId)
            .get(),
          db
            .collection(type)
            .where('relationshipId', '==', currentUserId)
            .where('userId', '==', userId)
            .get(),
        ]);

        requester.forEach((doc) => {
          if (
            status === Status.ACCEPTED &&
            doc.data()?.status === Status.REQUESTED &&
            doc.data().sender !== currentUserId
          ) {
            doc.ref.set(
              {
                status: Status.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );

            messageResponse = ResponseMessage.Friend.ACCEPTED;
          }

          if (
            status === Status.REJECTED &&
            doc.data()?.status === Status.REQUESTED
          ) {
            doc.ref.delete();

            messageResponse = ResponseMessage.Friend.REJECTED;
          }
        });

        requestee.forEach((doc) => {
          if (
            status === Status.ACCEPTED &&
            doc.data()?.status === Status.REQUESTED &&
            doc.data().sender !== currentUserId
          ) {
            doc.ref.set(
              {
                status: Status.ACCEPTED,
                updatedAt: +moment.utc().format('x'),
              },
              { merge: true },
            );
          }

          if (
            status === Status.REJECTED &&
            doc.data()?.status === Status.REQUESTED
          ) {
            doc.ref.delete();
          }
        });
      });

      await Promise.all(mappingRequestIds);
    }
    return messageResponse;
  }

  async removeRelationship(
    userId: string,
    currentUserId: string,
    requestRelationshipDto: RequestRelationshipDto,
  ): Promise<string> {
    const { type } = requestRelationshipDto;
    if (type === TypeRequest.FRIEND) {
      const [requestA, requestB] = await Promise.all([
        db
          .collection(type)
          .where('userId', '==', userId)
          .where('relationshipId', '==', currentUserId)
          .get(),
        db
          .collection(type)
          .where('userId', '==', currentUserId)
          .where('relationshipId', '==', userId)
          .get(),
      ]);

      if (requestA.empty && requestB.empty) {
        throw new HttpException(
          ResponseMessage.Friend.NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      requestA.forEach((doc) => {
        doc.ref.delete();
      });

      requestB.forEach((doc) => {
        doc.ref.delete();
      });

    }
    if (type === TypeRequest.FOLLOW) {
      const followRef = await db
        .collection(type)
        .where('userId', '==', currentUserId)
        .where('relationshipId', '==', userId)
        .get();

      if (followRef.empty) {
        throw new HttpException(
          ResponseMessage.Friend.NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      followRef.forEach((doc) => {
        doc.ref.delete();
      });

    }

    return ResponseMessage.Friend.REMOVED;
  }

  async blockFriend(currentUserId: string, userId: string) {
    const [requestA, requestB, followRef, fanRef] = await Promise.all([
      db
        .collection('friends')
        .where('relationshipId', '==', userId)
        .where('userId', '==', currentUserId)
        .get(),
      db
        .collection('friends')
        .where('relationshipId', '==', currentUserId)
        .where('userId', '==', userId)
        .get(),
      db
        .collection('follows')
        .where('relationshipId', '==', currentUserId)
        .where('userId', '==', userId)
        .get(),
      db
        .collection('follows')
        .where('relationshipId', '==', userId)
        .where('userId', '==', currentUserId)
        .get(),
    ]);

    const isFollowed = followRef.docs;
    const isFans = fanRef.docs;

    requestA.forEach((doc) => {
      doc.ref.delete();
    });

    requestB.forEach((doc) => {
      doc.ref.delete();
    });

    if (isFollowed.length) {
      isFollowed.map((doc) => {
        doc.ref.delete();
      });
    }

    if (isFans.length) {
      isFans.map((doc) => {
        doc.ref.delete();
      });
    }

    await db.collection('blacklists').add({
      senderId: currentUserId,
      receiverId: userId,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      isDeleted: false,
    });
  }

  async unblockFriend(
    currentUserId: string,
    unblockFriendsDto: UnblockFriendsDto,
  ) {
    const { userIds } = unblockFriendsDto;
    if (userIds.length) {
      const unblockFriends = userIds.map(async (userId) => {
        const blacklistRef = await db
          .collection('blacklists')
          .where('senderId', '==', currentUserId)
          .where('receiverId', '==', userId)
          .where('isDeleted', '==', false)
          .get();

        const blockedFriends = blacklistRef.docs;

        if (blockedFriends.length) {
          blockedFriends.map((doc) => {
            doc.ref.delete();
          });
        }
      });

      await Promise.all(unblockFriends);

      return ResponseMessage.Friend.UNBLOCKED;
    }
  }

  async deleteBlockedFriendRequest(currentUserId: string, userId: string) {
    const blacklistRef = await db
      .collection('blacklists')
      .where('senderId', '==', currentUserId)
      .where('receiverId', '==', userId)
      .get();

    const blockedFriends = blacklistRef.docs;

    blockedFriends.map((doc) => {
      doc.ref.set(
        {
          isDeleted: true,
        },
        { merge: true },
      );
    });
  }

  async getTopFriends() {
    const query = `
    SELECT
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.userId') AS id,
      array_length(array_agg(json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId'))) as numOfFriends,
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}
    JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON 
      json_value(${BigQueryTable.FRIENDS}.data, '$.userId') = json_value(${BigQueryTable.USERS}.data, '$.userId')
    WHERE
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.status') = 'accepted'
    GROUP BY
      id
    ORDER BY
      numOfFriends desc
    LIMIT
     10
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    const promises = rows.map(async (row) => {
      const user = await mappingUserInfoById(row.id);
      const numOfFriends = row.numOfFriends;
      return { ...user, numOfFriends };
    });
    const users = Promise.all(promises);

    return users;
  }

}
