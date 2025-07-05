import { Query } from '@google-cloud/bigquery';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';
import * as momentTz from 'moment-timezone';
import {
  BigQueryTable,
  GenderTypes,
} from '../../../common/constants/common.constant';
import { bq, db } from '../../../config/firebase.config';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { JoinTeamStatus } from '../../clubs/enum/club.enum';
import {
  AgeGroup,
  GetListDreamTeamQuery,
} from '../../dashboard/dto/dashboard.req.dto';
import { LastDateRange } from '../../dashboard/enum/dashboard-enum';
import { UserTypes } from '../../users/enum/user-types.enum';
import {
  GetOriginalDiaryCalendarStatusDto,
  GetOriginalDiaryDto,
  OriginalDiaryType,
} from '../dto/diaries.req.dto';
import { TypeOfTraining } from '../enum/diaries.enum';

export class DiariesBigQueryService {
  conditionType(queryStr): 'WHERE' | 'AND' {
    const query = queryStr.includes('WHERE') === true ? 'AND' : 'WHERE';
    return query;
  }

  async getListDreamTeam(getListDreamTeamQuery: GetListDreamTeamQuery) {
    const { lastDateRange, limit, ageGroup, country, startAfter, sorted } =
      getListDreamTeamQuery;

    const dir = sorted && sorted.toUpperCase();

    let queryStr = `
      SELECT
        ${BigQueryTable.DREAM_TEAMS}.DATA
      FROM
        \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DREAM_TEAMS}_raw_latest\` AS ${BigQueryTable.DREAM_TEAMS}
    `;

    if (+lastDateRange > 0) {
      let fromDate: number;
      if (lastDateRange == LastDateRange.SEVEN_DAY) {
        fromDate = +moment.utc().subtract(1, 'w').startOf('d').format('x');
      } else {
        fromDate = +moment
          .utc()
          .subtract(+lastDateRange - 1, 'd')
          .format('x');
      }

      const toDate = +moment.utc().format('x');

      queryStr += `
      ${this.conditionType(queryStr)}
      CAST
        (json_value(${BigQueryTable.DREAM_TEAMS
        }.DATA, '$.createdAt') as numeric)
      BETWEEN
        ${fromDate}
      AND
        ${toDate}`;
    }

    if (ageGroup) {
      const check = Object.values(AgeGroup)
        .toString()
        .split(',')
        .includes(ageGroup);

      if (ageGroup !== AgeGroup.ADULT && check) {
        const gender =
          ageGroup.split('_')[0] === 'B'
            ? GenderTypes.Male
            : GenderTypes.Female;

        const yearOfBirth = ageGroup.split('_')[1];

        queryStr += `
        ${this.conditionType(queryStr)}
          json_value(${BigQueryTable.DREAM_TEAMS
          }.data, '$.age') = '${yearOfBirth}'
          ${this.conditionType(queryStr)}
          json_value(${BigQueryTable.DREAM_TEAMS
          }.data, '$.gender') = '${gender}'`;
      } else {
        const currentYear = +moment.utc().format('YYYY');
        const ADULT_AGE = 23;

        queryStr += `
        ${this.conditionType(queryStr)}
          ${currentYear} - CAST(json_value(${BigQueryTable.DREAM_TEAMS
          }.DATA, '$.age') as numeric) > ${ADULT_AGE}
        `;
      }
    }

    if (country) {
      queryStr += `
      ${this.conditionType(queryStr)}
          json_value(${BigQueryTable.DREAM_TEAMS
        }.DATA, '$.country') LIKE '%${country}%'`;
    }

    let query;

    if (startAfter && limit) {
      query =
        queryStr +
        `
        ORDER BY
          json_value(${BigQueryTable.DREAM_TEAMS}.DATA, '$.createdAt') ${dir}
        LIMIT
          ${limit}
        OFFSET
          ${limit * (startAfter - 1)}
        `;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows.map(({ DATA }) => JSON.parse(DATA));
  }

  async createDreamTeam() {
    const query = `
    SELECT
      ARRAY_AGG(${BigQueryTable.USERS}.document_id) AS userIds,
      json_value(${BigQueryTable.CLUBS}.DATA, '$.country')AS country,
      SUBSTRING(json_value(${BigQueryTable.USERS}.DATA, '$.profile.birthDay'), 1,4) AS age,
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.gender') AS gender,
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.CLUBS}_raw_latest\` AS ${BigQueryTable.CLUBS}
    ON
      json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = ${BigQueryTable.CLUBS}.document_id
    WHERE
      json_value(${BigQueryTable.USERS}.DATA, '$.account.isActive') = 'true'
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') != ''
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') != ''
    AND
      ARRAY_LENGTH(json_value_array(${BigQueryTable.USERS}.DATA, '$.playerCareer.favoriteRoles')) > 0
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${UserTypes.PLAYER}'
    AND
      json_value(${BigQueryTable.CLUBS}.DATA, '$.country') IS NOT NULL
    AND
      json_value(${BigQueryTable.CLUBS}.DATA, '$.country') != ''
    GROUP BY
      country,
      age,
      gender
    ORDER BY
      age ASC
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows;
  }

  async createDreamTeamV2() {
    const query = `
    SELECT
      ARRAY_AGG(${BigQueryTable.USERS}.document_id) AS userIds,
      json_value(${BigQueryTable.CLUBS}.DATA, '$.country')AS country
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.CLUBS}_raw_latest\` AS ${BigQueryTable.CLUBS}
    ON
      json_value(${BigQueryTable.USERS}.DATA, '$.playerCareer.clubId') = ${BigQueryTable.CLUBS}.document_id
    WHERE
      json_value(${BigQueryTable.USERS}.DATA, '$.account.isActive') = 'true'
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') IS NOT NULL
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.firstName') != ''
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.profile.city') != ''
    AND
      ARRAY_LENGTH(json_value_array(${BigQueryTable.USERS}.DATA, '$.playerCareer.favoriteRoles')) > 0
    AND
      json_value(${BigQueryTable.USERS}.DATA, '$.type') = '${UserTypes.PLAYER}'
    AND
      json_value(${BigQueryTable.CLUBS}.DATA, '$.country') IS NOT NULL
    AND
      json_value(${BigQueryTable.CLUBS}.DATA, '$.country') != ''
    GROUP BY
      country
    ORDER BY
      country ASC
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows;
  }

  async getRegisteredOriginalDiaryIds(
    currentUserId: string,
    originalDiaryType: OriginalDiaryType,
  ): Promise<string[]> {
    const fromDate = +moment.utc().subtract(6, 'd').format('x');
    const toDate = +moment.utc().format('x');

    const query = `
    SELECT
      json_value(${BigQueryTable.DIARIES}.DATA, '$.originalDiaryId') AS originalDiaryId
    FROM
    \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
    WHERE
      json_value(${BigQueryTable.DIARIES}.DATA, '$.typeOfDiary') = '${originalDiaryType}'
    AND
      json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = '${currentUserId}'
    AND
      CAST (json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') AS numeric)
    BETWEEN
      ${fromDate}
    AND
      ${toDate}
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows.map(({ originalDiaryId }) => originalDiaryId);
  }

  async getCountUnRegisteredOriginalDiaries(
    currentUserId: string,
    originalDiaryType: OriginalDiaryType,
  ) {
    const [{ teamIds }, gettingRegisteredOriginalDiaryIds] = await Promise.all([
      mappingUserInfoById(currentUserId),
      this.getRegisteredOriginalDiaryIds(
        currentUserId,
        OriginalDiaryType.MATCH,
      ),
    ]);

    const curTeamIds = teamIds.join("','");
    const registeredOriginalDiaryIds =
      gettingRegisteredOriginalDiaryIds.join("','");

    const fromDate = +moment.utc().subtract(6, 'd').format('x');
    const toDate = +moment.utc().format('x');

    const query = `
      WITH filtered_original_diaries AS (
        SELECT 
          document_id,
          json_value(data, '$.userId') as userId,
          json_value(data, '$.diaryId') as diaryId,
          json_value(data, '$.originalDiaryId') as originalDiaryId,
          json_value(data, '$.typeOfDiary') as typeOfDiary,
          CAST(json_value(data, '$.createdAt') AS numeric) as createdAt
        FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.ORIGINAL_DIARIES}_raw_latest\`
        WHERE 
          json_value(data, '$.typeOfDiary') = '${originalDiaryType}'
          AND json_value(data, '$.originalDiaryId') NOT IN ('${registeredOriginalDiaryIds}')
          AND json_value(data, '$.userId') != '${currentUserId}'
          AND CAST(json_value(data,'$.createdAt') AS numeric) BETWEEN ${fromDate} AND ${toDate}
      ),
      filtered_users_teams AS (
        SELECT 
          json_value(data, '$.userId') as userId,
          json_value(data, '$.teamId') as teamId
        FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\`
        WHERE 
          json_value(data, '$.teamId') IN ('${curTeamIds}')
          AND json_value(data, '$.status') = '${JoinTeamStatus.ACCEPTED}'
      )
      SELECT COUNT(*) as count FROM (
        SELECT 
          DISTINCT d.document_id as diaryId
        FROM filtered_original_diaries od
        INNER JOIN filtered_users_teams ut ON od.userId = ut.userId
        INNER JOIN \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` d
          ON od.diaryId = d.document_id
      )
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows[0]?.count || 0;
  }

