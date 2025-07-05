import { Document } from 'mongoose';

export interface Participant {
  teamId: string;
  name: string;
  logoUrl?: string;
  location: 'home' | 'away';
}

export interface Score {
  home?: number;
  away?: number;
}

export interface Fixture extends Document {
  readonly startTime: Date;
  readonly status: string;
  readonly leagueName?: string;
  readonly roundName?: string;
  readonly venueName?: string;
  readonly participants: Participant[];
  readonly score?: Score;
}