import { Query } from '@google-cloud/bigquery';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  BigQueryTable,
  ROLE_BY_GROUP,
} from '../../../common/constants/common.constant';
import { bq } from '../../../config/firebase.config';
import { commonGetCountRows } from '../../../helpers/common-count-rows-bigquery';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { GetListContactQuery } from '../../contact-groups/dto/contact-groups.req.dto';
import { Role } from '../../diaries/enum/diaries.enum';
import {
  GetTeamByIdQuery,
  JoinTeamStatus,
  TeamMemberType,
  TeamTab,
} from '../dto/teams.req.dto';

export class TeamsBigQueryService {
  conditionType(queryStr): 'WHERE' | 'AND' {
    const query = queryStr.includes('WHERE') === true ? 'AND' : 'WHERE';
    return query;
  }

  async mappingUserData(data: any[], currentUserId: string, count: number) {
    const mappingUserInfo = data.map(async ({ userId, memberType }) => {
      const userInfo = await mappingUserInfoById(userId, currentUserId, true);

      return { ...userInfo, memberType };
    });

    const result = await Promise.all(mappingUserInfo);

    return { data: result, count };
  }

  async countTeamMember(query: string): Promise<number> {
    const options = {
      query: `select count(userId) as count from (${query})`,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows[0].count;
  }

  async getListTeams(
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
      ${BigQueryTable.TEAMS}.document_id as teamId,
      json_value(${BigQueryTable.TEAMS}.DATA, '$.teamName') as name
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.TEAMS}_raw_latest\` AS ${BigQueryTable.TEAMS}
    `;

    if (joinTable.length) {
      joinTable.map((join) => {
        queryStr += join;
      });
    } else {
      queryStr += `
      LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
      ON
        ${BigQueryTable.TEAMS}.document_id = json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId')
      LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.CLUBS}_raw_latest\` AS ${BigQueryTable.CLUBS}
      ON
        json_value(${BigQueryTable.TEAMS}.data, '$.clubId') = ${BigQueryTable.CLUBS}.document_id
      `;
    }

    if (conditions.length) {
      conditions.map((cond) => {
        queryStr += `\n ${this.conditionType(queryStr)} ${cond}`;
      });
    }

    const counting = commonGetCountRows(queryStr, 'teamId');
    promises.push(counting);

    const query = (queryStr += ` \n
    ORDER BY
        name
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
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const promises = [];

    const { limit, sorted, startAfter, tab, role } = getTeamByIdQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tab === TeamTab.BLOCK) {
      return this.getListMemberTeamBlocked(
        currentUserId,
        teamId,
        getTeamByIdQuery,
      );
    }

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const status =
      tab === TeamTab.REQUEST
        ? JoinTeamStatus.PENDING
        : JoinTeamStatus.ACCEPTED;

    let queryStr = `
    SELECT DISTINCT
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') AS userId,
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.memberType') as memberType,
      json_value(users.DATA, '$.profile.firstName') as firstName,
      json_value(users.DATA, '$.profile.lastName') as lastName,
      json_value(users.data, '$.type') as type
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      ${BigQueryTable.USERS}.document_id = json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId') = '${teamId}'
    AND
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.status') = '${status}'
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    
    `;

    if (tab === TeamTab.ADMIN) {
      queryStr += `
    AND
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.memberType') IN ('${TeamMemberType.OWNER}', '${TeamMemberType.ADMIN}')
    `;
    }

    if (tab === TeamTab.OWNER) {
      queryStr += `
    AND
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.memberType') = '${TeamMemberType.OWNER}'
    `;
    }

    if (role) {
      if ([Role.DEFENDERS, Role.MIDFIELDERS, Role.FORWARDS].includes(role)) {
        const roles = ROLE_BY_GROUP(role);

        queryStr += `\n
        ${this.conditionType(queryStr)}
          '${roles[0]}' IN UNNEST(json_value_array(${
          BigQueryTable.USERS
        }.DATA, '$.playerCareer.favoriteRoles'))`;

        roles.splice(0, 1).map((role) => {
          queryStr += `\n
          OR
            '${role}' IN UNNEST(json_value_array(${BigQueryTable.USERS}.DATA, '$.playerCareer.favoriteRoles'))`;
        });
      } else {
        queryStr += `\n
        ${this.conditionType(queryStr)}
          '${role}' IN UNNEST(json_value_array(${
          BigQueryTable.USERS
        }.DATA, '$.playerCareer.favoriteRoles'))
        OR
          json_value(${
            BigQueryTable.USERS
          }.DATA, '$.coachCareer.role') = '${role}'`;
      }
    }

    const counting = this.countTeamMember(queryStr);
    promises.push(counting);

    const query = (queryStr += `
    ORDER BY
      firstName,
      lastName,
      type,
      userId,
      memberType ${dir}
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

  async getListMemberTeamBlocked(
    currentUserId: string,
    teamId: string,
    getTeamByIdQuery: GetTeamByIdQuery,
  ) {
    const promises = [];
    const { limit, sorted, startAfter } = getTeamByIdQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    let queryStr = `
    SELECT
      json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.userId') AS userId,
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.BLACKLISTS}_raw_latest\` AS ${BigQueryTable.BLACKLISTS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      ${BigQueryTable.USERS}.document_id = json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.userId')
    WHERE
      json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.teamId') = '${teamId}'
    AND
      json_value(${BigQueryTable.BLACKLISTS}.DATA, '$.isDeleted') = 'false'
    `;

    const counting = this.countTeamMember(queryStr);
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

  async getListTeammates(
    currentUserId,
    getListContactQuery: GetListContactQuery,
  ) {
    const promises = [];
    const { limit, startAfter, teamId, clubId, role, search, country, sorted } =
      getListContactQuery;

    if (+startAfter <= 0 || !startAfter) {
      throw new HttpException(
        'The number of page size must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const { teamIds } = await mappingUserInfoById(currentUserId);

    const curTeamIds = teamIds.join("','");

    let queryStr = `
    SELECT
    DISTINCT
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') as userId,
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') AS firstName
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') = ${BigQueryTable.USERS}.document_id
    WHERE
      json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.status') = '${JoinTeamStatus.ACCEPTED}'
    AND
      ${BigQueryTable.USERS}.document_id != '${currentUserId}'
    `;

    if (!teamId) {
      queryStr += `
      AND
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId') IN ('${curTeamIds}')
      `;
    } else {
      queryStr += `
      AND
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId') = ('${teamId}')
      `;
    }

    if (search) {
      queryStr += `
      AND
      LOWER(json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.firstName')) like '%${search.trim().toLowerCase()}%'`;
    }

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
      queryStr += `AND json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') LIKE '%${country}%'`;
    }

    if (role) {
      queryStr += `AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    const counting = this.countTeamMember(queryStr);
    promises.push(counting);

    const query = (queryStr += `
    ORDER BY
      firstName ${dir}`);
    // LIMIT
    //   ${+limit}
    // OFFSET
    //   ${+limit * (+startAfter - 1)}`);

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
