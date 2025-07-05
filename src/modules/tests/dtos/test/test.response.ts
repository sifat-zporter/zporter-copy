import { MediaDto } from '../../../diaries/dto/diary.dto';
import { LogoType } from '../../enums/logo-type';
import { Metric } from '../../enums/metric';
import { GeneralInfoDto } from './general-info.dto';
import { TableIndex } from './table-index.dto';

export class TestResponse {
  id: string = '';
  subtypeId: string = '';

  testName: string = '';

  logoType: LogoType | string = LogoType.SQUAT;
  media: MediaDto[] = [];

  generalInfo: GeneralInfoDto = {
    kindOfExercise: {
      numberOfPeople: '',
      place: '',
    },
    timeExercise: { time: '', period: '' },
    isPublic: true,
  };

  numberOfPeople: string = '';
  description: string = '';
  tableDescription: string = '';
  table: TableIndex[][] = [];

  title: string = '';
  placeholder: string = '';
  metric: Metric = Metric.KILOGRAM;
  isDeleted: boolean = false;
  linkShare: string = '';

  constructor();
  constructor(testResponse: TestResponse);
  constructor(...args: any[]) {
    if (args.length == 1) {
      return Object.assign(this, args[0]);
    } else {
      return new TestResponse();
    }
  }
}
