import { Query } from '@google-cloud/bigquery';
import { InjectModel } from '@nestjs/mongoose';
import { BigQueryTable } from '../../../common/constants/common.constant';
import { bq } from '../../../config/firebase.config';
import { commonGetCountRows } from '../../../helpers/common-count-rows-bigquery';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import {
  GetListRelationshipsQuery,
  SearchNotFriendQuery,
} from '../dto/friends.req.dto';
import {
  FOLLOW_MODEL,
  FRIEND_MODEL,
  IFollow,
  IFriend,
} from '../schemas/friend.schemas';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { SortBy } from '../../../common/pagination/pagination.dto';

@Injectable()
export class FriendsBigQueryService {
  constructor(
    @InjectModel(FRIEND_MODEL)
    private readonly friendModel?: Model<IFriend>,
    @InjectModel(FOLLOW_MODEL)
    private readonly followModel?: Model<IFollow>,
  ) {}

  async mappingUserData(
    data,
    count: number,
    currentUserId?: string,
    relationship?: boolean,
  ) {
    const mappingUserInfo = data.map(async ({ relationshipId }) => {
      const userInfo = await mappingUserInfoById(
        relationshipId,
        currentUserId,
        relationship,
      );

      return userInfo;
    });

    const result = await Promise.all(mappingUserInfo);

    return { data: result, count };
  }

