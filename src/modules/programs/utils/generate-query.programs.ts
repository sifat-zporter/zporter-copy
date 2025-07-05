import { SortBy } from '../../../common/pagination/pagination.dto';
import { AgeGroup } from '../../dashboard/dto/dashboard.req.dto';
import { GetUserProgramRequest } from '../dtos/user-exercise/request/get-user-program.request';
import { ProgressStatus } from '../enums/progress.status';
import { EShareWith } from '../enums/share.status';
import { ProgramsFieldSort, ProgramsFilter } from '../enums/sort-program';
import { TargetType } from '../enums/target.type';
import { UserProgramTab } from '../enums/user-program-tab';
import { Types } from 'mongoose';

export const genQuerySort = (programSort: ProgramsFieldSort) => {
  const result: Object = {};
  const [fieldSort, sort] = programSort.split('_');
  const sortValue = sort === 'ASC' ? 1 : -1;
  switch (fieldSort) {
    case ProgramsFilter.POPULAR:
      result['countUserPrograms'] = sortValue;
      break;
    case ProgramsFilter.NAME:
      result['nameProgram'] = sortValue;
      break;

    case ProgramsFilter.CREATOR:
      result['username'] = sortValue;
      break;

    default:
      result['createdAt'] = sortValue;
      break;
  }
  if (!result['createdAt']) result['createdAt'] = -1;
  return result;
};

export const genQueryStr = (
  currentUserId: string,
  getRequest: GetUserProgramRequest,
) => {
  const { tab, ageGroup, clubId, country, location, role, programSort } =
    getRequest;

  const matchQueryStr = {
    isDeleted: false,
    isPublic: true,
    isOldVersion: false,

    $expr: {
      $cond: {
        if: { $eq: ['$createdBy', currentUserId] },
        then: true,
        else: { $eq: ['$shareWith', EShareWith.ALL] },
      },
    },
  };

  if (tab === UserProgramTab.SAVED) {
    matchQueryStr['bookmarkUserIds'] = { $in: [currentUserId] };
  } else if (tab === UserProgramTab.YOURS) {
    matchQueryStr['createdBy'] = currentUserId;
    delete matchQueryStr.isPublic;
  } else if (tab === UserProgramTab.DONE) {
    matchQueryStr['programDone'] = true;
    delete matchQueryStr['isOldVersion'];
  } else if (tab === UserProgramTab.ACTIVE) {
    matchQueryStr['programActive'] = true;
    delete matchQueryStr['isOldVersion'];
  } else if (tab !== UserProgramTab.NEW) {
    matchQueryStr['mainCategory'] = tab;
  }

  if (ageGroup) {
    const yearOfBirth =
      ageGroup === AgeGroup.ADULT ? 'ALL' : ageGroup.slice(-4);

    if (yearOfBirth !== 'ALL')
      matchQueryStr['$or'] = [
        { ageFrom: { $lte: new Date().getFullYear() - +yearOfBirth } },
        { ageTo: { $gte: new Date().getFullYear() - +yearOfBirth } },
      ];
  }

  if (clubId) matchQueryStr['clubId'] = clubId;
  if (country) matchQueryStr['country'] = country;
  if (location)
    matchQueryStr['location'] =
      location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();

  if (role) matchQueryStr['role'] = { $in: [role] };

  return matchQueryStr;
};

