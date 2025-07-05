import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import mongoose from 'mongoose';
import {
  GenderTypes,
  ResponseMessage,
  UserInfoDto,
} from '../../../../common/constants/common.constant';
import { db } from '../../../../config/firebase.config';
import { mappingUserInfoById } from '../../../../helpers/mapping-user-info';
import { DateFormat, DateUtil } from '../../../../utils/date-util';
import { deleteNullValuesInArray } from '../../../../utils/delete-null-values-in-array';
import { getBioUrl } from '../../../../utils/get-bio-url';
import { MediaUtil } from '../../../../utils/media-util';
import { normalizeTextFormula } from '../../../../utils/normalize-text';
import { AbstractService } from '../../../abstract/abstract.service';
import { ConditionObject } from '../../../abstract/dto/pipeline.dto';
import { ClubRepository } from '../../../clubs/repository/club.repository';
import { LastDateRange } from '../../../dashboard/enum/dashboard-enum';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { Role } from '../../../diaries/enum/diaries.enum';
import { TypeOfPost } from '../../../feed/dto/feed.req.dto';
import { FeedService } from '../../../feed/feed.service';
import {
  CreateNotificationDto,
  NotificationType,
} from '../../../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../../../notifications/notifications.service';
import { UserTypes } from '../../../users/enum/user-types.enum';
import { User } from '../../../users/repositories/user/user';
import { UserRepository } from '../../../users/repositories/user/user.repository';
import { IUserRepository } from '../../../users/repositories/user/user.repository.interface';
import { UsersService } from '../../../users/v1/users.service';
import { ReferenceResponse } from '../../dtos/reference/reference.response';
import { GetUserTestRequest } from '../../dtos/user-test/get-user-test.request';
import { GetLeaderboardRequest } from '../../dtos/user-test/request/get-leader-board.request';
import { UpdateUserTestRequest } from '../../dtos/user-test/request/update-user-test.request';
import {
  UserTestRequest,
  UserTestRequestForCoach,
} from '../../dtos/user-test/request/user-test.request';
import { NodeChart } from '../../dtos/user-test/response/chart-node';
import { ControllerResponse } from '../../dtos/user-test/response/controller.response';
import { ChartResponse } from '../../dtos/user-test/response/individual-chart.response';
import { LeaderboardResponse } from '../../dtos/user-test/response/leaderboard.response';
import { UserTestLeaderboardResponse } from '../../dtos/user-test/response/user-test.leaderboard.response';
import { TableSequence } from '../../dtos/user-test/table-sequence';
import {
  UserSubtypeResponse,
  UserSubtypeResponseByCoach,
} from '../../dtos/user-test/user-subtype.response';
import { UserTestResponse } from '../../dtos/user-test/user-test.response';
import { ChangingTurn } from '../../enums/changing-turn.enum';
import { Sequence } from '../../enums/sequence';
import { TestLevel } from '../../enums/test-level';
import { TestType } from '../../enums/test-type';
import { ResultStorageRepository } from '../../repository/result-storage/result-storage.repository';
import { IResultStorageRepository } from '../../repository/result-storage/result-storage.repository.interface';
import { Subtype } from '../../repository/subtype/subtype';
import { SubtypeRepository } from '../../repository/subtype/subtype.repository';
import { ISubtypeRepository } from '../../repository/subtype/subtype.repository.interface';
import { MediaSource } from '../../repository/test/media-source';
import { Test } from '../../repository/test/test';
import {
  USER_TEST_MODEL,
  UserTest,
} from '../../repository/user-test/user-test';
import { UserTestRepository } from '../../repository/user-test/user-test.repository';
import { IUserTestRepository } from '../../repository/user-test/user-test.repository.interface';
import { IResultStorageService } from '../result-storage/result-storage.interface';
import { ResultStorageService } from '../result-storage/result-storage.service';
import { IMinorUserTestService } from './minor-service/minor.user-test.interface';
import { MinorUserTesService } from './minor-service/minor.user-test.service';
import { IUserTestService } from './user-test.service.interface';
import { InjectModel } from '@nestjs/mongoose';
import { IStatisticalAwardTests } from '../../interfaces/statistical-award-tests.interface';
import {
  GetListUserTestByCategory,
  GetUserTestByType,
} from '../../dtos/user-test/request/get-user-test-by-type.request';
import { TeamsService } from '../../../teams/teams.service';
import { ListUserTestResponse } from '../../dtos/user-test/get-list-user-test.response';
import { GetIndividualChartRequest } from '../../dtos/user-test/request/get-individual-char.request';

