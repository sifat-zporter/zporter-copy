import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { CareersService } from './careers.service';
import { GetCareersDto } from './dto/career.dto';
import {
  CreateFutureCareerDto,
  CreateHistoricCareerDto,
} from './dto/create-career.dto';
import {
  UpdateFutureCareerDto,
  UpdateHistoricCareerDto,
} from './dto/update-career.dto';

@ApiTags('Careers')
@Controller('careers')
@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @ApiOperation({
    summary: `Create player historic career by getting userId from token`,
  })
  @ApiBody({ type: CreateHistoricCareerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Career.CREATED_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post('historic')
  async createHistoricCareer(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createHistoricCareerDto: CreateHistoricCareerDto,
  ) {
    return this.careersService.createHistoricCareer(
      userRoleId,
      createHistoricCareerDto,
    );
  }

  @ApiOperation({
    summary: `Update player historic career by careerId & getting userId from token`,
  })
  @ApiBody({ type: UpdateHistoricCareerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Career.UPDATED_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Patch('historic/:careerId')
  async updateHistoricCareer(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('careerId') careerId: string,
    @Body() updateHistoricCareerDto: UpdateHistoricCareerDto,
  ) {
    return this.careersService.updateHistoricCareer(
      userRoleId,
      careerId,
      updateHistoricCareerDto,
    );
  }

  @ApiOperation({
    summary: `Create player future career plan by getting userId from token`,
  })
  @ApiBody({ type: CreateFutureCareerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Career.CREATED_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Post('future')
  async createFutureCareer(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createFutureCareerDto: CreateFutureCareerDto,
  ) {
    return this.careersService.createFutureCareer(
      userRoleId,
      createFutureCareerDto,
    );
  }

  @ApiOperation({
    summary: `Update player future career plan by careerId & getting userId from token`,
  })
  @ApiBody({ type: UpdateFutureCareerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Career.UPDATED_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Patch('future/:careerId')
  async updateFutureCareer(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('careerId') careerId: string,
    @Body() updateFutureCareerDto: UpdateFutureCareerDto,
  ) {
    return this.careersService.updateFutureCareer(
      userRoleId,
      careerId,
      updateFutureCareerDto,
    );
  }

  @ApiOperation({
    summary: `Delete player career by careerId & getting userId from token`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Career.DELETED_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Delete(':careerId')
  remove(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('careerId') careerId: string,
  ) {
    return this.careersService.remove(userRoleId, careerId);
  }

  @ApiOperation({
    summary: `Get one future career by careerId`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Career.GET_FUTURE_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Get('future/:careerId')
  async findOneFuture(@Param('careerId') id: string) {
    return this.careersService.findOneFuture(id);
  }

  @ApiOperation({
    summary: `Get one historic career by careerId`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Career.GET_HISTORIC_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Get('historic/:careerId')
  async findOneHistoric(@Param('careerId') id: string) {
    return this.careersService.findOneHistoric(id);
  }

  @ApiOperation({
    summary: `Get all career by type and userId (from token)`,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Career.GET_HISTORIC_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  @Get('all-by-type/')
  async getAllHistoricClubs(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() getCareersByType: GetCareersDto,
  ) {
    return this.careersService.getClubCareers(userRoleId, getCareersByType);
  }
}
