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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { AbstractController } from '../../abstract/abstract.controller';
import { CommonResponse } from '../../abstract/dto/common-response';
import { ReferenceRequest } from '../dtos/reference/reference.request';
import { TestResponse } from '../dtos/test/test.response';
import { TestsDto } from '../dtos/test/tests.dto';
import { TestType } from '../enums/test-type';
import { TestService } from '../service/test/test.service';
import { ITestService } from '../service/test/test.service.interface';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Test')
@Controller('tests')
export class TestsController extends AbstractController<ITestService> {
  constructor(
    @Inject(TestService)
    private readonly testsService: ITestService,
  ) {
    super(testsService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new test`,
  })
  @ApiBody({ type: TestsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Test.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post('/')
  async createTest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() testsDto: TestsDto,
  ) {
    await this.service.createTests(testsDto.subtypeId, testsDto, userRoleId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a duplicated test`,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Test.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post(':subtypeId/:testId')
  async createDupliacatedTest(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('subtypeId') subtypId: string,
    @Param('testId') testId: string,
  ) {
    await this.service.duplicateTest(subtypId, testId, userRoleId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  @ApiHeaders([])
  @Get('get-test-by-id/:subtypeId/:testId')
  @ApiOperation({
    summary: `Get test by id`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getTestById(
    @Param('testId') testId: string,
    @Param('subtypeId') subtypeId: string,
  ): Promise<CommonResponse<TestResponse>> {
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getTestById(subtypeId, testId),
    });
  }

  @Patch(':testId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update tests`,
  })
  @ApiBody({ type: TestsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateTests(
    @Param('testId') testId: string,
    @Body() updateTestsDto: TestsDto,
  ) {
    await this.service.updateTest(
      updateTestsDto.subtypeId,
      testId,
      updateTestsDto,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Post('/reference')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create reference tests`,
  })
  @ApiBody({ type: ReferenceRequest })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async createReferences(@Body() referenceRequest: ReferenceRequest) {
    await this.service.createReference(
      referenceRequest.subtypeId,
      referenceRequest.testIds,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Delete('/reference')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete reference tests`,
  })
  @ApiBody({ type: ReferenceRequest })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteReferences(@Body() referenceRequest: ReferenceRequest) {
    await this.service.deleteReference(
      referenceRequest.subtypeId,
      referenceRequest.testIds,
    );
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Delete('/:subtypeId/:testId')
  @ApiOperation({
    summary: `Delete test`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async deleteTest(
    @Param('subtypeId') subtypeId: string,
    @Param('testId') testId: string,
  ) {
    await this.service.deleteTest(subtypeId, testId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('list-test-name/:tab')
  @ApiOperation({
    summary: `Get name of test`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getNameOfTestByExcel(@Param('tab') tab: TestType) {
    let result: string[] = [];
    if ((<any>Object).values(TestType).includes(tab)) {
      result = await this.service.getListTestNameFromExcel(tab);
    }
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: result,
    });
  }
}
