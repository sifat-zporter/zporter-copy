import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TestsGroupService } from './tests-group.service';
import { TestsGroup } from './entities/tests-group.entity';
import { Member } from './types';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';

@ApiTags('Group tests')
@Controller('tests-group')
export class TestsGroupController {
  constructor(
    @Inject(TestsGroupService)
    private readonly testsGroupService: TestsGroupService,
  ) {}

  @Get('tests-categories')
  async getTestsCategories() {
    return await this.testsGroupService.getTestsCategories();
  }

  @Post('create')
  @ApiOperation({
    summary: `Create a new tests group`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.TestsGroup.CREATED,
  })
  @UseGuards(LocalAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createTestsGroup(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() testsGroup: TestsGroup,
  ) {
    return await this.testsGroupService.createTestsGroup(
      testsGroup,
      userRoleId,
    );
  }

  @Get('find/:id')
  @ApiOperation({
    summary: `Find a tests group by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.TestsGroup.FOUND,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: ResponseMessage.TestsGroup.NOT_FOUND,
  })
  async findTestsGroup(@Param('id') id: string) {
    return await this.testsGroupService.findTestsGroupById(id);
  }

  @Get('search')
  @UseGuards(LocalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: `Get tests groups with pagination`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.TestsGroup.FOUND,
  })
  async getTestsGroupsWithPagination(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('createdBy') createdBy: string,
    @Query('teamId') teamId?: string,
  ) {
    return await this.testsGroupService.getTestsGroupsWithPagination(
      page,
      limit,
      createdBy,
      teamId,
      userRoleId,
    );
  }

  @Delete('delete/:id')
  @UseGuards(LocalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: `Delete a tests group by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.TestsGroup.DELETED,
  })
  async deleteTestsGroup(
    @AuthorizationAndGetUserId() _userRoleId: string,
    @Param('id') id: string,
  ) {
    return await this.testsGroupService.deleteTestsGroup(id);
  }

  @Patch('update/:id')
  @UseGuards(LocalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: `Update a tests group by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.TestsGroup.UPDATED,
  })
  async updateTestsGroupColumns(
    @AuthorizationAndGetUserId() _userRoleId: string,
    @Param('id') id: string,
    @Body()
    updateData: { members?: Member[]; tests?: any[] },
  ) {
    return await this.testsGroupService.updateTestsGroupColumns(id, updateData);
  }
}
