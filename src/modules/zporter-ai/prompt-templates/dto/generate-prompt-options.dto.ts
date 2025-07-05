import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GeneratePromptOptionsDto {
  @ApiProperty({
    description:
      'Enable strict mode - throw error if any placeholder is missing and has no fallback',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  strictMode?: boolean = true;

  @ApiProperty({
    description: 'Language code for localization (e.g., "en", "vi", "fr")',
    example: 'en',
    default: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string = 'en';

  @ApiProperty({
    description:
      'Remove entire lines containing placeholders that have no value and no fallback',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  removeLinesWithMissingPlaceholders?: boolean = false;
}

/**
 * Optimized PlaceholderInfo interface
 * Removed hasValue, hasFallback fields - can be derived from other fields
 */
export interface PlaceholderInfo {
  name: string;
  value?: any;
  fallbackUsed: boolean;
  lineRemoved: boolean;
}
