import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { MedicalsService } from './medical.service';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import {
  CreateMedicalDto,
  GetMedicalRecordDto,
} from './dto/create-medical.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
@ApiBearerAuth()
@UseGuards(LocalAuthGuard)
@ApiTags('medicals')
@Controller('medicals')
@ApiHeaders([
  {
    name: 'roleId',
    description: 'roleId aka user document Id',
  },
])
export class MedicalsController {
  constructor(private readonly medicalsService: MedicalsService) {}
  @Post('')
  @ApiOperation({
    summary: 'create medical data',
  })
  createPlayerMedicalData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Body() createMedicalDto: CreateMedicalDto,
  ) {
    return this.medicalsService.createUserMedicalData(
      userRoleId,
      createMedicalDto,
    );
  }

  @Get('/get-list-medicals')
  @ApiOperation({ summary: 'Get list of medical records' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getListMedicalData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.medicalsService.getListMedicalData(userRoleId, paginationDto);
  }
  @Get('/get-record')
  @ApiOperation({ summary: 'Get a single record of medical data' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  async getMedicalData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query() query: GetMedicalRecordDto,
  ) {
    const { docId } = query;
    return this.medicalsService.getOneMedicalRecord(userRoleId, docId);
  }
  @Delete('/delete-record')
  @ApiOperation({ summary: 'Delete a medical record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Record deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Medical record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to delete medical record',
  })
  async deleteMedicalData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query('docId') docId: string,
  ) {
    return this.medicalsService.deleteMedicalRecord(userRoleId, docId);
  }
  @Patch('/update-record')
  @ApiOperation({ summary: 'Update a medical record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Medical record updated successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Medical record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to update medical record',
  })
  async updateMedicalData(
    @AuthorizationAndGetUserId() userRoleId: string,
    @Query('docId') docId: string,
    @Body() updateMedicalDto: Partial<CreateMedicalDto>,
  ) {
    return this.medicalsService.updateMedicalRecord(
      userRoleId,
      docId,
      updateMedicalDto,
    );
  }
  @Get('/publicLink')
  @ApiOperation({
    summary: 'Any user with the record ID can read the medical record',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Record fetched successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch medical record',
  })
  async getPublicMedicalData(@Query('id') recordId: string) {
    // Fetch the medical record using the public ID
    return this.medicalsService.getMedicalRecordPublic(recordId);
  }
  @Get('/get-recommendation')
  @ApiOperation({
    summary: 'Any user with the record ID can read the medical record',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Record fetched successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Record not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch medical record',
  })
  async recommendationMedical(@AuthorizationAndGetUserId() userRoleId: string) {
    return this.medicalsService.getReccomendationMedical(userRoleId);
  }
}
