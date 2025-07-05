import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as moment from 'moment';
import { ResponseMessage } from '../../common/constants/common.constant';
import { db } from '../../config/firebase.config';
import { AchievementsService } from '../achievements/achievements.service';
import { ClubService } from '../clubs/v1/clubs.service';
import { CareerTypes, GetCareersDto } from './dto/career.dto';
import {
  CreateFutureCareerDto,
  CreateHistoricCareerDto,
} from './dto/create-career.dto';
import {
  UpdateFutureCareerDto,
  UpdateHistoricCareerDto,
} from './dto/update-career.dto';
import { ValidateHistoricClubDateDto } from './dto/validate-historic-club-date.dto';
import {
  IFutureCareerPlan,
  IHistoricCareerPlan,
} from './interfaces/career.interface';

@Injectable()
export class CareersService {
  constructor(
    @Inject(forwardRef(() => ClubService))
    private clubService: ClubService,
    @Inject(forwardRef(() => AchievementsService))
    private achievementService: AchievementsService,
  ) {}

  async createHistoricCareer(
    userId: string,
    createHistoricCareerDto: CreateHistoricCareerDto,
  ) {
    const {
      serieMatches,
      cupMatches,
      friendlyMatches,
      wonMatches,
      lostMatches,
      drawMatches,
      league,
      fromTime,
      toTime,
      season,
      country,
      mediaLinks,
      team,
    } = createHistoricCareerDto;

    const totalMatchesPlayed = serieMatches + cupMatches + friendlyMatches;
    const totalMatchesResults = wonMatches + lostMatches + drawMatches;

    if (totalMatchesPlayed !== totalMatchesResults) {
      throw new HttpException(
        `total of "serieMatches + cupMatches + friendlyMatches" has to equal to "wonMatches + lostMatches + drawMatches`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const validateFromTimeAndToTime = await this.validateHistoricClubDateString(
      {
        userId,
        fromTime,
        toTime,
        season,
      },
    );

    if (!validateFromTimeAndToTime) {
      throw new HttpException(
        `make sure you enter a right timing for your historic club. date period of historic club # date period of existing club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const saveCareerPromise = db.collection('careers').add({
      userId,
      type: CareerTypes.Historic,
      ...createHistoricCareerDto,
      league: JSON.parse(JSON.stringify(league)),
      country: JSON.parse(JSON.stringify(country)),
      mediaLinks: JSON.parse(JSON.stringify(mediaLinks)),
      team: JSON.parse(JSON.stringify(team)),
      createdAt: +moment.utc().format('x'), // for sorting, filter
      updatedAt: +moment.utc().format('x'),
      fromTimeUtc: +moment.utc(fromTime).format('x'), //for sorting, filter
      toTimeUtc: +moment.utc(toTime).format('x'),
      fromTime: moment.utc(fromTime).format('YYYY/MM'), //for displaying
      toTime: moment.utc(toTime).format('YYYY/MM'),
    });

    const saveLeaguePromise = db.collection('leagues').add({
      ...league,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });

    await Promise.all([saveCareerPromise, saveLeaguePromise]);

    return ResponseMessage.Career.CREATED_SUCCESS;
  }

  async validateHistoricClubDateString(
    validateHistoricClubDateDto: ValidateHistoricClubDateDto,
  ) {
    const { userId, fromTime, toTime, season } = validateHistoricClubDateDto;

    const userSnapshot = await db.collection('users').doc(userId).get();

    const contractedFromDate = +moment
      .utc(userSnapshot.data()?.playerCareer?.contractedFrom)
      .format('x');

    const contractedUntilDate = +moment
      .utc(userSnapshot.data()?.playerCareer?.contractedUntil)
      .format('x');

    if (!fromTime.includes(season) && !toTime.includes(season)) {
      return false;
    }

    const fromTimeUtc = +moment.utc(fromTime).format('x'); //for sorting, filter
    const toTimeUtc = +moment.utc(toTime).format('x');

    if (fromTimeUtc >= contractedFromDate && toTimeUtc <= contractedUntilDate) {
      return false;
    }

    return true;
  }

  async updateHistoricCareer(
    userId: string,
    careerId: string,
    updateHistoricCareerDto: UpdateHistoricCareerDto,
  ) {
    const [userRef, careerRef] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('careers').doc(careerId).get(),
    ]);

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!careerRef.exists) {
      throw new HttpException(
        ResponseMessage.Career.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (careerRef.data().type !== CareerTypes.Historic) {
      throw new HttpException(
        ResponseMessage.Career.INVALID_CAREER_ID,
        HttpStatus.BAD_REQUEST,
      );
    }

    const {
      serieMatches,
      cupMatches,
      friendlyMatches,
      wonMatches,
      lostMatches,
      drawMatches,
      league,
      fromTime,
      toTime,
    } = updateHistoricCareerDto;

    if (
      serieMatches ||
      cupMatches ||
      friendlyMatches ||
      wonMatches ||
      lostMatches ||
      drawMatches
    ) {
      const totalMatchesPlayed = serieMatches + cupMatches + friendlyMatches;
      const totalMatchesResults = wonMatches + lostMatches + drawMatches;
      if (totalMatchesPlayed !== totalMatchesResults) {
        throw new HttpException(
          `total of "serieMatches + cupMatches + friendlyMatches" has to equal to "wonMatches + lostMatches + drawMatches"`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updatePromises = [];
    const updateFromTimeToTime: any = {};

    if (fromTime) {
      updateFromTimeToTime.fromTimeUtc = +moment.utc(fromTime).format('x');
      updateHistoricCareerDto.fromTime = moment.utc(fromTime).format('YYYY/MM');
    }

    if (toTime) {
      updateFromTimeToTime.toTimeUtc = +moment.utc(toTime).format('x');
      updateHistoricCareerDto.toTime = moment.utc(toTime).format('YYYY/MM');
    }

    const updateCareerPromise = db
      .collection('careers')
      .doc(careerId)
      .set(
        JSON.parse(
          JSON.stringify({
            ...updateHistoricCareerDto,
            updatedAt: +moment.utc().format('x'),
            ...updateFromTimeToTime,
          }),
        ),
        {
          merge: true,
        },
      );

    updatePromises.push(updateCareerPromise);

    if (league) {
      const updateLeaguePromise = db.collection('leagues').add({
        ...league,
        updatedAt: +moment.utc().format('x'),
      });
      updatePromises.push(updateLeaguePromise);
    }

    await Promise.all(updatePromises);

    return ResponseMessage.Career.UPDATED_SUCCESS;
  }

  async createFutureCareer(
    userId: string,
    createFutureCareerDto: CreateFutureCareerDto,
  ) {
    const { league, fromTime, toTime, country, team } = createFutureCareerDto;

    const saveCareerPromise = db.collection('careers').add({
      userId,
      type: CareerTypes.Future,
      ...createFutureCareerDto,
      country: JSON.parse(JSON.stringify(country)),
      league: JSON.parse(JSON.stringify(league)),
      team: JSON.parse(JSON.stringify(team)),
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      fromTimeUtc: +moment.utc(createFutureCareerDto.fromTime).format('x'),
      toTimeUtc: +moment.utc(createFutureCareerDto.toTime).format('x'),
      fromTime: moment.utc(fromTime).format('YYYY-MM'), //for displaying
      toTime: moment.utc(toTime).format('YYYY-MM'),
    });

    const saveLeaguePromise = db.collection('leagues').add({
      ...league,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
    });

    await Promise.all([saveCareerPromise, saveLeaguePromise]);
    return ResponseMessage.Career.CREATED_SUCCESS;
  }

  async updateFutureCareer(
    userId: string,
    careerId: string,
    updateFutureCareerDto: UpdateFutureCareerDto,
  ) {
    const [userRef, careerRef] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('careers').doc(careerId).get(),
    ]);

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!careerRef.exists) {
      throw new HttpException(
        ResponseMessage.Career.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (careerRef.data().type !== CareerTypes.Future) {
      throw new HttpException(
        ResponseMessage.Career.INVALID_CAREER_ID,
        HttpStatus.BAD_REQUEST,
      );
    }

    const { league, fromTime, toTime } = updateFutureCareerDto;

    const updatePromises = [];

    const updateFromTimeToTime: any = {};

    if (fromTime) {
      updateFromTimeToTime.fromTimeUtc = +moment.utc(fromTime).format('x');
      updateFutureCareerDto.fromTime = moment.utc(fromTime).format('YYYY-MM');
    }

    if (toTime) {
      updateFromTimeToTime.toTimeUtc = +moment.utc(toTime).format('x');
      updateFutureCareerDto.toTime = moment.utc(toTime).format('YYYY-MM');
    }

    const updateCareerPromise = db
      .collection('careers')
      .doc(careerId)
      .set(
        {
          type: CareerTypes.Future,
          ...updateFutureCareerDto,
          updatedAt: +moment.utc().format('x'),
          ...updateFromTimeToTime,
        },
        {
          merge: true,
        },
      );

    updatePromises.push(updateCareerPromise);

    if (league) {
      const updateLeaguePromise = db.collection('leagues').add({
        ...league,
        updatedAt: +moment.utc().format('x'),
      });
      updatePromises.push(updateLeaguePromise);
    }

    await Promise.all(updatePromises);

    return ResponseMessage.Career.UPDATED_SUCCESS;
  }

  async remove(userId: string, careerId: string) {
    const [userRef, careerRef] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('careers').doc(careerId).get(),
    ]);

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!careerRef.exists) {
      throw new HttpException(
        ResponseMessage.Career.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    await db.collection('careers').doc(careerId).delete();

    return ResponseMessage.Career.DELETED_SUCCESS;
  }

  findAll() {
    return `This action returns all careers`;
  }

  async findOneHistoric(id: string) {
    const careerDoc = await db.collection('careers').doc(id).get();

    if (!careerDoc.data()) {
      throw new HttpException('Not Found Career', HttpStatus.NOT_FOUND);
    }

    if (careerDoc.data().type === CareerTypes.Future) {
      throw new HttpException('Not a Historic Career', HttpStatus.BAD_REQUEST);
    }

    return {
      careerId: careerDoc.id,
      ...careerDoc.data(),
    };
  }

  async findOneFuture(id: string) {
    const careerDoc = await db.collection('careers').doc(`${id}`).get();

    if (!careerDoc.data()) {
      throw new HttpException('Not Found Career', HttpStatus.NOT_FOUND);
    }

    if (careerDoc.data().type === CareerTypes.Historic) {
      throw new HttpException('Not a Future Career', HttpStatus.BAD_REQUEST);
    }

    return {
      careerId: careerDoc.id,
      ...careerDoc.data(),
    };
  }

  async getClubCareers(userId: string, getCareersDto: GetCareersDto) {
    const { type, startAfter, limit = 20, season } = getCareersDto;

    if (!type) {
      throw new HttpException(
        'Please enter type value',
        HttpStatus.BAD_REQUEST,
      );
    }

    let careerRef = db
      .collection('careers')
      .orderBy('fromTimeUtc', 'asc')
      .where('userId', '==', userId)
      .where('type', '==', type);

    if (season) {
      careerRef = careerRef.where('season', '==', season);
    }

    if (startAfter) {
      careerRef = careerRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      careerRef = careerRef.limit(+limit);
    }

    const careerSnapshots = await careerRef.get();

    const careersData = [];

    // const startDateUtc = startDate ? +moment.utc(startDate).format('x') : 0;
    // const endDateUtc = endDate
    //   ? +moment.utc(endDate).format('x')
    //   : 99999999999999;

    careerSnapshots.forEach((doc) => {
      careersData.push({
        careerId: doc.id,
        ...doc.data(),
      });

      // const fromTimeUtc = doc?.data()?.fromTimeUtc as number;
      // const toTimeUtc = doc?.data()?.toTimeUtc as number;

      // if (fromTimeUtc >= startDateUtc && toTimeUtc <= endDateUtc) {
      //   careersData.push({
      //     careerId: doc.id,
      //     ...doc.data(),
      //   });
      // }
    });

    return careersData;
  }

  async getHistoricClubCareersForBio(historicCareers: IHistoricCareerPlan[]) {
    const historicClubDataPromises = historicCareers.map(async (e) => {
      let clubInfo;

      if (e.clubId) {
        const clubDoc = await db.collection('clubs').doc(e.clubId).get();
        clubInfo = {
          club: {
            clubId: clubDoc.id,
            ...clubDoc.data(),
          },
          team: e.team,
          fromTime: e.fromTime,
          toTime: e.toTime,
          league: e.league,
          role: e.role,
        };
      }

      const careerId = e.careerId;
      const summary = e.summary;
      const totalMatches = e.wonMatches + e.drawMatches + e.lostMatches;
      const totalPoints =
        e.wonMatches * 3 + e.drawMatches * 1 + e.lostMatches * 0;
      const totalCards = e.yourRedCards + e.yourYellowCards;
      const averagePoints = totalPoints / totalMatches || 0;
      const averageGoals = e.yourGoals / totalMatches || 0;
      const averageAssists = e.yourAssists / totalMatches || 0;
      const averageCards = totalCards / totalMatches || 0;
      // 90 mins for a standard match and est player time is in percent
      const totalPlayedMinutes = totalMatches * 90 * (e.yourEstPlayTime / 100);
      const totalPlayedHours = Math.floor(totalPlayedMinutes / 60) || 0;

      const netScore =
        e.madeTeamGoals - e.yourGoals > 0 ? e.madeTeamGoals - e.yourGoals : 0;

      const statsItems = [
        {
          title: 'Ser/Cup/Fri',
          value: `${e.serieMatches}/${e.cupMatches}/${e.friendlyMatches}`,
        },
        {
          title: 'Avg. Points',
          value: `${Math.round((averagePoints + Number.EPSILON) * 100) / 100}`,
        },
        {
          title: 'Net Score',
          value: `${netScore}`,
        },
        {
          title: 'Role',
          value: `${e.role}`,
        },
        {
          title: 'Play Time',
          value: `${e.yourEstPlayTime}`,
        },
        {
          title: 'Avg. Goals',
          value: `${Math.round((averageGoals + Number.EPSILON) * 100) / 100}`,
        },
        {
          title: 'Avg. Assists',
          value: `${Math.round((averageAssists + Number.EPSILON) * 100) / 100}`,
        },
        {
          title: 'Avg. Cards',
          value: `${Math.round((averageCards + Number.EPSILON) * 100) / 100}`,
        },
      ];

      // TODO
      const trophies =
        await this.achievementService.countTrophyListForHistoricClub(careerId);

      const matchInTotalStatistic = {
        matches: totalMatches,
        hours: totalPlayedHours,
        points: totalPoints,
        goals: e.yourGoals,
        assists: e.yourAssists,
        yel: e.yourYellowCards,
        red: e.yourRedCards,
      };

      const mediaLinks = e.mediaLinks;

      return {
        careerId,
        clubInfo,
        statsItems,
        matchInTotalStatistic,
        trophies,
        summary,
        mediaLinks,
        season: e.season || '?',
      };
    });

    return Promise.all(historicClubDataPromises);
  }

  async getFutureClubCareersForBio(futureCareers: IFutureCareerPlan[]) {
    const futureClubDataPromises = futureCareers.map(async (e) => {
      const careerId = e.careerId;
      const summary = e.motivation;
      let clubInfo;

      if (e.clubId) {
        const clubDoc = await db.collection('clubs').doc(e.clubId).get();
        clubInfo = {
          club: {
            clubId: clubDoc.id,
            ...clubDoc.data(),
          },
          team: e.team,
          fromTime: e.fromTime,
          toTime: e.toTime,
          league: e.league,
          role: e.role,
        };
      }
      return { careerId, clubInfo, summary };
    });

    return Promise.all(futureClubDataPromises);
  }
}
