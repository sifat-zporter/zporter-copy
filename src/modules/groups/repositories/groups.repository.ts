import { commonGetCountRows } from '../../../helpers/common-count-rows-bigquery';
import { Query } from '@google-cloud/bigquery';
import { HttpException, HttpStatus } from '@nestjs/common';
import { BigQueryTable } from '../../../common/constants/common.constant';
import { bq } from '../../../config/firebase.config';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { GetListContactQuery } from '../../contact-groups/dto/contact-groups.req.dto';
import {
  GetGroupByIdQuery,
  GroupMemberType,
  GroupTab,
  JoinGroupStatus,
} from '../dto/group.req.dto';

export class GroupsBigQueryService {
  conditionType(queryStr): 'WHERE' | 'AND' {
    const query = queryStr.includes('WHERE') === true ? 'AND' : 'WHERE';
    return query;
  }

  async mappingUserData(data, currentUserId: string, count: number) {
    const mappingUserInfo = data.map(async ({ userId, memberType }) => {
      const userInfo = await mappingUserInfoById(userId, currentUserId, true);

      return { ...userInfo, memberType };
    });

    const result = await Promise.all(mappingUserInfo);

    return { data: result, count };
  }

  async countGroupMember(query: string): Promise<number> {
    const options = {
      query: `select count(userId) as count from (${query})`,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows[0].count;
  }

  async getListGroups(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
    joinTable?: string[],
    conditions?: string[],
  ) {
    const promises = [];
    const { limit, startAfter, sorted } = getListContactQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    let queryStr = `
    SELECT DISTINCT
      ${BigQueryTable.GROUPS}.document_id as groupId,
      json_value(${BigQueryTable.GROUPS}.DATA, '$.name') as name,
      json_value(${BigQueryTable.GROUPS}.DATA, '$.createdAt') as createdAt
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.groups_raw_latest\` AS ${BigQueryTable.GROUPS}
    `;

    if (joinTable.length) {
      joinTable.map((join) => {
        queryStr += join;
      });
    } else {
      queryStr += `
      LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_GROUPS}_raw_latest\` AS ${BigQueryTable.USERS_GROUPS}
      ON
        ${BigQueryTable.GROUPS}.document_id = json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.groupId')
      `;
    }

    if (conditions.length) {
      conditions.map((cond) => {
        queryStr += `\n ${this.conditionType(queryStr)} ${cond}`;
      });
    } else if (currentUserId !== 'unknown') {
      /**
       * BEFORE: result about group which currentUser joined in
       * NOW: delete it for showing all group from all of countries and clubs.
       */
      // queryStr += `
      // WHERE
      //   json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.status') = '${JoinGroupStatus.ACCEPTED}'
      // AND
      //   json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.userId') = '${currentUserId}'`;
    }

    const counting = commonGetCountRows(queryStr, 'groupId');
    promises.push(counting);

    const query = (queryStr += ` \n
    ORDER BY
      createdAt
        ${dir}
    LIMIT
        ${+limit}
    OFFSET
        ${+limit * (+startAfter - 1)}`);

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return { rows, count };
  }

  async getListMembers(
    currentUserId: string,
    groupId: string,
    getGroupByIdQuery: GetGroupByIdQuery,
  ) {
    const promises = [];
    const { limit, sorted, startAfter, tab } = getGroupByIdQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tab === GroupTab.BLOCK) {
      return this.getListMemberGroupBlocked(
        currentUserId,
        groupId,
        getGroupByIdQuery,
      );
    }

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const status =
      tab === GroupTab.REQUEST
        ? JoinGroupStatus.PENDING
        : JoinGroupStatus.ACCEPTED;

    let queryStr = `
    SELECT
      json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.userId') AS userId,
      json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.memberType') as memberType
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_GROUPS}_raw_latest\` AS ${BigQueryTable.USERS_GROUPS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      ${BigQueryTable.USERS}.document_id = json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.groupId') = '${groupId}'
    AND
      json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.status') = '${status}'
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.account.isActive') = 'true'
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.username') IS NOT NULL
    `;

    if (tab === GroupTab.ADMIN) {
      queryStr += `
    AND
      json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.memberType') IN ('${GroupMemberType.OWNER}', '${GroupMemberType.ADMIN}')
    `;
    }

    if (tab === GroupTab.OWNER) {
      queryStr += `
    AND
      json_value(${BigQueryTable.USERS_GROUPS}.DATA, '$.memberType') = '${GroupMemberType.OWNER}'
    `;
    }

    const counting = this.countGroupMember(queryStr);
    promises.push(counting);

    const query = (queryStr += `
    ORDER BY
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName'),
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.lastName'),
      json_value(${BigQueryTable.USERS}.data, '$.type') ${dir}
    LIMIT
      ${+limit}
    OFFSET
      ${+limit * (+startAfter - 1)}`);

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, currentUserId, count);
  }

  async getListMemberGroupBlocked(
    currentUserId: string,
    groupId: string,
    getGroupByIdQuery: GetGroupByIdQuery,
  ) {
    const promises = [];
    const { limit, sorted, startAfter } = getGroupByIdQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    let queryStr = `
    SELECT
      json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.userId') AS userId
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.BLACKLISTS}_raw_latest\` AS ${BigQueryTable.BLACKLISTS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      ${BigQueryTable.USERS}.document_id = json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.groupId') = '${groupId}'
    AND
      json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.isDeleted') = 'false'
    `;

    const counting = this.countGroupMember(queryStr);
    promises.push(counting);

    const query = (queryStr += `
    ORDER BY
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName'),
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.lastName'),
      json_value(${BigQueryTable.USERS}.data, '$.type') ${dir}
    LIMIT
      ${+limit}
    OFFSET
      ${+limit * (+startAfter - 1)}`);

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, currentUserId, count);
  }
}
