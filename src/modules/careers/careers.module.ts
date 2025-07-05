import { forwardRef, Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { ClubModule } from '../clubs/clubs.module';
import { CareersController } from './careers.controller';
import { CareersService } from './careers.service';

@Module({
  imports: [forwardRef(() => ClubModule), forwardRef(() => AchievementsModule)],
  controllers: [CareersController],
  providers: [CareersService],
  exports: [CareersService],
})
export class CareersModule {}
