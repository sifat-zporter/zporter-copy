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
import { GetSubtypeDto } from '../dtos/subtype/get-subtype.dto';
import { SubtypeRequest } from '../dtos/subtype/subtype.request';
import { SubtypeService } from '../service/subtype/subtype.service';
import { ISubtypeService } from '../service/subtype/subtype.service.interface';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Test-subtype')
@Controller('subtypes')
export class SubtypeController extends AbstractController<ISubtypeService> {
  constructor(
    @Inject(SubtypeService)
    private subtypeService: ISubtypeService,
  ) {
    super(subtypeService);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create subtype`,
  })
  @ApiBody({ type: SubtypeRequest })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Test.CREATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post()
  async createSubType(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() subtypeDto: SubtypeRequest,
  ) {
    await this.service.createSubtype(subtypeDto, userRoleId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get()
  @ApiOperation({
    summary: `Get list subtype of tests`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  async getSubType(@Query() getSubtypeDto: GetSubtypeDto) {
    const { startAfter: page, limit: pageSize } = getSubtypeDto;

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getSubtypeByTestType(
        getSubtypeDto.typeOfTest,
        +page,
        +pageSize,
      ),
    });
  }

  @Patch(':subtypeId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Update subtype`,
  })
  @ApiBody({ type: SubtypeRequest })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.UPDATED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async updateSubtypeOfTest(
    @Param('subtypeId') subtypeId: string,
    @Body() updateSubtypeDto: SubtypeRequest,
  ) {
    await this.service.updateSubtype(updateSubtypeDto, subtypeId);
    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Delete(':subtypeId')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Delete subtype of tests`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Test.DELETED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async deleteSubtype(@Param('subtypeId') subtypeId: string) {
    return this.service.deleteSubtype(subtypeId);
  }
}
