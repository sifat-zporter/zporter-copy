import { 
  Controller, 
  Post,
  Delete,
  Param, 
  Body, 
  Get, 
  UseInterceptors, 
  UploadedFile 
} from '@nestjs/common';
import { SponsorService } from './sponsor.service';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { CreateSponsorDto, SendEmailDto } from './dto/sponsor.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('sponsor')
@Controller('sponsor')
export class SponsorController {
  constructor(private readonly SponsorService: SponsorService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Sponsor: Create new Sponsor',
  })
  @ApiBody({ type: CreateSponsorDto })
  createSponsor(
    @Body() sponsorData: CreateSponsorDto,
  ) {
    return this.SponsorService.createSponsor(sponsorData);
  }

  @Get('charge')
  chargeSponsorMonthly() {
    return this.SponsorService.chargeSponsorMonthly();
  }

  @Post('payments/one-time')
  @ApiOperation({
    summary: "Sponsor: Payment One Time"
  })
  @ApiBody({ type: CreateSponsorDto })
  chargeSponsorOneTime(
    @Body() sponsorData: CreateSponsorDto,
  ) {
    return this.SponsorService.chargeSponsorOneTime(sponsorData);
  }

  @Post('payments/one-time-card')
  @ApiOperation({
    summary: "Sponsor: Payment One Time"
  })
  @ApiBody({ type: CreateSponsorDto })
  chargeSponsorOneTimeWithCard(
    @Body() sponsorData: CreateSponsorDto,
  ) {
    return this.SponsorService.chargeSponsorOneTimeWithCard(sponsorData);
  }

  @Post('payments/paypal')
  @ApiOperation({
    summary: "Sponsor: Payment One Time With Paypal"
  })
  @ApiBody({ type: CreateSponsorDto })
  chargeSponsorWithPayPal(
    @Body() sponsorData: CreateSponsorDto,
  ) {
    return this.SponsorService.chargeSponsorWithPayPal(sponsorData);
  }

  @Post('/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Sponsor: Upload Payment Receipt',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadPaymentReceipt(@UploadedFile() file: any) {
    console.log("Uploaded file:", file.originalname);
    return this.SponsorService.uploadPaymentReceipt(file);
  }

  @Post('/send-email')
  @ApiOperation({
    summary: 'Sponsor: Send Email',
  })
  @ApiBody({
    type: SendEmailDto,
  })
  sponsorSendEmail(@Body() emailData: any) {
    return this.SponsorService.sponsorSendEmail(emailData);
  }

  @Delete('/transaction-id/:id')
  @ApiOperation({
    summary: 'Sponsor: Delete Transaction by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the transaction to be deleted',
    type: String,
  })
  deleteTransaction(@Param('id') id: string) {
    return this.SponsorService.deleteTransaction(id);
  }

  @Delete('/transaction-sessionId/:id')
  @ApiOperation({
    summary: 'Sponsor: Delete Transaction by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the transaction to be deleted',
    type: String,
  })
  deleteTransactionWithSessionId(@Param('id') id: string) {
    return this.SponsorService.deleteTransactionWithSessionId(id);
  }
}
