import { CountryDto } from '../../../../../common/dto/country.dto';
import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { ProgressStatus } from '../../../enums/progress.status';
import { TypeOfPrograms } from '../../../enums/type-of-programs';
import SessionResponseDto from '../../session/sessions-response.dto';

export class UserSessionResponse implements SessionResponseDto {
  id: string = '';

  birthCountry: CountryDto = {
    alpha2Code: 'SE',
    alpha3Code: 'SWE',
    flag: 'https://static.dwcdn.net/css/flag-icons/flags/1x1/se.svg',
    name: 'Sweden',
    region: 'Europe',
  };
  createdBy: string = '';
  programId: string = '';
  headline: string = '';
  ingressText: string = '';
  media: MediaDto[] = [];
  description: string = '';
  minParticipants: string = '';
  timeRun: string = '';
  tags: string[] = [];
  ageFrom: string = '';
  ageTo: string = '';
  mainCategory: TypeOfPrograms = TypeOfPrograms.OTHER;
  location: string = '';
  technics: number = 0;
  tactics: number = 0;
  physics: number = 0;
  mental: number = 0;
  physicallyStrain: number = 0;
  targetGroup: string = '';
  collections: string[] = [];
  shareWith: string = '';
  day: number = 0;
  order: number = 0;
  createdAt: number = 0;
  updatedAt: number = 0;
  isDeleted: boolean = false;
  isPublic: boolean = true;

  fullname: string = '';
  username: string = '';
  country: string = '';
  city: string = '';
  userType: string = '';
  faceImage: string = '';
  bioUrl: string = '';
  clubName: string = '';

  status: ProgressStatus = ProgressStatus.TO_DO;
  executedTime: Date = new Date();

  avgStar: number = 0;
  currentUserVoting: number = 0;

  countComments: number = 0;
}
