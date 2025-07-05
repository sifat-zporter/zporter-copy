import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  GeneratePromptOptionsDto,
  PlaceholderInfo,
} from './generate-prompt-options.dto';

export class GeneratePromptDto {
  @ApiProperty({
    description: 'The ID of the prompt template to use',
    example: 'prompt_chat_support',
  })
  @IsString()
  @IsNotEmpty()
  promptId: string;

  @ApiProperty({
    description: 'Context data to fill placeholders in the template',
    example: {
      userName: 'John Doe',
      appName: 'Zporter',
    },
  })
  @IsObject()
  @IsNotEmpty()
  context: Record<string, any>;

  @ApiProperty({
    description: 'Advanced options for prompt generation',
    type: GeneratePromptOptionsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => GeneratePromptOptionsDto)
  @IsOptional()
  options?: GeneratePromptOptionsDto;
}

export class GeneratePromptResponseDto {
  @ApiProperty({
    description: 'The model used to generate the prompt',
    example: 'gemini-2.5-flash',
  })
  model: string;

  @ApiProperty({
    description: 'The generated prompt with filled placeholders',
    example: 'Hello John Doe! Welcome to Zporter.',
  })
  prompt: string;

  @ApiProperty({
    description: 'The original template that was used',
    example: 'Hello {{userName}}! Welcome to {{appName}}.',
  })
  rawTemplate: string;

  @ApiProperty({
    description: 'List of placeholders that were found in the template',
    example: ['userName', 'appName'],
  })
  placeholders: string[];

  @ApiProperty({
    description: 'Detailed information about each placeholder processing',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'userName' },
        found: { type: 'boolean', example: true },
        value: { type: 'string', example: 'John Doe' },
        fallbackUsed: { type: 'boolean', example: false },
        fallbackValue: { type: 'string', example: 'Guest' },
        lineRemoved: { type: 'boolean', example: false },
      },
    },
  })
  placeholderDetails: PlaceholderInfo[];

  @ApiProperty({
    description:
      'List of placeholders that could not be filled (excluding removed lines)',
    example: ['lastLoginDate'],
  })
  missingPlaceholders: string[];

  @ApiProperty({
    description:
      'List of placeholders whose lines were removed due to missing values',
    example: ['optionalField'],
  })
  removedPlaceholders: string[];

  @ApiProperty({
    description:
      'Number of lines that were removed due to missing placeholders',
    example: 2,
  })
  linesRemoved: number;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 25,
  })
  processingTime: number;
}
