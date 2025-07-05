import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { ILeaderboardRepository, LeaderboardItem, LeaderboardData } from './leaderboard.repository.interface';
import { UserTestRepository } from '../user-test/user-test.repository';
import { IUserTestRepository } from '../user-test/user-test.repository.interface';
import { SubtypeRepository } from '../subtype/subtype.repository';
import { ISubtypeRepository } from '../subtype/subtype.repository.interface';
import { UserTest } from '../user-test/user-test';
import { ClubRepository } from '../../../clubs/repository/club.repository';
import { Sequence } from '../../enums/sequence';
import { mappingUserInfoById } from "../../../../helpers/mapping-user-info";

@Injectable()
export class LeaderboardRepository implements ILeaderboardRepository {
  private readonly logger = new Logger(LeaderboardRepository.name);
  private readonly testCache = new Map<string, string>();

  constructor(
    @Inject(UserTestRepository)
    private readonly userTestRepository: IUserTestRepository,

    @Inject(SubtypeRepository)
    private readonly subtypeRepository: ISubtypeRepository,

    @Inject(ClubRepository)
    private readonly clubRepository: ClubRepository,
  ) {
    // Initialize cache for common tests
    this.initTestCache();
  }

  /**
   * Initialize test ID cache
   */
  private async initTestCache(): Promise<void> {
    try {
      const [longJump, sprint10m] = await Promise.all([
        this.subtypeRepository.getOne({ name: 'Long Jump' }),
        this.subtypeRepository.getOne({ name: 'Sprint-10m' })
      ]);

      if (longJump) this.testCache.set('Long Jump', longJump._id.toString());
      if (sprint10m) this.testCache.set('Sprint-10m', sprint10m._id.toString());
    } catch (error) {
      this.logger.warn('Failed to initialize test cache', error);
    }
  }

  /**
   * Get combined leaderboard data for Long Jump and Sprint-10m tests
   */
  async getTestLeaderboards(
    userIds?: string[],
    startTime: number = 0,
    endTime: number = Date.now(),
    limit: number = 10
  ): Promise<LeaderboardData> {
    try {
      // Get test IDs from cache or fetch them
      let longJumpId = this.testCache.get('Long Jump');
      let sprint10mId = this.testCache.get('Sprint-10m');

      if (!longJumpId) longJumpId = await this.findTestId('Long Jump');
      if (!sprint10mId) sprint10mId = await this.findTestId('Sprint-10m');

      if (!longJumpId || !sprint10mId) {
        throw new BadRequestException('Required test types not found');
      }

      // Run queries in parallel
      const [longJumpTests, sprint10mTests] = await Promise.all([
        this.getTestLeaderboard(
          longJumpId,
          userIds,
          startTime,
          endTime,
          Sequence.INCREASING,
          limit
        ),
        this.getTestLeaderboard(
          sprint10mId,
          userIds,
          startTime,
          endTime,
          Sequence.DECREASING,
          limit
        )
      ]);

      // Initialize response object
      const data: LeaderboardData = {
        longJump: [],
        sprint10m: []
      };

      // Process results in parallel
      await Promise.all([
        this.processTestResults(longJumpTests, data.longJump),
        this.processTestResults(sprint10mTests, data.sprint10m)
      ]);

      return data;
    } catch (error) {
      this.logger.error(`Failed to get leaderboards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get leaderboard data for a specific test
   */
  async getTestLeaderboard(
    testId: string,
    userIds?: string[],
    startTime: number = 0,
    endTime: number = Date.now(),
    sequence: Sequence = Sequence.INCREASING,
    limit: number = 10
  ): Promise<UserTest[]> {
    try {
      // Build match condition
      const matchCondition: any[] = [{ subtypeId: testId }];
      
      // Add user filter if provided
      if (userIds?.length) {
        matchCondition.push({ userId: { $in: userIds } });
      }

      // Fetch leaderboard data
      return await this.userTestRepository.getLeaderboardResult(
        matchCondition,
        startTime,
        endTime,
        1, // Page
        limit,
        sequence
      );
    } catch (error) {
      this.logger.error(`Failed to get test leaderboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get test ID by name
   */
  async findTestId(name: string): Promise<string | null> {
    try {
      // Check cache first
      const cachedId = this.testCache.get(name);
      if (cachedId) return cachedId;

      // Fetch from database
      const test = await this.subtypeRepository.getOne({ name });
      if (!test) return null;

      // Update cache and return ID
      const testId = test._id.toString();
      this.testCache.set(name, testId);
      return testId;
    } catch (error) {
      this.logger.error(`Failed to find test ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Process user test results into leaderboard items
   */
  private async processTestResults(
    tests: UserTest[],
    results: LeaderboardItem[]
  ): Promise<void> {
    if (!tests.length) return;

    // Get unique IDs for batch processing
    const userIds = [...new Set(tests.map(t => t.userId))];
    const clubIds = [...new Set(tests.map(t => t.clubId).filter(Boolean))];
    
    // Fetch user and club data in parallel
    const [users, clubs] = await Promise.all([
      Promise.all(userIds.map(id => mappingUserInfoById(id))),
      clubIds.length ? Promise.all(clubIds.map(id => 
        this.clubRepository.customedFindOne({ clubId: id }, { clubName: 1 }))
      ) : []
    ]);
    
    // Create maps for fast lookups
    const userMap = new Map(users.filter(Boolean).map(u => [u.userId, u]));
    const clubMap = new Map(clubs.filter(Boolean).map(c => [c.clubId, c]));

    // Build result entries
    for (const test of tests) {
      const user = userMap.get(test.userId);
      if (!user) continue;
      
      const club = test.clubId ? clubMap.get(test.clubId) : null;
      
      results.push({
        userId: test.userId,
        fullName: user.fullName,
        faceImage: user.faceImage,
        clubName: club?.clubName || user.clubName || '',
        value: test.value,
        point: test.point
      });
    }
  }
} 