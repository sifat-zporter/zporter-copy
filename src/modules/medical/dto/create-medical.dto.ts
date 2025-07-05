import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import * as moment from "moment";
class GeneralHealthQuestionDto {
    @ApiPropertyOptional()
    @IsString()
    question: string;

    @ApiPropertyOptional()
    @IsBoolean()
    answer: boolean;
}
class DescriptionDto {
    @ApiPropertyOptional()
    @IsString()
    text: string;

    @ApiPropertyOptional()
    @IsArray()
    media: string[];
}
class SwitchButtonQuestionDto {
    @ApiPropertyOptional()
    @IsString()
    question: string;

    @ApiPropertyOptional()
    @IsBoolean()
    answer: boolean;
}
class MedicationAndSupplementsDto {
  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => SwitchButtonQuestionDto)
  switchButtonQuestion: SwitchButtonQuestionDto;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => DescriptionDto)
  description: DescriptionDto;
}
class VaccinationHistoryDto {
    @ApiPropertyOptional()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsNumber()
    year: number;
}
class BloodTypeAndVaccinationDto {
    @ApiPropertyOptional()
    @IsString()
    bloodType: string;

    @ApiPropertyOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VaccinationHistoryDto)
    vaccinationHistory: VaccinationHistoryDto[];
}
class InjuryHistoryDto {
    @ApiPropertyOptional()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsNumber()
    year: number;
} class MajorInjuryDto {
    @ApiPropertyOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InjuryHistoryDto)
    injuryHistory: InjuryHistoryDto[];

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => DescriptionDto)
    description: DescriptionDto;
} class IllnessHistoryDto {
    @ApiPropertyOptional()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsNumber()
    year: number;
} class IllnessAndFamilyHistoryDto {
    @ApiPropertyOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IllnessHistoryDto)
    illnessHistory: IllnessHistoryDto[];

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => DescriptionDto)
    illnessDetails: DescriptionDto;

    @ApiPropertyOptional()
    @IsArray()
    @IsString({ each: true })
    familyIllness: string[];

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => DescriptionDto)
    familyIllnessDetails: DescriptionDto;
}
class EcgTestDto {
    @ApiPropertyOptional()
    @IsBoolean()
    anyEcGRecently: boolean;

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => DescriptionDto)
    description: DescriptionDto;
}

class AllergiesAndIntolerancesDto {
    @ApiPropertyOptional()
    @IsOptional() // ✅ Now optional
    @IsArray()
    @IsString({ each: true })
    allergies?: string[];

    @ApiPropertyOptional()
    @IsOptional() // ✅ Now optional
    @IsArray()
    @IsString({ each: true })
    foodIntolerances?: string[];

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => DescriptionDto)
    description: DescriptionDto;
}

export class CreateMedicalDto {
    @ApiPropertyOptional({
        example:moment().format('YYYY-MM-DDTHH:mm:ssZ'),
        description:'Should be passing start of the(any) day + timezone'
    })
    date:string
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    genralHealthValue?: number;

    @ApiPropertyOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GeneralHealthQuestionDto)
    genralHealthQuestion: GeneralHealthQuestionDto[];

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => DescriptionDto)
    complaintDetail: DescriptionDto;

    @ApiPropertyOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicationAndSupplementsDto)
    medicationAndSupplements: MedicationAndSupplementsDto[];

    @ApiPropertyOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AllergiesAndIntolerancesDto)
    allergiesAndIntolerances: AllergiesAndIntolerancesDto[];

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => BloodTypeAndVaccinationDto)
    bloodTypAndVaccination: BloodTypeAndVaccinationDto;

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => MajorInjuryDto)
    majorInjury: MajorInjuryDto;

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => IllnessAndFamilyHistoryDto)
    illnessAndFamilyHistory: IllnessAndFamilyHistoryDto;

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => EcgTestDto)
    ecgTest: EcgTestDto;
   //Contineu
}
 export class GetMedicalRecordDto {
    @ApiProperty({
        description: 'The document ID of the medical record',
        example: 'abc123def456',
    })
    @IsString()
    docId: string
}
