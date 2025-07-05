import {
  BadRequestException,
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
  ApiHeaders,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { AbstractController } from '../../abstract/abstract.controller';
import { CommonResponse } from '../../abstract/dto/common-response';
import { GetLibRequestDto } from '../dto/request/get-lib.request.dto';
import { LibRequestDto } from '../dto/request/lib.request.dto';
import { LibraryType } from '../enum/library.type';
import { ILibResponse } from '../interface/response.interface';
import { LibraryService } from '../service/library.service';
import { ILibService } from '../service/library.service.interface';
import { LibraryTab } from '../enum/library.tab';
import { UserTypes } from '../../users/enum/user-types.enum';
import { ProgramTotalRequestDto } from '../../programs/dtos/program-total-request.dto';
import { GetLibChildrenRequest } from '../dto/request/get-sessions.req';
import { UserRoleId } from '../../../common/decorators/role-id.decorator';
import { Types } from 'mongoose';
import { SessionsRequestDto } from '../../programs/dtos/session/sessions-request.dto';
import { ExercisesRequestDto } from '../../programs/dtos/exercise/exercises-request.dto';
import { GetDetailResponse } from '../../programs/dtos/program/programs-response.dto';

@Controller('library')
@ApiTags('Library')
export class LibraryController extends AbstractController<ILibService> {
  constructor(
    @Inject(LibraryService)
    private libraryService: ILibService,
  ) {
    super(libraryService);
  }

  @Post('multiple')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create program on Library`,
  })
  @ApiHeaders([
    {
      name: 'roleId',
      description: 'roleId aka user document Id',
    },
  ])
  async createProgram(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Body() request: ProgramTotalRequestDto,
  ): Promise<CommonResponse<null>> {
    await this.service.createProgram(request, userRoleId);

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @Post('session')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `create or update session`,
  })
  @ApiHeaders([
    {
      name: 'roleId',
      description: 'roleId aka user document Id',
    },
  ])
  async createOrUpdateSession(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() request: SessionsRequestDto,
  ) {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.createSession(request, userRoleId),
    });
  }

  @Post('exercise')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `create or update exercise`,
  })
  @ApiHeaders([
    {
      name: 'roleId',
      description: 'roleId aka user document Id',
    },
  ])
  async createOrUpdateExercise(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() request: ExercisesRequestDto,
  ) {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.createExercise(request, userRoleId),
    });
  }

  @Post(':type/bookmark/:id')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Save/Delete on 'Save' icon`,
  })
  @ApiHeaders([
    {
      name: 'roleId',
      description: 'roleId aka user document Id',
    },
  ])
  async toggleBookmarked(
    @AuthorizationAndGetUserId([UserTypes.COACH]) userRoleId: string,
    @Param('type') type: LibraryType,
    @Param('id') id: string,
  ): Promise<CommonResponse<null>> {
    await this.service.toggleBookmarked(userRoleId, type, id);

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: null,
    });
  }

  @Post(':type/:id')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @ApiOperation({
    summary: `Copy program to library without children`,
  })
  @UseGuards(LocalAuthGuard)
  async copyToLibrary(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('type') type: LibraryType,
    @Param('id') id: string,
  ): Promise<CommonResponse<null>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }

    await this.service.copyToLibrary(userRoleId, type, id);
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @Post(':type/:id/children')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @ApiOperation({
    summary: `Copy program to library with children`,
  })
  @UseGuards(LocalAuthGuard)
  async copyToLibraryWithChildren(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('type') type: LibraryType,
    @Param('id') id: string,
  ): Promise<CommonResponse<null>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }

    await this.service.copyToLibrary(userRoleId, type, id, true);
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @Patch(':type/:id')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  async update(
    @Body() request: LibRequestDto,
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('type') type: LibraryType,
    @Param('id') docId: string,
  ): Promise<CommonResponse<null>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }
    await this.service.update(userRoleId, request, type, docId);

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }

  @Get('program-detail/:id')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  async getProgramDetailById(
    @Param('id') id: string,
    @UserRoleId() userId: string,
  ) {
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.getProgramDetailById(id, userId),
    });
  }

  @Get(':type/detail-all/:id')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  async getDetailById(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Param('id') id: string,
    @Param('type') type: LibraryType,
  ): Promise<CommonResponse<GetDetailResponse>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.getDetailById(currentUserId, id, type),
    });
  }

  @Get(':type/detail/:id')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  async getOne(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Param('id') id: string,
    @Param('type') type: LibraryType,
  ): Promise<CommonResponse<ILibResponse>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: await this.service.getOne(currentUserId, id, type),
    });
  }

  @Get(':type/:id/children')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get session/exercise library by programId/sessionId`,
  })
  async getLibChildrenById(
    @UserRoleId() userId: string,
    @Param('type') type: LibraryType,
    @Param('id') docId: string,
    @Query() libChildrenRequest: GetLibChildrenRequest,
  ): Promise<CommonResponse<ILibResponse[]>> {
    if (!Types.ObjectId.isValid(docId)) {
      throw new BadRequestException(ResponseMessage.Common.BAD_REQUEST);
    }

    return this.response({
      message: ResponseMessage.Common.SUCCESS,
      statusCode: HttpStatus.OK,
      body: await this.service.getLibChildrenById(
        userId,
        docId,
        type,
        libChildrenRequest,
      ),
    });
  }

  @Get(':type/:tab')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  async getAll(
    @AuthorizationAndGetUserId() currentUserId: string,
    @Query() request: GetLibRequestDto,
    @Param('type')
    type: LibraryType,
    @Param('tab')
    tab: LibraryTab,
  ): Promise<CommonResponse<ILibResponse[]>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }

    const {
      startAfter: page,
      limit: pageSize,
      sorted,
      ...restRequest
    } = request;

    //# this line for FrontEnd's function(don't care about this)
    delete restRequest.date;

    const result: ILibResponse[] = await this.service.getMany(
      currentUserId,
      request,
      type,
      tab,
    );

    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: result,
    });
  }

  @Delete(':type/:id')
  @ApiBearerAuth()
  @ApiHeaders([
    {
      name: 'roleId',
    },
  ])
  @UseGuards(LocalAuthGuard)
  async deleteLibrary(
    @Param('type') type: LibraryType,
    @Param('id') docId: string,
  ): Promise<CommonResponse<null>> {
    if (!Object.values(LibraryType).includes(type)) {
      throw new BadRequestException(ResponseMessage.Library.WRONG_TYPE_LIBRARY);
    }

    await this.service.delete(docId, type);
    return this.response({
      statusCode: HttpStatus.OK,
      message: ResponseMessage.Common.SUCCESS,
      body: null,
    });
  }
}
