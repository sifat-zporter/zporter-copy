import { DiaryDto } from './diary.dto';
import { InjuryDto } from './injury.dto';

export class MotivationQuote {
  content: string;
  author: string;
}

export class OutputGetDiary {
  data: DiaryDto[];
  motivationQuote: MotivationQuote;
}

export class OutputCreateDiary {
  diaryId: string;
  post?: {};
  injuries: InjuryDto[];
}

export class OutputCreateCoachDiaryCap {
  diaryId: string;
}
