import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { MediaDto } from '../../../../diaries/dto/diary.dto';

export class UpsertProgramDto {
  @ApiProperty({
    description: 'The id of the program',
    example: '68458c31934eef37d7250715',
  })
  @IsMongoId()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'The headline of the program',
    example: 'Drake 06071 Create Program',
  })
  @IsString()
  @IsOptional()
  headline?: string;

  @ApiProperty({
    description: 'The ingress text of the program',
    example: 'Drake 06071 Create Program Ingress',
  })
  @IsString()
  @IsOptional()
  ingressText?: string;

  @ApiProperty({
    description: 'The description of the program',
    example: '<p>Drake 06071 Create Program</p>',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The min participants of the program',
    example: '2',
  })
  @IsNumberString()
  @IsOptional()
  minParticipants?: string;

  @ApiProperty({
    description: 'The age from of the program',
    example: '5',
  })
  @IsString()
  @IsOptional()
  ageFrom?: string;

  @ApiProperty({
    description: 'The age to of the program',
    example: '29',
  })
  @IsString()
  @IsOptional()
  ageTo?: string;

  @ApiProperty({
    description: 'The location of the program',
    example: 'Home',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'The target group of the program',
    example: 'ALL',
  })
  @IsString()
  @IsOptional()
  targetGroup?: string;

  @ApiProperty({
    description: 'The main category of the program',
    example: 'PHYSICAL',
  })
  @IsString()
  @IsOptional()
  mainCategory?: string;

  @ApiProperty({
    description: 'The collections of the program',
    example: ['Ballcontrol', 'Build up', 'Activation'],
  })
  @IsArray()
  @IsOptional()
  collections?: string[];

  @ApiProperty({
    description: 'The share with of the program',
    example: 'Private',
  })
  @IsString()
  @IsOptional()
  shareWith?: string;

  @ApiProperty({
    description: 'The tags of the program',
    example: ['Balls', 'Bibs', 'Cones'],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'The media of the program',
    example: [
      {
        source: 'OTHER',
        thumbnail:
          'https://firebasestorage.googleapis.com/v0/b/zporter-dev.appspot.com/o/files%2F10555.png?alt=media&token=5a9fbdb6-6c86-4126-abce-931e1f680fa3',
        type: 'VIDEO',
        uniqueKey: '',
        url: 'https://www.youtube.com/',
      },
    ],
  })
  @IsArray()
  @IsOptional()
  media?: MediaDto[];
}
