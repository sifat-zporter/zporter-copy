import { Query } from '@google-cloud/bigquery';
import { BigQueryTable } from '../../../common/constants/common.constant';
import { bq } from '../../../config/firebase.config';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { QueryBioForFlippingDto } from '../dto/query-bio-for-flipping.dto';
import { JoinTeamStatus } from './../../clubs/enum/club.enum';
import { Status } from './../../friends/enum/friend.enum';
import * as moment from 'moment';

export class BiographyBigQueryService {
  async mappingUserData(data: { userId: string; value: number }[]) {
    const mappingUserInfo = data.map(async (doc) => {
      if (doc.userId) {
        const userInfo = await mappingUserInfoById(doc.userId);

        return { ...doc, value: +doc.value, userInfo };
      }
    });

    const result = await Promise.all(mappingUserInfo);

    return result;
  }

  async getCountUserForFlipping(query: string) {
    const optionsQueryCount = {
      query: `select count(userId) as count from (${query})`,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(optionsQueryCount);
    const [rows] = await job.getQueryResults();

    const totalCount = rows[0]?.count || 0;

    return totalCount;
  }

  async getListUsersForFlipping(
    currentUserId: string,
    queryBioForFlippingDto: QueryBioForFlippingDto,
  ) {
    const promises = [];
    const { pageSize, pageNumber, query } = queryBioForFlippingDto;

    const userInfo = await mappingUserInfoById(currentUserId);

    const city = userInfo.city;
    const yearOfBirth = userInfo.birthDay.substring(0, 4);
    const country = userInfo.birthCountry.name;
    const teamIds = userInfo.teamIds.join("','");

    let queryStr = `
    SELECT
    DISTINCT
        ${BigQueryTable.USERS}.document_id as userId,
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') AS name
    FROM
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${
      BigQueryTable.USERS
    }_raw_latest\` AS ${BigQueryTable.USERS}
    ${
      !query
        ? `LEFT JOIN
    \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FRIENDS}_raw_latest\` AS ${BigQueryTable.FRIENDS}
    ON
        json_value(${BigQueryTable.FRIENDS}.DATA, '$.relationshipId') = ${BigQueryTable.USERS}.document_id
    LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.FOLLOWS}_raw_latest\` AS ${BigQueryTable.FOLLOWS}
    ON
        json_value(${BigQueryTable.FOLLOWS}.DATA, '$.relationshipId') = ${BigQueryTable.USERS}.document_id
    LEFT JOIN
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
    ON
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') = ${BigQueryTable.USERS}.document_id
    WHERE
        CAST(json_value(${BigQueryTable.USERS}.DATA, '$.deletedAt') AS numeric) < 0
    AND
        json_value(${BigQueryTable.FRIENDS}.DATA, '$.userId') = '${currentUserId}'
    AND
        json_value(${BigQueryTable.FRIENDS}.DATA, '$.status') = '${Status.ACCEPTED}'
    OR
        json_value(${BigQueryTable.FOLLOWS}.DATA, '$.userId') = '${currentUserId}'
    AND
        json_value(${BigQueryTable.FOLLOWS}.DATA, '$.status') = '${Status.ACCEPTED}'
    OR
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.status') = '${JoinTeamStatus.ACCEPTED}'
    AND
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.teamId') IN ('${teamIds}')
    AND
        json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') != '${currentUserId}'
    OR
        SUBSTRING(json_value(${BigQueryTable.USERS}.DATA,'$.profile.birthDay'), 1, 4) = '${yearOfBirth}'
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') != ''
    OR
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') LIKE '%${city}%'
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') != ''
    OR
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') LIKE '%${country}%'
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') != ''`
        : ''
    }
    `;

    if (query) {
      queryStr += `\n
    WHERE LOWER(json_value(${
      BigQueryTable.USERS
    }.DATA, '$.profile.firstName')) like '%${query.trim().toLowerCase()}%'
    AND
        json_value(${
          BigQueryTable.USERS
        }.DATA, '$.profile.firstName') IS NOT NULL
    AND
        json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') != ''
    `;
    }

    const counting = this.getCountUserForFlipping(queryStr);
    promises.push(counting);

    const finalQuery = (queryStr += `\n
    ORDER BY
    name ASC
    LIMIT
        ${pageSize}
    OFFSET
        ${pageSize * (pageNumber - 1)}
    `);

    const options: Query = {
      query: finalQuery,
      location: process.env.REGION,
    };

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return { rows, count, pageSize, pageNumber };
  }

  async getVisitorLeaderBoard() {
    const query = `
    SELECT
        json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.visitorId') AS userId,
    COUNT(json_query(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.visitorId')) AS value
    FROM
    \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.VIEW_BIOGRAPHIES}_raw_latest\` AS ${BigQueryTable.VIEW_BIOGRAPHIES}
    LEFT JOIN
    \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS users
    ON
        json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.visitorId') = json_value(users.DATA, '$.userId')
    GROUP BY
        userId
    HAVING
        value > 0
    ORDER BY
        value ASC
    LIMIT
        10
    OFFSET
        0
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows);
  }

  async countVisitBiographies(
    currentUserId: string,
    lastDateRange: number,
  ): Promise<number | string> {
    let query = `
    SELECT
        COUNT(*) AS count
    FROM (
        SELECT
            json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.guestId') AS userId,
        FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.VIEW_BIOGRAPHIES}_raw_latest\` AS ${BigQueryTable.VIEW_BIOGRAPHIES}
        LEFT JOIN
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        ON
            json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.guestId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
        WHERE
            json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.visitorId') = '${currentUserId}'
    `;

    if (lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      const toDate = +moment.utc().format('x');

      query += `
        AND
        CAST (json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.createdAt') as numeric)
        BETWEEN
          ${fromDate}
        AND
          ${toDate})`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows[0]?.count || 0;
  }

  async countVisitorBiographies(
    currentUserId: string,
    lastDateRange: number,
  ): Promise<number | string> {
    let query = `
    SELECT
        COUNT(*) AS count
    FROM (
        SELECT
            json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.visitorId') AS userId,
        FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.VIEW_BIOGRAPHIES}_raw_latest\` AS ${BigQueryTable.VIEW_BIOGRAPHIES}
        LEFT JOIN
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        ON
            json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.visitorId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
        WHERE
            json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.guestId') = '${currentUserId}'
    `;

    if (lastDateRange > 0) {
      const fromDate = +moment
        .utc()
        .subtract(+lastDateRange - 1, 'd')
        .format('x');

      const toDate = +moment.utc().format('x');

      query += `
        AND
        CAST (json_value(${BigQueryTable.VIEW_BIOGRAPHIES}.DATA, '$.createdAt') as numeric)
        BETWEEN
          ${fromDate}
        AND
          ${toDate})`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows[0]?.count || 0;
  }
}
