import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { HealthsService } from './healths.service';
import { CreateHealthDto } from './dto/create-health.dto';
import { UpdateHealthDto } from './dto/update-health.dto';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRoleId } from '../../common/decorators/role-id.decorator';
import { UserTypes } from '../users/enum/user-types.enum';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';

@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('Healths')
@Controller('healths')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class HealthsController {
  constructor(private readonly healthsService: HealthsService) {}

  @Post('')
  @ApiOperation({
    summary: `create health data`,
  })
  createPlayerHealthData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createHealthDto: CreateHealthDto,
  ) {
    return this.healthsService.createUserHealthData(
      userRoleId,
      createHealthDto,
    );
  }

  @Get()
  findAll() {
    return this.healthsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.healthsService.findOne(+id);
  }

  @Patch(':docId')
  @ApiOperation({
    summary: `update health data`,
  })
  updateUserHealthData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('docId') docId: string,
    @Body() updateHealthDto: UpdateHealthDto,
  ) {
    return this.healthsService.updateUserHealthData(
      userRoleId,
      docId,
      updateHealthDto,
    );
  }

  @Delete(':docId')
  @ApiOperation({
    summary: `delete health data`,
  })
  removeUserHealthData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Param('docId') docId: string,
  ) {
    return this.healthsService.removeUserHealthData(userRoleId, docId);
  }
}
