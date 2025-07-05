import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { COMMENTS_NAME, CommentDocument } from './comments.schema';
import mongoose from 'mongoose';
import {
  CreateCommentDto,
  DeleteCommentPayload,
  GetCommentDto,
  GetCommentResult,
} from './dto/comments.dto';
import { UsersService } from '../users/v1/users.service';
import { CommentEntity } from './ comments.entity';
import { ProgramsService } from '../programs/service/program/programs.service';
import { SessionsService } from '../programs/service/session/sessions.service';
import { ExercisesService } from '../programs/service/exercise/exercises.service';
import { TYPE_COMMENT } from './constants/comments.enum';
import { LibProgramsService } from '../libraries/service/program/programs.service';
import { LibSessionsService } from '../libraries/service/session/sessions.service';
import { LibExercisesService } from '../libraries/service/exercise/exercises.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(COMMENTS_NAME)
    private readonly commentModel: mongoose.Model<CommentDocument>,
    private readonly userService: UsersService,
    private readonly programService: ProgramsService,
    private readonly sessionService: SessionsService,
    private readonly exercisesService: ExercisesService,
    private readonly libProgramService: LibProgramsService,
    private readonly libSessionService: LibSessionsService,
    private readonly libExercisesService: LibExercisesService,
  ) {}
  async getComentByTypeId(
    params: GetCommentDto,
    typeId: string,
  ): Promise<GetCommentResult> {
    const { limit, page } = params;
    const skip = (page - 1) * limit;

    const comments = await this.commentModel.aggregate([
      {
        $match: {
          typeId: new mongoose.Types.ObjectId(typeId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },

      {
        $project: {
          id: '$_id',
          type: 1,
          typeId: 1,
          userId: 1,
          comments: 1,
          like: 1,
          createdAt: 1,
          'user.profile': 1,
          'user.media': 1,
        },
      },

      {
        $addFields: {
          'user.media.faceImage': {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$user.media.faceImage', ''] },
                  { $eq: ['$user.media.faceImage', null] },
                ],
              },
              then: process.env.DEFAULT_IMAGE,
              else: '$user.media.faceImage',
            },
          },
        },
      },
    ]);

    const countComment = await this.commentModel.countDocuments({
      typeId,
    });
    const totalPage = Math.ceil(countComment / limit);
    return { body: comments, totalPage };
  }

  async countCommentsByTypeId(typeId: string): Promise<number> {
    return await this.commentModel.countDocuments({
      typeId,
    });
  }

  async createComment(payload: CreateCommentDto): Promise<CommentEntity> {
    const { type } = payload;
    await this.userService.getUserByIdFromMongo(payload.userId);

    const typeIdString = String(payload.typeId);

    switch (type) {
      case TYPE_COMMENT.PROGRAM:
        await this.programService.getProgramById(typeIdString);
        break;

      case TYPE_COMMENT.SESSION:
        await this.sessionService.getSessionById(typeIdString);
        break;

      case TYPE_COMMENT.EXERCISE:
        await this.exercisesService.getExerciseById(typeIdString);
        break;

      case TYPE_COMMENT.LIB_PROGRAM:
        await this.libProgramService.getProgramById(
          typeIdString,
          payload.userId,
        );
        break;

      case TYPE_COMMENT.LIB_SESSION:
        await this.libSessionService.getSessionById(typeIdString);
        break;

      case TYPE_COMMENT.LIB_EXERCISE:
        await this.libExercisesService.getExerciseById(typeIdString);
        break;
    }

    return await this.commentModel.create(payload);
  }

  async deleteComment(payload: DeleteCommentPayload): Promise<CommentEntity> {
    const { id, userId } = payload;
    await this.userService.getUserByIdFromMongo(userId);
    const comments = await this.commentModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    });

    if (!comments) throw new NotFoundException('Comment not found');

    return await this.commentModel.findByIdAndDelete({
      _id: id,
    });
  }
}
