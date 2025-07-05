import { ConnectedClubType } from '../enum/connected-club.enum';

export interface IConnectedClub {
  connectedClubType: ConnectedClubType;
  careerId?: string;
  clubId: string;
}
