import { Injectable, Logger } from '@nestjs/common';
import { SportmonksService } from '../sportmonks/sportmonks.service';
import { FavouriteTeamsService } from '../favourite-teams/favourite-teams.service';
import { FollowedMatchesService } from '../followed-matches/followed-matches.service';
import { MatchListDto, MatchListItemDto } from './dto/match-list.dto';

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly sportmonksService: SportmonksService,
    private readonly favouriteTeamsService: FavouriteTeamsService,
    private readonly followedMatchesService: FollowedMatchesService,
  ) {}

  
  async getCategorizedFixturesForDate(userId: string, date: string, sortByTime?: 'asc' | 'desc',): Promise<MatchListDto> {
    this.logger.log(`Getting categorized fixtures for user ${userId} on date ${date}`);

    const [sportmonksResponse, followedMatchIds, favouriteTeamIds] = await Promise.all([
      this.sportmonksService.fetchFixturesByDate(date),
      this.followedMatchesService.getFollowedMatchIds(userId),
      this.favouriteTeamsService.getFavouriteTeamIds(userId),
    ]);
    
    if (!sportmonksResponse || !sportmonksResponse.data) {
        return { following: [], popular: [] };
    }

    const followedMatchIdsSet = new Set(followedMatchIds);
    const favouriteTeamIdsSet = new Set(favouriteTeamIds);
    
    const response: MatchListDto = {
      following: [],
      popular: [],
    };

    for (const fixture of sportmonksResponse.data) {
      
      if (!fixture || !fixture.id || !fixture.participants || fixture.participants.length < 2) {
        continue;
      }

      const homeTeam = fixture.participants.find(p => p?.meta?.location === 'home');
      const awayTeam = fixture.participants.find(p => p?.meta?.location === 'away');

      if (!homeTeam || !awayTeam) {
        continue;
      }

      const isMatchFollowed = followedMatchIdsSet.has(fixture.id);

      const homeScoreObj = fixture.scores?.find(s => s.participant_id === homeTeam.id && s.description === 'CURRENT');
      const awayScoreObj = fixture.scores?.find(s => s.participant_id === awayTeam.id && s.description === 'CURRENT');
      
      const matchItem: MatchListItemDto = {
        matchId: fixture.id.toString(),
        startTime: fixture.starting_at ? new Date(fixture.starting_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        
        homeTeam: {
          id: homeTeam.id.toString(),
          name: homeTeam.name ?? 'Unknown Team',
          logoUrl: homeTeam.image_path ?? '',
          isFavorited: favouriteTeamIdsSet.has(homeTeam.id),
        },
        
        awayTeam: {
          id: awayTeam.id.toString(),
          name: awayTeam.name ?? 'Unknown Team',
          logoUrl: awayTeam.image_path ?? '',
          isFavorited: favouriteTeamIdsSet.has(awayTeam.id),
        },
        
        score: {
          home: homeScoreObj?.score?.goals ?? null,
          away: awayScoreObj?.score?.goals ?? null,
        },

        competition: {
          name: fixture.league?.name ?? 'Unknown League',
          round: fixture.round?.name ?? '',
        },

        venue: fixture.venue?.name ?? '',
        
        isStreamed: false, 
      };

      if (isMatchFollowed) {
        response.following.push(matchItem);
      } else {
        response.popular.push(matchItem);
      }
    }
    if (sortByTime) {
      const compareFunction = (a, b) => {
        return sortByTime === 'asc' 
          ? a.startTime.localeCompare(b.startTime) 
          : b.startTime.localeCompare(a.startTime);
      };

      response.following.sort(compareFunction);
      response.popular.sort(compareFunction);
    }
    return response;
  }
}