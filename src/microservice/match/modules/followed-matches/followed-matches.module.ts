import { Module } from '@nestjs/common';
import { FollowedMatchesController } from './followed-matches.controller';
import { FollowedMatchesService } from './followed-matches.service';
import { FollowedMatchesRepository } from './followed-matches.repository';

@Module({
  imports: [],
  controllers: [FollowedMatchesController],
  providers: [FollowedMatchesService, FollowedMatchesRepository],
  exports: [FollowedMatchesService],
})
export class FollowedMatchesModule {}