import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { FixturesService } from './fixtures.service';
import { LocalAuthGuard } from '../../../../auth/guards/local-auth.guard'; 
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MatchListDto } from './dto/match-list.dto';

@UseGuards(LocalAuthGuard)
@ApiBearerAuth() // Indicates that all routes in this controller require a Bearer token
@ApiTags('Fixtures & Matches') // This creates a category called "Fixtures & Matches" in Swagger
@Controller('fixtures')
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @UseGuards(LocalAuthGuard)
  @Get('categorized/by-date/:date')
  @ApiOperation({ summary: 'Get categorized match list for a specific date' })
  @ApiResponse({ status: 200, description: 'Successfully returns the categorized list of matches.', type: MatchListDto })
  @ApiResponse({ status: 401, description: 'Unauthorized if no token is provided.' })
  @ApiParam({ name: 'date', description: 'The date to fetch matches for, in YYYY-MM-DD format.', example: '2022-07-24' })
  @ApiQuery({ name: 'sortByTime', description: 'Sorts matches by time.', enum: ['asc', 'desc'], required: false })
  async getCategorizedFixtures(
    @Request() req,
    @Param('date') date: string,
    @Query('sortByTime') sortByTime?: 'asc' | 'desc',
  ) {
    const userId = req.user.userId;
    return this.fixturesService.getCategorizedFixturesForDate(userId, date, sortByTime);
  }
}