  async getOriginalDiaries(
    currentUserId: string,
    getOriginalDiaryDto: GetOriginalDiaryDto,
  ) {
    const { createdAt, limit, sorted, startAfter, typeOfDiary } =
      getOriginalDiaryDto;

    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const [{ teamIds }, gettingRegisteredOriginalDiaryIds] = await Promise.all([
      mappingUserInfoById(currentUserId),
      this.getRegisteredOriginalDiaryIds(
        currentUserId,
        OriginalDiaryType.MATCH,
      ),
    ]);

    const curTeamIds = teamIds.join("','");
    const registeredOriginalDiaryIds =
      gettingRegisteredOriginalDiaryIds.join("','");

    const fromDate = +moment.utc().subtract(6, 'd').format('x');
    const toDate = +moment.utc().format('x');

    const queryStr = `
    WITH filtered_original_diaries AS (
      SELECT 
        document_id,
        json_value(data, '$.userId') as userId,
        json_value(data, '$.diaryId') as diaryId,
        json_value(data, '$.originalDiaryId') as originalDiaryId,
        json_value(data, '$.typeOfDiary') as typeOfDiary,
        CAST(json_value(data, '$.createdAt') AS numeric) as createdAt
      FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.ORIGINAL_DIARIES}_raw_latest\`
      WHERE 
        json_value(data, '$.typeOfDiary') = '${typeOfDiary}'
        AND json_value(data, '$.originalDiaryId') NOT IN ('${registeredOriginalDiaryIds}')
        AND json_value(data, '$.userId') != '${currentUserId}'
        AND CAST(json_value(data,'$.createdAt') AS numeric) BETWEEN ${fromDate} AND ${toDate}
    ),
    filtered_users_teams AS (
      SELECT 
        json_value(data, '$.userId') as userId,
        json_value(data, '$.teamId') as teamId
      FROM \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\`
      WHERE 
        json_value(data, '$.teamId') IN ('${curTeamIds}')
        AND json_value(data, '$.status') = '${JoinTeamStatus.ACCEPTED}'
    )
    SELECT 
      DISTINCT d.document_id as diaryId,
      od.createdAt as createdAt
    FROM filtered_original_diaries od
    INNER JOIN filtered_users_teams ut ON od.userId = ut.userId
    INNER JOIN \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` d
      ON od.diaryId = d.document_id
    ORDER BY createdAt ${dir}
    `;

    let query;

    if (startAfter && limit) {
      query = queryStr + `LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows.length) {
      const mappingDiariesInfo = rows.map(async ({ diaryId }) => {
        const selectMatchFields = [
          'typeOfDiary',
          'originalDiaryId',
          'match.country',
          'match.result',
          'match.dateTime',
          'match.club',
          'match.arena',
          'match.length',
          'match.yourTeam',
          'match.opponentClub',
          'match.opponentTeam',
          'match.place',
          'match.teamId',
          'teamId',
          'match.typeOfGame',
          'match.matchMedia',
          'createdAt',
          'userId',
        ];

        const selectTrainingFields = [
          'typeOfDiary',
          'originalDiaryId',
          'training.typeOfTraining',
          'training.hoursOfPractice',
          'training.mental',
          'training.physics',
          'training.tactics',
          'training.technics',
          'training.practiceTags',
          'training.physicallyStrain',
          'training.trainingMedia',
          'createdAt',
          'userId',
        ];

        const diaryRef = await db
          .collection('diaries')
          .where(firebase.firestore.FieldPath.documentId(), '==', diaryId)
          .select(...selectMatchFields, ...selectTrainingFields)
          .get();

        return diaryRef.docs[0];
      });

      const result = await Promise.all(mappingDiariesInfo);

      return result;
    }

