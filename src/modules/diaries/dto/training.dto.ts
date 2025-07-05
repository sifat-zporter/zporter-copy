import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PhysicallyStrain,
  Role,
  TeamPerformance,
  TrainingPerformance,
  TypeOfTraining,
} from '../enum/diaries.enum';
import { Training, TrainingHistoric } from '../interfaces/diaries.interface';
import { MediaDto } from './diary.dto';
import { CountryDto } from '../../../common/dto/country.dto';

export class PlayerTrainingReviews {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsEnum(Role)
  role: Role;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  performance: number;

  @ApiProperty()
  @IsString()
  trainingReview: string;
}
export class TrainingDto implements Training {
  @ApiProperty()
  @IsEnum(PhysicallyStrain)
  physicallyStrain: PhysicallyStrain;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(4)
  hoursOfPractice: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  technics: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  tactics: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  physics: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  mental: number;

  @ApiPropertyOptional()
  @IsString({ each: true })
  practiceTags: string[];

  @ApiProperty()
  @IsEnum(TypeOfTraining)
  typeOfTraining: TypeOfTraining;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  trainingMedia: MediaDto[];
}

export class TrainingHistoricDto implements TrainingHistoric {
  @ApiProperty({ default: PhysicallyStrain.NORMAL })
  @IsEnum(PhysicallyStrain)
  physicallyStrain: PhysicallyStrain;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(4)
  hoursOfPractice: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  technics: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  tactics: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  physics: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  mental: number;

  @ApiPropertyOptional()
  @IsString({ each: true })
  practiceTags: string[];

  @ApiPropertyOptional()
  @ValidateNested()
  trainingMedia: [];

  @ApiHideProperty()
  @ApiProperty({ default: TypeOfTraining.HISTORIC_TRAINING })
  @IsEnum(TypeOfTraining)
  typeOfTraining: TypeOfTraining;
}
export class PlayerTrainingDto extends TrainingDto {
  @ApiProperty({
    enum: TrainingPerformance,
    default: TrainingPerformance.GOOD,
  })

  @ApiProperty({ enum: TeamPerformance, default: TeamPerformance.GOOD })
  @IsEnum(TeamPerformance)
  @IsOptional()
  teamPerformance: TeamPerformance;

  @ApiPropertyOptional()
  @IsOptional()
  trainingReview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CountryDto)
  country?: CountryDto;
}

export class CoachTrainingDto extends TrainingDto {
  @ApiProperty({
    enum: TrainingPerformance,
    default: TrainingPerformance.GOOD,
  })

  @ApiProperty({ enum: TeamPerformance, default: TeamPerformance.GOOD })
  @IsEnum(TeamPerformance)
  @IsOptional()
  teamPerformance: TeamPerformance;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => PlayerTrainingReviews)
  playerReviews?: PlayerTrainingReviews[];

  @ApiPropertyOptional()
  @IsOptional()
  trainingReview?: string;
}
