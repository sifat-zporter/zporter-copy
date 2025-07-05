import { PartialType } from '@nestjs/swagger';
import {
  PlayerCreateAwardDto,
  CreateTrophyDto,
  CoachCreateAwardDto,
} from './create-achievement.dto';

export class UpdateTrophyDto extends PartialType(CreateTrophyDto) {}

export class PlayerUpdateAwardDto extends PartialType(PlayerCreateAwardDto) {}
export class CoachUpdateAwardDto extends PartialType(CoachCreateAwardDto) {}
