import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';
import { SportmonksService } from '../sportmonks/sportmonks.service'; 
import { TeamDto } from './dto/team.dto';
import { CreateTeamReqDto } from './dto/create-team.req.dto';
import { Team } from './interfaces/team.interface';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly sportmonksService: SportmonksService,
  ) {}

  
  async findTeamsByMatchDate(date: string): Promise<TeamDto[]> {
    this.logger.log(`Finding teams by calling Sportmonks for date: ${date}`);
    const sportmonksResponse = await this.sportmonksService.fetchFixturesByDate(date);

    if (!sportmonksResponse || !sportmonksResponse.data || sportmonksResponse.data.length === 0) {
      return [];
    }

    const teamsMap = new Map<string, TeamDto>();

    for (const fixture of sportmonksResponse.data) {
      if (fixture.participants && fixture.participants.length > 0) {
        for (const participant of fixture.participants) {
          if (participant && participant.id && !teamsMap.has(participant.id.toString())) {
            teamsMap.set(participant.id.toString(), {
              id: participant.id.toString(),
              name: participant.name,
              logoUrl: participant.image_path,
              type: 'professional',
            });
          }
        }
      }
    }

    return Array.from(teamsMap.values());
  }
  
  
  async createYouthTeam(createTeamDto: CreateTeamReqDto): Promise<TeamDto> {
      const team = await this.teamsRepository.createYouthTeam(createTeamDto);
      return this.mapToDto(team);
  }

  
  async searchTeams(name: string): Promise<TeamDto[]> {
      const teams = await this.teamsRepository.findByName(name);
      return teams.map(this.mapToDto);
  }

  
  async getTeamById(id: string): Promise<TeamDto> {
      const team = await this.teamsRepository.findById(id);
      if (!team) {
          throw new NotFoundException(`Team with ID ${id} not found.`);
      }
      return this.mapToDto(team);
  }

  
  private mapToDto(team: Team): TeamDto {
    return {
      id: team._id.toString(),
      name: team.name,
      logoUrl: team.logoUrl,
      country: team.country,
      type: team.type,
    };
  }
}