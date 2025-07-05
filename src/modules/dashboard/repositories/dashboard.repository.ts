import { Query } from '@google-cloud/bigquery';
import * as moment from 'moment';
import {
  BigQueryTable,
  GenderTypes,
  ROLE_BY_GROUP,
} from '../../../common/constants/common.constant';
import { bq } from '../../../config/firebase.config';
import { Role } from '../../diaries/enum/diaries.enum';
import {
  AgeGroup,
  GetLeaderBoardQuery,
  LeaderBoardCategory,
} from '../dto/dashboard.req.dto';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { UserTypes } from '../../users/enum/user-types.enum';

export class DashboardBigQueryService {
  async getCount(queryStr: string) {
    const query = {
      query: `select count(userId) as count from (${
        queryStr + ` group by userId HAVING value > 0`
      })`,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(query);
    const [rows] = await job.getQueryResults();

    const totalCount = rows[0]?.count || 0;

    return totalCount;
  }

  async mappingUserData(rows, count: number) {
    const mappingUserInfo = rows
      .map(async ({ value, userId }) => {
        try {
          const userInfo = await mappingUserInfoById(userId);

          if (userInfo) {
            return { value: +value, userInfo };
          }
          //# WARNING: this comment for backing up later.
          // if (userInfo.type === ('N/A' as UserTypes)) {
          //   return null;
          // } else {
          //   return { value: +value, userInfo };
          // }
        } catch (error) {
          return null;
        }
      })
      .filter((e) => e);

    const data = await Promise.all(mappingUserInfo);
    const result = data.filter((e) => e);

    return {
      data: result,
      count: result.length,
    };
  }

  conditionType(queryStr): 'WHERE' | 'AND' {
    const query = queryStr.includes('WHERE') === true ? 'AND' : 'WHERE';
    return query;
  }

  async getRankNumber(
    currentUserId: string,
    lastDateRange: number,
  ): Promise<number | string> {
    let query = `
    SELECT
      rank
    FROM (
      SELECT
        t.userId,
        t.value,
        RANK() OVER (ORDER BY t.value DESC) AS rank
      FROM (
        SELECT
          json_value(diaries.DATA, '$.userId') AS userId,
          SUM(CAST(json_value(${BigQueryTable.DIARIES}.DATA, '$.training.hoursOfPractice') AS numeric)) AS value,
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        ON
          json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = json_value(users.DATA, '$.userId')
      `;

    if (lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      const toDate = +moment.utc().format('x');

      query += `
        WHERE
        CAST (json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)
        BETWEEN
          ${fromDate}
        AND
          ${toDate}`;
    }

    query += `
      GROUP BY
        userId) AS t) AS rt
      WHERE
        userId = '${currentUserId}'
      ORDER BY
        rank ASC`;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows[0]?.rank || 'no rank';
  }

  async getListLeaderBoards(
    getLeaderBoardQuery: GetLeaderBoardQuery,
    userId?: string,
    select?: string,
    unnest?: string,
    queryCondition?: string,
  ) {
    const promises = [];

    const {
      lastDateRange,
      limit,
      category,
      city,
      clubId,
      country,
      search,
      role,
      sorted,
      startAfter,
      teamId,
      ageGroup,
    } = getLeaderBoardQuery;

    const dir = sorted && sorted.toUpperCase();
    const asValue = 'value';

    let queryStr =
      category === LeaderBoardCategory.REVIEWS
        ? `SELECT ${select}`
        : `SELECT json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') AS userId ${select}`;

    let fromTable = ` 
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}`;

    if (unnest) {
      fromTable += unnest;
    }

    const joinTable = `
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${
      BigQueryTable.USERS
    }_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${
        category === LeaderBoardCategory.REVIEWS
          ? LeaderBoardCategory.REVIEWS
          : `${BigQueryTable.DIARIES}.DATA`
      }, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')`;

    queryStr += fromTable + joinTable;

    if (queryCondition) {
      queryStr += queryCondition;
    }

    if (+lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      const toDate = +moment.utc().format('x');

      queryStr += `\n
      ${this.conditionType(queryStr)}
      CAST
        (json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)
      BETWEEN
        ${fromDate}
      AND
        ${toDate}`;
    }

    if (ageGroup) {
      if (ageGroup !== AgeGroup.ADULT) {
        const gender =
          ageGroup.split('_')[0] === 'B'
            ? GenderTypes.Male
            : GenderTypes.Female;
        const yearOfBirth = ageGroup.split('_')[1];

        queryStr += `\n
      ${this.conditionType(queryStr)}
      SUBSTRING
        (json_value(${
          BigQueryTable.USERS
        }.data, '$.profile.birthDay'), 1, 4) = '${yearOfBirth}'
      AND
        json_value(${
          BigQueryTable.USERS
        }.data, '$.profile.gender') = '${gender.toUpperCase()}'`;
      } else {
        const currentYear = +moment.utc().format('YYYY');
        const ADULT_AGE = 23;

        queryStr += `\n
        ${this.conditionType(queryStr)}
        ${currentYear} - CAST(SUBSTRING (json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.birthDay'), 1, 4) as numeric) > ${ADULT_AGE}
        `;
      }
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

    if (clubId) {
      queryStr += `
      ${this.conditionType(queryStr)}
        (
          json_value(${
            BigQueryTable.USERS
          }.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${
            BigQueryTable.USERS
          }.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (teamId) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        '${teamId}' IN UNNEST(json_value_array(${
        BigQueryTable.USERS
      }.DATA, '$.teamIds'))`;
    }

    if (country) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.city') LIKE '%${country}%'`;
    }

    if (search) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.firstName') LIKE '%${search}%'`;
    }

    if (city) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.city') LIKE '%${city}%'`;
    }

