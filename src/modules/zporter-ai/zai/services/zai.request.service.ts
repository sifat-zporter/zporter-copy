import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GeneratePromptDto } from '../../prompt-templates/dto/generate-prompt.dto';
import { PromptTemplatesService } from '../../prompt-templates/services/prompt-templates.service';
import { ZaiResponseDto } from '../dto/zai.response';

const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

@Injectable()
export class ZaiRequestService {
  private readonly logger = new Logger(ZaiRequestService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelCache = new Map<string, GenerativeModel>();

  constructor(private readonly promptTemplatesService: PromptTemplatesService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        'Missing Gemini API key. Please check configuration.',
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger.log('ZaiRequestService initialized successfully');
  }

  /**
   * Get or create cached model instance
   */
  private getModel(modelName: string): GenerativeModel {
    if (!this.modelCache.has(modelName)) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
      });
      this.modelCache.set(modelName, model);
      this.logger.debug(`Cached new model instance: ${modelName}`);
    }
    return this.modelCache.get(modelName) as GenerativeModel;
  }

  /**
   * Optimized requestZai with caching
   */
  async requestZai(zaiRequestDto: GeneratePromptDto): Promise<ZaiResponseDto> {
    try {
      const generatedPrompt = await this.promptTemplatesService.generatePrompt(
        zaiRequestDto,
      );

      if (!generatedPrompt?.prompt) {
        throw new BadRequestException('Failed to generate prompt');
      }

      const model = this.getModel(generatedPrompt.model);

      const result = await model.generateContent({
        generationConfig,
        contents: [{ role: 'user', parts: [{ text: generatedPrompt.prompt }] }],
      });

      const text = await result.response.text();
      if (!text) {
        throw new BadRequestException('Empty response from Gemini');
      }

      return {
        prompt: generatedPrompt,
        response: result.response,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to generate AI response: ${error.message}`);
      throw new BadRequestException('Failed to generate AI response');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedModels: Array.from(this.modelCache.keys()),
      cacheSize: this.modelCache.size,
    };
  }

  /**
   * Clear model cache
   */
  clearCache() {
    this.modelCache.clear();
    this.logger.log('Model cache cleared');
  }
}
