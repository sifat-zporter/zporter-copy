import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../../../../common/dto/common.dto';
import { CountryDto } from '../../../../common/dto/country.dto';
import { CommonResponse } from '../../../abstract/dto/common-response';
import { MediaDto } from '../../../diaries/dto/diary.dto';
import { ILibResponse } from '../../../libraries/interface/response.interface';
import { TypeOfPrograms } from '../../enums/type-of-programs';
import { ExerciseResponseDto } from '../exercise/exercises-response.dto';
import SessionResponseDto from '../session/sessions-response.dto';

export class ProgramResponse implements ILibResponse {
  id: string = '';
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
  faceImage: string = '';
  bioUrl: string = '';
  country: string = '';
  linkShare?: string = '';

  headline: string = '';
  ingressText: string = '';
  description: string = '';
  media: MediaDto[] = [];
  minParticipants: string = '2';
  ageFrom: string = '';
  ageTo: string = '';
  timeRun: string = '';
  location: string = 'Field';
  targetGroup: string = '';
  tags: string[] = [];
  mainCategory: TypeOfPrograms = TypeOfPrograms.OTHER;

  collections: string[] = [];
  shareWith: string = '';

  createdAt: number = 0;
  updatedAt: number = 0;
  isDeleted: boolean = false;
  isPublic: boolean = true;

  avgStar: number = 0;
  currentUserVoting: number = 0;

  isCommented: boolean = false;
}

export class SessionDetailResponse {
  exercises: ILibResponse[] = [];
}
export class GetDetailResponse {
  programs?: ILibResponse[] = [];
  sessions?: ILibResponse[] = [];
  constructor();
  constructor(response: GetDetailResponse);
  constructor(...args: any[]) {
    if (!args.length) {
      return this;
    }
    return Object.assign(this, args[0]);
  }
}

// export class GetDetailResponse extends BaseResponseDto<GetDetailResponseDto> {}
