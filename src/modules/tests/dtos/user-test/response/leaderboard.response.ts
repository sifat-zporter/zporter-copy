import { ReferenceResponse } from '../../reference/reference.response';
import { UserTestLeaderboardResponse } from './user-test.leaderboard.response';

export class LeaderboardResponse {
  testId: string = '';
  references: ReferenceResponse[] = [];
  leaderboardResults: UserTestLeaderboardResponse[] = [];

  constructor(leaderboardResponse: LeaderboardResponse) {
    return Object.assign(this, leaderboardResponse);
  }
}