export const pipelineGetprogram = (
  matchQueryStr: any,
  sortQueryStr: Object,
  currentUserId: string,
  skip: number,
  limit: number,
) => {
  let match = matchQueryStr;
  const listLookups = [];
  const conditionListLookups = [
    { $eq: ['$userId', currentUserId] },
    { $eq: ['$programId', '$$program_id'] },
    { $eq: ['$targetType', TargetType.PROGRAM] },
  ];

  if (matchQueryStr['programDone']) {
    delete matchQueryStr['programDone'];

    match = {
      ...matchQueryStr,
      $expr: {
        $and: [{ $eq: [{ $arrayElemAt: ['$status.status', 0] }, 'DONE'] }],
      },
    };
    conditionListLookups.push({ $eq: ['$status', ProgressStatus.DONE] });
  }

  if (matchQueryStr['programActive']) {
    delete matchQueryStr['programActive'];

    match = {
      ...matchQueryStr,
      $expr: {
        $and: [{ $eq: [{ $arrayElemAt: ['$status.status', 0] }, 'ACTIVE'] }],
      },
    };

    conditionListLookups.push(
      { $eq: ['$status', ProgressStatus.ACTIVE] },
      { $eq: ['$userId', currentUserId] },
    );
  }

  listLookups.push({
    $lookup: {
      from: 'program_user_datas',
      let: {
        program_id: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: conditionListLookups,
            },
          },
        },
      ],
      as: 'status',
    },
  });

  const pipeline = [
    ...listLookups,
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
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
      $lookup: {
        from: 'clubs',
        localField: 'user.coachCareer.clubId',
        foreignField: 'clubId',
        as: 'clubs',
      },
    },
    {
      $unwind: {
        path: '$clubs',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'comments',
        localField: '_id',
        foreignField: 'typeId',
        as: 'comments',
      },
    },
    {
      $addFields: {
        programStatus: { $arrayElemAt: ['$status.status', 0] },
        countUserPrograms: { $size: '$status.status' },
        countComments: { $size: '$comments' },
        nameProgram: { $toLower: '$headline' },
        id: '$_id',
        faceImage: {
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
        type: '$user.type',
        firstName: '$user.profile.firstName',
        lastName: '$user.profile.lastName',
        username: '$user.username',
        fullname: {
          $concat: ['$user.profile.firstName', ' ', '$user.profile.lastName'],
        },
        userType: '$user.type',
        city: '$user.profile.city',
        country: '$user.profile.birthCountry.name',
        clubName: '$clubs.clubName',
        birthCountry: '$user.profile.birthCountry',
        isActive: {
          $anyElementTrue: {
            $map: {
              input: '$status',
              in: {
                $eq: ['$$this.status', 'ACTIVE'],
              },
            },
          },
        },
      },
    },
    {
      $sort: sortQueryStr,
    },
    {
      $skip: skip,
    },
    {
      $limit: +limit,
    },
    {
      $project: {
        user: 0,
        comments: 0,
        status: 0,
        clubs: 0,
      },
    },
  ];

  return pipeline;
};

export const generatePipelineGet = (
  currentUserId: string,
  type: TargetType,
  id: string,
  skip = 0,
  limit = 99,
  sorted = SortBy.DESC,
) => {
  const match = new Object();
  match[`${type.toLowerCase()}Id`] = new Types.ObjectId(id);
  match['isDeleted'] = false;
  match['$expr'] = {
    $cond: {
      if: { $eq: ['$createdBy', currentUserId] },
      then: true,
      else: { $eq: ['$shareWith', EShareWith.ALL] },
    },
  };
  const pipeline: any[] = [
    { $match: match },
    {
      $sort: {
        order: 1,
        createdAt: sorted == SortBy.DESC ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: +limit,
    },
  ];

  return pipeline;
};

export const getNextSessionByProgramId = (
  currentUserId: string,
  programId: Types.ObjectId,
  sessionId: Types.ObjectId,
  order: number,
) => {
  const match = new Object();
  match['$expr'] = {
    $cond: {
      if: { $eq: ['$createdBy', currentUserId] },
      then: true,
      else: { $eq: ['$shareWith', EShareWith.ALL] },
    },
  };
  match['sessionId'] = { $ne: { sessionId } };
  match['programId'] = programId;
  match['isDeleted'] = false;
  match['order'] = { $gt: order };
  const pipeline: any[] = [
    { $match: match },
    { $sort: { order: 1 } },
    {
      $limit: 1,
    },
  ];

  return pipeline;
};
