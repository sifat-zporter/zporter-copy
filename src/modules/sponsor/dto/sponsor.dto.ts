import { IsNumber, IsObject, IsOptional, IsString, IsEmail } from 'class-validator';
import { CreateSponsor } from '../interface/sponsor.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSponsorDto implements CreateSponsor {
  @ApiProperty()
  @IsOptional()
  @IsString()
  playerId: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  cost_of_training: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency_cost_of_training: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_type_cost_of_training?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  limit_cost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency_limit_cost: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_type_limit_cost?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  paymentMethodId: string;
}

export class SendEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  playerId: string;

  @IsString()
  userId: string;

  @IsString()
  message: string;

  @IsString()
  uploadImageUrl: string;
}