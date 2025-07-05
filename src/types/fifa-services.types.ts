/* eslint-disable prettier/prettier */
export type Flag = {
    src: string;
    width: number;
    height: number;
    title: string;
    alt: string;
};

export type RankingItem = {
    idTeam: string;
    rank: number;
    flag: Flag;
    name: string;
    totalPoints: number;
    active: boolean;
    previousRank: number;
    countryURL: string;
    countryCode: string;
};

export type Tag = {
    id: string;
    text: string;
};

export type Rankings = {
    rankingItem: RankingItem;
    previousPoints: number;
    lastUpdateDate: string;
    nextUpdateDate: string | null;
    tag: Tag;
};

export type ResponseFifaCountries = {
    rankings: Rankings[];
};
