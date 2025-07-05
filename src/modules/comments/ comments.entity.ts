import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { Types } from 'mongoose';
import { TYPE_COMMENT } from './constants/comments.enum';
import { IsObjectId } from './comment.validator';
import { Transform } from 'class-transformer';

export class CommentEntity {
  _id: Types.ObjectId;

  @IsEnum(TYPE_COMMENT, {
    message: `Type Invalid property value ${Object.values(TYPE_COMMENT).join(
      ', ',
    )}`,
    each: true,
  })
  @ApiProperty({
    type: String,
    description: 'Type of comment',
    required: true,
  })
  type: TYPE_COMMENT;

  @IsObjectId()
  @ApiProperty({
    description: 'Id of the comment or session or exercies',
    required: true,
  })
  typeId: Types.ObjectId;

  @IsUUID()
  @ApiProperty({
    description: 'Create by user id',
    required: true,
  })
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Transform((val) => {
    return val?.value?.trim() ?? val?.value;
  })
  @ApiProperty({
    description: 'Content of the comment',
    required: true,
  })
  comments: string;

  @IsNumber()
  @ApiProperty({
    description: 'Like of the comment',
    required: false,
    default: 0,
  })
  like: number;
}
