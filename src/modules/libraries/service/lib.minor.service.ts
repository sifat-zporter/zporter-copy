import { Types } from 'mongoose';
import { ObjectMapper } from '../../../utils/objectMapper';
import { LibRequestDto } from '../dto/request/lib.request.dto';
import { LibraryType } from '../enum/library.type';
import { ILibEntity } from '../interface/entity.interface';
import { defaultProgram } from '../repository/program/default.program';
import { DateUtil } from '../../../utils/date-util';
import { defaultSession } from '../repository/session/default.session';
import { defaultExercise } from '../repository/exercise/default.exercise';
import { Injectable } from '@nestjs/common';
import { ILibResponse } from '../interface/response.interface';
import { ProgramResponse } from '../../programs/dtos/program/programs-response.dto';
import SessionResponseDto from '../../programs/dtos/session/sessions-response.dto';
import { ExerciseResponseDto } from '../../programs/dtos/exercise/exercises-response.dto';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { convertAgeToString } from '../../../utils/convert-age-to-string';
import {
  generateIndex,
  generateNewHeadline,
} from '../utils/generate-unique-headline.library';

@Injectable()
export class LibMinorService {
  createEntity(
    currentUserId: string,
    libRequest: LibRequestDto,
    type: LibraryType,
    indexArr?: ILibEntity[],
  ): ILibEntity {
    var doc: ILibEntity;
    const dateUtil: DateUtil = new DateUtil();
    const index: number = generateIndex(indexArr);
    const optionalObject = {
      _id: new Types.ObjectId(),
      idRoot: libRequest?._id,
      headline: generateNewHeadline(libRequest.headline, index),
      createdBy: currentUserId,
      createdAt: dateUtil.getNowTimeInMilisecond(),
      updatedAt: dateUtil.getNowTimeInMilisecond(),
      avgStar: 0,
      ratings: [],
      bookmarkUserIds: [],
      comments: [],
      index,
    };

    switch (type) {
      case LibraryType.PROGRAM:
        doc = new ObjectMapper().convertValueCheckType<
          LibRequestDto,
          ILibEntity
        >(libRequest, defaultProgram, optionalObject);
        break;

      case LibraryType.SESSION:
        doc = new ObjectMapper().convertValueCheckType<
          LibRequestDto,
          ILibEntity
        >(libRequest, defaultSession, optionalObject);
        break;

      case LibraryType.EXERCISE:
        doc = new ObjectMapper().convertValueCheckType<
          LibRequestDto,
          ILibEntity
        >(libRequest, defaultExercise, optionalObject);
        break;
    }
    return doc;
  }

  async generateResponse(
    currentUserId: string,
    type: LibraryType,
    entity: ILibEntity,
  ): Promise<ILibResponse> {
    let response: ILibResponse;

    switch (type) {
      case LibraryType.PROGRAM:
        response = new ProgramResponse();
        break;
      case LibraryType.SESSION:
        response = new SessionResponseDto();
        break;
      case LibraryType.EXERCISE:
        response = new ExerciseResponseDto();
        break;
    }
    const dataMapping = new ObjectMapper().convertValueCheckType(
      entity,
      response,
      {
        id: entity._id.toString(),
        currentUserVoting:
          entity?.ratings?.find((e) => e.createdBy === currentUserId)?.star ||
          0,
        avgStar: entity?.avgStar || 0,
        countComments: entity?.countComments || 0,
      },
    );
    const user = await mappingUserInfoById(entity.createdBy);

    return {
      ...dataMapping,
      fullname: user.fullName,
      birthCountry: user.birthCountry,
      city: user.city,
      clubName: user.clubName,
      username: user.username,
      userType: user.type,
      createdBy: user.userId,
      faceImage: user.faceImage,
      bioUrl: user.bioUrl,
      country: user.birthCountry.alpha2Code,
      ageFrom: convertAgeToString(parseInt(dataMapping.ageFrom)),
      ageTo: convertAgeToString(parseInt(dataMapping.ageTo)),
      isPublic: entity?.isPublic,
      isSaved: entity?.bookmarkUserIds.includes(currentUserId),
    };
  }

  async generateResponseV2(
    currentUserId: string,
    type: LibraryType,
    entity: ILibEntity,
  ): Promise<ILibResponse> {
    let response: ILibResponse;
    switch (type) {
      case LibraryType.PROGRAM:
        response = new ProgramResponse();
        break;
      case LibraryType.SESSION:
        response = new SessionResponseDto();
        break;
      case LibraryType.EXERCISE:
        response = new ExerciseResponseDto();
        break;
    }
    const user = await mappingUserInfoById(entity.createdBy);
    const bookmarkUserIds: string[] = entity?.bookmarkUserIds || [];
    const dataMapping = new ObjectMapper().convertValueCheckType(
      entity,
      response,
      {
        id: entity._id.toString(),
        currentUserVoting:
          entity?.ratings?.find((e) => e.createdBy === currentUserId)?.star ||
          0,
        avgStar: entity?.avgStar || 0,
        countComments: entity?.countComments || 0,
      },
    );
    return {
      ...dataMapping,
      ageFrom: convertAgeToString(parseInt(dataMapping.ageFrom)),
      ageTo: convertAgeToString(parseInt(dataMapping.ageTo)),
      fullname: user.fullName,
      birthCountry: user.birthCountry,
      city: user.city,
      clubName: user.clubName,
      username: user.username,
      userType: user.type,
      createdBy: user.userId,
      faceImage: user.faceImage,
      bioUrl: user.bioUrl,
      country: user.birthCountry.alpha2Code,
      isSaved: bookmarkUserIds.includes(currentUserId),
      isPublic: entity?.isPublic,
    };
  }

  createEntityCopy(
    currentUserId: string,
    libRequest: LibRequestDto,
    type: LibraryType,
    indexArr?: ILibEntity[],
  ): ILibEntity {
    var doc: ILibEntity;
    const dateUtil: DateUtil = new DateUtil();
    const index: number = generateIndex(indexArr);
    const optionalObject = {
      _id: new Types.ObjectId(),
      idRoot: libRequest?._id,
      headline: generateNewHeadline(libRequest.headline, index),
      createdBy: currentUserId,
      createdAt: dateUtil.getNowTimeInMilisecond(),
      updatedAt: dateUtil.getNowTimeInMilisecond(),
      avgStar: 0,
      ratings: [],
      bookmarkUserIds: [],
      comments: [],
      index,
    };

    switch (type) {
      case LibraryType.PROGRAM:
        doc = new ObjectMapper().convertValueCheckType<
          LibRequestDto,
          ILibEntity
        >(libRequest, defaultProgram, optionalObject);
        break;

      case LibraryType.SESSION:
        doc = new ObjectMapper().convertValueCheckType<
          LibRequestDto,
          ILibEntity
        >(libRequest, defaultSession, optionalObject);
        break;

      case LibraryType.EXERCISE:
        doc = new ObjectMapper().convertValueCheckType<
          LibRequestDto,
          ILibEntity
        >(libRequest, defaultExercise, optionalObject);
        break;
    }
    return doc;
  }
}
