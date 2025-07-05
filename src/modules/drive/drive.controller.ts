import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { DriveService } from './drive.service';
import { CreateDriveDto } from './dto/drive.dto';

@ApiBearerAuth() // Indicates this route requires a bearer token (JWT) for access
@UseGuards(LocalAuthGuard) // Protects all routes in this controller with local authentication
@ApiTags('Drive') // Swagger tag for API grouping
@Controller('drive') // Base route path: /drive
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  /**
   * GET /drive
   * Fetches all file entries associated with the authenticated user.
   */
  @Get()
  @ApiOperation({ summary: `Get all drive files for current user` })
  getDriveData(@AuthorizationAndGetUserId() userId: string) {
    return this.driveService.getDriveUserFiles(userId);
  }

  /**
   * POST /drive
   * Creates a new file record for the authenticated user.
   * Accepts file metadata via CreateDriveDto.
   */
  @Post()
  @ApiOperation({ summary: `Create a new drive file entry` })
  createDriveFile(
    @AuthorizationAndGetUserId() userId: string,
    @Body() dto: CreateDriveDto,
  ) {
    return this.driveService.createDriveFile(userId, dto);
  }

  /**
   * DELETE /drive/:fileId
   * Deletes a specific file from the user's collection.
   * Requires fileId as a route parameter.
   */
  @Delete('/:fileId')
  @ApiOperation({ summary: `Delete a specific drive file` })
  deleteDriveFile(
    @AuthorizationAndGetUserId() userId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.driveService.deleteDriveFile(userId, fileId);
  }

  /**
   * PATCH /drive/:fileId
   * Updates a specific file entry with partial data.
   * Only the owner of the file can perform this operation.
   */
  @Patch('/:fileId')
  @ApiOperation({ summary: `Update a specific drive file` })
  updateDriveFile(
    @AuthorizationAndGetUserId() userId: string,
    @Param('fileId') fileId: string,
    @Body() updateData: Partial<CreateDriveDto>,
  ) {
    return this.driveService.updateDriveFile(userId, fileId, updateData);
  }
}
