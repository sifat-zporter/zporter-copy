import { Injectable } from '@nestjs/common';
import {
  getLeaguesByCountry,
  getLeaguesById,
  getTeamsBySeason,
} from './sportmonks';
import * as moment from 'moment';

// Maximum number of years to retrieve the latest tournament information
const MAX_RECENT_YEAR = 1;

@Injectable()
export class ProfileProviderService {
  async getProviders() {
    return [
      {
        id: 'sportmonks',
        name: 'Sportmonks',
      },
    ];
  }

  async getCountries(providerId: string) {
    switch (providerId) {
      case 'sportmonks':
        return [
          {
            id: 320,
            name: 'Denmark',
            alpha2Code: 'DK',
            alpha3Code: 'DNK',
            region: 'Europe',
            flag: 'https://cdn.sportmonks.com/images/countries/png/short/dk.png',
          },
          {
            id: 1161,
            name: 'Scotland',
            alpha2Code: 'GB',
            alpha3Code: 'SCO',
            region: 'Europe',
            flag: 'https://cdn.sportmonks.com/images/countries/png/short/scotland.png',
          },
        ];
      default:
        throw new Error('Provider not found');
    }
  }

  async getLeaguesByCountry(providerId: string, countryId: string) {
    switch (providerId) {
      case 'sportmonks':
        return getLeaguesByCountry(countryId);
      default:
        throw new Error('Provider not found');
    }
  }

  async getPlayers(providerId: string, leagueId: string) {
    switch (providerId) {
      case 'sportmonks':
        const leagues = await getLeaguesById(leagueId);

        // lấy ra các season của các league
        const seasons = leagues.seasons;

        // sắp xếp lại theo id giảm dần
        seasons.sort((a, b) => b.id - a.id);

        // lọc ra các season có start_date >= now - MAX_RECENT_YEAR, sử dụng moment.js
        const recentSeasons = seasons.filter((season: any) => {
          return moment(season.starting_at).isAfter(
            moment().subtract(MAX_RECENT_YEAR, 'years'),
          );
        });

        // sửa dụng promise.all để lấy ra các players của các season
        const teams: any[] = await Promise.all(
          recentSeasons.map((season: any) => getTeamsBySeason(season.id)),
        );

        // lấy ra các players của các team
        const players = teams.flat().reduce((acc, team) => {
          return [
            ...acc,
            ...(team.players?.map((player: any) => {
              return {
                ...player.player,
                team: player.team,
              };
            }) || []),
          ];
        }, []);

        return players;
      default:
        throw new Error('Provider not found');
    }
  }
}
