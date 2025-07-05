import { MediaDto } from '../../../diaries/dto/diary.dto';
import { ProgressStatus } from '../../enums/progress.status';

export class U1ExerciseResponseDto {
  programExerciseId: string = '';
  userId: string = '';
  programSessionId: string = '';
  headline: string = '';
  ingressText: string = '';
  media: MediaDto[] = [];
  instruction: string = '';
  numberOfUsers: string = '2';
  timeRun: string = '';
  tags: string[] = [];
  order: number = 0;
  status: ProgressStatus = ProgressStatus.TO_DO;
  createdAt: number = 0;
  updatedAt: number = 0;
  finishedAt: string = '';
}

export class RunExerciseResponseDto {
  message: string = '';
  isNextSession: boolean = false;
  nextSessionId?: string = '';
  constructor(runExercise: RunExerciseResponseDto) {
    return Object.assign(this, runExercise);
  }
}
