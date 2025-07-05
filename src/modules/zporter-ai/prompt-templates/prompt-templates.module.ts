import { Module } from '@nestjs/common';
import { PromptTemplatesController } from './controller/prompt-templates.controller';
import { PromptTemplatesRepository } from './repository/prompt-templates.repository';
import { PromptTemplatesService } from './services/prompt-templates.service';

@Module({
  controllers: [PromptTemplatesController],
  providers: [PromptTemplatesService, PromptTemplatesRepository],
  exports: [PromptTemplatesService, PromptTemplatesRepository],
})
export class PromptTemplatesModule {}
