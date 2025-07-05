import { Inject, Injectable } from "@nestjs/common";
import { IUserTestRepository } from "../../repository/user-test/user-test.repository.interface";
import { UserTypes } from "../../../users/enum/user-types.enum";
import { Subtype } from "../../repository/subtype/subtype";
import { UserInfoDto } from "../../../../common/constants/common.constant";
import { User } from '../../../users/repositories/user/user';
import { TeamsService } from "../../../teams/teams.service";
import { MinorUserTesService } from "../user-test/minor-service/minor.user-test.service";
import { UserRepository } from "../../../users/repositories/user/user.repository";
import { IUserRepository } from "../../../users/repositories/user/user.repository.interface";
import { IMinorUserTestService } from "../user-test/minor-service/minor.user-test.interface";
import { UserTestRepository } from "../../repository/user-test/user-test.repository";
import { TestType } from "../../enums/test-type";
import { UserTest } from "../../repository/user-test/user-test";
import { ChangingTurn } from "../../enums/changing-turn.enum";
import { NodeChart } from "../../dtos/user-test/response/chart-node";

export interface TypeWithTrend {
    value: number;
    changingFlag?: ChangingTurn;
}

export interface TestAverageResponse {
    userInfo: {
        userId: string;
        isOnline?: boolean;
        faceImage: string;
        fullName: string;
        username: string;
        favoriteRoles: any[];
        birthCountry: {
            alpha2Code: string;
        };
        city: string;
        clubName: string;
    };
    [TestType.PHYSICAL]?: TypeWithTrend;
    [TestType.TECHNICAL]?: TypeWithTrend;
    [TestType.TACTICAL]?: TypeWithTrend;
    [TestType.MENTAL]?: TypeWithTrend;
    [TestType.OTHER]?: TypeWithTrend;
    averageTotal: number;
    changingFlag?: ChangingTurn;
}

export interface GetTestAverageRequest {
    teamId?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
}

export interface GetTeamIndexRequest {
    teamId?: string;
    userId?: string;
    typeOfTest: TestType;
    startDate?: number;
    endDate?: number;
}

export interface TeamIndexResponse {
    index: number;
    lastPeriod: number;
    average: number;
    series: ChartDataItem[];
}

export interface ChartDataItem {
    name: string;
    data: number[];
}

export interface TeamIndexChartResponse {
    series: ChartDataItem[];
}

export interface SubtypeIndexResponse {
    index: number;
    [key: string]: number;
}

export interface SubtypeChartResponse {
    dataLabels: string[];
    data: number[];
}

export interface TeamTotalChartRequest {
    teamId?: string;
    startDate?: number;
    endDate?: number;
}

export interface TeamTotalChartResponse {
    numberNodes: number;
    nodes: NodeChart[];
}

@Injectable()
export class DashboardTestService {

    constructor(
        @Inject(UserRepository)
        private readonly userRepository: IUserRepository,

        @Inject(MinorUserTesService)
        private readonly minorService: IMinorUserTestService,

        @Inject(TeamsService)
        private readonly teamsService: TeamsService,

        @Inject(UserTestRepository)
        private readonly userTestRepository: IUserTestRepository,
    ) {
    }

