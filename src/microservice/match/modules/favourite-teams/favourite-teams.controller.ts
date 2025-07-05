import { Controller, Post, Param, UseGuards, Request, ParseIntPipe, HttpCode } from '@nestjs/common';
import { FavouriteTeamsService } from './favourite-teams.service';
import { LocalAuthGuard } from '../../../../auth/guards/local-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@UseGuards(LocalAuthGuard)
@ApiBearerAuth() // All routes in this controller require a token
@ApiTags('Favourite Teams') // Groups these endpoints under the "Teams" category in Swagger
@Controller('teams/:teamId') 
export class FavouriteTeamsController {
    constructor(private readonly favouriteTeamsService: FavouriteTeamsService) {}

    
    @Post('favourite')
    @ApiOperation({ summary: 'Favourite a team for the logged-in user' })
    @ApiResponse({ status: 201, description: 'The team has been successfully favourited.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiParam({ name: 'teamId', description: 'The ID of the team to favourite.', example: 14 })
    favouriteTeam(@Request() req, @Param('teamId', ParseIntPipe) teamId: number) {
        const userId = req.user.userId;
        return this.favouriteTeamsService.addFavourite(userId, teamId);
    }

    
    @Post('unfavourite')
    @HttpCode(200)
    @ApiOperation({ summary: 'Unfavourite a team for the logged-in user' })
    @ApiResponse({ status: 200, description: 'The team has been successfully unfavourited.', schema: { example: {} } })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiParam({ name: 'teamId', description: 'The ID of the team to unfavourite.', example: 14 })
    async unfavouriteTeam(@Request() req, @Param('teamId', ParseIntPipe) teamId: number): Promise<{}> {
        const userId = req.user.userId;
        await this.favouriteTeamsService.removeFavourite(userId, teamId);
        return {}; 
    }
}