import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  Get,
  UseGuards,
  Req,
  HttpStatus,
  Query,
  HttpException
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBody, ApiOperation, ApiTags, ApiParam, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CreateWalletDto, RefundData, TransferDto, WithdrawDto } from './dto/wallet.dto';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { StripeService } from '../stripe/stripe.service';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly WalletService: WalletService,
    private readonly stripeService: StripeService,
  ) { }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('transfer')
  @ApiOperation({
    summary: "Wallet: Payment One Time"
  })
  @ApiBody({ type: TransferDto })
  transfer(
    @Body() transferDto: TransferDto,
  ) {
    return this.WalletService.transfer(transferDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('payments/one-time')
  @ApiOperation({
    summary: "Wallet: Payment One Time"
  })
  @ApiBody({ type: CreateWalletDto })
  chargeSponsorOneTime(
    @Body() sponsorData: CreateWalletDto,
  ) {
    return this.WalletService.chargeSponsorOneTime(sponsorData);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('payments/one-time-card')
  @ApiOperation({
    summary: "Sponsor: Payment One Time"
  })
  @ApiBody({ type: CreateWalletDto })
  chargeSponsorOneTimeWithCard(
    @Body() sponsorData: CreateWalletDto,
  ) {
    return this.WalletService.chargeSponsorOneTimeWithCard(sponsorData);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('payments/paypal')
  @ApiOperation({
    summary: "Wallet: Payment One Time With Paypal"
  })
  @ApiBody({ type: CreateWalletDto })
  chargeSponsorWithPayPal(
    @Body() sponsorData: CreateWalletDto,
  ) {
    return this.WalletService.chargeSponsorWithPayPal(sponsorData);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('refund')
  @ApiOperation({
    summary: "Wallet: Refund Payment"
  })
  @ApiBody({ type: RefundData })
  refund(
    @Body() refundData: RefundData,
  ) {
    const amountInCents = refundData.amount ? Math.round(refundData.amount * 100) : undefined;
    return this.stripeService.refundPayment(refundData.paymentId, amountInCents);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete('/transaction-id/:id')
  @ApiOperation({
    summary: 'Wallet: Delete Transaction by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the transaction to be deleted',
    type: String,
  })
  deleteTransaction(@Param('id') id: string) {
    return this.WalletService.deleteTransaction(id);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete('/transaction-sessionId/:id')
  @ApiOperation({
    summary: 'Wallet: Delete Transaction by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the transaction to be deleted',
    type: String,
  })
  deleteTransactionWithSessionId(@Param('id') id: string) {
    return this.WalletService.deleteTransactionWithSessionId(id);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('/transactions')
  @ApiOperation({
    summary: 'Wallet: Get All Transactions',
  })
  getAllTransactions(@Req() req: any) {
    return this.WalletService.getAllTransactions(req.user.roleId);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('/transactions/:id')
  @ApiOperation({
    summary: 'Wallet: Get All Transactions',
  })
  getTransaction(@Param('id') id: string) {
    return this.WalletService.getTransaction(id);
  }


  @Get('user-balance')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get user wallet from uid token`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getUserBalance(@Req() req): Promise<any> {
    return this.WalletService.getUserBalance(req.user.roleId);
  }

  @Get('accounts')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get user wallet from uid token`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getAllConnectedAccounts(@Query('limit') limit: string): Promise<any> {
    return this.WalletService.getAllConnectedAccounts(limit);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post('account/create')
  @ApiOperation({
    summary: "Wallet: Payment One Time"
  })
  @ApiBody({ type: WithdrawDto })
  createAccount(
    @Req() req: any,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.WalletService.createAccount(withdrawDto, req.user.email, req.user.roleId);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('account/get-account-id')
  @ApiOperation({
    summary: "Wallet: Payment One Time"
  })
  @ApiBody({ type: WithdrawDto })
  async getAccountId(
    @Req() req: any,
  ) {
    return this.WalletService.getAccountId(req.user.roleId);
  }

  @Delete('account/:id')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get user wallet from uid token`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteAccount(@Param('id') accountId: string) {
    try {
      const result = await this.WalletService.deleteConnectedAccount(accountId);
      return { success: true, result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('save-paymentIntentId/:id')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get user wallet from uid token`,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.User.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.User.GET_SUCCESS,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async savePaymentIntentIdWithSessionId(@Param('id') accountId: string) {
    try {
      return await this.WalletService.savePaymentIntentIdWithSessionId(accountId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
