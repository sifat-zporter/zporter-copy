import { Module } from '@nestjs/common';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';
import { SportmonksModule } from '../sportmonks/sportmonks.module';
import { FavouriteTeamsModule } from '../favourite-teams/favourite-teams.module';
import { FollowedMatchesModule } from '../followed-matches/followed-matches.module'; 

@Module({
  imports: [
    SportmonksModule,
    FavouriteTeamsModule,
    FollowedMatchesModule, 
  ],
  controllers: [FixturesController],
  providers: [FixturesService],
})
export class FixturesModule {}