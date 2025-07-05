import { Injectable, Logger, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SportmonksService {
  private readonly logger = new Logger(SportmonksService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.sportmonks.com/v3/football';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('SPORTMONKS_API_KEY');
    if (!this.apiKey) {
      throw new Error('SPORTMONKS_API_KEY is not defined in the environment variables.');
    }
  }

  async fetchFixturesByDate(date: string): Promise<any> {
    const includeRelations = 'participants;league;venue;state;round;scores';
    const url = `${this.baseUrl}/fixtures/date/${date}?api_token=${this.apiKey}&include=${includeRelations}`;

    try {
      this.logger.log(`Fetching fixtures from Sportmonks for date: ${date}`);
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch fixtures for date: ${date}`, error.response?.data || error.message);
      throw new Error('Could not retrieve data from Sportmonks API.');
    }
  }
}