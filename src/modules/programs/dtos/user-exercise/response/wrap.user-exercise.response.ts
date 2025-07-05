import { MediaDto } from '../../../../diaries/dto/diary.dto';
import { ProgressStatus } from '../../../enums/progress.status';
import { UserExerciseResponse } from './user-exercise.response';

export class WrapUserExerciseResponse {
  id: string = '';
  createdBy: string = '';
  fullname: string = '';
  username: string = '';
  country: string = '';
  city: string = '';
  userType: string = '';
  faceImage: string = '';
  bioUrl: string = '';
  clubName: string = '';

  headline: string = '';
  ingressText: string = '';
  media: MediaDto[] = [];
  numberOfUsers: string = '';
  timeRun: string = '';
  tags: string[] = [];
  order: number = 0;

  status: ProgressStatus = ProgressStatus.TO_DO;

  exerciseResponses: UserExerciseResponse[];

  avgStar: number = 0;
  currentUserVoting: number = 0;

  constructor();
  constructor(response: WrapUserExerciseResponse);
  constructor(...args: any[]) {
    if (!args.length) {
      return this;
    }
    return Object.assign(this, args[0]);
  }
}
