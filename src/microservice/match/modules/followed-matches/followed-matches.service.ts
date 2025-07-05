import { Injectable } from '@nestjs/common';
import { FollowedMatchesRepository } from './followed-matches.repository';

@Injectable()
export class FollowedMatchesService {
    constructor(private readonly followedMatchesRepository: FollowedMatchesRepository) {}

    async addFollow(userId: string, matchId: number) {
        return this.followedMatchesRepository.create(userId, matchId);
    }

    async removeFollow(userId: string, matchId: number) {
        return this.followedMatchesRepository.delete(userId, matchId);
    }

    async getFollowedMatchIds(userId: string): Promise<number[]> {
        if (!userId) {
            return [];
        }
        const follows = await this.followedMatchesRepository.findByUserId(userId);
        return follows.map(follow => follow.matchId);
    }
}