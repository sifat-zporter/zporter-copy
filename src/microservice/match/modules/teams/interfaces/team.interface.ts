import { Document } from 'mongoose';

export interface Team extends Document {
  readonly name: string;
  readonly source: 'zporter' | 'sportmonks';
  readonly sportmonksId?: number;
  readonly type: 'professional' | 'youth';
  readonly logoUrl?: string;
  readonly country?: string;
}