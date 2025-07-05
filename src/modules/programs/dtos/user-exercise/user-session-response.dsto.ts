import { ProgressStatus } from '../../enums/progress.status';
import SessionResponseDto from '../session/sessions-response.dto';

export class USessionResponseDto {
  userId: string = '';
  session: SessionResponseDto = new SessionResponseDto();
  status: ProgressStatus = ProgressStatus.TO_DO;
  finishedAt: string = '';
}
