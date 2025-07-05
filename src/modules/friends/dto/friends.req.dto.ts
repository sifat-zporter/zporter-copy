import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { ArrayMinSize, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { UserTypes } from '../../users/enum/user-types.enum';
import { Status, TypeRequest } from '../enum/friend.enum';
import { IFollow, IFriend } from '../schemas/friend.schemas';
export class GetListRelationshipsQuery extends PaginationDto {
  @ApiProperty({
    enum: [Status.ACCEPTED, Status.REQUESTED, Status.OWN_REQUESTED],
  })
  @IsEnum(Status)
  status: Status;

  @ApiProperty({ enum: TypeRequest })
  @IsEnum(TypeRequest)
  type: TypeRequest;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  clubId?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    enum: [UserTypes.COACH, UserTypes.PLAYER, UserTypes.SUPPORTER],
    default: UserTypes.PLAYER,
  })
  @IsEnum(UserTypes)
  @IsOptional()
  role?: UserTypes;
}

export class AddMultiFriendDto {
  @ApiProperty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];
}

export class SearchNotFriendQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  search?: string;
}

export class RequestRelationshipDto {
  @ApiProperty({ enum: TypeRequest })
  @IsEnum(TypeRequest)
  type: TypeRequest;
}

export class ResponseRelationshipDto {
  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  status: Status;

  @ApiProperty({ enum: TypeRequest })
  @IsEnum(TypeRequest)
  type: TypeRequest;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  userId?: string;
}

export class GetListBlockedFriend extends PaginationDto {}

export class UnblockFriendsDto {
  @ApiProperty()
  @IsString({ each: true })
  userIds: string[];
}

export class FriendForMongoDto implements IFriend {
  userId: string;
  sender: string;
  relationshipId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export class FollowForMongoDto implements IFollow {
  userId: string;
  relationshipId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}
