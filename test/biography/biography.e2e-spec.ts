import { PlayerBioStatsTab } from './../../src/modules/biography/enum/bio-player-stats.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { BiographyModule } from '../../src/modules/biography/biography.module';
import { LocalAuthGuard } from '../../src/auth/guards/local-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import * as moment from 'moment';

jest.setTimeout(30000);

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let httpServer;
  const req = {
    userId: 'Kt9b9VXRrjNqJBzO22xeq6KUJ0f2',
    email: 'testing@gmail.com',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BiographyModule],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = req;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.enableCors();
    await app.init();
  });

  it('getPlayerBio -> getPlayerStats - Success', async () => {
    httpServer = app.getHttpServer();

    const getPlayerBio = request(httpServer)
      .get('/biographies/player')
      .expect(HttpStatus.OK);

    const query = {
      statsTab: PlayerBioStatsTab.Current,
      startDate: moment()
        .startOf('day')
        .subtract(30, 'days')
        .format('YYYY-MM-DDTHH:mm:ssZ'),
      endDate: moment().startOf('day').format('YYYY-MM-DDTHH:mm:ssZ'),
    };
    const getPlayerStats = request(httpServer)
      .get('/biographies/player/stats')
      .query(query)
      .expect(HttpStatus.OK);

    const getPlayerAvgRadarSkill =
      request(httpServer).get('/players/avg-radar');

    const result = await Promise.all([
      getPlayerBio,
      getPlayerStats,
      getPlayerAvgRadarSkill,
    ]);

    return { result };
  });

  it('getPlayerBio -> getPlayerStats - Failed', async () => {
    // passing wrong startDate and endDate format
    httpServer = app.getHttpServer();

    const getPlayerBio = request(httpServer)
      .get('/biographies/player')
      .expect(HttpStatus.OK);

    const query = {
      statsTab: PlayerBioStatsTab.Current,
      startDate: null,
      endDate: null,
    };
    const getPlayerStats = request(httpServer)
      .get('/biographies/player/stats')
      .query(query)
      .expect(HttpStatus.BAD_REQUEST);

    const getPlayerAvgRadarSkill =
      request(httpServer).get('/players/avg-radar');

    const result = await Promise.all([
      getPlayerBio,
      getPlayerStats,
      getPlayerAvgRadarSkill,
    ]);

    return { result };
  });
});
