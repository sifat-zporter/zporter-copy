import { Controller, Get, Query } from '@nestjs/common';
import { ProfileProviderService } from './profile-provider.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Profile-provider')
@Controller('profile-provider')
export class ProfileProviderController {
  constructor(
    private readonly profileProviderService: ProfileProviderService,
  ) {}

  @Get('providers')
  async getProviders() {
    return this.profileProviderService.getProviders();
  }

  @Get('countries')
  async getCountries(@Query('providerId') providerId: string) {
    return this.profileProviderService.getCountries(providerId);
  }

  @Get('leagues')
  async getLeaguesByCountry(
    @Query('providerId') providerId: string,
    @Query('countryId') countryId: string,
  ) {
    return this.profileProviderService.getLeaguesByCountry(
      providerId,
      countryId,
    );
  }

  @Get('players')
  async getPlayers(
    @Query('providerId') providerId: string,
    @Query('leagueId') leagueId: string,
  ) {
    return this.profileProviderService.getPlayers(providerId, leagueId);
  }
}
