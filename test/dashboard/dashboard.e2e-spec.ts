import { Test, TestingModule } from '@nestjs/testing';
import { HttpServer, HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DiaryRoutine } from '../../src/modules/dashboard/enum/dashboard-enum';
import { userLoginCredentials } from '../user-login-e2e-test';

jest.setTimeout(30000);

describe('Dashboard Controller (e2e)', () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  let token: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    httpServer = app.getHttpServer();

    const loginResponse = await request(httpServer)
      .post('/log-in')
      .send(userLoginCredentials);

    token = loginResponse.body.idToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TOTAL tab', () => {
    it('should return expected data', async () => {
      const totalDashboardProperites = [
        'personalTrainingHours',
        'averageTrainingHours',
        'personalMatchHours',
        'averageMatchHours',
        'personalTotalHours',
        'averageTotalHours',
        'personalTrainingCategory',
        'matchResult',
        'dayUsage',
      ];
      const response = await request(httpServer)
        .get('/dashboard/get-list-diary-statistic')
        .query({
          lastDateRange: '7',
        })
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);
      expect(Object.keys(response.body).sort()).toEqual(
        totalDashboardProperites.sort(),
      );
    });
  });
  describe('TRAINING tab', () => {
    it('should return expected data and training list', async () => {
      const trainingProperites = [
        'personalSessions',
        'averageSessions',
        'personalTrainingHours',
        'averageTrainingHours',
        'personalTrainingCategory',
        'averageTrainingCategory',
        'personalTrainingType',
        'personalTrainingCategoryOfTotalHours',
        'averageTrainingCategoryOfTotalHours',
        'personalTrainingTypeOfTotalHours',
        'averageTrainingTypeOfTotalHours',
        'data',
      ];
      const response = await request(httpServer)
        .get('/dashboard/get-list-diary-statistic')
        .query({
          lastDateRange: '7',
          dashboardTab: 'TRAINING',
        })
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);
      const trainingList = response.body.data;
      expect(Object.keys(response.body).sort()).toEqual(
        trainingProperites.sort(),
      );
      expect(trainingList).toHaveLength;
    });
  });
  describe('MATCHES tab', () => {
    it('should return expected data for match chart', async () => {
      const response = await request(httpServer)
        .get('/dashboard/get-statistic-match-chart')
        .query({
          lastDateRange: '7',
          type: 'netScore',
        })
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);
      const { personalMatchChart, averageMatchChart } = response.body;
      expect(personalMatchChart).toHaveLength;
      expect(averageMatchChart).toHaveLength;
    });
    it('should return expected data for match stats and match list', async () => {
      const matchProperites = [
        'personalMatchHours',
        'matchStatisticAverage',
        'matchInTotalStatistic',
        'data',
      ];
      const response = await request(httpServer)
        .get('/dashboard/get-list-diary-statistic')
        .query({
          lastDateRange: '7',
          dashboardTab: 'MATCH',
        })
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const matchList = response.body.data;
      expect(Object.keys(response.body).sort()).toEqual(matchProperites.sort());
      expect(matchList).toHaveLength;
    });
  });
  describe('DAILY ROUTINE dashboard', () => {
    const routineProperites = ['veryBad', 'bad', 'normal', 'good', 'veryGood'];
    describe('ENERGY tab', () => {
      it('should return Diary List', async () => {
        const response = await request(httpServer)
          .get('/dashboard/get-diary-routine-statistic')
          .query({
            lastDateRange: '7',
            diaryRoutine: DiaryRoutine.ENERGY,
          })
          .auth(token, { type: 'bearer' })
          .expect(HttpStatus.OK);

        expect(response.body).toHaveLength;
      });
      it('should return expected Energy data for filter 7 days', async () => {
        const response = await request(httpServer)
          .get('/dashboard/get-diary-routine-statistic')
          .query({
            lastDateRange: '7',
            diaryRoutine: DiaryRoutine.ENERGY,
          })
          .auth(token, { type: 'bearer' })
          .expect(HttpStatus.OK);

        const {
          personalDiaryRoutineChart,
          averageDiaryRoutineChart,
          diaryRoutineResult,
          averageDiaryRoutine,
        } = response.body;

        expect(personalDiaryRoutineChart).toHaveLength(7);
        expect(averageDiaryRoutineChart).toHaveLength(7);
        expect(Object.keys(diaryRoutineResult).sort()).toEqual(
          routineProperites.sort(),
        );
        expect(Object.keys(averageDiaryRoutine).sort()).toEqual(
          routineProperites.sort(),
        );
      });
    });
    describe('EAT tab', () => {
      it('should return expected Sleep data for filter 30 days', async () => {
        const response = await request(httpServer)
          .get('/dashboard/get-diary-routine-statistic')
          .query({
            lastDateRange: '30',
            diaryRoutine: DiaryRoutine.EAT,
          })
          .auth(token, { type: 'bearer' })
          .expect(HttpStatus.OK);

        const {
          personalDiaryRoutineChart,
          averageDiaryRoutineChart,
          diaryRoutineResult,
          averageDiaryRoutine,
        } = response.body;

        expect(personalDiaryRoutineChart).toHaveLength(30);
        expect(averageDiaryRoutineChart).toHaveLength(30);
        expect(Object.keys(diaryRoutineResult).sort()).toEqual(
          routineProperites.sort(),
        );
        expect(Object.keys(averageDiaryRoutine).sort()).toEqual(
          routineProperites.sort(),
        );
      });
    });
    describe('SLEEP tab', () => {
      it('should return expected EatAndDrink data for filter 365 days', async () => {
        const response = await request(httpServer)
          .get('/dashboard/get-diary-routine-statistic')
          .query({
            lastDateRange: '365',
            diaryRoutine: DiaryRoutine.SLEEP,
          })
          .auth(token, { type: 'bearer' })
          .expect(HttpStatus.OK);

        const {
          personalDiaryRoutineChart,
          averageDiaryRoutineChart,
          diaryRoutineResult,
          averageDiaryRoutine,
        } = response.body;

        expect(personalDiaryRoutineChart).toHaveLength(13);
        expect(averageDiaryRoutineChart).toHaveLength(13);
        expect(Object.keys(diaryRoutineResult).sort()).toEqual(
          routineProperites.sort(),
        );
        expect(Object.keys(averageDiaryRoutine).sort()).toEqual(
          routineProperites.sort(),
        );
      });
    });
  });

  describe('INJURY tab', () => {
    it('should return expected stats for injuries', async () => {
      const response = await request(httpServer)
        .get('/dashboard/get-statistic-injuries-chart')
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const { bodyChart, columnChart } = response.body;
      expect(bodyChart).toHaveLength;
      expect(Object.keys(columnChart).sort()).toEqual(
        ['injuryAreaF', 'injuryAreaB'].sort(),
      );
    });
    it('should return injury list', async () => {
      const response = await request(httpServer)
        .get('/dashboard/get-list-injuries-report')
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength;
    });
  });
});
