import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeneratePromptDto } from '../../prompt-templates/dto/generate-prompt.dto';
import { ZaiResponseDto } from '../dto/zai.response';
import { ZaiRequestService } from '../services/zai.request.service';

@ApiTags('Zai Base Controller')
@Controller('zai')
export class ZaiRequestController {
  constructor(private readonly zaiRequestService: ZaiRequestService) {}

  @Post()
  async requestZai(
    @Body() zaiRequestDto: GeneratePromptDto,
  ): Promise<ZaiResponseDto> {
    return this.zaiRequestService.requestZai(zaiRequestDto);
  }
}
