import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamReqDto } from './dto/create-team.req.dto';
import { LocalAuthGuard } from '../../../../auth/guards/local-auth.guard'; // Adjust this path if necessary

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  
  @Get('by-date/:date')
  findTeamsByDate(@Param('date') date: string) {
    return this.teamsService.findTeamsByMatchDate(date);
  }

  
  @Get('search')
  search(@Query('name') name: string) {
      return this.teamsService.searchTeams(name);
  }

  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.getTeamById(id);
  }

  
  @UseGuards(LocalAuthGuard)
  @Post()
  create(@Body() createTeamDto: CreateTeamReqDto) {
    return this.teamsService.createYouthTeam(createTeamDto);
  }
}