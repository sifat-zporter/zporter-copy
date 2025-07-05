import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';
import { ResponseMessage } from '../../common/constants/common.constant';
import { countries } from '../../common/constants/countries-flag-firebase-url-backup';
import { db } from '../../config/firebase.config';
import { CareerTypes } from '../careers/dto/career.dto';
import { ClubService } from '../clubs/v1/clubs.service';
import { TypeOfDiary } from '../diaries/enum/diaries.enum';
import { TypeOfPost } from '../feed/dto/feed.req.dto';
import { OutputClubTransferHistoriesFeed } from '../feed/dto/feed.res.dto';
import { FeedService } from '../feed/feed.service';
import { UserTypes } from '../users/enum/user-types.enum';
import {
  CoachCreateAwardDto,
  ConnectedClubDto,
  CreateTrophyDto,
  PlayerCreateAwardDto,
} from './dto/create-achievement.dto';
import { GetAchievementDto } from './dto/get-achievement.dto';
import { GetCapsDto } from './dto/get-caps.dto';
import { GetConnectedHistoricClubsDto } from './dto/get-connected-historic-clubs.dto';
import { CountUserAchievementsDto } from './dto/get-player-stats-trophies.dto';
import {
  CreatePlayerPersonalGoalDto,
  UpdatePlayerPersonalGoalDto,
} from './dto/player-personal-goal.dto';
import {
  CoachUpdateAwardDto,
  PlayerUpdateAwardDto,
  UpdateTrophyDto,
} from './dto/update-achievement.dto';
import { AchievementType } from './enum/achievement.enum';
import { CoachAwardType, ZPlayerAwardType } from './enum/award-types.enum';
import { ConnectedClubType } from './enum/connected-club.enum';
import { TrophyType } from './enum/trophy-types.enum';
import {
  CapResult,
  TotalCoachAwardsResult,
  TotalPlayerAwardsResult,
  TotalPlayerTrophiesResult,
} from './interface/achievement.interface';
import { SortBy } from '../../common/pagination/pagination.dto';

@Injectable()
export class AchievementsService {
  constructor(
    private clubService: ClubService,
    private feedService: FeedService,
  ) {}

