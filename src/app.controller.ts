import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Render,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AxiosResponse } from 'axios';
import { AppService } from './app.service';
import { SecureCodeApiGuard } from './auth/guards/secure-code-api.guard';
import { Ip } from './common/decorators/ip.decorator';
import { DetectLocationDto } from './common/dto/detect-location.dto';
import { GetFAQsDto } from './common/dto/get-faqs.dto';
import { db } from './config/firebase.config';
import { GetTokenDto } from './modules/users/dto/get-token.dto';
import { normalizeTextFormula } from './utils/normalize-text';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, description: 'Welcome to Zporter.' })
  getHello(): Promise<string> {
    return this.appService.getHello();
  }

  @Get('check-webhook-google-chat')
  checkWebHookGoogleChat() {
    return this.appService.checkWebhookGoogleChat();
  }

  @Post('data-excel')
  @UseGuards(SecureCodeApiGuard)
  async getExcel<
    T extends {
      physicalMen: any[];
      physicalWomen: any[];
      technicalMen: any[];
      technicalWomen: any[];
      mentalAll: any[];
      other: any[];
    }
  >(@Body() getExcel: T) {
    //TODO: need to find the easier way to update all sheet automatically
    try {
      const physicalMen: Object = {};
      const physicalWomen: Object = {};
      const technicalMen: Object = {};
      const technicalWomen: Object = {};
      const mentalAll: Object = {};
      const other: Object = {};

      if (getExcel.physicalMen) {
        getExcel.physicalMen?.forEach((row, idx) => {
          if (row[0]) {
            const normalizeName = normalizeTextFormula(`${row[0]}`);
            physicalMen[`${normalizeName}`] = row;
          }
        });
        await db.collection('caches').doc('PHYSICAL_MALE').set(physicalMen);
      }

      if (getExcel.physicalWomen) {
        getExcel.physicalWomen?.forEach((row, idx) => {
          if (row[0]) {
            const normalizeName = normalizeTextFormula(`${row[0]}`);
            physicalWomen[`${normalizeName}`] = row;
          }
        });
        await db.collection('caches').doc('PHYSICAL_FEMALE').set(physicalWomen);
      }

      if (getExcel.technicalMen) {
        getExcel.technicalMen?.forEach((row, idx) => {
          if (row[0]) {
            const normalizeName = normalizeTextFormula(`${row[0]}`);
            technicalMen[`${normalizeName}`] = row;
          }
        });
        await db.collection('caches').doc('TECHNICAL_MALE').set(technicalMen);
      }

      if (getExcel.technicalWomen) {
        getExcel.technicalWomen?.forEach((row, idx) => {
          if (row[0]) {
            const normalizeName = normalizeTextFormula(`${row[0]}`);
            technicalWomen[`${normalizeName}`] = row;
          }
        });
        await db
          .collection('caches')
          .doc('TECHNICAL_FEMALE')
          .set(technicalWomen);
      }

      if (getExcel.mentalAll) {
        getExcel.mentalAll?.forEach((row, idx) => {
          if (row[0]) {
            const normalizeName = normalizeTextFormula(`${row[0]}`);
            mentalAll[`${normalizeName}`] = row;
          }
        });
        await db.collection('caches').doc('MENTAL_ALL').set(mentalAll);
      }

      if (getExcel.other) {
        getExcel.other?.forEach((row, idx) => {
          if (row[0]) {
            const normalizeName = normalizeTextFormula(`${row[0]}`);
            other[`${normalizeName}`] = row;
          }
        });
        await db.collection('caches').doc('OTHER_MALE').set(other);
      }

      return 'Success';
    } catch (error) {
      throw error;
    }
  }

  @Post('grit-test')
  @UseGuards(SecureCodeApiGuard)
  async crawlDataFromGritTest<
    T extends {
      tenQuestions: any[];
      twelveQuestions: any[];
      fourteenQuestions: any[];
      fourteenQuestionsScore: any[];
    }
  >(@Body() getExcel: T) {
    //TODO: need to find the easier way to update all sheet automatically
    try {
      const tenQuestions: Object = {};
      const twelveQuestions: Object = {};
      const fourteenQuestions: Object = {};
      const fourteenQuestionsScore: Object = {};

      getExcel.tenQuestions.forEach((row, idx) => {
        if (idx >= 12) return;
        if (row[0]) {
          const normalizeName = normalizeTextFormula(`${row[0]}`);
          tenQuestions[`${normalizeName}`] = row;
        }
      });
      getExcel.twelveQuestions.forEach((row, idx) => {
        if (row[0]) {
          const normalizeName = normalizeTextFormula(`${row[0]}`);
          twelveQuestions[`${normalizeName}`] = row;
        }
      });
      getExcel.fourteenQuestions.forEach((row, idx) => {
        if (row[0]) {
          const normalizeName = normalizeTextFormula(`${row[0]}`);
          fourteenQuestions[`${normalizeName}`] = row;
        }
      });
      getExcel.fourteenQuestionsScore.forEach((row, idx) => {
        if (row[0]) {
          const normalizeName = normalizeTextFormula(`${row[0]}`);
          fourteenQuestionsScore[`${normalizeName}`] = row;
        }
      });

      await Promise.all([
        db.collection('caches').doc('TEN_QUESTIONS').set(tenQuestions),
        db.collection('caches').doc('TWELVE_QUESTIONS').set(twelveQuestions),
        db
          .collection('caches')
          .doc('FOURTEEN_QUESTIONS')
          .set(fourteenQuestions),
        db
          .collection('caches')
          .doc('FOURTEEN_QUESTIONS_SCORE')
          .set(fourteenQuestionsScore),
      ]);

      return 'Success';
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: `Get access token` })
  @ApiBody({ type: GetTokenDto })
  @Post('/log-in')
  getToken(
    @Ip() ip: string,
    @Body() getTokenDto: GetTokenDto,
  ): Promise<AxiosResponse<any>> {
    return this.appService.getToken(ip, getTokenDto);
  }

  @ApiOperation({ summary: `Get country list` })
  @Get('/countries')
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getCountry(): Promise<any> {
    return this.appService.getCountry();
  }

  @ApiOperation({ summary: `Get zporter news detail` })
  @Get('/zporter-news/:newsId')
  @Render('news')
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getZporterNews(@Param('newsId') newsId: string): Promise<any> {
    return this.appService.getZporterNews(newsId);
  }

  @ApiOperation({ summary: `Request Reset Password` })
  @Post('request-reset-password/:email')
  @Throttle(10, 60)
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async requestResetPassword(@Param('email') email: string): Promise<any> {
    return this.appService.requestResetPassword(email);
  }

  @ApiOperation({ summary: `Get FAQs` })
  @Get('/faqs')
  @Throttle(30, 60)
  findFAQs(@Query() getFAQsDto: GetFAQsDto) {
    return this.appService.getFAQsFirebase(getFAQsDto);
  }

  @ApiOperation({ summary: `Get Term & Conditions` })
  @Get('/terms-conditions')
  @Throttle(30, 60)
  getTermsAndConditions() {
    return this.appService.getTermsAndConditions();
  }

  @ApiOperation({ summary: `Get Privacy rules` })
  @Get('/privacy-rules')
  @Throttle(30, 60)
  getPrivacyRules() {
    return this.appService.getPrivacyRules();
  }

  @ApiOperation({ summary: `Get location by ip` })
  @Get('location')
  @Throttle(10, 60)
  async getLocationByIp(
    @Query() detectLocationDto: DetectLocationDto,
  ): Promise<any> {
    return this.appService.getLocationByIp(detectLocationDto);
  }

  @ApiOperation({ summary: `Sync FIFA countries data to firebase` })
  @Get('sync-fifa-countries')
  async syncFifaCountries(@Query('dateId') dateId: string) {
    return this.appService.syncFifaCountries(dateId);
  }

  @ApiOperation({ summary: `Get FIFA countries data from firebase` })
  @Get('fifa-countries')
  async getFifaCountries() {
    return this.appService.getFifaCountries();
  }
}
