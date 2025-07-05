import { Inject, Injectable } from '@nestjs/common';
import moment from 'moment';
import { GenderTypes } from '../../../../../common/constants/common.constant';
import { DateUtil } from '../../../../../utils/date-util';
import { ClubRepository } from '../../../../clubs/repository/club.repository';
import { AgeGroup } from '../../../../dashboard/dto/dashboard.req.dto';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { UserRepository } from '../../../../users/repositories/user/user.repository';
import { IUserRepository } from '../../../../users/repositories/user/user.repository.interface';
import { GetLeaderboardRequest } from '../../../dtos/user-test/request/get-leader-board.request';
import { ControllerResponse } from '../../../dtos/user-test/response/controller.response';
import { UserTestLeaderboardResponse } from '../../../dtos/user-test/response/user-test.leaderboard.response';
import { SubtypeRepository } from '../../../repository/subtype/subtype.repository';
import { ISubtypeRepository } from '../../../repository/subtype/subtype.repository.interface';
import { UserTest } from '../../../repository/user-test/user-test';
import { IMinorUserTestService } from './minor.user-test.interface';
import { Subtype } from '../../../repository/subtype/subtype';
import { TestType } from '../../../enums/test-type';

@Injectable()
export class MinorUserTesService implements IMinorUserTestService {
  constructor(
    @Inject(ClubRepository)
    private readonly clubRepository: ClubRepository,
    @Inject(SubtypeRepository)
    private readonly subtypeRepository: ISubtypeRepository,
    @Inject(UserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async generateLeaderboardResponse(
    userTest: UserTest,
  ): Promise<UserTestLeaderboardResponse> {
    const [club, test, user] = await Promise.all([
      this.clubRepository.customedFindOne(
        { clubId: userTest.clubId },
        { _id: 1, clubId: 1, clubName: 1 },
      ),
      this.subtypeRepository.getOneTestv2(userTest.testId, false),
      this.userRepository.getOne(
        { userId: userTest.userId },
        { _id: 1, media: 1 },
      ),
    ]);
    const faceImage: string =
      user?.media?.faceImage || process.env.DEFAULT_IMAGE;

    const controllerResponse: ControllerResponse = !userTest.controllerId
      ? new ControllerResponse()
      : ({
          fullName: userTest.controllerFullname,
          link: userTest.controllerLink,
          type: userTest.controllerType,
          userId: userTest.controllerId,
          username: userTest.controllerUsername,
        } as ControllerResponse);

    const mediaDto: MediaDto[] = userTest.media.map((e) => {
      return {
        type: e.type,
        url: e.url,
        source: e.source,
        thumbnail: e.thumbnail,
        uniqueKey: e.uniqueKey,
      } as MediaDto;
    });

    const userTestResponse: UserTestLeaderboardResponse = {
      id: userTest._id.toString(),
      subtypeId: userTest.subtypeId,
      testId: userTest.testId,
      controller: controllerResponse,
      userId: userTest.userId,
      username: userTest.username,
      userType: userTest.userType,
      point: userTest.point,
      clubName: club.clubName,
      title: userTest.title,
      value: userTest.value,
      metric: userTest.metric,
      level: userTest.level,
      date: userTest.date,
      time: userTest.time,
      executedTime: userTest.executedTime,
      arena: userTest.arena,
      media: mediaDto,
      typeOfLogo: test.logoType,
      faceImage,
    };
    return userTestResponse;
  }

  generateLeaderboardCondition(
    getLeaderboard: GetLeaderboardRequest,
  ): Object[] {
    const matchCondition: any[] = [];
    // const filterCondition: Object ;
    Object.entries(getLeaderboard)
      .filter((e) => e[1])
      .forEach((e) => {
        switch (e[0]) {
          case 'testId': {
            matchCondition.push({
              testId: e[1],
            });
            break;
          }
          case 'clubId': {
            matchCondition.push({
              clubId: e[1],
            });
            break;
          }
          case 'teamId': {
            matchCondition.push({
              teamId: e[1],
            });
            break;
          }

          case 'role': {
            matchCondition.push({
              role: { $in: [e[1]] },
            });
            break;
          }

          case 'country': {
            matchCondition.push({
              'birthCountry.name': e[1],
            });
            break;
          }

          case 'ageGroup': {
            if (e[1] == AgeGroup.ADULT) {
              const thisYear: number = +moment().year();
              const adultYear: number = thisYear - 20;

              matchCondition.push({
                $expr: {
                  $lt: [{ $toInt: '$birthYear' }, adultYear],
                },
              });
            } else {
              const [genderCharactor, birthYear] = e[1].split('_');
              const gender: GenderTypes =
                genderCharactor == 'G' ? GenderTypes.Female : GenderTypes.Male;

              matchCondition.push({
                birthYear,
              });
              matchCondition.push({
                gender,
              });
            }
          }

          default:
            break;
        }
      });

    const { startTime, endTime } = new DateUtil().getRangeTime(
      getLeaderboard.lastDateRange,
    );

    return matchCondition;
  }

  async getSubtypeOfTest(typeOfTest: TestType): Promise<Subtype[]> {
    return await this.subtypeRepository.get({
      match: {
        testType: typeOfTest,
        isDeleted: false,
      },
      project: {
        _id: 1,
        subtypeName: 1,
        testType: 1,
        tests: 1,
        isDeleted: 1,
      },
    });
  }
}
