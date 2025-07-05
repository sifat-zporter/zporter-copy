import { Module } from '@nestjs/common';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { ZaiRequestController } from './controller/zai.request.controller';
import { ZaiRequestService } from './services/zai.request.service';

@Module({
  imports: [PromptTemplatesModule],
  controllers: [ZaiRequestController],
  providers: [ZaiRequestService],
  exports: [ZaiRequestService],
})
export class ZaiRequestModule {}