    async getTestAveragesByTeam(
        currentUserId: string,
        request: GetTestAverageRequest,
    ): Promise<TestAverageResponse[]> {
        const { teamId, userId, startTime = 0, endTime = Date.now() } = request;

        // Get user information
        const user: User = await this.userRepository.getOne({
            userId: currentUserId,
        });

        // Get team ID from request or user's primary team
        const teamIdQuery = teamId || user?.coachCareer?.primaryTeamId;

        if (!teamIdQuery && !userId) return [];

        // Get list of players
        let playerList: UserInfoDto[] = [];

        if (userId) {
            // If userId is provided, get just that user
            const userInfo = await this.userRepository.getOne(
                { userId },
                { userId: 1, username: 1, profile: 1, media: 1 }
            );

            if (userInfo) {
                playerList = [{
                    userId: userInfo.userId,
                    username: userInfo.username,
                    firstName: userInfo.profile?.firstName,
                    lastName: userInfo.profile?.lastName,
                    faceImage: userInfo.media?.faceImage,
                }];
            }
        } else {
            // Get all players in the team
            playerList = await this.teamsService.getAllMemberInTeam(
                currentUserId,
                teamIdQuery,
                { userType: UserTypes.PLAYER }
            );
        }

        if (!playerList.length) return [];

        // Get test subtypes for all test types in a single batch
        const testTypes = Object.values(TestType);
        const subtypesPromises = testTypes.map(testType =>
            this.minorService.getSubtypeOfTest(testType)
        );

        const allSubtypes = await Promise.all(subtypesPromises);
        const testTypeSubtypesMap = new Map<string, Subtype[]>();
        testTypes.forEach((testType, index) => {
            testTypeSubtypesMap.set(testType, allSubtypes[index]);
        });

        // Get all subtypeIds for all test types
        const allSubtypeIds: string[] = [];
        const subtypeIdToTypeMap = new Map<string, string>();

        for (const [testType, subtypes] of testTypeSubtypesMap.entries()) {
            if (subtypes?.length) {
                const ids = subtypes.map(subtype => {
                    const id = subtype._id.toString();
                    subtypeIdToTypeMap.set(id, testType);
                    return id;
                });
                allSubtypeIds.push(...ids);
            }
        }

        const resultsPromises = playerList.map(async (player) => {
            const result: TestAverageResponse = {
                userInfo: {
                    userId: player.userId,
                    isOnline: player.isOnline,
                    faceImage: player.faceImage,
                    fullName: player.fullName,
                    username: player.username,
                    favoriteRoles: player.favoriteRoles,
                    birthCountry: {
                        alpha2Code: player.birthCountry?.alpha2Code,
                    } as any,
                    city: player.city,
                    clubName: player.clubName,
                },
                averageTotal: 0
            };

            // Initialize default values for all test types
            for (const testType of testTypes) {
                result[testType] = { value: 0 };
            }

            // Get all tests for this player across all subtypes in a single query
            const userTests: UserTest[] = await this.userTestRepository.get({
                match: {
                    userId: player.userId,
                    subtypeId: { $in: allSubtypeIds },
                    isDeleted: false,
                    isVerified: true,
                    executedTime: {
                        $gte: startTime,
                        $lte: endTime
                    }
                },
                project: {
                    _id: 1,
                    subtypeId: 1,
                    point: 1,
                    executedTime: 1
                },
                keySort: {
                    executedTime: -1
                }
            });

            if (!userTests.length) return result;

            // Group tests by test type
            const testsByType = new Map<string, UserTest[]>();
            for (const test of userTests) {
                const testType = subtypeIdToTypeMap.get(test.subtypeId);
                if (!testType) continue;

                if (!testsByType.has(testType)) {
                    testsByType.set(testType, []);
                }
                testsByType.get(testType).push(test);
            }

            let totalPoints = 0;
            let totalTests = 0;
            const allTrends: ChangingTurn[] = [];

            // Process each test type
            for (const testType of testTypes) {
                const testsForType = testsByType.get(testType) || [];

                if (testsForType.length > 0) {
                    // Calculate average for this test type
                    const typeTotal = testsForType.reduce((sum, test) => sum + (test.point || 0), 0);
                    const typeAverage = Math.round(typeTotal / testsForType.length);

                    // Create response object for this test type
                    const typeResponse: TypeWithTrend = {
                        value: typeAverage
                    };

                    // Determine trend (up/down) for this specific test type
                    if (testsForType.length >= 2) {
                        // Sort by execution time (most recent first)
                        const sortedTests = [...testsForType].sort((a, b) => b.executedTime - a.executedTime);

                        // Calculate average of older half vs newer half
                        const midpoint = Math.floor(sortedTests.length / 2);
                        const recentTests = sortedTests.slice(0, midpoint);
                        const olderTests = sortedTests.slice(midpoint);

                        const recentAvg = recentTests.reduce((sum, test) => sum + (test.point || 0), 0) / recentTests.length;
                        const olderAvg = olderTests.reduce((sum, test) => sum + (test.point || 0), 0) / olderTests.length;

                        if (recentAvg > olderAvg) {
                            typeResponse.changingFlag = ChangingTurn.UP;
                            allTrends.push(ChangingTurn.UP);
                        } else if (recentAvg < olderAvg) {
                            typeResponse.changingFlag = ChangingTurn.DOWN;
                            allTrends.push(ChangingTurn.DOWN);
                        }
                    }

                    // Set the test type in the result
                    result[testType] = typeResponse;

                    // Add to total average calculation
                    totalPoints += typeTotal;
                    totalTests += testsForType.length;
                }
            }

            // Calculate overall average
            if (totalTests > 0) {
                result.averageTotal = Math.round(totalPoints / totalTests);

                // Calculate changing flag based on trends across all test types
                if (allTrends.length > 0) {
                    const numberOfTurnUp = allTrends.filter(trend => trend === ChangingTurn.UP).length;
                    result.changingFlag = numberOfTurnUp >= allTrends.length / 2 ? ChangingTurn.UP : ChangingTurn.DOWN;
                }
            }

            return result;
        });

        return Promise.all(resultsPromises);
    }

