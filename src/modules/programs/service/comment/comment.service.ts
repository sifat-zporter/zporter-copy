import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ResponseMessage,
  UserInfoDto,
} from '../../../../common/constants/common.constant';
import { INewCommonRepository } from '../../../abstract/interface/new-common-repository.interface';
import { ILibEntity } from '../../../libraries/interface/entity.interface';
import { TargetType } from '../../enums/target.type';
import { ProgComment } from '../../repositories/comment/prog.comment';
import { IExercisesRepository } from '../../repositories/exercise/exercises.repository.interface';
import { IProgramsRepository } from '../../repositories/program/programs.repository.interface';
import { ISessionRepository } from '../../repositories/session/sessions.repository.interface';
import { ICommentService } from './comment.service.interface';
import { ProgramsRepository } from '../../repositories/program/programs.repository';
import { SessionsRepository } from '../../repositories/session/sessions.repository';
import { ExercisesRepository } from '../../repositories/exercise/exercises.repository';
import { CommentResponse } from '../../dtos/comment/comment.response.dto';
import {
  mappingUserInfo,
  mappingUserInfoById,
} from '../../../../helpers/mapping-user-info';

@Injectable()
export class ProgCommentService implements ICommentService {
  constructor(
    @Inject(ProgramsRepository)
    private programRepository: IProgramsRepository,
    @Inject(SessionsRepository)
    private sessionsRepository: ISessionRepository,
    @Inject(ExercisesRepository)
    private exerciseRepository: IExercisesRepository,
  ) {}

  getRepository(type: TargetType): INewCommonRepository<ILibEntity> {
    switch (type) {
      case TargetType.PROGRAM:
        return this.programRepository;
      case TargetType.SESSION:
        return this.sessionsRepository;
      case TargetType.EXERCISE:
        return this.exerciseRepository;
    }
  }

  async commentDoc(
    currentUserId: string,
    docId: string,
    content: string,
    type: TargetType,
  ): Promise<void> {
    const doc: ILibEntity = await this.getRepository(type).customedFindOne(
      {
        _id: docId,
      },
      {
        comments: 1,
      },
    );

    if (!doc) {
      throw new BadRequestException(ResponseMessage.Program.NOT_FOUND);
    }

    const newComment: ProgComment = {
      _id: new Types.ObjectId(),
      content: content,
      createdBy: currentUserId,
      likeUserIds: [],
      createdAt: new Date(),
    };
    doc.comments.push(newComment);

    await this.getRepository(type).createOrUpdate(doc, {
      _id: docId,
    });
  }

  async getComment(
    targetId: string,
    type: TargetType,
  ): Promise<CommentResponse[]> {
    const doc: ILibEntity = await this.getRepository(type).customedFindOne(
      {
        _id: targetId,
        isDeleted: false,
      },
      {
        comments: 1,
      },
    );

    if (!doc) {
      throw new BadRequestException(ResponseMessage.Program.NOT_FOUND);
    }

    const result: CommentResponse[] =
      (await Promise.all(
        doc?.comments?.map((e: ProgComment) => this.generateCommentResponse(e)),
      )) ?? [];

    return result;
  }

  async generateCommentResponse(
    comment: ProgComment,
  ): Promise<CommentResponse> {
    const user: UserInfoDto = await mappingUserInfoById(comment.createdBy);
    const response: CommentResponse = {
      id: comment._id.toString(),
      content: comment.content,
      createdBy: comment.createdBy,
      bioUrl: user.bioUrl,
      faceImage: user.faceImage,
      likeUserIds: comment.likeUserIds,
      createdAt: comment.createdAt.toISOString(),
    };
    return response;
  }
}
