import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeaders, ApiTags } from '@nestjs/swagger';
import { ClubV2Service } from './clubs.service';
import { SearchClubDto } from '../dto/search-club.dto';
import { LocalAuthGuard } from '../../../auth/guards/local-auth.guard';
import { IsAdmin } from '../../../common/decorators/is-admin.decorator';

@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
@ApiTags('Clubs V2 (Mongodb)')
@Controller('clubs/v2')
export class ClubV2Controller {
  constructor(private readonly clubService: ClubV2Service) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  getAllClubs(@Query() searchClubDto: SearchClubDto) {
    return this.clubService.getAllClubs(searchClubDto);
  }

  @Get('/cms')
  @ApiBearerAuth()
  @UseGuards(LocalAuthGuard)
  async findAllCMS(
    @Query() searchClubDto: SearchClubDto,
    @IsAdmin() isAdmin: boolean,
  ): Promise<{ body: any; totalPage: number }> {
    if (!isAdmin) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    return this.clubService.findAllForCMS(searchClubDto);
  }
}
