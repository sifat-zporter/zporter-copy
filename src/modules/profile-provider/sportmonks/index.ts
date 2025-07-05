import axios from 'axios';

const SPORTMONKS_API_ENDPOINTS = {
  GET_SEASON: '/football/seasons',
  GET_LIST_PLAYER: '/football/players',
  GET_LEAGUE_BY_COUNTRY: '/football/leagues/countries/{ID}',
  GET_LEAGUE_BY_ID: '/football/leagues/{ID}',
  GET_TEAM: '/football/teams/seasons/{SEASON_ID}',
};

export const axiosInstance = axios.create({
  baseURL: 'https://api.sportmonks.com/v3',
  headers: {
    'Content-type': 'application/json',
    Accept: 'application/json',
    Authorization: process.env.SPORTMONKS_API_KEY,
  },
});

export const getLeaguesByCountry = async (countryId: string) => {
  const response = await axiosInstance.get(
    SPORTMONKS_API_ENDPOINTS.GET_LEAGUE_BY_COUNTRY.replace('{ID}', countryId),
  );
  return response.data.data;
};

export const getLeaguesById = async (leagueId: string) => {
  const response = await axiosInstance.get(
    SPORTMONKS_API_ENDPOINTS.GET_LEAGUE_BY_ID.replace('{ID}', leagueId),
    {
      params: {
        include: 'seasons',
      },
    },
  );
  return response.data.data;
};

export const getTeamsBySeason = async (seasonId: string) => {
  const response = await axiosInstance.get(
    SPORTMONKS_API_ENDPOINTS.GET_TEAM.replace('{SEASON_ID}', seasonId),
    {
      params: {
        include: 'players;players.player;players.team;players.team.country',
      },
    },
  );
  return response.data.data;
};
