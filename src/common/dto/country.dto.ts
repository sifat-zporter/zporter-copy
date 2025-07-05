import { ApiProperty } from '@nestjs/swagger';
import { ICountry } from '../../modules/users/interfaces/users.interface';

export class CountryDto implements ICountry {
  @ApiProperty()
  alpha2Code: string;

  @ApiProperty()
  alpha3Code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  flag: string;

  @ApiProperty()
  region: string;
}