@Injectable()
export class UserTestService
  extends AbstractService<IUserTestRepository>
  implements IUserTestService
{
  constructor(
    @Inject(UserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(UserTestRepository)
    private readonly userTestRepository: IUserTestRepository,
    @Inject(SubtypeRepository)
    private readonly subtypeRepository: ISubtypeRepository,
    @Inject(ResultStorageService)
    private readonly resultStorageService: IResultStorageService,
    @Inject(MinorUserTesService)
    private readonly minorService: IMinorUserTestService,

    @Inject(ResultStorageRepository)
    private resultStorageRepository: IResultStorageRepository,
    private readonly userService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(ClubRepository)
    private readonly clubRepository: ClubRepository,

    @Inject(forwardRef(() => FeedService))
    private feedService: FeedService,

    @InjectModel(USER_TEST_MODEL)
    private userTestsModel: mongoose.Model<UserTest>,

    @Inject(TeamsService)
    private readonly teamsService: TeamsService,
  ) {
    super(userTestRepository);
  }

  async getListRecentController(
    currentUserId: string,
  ): Promise<ControllerResponse[]> {
    const _5lastUserTest: UserTest[] = await this.repository.customedFind({
      match: {
        userId: currentUserId,
        isDeleted: false,
        controllerUsername: {
          $ne: '',
        },
      },
      project: {
        _id: 1,
        controllerId: 1,
        controllerUsername: 1,
        controllerLink: 1,
        controllerType: 1,
        controllerFullname: 1,
      },
      keySort: {
        createdAt: -1,
      },
      page: 1,
      pageSize: 5,
    });

    const removeDuplicateElement = Array.from(
      new Set(_5lastUserTest.map((a) => a.controllerId)),
    ).map((id) => {
      return _5lastUserTest.find((a) => a.controllerId === id);
    });

    const controllers: ControllerResponse[] = await Promise.all(
      removeDuplicateElement.map(async (e) => {
        const { faceImage, bioUrl, fullName, firstName, lastName } =
          await mappingUserInfoById(e.controllerId);
        return new ControllerResponse({
          fullName: `${firstName || 'Zporter'} ${lastName || 'Anonymous'}`,
          link: bioUrl,
          type: e.controllerType,
          userId: e.controllerId,
          username: e.controllerUsername,
          faceImage,
        });
      }),
    );

    return controllers;
  }

  async getUserTestResult(
    currentUserId: string,
    getUserTestRequest: GetUserTestRequest,
  ): Promise<UserTestResponse[]> {
    const userId = getUserTestRequest?.userIdQuery
      ? getUserTestRequest.userIdQuery
      : currentUserId;
    const [test, _] = await Promise.all([
      this.subtypeRepository.getOneTestv2(getUserTestRequest.testId, false),
      this.userService.validateUserId(userId),
    ]);

    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const { startTime, endTime } = this.dateUtil.getRangeTime(
      getUserTestRequest.lastDateRange,
    );
    const userTests: UserTest[] = await this.repository.getUserTestByQuery(
      userId,
      getUserTestRequest.testId,
      startTime,
      endTime,
      +getUserTestRequest.startAfter,
      +getUserTestRequest.limit,
      getUserTestRequest.sorted,
    );

    const userTestResponses: UserTestResponse[] = userTests.length
      ? await Promise.all<UserTestResponse>(
          userTests.map(async (e) => {
            const lastUserTest: UserTest =
              await this.userTestRepository.getLastVerifiedUserTest(
                getUserTestRequest.testId,
                userId,
                {
                  point: 1,
                },
              );

            const userTestResponse: UserTestResponse = {
              id: e._id.toString(),
              subtypeId: e.subtypeId,
              testId: e.testId,

              nameOfTest: test.testName,
              typeOfLogo: test.logoType,

              controller: await this.mappingControllerInfo(e.controllerId),

              point: e.point,
              title: e.title,
              value: e.value,
              metric: e.metric,
              level: e.level,

              date: e.date,
              time: e.time,
              arena: e.arena,
              userId: e.userId,
              media: e.media.map((e) => {
                return {
                  type: e.type,
                  url: e.url,
                  source: e.source,
                  thumbnail: e.thumbnail,
                  uniqueKey: e.uniqueKey,
                } as MediaDto;
              }),
              isPublic: e.isPublic,
              isVerified: e.isVerified,
              isDeleted: e.isDeleted,
              changingTurn:
                lastUserTest && e.point < lastUserTest.point
                  ? ChangingTurn.DOWN
                  : ChangingTurn.UP,
              executedTime: e.executedTime,
            };
            return userTestResponse;
          }),
        )
      : [];
    return userTestResponses;
  }

  async mappingControllerInfo(
    controllerId: string,
  ): Promise<ControllerResponse> {
    if (controllerId) {
      const userController: UserInfoDto = await mappingUserInfoById(
        controllerId,
      );
      return {
        userId: userController.userId,
        username: userController.username,
        link: userController.bioUrl,
        type: userController.type,
        fullName: userController.fullName,
      } as ControllerResponse;
    } else {
      return null;
    }
  }

  async verifyUserTest(
    currentUserId: string,
    userTestId: string,
    isVerified: boolean,
  ): Promise<void> {
    const userTest: UserTest = await this.repository.getOne(
      {
        _id: userTestId,
        isDeleted: false,
      },
      {
        _id: 1,
        isVerified: 1,
        isConfirmed: 1,
        media: 1,
        controllerId: 1,
        userId: 1,
        subtypeId: 1,
        testId: 1,
        executedTime: 1,
      },
    );

    if (!userTest) {
      throw new BadRequestException(ResponseMessage.Test.USER_TEST_NOT_FOUND);
    }
    if (
      userTest.controllerId != currentUserId
      // || !userTest.media.length
    ) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_VERIED,
      );
    }
    if (userTest.isConfirmed) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_VERIFY_AGAIN,
      );
    }
    const controller: UserInfoDto = await mappingUserInfoById(
      userTest.controllerId,
    );

    userTest.isVerified = isVerified;
    userTest.isConfirmed = true;
    userTest.controllerUsername = controller.username;
    userTest.controllerLink = controller.bioUrl;
    userTest.controllerType = controller.type;

    await this.repository.createOrUpdate(userTest, {
      _id: userTest._id.toString(),
    });
    this.resultStorageService.createResultStorage(userTest);

    if (isVerified) {
      const userTestInfo = await mappingUserInfoById(userTest.userId);
      const payload = new CreateNotificationDto();
      payload.token = userTestInfo.fcmToken;
      payload.title = 'Zporter';
      payload.senderId = '';
      payload.receiverId = userTest.userId;
      payload.userType = UserTypes.SYS_ADMIN;
      payload.largeIcon = process.env.ZPORTER_IMAGE;
      payload.notificationType = NotificationType.CONFIRMED_TEST_RECORD;
      payload.others = {
        data: JSON.stringify({
          createdAt: this.dateUtil.getNowTimeInMilisecond(),
          updatedAt: this.dateUtil.getNowTimeInMilisecond(),
          subtypeId: userTest.subtypeId,
          testId: userTest.testId,
          id: userTest._id.toString(),
        }),
      };
      await this.notificationsService.sendMulticastNotification(payload);
    } else {
      const { fcmToken } = await mappingUserInfoById(userTest.userId);

      const payload = new CreateNotificationDto();
      payload.token = fcmToken;
      payload.title = 'Zporter';
      payload.senderId = '';
      payload.receiverId = userTest.userId;
      payload.userType = UserTypes.SYS_ADMIN;
      payload.largeIcon = process.env.ZPORTER_IMAGE;
      payload.notificationType = NotificationType.REFUSED_TEST_RECORD;
      payload.others = {
        data: JSON.stringify({
          createdAt: this.dateUtil.getNowTimeInMilisecond(),
          updatedAt: this.dateUtil.getNowTimeInMilisecond(),
          subtypeId: userTest.subtypeId,
          testId: userTest.testId,
          id: userTest._id.toString(),
        }),
      };

      await this.notificationsService.sendMulticastNotification(payload);
    }
  }

  async deleteUserTest(
    userTestId: string,
    currentUserId: string,
  ): Promise<void> {
    const userTest: UserTest = await this.repository.getOne(
      {
        _id: userTestId,
        userId: currentUserId,
        isDeleted: false,
      },
      {
        _id: 1,
        isDeleted: 1,
        isVerified: 1,
      },
    );
    if (!userTest) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_DELETED,
      );
    }
    // if (userTest.isVerified) {
    //   throw new BadRequestException(
    //     ResponseMessage.Test.USER_TEST_CAN_NOT_DELETED_VERIFIED_RESULT,
    //   );
    // }
    userTest.isDeleted = true;
    userTest.deletedAt = this.dateUtil.getNowDate();
    await this.repository.createOrUpdate(userTest, {
      _id: userTest._id.toString(),
    });
  }

  async updateUserTest(
    currentUserId: string,
    userTestRequest: UpdateUserTestRequest,
    userTestId: string,
    timezone: string,
  ): Promise<void> {
    await this.userService.validateUserId(currentUserId);

    const userTest: UserTest = await this.userTestRepository.getOne({
      _id: userTestId,
    });
    if (!userTest || userTest.isDeleted) {
      throw new NotFoundException(ResponseMessage.Test.USER_TEST_NOT_FOUND);
    }
    if (userTest.isVerified) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_UPDATED,
      );
    }
    if (
      userTestRequest.controller &&
      userTestRequest.controller == currentUserId
    ) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_ERROR_VERIFY_MYSELF_RESULT,
      );
    }

    userTest.arena = userTestRequest.arena;
    userTest.time = userTestRequest.time;
    userTest.date = userTestRequest.date;
    userTest.executedTime = this.dateUtil.formatDateTimeForUserTest(
      userTestRequest.date,
      userTestRequest.time,
      timezone,
    );

    userTest.title = userTestRequest.title;
    userTest.value = userTestRequest.value;
    userTest.metric = userTestRequest.metric;
    userTest.point = await this.calculatePointTest(
      userTest.subtypeId,
      userTest.testId,
      userTest.gender,
      userTest.bodyWeight,
      userTestRequest.value,
    );
    userTest.level = this.classifyPoint(userTest.point);

    userTest.media = userTestRequest.media.length
      ? userTestRequest.media.map((media) => {
          const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(
            media,
          );
          return new MediaSource({
            source: mediaDto.source,
            thumbnail: mediaDto.thumbnail,
            type: mediaDto.type,
            uniqueKey: mediaDto.uniqueKey,
            url: mediaDto.url,
          });
        })
      : [];
    userTest.controllerId = userTestRequest.controller;
    userTest.isConfirmed = false;

    if (userTest.controllerId) {
      await Promise.all([
        this.userService.validateUserId(userTest.userId),
        this.userService.validateUserId(userTest.controllerId),
      ]);
      const user: User = await this.userRepository.getOne({
        userId: userTest.userId,
      });

      await this.noticeController(
        user,
        userTest.controllerId,
        userTest,
        NotificationType.VERIFY_TEST_RECORD_UPDATE,
      );
    }
    await this.repository.createOrUpdate(userTest, {
      _id: userTest._id.toString(),
    });
  }

  async generateUserSubtypeResponse(
    subtypes: Subtype[],
    userId: string,
    isCoachCreated = false,
  ): Promise<UserSubtypeResponse[]> {
    return await Promise.all(
      subtypes.map(async (subtype) => {
        const userTestResponse: UserTestResponse[] =
          await this.mappingUserTestIntoTestList(subtype.tests, userId);

        const avgPoint: number = this.getAvgPoint(userTestResponse);

        const userSubtypeResponse: UserSubtypeResponse = {
          id: subtype._id.toString(),
          typeOfTest: subtype.testType,
          subtypeName: subtype.subtypeName,
          avgPoint: avgPoint,
          changingTurn: this.getAvgChangingTurn(userTestResponse),
          level: this.classifyPoint(avgPoint),
          isDeleted: subtype.isDeleted,
        };
        if (!isCoachCreated) userSubtypeResponse['tests'] = userTestResponse;
        return userSubtypeResponse;
      }),
    );
  }

  async generateListUserSubtypeResponse(
    subtypes: Subtype[],
    listUser: UserInfoDto[],
  ): Promise<ListUserTestResponse[]> {
    return await Promise.all(
      listUser.map(async (user: UserInfoDto) => {
        const result: UserSubtypeResponseByCoach[] =
          await this.generateUserSubtypeResponse(subtypes, user.userId, true);
        const calculateLength: number = result.filter(
          (e) => e.subtypeName.toLowerCase() !== 'other',
        ).length;
        const userTestResponse: ListUserTestResponse = {
          userInfo: user,
          result,
          totalIndex: Math.round(
            result
              .filter((e) => e.avgPoint != -1)
              .reduce((acc: number, next) => acc + next.avgPoint, 0) /
              calculateLength,
          ),
        };
        return userTestResponse;
      }),
    );
  }

  async getListUserTestResults(
    currentUserId: string,
    userTestQuery: GetUserTestByType,
  ): Promise<UserSubtypeResponse[]> {
    const { typeOfTest, userIdQuery } = userTestQuery;
    const userId = userIdQuery ? userIdQuery : currentUserId;
    await this.userService.validateUserId(userId);

    const subtypes: Subtype[] = await this.minorService.getSubtypeOfTest(
      typeOfTest,
    );
    return this.generateUserSubtypeResponse(subtypes, userId);
  }

  async getListUserTestResultsByCoach(
    currentUserId: string,
    request: GetListUserTestByCategory,
  ): Promise<ListUserTestResponse[]> {
    const { teamId, typeOfTest } = request;
    const user: User = await this.userRepository.getOne({
      userId: currentUserId,
    });
    const teamIdQuery = teamId || user?.coachCareer?.primaryTeamId;
    if (!teamIdQuery) return [];

    const listPlayerInTeam: UserInfoDto[] =
      await this.teamsService.getAllMemberInTeam(currentUserId, teamIdQuery, {
        userType: UserTypes.PLAYER,
      });

    const subtypes: Subtype[] = await this.minorService.getSubtypeOfTest(
      typeOfTest,
    );
    return await this.generateListUserSubtypeResponse(
      subtypes,
      listPlayerInTeam,
    );
  }

  async mappingUserTestIntoTestList(
    listTests: Test[],
    userId: string,
  ): Promise<UserTestResponse[]> {
    const userTestResponse: UserTestResponse[] = await Promise.all(
      listTests.map(async (test) => {
        //# get all with testId - userId
        const lastUserTest: UserTest[] =
          await this.repository.getTwoLastUserTest(
            test.subtypeId,
            test._id.toString(),
            userId,
          );

        //# generate response for each testId
        const responseUserTest: UserTestResponse =
          await this.generateNewestUserTest(lastUserTest, test);
        responseUserTest.testId = test._id.toString();
        responseUserTest.nameOfTest = test.testName;
        responseUserTest.typeOfLogo = test.logoType;
        responseUserTest.subtypeId = test.subtypeId;
        responseUserTest.metric = test.metric;

        return responseUserTest;
      }),
    );
    return userTestResponse;
  }

  async generateNewestUserTest(
    last2UserTest: UserTest[],
    test: Test,
    sequence?: Sequence,
  ): Promise<UserTestResponse> {
    switch (last2UserTest.length) {
      case 0: {
        return new UserTestResponse({
          testId: test._id.toString(),
          nameOfTest: test.testName,
          typeOfLogo: test.logoType,
          metric: test.metric,
        });
      }

      case 1: {
        const _lastTest = last2UserTest[0];

        let controllerResponse: ControllerResponse;
        if (_lastTest.controllerId) {
          const controllerInfo: UserInfoDto = await mappingUserInfoById(
            _lastTest.controllerId,
          );
          controllerResponse = new ControllerResponse({
            username: controllerInfo.username,
            link: controllerInfo.bioUrl,
            type: controllerInfo.type,
            userId: _lastTest.controllerId,
            fullName: controllerInfo.fullName,
          });
        } else {
          controllerResponse = {
            userId: '',
            username: '',
            link: '',
            type: UserTypes.PLAYER,
            fullName: '',
          };
        }

        const result: UserTestResponse = {
          id: _lastTest._id.toString(),
          subtypeId: _lastTest.subtypeId,
          testId: _lastTest.testId,
          controller: controllerResponse,
          point: _lastTest.point,
          title: _lastTest.title,
          value: _lastTest.value,
          metric: _lastTest.metric,
          level: _lastTest.level,
          changingTurn: ChangingTurn.UP,

          date: _lastTest.date,
          time: _lastTest.time,
          arena: _lastTest.arena,
          userId: _lastTest.userId,
          media: _lastTest.media.map((e) => {
            return {
              type: e.type,
              url: e.url,
              source: e.source,
              thumbnail: e.thumbnail,
              uniqueKey: e.uniqueKey,
            } as MediaDto;
          }),
          isPublic: _lastTest.isPublic,
          isVerified: _lastTest.isVerified,
          isDeleted: _lastTest.isDeleted,
          // default value, will asign this later
          nameOfTest: test.testName,
          typeOfLogo: test.logoType,
          executedTime: _lastTest.executedTime,
        };

        return result;
      }

      case 2: {
        const _lastTest: UserTest = last2UserTest[0];
        const _2ndLastTest: UserTest = last2UserTest[1];

        if (sequence == Sequence.INCREASING) {
          const result: UserTestResponse = {
            id: _2ndLastTest._id.toString(),
            subtypeId: _2ndLastTest.subtypeId,
            testId: _2ndLastTest.testId,
            controller: await this.mappingControllerInfo(
              _lastTest.controllerId,
            ),
            point: _2ndLastTest.point,
            title: _2ndLastTest.title,
            value: _2ndLastTest.value,
            metric: _2ndLastTest.metric,
            level: _2ndLastTest.level,
            changingTurn:
              _2ndLastTest.point >= _2ndLastTest.point
                ? ChangingTurn.UP
                : ChangingTurn.DOWN,

            date: _2ndLastTest.date,
            time: _2ndLastTest.time,
            executedTime: _2ndLastTest.executedTime,

            arena: _2ndLastTest.arena,
            userId: _2ndLastTest.userId,
            media: _2ndLastTest.media.map((e) => {
              return {
                type: e.type,
                url: e.url,
                source: e.source,
                thumbnail: e.thumbnail,
                uniqueKey: e.uniqueKey,
              } as MediaDto;
            }),
            isPublic: _2ndLastTest.isPublic,
            isVerified: _2ndLastTest.isVerified,
            isDeleted: _2ndLastTest.isDeleted,

            // default value, will asign this later
            nameOfTest: test.testName,
            typeOfLogo: test.logoType,
          };

          return result;
        } else {
          const result: UserTestResponse = {
            id: _lastTest._id.toString(),
            subtypeId: _lastTest.subtypeId,
            testId: _lastTest.testId,
            controller: await this.mappingControllerInfo(
              _lastTest.controllerId,
            ),
            point: _lastTest.point,
            title: _lastTest.title,
            value: _lastTest.value,
            metric: _lastTest.metric,
            level: _lastTest.level,
            changingTurn:
              _lastTest.point >= _2ndLastTest.point
                ? ChangingTurn.UP
                : ChangingTurn.DOWN,

            date: _lastTest.date,
            time: _lastTest.time,
            executedTime: _lastTest.executedTime,

            arena: _lastTest.arena,
            userId: _lastTest.userId,
            media: _lastTest.media.map((e) => {
              return {
                type: e.type,
                url: e.url,
                source: e.source,
                thumbnail: e.thumbnail,
                uniqueKey: e.uniqueKey,
              } as MediaDto;
            }),
            isPublic: _lastTest.isPublic,
            isVerified: _lastTest.isVerified,
            isDeleted: _lastTest.isDeleted,

            // default value, will asign this later
            nameOfTest: test.testName,
            typeOfLogo: test.logoType,
          };

          return result;
        }
      }
    }
  }

  getAvgPoint(filteredUserTests: UserTestResponse[]): number {
    const listPoint: number[] = filteredUserTests
      .map((e) => e.point)
      .filter((e) => e != -1);

    if (listPoint.length == 0) {
      return -1;
    }
    const avgPoint: number = listPoint.reduce((avg, element, _, { length }) => {
      return avg + element / length;
    }, 0);
    return Math.floor(avgPoint);
  }

  getAvgChangingTurn(filteredUserTests: UserTestResponse[]): ChangingTurn {
    //# TODO: calculate point for return the right ChangingTurn
    if (filteredUserTests.length == -1) {
      return ChangingTurn.UP;
    }

    const numberOfTurnUp = filteredUserTests.reduce(
      (sum, current, idx, array) => {
        if (current.changingTurn == ChangingTurn.UP) {
          return sum + 1;
        }
      },
      0,
    );

    return numberOfTurnUp >= filteredUserTests.length / 2
      ? ChangingTurn.UP
      : ChangingTurn.DOWN;
  }

  async validateNotFoundUserTest(userTestId: string): Promise<void> {
    const userTest = await this.repository.getOne({
      _id: userTestId,
    });

    if (!userTest) {
      throw new NotFoundException(ResponseMessage.Test.USER_TEST_NOT_FOUND);
    }
  }

  classifyPoint(point: number): TestLevel {
    let level: TestLevel;
    switch (true) {
      case point >= 0 && point < 40: {
        level = TestLevel.AMATEUR;
        break;
      }
      case point >= 40 && point < 70: {
        level = TestLevel.SEMI_PRO;
        break;
      }
      case point >= 70 && point < 90: {
        level = TestLevel.PRO;
        break;
      }
      case point >= 90 && point <= 100: {
        level = TestLevel.INTERNATIONAL;
        break;
      }
      default: {
        level = TestLevel.AMATEUR;
        break;
      }
    }
    return level;
  }

  async tableSequence(
    subtypeId: string,
    testId: string,
    gender?: GenderTypes,
  ): Promise<TableSequence> {
    const subtype: Subtype = await this.subtypeRepository.getOne(
      { _id: subtypeId },
      {
        _id: 1,
        tests: 1,
        testType: 1,
      },
    );

    const test: Test = subtype.tests.find((e) => testId == e._id.toString());
    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const formatedTestName: string = normalizeTextFormula(test.testName);
    const id = `${subtype.testType}_${gender}`;

    const docs = await db.collection('caches').doc(id).get();

    if (!Object.keys(docs.data()).includes(formatedTestName)) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const data: string[] = docs.data()[`${formatedTestName}`];
    const indexColumn = docs.data()[`TestIndex`];

    return Array.from(data[2])[0] === '>'
      ? {
          sequence: Sequence.DECREASING,
          data: data,
          indexColumn: indexColumn,
          testName: data[0],
        }
      : {
          sequence: Sequence.INCREASING,
          data: data,
          indexColumn: indexColumn,
          testName: data[0],
        };
  }

  classifyUserTestResult(point: number): TestLevel {
    let level: TestLevel;
    switch (true) {
      case point >= 0 && point < 40: {
        level = TestLevel.AMATEUR;
        break;
      }
      case point >= 40 && point < 70: {
        level = TestLevel.SEMI_PRO;
        break;
      }
      case point >= 70 && point < 90: {
        level = TestLevel.PRO;
        break;
      }
      case point >= 90 && point <= 100: {
        level = TestLevel.INTERNATIONAL;
        break;
      }
      default: {
        level = TestLevel.AMATEUR;
        break;
      }
    }
    return level;
  }

  async calculatePointTest(
    subtypeId: string,
    testId: string,
    userGender: GenderTypes,
    userWeight: number,
    resultValue: number,
  ): Promise<number> {
    const tableSequence: TableSequence = await this.tableSequence(
      subtypeId,
      testId,
      userGender,
    );
    const { testName, sequence, indexColumn, data } = tableSequence;
    let value = Number(resultValue);
    let indexCompare = 0;

    if (data.includes('kg/bodyweight')) {
      value =
        Math.round((Number(resultValue) / userWeight + Number.EPSILON) * 1000) /
        1000;
    }

    if (sequence == Sequence.INCREASING) {
      indexCompare = this.findIndexWithIncreasingSequence(data, value);
    } else {
      indexCompare = this.findIndexWithDecreasingSequence(data, value);
    }
    const point: number = +indexColumn[indexCompare];
    return point;
  }

  findIndexWithIncreasingSequence(data: any[], value: number): number {
    const FIRST_VALUE_INDEX = 3;
    const LAST_VALUE_INDEX = 103;

    if (value < +data[FIRST_VALUE_INDEX]) {
      return FIRST_VALUE_INDEX;
    }
    if (value > +data[LAST_VALUE_INDEX]) {
      return LAST_VALUE_INDEX;
    }

    const equalValue: number = data.findIndex((e) => e == value);
    if (equalValue != -1) {
      return equalValue;
    }

    const formatedData = deleteNullValuesInArray(data);
    let lastValueSuitCondition: number;
    for (let i = FIRST_VALUE_INDEX; i < formatedData.length; i++) {
      if (value >= formatedData[i]) {
        lastValueSuitCondition = formatedData[i];
        // break;
      }
    }
    return data.findIndex((e) => e == lastValueSuitCondition);
  }

  findIndexWithDecreasingSequence(data: any[], value: number): number {
    const FIRST_VALUE_INDEX = 3;
    const LAST_VALUE_INDEX = 103;

    if (value > +data[FIRST_VALUE_INDEX]) {
      return FIRST_VALUE_INDEX;
    }
    if (value < +data[LAST_VALUE_INDEX]) {
      return LAST_VALUE_INDEX;
    }

    const equalValue: number = data.findIndex((e) => e == value);
    if (equalValue != -1) {
      return equalValue;
    }

    const formatedData = deleteNullValuesInArray(data).filter((e) => !isNaN(e));
    let lastValueSuitCondition: number;
    for (let i = FIRST_VALUE_INDEX; i < formatedData.length; i++) {
      if (value <= formatedData[i]) {
        lastValueSuitCondition = formatedData[i];
      }
    }
    return data.findIndex((e) => e == lastValueSuitCondition);
    // let indexCompare = 0;
    // const INDEX_OF_THE_FIRST_VALUE = 3;
    // const INDEX_OF_THE_LAST_VALUE = 102;

    // for (let i = 100; i >= 2; i--) {
    //   let elementAfter = data[i + 1];

    //   if (value < Number(data[INDEX_OF_THE_LAST_VALUE])) {
    //     indexCompare = INDEX_OF_THE_LAST_VALUE;
    //     break;
    //   }
    //   if (value <= Number(data[i]) && value > elementAfter) {
    //     indexCompare = i;
    //     break;
    //   }
    //   if (value > Number(data[INDEX_OF_THE_FIRST_VALUE])) {
    //     indexCompare = INDEX_OF_THE_FIRST_VALUE;
    //     break;
    //   }
    //   elementAfter = data[i];
    // }

    // return indexCompare;
  }

  generateUserRole(user: User): Role[] {
    const roles: string[] = user.playerCareer.favoriteRoles;
    if (!roles.length) {
      return [Role.ALL];
    }

    const result: Role[] = [];
    roles.forEach((role) => {
      if (['CB', 'RB', 'LB'].includes(role)) {
        result.push(Role.DEFENDERS);
      }
      if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(role)) {
        result.push(Role.MIDFIELDERS);
      }
      if (['CF', 'ST', 'RW', 'LW'].includes(role)) {
        result.push(Role.FORWARDS);
      }
    });
    result.push(Role.ALL);
    return result.concat(roles.map((e) => e as Role));
  }

  async createUserTest(
    userTestDto: UserTestRequest,
    userId: string,
    timezone: string,
    isCoachCreated = false,
  ): Promise<UserTest> {
    const user: User = await this.userRepository.getOne({
      userId,
    });
    const test: Test = await this.subtypeRepository.getOneTestv2(
      userTestDto.testId,
    );
    const lastUnverifiedResult: number = await this.repository.count({
      userId,
      testId: userTestDto.testId,
      isVerified: false,
      isDeleted: false,
    });
    // if (lastUnverifiedResult > 0) {
    //   throw new BadRequestException(
    //     ResponseMessage.Test.USER_TEST_HAVING_1_UNVERIFIED,
    //   );
    // }
    if (!user) {
      throw new NotFoundException(ResponseMessage.User.NOT_FOUND);
    }
    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }
    if (userTestDto.controller && userTestDto.controller == userId) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_ERROR_VERIFY_MYSELF_RESULT,
      );
    }
    let controller: User = null;
    if (userTestDto.controller) {
      await this.userService.validateUserId(userTestDto.controller);

      controller = await this.userRepository.getOne({
        userId: userTestDto.controller,
      });
    }

    const bodyWeight: number = user.health?.weight.value || 1;
    const point: number = await this.calculatePointTest(
      userTestDto.subtypeId,
      userTestDto.testId,
      user.profile.gender,
      bodyWeight,
      userTestDto.value,
    );
    const userTest: UserTest = {
      _id: new mongoose.Types.ObjectId(),
      subtypeId: userTestDto.subtypeId,
      testId: userTestDto.testId,

      controllerId: userTestDto.controller,
      controllerUsername: controller?.username || '',
      controllerLink: controller
        ? getBioUrl({
            type: controller.type,
            username: controller.username,
            lastName: controller?.profile?.lastName,
            firstName: controller?.profile?.firstName,
          })
        : '',
      controllerType: controller?.type || UserTypes.COACH,
      controllerFullname: controller
        ? ((controller?.profile?.firstName as string) || 'Zporter') +
          ' ' +
          ((controller?.profile?.lastName as string) || 'Anonymous')
        : '',

      userId,
      username: user.username,
      userType: user.type,
      birthCountry: user.profile.birthCountry,
      country: user.profile.birthCountry.name,

      birthYear: user.profile.birthDay.substring(0, 4),
      gender: user.profile.gender,
      clubId: user.playerCareer?.clubId || '',
      teamId: user.playerCareer?.primaryTeamId || '',
      role: this.generateUserRole(user),
      bodyWeight: bodyWeight,
      title: userTestDto.title,
      value: userTestDto.value,
      metric: userTestDto.metric,

      point: point,
      level: this.classifyPoint(point),

      executedTime: this.dateUtil.formatDateTimeForUserTest(
        userTestDto.date,
        userTestDto.time,
        timezone,
      ),
      date: userTestDto.date,
      time: userTestDto.time,
      arena: userTestDto.arena,
      media: userTestDto.media.length
        ? userTestDto.media.map((media) => {
            const mediaDto: MediaDto = new MediaUtil().processThumbnailVideo(
              media,
            );
            return new MediaSource({
              source: mediaDto.source,
              thumbnail: mediaDto.thumbnail,
              type: mediaDto.type,
              uniqueKey: mediaDto.uniqueKey,
              url: mediaDto.url,
            });
          })
        : [],

      isPublic: userTestDto.isPublic,
      isVerified: isCoachCreated ? true : false,
      isDeleted: false,
      createdAt: this.dateUtil.getNowTimeInMilisecond(),
      updatedAt: this.dateUtil.getNowTimeInMilisecond(),
      isConfirmed: false,
      faceImage: user?.media?.faceImage
        ? (user?.media?.faceImage as string)
        : process.env.DEFAULT_IMAGE,
    };

    await this.repository.createOrUpdate(userTest);

    if (userTestDto.controller) {
      await this.noticeControllerV2(
        user,
        userTestDto.controller,
        userTest,
        isCoachCreated,
      );
    }
    return userTest;
  }

  async createUserTestByCoach(
    userTestCoachDto: UserTestRequestForCoach,
    currentUserId: string,
    timezone: string,
  ): Promise<void> {
    const { userId } = userTestCoachDto;
    const userTestDto: UserTestRequest = {
      ...userTestCoachDto,
      controller: currentUserId,
    };

    const userTest = await this.createUserTest(
      userTestDto,
      userId,
      timezone,
      true,
    );
    const controller: UserInfoDto = await mappingUserInfoById(
      userTest.controllerId,
    );

    userTest.isConfirmed = true;
    userTest.controllerUsername = controller.username;
    userTest.controllerLink = controller.bioUrl;
    userTest.controllerType = controller.type;

    await this.repository.createOrUpdate(userTest, {
      _id: userTest._id.toString(),
    });
    await this.resultStorageService.createResultStorage(userTest);
  }

  async noticeControllerV2(
    user: User,
    controllerId: string,
    userTest: UserTest,
    isCoachCreated = false,
  ): Promise<void> {
    const player: UserInfoDto = await mappingUserInfoById(userTest.userId);
    const controller: UserInfoDto = await mappingUserInfoById(controllerId);
    const test: Test = await this.subtypeRepository.getOneTest(
      userTest.subtypeId,
      userTest.testId,
    );
    const beforeUserTest: UserTest = await this.repository.getBeforeUserTest(
      userTest.testId,
      user.userId,
      userTest._id.toString(),
      {
        _id: 1,
        point: 1,
      },
    );

    const userTestResponse: UserTestResponse = this.generateUserTestResponse(
      userTest,
      controller,
      test,
      beforeUserTest,
    );
    const now: number = this.dateUtil.getNowTimeInMilisecond();

    if (isCoachCreated) {
      const payload = new CreateNotificationDto();
      payload.token = player?.fcmToken || [];
      payload.notificationType = NotificationType.ADDED_TEST_RECORD_BY_COACH;
      payload.postId = '';
      payload.title = `#${controller?.username}`;
      payload.senderId = '';
      payload.receiverId = player.userId;
      payload.userType = UserTypes.COACH;
      payload.username = controller?.username;
      payload.content = `${test.testName} ${userTest?.value} ${
        userTest.metric
      }, ${this.dateUtil.getDateFormat()} `;
      payload.largeIcon = controller?.faceImage || process.env.DEFAULT_IMAGE;
      payload.others = {
        data: JSON.stringify({
          userTest: userTestResponse,
          userInfo: {
            fullName: player.fullName,
            birthYear: player.birthDay.slice(0, 4),
            country: player.settingCountryName,
            region: player.settingCountryRegion,
          },
          createdAt: now,
          updatedAt: now,
        }),
      };

      const payloadForCoach = new CreateNotificationDto();
      payloadForCoach.token = controller?.fcmToken || [];
      payloadForCoach.notificationType =
        NotificationType.SEND_TEST_RECORD_TO_COACH;
      payloadForCoach.postId = '';
      payloadForCoach.title = `Zporter`;
      payloadForCoach.senderId = '';
      payloadForCoach.receiverId = controller.userId;
      payloadForCoach.userType = UserTypes.COACH;
      payloadForCoach.username = player?.username;
      payloadForCoach.content = `${test.testName} ${userTest?.value} ${
        userTest.metric
      }, ${this.dateUtil.getDateFormat()} `;
      payloadForCoach.largeIcon =
        player?.faceImage || process.env.DEFAULT_IMAGE;
      payloadForCoach.others = {
        data: JSON.stringify({
          userTest: userTestResponse,
          userInfo: {
            fullName: player.fullName,
            birthYear: player.birthDay.slice(0, 4),
            country: player.settingCountryName,
            region: player.settingCountryRegion,
          },
          createdAt: now,
          updatedAt: now,
        }),
      };
      await Promise.all([
        this.notificationsService.sendMulticastNotification(payload),
        this.notificationsService.sendMulticastNotification(payloadForCoach),
      ]);
    } else {
      const payload = new CreateNotificationDto();
      payload.token = controller?.fcmToken || [];
      payload.postId = '';
      payload.title = `#${user?.username}`;
      payload.senderId = '';
      payload.receiverId = isCoachCreated ? user.userId : controllerId;
      payload.userType = UserTypes.SYS_ADMIN;
      payload.username = user?.username;
      payload.content = `${test.testName}`;
      payload.largeIcon = controller?.faceImage || process.env.DEFAULT_IMAGE;
      payload.notificationType = NotificationType.VERIFY_TEST_RECORD;
      payload.others = {
        data: JSON.stringify({
          userTest: userTestResponse,
          userInfo: {
            fullName: player.fullName,
            birthYear: player.birthDay.slice(0, 4),
            country: player.settingCountryName,
            region: player.settingCountryRegion,
          },
          createdAt: now,
          updatedAt: now,
        }),
      };
      await this.notificationsService.sendMulticastNotification(payload);
    }
  }

  async noticeController(
    user: User,
    controllerId: string,
    userTest: UserTest,
    notificationType: NotificationType,
    isCoachCreated = false,
  ): Promise<void> {
    const sender: UserInfoDto = await mappingUserInfoById(userTest.userId);
    const controller: UserInfoDto = await mappingUserInfoById(controllerId);
    const test: Test = await this.subtypeRepository.getOneTest(
      userTest.subtypeId,
      userTest.testId,
    );
    const beforeUserTest: UserTest = await this.repository.getBeforeUserTest(
      userTest.testId,
      user.userId,
      userTest._id.toString(),
      {
        _id: 1,
        point: 1,
      },
    );

    const userTestResponse: UserTestResponse = this.generateUserTestResponse(
      userTest,
      controller,
      test,
      beforeUserTest,
    );
    const now: number = this.dateUtil.getNowTimeInMilisecond();

    const payload = new CreateNotificationDto();
    payload.token = controller?.fcmToken || [];
    payload.postId = '';
    payload.title = `#${
      isCoachCreated ? controller?.username : user?.username
    }`;
    payload.senderId = '';
    payload.receiverId = isCoachCreated ? user.userId : controllerId;
    payload.userType = UserTypes.SYS_ADMIN;
    payload.username = isCoachCreated ? controller?.username : user?.username;
    payload.content = isCoachCreated
      ? `${test.testName} ${userTest?.value} ${
          userTest.metric
        }, ${this.dateUtil.getDateFormat()} `
      : `${test.testName}`;
    payload.largeIcon = controller?.faceImage || process.env.DEFAULT_IMAGE;
    payload.notificationType = notificationType;
    payload.others = {
      data: JSON.stringify({
        userTest: userTestResponse,
        userInfo: {
          fullName: sender.fullName,
          birthYear: sender.birthDay.slice(0, 4),
          country: sender.settingCountryName,
          region: sender.settingCountryRegion,
        },
        createdAt: now,
        updatedAt: now,
      }),
    };

    await this.notificationsService.sendMulticastNotification(payload);
  }

  generateUserTestResponse(
    userTest: UserTest,
    controller: UserInfoDto,
    test: Test,
    lastUserTest: UserTest,
  ): UserTestResponse {
    const userTestResponse: UserTestResponse = {
      id: userTest._id.toString(),

      nameOfTest: test.testName,
      subtypeId: test.subtypeId,
      typeOfLogo: test.logoType,

      testId: test._id.toString(),
      controller: controller
        ? ({
            fullName: controller.fullName,
            link: controller.bioUrl,
            type: controller.type,
            userId: controller.userId,
            username: controller.username,
          } as ControllerResponse)
        : ({
            userId: '',
            username: '',
            link: '',
            type: UserTypes.PLAYER,
            fullName: '',
          } as ControllerResponse),
      point: userTest.point,
      title: userTest.title,
      value: userTest.value,
      metric: userTest.metric,
      level: userTest.level,
      changingTurn:
        lastUserTest && userTest.point < lastUserTest.point
          ? ChangingTurn.DOWN
          : ChangingTurn.UP,
      date: userTest.date,
      time: userTest.time,
      executedTime: userTest.executedTime,
      arena: userTest.arena,
      userId: userTest.userId,
      media: userTest.media.map((e) => {
        return {
          type: e.type,
          url: e.url,
          source: e.source,
          thumbnail: e.thumbnail,
          uniqueKey: e.uniqueKey,
        } as MediaDto;
      }),
      isPublic: userTest.isPublic,
      isVerified: userTest.isVerified,
      isDeleted: userTest.isDeleted,
    };
    return userTestResponse;
  }

  async getListLeaderboard(
    getLeaderboard: GetLeaderboardRequest,
  ): Promise<LeaderboardResponse> {
    const test: Test = await this.subtypeRepository.getOneTestv2(
      getLeaderboard.testId,
      false,
    );
    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const { startTime, endTime } = this.dateUtil.getRangeTime(
      getLeaderboard.lastDateRange,
    );

    const userTest: UserTest[] = await this.repository.getLeaderboardResult(
      this.minorService.generateLeaderboardCondition(getLeaderboard),
      startTime,
      endTime,
      +getLeaderboard.startAfter,
      +getLeaderboard.limit,
      test.sequence,
    );
    const leaderboardResults: UserTestLeaderboardResponse[] =
      userTest?.length > 0
        ? await Promise.all(
            userTest?.map(
              async (e) =>
                await this.minorService.generateLeaderboardResponse(e),
            ),
          )
        : [];

    const references =
      test?.references?.map((e) => {
        const referenceResponse: ReferenceResponse = {
          testId: e.testId,
          testName: e.testName,
        };
        return referenceResponse;
      }) || [];

    return new LeaderboardResponse({
      testId: getLeaderboard.testId,
      leaderboardResults,
      references,
    });
  }

  async getIndividualTestChart(
    currentUserId: string,
    getChart: GetIndividualChartRequest,
  ): Promise<ChartResponse> {
    const { userIdQuery, testId, lastDateRange } = getChart;
    const userId = userIdQuery ? userIdQuery : currentUserId;

    await this.userService.validateUserId(userId);
    const test: Test = await this.subtypeRepository.getOneTestv2(testId, false);
    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    const nodes: NodeChart[] = [];
    const NUMBER_OF_POINTS_IN_CHART = 6;

    const dateRanges = this.dateUtil.getArrayDateRangeForChart(
      lastDateRange,
      NUMBER_OF_POINTS_IN_CHART,
    );

    for (let index = 0; index < NUMBER_OF_POINTS_IN_CHART; index++) {
      const { startTime, endTime } = dateRanges[index];

      let userTestsAmongTime: UserTest[];
      if (index == NUMBER_OF_POINTS_IN_CHART - 1) {
        userTestsAmongTime = await this.repository.get({
          match: {
            userId,
            testId: test._id.toString(),
            isDeleted: false,
            isVerified: true,
            executedTime: {
              $gte: startTime,
            } as ConditionObject,
          },
        });
      } else {
        userTestsAmongTime = await this.repository.get({
          match: {
            userId,
            testId: test._id.toString(),
            isDeleted: false,
            isVerified: true,
            executedTime: {
              $gte: startTime,
              $lte: endTime,
            } as ConditionObject,
          },
        });
      }

      if (!userTestsAmongTime.length) {
        nodes.push(new NodeChart());
      } else {
        const maxUserTest: UserTest = userTestsAmongTime.find(
          (e) => e.value == Math.max(...userTestsAmongTime.map((o) => o.value)),
        );
        const fromDateString: string = this.dateUtil.convertToDateFormat(
          startTime,
          DateFormat.MM_DD_YYYY,
        );
        const toDateString: string = this.dateUtil.convertToDateFormat(
          endTime,
          DateFormat.MM_DD_YYYY,
        );

        const newNode: NodeChart = new NodeChart({
          index,
          value: maxUserTest.value,
          point: maxUserTest.point,
          level: maxUserTest.level,
          day: `${fromDateString} - ${toDateString}`,
        });
        nodes.push(newNode);
      }
    }

    const chart: ChartResponse = new ChartResponse({
      numberNodes: nodes.length,
      nodes,
    });

    return chart;
  }

  async shareUserTestResult(
    userTestId: string,
    currentUserId: string,
  ): Promise<void> {
    const userTest: UserTest = await this.repository.getOne({
      _id: userTestId,
    });
    this.validateForShareUserTestResult(userTest, currentUserId);

    const test: Test = await this.subtypeRepository.getOneTestv2(
      userTest.testId,
      false,
    );
    if (!test) {
      throw new NotFoundException(ResponseMessage.Test.TEST_NOT_FOUND);
    }

    //# get all with testId - userId
    const lastUserTest: UserTest[] =
      await this.userTestRepository.getTwoLastUserTest(
        userTest.subtypeId,
        userTest.testId,
        userTest.userId,
      );

    //# generate response for each testId
    const responseUserTest: UserTestResponse =
      await this.generateNewestUserTest(lastUserTest, test);

    const nowTime: number = new DateUtil().getNowTimeInMilisecond();
    // eslint-disable-next-line @typescript-eslint/ban-types
    const data: Object = JSON.parse(
      JSON.stringify({
        ...responseUserTest,
        userId: currentUserId,
        typeOfPost: TypeOfPost.USER_TEST_POST,
        createdAt: nowTime,
        updatedAt: nowTime,
      }),
    );

    const testCheck = await db
      .collection('user_test_posts')
      .doc(userTestId)
      .get();
    if (testCheck.exists) {
      await db
        .collection('user_test_posts')
        .doc(userTestId)
        .set(data, { merge: true });
    } else {
      await db.collection('user_test_posts').doc(userTestId).set(data);
    }

    await this.feedService.synchronizePostsToMongoose({
      postId: userTestId,
      typeOfPost: TypeOfPost.USER_TEST_POST,
    });
  }

  validateForShareUserTestResult(
    userTest: UserTest,
    currentUserId: string,
  ): void {
    if (!userTest) {
      throw new NotFoundException(ResponseMessage.Test.USER_TEST_NOT_FOUND);
    } else if (userTest.userId != currentUserId) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_SHARE,
      );
    } else if (!userTest.isPublic) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_SHARE_PRIVATE,
      );
    } else if (!userTest.isVerified) {
      throw new BadRequestException(
        ResponseMessage.Test.USER_TEST_CAN_NOT_SHARE_UNVERIFIED,
      );
    }
  }

  async statisticalTotalTestsVerified(
    userId: string,
  ): Promise<IStatisticalAwardTests> {
    const resp = await this.userTestsModel.aggregate([
      {
        $lookup: {
          from: 'subtype_tests',
          let: {
            subtypeId: { $toObjectId: '$subtypeId' },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$subtypeId'],
                },
              },
            },
          ],
          as: 'subtypeTests',
        },
      },
      {
        $unwind: '$subtypeTests',
      },
      {
        $match: {
          userId: userId,
          isConfirmed: true,
          isDeleted: false,
          isPublic: true,
          isVerified: true,
        },
      },
      {
        $project: {
          totalPhysical: {
            $cond: [
              {
                $and: [
                  {
                    $gte: [
                      {
                        $size: {
                          $filter: {
                            input: '$subtypeTests.tests',
                            cond: {
                              $eq: [
                                '$$this._id',
                                {
                                  $toObjectId: '$testId',
                                },
                              ],
                            },
                          },
                        },
                      },
                      1,
                    ],
                  },
                  {
                    $eq: ['$subtypeTests.testType', TestType.PHYSICAL],
                  },
                ],
              },
              1,
              0,
            ],
          },
          totalTechnical: {
            $cond: [
              {
                $and: [
                  {
                    $gte: [
                      {
                        $size: {
                          $filter: {
                            input: '$subtypeTests.tests',
                            cond: {
                              $eq: [
                                '$$this._id',
                                {
                                  $toObjectId: '$testId',
                                },
                              ],
                            },
                          },
                        },
                      },
                      1,
                    ],
                  },
                  {
                    $eq: ['$subtypeTests.testType', TestType.TECHNICAL],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalTechnical: { $sum: '$totalTechnical' },
          totalPhysical: { $sum: '$totalPhysical' },
        },
      },
    ]);

    return {
      totalPhysical: resp[0]?.totalPhysical || 0,
      totalTechnical: resp[0]?.totalTechnical || 0,
    };
  }
}
