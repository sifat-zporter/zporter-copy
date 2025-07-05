import { ApiProperty } from '@nestjs/swagger';
import { GenerateContentResult } from '@google/generative-ai';
import { GeneratePromptResponseDto } from '../../prompt-templates/dto/generate-prompt.dto';

export class ZaiResponseDto {
  @ApiProperty({
    description: 'Generated prompt details with metadata',
    type: 'object',
  })
  prompt: GeneratePromptResponseDto;

  @ApiProperty({
    description: 'AI response from Gemini',
    type: 'object',
  })
  response: GenerateContentResult['response'];
}
