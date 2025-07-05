import { IsNumber, IsObject, IsOptional, IsString, IsEmail } from 'class-validator';
import { CreateWallet } from '../interface/wallet.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWalletDto implements CreateWallet {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  paymentMethodId: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  amount: number;
}

export class WithdrawDto {
  @IsNumber()
  sum: number;

  @IsNumber()
  serviceFee: number;

  @IsNumber()
  total: number;

  @IsString()
  bic: string;

  @IsString()
  iban: string;
}

export class TransferDto {
  @IsString()
  accountId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;
}

export class RefundData {
  @IsString()
  paymentId: string;

  @IsNumber()
  @IsOptional()
  amount?: number;
}
