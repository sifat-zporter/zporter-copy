import { Inject } from '@nestjs/common';
import { DateUtil } from '../../utils/date-util';
import { ObjectMapper } from '../../utils/objectMapper';

export abstract class AbstractService<r> {
  @Inject(ObjectMapper)
  protected objectMapper: ObjectMapper;

  @Inject(DateUtil)
  protected dateUtil: DateUtil;

  constructor(
    @Inject()
    protected readonly repository: r,
  ) {}
}