    if (userId) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = '${userId}'`;
    }

    const counting = this.getCount(queryStr);
    promises.push(counting);

    let query = (queryStr += `
    GROUP BY
      userId
    HAVING ${asValue} > 0
    ORDER BY
      ${asValue} ${dir}`);

    query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count);
  }

  async getListLeaderBoardsV2(
    getLeaderBoardQuery: GetLeaderBoardQuery,
    userId?: string,
    select?: string,
    unnest?: string,
    queryCondition?: string,
    fromTable?: string,
    joinOn?: string,
    timeFilter?: string,
  ) {
    const promises = [];

    const {
      lastDateRange,
      limit,
      category,
      city,
      clubId,
      country,
      search,
      role,
      sorted,
      startAfter,
      teamId,
      ageGroup,
    } = getLeaderBoardQuery;

    const dir = sorted && sorted.toUpperCase();
    const asValue = 'value';
    let fromDate: number;
    let toDate: number;

    let queryStr =
      category === LeaderBoardCategory.REVIEWS ||
      category === LeaderBoardCategory.FRIENDS ||
      category === LeaderBoardCategory.FANS
        ? `SELECT ${select}`
        : `SELECT json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') AS userId ${select}`;

    if (unnest) {
      fromTable += unnest;
    }

    const joinTable = `
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    
    ${joinOn}
    `;

    queryStr += fromTable + joinTable;

    if (queryCondition) {
      queryStr += queryCondition;
    }

    if (+lastDateRange > 0 && lastDateRange !== 'All') {
      fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      toDate = +moment.utc().format('x');

      queryStr += `\n
        ${this.conditionType(queryStr)}
        
        ${timeFilter}
  
        BETWEEN
          ${fromDate}
        AND
          ${toDate}
      `;
    }

    if (ageGroup) {
      if (ageGroup !== AgeGroup.ADULT) {
        const gender =
          ageGroup.split('_')[0] === 'B'
            ? GenderTypes.Male
            : GenderTypes.Female;
        const yearOfBirth = ageGroup.split('_')[1];

        queryStr += `\n
      ${this.conditionType(queryStr)}
      SUBSTRING
        (json_value(${
          BigQueryTable.USERS
        }.data, '$.profile.birthDay'), 1, 4) = '${yearOfBirth}'
      AND
        json_value(${
          BigQueryTable.USERS
        }.data, '$.profile.gender') = '${gender.toUpperCase()}'`;
      } else {
        const currentYear = +moment.utc().format('YYYY');
        const ADULT_AGE = 23;

        queryStr += `\n
        ${this.conditionType(queryStr)}
        ${currentYear} - CAST(SUBSTRING (json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.birthDay'), 1, 4) as numeric) > ${ADULT_AGE}
        `;
      }
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

    if (clubId) {
      queryStr += `
      ${this.conditionType(queryStr)}
        (
          json_value(${
            BigQueryTable.USERS
          }.DATA, '$.coachCareer.clubId') = '${clubId}'
        OR
          json_value(${
            BigQueryTable.USERS
          }.DATA, '$.playerCareer.clubId') = '${clubId}'
        )
      `;
    }

    if (teamId) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        '${teamId}' IN UNNEST(json_value_array(${
        BigQueryTable.USERS
      }.DATA, '$.teamIds'))`;
    }

    if (country) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.city') LIKE '%${country}%'`;
    }

    if (search) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.firstName') LIKE '%${search}%'`;
    }

    if (city) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.city') LIKE '%${city}%'`;
    }

    if (userId) {
      queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = '${userId}'`;
    }

    // check not null and not active
    queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${BigQueryTable.USERS}.DATA, "$.deletedAt") IS NULL `;
    queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, "$.account.isActive") != "false" `;
    queryStr += `\n
      ${this.conditionType(queryStr)}
        json_value(${
          BigQueryTable.USERS
        }.DATA, "$.profile.firstName") IS NOT NULL`;

    const counting = this.getCount(queryStr);
    promises.push(counting);

    let query = (queryStr += `
    GROUP BY
      userId
    HAVING ${asValue} > 0
    ORDER BY
      ${asValue} ${dir}`);

    query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;

    console.log(query);

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, count);
  }
}
