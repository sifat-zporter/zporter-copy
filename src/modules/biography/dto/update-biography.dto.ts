import { PartialType } from '@nestjs/swagger';
import { CreateBiographyDto } from './create-biography.dto';

export class UpdateBiographyDto extends PartialType(CreateBiographyDto) {}
