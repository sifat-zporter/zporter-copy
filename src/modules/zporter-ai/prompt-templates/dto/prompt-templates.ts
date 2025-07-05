import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PromptTemplatesDto {
  @ApiProperty({
    description: 'The ID of the prompt template',
    example: 'prompt_chat_support',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'The name of the prompt template',
    example: 'Welcome Message',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The template with placeholders content',
    example: 'Hello {{name}}! Welcome to our platform.',
  })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiProperty({
    description: 'The description of the prompt template',
    example: 'This is a welcome message for our platform.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'Pre-stored placeholders to avoid runtime parsing for better performance',
    example: ['userName', 'appName', 'supportEmail'],
  })
  @IsArray()
  @IsOptional()
  placeholders?: string[];

  @ApiProperty({
    description: 'Language code for this template (e.g., "en", "vi", "fr")',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    description: 'The created at timestamp',
    example: 1714732800,
  })
  createdAt?: number;

  @ApiProperty({
    description: 'The updated at timestamp',
    example: 1714732800,
  })
  @IsNumber()
  @IsOptional()
  updatedAt?: number;

  @ApiProperty({
    description: 'The model of the prompt template',
    example: 'gpt-4o',
  })
  @IsString()
  @IsOptional()
  model?: string = 'gemini-2.5-flash';
}

export class SearchPromptTemplatesDto {
  @ApiProperty({
    description: 'Global search across all fields',
    example: 'welcome',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'The ID of the prompt template',
    example: 'prompt_chat_support',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'The name of the prompt template',
    example: 'Welcome Message',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The description of the prompt template',
    example: 'This is a welcome message for our platform.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Search in template content',
    example: 'Hello {{name}}',
    required: false,
  })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiProperty({ default: 10 })
  @Type(() => Number)
  @Min(1, { message: 'The number of page size must be greater than 0' })
  limit: number;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @Min(1, { message: 'The page must be greater than 0' })
  startAfter: number;
}
