import { HttpServer, HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { db } from '../../src/config/firebase.config';
import { userLoginCredentials } from '../user-login-e2e-test';
import { createInjuryBody } from './mock-injury-data';

jest.setTimeout(30000);

describe('Diary Controller (e2e)', () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  let token: string;
  let diaryId: string;

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

  describe('DELETE injuries', () => {
    it('should return 404 NOT FOUND if not ids are invalid', async () => {
      const response = await request(httpServer)
        .del('/diaries/player/delete-injury')
        .auth(token, { type: 'bearer' })
        .query({
          diaryId: 'aaa',
          injuryId: 'aaa',
        });
      expect(response.body.statusCode).toEqual(HttpStatus.NOT_FOUND);
    });
    it('should CREATE and then DELETE injuries successfully', async () => {
      const response = await request(httpServer)
        .del('/diaries/player/delete-injury')
        .auth(token, { type: 'bearer' })
        .query({
          diaryId: 'aaa',
          injuryId: 'aaa',
        });
      expect(response.body.statusCode).toEqual(HttpStatus.NOT_FOUND);
    });
  });

  describe('CREATE a new injury', () => {
    it('should return injury data with the exact matched body', async () => {
      const diaryId = 'cJBqSfRxHLiiTnSnPeCg';
      const response = await request(httpServer)
        .post(`/diaries/player/${diaryId}/create-injury`)
        .auth(token, { type: 'bearer' })
        .send(createInjuryBody)
        .expect(HttpStatus.CREATED);

      const responseBody = response.body;

      expect(responseBody).toEqual(createInjuryBody);
    });
  });

  describe('UPDATE injury', () => {
    it('should throw error if diary or injury ID not found', async () => {
      const diaryId = 'aaaaaaaa';
      const injuryId = 'aaaa';
      const response = await request(httpServer)
        .put(
          `/diaries/player/update-injury?diaryId=${diaryId}&injuryId=${injuryId}`,
        )
        .auth(token, { type: 'bearer' })
        .send(createInjuryBody)
        .expect(HttpStatus.EXPECTATION_FAILED);
    });

    it(`expect statusCode ${HttpStatus.OK} if updated injury description successfully `, async () => {
      const diaryId = 'cJBqSfRxHLiiTnSnPeCg';
      const injuryId = '3OMO3BE1JWbJkEe6jPoR';
      await request(httpServer)
        .put(
          `/diaries/player/update-injury?diaryId=${diaryId}&injuryId=${injuryId}`,
        )
        .auth(token, { type: 'bearer' })
        .send({ description: 'update injury description' })
        .expect(HttpStatus.OK);

      const injuryDoc = await db
        .collection('diaries')
        .doc(diaryId)
        .collection('injuries')
        .doc(injuryId)
        .get();

      const injuryData = injuryDoc.data();

      expect(injuryData.description).toEqual('update injury description');
    });
  });
});
