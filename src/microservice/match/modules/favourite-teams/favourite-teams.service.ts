import { Injectable } from '@nestjs/common';
import { FavouriteTeamsRepository } from './favourite-teams.repository';

@Injectable()
export class FavouriteTeamsService {
    constructor(private readonly favouriteTeamsRepository: FavouriteTeamsRepository) {}

    async addFavourite(userId: string, teamId: number) {
        return this.favouriteTeamsRepository.create(userId, teamId);
    }

    async removeFavourite(userId: string, teamId: number) {
        return this.favouriteTeamsRepository.delete(userId, teamId);
    }

    
    async getFavouriteTeamIds(userId: string): Promise<number[]> {
        if (!userId) {
            return [];
        }
        const favourites = await this.favouriteTeamsRepository.findByUserId(userId);
        return favourites.map(fav => fav.teamId);
    }
}