    async getTeamIndex(
        currentUserId: string,
        request: GetTeamIndexRequest,
    ): Promise<TeamIndexResponse> {
        const { teamId, userId, typeOfTest, startDate = 0, endDate = Date.now() } = request;

        const user: User = await this.userRepository.getOne({
            userId: currentUserId,
        });

        // Get team ID from request or user's primary team
        const teamIdQuery = teamId || user?.coachCareer?.primaryTeamId;

        if (!teamIdQuery && !userId) {
            throw new Error('Team ID or User ID is required');
        }

        // Default empty response
        const emptyResponse = {
            index: 0,
            lastPeriod: 0,
            average: 0,
            series: [
                { name: 'Amateur', data: [0] },
                { name: 'Semi-Pro', data: [0] },
                { name: 'Pro', data: [0] },
                { name: 'International', data: [0] }
            ]
        };

        // Get all players in the team
        const playerList = await this.teamsService.getAllMemberInTeam(
            currentUserId,
            teamIdQuery,
            { userType: UserTypes.PLAYER }
        );

        if (!playerList.length) {
            return emptyResponse;
        }

        // Get subtypes for the specified test type
        const subtypes = await this.minorService.getSubtypeOfTest(typeOfTest);
        const filteredSubtypes = subtypes.filter(s => s.subtypeName.toLowerCase() !== 'other');
        if (!filteredSubtypes.length) {
            return emptyResponse;
        }

        const subtypeIds = filteredSubtypes.map(subtype => subtype._id.toString());
        const playerIds = playerList.map(p => p.userId);

        // Calculate period ranges
        const periodStart = startDate || 0;
        const periodEnd = endDate || Date.now();
        const periodDuration = periodEnd - periodStart;
        const lastPeriodStart = periodStart - periodDuration;
        const lastPeriodEnd = periodStart - 1;

        // Get all tests in a single query for both current and last period
        const userTests = await this.userTestRepository.get({
            match: {
                userId: { $in: playerIds },
                subtypeId: { $in: subtypeIds },
                isDeleted: false,
                isVerified: true,
                createdAt: {
                    $gte: lastPeriodStart,
                    $lte: periodEnd
                }
            },
            project: {
                _id: 1,
                point: 1,
                createdAt: 1
            }
        });

        // Separate tests into current period and last period
        const currentPeriodTests = userTests.filter(test => test.createdAt >= periodStart && test.createdAt <= periodEnd);
        const lastPeriodTests = userTests.filter(test => test.createdAt >= lastPeriodStart && test.createdAt <= lastPeriodEnd);

        // Calculate averages
        const calcAvg = (tests: UserTest[]) => tests.length ? Math.round(tests.reduce((sum, t) => sum + (t.point || 0), 0) / tests.length) : 0;

        const index = calcAvg(currentPeriodTests);
        const lastPeriod = calcAvg(lastPeriodTests);

        // Group current period tests by skill level
        const amateurTests: UserTest[] = [];
        const semiProTests: UserTest[] = [];
        const proTests: UserTest[] = [];
        const internationalTests: UserTest[] = [];

        // Single-pass categorization of tests by skill level
        for (const test of currentPeriodTests) {
            const point = test.point || 0;
            if (point <= 40) {
                amateurTests.push(test);
            } else if (point <= 60) {
                semiProTests.push(test);
            } else if (point <= 80) {
                proTests.push(test);
            } else {
                internationalTests.push(test);
            }
        }

        const series = [
            { name: 'Amateur', data: [calcAvg(amateurTests)] },
            { name: 'Semi-Pro', data: [calcAvg(semiProTests)] },
            { name: 'Pro', data: [calcAvg(proTests)] },
            { name: 'International', data: [calcAvg(internationalTests)] }
        ];

        // Calculate average from series data values
        let seriesSum = 0;
        let seriesCount = 0;
        for (const item of series) {
            if (item.data[0] > 0) {
                seriesSum += item.data[0];
                seriesCount++;
            }
        }
        const average = seriesCount > 0 ? Math.round(seriesSum / seriesCount) : 0;

        return {
            index,
            lastPeriod,
            average,
            series
        };
    }

