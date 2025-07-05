import { HttpStatus } from '@nestjs/common';
import { CountryDto } from '../../../../../common/dto/country.dto';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { ProgressStatus } from '../../../enums/progress.status';
import { TypeOfPrograms } from '../../../enums/type-of-programs';
import { Program } from '../../../repositories/program/program';
import { ProgramResponse } from '../../program/programs-response.dto';

export class UserProgramResponse implements ProgramResponse {
  isCommented: boolean = false;
  createdBy: string = '';
  fullname: string = '';
  username: string = '';
  birthCountry: CountryDto = {
    alpha2Code: 'SE',
    alpha3Code: 'SWE',
    flag: 'https://static.dwcdn.net/css/flag-icons/flags/1x1/se.svg',
    name: 'Sweden',
    region: 'Europe',
  };
  city: string = '';
  userType: string = '';
  clubName: string = '';
  headline: string = '';
  ingressText: string = '';
  description: string = '';
  media: MediaDto[] = [];
  minParticipants: string = '';
  ageFrom: string = '';
  ageTo: string = '';
  timeRun: string = '';
  location: string = '';
  targetGroup: string = '';
  tags: string[] = [];
  mainCategory: TypeOfPrograms = TypeOfPrograms.OTHER;
  collections: string[] = [];
  shareWith: string = '';
  createdAt: number = 0;
  updatedAt: number = 0;
  isDeleted: boolean = false;
  excutedTime: Date = new Date();

  id: string = '';
  country: string = '';

  faceImage: string = '';
  bioUrl: string = '';

  status: ProgressStatus = ProgressStatus.TO_DO;

  isSaved: boolean = false;
  isPublic: boolean = false;

  avgStar: number = 0;
  currentUserVoting: number = 0;
}

export interface ResponseGetProgram {
  message: string;
  body: Program[];
  statusCode: HttpStatus;
  totalPage?: number;
  currentPage?: number;
}
