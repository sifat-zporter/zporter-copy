import { MediaType } from "../enum/event.enum";


export interface Media {
  type: MediaType;
  url: string;
}

export interface CommentUserInfo {
  userId: string;
  name: string;
  avatar: string;
}

export interface TeamInvitations {
  teamId: string;
  invitedUsers: string[]; // Array of user IDs
}

export interface OpponentClub {
  clubId: string,
  clubName: string,
  clubLogoUrl: string
}