    async getTeamIndexBySubtypeTest(
        currentUserId: string,
        request: GetTeamIndexRequest,
    ): Promise<SubtypeChartResponse> {
        const { teamId, userId, startDate = 0, endDate = Date.now(), typeOfTest = TestType.PHYSICAL } = request;

        // Get current user information
        const user: User = await this.userRepository.getOne({
            userId: currentUserId,
        });

        // Determine which team to use
        const teamIdQuery = teamId || user?.coachCareer?.primaryTeamId;

        // If no userId is provided and we can't determine a team, return empty data
        if (!teamIdQuery && !userId) {
            return { dataLabels: [], data: [] };
        }

        // Determine which player(s) to analyze
        let playerIds: string[] = [];

        if (userId) {
            // If userId is provided, we only analyze that specific player
            playerIds = [userId];
        } else {
            // Get all players in the team
            const playerList = await this.teamsService.getAllMemberInTeam(
                currentUserId,
                teamIdQuery,
                { userType: UserTypes.PLAYER }
            );

            playerIds = playerList.map(player => player.userId);
        }

        if (!playerIds.length) {
            return { dataLabels: [], data: [] };
        }

        // Get subtypes for the specified test type and filter out 'Other'
        const allSubtypes: Subtype[] = await this.minorService.getSubtypeOfTest(typeOfTest);
        const subtypes: Subtype[] = allSubtypes.filter(s => s.subtypeName !== 'Other');

        if (!subtypes.length) {
            return { dataLabels: [], data: [] };
        }

        // Create a map of subtypeId to subtype for faster lookups
        const subtypeMap = new Map<string, Subtype>();
        const allSubtypeIds = subtypes.map(s => {
            const id = s._id.toString();
            subtypeMap.set(id, s);
            return id;
        });

        // Get all tests for the specified players within the time range
        const userTests: UserTest[] = await this.userTestRepository.get({
            match: {
                userId: { $in: playerIds },
                subtypeId: { $in: allSubtypeIds },
                isDeleted: false,
                isVerified: true,
                executedTime: {
                    $gte: startDate,
                    $lte: endDate
                }
            },
            project: {
                _id: 1,
                subtypeId: 1,
                point: 1,
            },
            keySort: {
                executedTime: -1
            }
        });

        // Prepare result data structure - initialize with zeros
        const subtypeResults: Record<string, { sum: number, count: number }> = {};
        for (const subtype of subtypes) {
            subtypeResults[subtype.subtypeName] = { sum: 0, count: 0 };
        }

        // Calculate sums and counts in a single pass
        let totalSum = 0;
        let totalCount = 0;

        for (const test of userTests) {
            const subtype = subtypeMap.get(test.subtypeId);
            if (!subtype) continue; // Skip if subtype not found (shouldn't happen)

            const subtypeName = subtype.subtypeName;

            if (test.point) {
                subtypeResults[subtypeName].sum += test.point;
                subtypeResults[subtypeName].count++;
                totalSum += test.point;
                totalCount++;
            }
        }

        // Calculate averages
        const response: SubtypeIndexResponse = {
            index: totalCount > 0 ? Math.round(totalSum / totalCount) : 0
        };

        for (const [subtypeName, result] of Object.entries(subtypeResults)) {
            response[subtypeName] = result.count > 0
                ? Math.round(result.sum / result.count)
                : 0;
        }

        // Convert to chart format
        return this.getSubtypeChartData(response, subtypes);
    }

