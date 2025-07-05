import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { Role } from '../../../../diaries/enum/diaries.enum';
import { ProgressStatus } from '../../../enums/progress.status';
import { TypeOfPrograms } from '../../../enums/type-of-programs';
import { ExerciseResponseDto } from '../../exercise/exercises-response.dto';

export class UserExerciseResponse implements ExerciseResponseDto {
  id: string = '';

  programId: string = '';
  sessionId: string = '';
  headline: string = '';
  ingressText: string = '';
  description: string = '';
  minParticipants: string = '';
  timeRun: string = '';
  tags: string[] = [];
  order: number = 0;
  ageFrom: string = '';
  ageTo: string = '';
  location: string = '';
  targetGroup: Role = Role.ALL;
  mainCategory: TypeOfPrograms = TypeOfPrograms.OTHER;
  collections: string[] = [];
  shareWith: string = '';
  technics: number = 0;
  tactics: number = 0;
  physics: number = 0;
  mental: number = 0;
  physicallyStrain: number = 0;
  createdAt: number = 0;
  updatedAt: number = 0;
  isDeleted: boolean = false;
  isPublic: boolean = true;

  createdBy: string = '';
  fullname: string = '';
  username: string = '';
  country: string = '';
  city: string = '';
  userType: string = '';
  faceImage: string = '';
  bioUrl: string = '';
  clubName: string = '';

  media: MediaDto[] = [];

  status: ProgressStatus = ProgressStatus.TO_DO;
  executedTime: Date = new Date();

  avgStar: number = 0;
  currentUserVoting: number = 0;

  countComments: number = 0;
}
