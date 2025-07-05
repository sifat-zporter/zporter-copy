class TeamParticipantDto {
  id: string;
  name: string;
  logoUrl: string;
  isFavorited: boolean; 
}

class CompetitionDto {
  name: string;
  round: string;
}

class ScoreDto {
  home?: number;
  away?: number;
}

export class MatchListItemDto {
  matchId: string;
  startTime: string;
  homeTeam: TeamParticipantDto;
  awayTeam: TeamParticipantDto;
  score: ScoreDto;
  competition: CompetitionDto;
  venue: string;
  isStreamed: boolean;
}

export class MatchListDto {
  following: MatchListItemDto[];
  popular: MatchListItemDto[];
}