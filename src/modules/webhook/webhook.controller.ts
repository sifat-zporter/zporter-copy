import {
    Controller,
    Post,
    Req,
    Res,
    Headers,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) { }

    @Post()
    async handleStripeWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string,
    ) {
        try {
            const result = await this.webhookService.handleStripeEvent(req.body, signature);
            return res.status(HttpStatus.OK).send(result);
        } catch (err: any) {
            console.error('Webhook Error:', err.message);
            return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
        }
    }
}
