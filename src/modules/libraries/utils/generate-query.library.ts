import { AgeGroup } from '../../dashboard/dto/dashboard.req.dto';
import { EShareWith } from '../../programs/enums/share.status';
import { GetLibRequestDto } from '../dto/request/get-lib.request.dto';
import { LibraryTab } from '../enum/library.tab';
import { LibraryFieldSort, LibraryFilter } from '../enum/sort-library';

export const genQuerySort = (librarySort: LibraryFieldSort) => {
  const result: any = {};
  const [fieldSort, sort] = librarySort.split('_');
  const sortValue = sort === 'ASC' ? 1 : -1;
  switch (fieldSort) {
    case LibraryFilter.NAME:
      result['nameLibrary'] = sortValue;
      break;

    case LibraryFilter.CREATOR:
      result['username'] = sortValue;
      break;

    default:
      result['createdAt'] = sortValue;
      break;
  }
  if (!result['createdAt']) result['createdAt'] = -1;
  return result;
};

export const genQueryStrLib = (
  currentUserId: string,
  getRequest: GetLibRequestDto,
  tab: LibraryTab,
) => {
  const {
    ageGroup,
    clubId,
    country,
    role,
    location,
    userId,
    headline,
    isAdmin,
  } = getRequest;
  const matchQueryStr = {
    isDeleted: false,
    isPublic: true,
    ...(!isAdmin && {
      $expr: {
        $cond: {
          if: { $eq: ['$createdBy', currentUserId] },
          then: true,
          else: { $eq: ['$shareWith', EShareWith.ALL] },
        },
      },
    }),
  };

  if (tab === LibraryTab.SAVED) {
    matchQueryStr['bookmarkUserIds'] = { $in: [currentUserId] };
  } else if (tab === LibraryTab.YOURS) {
    matchQueryStr['createdBy'] = currentUserId;
    if (headline) matchQueryStr['headline'] = headline;
    delete matchQueryStr.isPublic;
  } else if (tab === LibraryTab.ALL) {
  } else {
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

  if (!isAdmin) {
    if (role) matchQueryStr['role'] = { $in: [role] };
    if (userId) matchQueryStr['createdBy'] = userId;
  }

  return matchQueryStr;
};

export const pipelineGetLibrary = (
  matchQueryStr: any,
  skip: number,
  limit: number,
  sortQueryStr?: any,
) => {
  const match = matchQueryStr;
  const pipeline = [
    { $match: match },

    {
      $lookup: {
        from: 'comments',
        localField: '_id',
        foreignField: 'typeId',
        as: 'comments',
      },
    },
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
      $addFields: {
        countComments: { $size: '$comments' },
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
        nameLibrary: { $toLower: '$headline' },
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
        clubs: 0,
      },
    },
  ];

  return pipeline;
};