  async findAll(userId: string, getAchievementDto: GetAchievementDto) {
    const {
      userIdQuery,
      type,
      startAfter,
      limit = 10,
      sorted = SortBy.DESC,
    } = getAchievementDto;

    const userIdForQuery = userIdQuery ? userIdQuery : userId;

    let achievementRef = db
      .collection('achievements')
      .orderBy('dateUtc', sorted)
      .where('userId', '==', userIdForQuery);

    if (type) {
      achievementRef = achievementRef.where('achievementType', '==', type);
    }

    if (startAfter) {
      achievementRef = achievementRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      achievementRef = achievementRef.limit(+limit);
    }
    const querySnapshot = await achievementRef.get();

    // const achievements = [];

    // querySnapshot.forEach((doc) => {
    //   achievements.push({
    //     achievementId: doc.id,
    //     ...doc.data(),
    //   });
    // });

    const result = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const clubId = doc.data().connectedClub?.clubId || null;

        if (clubId) {
          const clubRef = await db.collection('clubs').doc(clubId).get();
          const country = countries.find(
            (e) => e.alpha2Code == doc.data()?.country?.alpha2Code,
          );

          const connectedClub = {
            ...doc.data().connectedClub,
            club: clubRef.data(),
          };

          return {
            achievementId: doc.id,
            ...doc.data(),
            connectedClub,
            country,
          };
        } else {
          const country = countries.find(
            (e) => e.alpha2Code == doc.data()?.country?.alpha2Code,
          );
          return {
            achievementId: doc.id,
            ...doc.data(),
            country,
          };
        }
      }),
    );

    return result;
  }

  async findOne(achievementId: string) {
    const achievementDoc = await db
      .collection('achievements')
      .doc(achievementId)
      .get();

    if (!achievementDoc.exists) {
      throw new HttpException(
        ResponseMessage.Achievement.NOT_FOUND_ACHIEVEMENT,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      achievementId: achievementDoc.id,
      ...achievementDoc.data(),
    };
  }

  async createTrophy(userId: string, createTrophyDto: CreateTrophyDto) {
    const { date, connectedClub } = createTrophyDto;

    const isValidAchievementDate = await this.validateAchievementDateString(
      userId,
      date,
      connectedClub,
    );

    if (!isValidAchievementDate) {
      throw new HttpException(
        `Invalid! Achievement Date has to be between contracted date of your existing or historic club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db.collection('achievements').add({
      userId,
      ...createTrophyDto,
      dateUtc: +moment.utc(date).format('x'), //for sorting
      date: moment.utc(date).format('YYYYMMDD'), //for displaying
      createdAt: +moment.utc().format('x'), // for sorting, filter
      updatedAt: +moment.utc().format('x'),
    });
    return ResponseMessage.Achievement.CREATED_ACHIEVEMENT;
  }

  async playerCreateAward(
    userId: string,
    playerCreateAwardDto: PlayerCreateAwardDto,
  ) {
    const { date, connectedClub } = playerCreateAwardDto;

    // const isValidAchievementDate = await this.validateAchievementDateString(
    //   userId,
    //   date,
    //   connectedClub,
    // );

    // if (!isValidAchievementDate) {
    //   throw new HttpException(
    //     `Invalid! Achievement Date has to be between contracted date of your existing or historic club`,
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    const newAchievement = JSON.parse(
      JSON.stringify({
        userId,
        ...playerCreateAwardDto,
        dateUtc: +moment.utc(date).format('x'), //for sorting
        date: moment.utc(date).format('YYYYMMDD'), //for displaying
        createdAt: +moment.utc().format('x'), // for sorting, filter
        updatedAt: +moment.utc().format('x'),
      }),
    );

    await db.collection('achievements').add(newAchievement);
    return ResponseMessage.Achievement.CREATED_ACHIEVEMENT;
  }

  async coachCreateAward(
    userId: string,
    coachCreateAwardDto: CoachCreateAwardDto,
  ) {
    const { date, connectedClub } = coachCreateAwardDto;

    // const isValidAchievementDate = await this.validateAchievementDateString(
    //   userId,
    //   date,
    //   connectedClub,
    // );

    // if (!isValidAchievementDate) {
    //   throw new HttpException(
    //     `Invalid! Achievement Date has to be between contracted date of your existing or historic club`,
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    const newAchievement = JSON.parse(
      JSON.stringify({
        userId,
        ...coachCreateAwardDto,
        dateUtc: +moment.utc(date).format('x'), //for sorting
        date: moment.utc(date).format('YYYYMMDD'), //for displaying
        createdAt: +moment.utc().format('x'), // for sorting, filter
        updatedAt: +moment.utc().format('x'),
      }),
    );

    await db.collection('achievements').add(newAchievement);

    return ResponseMessage.Achievement.CREATED_ACHIEVEMENT;
  }

  async updateTrophy(
    userId: string,
    achievementId: string,
    updateTrophyDto: UpdateTrophyDto,
  ) {
    const { date, connectedClub } = updateTrophyDto;

    const isValidAchievementDate = await this.validateAchievementDateString(
      userId,
      date,
      connectedClub,
    );

    if (!isValidAchievementDate) {
      throw new HttpException(
        `Invalid! Achievement Date has to be between contracted date of your existing or historic club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db
      .collection('achievements')
      .doc(achievementId)
      .set(
        {
          ...updateTrophyDto,
          dateUtc: +moment.utc(date).format('x'), //for sorting
          date: moment.utc(date).format('YYYYMMDD'), //for displaying
          updatedAt: +moment.utc().format('x'),
        },
        {
          merge: true,
        },
      );
    return ResponseMessage.Achievement.UPDATED_ACHIEVEMENT;
  }

  async playerUpdateAward(
    userId: string,
    achievementId: string,
    playerUpdateAwardDto: PlayerUpdateAwardDto,
  ) {
    const { date, connectedClub } = playerUpdateAwardDto;

    const isValidAchievementDate = await this.validateAchievementDateString(
      userId,
      date,
      connectedClub,
    );

    if (!isValidAchievementDate) {
      throw new HttpException(
        `Invalid! Achievement Date has to be between contracted date of your existing or historic club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db
      .collection('achievements')
      .doc(achievementId)
      .set(
        {
          ...playerUpdateAwardDto,
          dateUtc: +moment.utc(date).format('x'), //for sorting
          date: moment.utc(date).format('YYYYMMDD'), //for displaying
          updatedAt: +moment.utc().format('x'),
        },
        {
          merge: true,
        },
      );
    return ResponseMessage.Achievement.UPDATED_ACHIEVEMENT;
  }

  async coachUpdateAward(
    userId: string,
    achievementId: string,
    coachUpdateAwardDto: CoachUpdateAwardDto,
  ) {
    const { date, connectedClub } = coachUpdateAwardDto;

    const isValidAchievementDate = await this.validateAchievementDateString(
      userId,
      date,
      connectedClub,
    );

    if (!isValidAchievementDate) {
      throw new HttpException(
        `Invalid! Achievement Date has to be between contracted date of your existing or historic club`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await db
      .collection('achievements')
      .doc(achievementId)
      .set(
        {
          ...coachUpdateAwardDto,
          dateUtc: +moment.utc(date).format('x'), //for sorting
          date: moment.utc(date).format('YYYYMMDD'), //for displaying
          updatedAt: +moment.utc().format('x'),
        },
        {
          merge: true,
        },
      );
    return ResponseMessage.Achievement.UPDATED_ACHIEVEMENT;
  }

  async removeAchievement(userId: string, achievementId: string) {
    const [userRef, achievementRef] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('achievements').doc(achievementId).get(),
    ]);

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!achievementRef.exists) {
      throw new HttpException(
        ResponseMessage.Achievement.NOT_FOUND_ACHIEVEMENT,
        HttpStatus.NOT_FOUND,
      );
    }

    await db.collection('achievements').doc(achievementId).delete();

    return ResponseMessage.Achievement.DELETED_ACHIEVEMENT_SUCCESS;
  }

  async getPlayerDiaryCaps(userId: string, getCapsDto: GetCapsDto) {
    const { userIdQuery, startAfter, limit = 10 } = getCapsDto;

    const userIdForQuery = userIdQuery ? userIdQuery : userId;

    // check type user
    const type = userIdQuery
      ? await (await db.collection('users').doc(userIdQuery).get()).data().type
      : UserTypes.PLAYER;

    let capRef = db
      .collection('diaries')
      .orderBy('createdAt', 'asc')
      .where('typeOfDiary', '==', TypeOfDiary.CAP)
      .where('userType', '==', type)
      .where('userId', '==', userIdForQuery);

    if (startAfter) {
      capRef = capRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      capRef = capRef.limit(+limit);
    }
    const querySnapshot = await capRef.get();

    const caps = [];

    querySnapshot.forEach((doc) => {
      caps.push({
        diaryCapId: doc.id,
        ...doc.data(),
      });
    });

    return caps;
  }

  async getCoachDiaryCaps(userId: string, getCapsDto: GetCapsDto) {
    const { userIdQuery, startAfter, limit = 10 } = getCapsDto;

    const userIdForQuery = userIdQuery ? userIdQuery : userId;

    // check type user
    const type = userIdQuery
      ? await (await db.collection('users').doc(userIdQuery).get()).data().type
      : UserTypes.COACH;

    let capRef = db
      .collection('diaries')
      .orderBy('createdAt', 'asc')
      .where('typeOfDiary', '==', TypeOfDiary.CAP)
      .where('userType', '==', type)
      .where('userId', '==', userIdForQuery);

    if (startAfter) {
      capRef = capRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      capRef = capRef.limit(+limit);
    }
    const querySnapshot = await capRef.get();

    const caps = [];

    querySnapshot.forEach((doc) => {
      caps.push({
        diaryCapId: doc.id,
        ...doc.data(),
      });
    });

    return caps;
  }

  async removeCap(userId: string, capId: string) {
    const [userRef, capRef] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('caps').doc(capId).get(),
    ]);

    if (!userRef.exists) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!capRef.exists) {
      throw new HttpException(
        ResponseMessage.Achievement.NOT_FOUND_ACHIEVEMENT,
        HttpStatus.NOT_FOUND,
      );
    }

    await db.collection('caps').doc(capId).delete();

    return ResponseMessage.Achievement.DELETED_ACHIEVEMENT_SUCCESS;
  }

  async validateAchievementDateString(
    userId: string,
    achievementDateString: string,
    connectedClub: ConnectedClubDto,
  ) {
    const dateUtc = +moment.utc(achievementDateString).format('x');

    if (
      connectedClub?.careerId &&
      connectedClub.connectedClubType === ConnectedClubType.Historic
    ) {
      const historicCareerDoc = await db
        .collection('careers')
        .doc(connectedClub?.careerId)
        .get();

      if (!historicCareerDoc.exists) {
        throw new HttpException(
          'Not found connected club career Id',
          HttpStatus.NOT_FOUND,
        );
      }

      const fromTimeUtc = historicCareerDoc?.data()?.fromTimeUtc;
      const toTimeUtc = historicCareerDoc?.data()?.toTimeUtc;

      if (dateUtc < fromTimeUtc || dateUtc > toTimeUtc) {
        return false;
      }
    }

    if (
      !connectedClub?.careerId &&
      connectedClub.connectedClubType === ConnectedClubType.Existing
    ) {
      const userDoc = await db.collection('users').doc(userId).get();
      const userClubContractedUntilUtc = +moment
        .utc(userDoc.data()?.playerCareer?.contractedUntil)
        .format('x');
      if (dateUtc > userClubContractedUntilUtc) {
        return false;
      }
    }

    return true;
  }

  async countTrophies(achievementSnapshot: FirebaseFirestore.QuerySnapshot) {
    const countTrophies = {
      serieTrophyCount: 0,
      cupTrophyCount: 0,
      otherTrophyCount: 0,
    };

    achievementSnapshot.forEach((e) => {
      if (e.data().trophyType === TrophyType.Serie) {
        countTrophies.serieTrophyCount++;
      }
      if (e.data().trophyType === TrophyType.Cup) {
        countTrophies.cupTrophyCount++;
      }
      if (e.data().trophyType === TrophyType.Other) {
        countTrophies.otherTrophyCount++;
      }
    });

    return countTrophies;
  }

  async countCoachAwards(achievementSnapshot: FirebaseFirestore.QuerySnapshot) {
    const countCoachAwards = {
      COM: 0,
      COY: 0,
    };

    achievementSnapshot.forEach((e) => {
      if (e.data().awardType === CoachAwardType.COM) {
        countCoachAwards.COM++;
      }
      if (e.data().awardType === CoachAwardType.COY) {
        countCoachAwards.COY++;
      }
    });

    return countCoachAwards;
  }

  async countPlayerwards(achievementSnapshot: FirebaseFirestore.QuerySnapshot) {
    const countPlayerAwards = {
      MVP: 0,
      ZOW: 0,
      ZOM: 0,
      ZOY: 0,
      ZM: 0,
      DT: 0,
      GOL: 0,
      GOC: 0,
    };

    achievementSnapshot.forEach((e) => {
      if (e.data().awardType === ZPlayerAwardType.MVP) {
        countPlayerAwards.MVP++;
      }
      if (e.data().awardType === ZPlayerAwardType.ZOW) {
        countPlayerAwards.ZOW++;
      }
      if (e.data().awardType === ZPlayerAwardType.ZOM) {
        countPlayerAwards.ZOM++;
      }
      if (e.data().awardType === ZPlayerAwardType.ZOY) {
        countPlayerAwards.ZOY++;
      }
      if (e.data().awardType === ZPlayerAwardType.ZM) {
        countPlayerAwards.ZM++;
      }
      if (e.data().awardType === ZPlayerAwardType.DT) {
        countPlayerAwards.DT++;
      }
      if (e.data().awardType === ZPlayerAwardType.GOL) {
        countPlayerAwards.GOL++;
      }
      if (e.data().awardType === ZPlayerAwardType.GOC) {
        countPlayerAwards.GOC++;
      }
    });

    return countPlayerAwards;
  }

  async getAllUserCapsForCounting(
    countPlayerAchievementsDto: CountUserAchievementsDto,
  ) {
    const { userId, fromDate, toDate } = countPlayerAchievementsDto;

    const caps = [];

    let capRef = db.collection('caps').where('userId', '==', userId);

    if (fromDate && toDate) {
      const from = +moment.utc(fromDate).format('x');
      const to = +moment
        .utc(toDate)
        .add(23, 'hours')
        .add(59, 'minutes')
        .format('x');

      capRef = capRef.where('dateUtc', '>=', from).where('dateUtc', '<=', to);
    }

    const capSnapshots = await capRef.get();

    capSnapshots.forEach((cap) => {
      caps.push({ type: cap.data().capType, teamName: cap.data().team });
    });

    return caps;
  }

  async getAllPlayerCapsForCounting(
    countPlayerAchievementsDto: CountUserAchievementsDto,
  ) {
    const { userId, fromDate, toDate } = countPlayerAchievementsDto;

    const caps = [];

    let capRef = db
      .collection('diaries')
      .orderBy('createdAt', 'asc')
      .where('typeOfDiary', '==', TypeOfDiary.CAP)
      .where('userId', '==', userId);

    if (fromDate && toDate) {
      const from = +moment.utc(fromDate).format('x');
      const to = +moment
        .utc(toDate)
        .add(23, 'hours')
        .add(59, 'minutes')
        .format('x');

      capRef = capRef
        .where('createdAt', '>=', from)
        .where('createdAt', '<=', to);
    }

    const capSnapshots = await capRef.get();

    capSnapshots.forEach((doc) => {
      const capData = doc.data().cap;
      if (capData) {
        caps.push({
          type: capData.typeOfCap,
          teamName: capData.yourTeam,
        });
      }
    });

    return caps;
  }

  async countTotalCaps(
    countUserAchievementsDto: CountUserAchievementsDto,
  ): Promise<CapResult[]> {
    const allUserCaps = await this.getAllPlayerCapsForCounting(
      countUserAchievementsDto,
    );

    // each cap is an object, cannot compare object => stringify to compare
    const capsValueString = allUserCaps.map((cap) => JSON.stringify(cap));

    // if previous cap === current cap then add 1 unit using reduce => return object of cap string and counting value
    const countCapStrings = capsValueString.reduce((prev, cur) => {
      prev[cur] = (prev[cur] || 0) + 1;

      return prev;
    }, {});

    const final = [];

    // loop through all key and value of that object
    for (const [key, value] of Object.entries(countCapStrings)) {
      const capString2Object = JSON.parse(key);
      capString2Object.count = value;
      final.push(capString2Object);
    }

    return final;
  }

  async countTrophyListForExistingClub(clubId: string, userId: string) {
    const existingClubAchievementSnapshot = await db
      .collection('achievements')
      .where('achievementType', '==', AchievementType.trophy)
      .where(
        'connectedClub.connectedClubType',
        '==',
        ConnectedClubType.Existing,
      )
      .where('connectedClub.club.clubId', '==', clubId)
      .where('userId', '==', userId)
      .get();

    return this.countTrophies(existingClubAchievementSnapshot);
  }

  async countTrophyListForHistoricClub(careerId: string) {
    const historicClubAchievementSnapshot = await db
      .collection('achievements')
      .where('achievementType', '==', AchievementType.trophy)
      .where(
        'connectedClub.connectedClubType',
        '==',
        ConnectedClubType.Historic,
      )
      .where('connectedClub.careerId', '==', careerId)
      .get();

    return this.countTrophies(historicClubAchievementSnapshot);
  }

  async countTotalTrophies(
    countUserAchievementsDto: CountUserAchievementsDto,
  ): Promise<TotalPlayerTrophiesResult> {
    const { userId, fromDate, toDate } = countUserAchievementsDto;

    let trophiesRef = db
      .collection('achievements')
      .where('userId', '==', userId)
      .where('achievementType', '==', AchievementType.trophy);

    if (fromDate && toDate) {
      const from = +moment.utc(fromDate).format('x');
      const to = +moment
        .utc(toDate)
        .add(23, 'hours')
        .add(59, 'minutes')
        .format('x');

      trophiesRef = trophiesRef
        .where('dateUtc', '>=', from)
        .where('dateUtc', '<=', to);
    }

    const playerTotalTrophiesSnapshot = await trophiesRef.get();

    return this.countTrophies(playerTotalTrophiesSnapshot);
  }

  async countCoachTotalAwards(
    countCoachAchievementsDto: CountUserAchievementsDto,
  ): Promise<TotalCoachAwardsResult> {
    const { userId, fromDate, toDate } = countCoachAchievementsDto;

    let awardsRef = db
      .collection('achievements')
      .where('userId', '==', userId)
      .where('achievementType', '==', AchievementType.award);

    if (fromDate && toDate) {
      const from = +moment.utc(fromDate).format('x');
      const to = +moment
        .utc(toDate)
        .add(23, 'hours')
        .add(59, 'minutes')
        .format('x');

      awardsRef = awardsRef
        .where('dateUtc', '>=', from)
        .where('dateUtc', '<=', to);
    }

    const coachTotalAwardsSnapshot = await awardsRef.get();

    return this.countCoachAwards(coachTotalAwardsSnapshot);
  }

  async countPlayerTotalAwards(
    countPlayerAchievementsDto: CountUserAchievementsDto,
  ): Promise<TotalPlayerAwardsResult> {
    const { userId, fromDate, toDate } = countPlayerAchievementsDto;

    let awardsRef = db
      .collection('achievements')
      .where('userId', '==', userId)
      .where('achievementType', '==', AchievementType.award);

    if (fromDate && toDate) {
      const from = +moment.utc(fromDate).format('x');
      const to = +moment
        .utc(toDate)
        .add(23, 'hours')
        .add(59, 'minutes')
        .format('x');

      awardsRef = awardsRef
        .where('dateUtc', '>=', from)
        .where('dateUtc', '<=', to);
    }

    const playerTotalAwardsSnapshot = await awardsRef.get();

    return this.countPlayerwards(playerTotalAwardsSnapshot);
  }

  async connectedClubListForAchievement(
    userId: string,
    getConnectedHistoricClubsDto: GetConnectedHistoricClubsDto,
  ) {
    const {
      userIdQuery,
      startAfter,
      limit = 10,
    } = getConnectedHistoricClubsDto;

    const userIdForQuery = userIdQuery ? userIdQuery : userId;

    let careerRef = db
      .collection('careers')
      .orderBy('fromTimeUtc', 'asc')
      .where('userId', '==', userIdForQuery)
      .where('type', '==', CareerTypes.Historic);

    if (startAfter) {
      careerRef = careerRef.startAfter(+startAfter).limit(+limit);
    }

    if (!startAfter) {
      careerRef = careerRef.limit(+limit);
    }

    const [userSnapshot, careerQuerySnapshot] = await Promise.all([
      db.collection('users').doc(userIdForQuery).get(),
      careerRef.get(),
    ]);

    const career =
      userSnapshot.data().type === UserTypes.PLAYER
        ? userSnapshot.data()?.playerCareer
        : userSnapshot.data()?.coachCareer;

    // const userExistingClubData = await this.clubService.getClubById(
    //   career?.clubId,
    // );

    const connectedClubs = [];
    const historicClubIds = new Map();

    connectedClubs.push({
      connectedClubType: ConnectedClubType.Existing,
      club: {
        ...career?.contractedClub,
        contractedUntil: moment
          .utc(career?.contractedUntil)
          .format('YYYY-MM-DD'),
        teams: undefined,
      },
    });

    career?.clubs
      ?.filter((club) => club.clubId !== career?.contractedClub?.clubId)
      .forEach((club) => {
        connectedClubs.push({
          connectedClubType: ConnectedClubType.Existing,
          club: {
            ...club,
            teams: undefined,
          },
        });
      });

    careerQuerySnapshot.forEach((careerDoc) => {
      // const clubId = careerDoc.data().clubId;
      // const clubDoc = await db.collection('clubs').doc(clubId).get();
      const clubId = careerDoc.data().clubId;
      if (!historicClubIds.has(clubId)) {
        historicClubIds.set(clubId, 1);

        connectedClubs.push({
          connectedClubType: careerDoc.data().type,
          careerId: careerDoc.id,
          clubId,
          fromTime: moment.utc(careerDoc.data().fromTimeUtc).format('YYYY-MM-DD'),
          toTime: moment.utc(careerDoc.data().toTimeUtc).format('YYYY-MM-DD'),
        });
      }
    });

    const mappingAndGettingClubData = connectedClubs.map(
      async (connectedClub) => {
        if (connectedClub.clubId) {
          const clubDoc = await db
            .collection('clubs')
            .doc(connectedClub.clubId)
            .get();
          connectedClub.club = {
            clubId: clubDoc.id,
            ...clubDoc.data(),
          };
          delete connectedClub.clubId;
        }
        return connectedClub;
      },
    );

    return Promise.all(mappingAndGettingClubData);
  }

  async createPersonalGoalForPlayer(
    userId: string,
    createPlayerPersonalGoalDto: CreatePlayerPersonalGoalDto,
  ) {
    const newPersonalGoal = await db.collection('personal_goals').add({
      ...createPlayerPersonalGoalDto,
      userId: userId,
      userType: UserTypes.PLAYER,
      createdAt: +moment.utc().format('x'),
      updatedAt: +moment.utc().format('x'),
      typeOfPost: TypeOfPost.PERSONAL_GOALS,
    });

    this.feedService.synchronizePostsToMongoose({
      postId: newPersonalGoal.id,
      typeOfPost: TypeOfPost.PERSONAL_GOALS,
    });

    return {
      message: 'Created personal goal',
      personalGoalId: newPersonalGoal.id,
    };
  }

  async updatePersonalGoalForPlayer(
    userId: string,
    updatePlayerPersonalGoalDto: UpdatePlayerPersonalGoalDto,
  ) {
    const checkOwner = await db
      .collection('personal_goals')
      .where(
        firebase.firestore.FieldPath.documentId(),
        '==',
        updatePlayerPersonalGoalDto.docId,
      )
      .where('userId', '==', userId)
      .get();

    if (checkOwner.empty) {
      throw new HttpException(`Resource not found`, HttpStatus.NOT_FOUND);
    }

    await db
      .collection('personal_goals')
      .doc(updatePlayerPersonalGoalDto.docId)
      .update({
        ...updatePlayerPersonalGoalDto,
        updatedAt: +moment.utc().format('x'),
      });
    return {
      message: 'Updated personal goal',
      personalGoalId: updatePlayerPersonalGoalDto.docId,
    };
  }

  async deletePersonalGoalForPlayer(userId: string, docId: string) {
    const checkOwner = await db
      .collection('personal_goals')
      .where(firebase.firestore.FieldPath.documentId(), '==', docId)
      .where('userId', '==', userId)
      .get();

    if (checkOwner.empty) {
      throw new HttpException(`Resource not found`, HttpStatus.NOT_FOUND);
    }

    await db.collection('personal_goals').doc(docId).delete();

    return {
      message: 'Deleted personal goal',
      personalGoalId: docId,
    };
  }
}
