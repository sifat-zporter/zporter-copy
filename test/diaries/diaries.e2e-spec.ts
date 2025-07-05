import { HttpServer, HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as moment from 'moment';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ResponseMessage } from '../../src/common/constants/common.constant';
import { db } from '../../src/config/firebase.config';
import { Diary } from '../../src/modules/diaries/interfaces/diaries.interface';
import { userLoginCredentials } from '../user-login-e2e-test';
import {
  createDiaryMatchBody,
  createDiaryTrainingBody,
  updateDiaryMatchBody,
  updateDiaryTrainingBody,
} from './mock-diary-data';

jest.setTimeout(30000);

describe('Diary Controller (e2e)', () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  let token: string;
  let diaryId: string;
  let injuryId: string;

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

  describe('AUTH diaries route', () => {
    it('should return 403 if not authenticated', async () => {
      const response = request(httpServer).get(
        '/diaries/player/get-diary-by-query',
      );
      return response.expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET diaries', () => {
    it('should return all diaries as an array if passing no date query', async () => {
      const response = await request(httpServer)
        .get('/diaries/player/get-diary-by-query')
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const diaries: Diary[] = response.body.data;

      expect(diaries.length).toBeGreaterThanOrEqual(0);
    });

    it('should return list of diaries in a day', async () => {
      const createdAt = moment('2021-08-10T03:10:54+00:00')
        .startOf('day')
        .format('YYYY-MM-DDTHH:mm:ssZ');
      const response = await request(httpServer)
        .get('/diaries/player/get-diary-by-query')
        .auth(token, { type: 'bearer' })
        .query({
          createdAt,
        })
        .expect(HttpStatus.OK);
      const diaries: Diary[] = response.body.data;
      expect(diaries.length).toBeGreaterThanOrEqual(0);
    });

    it(`should return empty array and motivationQuote if today I havenot created any diary`, async () => {
      const today = moment().startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
      const response = await request(httpServer)
        .get('/diaries/player/get-diary-by-query')
        .auth(token, { type: 'bearer' })
        .query({
          createdAt: today,
        })
        .expect(HttpStatus.OK);

      expect(response.body.data.length).toEqual(0);
      expect(response.body).toHaveProperty('motivationQuote');
    });
  });

  describe('CREATE then UPDATE diaries', () => {
    it('should create new diary as TRAINING type and then UPDATE it successfully', async () => {
      const createResponse = await request(httpServer)
        .post(`/diaries/player/create-diary-training`)
        .auth(token, { type: 'bearer' })
        .send(createDiaryTrainingBody)
        .expect(HttpStatus.CREATED);

      diaryId = createResponse.body.diaryId;

      await request(httpServer)
        .put(`/diaries/player/update-diary-training`)
        .query({
          diaryId: createResponse.body.diaryId,
        })
        .send(updateDiaryTrainingBody)
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const diaryTrainingDoc = await db
        .collection('diaries')
        .doc(createResponse.body.diaryId)
        .get();

      expect(diaryTrainingDoc.data().eatAndDrink).toEqual(
        updateDiaryTrainingBody.eatAndDrink,
      );

      expect(diaryTrainingDoc.data().training).toEqual(
        updateDiaryTrainingBody.training,
      );
    });
    it('should create new diary as MATCH type and then UPDATE it successfully', async () => {
      const createResponse = await request(httpServer)
        .post(`/diaries/player/create-diary-match`)
        .auth(token, { type: 'bearer' })
        .send(createDiaryMatchBody)
        .expect(HttpStatus.CREATED);

      diaryId = createResponse.body.diaryId;

      await request(httpServer)
        .put(`/diaries/player/update-diary-match`)
        .query({
          diaryId: createResponse.body.diaryId,
        })
        .send(updateDiaryMatchBody)
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const diaryMatchDoc = await db
        .collection('diaries')
        .doc(createResponse.body.diaryId)
        .get();

      expect(diaryMatchDoc.data().energyLevel).toEqual(
        updateDiaryMatchBody.energyLevel,
      );

      expect(diaryMatchDoc.data().match).toEqual(updateDiaryMatchBody.match);
    });

    afterEach(async () => {
      if (diaryId) {
        await db.collection('diaries').doc(diaryId).delete();
      }
    });
  });

  describe('UPDATE diaries', () => {
    it('should throw error if diary not found', async () => {
      const updateResponse = await request(httpServer)
        .put(`/diaries/player/update-diary-training/`)
        .query({
          diaryId,
        })
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.EXPECTATION_FAILED);
      expect(updateResponse.body.statusCode).toEqual(HttpStatus.NOT_FOUND);
    });
    it(`expect statusCode ${HttpStatus.OK} if updateđ successfully diary TRAINING`, async () => {
      diaryId = 'ypmWEimvijhdKvEiuRAn';
      await request(httpServer)
        .put(`/diaries/player/update-diary-training`)
        .query({
          diaryId,
        })
        .send(updateDiaryTrainingBody)
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);
    });

    it(`expect statusCode ${HttpStatus.OK} if update successfully diary MATCH`, async () => {
      await request(httpServer)
        .put(`/diaries/player/update-diary-match`)
        .query({
          diaryId: 'ypmWEimvijhdKvEiuRAn',
        })
        .send(updateDiaryMatchBody)
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const diaryTrainingDoc = await db
        .collection('diaries')
        .doc('ypmWEimvijhdKvEiuRAn')
        .get();

      expect(diaryTrainingDoc.data().energyLevel).toEqual(
        updateDiaryMatchBody.energyLevel,
      );

      expect(diaryTrainingDoc.data().eatAndDrink).toEqual(
        updateDiaryMatchBody.eatAndDrink,
      );
      expect(diaryTrainingDoc.data().match).toEqual(updateDiaryMatchBody.match);
    });
  });

  describe('DELETE diaries', () => {
    it('should CREATE a new diary successfully and then expect status OK-200 if DELETED successfully ', async () => {
      const createResponse = await request(httpServer)
        .post(`/diaries/player/create-diary-match`)
        .auth(token, { type: 'bearer' })
        .send(createDiaryMatchBody)
        .expect(HttpStatus.CREATED);

      await request(httpServer)
        .delete(`/diaries/player/delete-diary/${createResponse.body.diaryId}`)
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.OK)
        .expect(ResponseMessage.Diary.DELETE_DIARY);
    });
    it('should throw error Failed if diary id is not provided or invalid ', async () => {
      const deleteResponse = await request(httpServer)
        .delete(`/diaries/player/delete-diary/1234`)
        .auth(token, { type: 'bearer' })
        .expect(HttpStatus.EXPECTATION_FAILED);

      expect(deleteResponse.body.statusCode).toEqual(HttpStatus.NOT_FOUND);
    });
  });
});
