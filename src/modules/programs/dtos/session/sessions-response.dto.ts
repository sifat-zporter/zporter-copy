import { CountryDto } from '../../../../common/dto/country.dto';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { ILibResponse } from '../../../libraries/interface/response.interface';
import { TypeOfPrograms } from '../../enums/type-of-programs';

export default class SessionResponseDto implements ILibResponse {
  id: string = '';

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
  faceImage: string = '';
  bioUrl: string = '';
  country: string = '';

  createdBy: string = '';
  programId: string = '';
  headline: string = '';
  ingressText: string = '';
  media: MediaDto[] = [];
  description: string = '';
  minParticipants: string = '2';
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
}
