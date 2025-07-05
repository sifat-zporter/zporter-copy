import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';

@Module({
    controllers: [WebhookController],
    providers: [
        WebhookService,
        WebhookController,
    ],
    exports: [WebhookService],
})
export class WebhookModule { }
