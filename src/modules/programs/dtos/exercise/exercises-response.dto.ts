import { MediaDto } from '../../../diaries/dto/diary.dto';
import { Role } from '../../../diaries/enum/diaries.enum';
import { ILibResponse } from '../../../libraries/interface/response.interface';
import { TypeOfPrograms } from '../../enums/type-of-programs';

export class ExerciseResponseDto implements ILibResponse {
  // constructor(
  //   public id: string = '',
  //   public createdBy: string = '',
  //   public sessionId: string = '',
  //   public headline: string = '',
  //   public ingressText: string = '',
  //   public media: MediaDto[] = [],
  //   public instruction: string = '',
  //   public numberOfUsers: string = '',
  //   public timeRun: string = '',
  //   public tags: string[] = [],
  //   public order: number = 0,
  //   public createdAt: number = 0,
  //   public updatedAt: number = 0,
  //   public isDeleted: boolean = false,
  // ) {}
  id = '';

  programId = '';
  sessionId = '';

  headline = '';
  ingressText = '';
  media: MediaDto[] = [];
  description = '';
  minParticipants = '';
  timeRun = '';
  tags: string[] = [];

  order = 0;
  // day: number = 0;

  ageFrom = '';
  ageTo = '';
  location = '';
  targetGroup: Role = Role.ALL;
  mainCategory: TypeOfPrograms = TypeOfPrograms.OTHER;
  collections: string[] = [];
  shareWith = '';

  technics = 0;
  tactics = 0;
  physics = 0;
  mental = 0;
  physicallyStrain = 0;

  createdBy = '';

  createdAt = 0;
  updatedAt = 0;
  isDeleted = false;
  isPublic = true;
}
