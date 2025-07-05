import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthorizationGuard } from '../../../auth/guards/admin-authorization.guard';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { ResponseMessage } from '../../../common/constants/common.constant';
import { AuthorizationAndGetUserId } from '../../../common/decorators/authorization.decorator';
import { IsAdmin } from '../../../common/decorators/is-admin.decorator';
import { ClubService } from './clubs.service';
import { CreateClubDto } from '../dto/club-data.dto';
import {
  GetListTeamClubDto,
  GetListTeamClubV2Dto,
} from '../dto/get-list-team.dto';
import { SearchClubDto } from '../dto/search-club.dto';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Clubs')
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Query clubs by full text search`,
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
    description: ResponseMessage.Common.GET_SUCCESS,
  })
  async findAll(@Query() searchClubDto: SearchClubDto): Promise<any> {
    return this.clubService.findAll(searchClubDto);
  }

  @Get('/cms')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Query clubs by full text search for CMS`,
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
    description: ResponseMessage.Common.GET_SUCCESS,
  })
  async findAllCMS(
    @Query() searchClubDto: SearchClubDto,
    @IsAdmin() isAdmin: boolean,
  ): Promise<{ body: any; totalPage: number }> {
    if (!isAdmin) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    return this.clubService.findAllForCMS(searchClubDto);
  }
  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  // @Get('v2')
  // @ApiBearerAuth()
  // @UseGuards(LocalAuthGuard)
  // @ApiOperation({
  //   summary: `Query clubs by full text search`,
  // })
  // @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  // @ApiResponse({
  //   status: HttpStatus.BAD_REQUEST,
  //   description: 'Bad request',
  // })
  // @ApiResponse({
  //   status: HttpStatus.SERVICE_UNAVAILABLE,
  //   description: 'Service unavailable',
  // })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: ResponseMessage.Common.GET_SUCCESS,
  // })
  // async findAllV2(@Query() searchClubDto: SearchClubDto): Promise<any> {
  //   return this.clubService.findAllV2(searchClubDto);
  // }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @Get('/teams')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Get list team of club`,
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
    description: ResponseMessage.Common.GET_SUCCESS,
  })
  async getListTeamOfClub(
    @Query() getListTeamClubDto: GetListTeamClubDto,
  ): Promise<any> {
    return this.clubService.getListTeamOfClub(getListTeamClubDto);
  }

  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiBearerAuth()
  @Get('/teams/v2')
  async getListTeamOfClubV2(
    @Query() getListTeamClubV2Dto: GetListTeamClubV2Dto,
  ): Promise<any> {
    return this.clubService.getListTeamOfClubV2(getListTeamClubV2Dto);
  }

  @Post('')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: `Create a new club`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: ResponseMessage.Club.CREATED_NEW_CLUB,
  })
  async importClubData(
    @Ip() ip: string,
    @AuthorizationAndGetUserId([false]) userRoleId: string,
    @Body() createNewClub: CreateClubDto,
  ) {
    return this.clubService.createClub(ip, userRoleId, createNewClub);
  }

  @Get('/:clubId')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Get club by id`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Service unavailable',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Common.GET_SUCCESS,
  })
  async getClubById(@Param('clubId') clubId: string): Promise<any> {
    return this.clubService.getClubById(clubId);
  }

  @Patch('/:clubId')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Update a club`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Club.UPDATE_CLUB,
  })
  async updateClub(
    @Param('clubId') clubId: string,
    @Body() updateClubDto: CreateClubDto,
  ) {
    return this.clubService.updateClub(clubId, updateClubDto);
  }

  @Delete('/:clubId')
  @ApiBearerAuth()
  @UseGuards(AdminAuthorizationGuard)
  @ApiOperation({
    summary: `Delete a club`,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: ResponseMessage.Club.DELETE_CLUB,
  })
  async deleteClub(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('clubId') clubId: string,
  ) {
    return this.clubService.deleteClub(userRoleId, clubId);
  }

  @ApiExcludeEndpoint()
  @Post('/sync-clubs-to-mongo')
  syncClubsToMongo(@Body() createClubDto: CreateClubDto) {
    return this.clubService.syncClubsToMongo(createClubDto);
  }

  @ApiExcludeEndpoint()
  @Delete('/sync-clubs-to-mongo/:id')
  deleteClubsToMongo(@Param('id') id: string) {
    return this.clubService.deleteClubsToMongo(id);
  }
}
