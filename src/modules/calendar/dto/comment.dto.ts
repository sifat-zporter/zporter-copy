import { ApiProperty, ApiPropertyOptional, IntersectionType } from "@nestjs/swagger";
import { IsDate, IsDefined, IsNumber, IsObject, IsOptional, IsString, ValidateIf } from "class-validator";
import { MediaDto } from "./event.dto";
import { Role } from "../enum/participants.enum";
import { UserTypes } from "../../users/enum/user-types.enum";

export class EventCommentDto {
    @ApiPropertyOptional({
        description: 'Text Content of the comment',
    })
    @ValidateIf((o) => o.content || !o.media)
    @IsString()
    comment: string;

    @ApiPropertyOptional({
        description: 'Media associated with the event',
        example: {
            "url": "https://firebasestorage.googleapis.com/v0/b/zporter-dev.appspot.com/o/media%2F2025-04-20%2010:18:43.796663?alt=media&token=914a2677-a434-437a-8420-b1f901fd9d77",
            "type": "IMAGE"
        },
        type: MediaDto,
    })
    @ValidateIf((o) => o.media)
    @IsOptional()
    @IsObject()
    media: MediaDto;
}

export class GetEventCommentListDto extends EventCommentDto {
    @ApiPropertyOptional({
        description: 'ID of the user who made the comment',
        example: 'user_12345',
    })
    @IsOptional()
    @IsString()
    @IsDefined()
    userId: string;

    @ApiPropertyOptional({
        description: 'Name of the user who made the comment',
        example: 'John Doe',
    })
    @IsOptional()
    @IsString()
    @IsDefined()
    name: string;

    @ApiPropertyOptional({
        description: 'Avatar URL of the user who made the comment',
        example: 'https://example.com/avatar/user_12345.png',
    })
    @IsOptional()
    @IsString()
    @IsDefined()
    avatar: string;

    @ApiPropertyOptional({
        enum: UserTypes,
        description: 'Role of the participant in the event',
        example: UserTypes.PLAYER,
    })
    @IsOptional()
    @IsString()
    userRole: UserTypes;

    @ApiPropertyOptional({
        description: 'Timestamp when the comment was created',
    })
    @IsNumber()
    createdAt: number;
}

export class ResponseCommentDto {
    @ApiPropertyOptional({
        description: 'List of comments for the event',
        type: [GetEventCommentListDto],
    })
    comments: GetEventCommentListDto[];

    @ApiPropertyOptional({
        description: 'Cursor for pagination to fetch next set of comments',
        example: 'cursor_12345',
    })
    nextPageCursor?: string | null;
}