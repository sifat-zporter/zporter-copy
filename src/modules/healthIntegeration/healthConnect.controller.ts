import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
  Get,
  Query,
  Delete,
} from '@nestjs/common';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { LocalAuthGuard } from '../../auth/guards/local-auth.guard';
import { HealthConnectService } from './services/HealthConnectService/healthconnect.service';

import { HealthDataType } from './enum/HealthConnect.enum';
import {
  healthDataDeleteHandlerMap,
  healthDataGetHandlerMap,
  healthDataHandlerMap,
} from './health-data-handler.map';
import { AuthorizationAndGetUserId } from '../../common/decorators/authorization.decorator';
import { UnifiedHealthRecordDto } from './unified-health.dto';

@ApiBearerAuth()
@ApiTags('healthConnect')
@UseGuards(LocalAuthGuard)
@Controller('healthIntegration/healthconnect')
export class HealthConnectController {
  constructor(private readonly healthConnectService: HealthConnectService) {}

  @Post()
  @ApiOperation({ summary: 'Handle unified health data record' })
  @ApiResponse({
    status: 201,
    description:
      'Health data stored successfully. The data you want to upldad shoule be inside the like this {type:,data:{data here}',
    schema: {
      example: {
        message:
          'Health data of type BASAL_METABOLIC_RATE stored successfully.',
        result: [
          {
            record_id: 'some-uuid',
            added_record_id: true,
            aggregated: false,
            message: 'Basal metabolic rate record stored',
            sampleCount: 5,
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or unsupported data type',
    schema: {
      example: {
        message: 'Validation failed for health data payload.',
        type: 'BASAL_METABOLIC_RATE',
        errors: [
          {
            property: 'basalMetabolicRate.value',
            constraints: {
              isNotEmpty: 'value should not be empty',
            },
          },
        ],
      },
    },
  })
  async handleUnifiedHealthData(
    @Body() body: UnifiedHealthRecordDto,
    @AuthorizationAndGetUserId() userId: string,
  ) {
    const { type, data } = body;

    // 1. Check if the type is valid
    const handler = healthDataHandlerMap[type];
    if (!handler) {
      throw new BadRequestException(`Unsupported health data type: ${type}`);
    }

    // 2. Transform and validate incoming data using the appropriate DTO
    const dtoClass = handler.dto;
    const dtoInstance = plainToClass(dtoClass as ClassConstructor<any>, data);

    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      const detailedErrors = errors.map((err) => ({
        property: err.property,
        constraints: err.constraints,
      }));
      throw new BadRequestException({
        message: 'Validation failed for health data payload.',
        type,
        errors: detailedErrors,
      });
    }

    // 3. Call the appropriate service method dynamically
    const serviceMethod = handler.serviceMethod;
    if (!this.healthConnectService[serviceMethod]) {
      throw new BadRequestException(
        `Service method ${serviceMethod} not implemented for type ${type}`,
      );
    }

    // 4. Call the method with userId and validated DTO
    const result = await this.healthConnectService[serviceMethod](
      userId,
      dtoInstance,
    );

    return {
      message: `Health data of type ${type} stored successfully.`,
      result,
    };
  }
  @Get()
  @ApiOperation({ summary: 'Fetch health data by type, date, or record ID' })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of health data (e.g., BASAL_METABOLIC_RATE)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date in YYYY-MM-DD format',
  })
  @ApiQuery({
    name: 'recordId',
    required: false,
    description: 'Record ID of a specific sample',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the health data for the given parameters',
    schema: {
      example: {
        message:
          'Fetched health data of type BASAL_METABOLIC_RATE successfully.',
        result: {
          date: '2025-07-03',
          aggregated: false,
          samples: [
            {
              id: 'uuid-sample-id',
              value: 1500,
              unit: 'kcal/day',
              time: '2025-07-03T12:00:00Z',
              metadata: {},
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Bad request due to missing or invalid parameters',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Either "date" or "recordId" query parameter must be provided.',
      },
    },
  })
  async getHealthData(
    @AuthorizationAndGetUserId() userId: string,
    @Query('type') type: HealthDataType,
    @Query('date') date?: string,
    @Query('recordId') recordId?: string,
  ) {
    // Validate type presence
    if (!type) {
      throw new BadRequestException('Query parameter "type" is required.');
    }

    // Validate date or recordId presence
    if (!date && !recordId) {
      throw new BadRequestException(
        'Either "date" or "recordId" query parameter must be provided.',
      );
    }

    // Check handler for type
    const handler = healthDataGetHandlerMap[type];
    if (!handler) {
      throw new BadRequestException(`Unsupported health data type: ${type}`);
    }
    const fetchMethod = healthDataGetHandlerMap[type];
    if (!this.healthConnectService[fetchMethod]) {
      throw new BadRequestException(
        `Service method ${fetchMethod} not implemented for fetching type ${type}`,
      );
    }

    const result = await this.healthConnectService[fetchMethod](
      userId,
      date,
      recordId,
    );
    return {
      message: `Fetched health data of type ${type} successfully.`,
      result,
    };
  }
  @Delete()
  @ApiOperation({
    summary: 'Delete health records by type, date or recordId',
    description:
      'Provide type (required) and either date or recordId (at least one required).',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of health data (e.g., BASAL_METABOLIC_RATE)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date in YYYY-MM-DD format',
  })
  @ApiQuery({
    name: 'recordId',
    required: false,
    description: 'Record ID of a specific sample',
  })
  @ApiResponse({
    status: 200,
    description: 'Health data deleted successfully',
    schema: {
      example: {
        message:
          'Health data of type BASAL_METABOLIC_RATE deleted successfully.',
        result: {
          message: 'BMR sample deleted',
          date: '2025-07-03',
          deleted_record_id: 'uuid-record-id',
          deleted_record_index: true,
          remaining_sample_count: 5,
          aggregated: false,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    status: 400,
    description: 'Bad request due to missing or invalid parameters',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Either "date" or "recordId" query parameter must be provided.',
      },
    },
  })
  async deleteHealthData(
    @AuthorizationAndGetUserId() userId: string,
    @Query('type') type: HealthDataType,
    @Query('date') date?: string,
    @Query('recordId') recordId?: string,
  ) {
    // 1. Validate type
    if (!type) {
      throw new BadRequestException('Query parameter "type" is required.');
    }

    // 2. Validate at least one of date or recordId
    if (!date && !recordId) {
      throw new BadRequestException(
        'Either "date" or "recordId" query parameter must be provided.',
      );
    }

    // 3. Get method name
    const deleteMethod = healthDataDeleteHandlerMap[type];
    if (!deleteMethod) {
      throw new BadRequestException(`Unsupported health data type: ${type}`);
    }

    // 4. Check if the service method exists
    if (typeof this.healthConnectService[deleteMethod] !== 'function') {
      throw new BadRequestException(
        `Delete method ${deleteMethod} not implemented for type ${type}`,
      );
    }

    // 5. Call service method dynamically
    const result = await this.healthConnectService[deleteMethod](
      userId,
      date,
      recordId,
    );

    return {
      message: `Health data of type ${type} deleted successfully.`,
      result,
    };
  }
}
