import { PublicApi } from '@hubspot/api-client/lib/codegen/cms/site_search';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TagsV2Service } from './tags.service';
import { SearchTagDto } from '../dto/search-tag.dto';
import { SearchTagResultDto } from '../dto/search-tag-results.dto';
import { CreateTagDto } from '../dto/create-tag.dto';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';

@ApiTags('Tags')
@Controller('tags/v2')
@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
export class TagsV2Controller {
  constructor(private readonly tagsService: TagsV2Service) {}

  @Get()
  async findAll(@Query() searchTagDto: SearchTagDto) {
    return this.tagsService.findAll(searchTagDto);
  }

  @Post()
  async create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.saveTags(createTagDto);
  }
}