  async searchUserIsNotFriend(
    currentUserId: string,
    searchNotFriendQuery: SearchNotFriendQuery,
  ) {
    const promises = [];
    const { limit, sorted, startAfter, search } = searchNotFriendQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'ASC';

    let queryStr = `
    SELECT
      ${BigQueryTable.USERS}.document_id AS relationshipId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    WHERE
      ${BigQueryTable.USERS}.document_id NOT IN (
        SELECT
          json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') AS userId
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}
        WHERE
          json_value(${BigQueryTable.FRIENDS}.DATA, '$.userId') = '${currentUserId}')
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.account.isActive') = 'true'
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) IS NOT NULL
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) != ''
    AND
      ${BigQueryTable.USERS}.document_id != '${currentUserId}'
    `;

    if (search) {
      queryStr += `\n
      AND
        LOWER(json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.firstName')) like '%${search
        .trim()
        .toLowerCase()}%'`;
    }

    const counting = commonGetCountRows(queryStr, 'relationshipId');
    promises.push(counting);

    const query = (queryStr += `
      ORDER BY
        LOWER(json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.firstName')) ${dir}
      LIMIT
        ${limit}
      OFFSET
        ${limit * (+startAfter - 1)}
      `);

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count, currentUserId, false);
  }

  async getListFriends(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const promises = [];
    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'ASC';

    let queryStr = `
    SELECT
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') AS relationshipId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}
    INNER JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.userId') = '${currentUserId}'
    AND
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.status') = '${status}'
    `;

    if (clubId) {
      queryStr += `
      AND
        (
          json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (country) {
      queryStr += `\n AND json_value(${BigQueryTable.USERS}.DATA, '$.profile.birthCountry.name') = '${country}'`;
    }

    if (name) {
      queryStr += `\n AND LOWER(json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.firstName')) like '%${name.trim().toLowerCase()}%'`;
    }

    if (role) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    let query = (queryStr += ` \n
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) IS NOT NULL
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) != ''
    ORDER BY
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) ${dir}`);

    const counting = commonGetCountRows(queryStr, 'relationshipId');
    promises.push(counting);

    if (commonGetCountRowsOnly) {
      return commonGetCountRows(query, 'relationshipId');
    }

    // if (startAfter && limit) {
    //   query += `\n limit ${limit} offset ${limit * (startAfter - 1)}`;
    // }
    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count, currentUserId, true);
  }

  async getListFriendsV2(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    console.log('getListFriendsV2_Service', {
      currentUserId,
      getListRelationshipsQuery,
    });

    const conditions1 = [];
    const conditions2 = [];
    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const sort = sorted == SortBy.ASC ? 1 : -1;
    if (currentUserId) {
      conditions1.push({ userId: currentUserId });
    }

    if (status) {
      conditions1.push({ status: status });
    }

    if (clubId) {
      conditions2.push({
        $or: [
          { 'users.coachCareer.clubId': clubId },
          { 'users.playerCareer.clubId': clubId },
        ],
      });
    }

    if (role) {
      conditions2.push({
        'users.type': role,
      });
    }

    if (country) {
      conditions2.push({
        'users.profile.birthCountry.name': country,
      });
    }

    if (name) {
      conditions2.push(
        { 'users.profile.firstName': { $ne: null } },
        { 'users.profile.firstName': { $regex: name, $options: 'i' } },
      );
    }

    const listFriends = await this.friendModel.aggregate([
      {
        $match: {
          $and: conditions1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'relationshipId',
          foreignField: 'userId',
          as: 'users',
        },
      },
      { $unwind: '$users' },
      {
        $set: {
          firstName: {
            $toLower: '$users.profile.firstName',
          },
          lastName: {
            $toLower: '$users.profile.lastName',
          },
        },
      },
      {
        $match:
          conditions2.length > 0
            ? {
                $and: conditions2,
              }
            : {},
      },
      { $sort: { firstName: sort, lastName: sort } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);

    const count = listFriends.length;

    return this.mappingUserData(listFriends, count, currentUserId, true);
  }

  async getListRequestedFriends(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const promises = [];
    const { limit, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'ASC';
    let queryStr = `
    SELECT
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') AS relationshipId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}
    INNER JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.sender') = '${currentUserId}'
    AND
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.userId') = '${currentUserId}'
    AND
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.status') = 'requested'
    `;

    if (clubId) {
      queryStr += `
      AND
        (
          json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (country) {
      queryStr += `\n AND json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') LIKE '%${country}%'`;
    }

    if (name) {
      queryStr += `\n AND LOWER(json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.firstName')) like '%${name.trim().toLowerCase()}%'`;
    }

    if (role) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    let query = (queryStr += ` \n
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) IS NOT NULL
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) != ''
    ORDER BY
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) ${dir}`);

    const counting = commonGetCountRows(queryStr, 'relationshipId');

    promises.push(counting);

    if (commonGetCountRowsOnly) {
      return commonGetCountRows(query, 'relationshipId');
    }

    if (startAfter && limit) {
      query += `\n limit ${limit} offset ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count, currentUserId, true);
  }

  async getListRequestedFriendsV2(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const conditions1 = [];
    const conditions2 = [];

    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;
    const sort = sorted == SortBy.ASC ? 1 : -1;
    if (currentUserId) {
      conditions1.push({ sender: currentUserId }, { userId: currentUserId });
    }

    if (status) {
      conditions1.push({ status: 'requested' });
    }

    if (clubId) {
      conditions2.push({
        $or: [
          { 'users.coachCareer.clubId': clubId },
          { 'users.playerCareer.clubId': clubId },
        ],
      });
    }

    if (role) {
      conditions2.push({
        'users.type': role,
      });
    }

    if (country) {
      conditions2.push({
        'users.profile.birthCountry.name': country,
      });
    }

    const listFriends = await this.friendModel.aggregate([
      {
        $match: {
          $and: conditions1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'relationshipId',
          foreignField: 'userId',
          as: 'users',
        },
      },
      { $unwind: '$users' },
      {
        $set: {
          firstName: {
            $toLower: '$users.profile.firstName',
          },
          lastName: {
            $toLower: '$users.profile.lastName',
          },
        },
      },
      {
        $match: {
          $and: [{ 'users.profile.firstName': { $ne: null } }, ...conditions2],
        },
      },
      { $sort: { firstName: sort, lastName: sort } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);

    const count = listFriends.length;

    return this.mappingUserData(listFriends, count, currentUserId, true);
  }

  async getListFriendRequest(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const promises = [];

    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'ASC';
    let queryStr = `
    SELECT
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') AS relationshipId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}
    INNER JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.userId') = '${currentUserId}'
    AND
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.sender') != '${currentUserId}'
    AND
      json_value(${BigQueryTable.FRIENDS}.DATA, '$.status') = '${status}'
    `;

    if (clubId) {
      queryStr += `
      AND
        (
          json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (country) {
      queryStr += `\n AND json_value(${BigQueryTable.USERS}.DATA, '$.profile.birthCountry.name') = '${country}'`;
    }

    if (name) {
      queryStr += `\n AND LOWER(json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.firstName')) like '%${name.trim().toLowerCase()}%'`;
    }

    if (role) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    let query = (queryStr += ` \n
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) IS NOT NULL
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) != ''
    ORDER BY
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) ${dir}`);

    const counting = commonGetCountRows(queryStr, 'relationshipId');

    promises.push(counting);

    if (commonGetCountRowsOnly) {
      return commonGetCountRows(query, 'relationshipId');
    }

    if (startAfter && limit) {
      query += `\n limit ${limit} offset ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count, currentUserId, true);
  }

  async getListFriendRequestV2(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const conditions1 = [];
    const conditions2 = [];

    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;
    const sort = sorted == SortBy.ASC ? 1 : -1;
    if (currentUserId) {
      conditions1.push(
        { sender: { $ne: currentUserId } },
        { userId: currentUserId },
      );
    }

    if (status) {
      conditions1.push({ status: 'requested' });
    }

    if (clubId) {
      conditions2.push({
        $or: [
          { 'users.coachCareer.clubId': clubId },
          { 'users.playerCareer.clubId': clubId },
        ],
      });
    }

    if (role) {
      conditions2.push({
        'users.type': role,
      });
    }

    if (country) {
      conditions2.push({
        'users.profile.birthCountry.name': country,
      });
    }
    const listFriends = await this.friendModel.aggregate([
      {
        $match: {
          $and: conditions1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'relationshipId',
          foreignField: 'userId',
          as: 'users',
        },
      },
      { $unwind: '$users' },
      {
        $set: {
          firstName: {
            $toLower: '$users.profile.firstName',
          },
          lastName: {
            $toLower: '$users.profile.lastName',
          },
        },
      },
      {
        $match: {
          $and: [{ 'users.profile.firstName': { $ne: null } }, ...conditions2],
        },
      },
      { $sort: { firstName: sort, lastName: sort } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);

    const count = listFriends.length;

    return this.mappingUserData(listFriends, count, currentUserId, true);
  }

  async getListFollowed(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const promises = [];

    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'ASC';
    let queryStr = `
    SELECT
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.relationshipId') AS relationshipId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FOLLOWS}_raw_latest\` AS ${BigQueryTable.FOLLOWS}
    INNER JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.relationshipId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.userId') = '${currentUserId}'
    AND
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.status') = '${status}'
    `;

    if (clubId) {
      queryStr += `
      AND
        (
          json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (country) {
      queryStr += `\n AND json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') LIKE '%${country}%'`;
    }

    if (name) {
      queryStr += `\n AND LOWER(json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.firstName')) like '%${name.trim().toLowerCase()}%'`;
    }

    if (role) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    let query = (queryStr += ` \n
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) IS NOT NULL
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) != ''
    ORDER BY
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) ${dir}`);

    const counting = commonGetCountRows(queryStr, 'relationshipId');

    promises.push(counting);

    if (commonGetCountRowsOnly) {
      return commonGetCountRows(query, 'relationshipId');
    }

    if (startAfter && limit) {
      query += `\n limit ${limit} offset ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);

    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count, currentUserId, true);
  }

  async getListFollowedV2(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const conditions1 = [];
    const conditions2 = [];
    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const sort = sorted == SortBy.ASC ? 1 : -1;
    if (currentUserId) {
      conditions1.push({ userId: currentUserId });
    }

    if (status) {
      conditions1.push({ status: status });
    }

    if (clubId) {
      conditions2.push({
        $or: [
          { 'users.coachCareer.clubId': clubId },
          { 'users.playerCareer.clubId': clubId },
        ],
      });
    }

    if (role) {
      conditions2.push({
        'users.type': role,
      });
    }

    if (country) {
      conditions2.push({
        'users.profile.birthCountry.name': country,
      });
    }

    if (name) {
      conditions2.push(
        { 'users.profile.firstName': { $ne: null } },
        { 'users.profile.firstName': { $regex: name, $options: 'i' } },
      );
    }

    const listFollowed = await this.followModel.aggregate([
      {
        $match: {
          $and: conditions1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'relationshipId',
          foreignField: 'userId',
          as: 'users',
        },
      },
      { $unwind: '$users' },
      {
        $set: {
          firstName: {
            $toLower: '$users.profile.firstName',
          },
          lastName: {
            $toLower: '$users.profile.lastName',
          },
        },
      },
      {
        $match:
          conditions2.length > 0
            ? {
                $and: conditions2,
              }
            : {},
      },
      { $sort: { firstName: sort, lastName: sort } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);
    const count = listFollowed.length;

    return this.mappingUserData(listFollowed, count, currentUserId, true);
  }

  async getListFans(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const promises = [];

    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'ASC';

    let queryStr = `
    SELECT
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.userId') AS relationshipId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FOLLOWS}_raw_latest\` AS ${BigQueryTable.FOLLOWS}
    INNER JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.FOLLOWS}.DATA, '$.relationshipId') = '${currentUserId}'
    AND json_value(${BigQueryTable.FOLLOWS}.DATA, '$.status') = '${status}'
    `;

    if (clubId) {
      queryStr += `
      AND
        (
          json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (country) {
      queryStr += `\n AND json_value(${BigQueryTable.USERS}.DATA, '$.profile.birthCountry.name') = '${country}'`;
    }

    if (name) {
      queryStr += `\n AND LOWER(json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.firstName')) like '%${name.trim().toLowerCase()}%'`;
    }

    if (role) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    let query = (queryStr += ` \n
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) IS NOT NULL
    AND
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) != ''
    ORDER BY
      LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) ${dir}`);

    const counting = commonGetCountRows(queryStr, 'relationshipId');

    promises.push(counting);

    if (commonGetCountRowsOnly) {
      return commonGetCountRows(query, 'relationshipId');
    }

    if (startAfter && limit) {
      query += `\n limit ${limit} offset ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);

    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count, currentUserId, true);
  }

  async getListFansV2(
    currentUserId: string,
    getListRelationshipsQuery: GetListRelationshipsQuery,
    commonGetCountRowsOnly = false,
  ) {
    const conditions1 = [];
    const conditions2 = [];

    const { limit, status, clubId, country, sorted, startAfter, name, role } =
      getListRelationshipsQuery;

    const sort = sorted == SortBy.ASC ? 1 : -1;
    if (currentUserId) {
      conditions1.push({ relationshipId: currentUserId });
    }

    if (status) {
      conditions1.push({ status: status });
    }

    if (clubId) {
      conditions2.push({
        $or: [
          { 'users.coachCareer.clubId': clubId },
          { 'users.playerCareer.clubId': clubId },
        ],
      });
    }

    if (role) {
      conditions2.push({
        'users.type': role,
      });
    }

    if (country) {
      conditions2.push({
        'users.profile.birthCountry.name': country,
      });
    }

    if (name) {
      conditions2.push(
        { 'users.profile.firstName': { $ne: null } },
        { 'users.profile.firstName': { $regex: name, $options: 'i' } },
      );
    }

    const listFans = await this.followModel.aggregate([
      {
        $match: {
          $and: conditions1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'users',
        },
      },
      { $unwind: '$users' },
      {
        $set: {
          firstName: {
            $toLower: '$users.profile.firstName',
          },
          lastName: {
            $toLower: '$users.profile.lastName',
          },
          relationshipId: '$userId',
        },
      },
      {
        $match:
          conditions2.length > 0
            ? {
                $and: conditions2,
              }
            : {},
      },
      { $sort: { firstName: sort, lastName: sort } },
      { $limit: +startAfter * +limit },
      { $skip: +startAfter * +limit - limit },
    ]);
    const count = listFans.length;
    return this.mappingUserData(listFans, count, currentUserId, true);
  }
}
