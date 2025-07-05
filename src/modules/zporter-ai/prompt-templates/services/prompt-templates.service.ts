import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  GeneratePromptDto,
  GeneratePromptResponseDto,
} from '../dto/generate-prompt.dto';
import {
  PromptTemplatesDto,
  SearchPromptTemplatesDto,
} from '../dto/prompt-templates';
import { UpdatePromptTemplateDto } from '../dto/update-prompt';
import {
  extractPlaceholders,
  fillPlaceholders,
  getValidationSummary,
  validateRequiredPlaceholders,
} from '../helper/gen-prompt';
import { PromptTemplatesRepository } from '../repository/prompt-templates.repository';

@Injectable()
export class PromptTemplatesService {
  private readonly logger = new Logger(PromptTemplatesService.name);

  constructor(
    private readonly promptTemplatesRepository: PromptTemplatesRepository,
  ) {}

  async createPromptTemplate(
    promptTemplate: PromptTemplatesDto,
  ): Promise<PromptTemplatesDto> {
    // Auto-extract placeholders if not provided
    if (!promptTemplate.placeholders && promptTemplate.template) {
      promptTemplate.placeholders = extractPlaceholders(
        promptTemplate.template,
      );
    }
    return this.promptTemplatesRepository.create(promptTemplate);
  }

  async getPromptTemplates(id: string): Promise<PromptTemplatesDto> {
    return this.promptTemplatesRepository.getPromptTemplates(id);
  }

  /**
   * Get localized template based on language preference
   */
  async getLocalizedTemplate(
    baseId: string,
    language?: string,
  ): Promise<PromptTemplatesDto> {
    if (!language) {
      return this.getPromptTemplates(baseId);
    }

    try {
      // Try to get localized version first
      const localizedId = `${baseId}_${language}`;
      return await this.getPromptTemplates(localizedId);
    } catch (error) {
      this.logger.warn(
        `Localized template ${baseId}_${language} not found, falling back to base template`,
      );
      // Fallback to base template
      return this.getPromptTemplates(baseId);
    }
  }

  async updatePromptTemplate(
    id: string,
    promptTemplate: UpdatePromptTemplateDto,
  ): Promise<PromptTemplatesDto> {
    // Auto-update placeholders if template changed
    if (promptTemplate.template && !promptTemplate.placeholders) {
      promptTemplate.placeholders = extractPlaceholders(
        promptTemplate.template,
      );
    }
    return this.promptTemplatesRepository.update(id, promptTemplate);
  }

  async deletePromptTemplate(id: string): Promise<any> {
    return this.promptTemplatesRepository.delete(id);
  }

  async searchPromptTemplates(
    searchPromptTemplatesDto: SearchPromptTemplatesDto,
  ): Promise<PromptTemplatesDto[]> {
    return this.promptTemplatesRepository.search(searchPromptTemplatesDto);
  }

  /**
   * Optimized Generate Prompt with reduced overhead
   *
   * Features:
   * 1. Single-pass placeholder processing
   * 2. Smart strict mode validation
   * 3. Optimized line removal
   * 4. Reduced logging overhead
   */
  async generatePrompt(
    generatePromptDto: GeneratePromptDto,
  ): Promise<GeneratePromptResponseDto> {
    const startTime = Date.now();
    const { promptId: id, context, options } = generatePromptDto;

    try {
      // Step 1: Get localized template
      const promptTemplate = await this.getLocalizedTemplate(
        id,
        options?.language ?? 'en',
      );

      if (!promptTemplate.template) {
        throw new NotFoundException(
          'Template content not found in prompt template',
        );
      }

      // Step 2: Get placeholders (use metadata if available for performance)
      let placeholders: string[];
      if (promptTemplate.placeholders?.length > 0) {
        placeholders = promptTemplate.placeholders;
      } else {
        placeholders = extractPlaceholders(promptTemplate.template);
      }

      // Step 3: Fill placeholders (optimized single pass)
      const {
        filledTemplate,
        placeholderDetails,
        removedPlaceholders,
        linesRemoved,
      } = fillPlaceholders(promptTemplate.template, context, options);

      // Step 4: Validate if strict mode enabled
      const strictMode = options?.strictMode ?? true;
      validateRequiredPlaceholders(placeholderDetails, strictMode);

      // Step 5: Get validation summary (minimal processing)
      const validationSummary = getValidationSummary(placeholderDetails);

      // Minimal logging for monitoring
      if (linesRemoved > 0) {
        this.logger.log(`Template ${id}: Removed ${linesRemoved} lines`);
      }

      const processingTime = Date.now() - startTime;

      return {
        model: promptTemplate.model,
        prompt: filledTemplate,
        rawTemplate: promptTemplate.template,
        placeholders,
        placeholderDetails,
        missingPlaceholders: validationSummary.missingNames,
        removedPlaceholders,
        linesRemoved,
        processingTime,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to generate prompt: ${error.message}`);
    }
  }
}
