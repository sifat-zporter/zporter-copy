import {
  ExecutionContext,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { LocalAuthGuard } from '../../src/auth/guards/local-auth.guard';
import {
  GenderTypes,
  ResponseMessage,
} from '../../src/common/constants/common.constant';
import { ClubUserDto } from '../../src/modules/clubs/dto/club-player.dto';
import { UpdatePlayerSettingsDto } from '../../src/modules/users/settings-update-dto/update-player-settings.dto';
import { HeightDto } from '../../src/modules/users/settings-update-dto/update-user-health.dto';
import { NotificationOptionsDto } from '../../src/modules/users/settings-update-dto/update-user-settings.dto';
import { CreateCoachDto } from '../../src/modules/users/user-create-dto/create-coach.dto';
import { CreatePlayerCareerDto } from '../../src/modules/users/user-create-dto/create-player-career.dto';
import {
  PlayerOverallSkillsDto,
  PlayerRadarSkillsDto,
} from '../../src/modules/users/user-create-dto/create-player-skills.dto';
import { CreatePlayerDto } from '../../src/modules/users/user-create-dto/create-player.dto';
import { CreateUserHealthDto } from '../../src/modules/users/user-create-dto/create-user-health.dto';
import { CreateUserMediaDto } from '../../src/modules/users/user-create-dto/create-user-media.dto';
import { CreateUserProfileDto } from '../../src/modules/users/user-create-dto/create-user-profile.dto';
import {
  CountryDto,
  CreateUserSettingsDto,
} from '../../src/modules/users/user-create-dto/create-user-settings.dto';
import { UserSocialLinksDto } from '../../src/modules/users/user-create-dto/user-social-links.dto';
import { UsersModule } from '../../src/modules/users/users.module';
import * as firebase from 'firebase-admin';
import { db } from '../../src/config/firebase.config';

jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

jest.setTimeout(30000);

describe('UsersController (e2e)', () => {
  const user: CreatePlayerDto | CreateCoachDto = {
    health: <CreateUserHealthDto>{
      height: <HeightDto>{
        value: 165,
        updatedAt: new Date().toISOString(),
      },
      weight: {
        value: 165,
        updatedAt: new Date().toISOString(),
      },
      leftFootLength: 100,
      rightFootLength: 100,
    },
    media: <CreateUserMediaDto>{
      faceImage: '',
      bodyImage: '',
      teamImage: '',
      videoLinks: [],
    },
    profile: <CreateUserProfileDto>{
      phone: '',
      firstName: 'Nguyen',
      lastName: 'Viet Anh',
      gender: GenderTypes.Male,
      birthCountry: <CountryDto>{
        alpha2Code: '',
        alpha3Code: '',
        name: '',
        flag: '',
        region: '',
      },
      birthDay: '2019-09-26T07:58:30.996+0700',
      homeAddress: '',
      postNumber: '',
      region: '',
      city: '',
    },
    settings: <CreateUserSettingsDto>{
      country: <CountryDto>{
        alpha2Code: '',
        alpha3Code: '',
        name: '',
        flag: '',
        region: '',
      },
      language: '',
      public: true,
      notificationOn: false,
      notificationOptions: <NotificationOptionsDto>{
        profileAndDiaryUpdates: true,
        feedUpdates: true,
        messageUpdates: true,
        inviteUpdates: true,
      },
    },
    socialLinks: <UserSocialLinksDto>{
      instagram: '',
      facebook: '',
      twitter: '',
      youtube: '',
      veoHighlites: '',
      tiktok: '',
    },
    playerCareer: <CreatePlayerCareerDto>{
      contractedClub: <ClubUserDto>{
        clubId: '',
        clubName: '',
        logoUrl: '',
      },
      currentTeams: [],
      favoriteRoles: [],
      shirtNumber: 99,
      summary: '',
      teamCalendarLinks: [],
      contractedUntil: new Date(),
      seasonStartDate: new Date(),
      seasonEndDate: new Date(),
    },
    playerSkills: {
      specialityTags: [''],
      overall: <PlayerOverallSkillsDto>{
        mental: 5,
        physics: 5,
        tactics: 5,
        technics: 5,
        leftFoot: 5,
        rightFoot: 5,
      },
      radar: <PlayerRadarSkillsDto>{
        attacking: 100,
        defending: 100,
        dribbling: 100,
        passing: 100,
        shooting: 100,
        pace: 100,
        tackling: 100,
        heading: 100,
      },
    },
    inviterId: 'J7G80xuMtXVDaP9EcEX0Q4CHiD83',
  };
  let app: INestApplication;
  let httpServer;

  const req = {
    userId: 'mockUserId',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
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

  afterEach(async () => {
    if (req.userId) {
      const deleteUser = db.collection('users').doc(req?.userId).delete();
      const deleteAuth = firebase.auth().deleteUser(req.userId);
      await Promise.all([deleteUser, deleteAuth]);
    }
  });

  it('createUser -> verifyEmail -> playerSignUp -> updateUserSettings - SUCCESS', async () => {
    httpServer = app.getHttpServer();

    const newUser = await firebase.auth().createUser({
      email: 'testing@gmail.com',
      password: 'secretPassword',
    });

    const userData = (
      await db.collection('users').doc(`${newUser.uid}`).get()
    ).data();
    req.userId = newUser.uid;

    // Verify account
    const code = userData?.account?.verifyCode;

    const verifyEmail = await request(httpServer).get(
      '/users/verify-email/' + code,
    );

    // Player sign up
    const playerSingUp = await request(httpServer)
      .put('/users/player')
      .type('application/json')
      .send(user as CreatePlayerDto)
      .expect(HttpStatus.OK)
      .expect(ResponseMessage.User.UPDATED_PLAYER_DATA);

    const updateUserSetting = await request(httpServer)
      .patch('/users/player/settings/')
      .type('application/json')
      .send(<UpdatePlayerSettingsDto>{
        socialLinks: {
          instagram: 'instagram.com',
          facebook: 'facebook.com',
          twitter: 'twitter.com',
          youTube: 'youtube.com',
          veoHighlites: '',
          tiktok: 'tiktok.com',
        },
      })
      .expect(HttpStatus.OK)
      .expect(ResponseMessage.User.UPDATE_SETTINGS_SUCCESS);

    return { verifyEmail, playerSingUp, updateUserSetting };
  });

  it('createUser -> verifyEmail -> playerSignUp[error] -> updateUserSettings - FAILED', async () => {
    httpServer = app.getHttpServer();

    const newUser = await firebase.auth().createUser({
      email: 'testing@gmail.com',
      password: 'secretPassword',
    });

    const userData = (
      await db.collection('users').doc(`${newUser.uid}`).get()
    ).data();
    req.userId = newUser.uid;

    // Verify account
    const code = userData?.account?.verifyCode;
    const verifyEmail = await request(httpServer).get(
      '/users/verify-email/' + code,
    );

    // Player sign up
    const playerSingUp = await request(httpServer)
      .put('/users/player')
      .type('application/json')
      .send(null)
      .expect(HttpStatus.BAD_REQUEST);

    const updateUserSetting = await request(httpServer)
      .patch('/users/player/settings/')
      .type('application/json')
      .send(<UpdatePlayerSettingsDto>{
        socialLinks: {
          instagram: 'instagram.com',
          facebook: 'facebook.com',
          twitter: 'twitter.com',
          youTube: 'youtube.com',
          veoHighlites: '',
          tiktok: 'tiktok.com',
        },
      })
      .expect(HttpStatus.OK)
      .expect(ResponseMessage.User.UPDATE_SETTINGS_SUCCESS);

    return { verifyEmail, playerSingUp, updateUserSetting };
  });

  afterAll(async () => {
    await app.close();
  });
});
