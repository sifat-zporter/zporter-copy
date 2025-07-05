import { PartialType } from '@nestjs/swagger';
import { CreateHubspotContactDto } from './create-hubspot-contact.dto';

export class UpdateHubspotContactDto extends PartialType(
  CreateHubspotContactDto,
) {}
