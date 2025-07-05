export class TeamDto {
  id: string;
  name: string;
  logoUrl?: string;
  country?: string;
  type: 'professional' | 'youth';
}