import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SportmonksService } from './sportmonks.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [SportmonksService],
  exports: [SportmonksService],
})
export class SportmonksModule {}