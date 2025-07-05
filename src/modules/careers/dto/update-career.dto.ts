import { PartialType } from '@nestjs/swagger';
import {
  CreateFutureCareerDto,
  CreateHistoricCareerDto,
} from './create-career.dto';

export class UpdateHistoricCareerDto extends PartialType(
  CreateHistoricCareerDto,
) {}

export class UpdateFutureCareerDto extends PartialType(CreateFutureCareerDto) {}
