import { Module } from '@nestjs/common';
import { FavouriteTeamsController } from './favourite-teams.controller';
import { FavouriteTeamsService } from './favourite-teams.service';
import { FavouriteTeamsRepository } from './favourite-teams.repository';

@Module({
  imports: [],
  controllers: [FavouriteTeamsController],
  providers: [FavouriteTeamsService, FavouriteTeamsRepository],
  exports: [FavouriteTeamsService],
})
export class FavouriteTeamsModule {}