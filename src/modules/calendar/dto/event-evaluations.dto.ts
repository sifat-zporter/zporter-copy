import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { DateUtil } from '../../../utils/date-util';

export class CreateEventEvaluationDto {
  @ApiProperty({
    description: 'Zporter user ID of the evaluator (coach)',
    example: '008a5eab-1837-4121-8975-9ec94059b165',
  })
  @IsNotEmpty()
  @IsString()
  evaluatorId: string;

  @ApiProperty({
    description: 'Denormalized display name of the evaluator',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  evaluatorName: string;

  @ApiProperty({
    description: 'Zporter user ID of the player being evaluated',
    example: '008a5eab-1837-4121-8975-9ec94059b165',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Denormalized display name of the player being evaluated',
    example: 'Jane Smith',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Timestamp of the evaluation',
    example: DateUtil.prototype.getNowDate(),
    type: Date,
  })
  @Type(() => Date)
  evaluationDate: Date | string;

  @ApiPropertyOptional({
    description: 'Overall rating given by the evaluator (optional) 1-5 scale',
    minimum: 1,
    maximum: 5,
    type: Number,
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  overallRating?: number;

  @ApiPropertyOptional({
    description: 'Public comments visible to the player and parents (optional)',
    type: String,
    example: 'Great effort in practice!',
  })
  @IsOptional()
  @IsString()
  publicComments?: string;

  @ApiPropertyOptional({
    description: 'Private notes for coaching staff only (optional)',
    type: String,
    example: 'Needs improvement in tactical understanding.',
  })
  @IsOptional()
  @IsString()
  privateNotes_coach?: string;

  @ApiPropertyOptional({
    description:
      "Criteria ratings as a map, e.g., { 'technicalSkill': 4, 'effort': 5, 'tacticalUnderstanding': 3 }",
    type: Object,
    example: {
      technicalSkill: 4,
      effort: 5,
      tacticalUnderstanding: 3,
    },
  })
  @IsOptional()
  @IsObject()
  criteria: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'Timestamp when the player was notified or given access to the evaluation (optional)',
    example: DateUtil.prototype.getNowDate(),
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sharedWithUserAt?: Date | string;
}

export class EventEvaluationsDto extends PartialType(CreateEventEvaluationDto) {

}

export class UpdateEventEvaluationDto extends OmitType(CreateEventEvaluationDto, ['evaluatorId', 'evaluatorName', 'name', 'evaluationDate', 'sharedWithUserAt']) {

}