    return [];
  }

  async getOriginalDiariesCalendarStatus(
    currentUserId: string,
    getOriginalDiaryDto: GetOriginalDiaryCalendarStatusDto,
    options: { timezone: string },
  ) {
    const { from, to } = getOriginalDiaryDto;
    const { timezone = 'UTC' } = options;

    const unixFrom = +momentTz(from).tz(timezone).startOf('day').format('x');
    const unixTo = +momentTz(to).tz(timezone).endOf('day').format('x');

    const diaryRef = await db
      .collection('diaries')
      .where('userId', '==', currentUserId)
      .where('createdAt', '>=', unixFrom)
      .where('createdAt', '<=', unixTo)
      .select('createdAt', 'typeOfDiary', 'training.typeOfTraining')
      .get();

    return diaryRef.docs.map((doc) => {
      return doc.data();
    });
  }

  async getPlayerReviewsOfCoachDiariesByOriginalId(originalDiaryId: string) {
    const query = `
    SELECT
      json_value(${BigQueryTable.DIARIES}.data, '$.userId') as coachId,
      json_extract_array(${BigQueryTable.DIARIES}.data, '$.match.playerReviews') as playerReviews
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.DIARIES}.DATA, '$.userId') = ${BigQueryTable.USERS}.document_id
    WHERE
      json_value(${BigQueryTable.USERS}.data, '$.type') = '${UserTypes.COACH}'
    AND
      json_value(${BigQueryTable.DIARIES}.data, '$.originalDiaryId') = '${originalDiaryId}'
    `;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return {
      playerReviews: rows[0]?.playerReviews || [],
      coachId: rows[0]?.coachId || null,
    };
  }

  async getPhysicallyStrainOfTeam(currentUserId: string, createdAt: number) {
    const userInfo = await mappingUserInfoById(currentUserId);
    if (userInfo == null) {
      return [];
    }
    const { teamIds } = userInfo;

    const convertTeamIds = teamIds.join("','");

    const fromDate = +moment.utc(createdAt).startOf('day').format('x');
    const toDate = +moment.utc(createdAt).endOf('day').format('x');

    const query = `
        SELECT DISTINCT
          json_value(${BigQueryTable.DIARIES}.data, '$.training.physicallyStrain') AS physicallyStrain,
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        ON
          json_value(${BigQueryTable.DIARIES}.data, '$.userId') = json_value(${BigQueryTable.USERS}.data, '$.userId')
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS_TEAMS}_raw_latest\` AS ${BigQueryTable.USERS_TEAMS}
        ON
          json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.userId') = json_value(${BigQueryTable.USERS}.DATA, '$.userId')
        WHERE
          json_value(${BigQueryTable.USERS}.DATA, '$.teamId') IN ('${convertTeamIds}')
        AND
          json_value(${BigQueryTable.USERS_TEAMS}.DATA, '$.status') = '${JoinTeamStatus.ACCEPTED}'
        AND
          json_value(${BigQueryTable.DIARIES}.data, '$.training.typeOfTraining') = '${TypeOfTraining.TEAM_TRAINING}'
        AND
          CAST (json_value(${BigQueryTable.DIARIES}.DATA, '$.createdAt') as numeric)
        BETWEEN
          ${fromDate}
        AND
          ${toDate}`;

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows;
  }
}
