import { Module } from '@nestjs/common';
import { DateUtil } from '../../utils/date-util';
import { ObjectMapper } from '../../utils/objectMapper';

@Module({
  imports: [],
  controllers: [],
  providers: [DateUtil, ObjectMapper],
  exports: [DateUtil, ObjectMapper],
})
export class AbstractModule {}
