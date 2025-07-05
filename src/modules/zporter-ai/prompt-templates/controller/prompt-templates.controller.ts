import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  GeneratePromptDto,
  GeneratePromptResponseDto,
} from '../dto/generate-prompt.dto';
import {
  PromptTemplatesDto,
  SearchPromptTemplatesDto,
} from '../dto/prompt-templates';
import { UpdatePromptTemplateDto } from '../dto/update-prompt';
import { PromptTemplatesService } from '../services/prompt-templates.service';

@ApiTags('Prompt Templates')
@Controller('prompt-templates')
export class PromptTemplatesController {
  constructor(
    private readonly promptTemplatesService: PromptTemplatesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt template' })
  @ApiResponse({
    status: 201,
    description: 'Prompt template created successfully',
    type: PromptTemplatesDto,
  })
  async createPromptTemplate(
    @Body() promptTemplate: PromptTemplatesDto,
  ): Promise<PromptTemplatesDto> {
    return this.promptTemplatesService.createPromptTemplate(promptTemplate);
  }

  @Get('prompt/:id')
  @ApiOperation({ summary: 'Get prompt template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Prompt template retrieved successfully',
    type: PromptTemplatesDto,
  })
  async getPromptTemplates(
    @Param('id') id: string,
  ): Promise<PromptTemplatesDto> {
    return this.promptTemplatesService.getPromptTemplates(id);
  }

  @Put('prompt/:id')
  @ApiOperation({ summary: 'Update prompt template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Prompt template updated successfully',
    type: PromptTemplatesDto,
  })
  async updatePromptTemplate(
    @Param('id') id: string,
    @Body() promptTemplate: UpdatePromptTemplateDto,
  ): Promise<PromptTemplatesDto> {
    return this.promptTemplatesService.updatePromptTemplate(id, promptTemplate);
  }

  @Delete('prompt/:id')
  @ApiOperation({ summary: 'Delete prompt template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Prompt template deleted successfully',
  })
  async deletePromptTemplate(@Param('id') id: string): Promise<any> {
    return this.promptTemplatesService.deletePromptTemplate(id);
  }

  @Post('prompt/generate')
  @ApiOperation({
    summary: 'Generate a prompt from template with validation',
    description: `
    **Features:**
    1. **Strict Mode** - Default enabled, validates all placeholders automatically
    2. **Fallback Values** - {{userName|Guest}} or {{userName|"Default User"}} syntax
    3. **Nested Keys Support** - {{user.profile.name}} using lodash-style paths
    4. **Localization** - Auto-finds templateId_language (e.g., welcome_en, welcome_vi)
    5. **Metadata Field** - Uses pre-stored placeholders for optimal performance
    6. **Line Removal** - Remove lines containing missing placeholders (optional)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt generated successfully with validation results',
    type: GeneratePromptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Prompt template not found' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed - missing placeholders without fallback (strictMode = true)',
  })
  async generatePrompt(
    @Body() generatePromptDto: GeneratePromptDto,
  ): Promise<GeneratePromptResponseDto> {
    return this.promptTemplatesService.generatePrompt(generatePromptDto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search prompt templates with pagination',
    description: 'Search prompt templates with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Prompt templates searched successfully',
    type: [PromptTemplatesDto],
  })
  async searchPromptTemplates(
    @Query() searchPromptTemplatesDto: SearchPromptTemplatesDto,
  ): Promise<PromptTemplatesDto[]> {
    return this.promptTemplatesService.searchPromptTemplates(
      searchPromptTemplatesDto,
    );
  }
}
