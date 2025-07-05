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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { SecureCodeApiGuard } from '../../../auth/guards/secure-code-api.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { CreateTagDto, CreateTagMongoDto } from '../dto/create-tag.dto';
import { SearchTagResultDto } from '../dto/search-tag-results.dto';
import { SearchTagDto } from '../dto/search-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Post()
  @ApiOperation({
    summary: `Create and save tags`,
  })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: ResponseMessage.Tag.CANNOT_CREATED,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Tag.CREATED_TAGS,
  })
  async create(@Body() createTagDto: CreateTagDto): Promise<string> {
    return this.tagsService.saveTags(createTagDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get()
  @ApiOperation({
    summary: `Query tags by full text search`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service unavailable',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Tag.GET_SUCCESS,
  })
  async findAll(
    @Query() searchTagDto: SearchTagDto,
  ): Promise<SearchTagResultDto> {
    return this.tagsService.findAll(searchTagDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('/v2')
  @ApiOperation({
    summary: `Query tags by full text search ver 2`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service unavailable',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Tag.GET_SUCCESS,
  })
  async findAllV2(@Query() searchTagDto: SearchTagDto) {
    return this.tagsService.findAllV2(searchTagDto);
  }

  @Post('/sync-tags-to-mongo')
  @UseGuards(SecureCodeApiGuard)
  syncTagsToMongo(@Body() createTagMongoDto: CreateTagMongoDto) {
    return this.tagsService.syncTagsToMongo(createTagMongoDto);
  }
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.tagsService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
  //   return this.tagsService.update(+id, updateTagDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.tagsService.remove(+id);
  // }
}
