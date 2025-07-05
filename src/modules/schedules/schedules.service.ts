import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BiographyService } from '../biography/biography.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { DiaryService } from '../diaries/diaries.service';
import { FantazyService } from '../fantazy/fantazy.service';
import { UserTypes } from '../users/enum/user-types.enum';
import { UsersService } from '../users/v1/users.service';
import { SponsorService } from '../sponsor/sponsor.service';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly diariesService: DiaryService,
    private readonly usersService: UsersService,
    private readonly biographyService: BiographyService,
    private readonly fantazyService: FantazyService,
    private readonly sponsorService: SponsorService
  ) {}
  async monthlySendMailLeaderBoard() {
    return this.dashboardService.monthlySendMailLeaderBoard();
  }

  async monthlySendMailVisitsAndVisitorsLeaderBoard() {
    return this.dashboardService.monthlySendMailVisitsAndVisitorsLeaderBoard();
  }

  async getPlayerOfTheWeek() {
    return this.dashboardService.getPlayerOfTheWeek();
  }

  async createDreamTeam() {
    return this.diariesService.createDreamTeam();
  }

  async createDreamTeamV2() {
    return this.diariesService.createDreamTeamV2();
  }

  async createDreamTeamV3() {
    return this.diariesService.createDreamTeamV3();
  }

  async createDreamTeamV4() {
    return this.diariesService.createDreamTeamV4();
  }

  async remindPlayersUpdateDiaries() {
    return this.diariesService.sendNotificationRemindUpdateDiaries(
      UserTypes.PLAYER,
    );
  }

  async remindCoachesUpdateDiaries() {
    return this.diariesService.sendNotificationRemindUpdateDiaries(
      UserTypes.COACH,
    );
  }

  async getZtarOfTheMatch() {
    return this.diariesService.getZtarOfTheMatch();
  }

  async createBirthdayPost() {
    return this.usersService.createBirthdayPost();
  }

  async caculatePlayerAvgRadar() {
    return await Promise.all([
      this.biographyService.calculatePlayersAvgRadarSkill(),
      this.biographyService.calculateCoachesAvgRadarSkill(),
    ]);
  }

  async getTheWinnerFantazyManagerOfTheWeek() {
    return this.fantazyService.getTheWinnerFantazyManagerOfTheWeek();
  }

  async createFantazyTeamPost() {
    return this.fantazyService.createFantazyTeamPost();
  }

  async getTheFantazyManagerOfTheMonth() {
    return this.fantazyService.getTheFantazyManagerOfTheMonth();
  }

  async createNotificationRemindEditFantazy() {
    return this.fantazyService.createNotificationRemindEditFantazy();
  }

  async calculatePlayerInHowManyFantazyTeam() {
    return this.fantazyService.calculatePlayerInHowManyFantazyTeam();
  }

  async chargeSponsorPaymentMonthly() {
    return this.sponsorService.chargeSponsorMonthly();
  }

  async chargeSponsorPaymentYearly() {
    return this.sponsorService.chargeSponsorYearly();
  }
}
