import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SecureCodeApiGuard } from '../../auth/guards/secure-code-api.guard';
import { SchedulesService } from './schedules.service';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(SecureCodeApiGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('monthly-send-email-leaderboard')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `send email leaderboard monthly`,
  })
  monthlySendMailLeaderBoard() {
    return this.schedulesService.monthlySendMailLeaderBoard();
  }

  @Get('monthly-send-email-visits-and-visitors-leaderboard')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `send email visits and visitors leaderboard monthly`,
  })
  monthlySendMailVisitsAndVisitorsLeaderBoard() {
    return this.schedulesService.monthlySendMailVisitsAndVisitorsLeaderBoard();
  }

  @Get('get-player-of-the-week')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `get player of the week`,
  })
  getPlayerOfTheWeek() {
    return this.schedulesService.getPlayerOfTheWeek();
  }

  // @Get('create-dream-team')
  // @Throttle(1, 86400)
  // @ApiOperation({
  //   summary: `create dream team`,
  // })
  // createDreamTeam() {
  //   return this.schedulesService.createDreamTeam();
  // }

  // @Get('create-dream-team-v2')
  // @Throttle(1, 86400)
  // @ApiOperation({
  //   summary: `create dream team version 2`,
  // })
  // createDreamTeamV2() {
  //   return this.schedulesService.createDreamTeamV2();
  // }

  // @Get('create-dream-team-v3')
  // @Throttle(1, 86400)
  // @ApiOperation({
  //   summary: `create dream team version 3`,
  // })
  // createDreamTeamV3() {
  //   return this.schedulesService.createDreamTeamV3();
  // }

  @Get('create-dream-team-v4')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `create dream team version 4`,
  })
  createDreamTeamV4() {
    return this.schedulesService.createDreamTeamV4();
  }

  @Get('remind-all-the-players-update-diaries')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `remind all the players update diaries`,
  })
  remindPlayersUpdateDiaries() {
    return this.schedulesService.remindPlayersUpdateDiaries();
  }

  @Get('remind-all-the-coaches-update-diaries')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `remind all the coaches update diaries`,
  })
  remindCoachesUpdateDiaries() {
    return this.schedulesService.remindCoachesUpdateDiaries();
  }

  @Get('get-ztar-of-the-match')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `get ztar of the match`,
  })
  getZtarOfTheMatch() {
    return this.schedulesService.getZtarOfTheMatch();
  }

  @Get('create-birthday-post')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `create birthday post`,
  })
  createBirthdayPost() {
    return this.schedulesService.createBirthdayPost();
  }

  @Get('caculate-player-avg-radar')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `caculate player avg radar`,
  })
  caculatePlayerAvgRadar() {
    return this.schedulesService.caculatePlayerAvgRadar();
  }

  //# not been used, 
  @Get('get-the-winner-of-the-fantazy-team-of-the-week')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `get the winner of the fantazy team`,
  })
  getTheWinnerFantazyManagerOfTheWeek() {
    return this.schedulesService.getTheWinnerFantazyManagerOfTheWeek();
  }

  @Get('create-fantazy-team-post')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `create fantazy team post`,
  })
  createFantazyTeamPost() {
    return this.schedulesService.createFantazyTeamPost();
  }

  @Get('get-the-fantazy-manager-of-the-month')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `get the fantazy manager of the month`,
  })
  getTheFantazyManagerOfTheMonth() {
    return this.schedulesService.getTheFantazyManagerOfTheMonth();
  }

  @Get('remind-edit-fantazy-team')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `remind editting fantazy team`,
  })
  createNotificationRemindEditFantazy() {
    return this.schedulesService.createNotificationRemindEditFantazy();
  }

  @Get('player-in-how-many-team')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `calculate player in how many fantazy team`,
  })
  calculatePlayerInHowManyFantazyTeam() {
    return this.schedulesService.calculatePlayerInHowManyFantazyTeam();
  }

  @Get('monthly-sponsor-payment')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `calculate training hours and payment`,
  })
  chargePayment() {
    return this.schedulesService.chargeSponsorPaymentMonthly();
  }

  @Get('yearly-sponsor-payment')
  @Throttle(1, 86400)
  @ApiOperation({
    summary: `calculate training hours and payment`,
  })
  chargePaymentSponsorYearly() {
    return this.schedulesService.chargeSponsorPaymentYearly();
  }
}
