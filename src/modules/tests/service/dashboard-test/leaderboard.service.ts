import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { UserTestRepository } from "../../repository/user-test/user-test.repository";
import { IUserTestRepository } from "../../repository/user-test/user-test.repository.interface";
import { SubtypeRepository } from "../../repository/subtype/subtype.repository";
import { ISubtypeRepository } from "../../repository/subtype/subtype.repository.interface";
import { TeamsService } from "../../../teams/teams.service";
import { UserTypes } from "../../../users/enum/user-types.enum";
import { db } from "../../../../config/firebase.config";
import { Sequence } from "../../enums/sequence";
import { UserTest } from "../../repository/user-test/user-test";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber } from "class-validator";
import { IsString } from "class-validator";
import { IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { Metric } from "../../enums/metric";
import { ClubService } from "../../../clubs/v1/clubs.service";

type SubtypeName = 'Long Jump' | 'Sprint-10m';

export class GetLeaderboardRequestDto {
  @ApiPropertyOptional({ description: 'Optional team ID to filter by' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Start time for filtering (Unix timestamp in ms)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  startTime?: number;

  @ApiPropertyOptional({ description: 'End time for filtering (Unix timestamp in ms)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  endTime?: number;

  @ApiPropertyOptional({ description: 'Specific test name to filter by (e.g. "Long Jump" or "Sprint-10m")' })
  @IsString()
  subtypeName: SubtypeName;
}

export class LeaderboardEntryDto {
  rank: number;
  userInfo: {
    fullName: string;
    faceImage: string;
    clubName: string;
  };
  value: number;
  point: number;
}

export class LeaderboardResponseDto {
  testName: string;
  metric: Metric;
  entries: LeaderboardEntryDto[];
}

/**
 * Direct leaderboard service that bypasses the slow mappingUserInfoById function
 * and fetches user data directly from Firebase for optimal performance
 */
@Injectable()
export class DirectLeaderboardService {
  private readonly logger = new Logger('LeaderboardService');
  private readonly testCache = new Map<string, string>();
  private readonly clubNameCache = new Map<string, string>();

  constructor(
    @Inject(UserTestRepository)
    private readonly userTestRepo: IUserTestRepository,

    @Inject(SubtypeRepository)
    private readonly subtypeRepo: ISubtypeRepository,

    @Inject(TeamsService)
    private readonly teamsService: TeamsService,

    @Inject(ClubService)
    private readonly clubService: ClubService,
  ) {
    // Initialize cache
    this.initCache();
  }

  /**
   * Initialize test ID cache
   */
  private async initCache(): Promise<void> {
    try {
      const [longJump, sprint10m] = await Promise.all([
        this.subtypeRepo.getTestsBySubtypeName('Long Jump'),
        this.subtypeRepo.getTestsBySubtypeName('Sprint-10m')
      ]);

      if (longJump) this.testCache.set('Long Jump', JSON.stringify(longJump));
      if (sprint10m) this.testCache.set('Sprint-10m', JSON.stringify(sprint10m));
    } catch (error) {
      this.logger.error('Failed to initialize test cache', error);
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(
    currentUserId: string,
    request: GetLeaderboardRequestDto
  ): Promise<LeaderboardResponseDto> {
    const { teamId, startTime = 0, endTime = Date.now(), subtypeName: testName } = request;

    if (!testName) {
      throw new NotFoundException('Test name is required');
    }

    if (testName !== 'Long Jump' && testName !== 'Sprint-10m') {
      throw new NotFoundException('Invalid test name. Must be either "Long Jump" or "Sprint-10m"');
    }

    try {
      let userIds: string[] | undefined;

      if (teamId) {
        const teamMembers = await this.teamsService.getAllMemberInTeam(
          currentUserId,
          teamId,
          { userType: UserTypes.PLAYER }
        );

        userIds = teamMembers.map(member => member.userId);

        if (!userIds.length) {
          return { testName, metric: null, entries: [] };
        }
      }

      const testCache = this.testCache.get(testName);
      const test = testCache ? JSON.parse(testCache) : null;
      
      const matchConditions = [];
      
      if (userIds && userIds.length > 0) {
        matchConditions.push({ userId: { $in: userIds } });
      }
      
      if (test && test.id) {
        matchConditions.push({ subtypeId: test.id });
      }
      
      const tests = await this.userTestRepo.getLeaderboardResult(
        matchConditions,
        startTime,
        endTime,
        1, // Page
        13, // Limit
        testName === 'Long Jump' ? Sequence.INCREASING : Sequence.DECREASING
      );

      const userIdsSet = new Set(tests.map(test => test.userId));

      const userDataMap = await this.batchGetUserData(Array.from(userIdsSet));

      return {
        testName: test.testName,
        metric: test.metric,
        entries: this.createLeaderboardEntries(tests, userDataMap)
      };
    } catch (error) {
      this.logger.error(`Leaderboard error: ${error.message}`);
      throw new NotFoundException('Could not retrieve leaderboard data');
    }
  }

  /**
   * Batch get user data from Firebase
   * This is much faster than calling mappingUserInfoById for each user
   */
  private async batchGetUserData(userIds: string[]): Promise<Map<string, any>> {
    // Skip if no userIds
    if (!userIds.length) return new Map();

    try {
      const userDataMap = new Map<string, any>();

      const batchSize = 13;
      const batchPromises = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const batchPromise = db.collection('users')
          .where('userId', 'in', batch)
          .get()
          .then(async snapshot => {
            for (const doc of snapshot.docs) {
              const data = doc.data();
              const clubId = data.playerCareer?.clubId || data.coachCareer?.clubId;
              
              let clubName = 'N/A';
              if (clubId) {
                if (this.clubNameCache.has(clubId)) {
                  clubName = this.clubNameCache.get(clubId);
                } else {
                  const clubData = await this.clubService.getClubByIdFromMongo(clubId);
                  clubName = clubData?.clubName || 'N/A';
                  this.clubNameCache.set(clubId, clubName);
                }
              }

              userDataMap.set(doc.id, {
                fullName: `${data.profile?.firstName || ''} ${data.profile?.lastName || ''}`.trim() || 'Unknown',
                faceImage: data.media?.faceImage || process.env.DEFAULT_IMAGE,
                clubName: clubName
              });
            }
          });

        batchPromises.push(batchPromise);
      }

      await Promise.all(batchPromises);

      return userDataMap;
    } catch (error) {
      this.logger.error(`Error fetching user data: ${error.message}`);
      return new Map();
    }
  }

  /**
   * Create leaderboard entries from user tests
   */
  private createLeaderboardEntries(tests: UserTest[], userDataMap: Map<string, any>): LeaderboardEntryDto[] {
    return tests.map((test, index) => {
      const userData = userDataMap.get(test.userId);

      return {
        rank: index + 1,
        userInfo: {
          fullName: userData.fullName,
          faceImage: userData.faceImage,
          clubName: userData.clubName
        },
        value: test.value,
        point: test.point
      };
    });
  }
} 