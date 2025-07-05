import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportType } from '../enum/report.type';

export class ReportRequestDto {
  @ApiProperty({ required: true })
  @IsString()
  postId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  message: string;

  @ApiProperty({
    enum: ReportType,
    required: true,
    default: ReportType.TEST_REPORT,
  })
  @IsString()
  reportType: ReportType;
}
