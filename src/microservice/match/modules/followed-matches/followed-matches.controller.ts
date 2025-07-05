import { Controller, Post, Delete, Param, UseGuards, Request, ParseIntPipe, HttpCode } from '@nestjs/common';
import { FollowedMatchesService } from './followed-matches.service';
import { LocalAuthGuard } from '../../../../auth/guards/local-auth.guard';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@UseGuards(LocalAuthGuard)
@ApiTags('Followed Matches')
@Controller('matches/:matchId')
export class FollowedMatchesController {
    constructor(private readonly followedMatchesService: FollowedMatchesService) {}

   
    @Post('follow')
    @ApiOperation({ summary: 'Follow a specific match for the logged-in user' })
    @ApiResponse({ status: 201, description: 'The match has been successfully followed.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiParam({ name: 'matchId', description: 'The ID of the match to follow.', example: 18335447 })
    followMatch(@Request() req, @Param('matchId', ParseIntPipe) matchId: number) {
        const userId = req.user.userId;
        return this.followedMatchesService.addFollow(userId, matchId);
    }

    
    @Post('unfollow')
    @HttpCode(200)
    @ApiOperation({ summary: 'Unfollow a specific match for the logged-in user' })
    @ApiResponse({ status: 200, description: 'The match has been successfully unfollowed.', schema: { example: {} } })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiParam({ name: 'matchId', description: 'The ID of the match to unfollow.', example: 18335447 })
    async unfollowMatch(@Request() req, @Param('matchId', ParseIntPipe) matchId: number): Promise<{}> {
        const userId = req.user.userId;
        await this.followedMatchesService.removeFollow(userId, matchId);
        return {}; 
    }
}