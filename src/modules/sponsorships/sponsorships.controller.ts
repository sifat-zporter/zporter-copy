import {
    Controller,
    Get,
    Put,
    UseGuards,
    Query,
    Param,
    Body,
    Req,
} from '@nestjs/common';
import { SponsorShipsService } from './sponsorships.service';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';

@ApiTags('sponsorships')
@Controller('sponsorships')
export class SponsorShipsController {
    constructor(private readonly SponsorShipsService: SponsorShipsService) { }

    @Get()
    @ApiBearerAuth()
    @UseGuards(LocalAuthGuard)
    @ApiOperation({
        summary: `Get sponsors by type`,
    })
    async getUserInfoById(
        @Query('type') type: string, 
        @Req() req
    ) {
        console.log('User Role ID:', req.user.roleId);
        return this.SponsorShipsService.getSponsors(type, req.user.roleId);
    }

    @Get(':id')
    @ApiOperation({
        summary: `Get sponsor info by id`,
    })
    @ApiParam({ name: 'id', type: String, required: true })
    async getSponsorById(@Param('id') id: string) {
        return this.SponsorShipsService.getSponsorById(id);
    }

    @Put('/update/:id')
    @ApiOperation({ summary: 'Update sponsor info by ID' })
    @ApiParam({ name: 'id', type: String, required: true })
    async updateSponsorById(
        @Param('id') id: string,
        @Body() body: { sum: number; exchange: string; variable: string }
    ) {
        return this.SponsorShipsService.updateSponsor(id, body);
    }
}
