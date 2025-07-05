import { Controller, Get, Query } from '@nestjs/common';
import { ApiHeaders, ApiTags } from '@nestjs/swagger';
import { UsersV2Service } from './users.service';
import { SearchUserDto } from '../dto/search-user.dto';

@ApiTags('Users V2')
@Controller('users/v2')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class UsersV2Controller {
  constructor(private readonly usersService: UsersV2Service) {
    // empty
  }

  @Get()
  async findAll(@Query() searchUserDto: SearchUserDto) {
    return this.usersService.findAll(searchUserDto);
  }

  @Get('players-by-country')
  async findByNameAndCountry(@Query() searchUserDto: SearchUserDto) {
    return this.usersService.findByNameAndCountry(searchUserDto);
  }

  @Get('education')
  async getEducation() {
    return 'hi';
  }
}
