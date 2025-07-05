import { OmitType } from '@nestjs/swagger';
import { PromptTemplatesDto } from './prompt-templates';

export class UpdatePromptTemplateDto extends OmitType(PromptTemplatesDto, [
  'id',
]) {}
