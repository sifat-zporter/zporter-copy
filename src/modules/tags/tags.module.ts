import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagsSchema, TAG_MODEL } from './schemas/tags.schemas';
import { TagsController } from './v1/tags.controller';
import { TagsV2Controller } from './v2/tags.controller';
import { TagsService } from './v1/tags.service';
import { TagsV2Service } from './v2/tags.service';
import { TagsRepository } from './tags.repository';
import { DateUtil } from '../../utils/date-util';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TAG_MODEL,
        schema: TagsSchema,
      },
    ]),
  ],
  controllers: [TagsV2Controller, TagsController],
  providers: [TagsService, TagsV2Service, TagsRepository, DateUtil],
  exports: [TagsService],
})
export class TagsModule {}
