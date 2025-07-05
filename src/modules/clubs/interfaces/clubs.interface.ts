export interface IClubInfo {
  clubId?: string;
  clubName: string;
  logoUrl?: string;
  nickName?: string;
  city?: string;
  country?: string;
  arena?: string;
  websiteUrl?: string;
}

export interface Clubs {
  clubName: string;
  logoUrl: string;
  nickName?: string;
  city: string;
  country: string;
  arena: string;
  websiteUrl: string;
}

export interface ClubsForMongo {
  arena: string;
  city: string;
  clubName: string;
  country: string;
  createdAt: number;
  createdBy: string;
  ipAddress: string;
  isApproved: boolean;
  isVerified: boolean;
  logoUrl: string;
  nickName?: string;
  updatedAt: number;
  websiteUrl: string;
  clubId: string;
}

export interface IUserClub {
  clubName: string;
  logoUrl: string;
}

export interface IMatchClub {
  clubName: string;
  logoUrl: string;
}
