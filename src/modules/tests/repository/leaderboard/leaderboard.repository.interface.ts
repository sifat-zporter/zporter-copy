import { Sequence } from "../../enums/sequence";
import { UserTest } from "../user-test/user-test";

export interface LeaderboardItem {
  userId: string;
  fullName: string;
  faceImage: string;
  clubName: string;
  value: number;
  point: number;
}

export interface LeaderboardData {
  longJump: LeaderboardItem[];
  sprint10m: LeaderboardItem[];
}

export interface ILeaderboardRepository {
  /**
   * Get combined leaderboard data for Long Jump and Sprint-10m tests
   */
  getTestLeaderboards(
    userIds?: string[],
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<LeaderboardData>;

  /**
   * Get leaderboard data for a specific test
   */
  getTestLeaderboard(
    testId: string,
    userIds?: string[],
    startTime?: number,
    endTime?: number,
    sequence?: Sequence,
    limit?: number
  ): Promise<UserTest[]>;

  /**
   * Get test ID by name
   */
  findTestId(name: string): Promise<string | null>;
} 