    /**
     * Creates chart data format from subtypes and response data
     */
    getSubtypeChartData(response: SubtypeIndexResponse, subtypes: Subtype[]): SubtypeChartResponse {
        // Use "Index" as first label and get the index value
        const dataLabels: string[] = ["Index"];
        const data: number[] = [response.index || 0];

        // Add each subtype name and its corresponding value to the arrays
        for (const subtype of subtypes) {
            const subtypeName = subtype.subtypeName;
            dataLabels.push(subtypeName);
            data.push(response[subtypeName] || 0);
        }

        return { dataLabels, data };
    }

    /**
     * Calculate team average performance chart over time
     * Similar to getTotalTestChart but for the entire team
     * Analyzes all test types
     */
    async getTeamTotalTestChart(
        currentUserId: string,
        request: TeamTotalChartRequest
    ): Promise<TeamTotalChartResponse> {
        let { teamId, startDate, endDate = Date.now() } = request;
        
        startDate = startDate || 0;
        
        // Get current user information
        const user: User = await this.userRepository.getOne({
            userId: currentUserId,
        });

        // Determine which team to use
        const teamIdQuery = teamId || user?.coachCareer?.primaryTeamId;
        
        if (!teamIdQuery) {
            return {
                numberNodes: 0,
                nodes: []
            };
        }

        // Get all players in the team
        const playerList = await this.teamsService.getAllMemberInTeam(
            currentUserId,
            teamIdQuery,
            { userType: UserTypes.PLAYER }
        );

        if (!playerList.length) {
            return {
                numberNodes: 0,
                nodes: []
            };
        }

        // Get subtypes for all test types
        const testTypes = Object.values(TestType);
        const subtypesPromises = testTypes.map(type => 
            this.minorService.getSubtypeOfTest(type)
        );
        
        const allSubtypes = await Promise.all(subtypesPromises);
        
        const flattenedSubtypes = allSubtypes.flat();
        const filteredSubtypes = flattenedSubtypes.filter(s => s && s.subtypeName !== 'Other');
        
        const allSubtypeIds = filteredSubtypes.map(subtype => subtype._id.toString());

        if (!allSubtypeIds.length) {
            return {
                numberNodes: 0,
                nodes: []
            };
        }

        const playerIds = playerList.map(p => p.userId);
        console.log(`[getTeamTotalTestChart] Found ${playerIds.length} players in team`);
        
        // First try to get all tests without date filtering to check if there's any data at all
        const allTestsQuery: any = {
            match: {
                userId: { $in: playerIds },
                subtypeId: { $in: allSubtypeIds },
                isDeleted: false,
                isVerified: true
            },
            project: {
                _id: 1,
                point: 1,
                subtypeId: 1,
                executedTime: 1,
                userId: 1,
                createdAt: 1
            },
            keySort: {
                executedTime: 1
            }
        };
        
        // Get all tests without date filtering
        const allTests = await this.userTestRepository.get(allTestsQuery);
        console.log(`[getTeamTotalTestChart] Total tests without date filter: ${allTests.length}`);
        
        // Create query for tests with date filtering
        let userTests = allTests;
        
        // If startDate is specified, filter the tests in memory instead of using MongoDB query
        if (startDate > 0) {
            try {
                userTests = allTests.filter(test => {
                    const testTime = test.executedTime || test.createdAt || 0;
                    return testTime >= startDate;
                });
                
                console.log(`[getTeamTotalTestChart] Filtered to ${userTests.length} tests after startDate ${startDate}`);
            } catch (error) {
                console.log(`[getTeamTotalTestChart] Error filtering by date: ${error.message}`);
                // Fallback to using all tests
                userTests = allTests;
            }
        }
        
        if (!userTests.length) {
            return {
                numberNodes: 0,
                nodes: []
            };
        }

        // Group by month/year
        const monthYearGroups = new Map<string, {
            tests: UserTest[],
            timestamp: number
        }>();
        
        userTests.forEach(test => {
            try {
                // Use executedTime if available, otherwise fallback to createdAt
                const timestamp = test.executedTime && test.executedTime > 0 
                    ? test.executedTime 
                    : (test.createdAt || 0);
                    
                if (!timestamp) return; // Skip tests with no valid date
                
                // Validate the timestamp (must be a valid date)
                if (isNaN(new Date(timestamp).getTime())) {
                    return; // Skip invalid dates
                }
                
                const dateObj = new Date(timestamp);
                const month = dateObj.getMonth() + 1; // 1-12
                const year = dateObj.getFullYear();
                const monthYearKey = `${month}/${year}`;
                
                if (!monthYearGroups.has(monthYearKey)) {
                    monthYearGroups.set(monthYearKey, {
                        tests: [],
                        timestamp: timestamp
                    });
                }
                
                monthYearGroups.get(monthYearKey).tests.push(test);
            } catch (error) {
                console.log(`[getTeamTotalTestChart] Error processing test: ${error.message}`);
            }
        });
        
        const sortedGroups = Array.from(monthYearGroups.entries()).sort((a, b) => {
            return a[1].timestamp - b[1].timestamp;
        });
        
        // Generate nodes for each month/year group
        const nodes = sortedGroups.map(([monthYear, group], index) => {
            // For each group, calculate cumulative stats up to this point
            const testsUpToThisPoint: UserTest[] = [];
            
            for (let i = 0; i <= index; i++) {
                testsUpToThisPoint.push(...sortedGroups[i][1].tests);
            }
            
            // Group tests by userId and subtypeId to get latest tests per player and subtype
            const latestTestsByUserAndSubtype = new Map<string, UserTest>();
            
            for (const test of testsUpToThisPoint) {
                try {
                    const key = `${test.userId}_${test.subtypeId}`;
                    
                    // Use executedTime if available, otherwise fallback to createdAt
                    const testTime = test.executedTime && test.executedTime > 0 
                        ? test.executedTime 
                        : (test.createdAt || 0);
                        
                    if (!testTime) continue; // Skip tests with no valid date
                    
                    if (!latestTestsByUserAndSubtype.has(key)) {
                        latestTestsByUserAndSubtype.set(key, test);
                    } else {
                        const existingTest = latestTestsByUserAndSubtype.get(key);
                        const existingTime = existingTest.executedTime && existingTest.executedTime > 0
                            ? existingTest.executedTime
                            : (existingTest.createdAt || 0);
                            
                        if (testTime > existingTime) {
                            latestTestsByUserAndSubtype.set(key, test);
                        }
                    }
                } catch (error) {
                    console.log(`[getTeamTotalTestChart] Error processing latest test: ${error.message}`);
                }
            }
            
            // Calculate average from latest tests
            let totalPoints = 0;
            let testsCount = 0;
            
            for (const test of latestTestsByUserAndSubtype.values()) {
                if (test.point) {
                    totalPoints += test.point;
                    testsCount++;
                }
            }
            
            const avgPoint = testsCount > 0 ? Math.round(totalPoints / testsCount) : 0;
            
            return new NodeChart({
                index,
                point: avgPoint,
                day: monthYear // Using month/year as the label
            });
        });

        return {
            numberNodes: nodes.length,
            nodes
        };
    }
}