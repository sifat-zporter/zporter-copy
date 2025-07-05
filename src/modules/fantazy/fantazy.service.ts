import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateFantazyTeam,
  DeletePlayerFantazy,
  GetListFantazyTeamQuery,
  GetListLeaderBoardsOfFantazyTeams,
  GetListPlayerQuery,
  OutputFantazyTeam,
  UpdateFantazyTeam,
  UserDetail,
  UserDetailDto,
} from './dto/fantazy.dto';
import * as moment from 'moment';
import { db } from '../../config/firebase.config';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';
import { InjectModel } from '@nestjs/mongoose';
import { FantazyTeam, FantazyTeamWinner, FANTAZY_TEAM_MODEL, FANTAZY_TEAM_WINNER_MODEL } from './schemas/fantazy.schemas';
import { Model } from 'mongoose';
import { SortBy } from '../../common/pagination/pagination.dto';
import { GenderTypes } from '../../common/constants/common.constant';
import { FieldSort, MethodFantazy, PlayerType } from './enum/fantazy.enum';
import { USER_MODEL } from '../users/schemas/user.schema';
import { UserForMongo } from '../users/entities/user.entity';
import { Age, AgeGroup } from '../dashboard/dto/dashboard.req.dto';
import { UserTypes } from '../users/enum/user-types.enum';
import { Role } from '../diaries/enum/diaries.enum';
import { getBioUrl } from '../../utils/get-bio-url';
import { CreateNotificationDto, NotificationType } from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ConnectedClubDto, PlayerCreateAwardDto } from '../achievements/dto/create-achievement.dto';
import { AchievementType } from '../achievements/enum/achievement.enum';
import { ZPlayerAwardType } from '../achievements/enum/award-types.enum';
import { ConnectedClubType } from '../achievements/enum/connected-club.enum';
import { AchievementsService } from '../achievements/achievements.service';
import { TypeOfPost } from '../feed/dto/feed.req.dto';
import { FeedService } from '../feed/feed.service';
import { LastDateRange } from '../dashboard/enum/dashboard-enum';
@Injectable()
export class FantazyService {
  constructor(
    @InjectModel(FANTAZY_TEAM_MODEL)
    private readonly fantazyTeamModel: Model<FantazyTeam>,
    @InjectModel(FANTAZY_TEAM_WINNER_MODEL)
    private readonly fantazyTeamWinnerModel: Model<FantazyTeamWinner>,
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserForMongo>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => AchievementsService))
    private achievementsService: AchievementsService,
    @Inject(forwardRef(() => FeedService))
    private feedService: FeedService
  ) { }

  mappingTeam(userDetails: UserDetailDto[]) {
    const user: UserDetail[] = userDetails.map(e => {
      return {
        ...e,
        addedAt: +moment.utc().format('x'),
      }
    })
    return user;
  }

  calculatePoint(userDetails: UserDetailDto[]) {
    const usersMain = userDetails.filter((e) => e.type === PlayerType.MAIN);
    return usersMain.reduce((total, currentValue) => {
      return total + Number(currentValue.value);
    }, 0);
  }

  async getUsersDeleted(userId: string) {
    const fantazy = await this.fantazyTeamModel.aggregate([
      {
        $match: {
          userId: userId
        }
      },
      {
        $project: {
          'usersDeleted': 1
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      { $limit: 1 },
    ]);
    const usersDeleted = fantazy[0]?.usersDeleted;

    return usersDeleted;
  }

  async getRandomPlayer(position: string, qty: number, country?: string) {
    const now = +moment.utc().format('x');

    let role = []
    if (position == Role.GK) role.push(Role.GK)
    if (position == Role.DEFENDERS) role = [Role.CB, Role.LB, Role.RB];
    if (position == Role.MIDFIELDERS) role = [Role.CDM, Role.CM, Role.CAM, Role.RM, Role.LM];
    if (position == Role.FORWARDS) role = [Role.CF, Role.ST, Role.RW, Role.LW];
    const playerRandom = await this.userModel.aggregate([
      {
        $set: {
          value: {
            $cond: {
              if: {
                $gt: ['$timeoutTotalPoint', now],
              },
              then: '$totalPoint',
              else: 0,
            },
          },
          firstName: {
            "$toLower": "$profile.firstName"
          },
          lastName: {
            "$toLower": "$profile.lastName"
          },
        },
      },
      {
        $match:
        {
          $and: [
            {
              type: UserTypes.PLAYER,
            },
            {
              'account.isActive': true
            },
            {
              'profile.firstName': { $ne: null }
            },
            {
              username: { $ne: null }
            },
            {
              userId: { $ne: null }
            },
            {
              'playerCareer.favoriteRoles': { $in: role }
            },
          ]
        }
      },
      {
        $project: {
          "_id": 1,
          "userId": 1,
          "value": 1
        }
      },
      {
        $sort: { "value": -1, "firstName": 1, "lastName": 1 }
      },
      {
        $limit: qty
      }
    ]);
    return playerRandom;
  }

  async createFantazyTeam(
    createFantazyTeam: CreateFantazyTeam,
    currentUserId: string,
  ): Promise<OutputFantazyTeam> {
    let { fantazyTeams, age, gender, country } =
      createFantazyTeam;
    const user = await mappingUserInfoById(currentUserId);

    const checkDay = +moment
      .tz(user.timezone)
      .day('Friday')
      .hour(22)
      .startOf('hours')
      .format('x');
    const now = +moment.tz(user.timezone).format('x');

    if (now > checkDay) {
      throw new BadRequestException(
        'You cannot create fantazy team after 22:00 Friday. Please wait until next week!',
      );
    }
    const createdTime = +moment.utc().format('x');

    const from = moment().startOf('week').add(1, 'day').format('YYYY-MM-DD');
    const to = moment().endOf('week').add(1, 'day').format('YYYY-MM-DD');

    let postFix = '';

    switch (to.charAt(to.length - 1).toString()) {
      case '1':
        postFix = 'st'
        break;
      case '2':
        postFix = 'nd';
        break;
      case '3':
        postFix = 'rd'
        break;
      default:
        postFix = 'th'
        break;
    }

    const timeRange = `${from.split('-')[2]}-${to.split('-')[2]}${postFix} of ${moment(
      to,
    ).format('MMM')} ${moment(to).format('YYYY')}`;

    const goalKeepers: UserDetailDto[] = fantazyTeams.filter((e) => e.role === Role.GK);
    const defenders: UserDetailDto[] = fantazyTeams.filter((e) => [Role.CB, Role.LB, Role.RB].includes(e.role));
    const middlefielders: UserDetailDto[] = fantazyTeams.filter((e) => [Role.CDM, Role.CM, Role.CAM, Role.RM, Role.LM].includes(e.role));
    const forwarders: UserDetailDto[] = fantazyTeams.filter((e) => [Role.CF, Role.ST, Role.RW, Role.LW].includes(e.role));



    const checkRecord = await this.fantazyTeamModel.find({ timeRange: timeRange, userId: currentUserId });
    if (checkRecord.length) {
      throw new BadRequestException('You can only create 1 fantazy team every week')
    };

    if (goalKeepers && goalKeepers.length > 2) {
      throw new BadRequestException('You can only add 2 GoalKeepers');
    }

    if (defenders && defenders.length > 8) {
      throw new BadRequestException('You can only add 8 Defenders');
    }

    if (middlefielders && middlefielders.length > 6) {
      throw new BadRequestException('You can only add 6 Middlefielders');
    }

    if (forwarders && forwarders.length > 6) {
      throw new BadRequestException('You can only add 6 Forwarders');
    }

    const usersDeleted = await this.getUsersDeleted(currentUserId);
    const usersDeletedResult = usersDeleted?.length ? usersDeleted.filter((e) => +moment(e.deletedAt).utc().add(14, 'day').format('x') > createdTime) : [];

    const totalPoint = this.calculatePoint(fantazyTeams);

    const fantazyRef = {
      userId: currentUserId,
      age: age || user.birthDay.substring(0, 4),
      gender: gender || user.gender,
      country: country || user.birthCountry.name || 'N/A',
      timeRange,
      fantazyTeams,
      usersDeleted: usersDeletedResult,
      // totalPoint: totalPoint,
      isFinished: false,
      finishedAt: 0,
      createdAt: createdTime,
      updatedAt: createdTime,
    };
    try {
      const fantazyTeam = await this.fantazyTeamModel.create(fantazyRef);
      return fantazyTeam;
    } catch (error) {
      throw new InternalServerErrorException(`${error}`);
    }
  }

  async updateFantazyTeam(
    updateFantazyTeam: UpdateFantazyTeam,
    currentUserId: string,
    fantazyId: string,
  ) {
    const { fantazyTeams, age, gender, country } =
      updateFantazyTeam;

    const user = await mappingUserInfoById(currentUserId);

    const checkDay = +moment
      .tz(user.timezone)
      .day('Friday')
      .hour(22)
      .startOf('hours')
      .format('x');
    const now = +moment.tz(user.timezone).format('x');
    const updatedTime = +moment.tz(user.timezone).format('x');
    const createdTime = +moment.utc().format('x');

    if (now > checkDay) {
      throw new BadRequestException(
        'You cannot edit fantazy team after 22:00 Friday. Please wait until next week!',
      )
    };

    const goalKeepers: UserDetailDto[] = fantazyTeams.filter((e) => e.role === Role.GK);
    const defenders: UserDetailDto[] = fantazyTeams.filter((e) => [Role.CB, Role.LB, Role.RB].includes(e.role));
    const middlefielders: UserDetailDto[] = fantazyTeams.filter((e) => [Role.CDM, Role.CM, Role.CAM, Role.RM, Role.LM].includes(e.role));
    const forwarders: UserDetailDto[] = fantazyTeams.filter((e) => [Role.CF, Role.ST, Role.RW, Role.LW].includes(e.role));

    if (goalKeepers && goalKeepers.length > 2) {
      throw new BadRequestException('You can only add 2 GoalKeepers');
    }

    if (defenders && defenders.length > 8) {
      throw new BadRequestException('You can only add 8 Defenders');
    }

    if (middlefielders && middlefielders.length > 6) {
      throw new BadRequestException('You can only add 6 Middlefielders');
    }

    if (forwarders && forwarders.length > 6) {
      throw new BadRequestException('You can only add 6 Forwarders');
    }


    const usersDeleted = await this.getUsersDeleted(currentUserId);
    const usersDeletedResult = usersDeleted?.length ? usersDeleted.filter((e) => +moment(e.deletedAt).utc().add(14, 'day').format('x') > createdTime) : []

    const totalPoint = this.calculatePoint(fantazyTeams);

    const fantazyRef = {
      ...updateFantazyTeam,
      age: age || user.age,
      gender: gender || user.gender,
      country: country || user.birthCountry.name || 'N/A',
      usersDeleted: usersDeletedResult,
      userId: currentUserId,
      updatedAt: updatedTime,
    };

    try {
      await this.fantazyTeamModel.findByIdAndUpdate(fantazyId, fantazyRef);
    } catch (error) {
      throw new InternalServerErrorException(`${error}`)
    }
  }

  async deletePlayersFantazyTeam(
    deletePlayerFantazy: DeletePlayerFantazy,
    currentUserId: string,
    fantazyId: string,
  ) {
    const { usersDeleted } = deletePlayerFantazy;
    const deletedTime = +moment.utc().startOf('day').format('x');

    let usersIdDeleted = [];
    usersDeleted.forEach(async (e) => {
      usersIdDeleted.push({
        ...e,
        deletedAt: deletedTime
      });

    })

    if (usersDeleted?.length) {
      usersDeleted.forEach(async (e) => {
        await this.fantazyTeamModel.findByIdAndUpdate(
          fantazyId,
          {
            $pull: { fantazyTeams: { userId: e.userId } }
          }
        )
      })
    }

    try {
      await this.fantazyTeamModel.findByIdAndUpdate(
        fantazyId,
        { $push: { usersDeleted: usersIdDeleted } },
        { new: true, upsert: true }
      );

    } catch (error) {
      console.log(error);
    }
  }

  async getListFantazyTeams(
    currentUserId: string,
    getListFantazyTeams: GetListFantazyTeamQuery,
  ) {
    const { limit, startAfter, sorted, age, gender, country, method, lastDateRange, userIdQuery } =
      getListFantazyTeams;
    const conditions = [];
    const sort = sorted == SortBy.ASC ? 1 : -1;
    const now = +moment.utc().format('x');

    if (!startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (userIdQuery) {
      conditions.push(
        { userId: userIdQuery },
      )
    } else {
      conditions.push(
        { userId: currentUserId },
      )
    }

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange, 'd')
        .format('x');

      const toDate = +moment.utc().format('x');
      conditions.push(
        { createdAt: { $gte: fromDate } },
        { createdAt: { $lte: toDate } },
      );
    }

    if (age) {
      if (age == Age.ADULT) {
        conditions.push({
          age: { $lt: '2002' }
        })
      } else {
        conditions.push({
          age: age
        })
      }
    };

    if (gender) {
      conditions.push({
        gender: `${gender.toUpperCase()}`,
      });
    }

    if (country) {
      conditions.push(
        {
          country: country
        },
      )
    }

    let data = await this.fantazyTeamModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'fantazyTeams._id',
          foreignField: '_id',
          as: 'users'
        }
      },
      {
        $match: {
          $and: conditions,
        },
      },
      {
        $project: {
          "_id": 1,
          "userId": 1,
          "age": 1,
          "gender": 1,
          "country": 1,
          "timeRange": 1,
          "fantazyTeams": 1,
          "totalPoint": 1,
          "usersDeleted": 1,
          "createdAt": 1,
          "updatedAt": 1,
          "users.userId": 1,
          "users.totalPoint": 1,
          "users.timeoutTotalPoint": 1
        }
      },
      { $sort: { createdAt: sort } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);

    let result = await Promise.all(data.map(async (e) => {
      let totalPoint = 0;
      const fantazyTeams = await Promise.all(e.fantazyTeams.map(async (doc) => {
        e.users.forEach((el) => {
          if (doc.userId === el.userId) {
            doc.value = el?.totalPoint && el.timeoutTotalPoint > now ? el.totalPoint : 0;
          }
        })
        doc.type === PlayerType.MAIN ? totalPoint += doc.value : totalPoint += 0;
        const { faceImage, fullName, clubName, type, firstName, lastName, username } = await mappingUserInfoById(doc.userId);
        return {
          ...doc,
          faceImage,
          fullName,
          clubName,
          bioUrl: getBioUrl({
            type,
            firstName,
            lastName,
            username
          })
        }
      }))

      e.totalPoint = totalPoint;
      return {
        ...e,
        fantazyTeams,
        totalPointLastWeek: totalPoint,
        totalPointThisWeek: null
      }
    }))

    if (result.length == 0) {
      if (method == MethodFantazy.RANDOMIZE) {
        const [goalKeeper, defenders, middlefielders, forwarders] = await Promise.all([
          this.getRandomPlayer(Role.GK, 1),
          this.getRandomPlayer(Role.DEFENDERS, 4),
          this.getRandomPlayer(Role.MIDFIELDERS, 3),
          this.getRandomPlayer(Role.FORWARDS, 3)
        ])
        const team = [...goalKeeper, ...defenders, ...middlefielders, ...forwarders];

        result = await Promise.all(team.map(async (doc) => {
          try {
            const user = await mappingUserInfoById(doc.userId);
            const { faceImage, fullName, clubName, favoriteRoles, type, firstName, lastName, username } = user;
            return {
              _id: doc._id.toString(),
              userId: doc.userId,
              type: '',
              addedAt: 0,
              faceImage,
              fullName,
              clubName,
              bioUrl: getBioUrl({
                type,
                firstName,
                lastName,
                username
              }),
              role: favoriteRoles[0],
              value: doc.value
            }
          } catch (error) {
            return null;
          }
        }).filter(e => e));
        result = [
          {
            fantazyTeams: result,
            totalPointLastWeek: null,
            totalPointThisWeek: null
          }
        ]
      } else {
        result = []
      }
    }
    return result;
  }

  async getListPlayer(currentUserId: string, getListPlayerQuery: GetListPlayerQuery) {
    const { country, age, gender, clubId, roles, sorted, startAfter, limit, fieldSort } =
      getListPlayerQuery;
    const sort = sorted == SortBy.ASC ? 1 : -1;
    let sortByField = {};
    const now = +moment.utc().format('x');
    if (!startAfter || startAfter <= 0) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const conditions: any = [
      {
        type: UserTypes.PLAYER,
      },
      {
        'account.isActive': true
      },
      {
        'profile.firstName': { $ne: null }
      }
    ];

    if (fieldSort === FieldSort.NAME) {
      sortByField = {
        firstName: sort,
        lastName: sort,
        value: -1
      }
    }
    if (fieldSort == FieldSort.VALUE || !fieldSort) {
      sortByField = {
        value: sort,
        firstName: 1,
        lastName: 1
      }
    }

    if (country) {
      conditions.push(
        {
          'profile.birthCountry.name': `${country}`,
        }
      )
    }

    if (age) {
      if (age == Age.ADULT) {
        conditions.push({
          birthDay: { $lt: '2002' }
        })
      } else {
        conditions.push({
          birthDay: age
        })
      }
    }

    if (gender) {
      conditions.push({
        'profile.gender': `${gender.toUpperCase()}`,
      });
    }


    if (clubId) {
      conditions.push({
        'playerCareer.clubId': clubId,
      });
    }

    if (roles) {
      if (roles === Role.DEFENDERS) {
        conditions.push({
          'playerCareer.favoriteRoles': { $in: ['CB', 'RB', 'LB'] },
        });
      }
      if (roles === Role.MIDFIELDERS) {
        conditions.push({
          'playerCareer.favoriteRoles': {
            $in: ['CDM', 'CM', 'CAM', 'RM', 'LM'],
          },
        });
      }
      if (roles === Role.FORWARDS) {
        conditions.push({
          'playerCareer.favoriteRoles': { $in: ['CF', 'ST', 'RW', 'LW'] },
        });
      }

      if (
        ![
          `${Role.DEFENDERS}`,
          `${Role.MIDFIELDERS}`,
          `${Role.FORWARDS}`,
        ].includes(roles)
      ) {
        conditions.push({
          'playerCareer.favoriteRoles': roles,
        });
      }
    }

    const data = await this.userModel.aggregate([
      {
        $set: {
          birthDay: {
            $substr: ['$profile.birthDay', 0, 4],
          },
          value: {
            $cond: {
              if: {
                $gt: ['$timeoutTotalPoint', now],
              },
              then: '$totalPoint',
              else: 0,
            },
          },
          firstName: {
            "$toLower": "$profile.firstName"
          },
          lastName: {
            "$toLower": "$profile.lastName"
          },
        },
      },
      {
        $match: {
          $and: conditions,
        },
      },
      {
        $sort: sortByField
      },
      {
        $project: {
          '_id': 1,
          'userId': 1,
          'value': '$value'
        }
      },

      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },

    ]);
    const usersDeleted = await this.getUsersDeleted(currentUserId);

    let result = await Promise.all(data.map(async (doc) => {
      try {
        const user = await mappingUserInfoById(doc.userId, currentUserId, true);
        const { firstName, lastName, type, username, faceImage, fullName, favoriteRoles, city, clubName, birthCountry, isFriend } = user;

        let deletedAt = 0;
        for (let i = 0; i < usersDeleted?.length; i++) {
          if (usersDeleted[i].userId == doc.userId) {

            deletedAt = usersDeleted[i].deletedAt;
            break;
          }
        }
        if (deletedAt) {
          return {
            _id: doc._id,
            userId: doc.userId,
            faceImage: faceImage,
            fullName: fullName,
            username: username,
            favoriteRoles: favoriteRoles,
            isFriend: isFriend,
            alpha2Code: birthCountry.alpha2Code,
            city: city,
            clubName: clubName,
            bioUrl: getBioUrl({
              type,
              firstName,
              lastName,
              username
            }),
            value: doc.value,
            isDeleted: true,
            deletedAt: deletedAt,
          };
        } else {
          return {
            _id: doc._id,
            userId: doc.userId,
            faceImage: faceImage,
            fullName: fullName,
            username: username,
            favoriteRoles: favoriteRoles,
            isFriend: isFriend,
            alpha2Code: birthCountry.alpha2Code,
            city: city,
            clubName: clubName,
            bioUrl: getBioUrl({
              type,
              firstName,
              lastName,
              username
            }),
            value: doc.value,
            isDeleted: false,
            deletedAt: 0
          };
        }
      } catch (error) {
        return null;
      }
    })//.filter(e => e)
    );


    return result;
  }

  async getTheWinnerFantazyManagerOfTheWeek() {
    const now = +moment.utc().format('x');
    const fromUtc = +moment().utc().subtract(8, 'day').startOf('w').format('x');
    const toUtc = +moment().utc().subtract(2, 'day').endOf('w').format('x');

    let data = await this.fantazyTeamModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'fantazyTeams._id',
          foreignField: '_id',
          as: 'users'
        }
      },
      {
        $match: {
          $and: [
            {
              'createdAt': { $gte: fromUtc }
            },
            {
              'createdAt': { $lte: toUtc }
            }
          ],
        },
      },
      {
        $project: {
          "_id": 1,
          "userId": 1,
          "timeRange": 1,
          "fantazyTeams": 1,
          "users.userId": 1,
          "users.totalPoint": 1,
          "users.timeoutTotalPoint": 1
        }
      },
    ]);

    data.map(async (e) => {
      let totalPoint = 0;
      await e.fantazyTeams.map((doc) => {
        e.users.forEach((el) => {
          if (doc.userId === el.userId) {
            doc.value = el?.totalPoint && el.timeoutTotalPoint > now ? el.totalPoint : 0;
          }
        })
        doc.type === PlayerType.MAIN ? totalPoint += doc.value : totalPoint += 0;
      })
      e.totalPoint = totalPoint;
      try {
        await this.fantazyTeamModel.findOneAndUpdate(
          { userId: e.userId },
          {
            totalPoint: totalPoint,
            isFinished: true,
            finishedAt: now
          },
          {
            merge: true
          }
        )
      } catch (error) {
        console.log(error);
      }
    });

    const fantazyTeamWinner = await this.fantazyTeamModel.aggregate([
      {
        $match: {
          $and: [
            {
              'createdAt': { $gte: fromUtc }
            },
            {
              'createdAt': { $lte: toUtc }
            }
          ],
        },
      },
      { $sort: { "totalPoint": -1 } },
      {
        $group:
        {
          "_id": { "country": "$country", "age": "$age", "gender": "$gender" },
          data: { $push: "$$ROOT" },
        }
      },
    ]);

    fantazyTeamWinner.map(async (data) => {
      const userId = data.data[0].userId
      const { fcmToken, birthCountry, clubId } = await mappingUserInfoById(userId);
      const playerCreateAwardDto: PlayerCreateAwardDto = {
        achievementType: AchievementType.award,
        awardType: ZPlayerAwardType.FT,
        name: 'F.T - The winner of the Fantazy Manager of the week',
        country: birthCountry,
        connectedClub: {
          connectedClubType: ConnectedClubType.Historic,
          clubId,
        } as ConnectedClubDto,
        date: moment().toISOString(),
        description: 'The winner of the fantazy manager was created from cronjob',
        media: [],
      };

      try {
        await this.fantazyTeamWinnerModel.create({
          userId,
          age: data.data[0].age,
          gender: data.data[0].gender,
          country: data.data[0].country,
          timeRange: data.data[0].timeRange,
          fantazyTeams: data.data[0].fantazyTeams,
          totalPoint: data.data[0].totalPoint,
          createdAt: now,
          updatedAt: now
        })
      } catch (error) {
        throw new InternalServerErrorException(error)
      }
      const payload = new CreateNotificationDto();
      payload.token = fcmToken;
      payload.title = 'Zporter';
      payload.senderId = '';
      payload.receiverId = userId;
      payload.userType = UserTypes.SYS_ADMIN;
      payload.largeIcon = process.env.ZPORTER_IMAGE;
      payload.notificationType = NotificationType.FANTAZY_TEAM_WINNER_OF_THE_WEEK;

      this.notificationsService.sendMulticastNotification(
        payload,
      );

      data.data.forEach(async (e, index) => {
        if (index == 0) return;
        const { fcmToken } = await mappingUserInfoById(e.userId);
        const payload = new CreateNotificationDto();
        payload.token = fcmToken;
        payload.title = 'Zporter';
        payload.senderId = '';
        payload.receiverId = e.userId;
        payload.userType = UserTypes.SYS_ADMIN;
        payload.largeIcon = process.env.ZPORTER_IMAGE;
        payload.notificationType = NotificationType.NOTIFY_ABOUT_RANKING_OF_THE_FANTAZY_MANAGER;
        payload.content = `top ${index + 1} (gender: ${e.gender}, age: ${e.age}, country: ${e.country}) with total point: ${e.totalPoint} of The Fantazy Game`;

        await this.notificationsService.sendMulticastNotification(
          payload,
        );
      })
    })

    return fantazyTeamWinner;
  }

  async getFantazyOfTheWeek(from: number, to: number) {
    const fantazyOfTheWeek = await this.fantazyTeamModel.find({
      $and: [
        { createdAt: { $gte: from } },
        { createdAt: { $lte: to } },
      ]
    })
    return fantazyOfTheWeek;
  }

  async createFantazyTeamPost() {
    const from = +moment.utc().startOf('w').format('x');
    const to = +moment.utc().endOf('w').format('x');

    const fantazyOfWeek = await this.getFantazyOfTheWeek(from, to);
    fantazyOfWeek.forEach(async (doc) => {
      let fantazyTeamPost = await db.collection('fantazy_team_posts').add({
        _id: doc._id.toString(),
        userId: doc.userId,
        age: doc.age,
        gender: doc.gender,
        country: doc.country,
        timeRange: doc.timeRange,
        data: JSON.stringify(doc.fantazyTeams),
        typeOfPost: TypeOfPost.FANTAZY_TEAM_POSTS,
        createdAt: +moment.utc().format('x'),
        updatedAt: +moment.utc().format('x'),
      });

      await this.feedService.synchronizePostsToMongoose({
        postId: fantazyTeamPost.id,
        typeOfPost: TypeOfPost.FANTAZY_TEAM_POSTS,
      });
    })
  }

  async getTheFantazyManagerOfTheMonth() {
    const from = +moment.utc().subtract(1, 'd').startOf('M').format('x');
    const to = +moment.utc().subtract(1, 'd').endOf('M').format('x');

    const fantazyTeamTotalMonth = await this.fantazyTeamModel.aggregate([
      {
        $match: {
          $and: [
            { finishedAt: { $gte: from } },
            { finishedAt: { $lte: to } },
            { isFinished: true }
          ]
        }
      },
      {
        $group:
        {
          "_id": { "userId": "$userId" },
          totalPointMonth: { $sum: "$totalPoint" },
        }
      },
      { $sort: { "totalPointMonth": -1 } },
      { $limit: 1 }
    ]);

    if (fantazyTeamTotalMonth.length == 0) return;

    const userId = fantazyTeamTotalMonth[0]?._id.userId;
    const { fcmToken } = await mappingUserInfoById(userId);
    let fantazyManagerOfTheMonth = await db.collection('fantazy_manager_of_the_month').add({
      userId: userId,
      month: moment.utc().format('MM'),
      totalPoint: fantazyTeamTotalMonth[0]?.totalPointMonth,
      typeOfPost: TypeOfPost.FANTAZY_MANAGER_OF_THE_MONTH,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });

    await this.feedService.synchronizePostsToMongoose({
      postId: fantazyManagerOfTheMonth.id,
      typeOfPost: TypeOfPost.FANTAZY_MANAGER_OF_THE_MONTH,
    });

    const payload = new CreateNotificationDto();
    payload.token = fcmToken;
    payload.postId = fantazyManagerOfTheMonth.id;
    payload.typeOfPost = TypeOfPost.FANTAZY_MANAGER_OF_THE_MONTH;
    payload.title = 'Zporter';
    payload.senderId = '';
    payload.receiverId = userId;
    payload.userType = UserTypes.SYS_ADMIN;
    payload.largeIcon = process.env.ZPORTER_IMAGE;
    payload.notificationType = NotificationType.FANTAZY_MANAGER_OF_THE_MONTH;

    await this.notificationsService.sendMulticastNotification(
      payload,
    )
  }

  async createNotificationRemindEditFantazy() {
    const userRef = await db
      .collection('users')
      .where('account.isActive', '==', true)
      .get();

    userRef.forEach(async (doc) => {
      const { fcmToken } = await mappingUserInfoById(doc.id)
      const payload = new CreateNotificationDto();
      payload.token = fcmToken;
      payload.title = 'Zporter';
      payload.senderId = '';
      payload.receiverId = doc.id;
      payload.userType = UserTypes.SYS_ADMIN;
      payload.largeIcon = process.env.ZPORTER_IMAGE;
      payload.notificationType = NotificationType.REMIND_EDIT_FANTAZY;

      await this.notificationsService.sendMulticastNotification(
        payload,
      )
    })
  }
  async calculatePlayerInHowManyFantazyTeam() {
    const from = +moment.utc().startOf('w').format('x');
    const to = +moment.utc().endOf('w').format('x');

    const data = await this.userModel.aggregate([
      {
        $lookup: {
          from: 'fantazy_teams',
          localField: '_id',
          foreignField: 'fantazyTeams._id',
          as: 'fantazyTeams'
        }
      },
      {
        $match: {
          $and: [
            {
              'type': 'PLAYER'
            },
            {
              'account.isActive': true
            },
            {
              'fantazyTeams.createdAt': { $gte: from }
            },
            {
              'fantazyTeams.createdAt': { $lte: to }
            }
          ]
        }
      },
    ]);

    data.forEach(async (e) => {
      const { fcmToken } = await mappingUserInfoById(e.userId)
      const payload = new CreateNotificationDto();
      payload.token = fcmToken;
      payload.title = 'Zporter';
      payload.senderId = '';
      payload.receiverId = e.userId;
      payload.content = `${e?.fantazyTeams?.length}`;
      payload.userType = UserTypes.SYS_ADMIN;
      payload.largeIcon = process.env.ZPORTER_IMAGE;
      payload.notificationType = NotificationType.HOW_MANY_PLAYER_IS_PICKED_IN_THE_FANTAZY_TEAM;

      await this.notificationsService.sendMulticastNotification(
        payload,
      );
    })
    return data
  }

  async getListLeaderBoardsOfFantazyTeams(getListLeaderBoardsOfFantazyTeams: GetListLeaderBoardsOfFantazyTeams) {
    const { country, gender, age, lastDateRange, limit, startAfter, sorted } = getListLeaderBoardsOfFantazyTeams;
    if (!startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    let conditions = [];
    const sort = !sorted || sorted == SortBy.DESC ? -1 : 1;

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange, 'd')
        .format('x');

      const toDate = +moment.utc().format('x');
      conditions.push(
        { finishedAt: { $gte: fromDate } },
        { finishedAt: { $lte: toDate } },
      );
    };

    if (lastDateRange === LastDateRange.ALL) {
      const toDate = +moment.utc().format('x');
      conditions.push(
        { finishedAt: { $gte: 0 } },
        { finishedAt: { $lte: toDate } },
      );
    }

    if (country) {
      conditions.push(
        {
          country: country
        },
      )
    }

    if (age) {
      if (age == Age.ADULT) {
        conditions.push({
          age: { $lt: '2002' }
        })
      } else {
        conditions.push({
          age: age
        })
      }
    }

    if (gender) {
      conditions.push({
        gender: `${gender.toUpperCase()}`,
      });
    }

    const fantazyCharts = await this.fantazyTeamModel.aggregate([
      {
        $match: {
          $and: conditions
        }
      },
      {
        $group:
        {
          "_id": { "userId": "$userId" },
          totalPointPeriod: { $sum: "$totalPoint" },
        }
      },
      { $sort: { "totalPointPeriod": sort, userId: 1 } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);

    const data = await Promise.all(fantazyCharts.map(async (doc) => {
      const userInfo = await mappingUserInfoById(doc._id.userId)
      return {
        ...doc,
        userInfo
      }
    }))
    return data;
  }
}
