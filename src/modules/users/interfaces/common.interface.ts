import { JoinTeamStatus } from '../../clubs/enum/club.enum';
import { Currency, VideoLinkSources } from '../enum/common.enum';

export interface IMarketValue {
  value: string;
  currency: Currency.EUR;
}

export interface IVideoLink {
  url: string;
  source: VideoLinkSources;
  thumbnailUrl: string;
}

export interface IPlayerTeam {
  teamId: string;
  status: JoinTeamStatus;
}
