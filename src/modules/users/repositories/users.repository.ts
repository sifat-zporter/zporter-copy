import { Query } from '@google-cloud/bigquery';
import { BigQueryTable, GenderTypes } from '../../../common/constants/common.constant';
import { bq } from '../../../config/firebase.config';
import { commonGetCountRows } from '../../../helpers/common-count-rows-bigquery';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { CreatedAtSort, GetListContactQuery } from '../../contact-groups/dto/contact-groups.req.dto';
import * as moment from 'moment';
import { AgeGroup } from '../../dashboard/dto/dashboard.req.dto';
export class UsersBigQueryService {
  async mappingUserData(
    data: { userId: string }[],
    currentUserId: string,
    count: number,
  ) {
    const mappingUserInfo = data.map(async ({ userId }) => {
      return mappingUserInfoById(userId, currentUserId, true);
    });

    const result = await Promise.all(mappingUserInfo);

    return { data: result, count };
  }

  async getListUsers(
    currentUserId: string,
    getListContactQuery: GetListContactQuery,
  ) {
    const promises = [];
    const { 
      sorted, 
      limit, 
      startAfter, 
      clubId, 
      country, 
      role, 
      search, 
      teamId,
      ageGroup,
      signUpDateSort,
    } = getListContactQuery;

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    let queryStr = `
        SELECT
          ${BigQueryTable.USERS}.document_id AS userId,
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        WHERE
          json_value(${BigQueryTable.USERS}.data, '$.account.isActive') = 'true'
        AND
          ${BigQueryTable.USERS}.document_id != '${currentUserId}'
    `;


    if ( ageGroup && ageGroup !== AgeGroup.ADULT) {
      const gender =
        ageGroup.split('_')[0] === 'B'
          ? GenderTypes.Male
          : GenderTypes.Female;
      const yearOfBirth = ageGroup.split('_')[1];

      queryStr += `\n
        AND
          SUBSTRING
            (json_value(${
              BigQueryTable.USERS
            }.data, '$.profile.birthDay'), 1, 4) = '${yearOfBirth}'
        AND
          json_value(${
            BigQueryTable.USERS
          }.data, '$.profile.gender') = '${gender.toUpperCase()}'`;
    } 
    else if(ageGroup) {
      const currentYear = +moment.utc().format('YYYY');
      const ADULT_AGE = 23;

      queryStr += `\n
      AND
      ${currentYear} - CAST(SUBSTRING (json_value(${
        BigQueryTable.USERS
      }.DATA, '$.profile.birthDay'), 1, 4) as numeric) > ${ADULT_AGE}
      `;
    }

    if (clubId) {
      queryStr += `
        AND (
            json_value(${BigQueryTable.USERS}.DATA, '$.coachCareer.clubId') = '${clubId}'
          OR
            json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = '${clubId}'
        )`;
    }

    if (teamId) {
      queryStr += `\n
        AND '${teamId}' IN UNNEST(json_value_array(${BigQueryTable.USERS}.DATA, '$.teamIds'))`;
    }

    if (country) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.settings.country.name') LIKE '%${country}%'`;
    }

    if (role) {
      queryStr += `\n
        AND json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${role}'`;
    }

    if (search) {
      const searchName = search.toLowerCase();

      queryStr += `\n
        AND (
          LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName')) LIKE '%${searchName}%'
        OR
          LOWER(json_value(${BigQueryTable.USERS}.DATA, '$.profile.lastName')) LIKE '%${searchName}%'
        )`;
    }

    const createdAtSort = (signUpDateSort && (signUpDateSort == CreatedAtSort.OLD)) 
      ? 'ASC' 
      : 'DESC';
      
    const counting = commonGetCountRows(queryStr, 'userId');
    promises.push(counting);

    const query = (queryStr += `
      ORDER BY
        json_value(${BigQueryTable.USERS}.DATA, '$.account.createdAt') ${createdAtSort},
        json_value(${BigQueryTable.USERS}.data, '$.type') ${dir}
      LIMIT
        ${+limit}
      OFFSET
        ${+limit * (+startAfter - 1)}`);

    const options: Query = {
      query,
      location: process.env.REGION,
    };
    console.log(query);
    

    const querying = bq.createQueryJob(options);
    promises.push(querying);

    const [count, [job]] = await Promise.all(promises);
    const [rows] = await job.getQueryResults();

    return this.mappingUserData(rows, currentUserId, count);
  }
}
