import { Query } from '@google-cloud/bigquery';
import { Injectable } from '@nestjs/common';
import { BigQueryTable } from '../../../common/constants/common.constant';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { bq, db } from '../../../config/firebase.config';
import { mappingUserInfoById } from '../../../helpers/mapping-user-info';
import { JoinTeamStatus } from '../../clubs/enum/club.enum';
import { TypeOfDiary, TypeOfTraining } from '../../diaries/enum/diaries.enum';
import { FeedTab, GetListFeedQuery } from '../dto/feed.req.dto';
import * as moment from 'moment';

@Injectable()
export class FeedBigQueryService {
  async mappingPostInfo(rows: any[]) {
    return rows.map(({ document_name, data }) => {
      const regexStr = document_name.split('/');

      const postId = regexStr[6];
      const typeOfPost = regexStr[5];

      return { ...JSON.parse(data), postId, typeOfPost };
    });
  }

  private concatConditions(
    queryStr: string,
    conditions: string,
    typeOfPost: BigQueryTable,
  ) {
    const covertConditionTypeOfPost = conditions.replace(
      'typeOfPost',
      typeOfPost,
    );

    const query = queryStr.includes('WHERE') === true ? 'AND' : 'WHERE';
    return (queryStr += `\n ${query} \n ${covertConditionTypeOfPost}
        ORDER BY createdAt DESC
    `);
  }

  async getListNewsPost(paginationDto: PaginationDto, currentUserId: string) {
    const { limit, startAfter, sorted } = paginationDto;
    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const [providerRef, subRef] = await Promise.all([
      db.collection('rss_providers').get(),
      db.collection('subscribed').where('userId', '==', currentUserId).get(),
    ]);

    const providerIds: string[] = [];
    providerRef.forEach((doc) => {
      providerIds.push(doc.id);
    });

    subRef.forEach((doc) => {
      const index = providerIds.indexOf(doc.data()?.providerId);
      if (index > -1) {
        providerIds.splice(index, 1);
      }
    });

    const convertProviderIdsByCondition = providerIds.join("','");

    const rssNewsQueries = `
    SELECT
      ${BigQueryTable.RSS_NEWS}.document_name,
      json_value(${BigQueryTable.RSS_NEWS}.data, '$.createdAt') AS createdAt,
      ${BigQueryTable.RSS_NEWS}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.RSS_NEWS}_raw_latest\` AS ${BigQueryTable.RSS_NEWS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.RSS_PROVIDERS}_raw_latest\` AS ${BigQueryTable.RSS_PROVIDERS}
    ON
      json_value(${BigQueryTable.RSS_NEWS}.data, '$.providerId') = ${BigQueryTable.RSS_PROVIDERS}.document_id
    WHERE
      json_value(${BigQueryTable.RSS_NEWS}.data, '$.providerId') IN ('${convertProviderIdsByCondition}')
    `;

    const zporterNewsQueries = `
    SELECT
      ${BigQueryTable.ZPORTER_NEWS}.document_name,
      json_value(${BigQueryTable.ZPORTER_NEWS}.data, '$._fl_meta_.createdDate') AS createdAt,
      ${BigQueryTable.ZPORTER_NEWS}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.ZPORTER_NEWS}_raw_latest\` AS ${BigQueryTable.ZPORTER_NEWS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.RSS_PROVIDERS}_raw_latest\` AS ${BigQueryTable.RSS_PROVIDERS}
    ON
      json_value(${BigQueryTable.ZPORTER_NEWS}.data, '$._fl_meta_.createdBy') = ${BigQueryTable.RSS_PROVIDERS}.document_id
    WHERE
      json_value(${BigQueryTable.ZPORTER_NEWS}.data, '$._fl_meta_.createdBy') IN ('${convertProviderIdsByCondition}')
    `;

    let query = `
      (${rssNewsQueries})
    UNION ALL
      (${zporterNewsQueries})
    ORDER BY
      createdAt ${dir}`;

    if (startAfter && limit) {
      query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return this.mappingPostInfo(rows);
  }

  async getAllPosts(currentUserId: string, getListFeedQuery: GetListFeedQuery) {
    const { limit, startAfter, sorted } = getListFeedQuery;
    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const [providerRef, subRef] = await Promise.all([
      db.collection('rss_providers').get(),
      db.collection('subscribed').where('userId', '==', currentUserId).get(),
    ]);

    const providerIds: string[] = [];
    providerRef.forEach((doc) => {
      providerIds.push(doc.id);
    });

    subRef.forEach((doc) => {
      const index = providerIds.indexOf(doc.data()?.providerId);
      if (index > -1) {
        providerIds.splice(index, 1);
      }
    });

    const subscribedProviderIds = providerIds.join("','");

    const [
      transferClubHistoriesQueries,
      playerOfTheWeekQueries,
      sharedBiographiesQueries,
      plainPostQueries,
      personalGoalsQueries,
      sharedLeaderboardQueries,
    ] = [
      BigQueryTable.TRANSFERS,
      BigQueryTable.PLAYER_OF_THE_WEEK,
      BigQueryTable.SHARED_BIOGRAPHIES,
      BigQueryTable.PLAIN_POSTS,
      BigQueryTable.PERSONAL_GOALS,
      BigQueryTable.SHARED_LEADERBOARD,
    ].map((typeOfPost) => {
      const query = `
        SELECT DISTINCT
          ${typeOfPost}.document_name,
          json_value(${typeOfPost}.data, '$.updatedAt') AS createdAt,
          ${typeOfPost}.data as data
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${typeOfPost}_raw_latest\` AS ${typeOfPost}
        `;

      return query;
    });

    const diariesQueries = `
    SELECT DISTINCT
      ${BigQueryTable.DIARIES}.document_name,
      json_value(${BigQueryTable.DIARIES}.data, '$.updatedAt') AS createdAt,
      ${BigQueryTable.DIARIES}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}

    `;

    const remindUpdateDiaries = `
    SELECT DISTINCT
      ${BigQueryTable.REMIND_UPDATE_DIARIES}.document_name,
      json_value(${BigQueryTable.REMIND_UPDATE_DIARIES}.data, '$.updatedAt') AS createdAt,
      ${BigQueryTable.REMIND_UPDATE_DIARIES}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.REMIND_UPDATE_DIARIES}_raw_latest\` AS ${BigQueryTable.REMIND_UPDATE_DIARIES}

    `;

    const rssNewsQueries = `
    SELECT
      ${BigQueryTable.RSS_NEWS}.document_name,
      json_value(${BigQueryTable.RSS_NEWS}.data, '$.updatedAt') AS createdAt,
      ${BigQueryTable.RSS_NEWS}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.RSS_NEWS}_raw_latest\` AS ${BigQueryTable.RSS_NEWS}
    WHERE
      json_value(${BigQueryTable.RSS_NEWS}.data, '$.providerId') IN ('${subscribedProviderIds}')
    `;

    const zporterNewsQueries = `
    SELECT
      ${BigQueryTable.ZPORTER_NEWS}.document_name,
      json_value(${BigQueryTable.ZPORTER_NEWS}.data, '$._fl_meta_.lastModifiedDate') AS createdAt,
      ${BigQueryTable.ZPORTER_NEWS}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.ZPORTER_NEWS}_raw_latest\` AS ${BigQueryTable.ZPORTER_NEWS}
    WHERE
      json_value(${BigQueryTable.ZPORTER_NEWS}.data, '$._fl_meta_.createdBy') IN ('${subscribedProviderIds}')
    `;

    let query = `
      (${remindUpdateDiaries})
    UNION ALL
      (${diariesQueries})
    UNION ALL
      (${playerOfTheWeekQueries})
    UNION ALL
      (${sharedBiographiesQueries})
    UNION ALL
      (${plainPostQueries})
    UNION ALL
      (${zporterNewsQueries})
    UNION ALL
      (${personalGoalsQueries})
    UNION ALL
      (${transferClubHistoriesQueries})
    UNION ALL
      (${sharedLeaderboardQueries})
    UNION ALL
      (${rssNewsQueries})
    ORDER BY
      createdAt ${dir}`;

    if (startAfter && limit) {
      query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return this.mappingPostInfo(rows);
  }

  async getListPost(
    currentUserId: string,
    getListFeedQuery: GetListFeedQuery,
    joinTable?: string,
    conditions?: string,
  ) {
    const { limit, startAfter, sorted, feedTab } = getListFeedQuery;
    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    const [
      diariesQueries,
      transferClubHistoriesQueries,
      playerOfTheWeekQueries,
      sharedBiographiesQueries,
      plainPostQueries,
      remindUpdateDiaries,
      sharedLeaderboardQueries,
    ] = [
      BigQueryTable.DIARIES,
      BigQueryTable.TRANSFERS,
      BigQueryTable.PLAYER_OF_THE_WEEK,
      BigQueryTable.SHARED_BIOGRAPHIES,
      BigQueryTable.PLAIN_POSTS,
      BigQueryTable.REMIND_UPDATE_DIARIES,
      BigQueryTable.SHARED_LEADERBOARD,
    ].map((typeOfPost) => {
      let query = `
        SELECT DISTINCT
          ${typeOfPost}.document_name,
          json_value(${typeOfPost}.data, '$.createdAt') AS createdAt,
          ${typeOfPost}.data as data,
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${typeOfPost}_raw_latest\` AS ${typeOfPost}
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        ON
          json_value(${typeOfPost}.data, '$.userId') = json_value(${BigQueryTable.USERS}.data, '$.userId')`;

      if (joinTable) {
        query += joinTable;
      }

      if (typeOfPost === BigQueryTable.DIARIES) {
        query += `
          WHERE
            json_value(${typeOfPost}.data, '$.typeOfDiary') != '${TypeOfDiary.REST}'
          AND
            json_value(${typeOfPost}.data, '$.typeOfDiary') != '${TypeOfDiary.CAP}'`;
      }

      if (conditions) {
        query = this.concatConditions(query, conditions, typeOfPost);
      }

      return query;
    });

    let query = `
      (${diariesQueries})
    UNION ALL
      (${transferClubHistoriesQueries})

    ${
      [FeedTab.TEAM, FeedTab.FRIENDS].includes(feedTab)
        ? `UNION ALL (${playerOfTheWeekQueries})`
        : ''
    }

    ${
      [FeedTab.FRIENDS, FeedTab.YOURS, FeedTab.TEAM].includes(feedTab)
        ? `UNION ALL (${sharedBiographiesQueries})`
        : ''
    }

    ${
      [FeedTab.YOURS].includes(feedTab)
        ? `UNION ALL (${remindUpdateDiaries})`
        : ''
    }

    UNION ALL
      (${plainPostQueries})
    UNION ALL
      (${sharedLeaderboardQueries})
    ORDER BY
      createdAt ${dir}`;

    if (startAfter && limit) {
      query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return this.mappingPostInfo(rows);
  }

  async getListSavedPost(
    currentUserId: string,
    getListFeedQuery: GetListFeedQuery,
  ) {
    const { startAfter, sorted, limit } = getListFeedQuery;
    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    let query = `
        SELECT DISTINCT
          json_value(${BigQueryTable.SAVED_POSTS}.data, '$.createdAt') AS createdAt,
          ${BigQueryTable.SAVED_POSTS}.data
        FROM
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.SAVED_POSTS}_raw_latest\` AS ${BigQueryTable.SAVED_POSTS}
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
        ON
            json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId') = ${BigQueryTable.DIARIES}.document_id
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PLAYER_OF_THE_WEEK}_raw_latest\` AS ${BigQueryTable.PLAYER_OF_THE_WEEK}
        ON
            json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId') = ${BigQueryTable.PLAYER_OF_THE_WEEK}.document_id
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.TRANSFERS}_raw_latest\` AS ${BigQueryTable.TRANSFERS}
        ON
            json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId') = ${BigQueryTable.TRANSFERS}.document_id
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
        ON
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = json_value(${BigQueryTable.USERS}.data, '$.userId')
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PERSONAL_GOALS}_raw_latest\` AS ${BigQueryTable.PERSONAL_GOALS}
        ON
            json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId') = ${BigQueryTable.PERSONAL_GOALS}.document_id
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.SHARED_BIOGRAPHIES}_raw_latest\` AS ${BigQueryTable.SHARED_BIOGRAPHIES}
        ON
            json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId') = ${BigQueryTable.SHARED_BIOGRAPHIES}.document_id
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PLAIN_POSTS}_raw_latest\` AS ${BigQueryTable.PLAIN_POSTS}
        ON
          json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = json_value(${BigQueryTable.PLAIN_POSTS}.data, '$.userId')
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.BIRTHDAYS}_raw_latest\` AS ${BigQueryTable.BIRTHDAYS}
        ON
          json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = json_value(${BigQueryTable.BIRTHDAYS}.data, '$.userId')
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.ZTAR_OF_THE_MATCH}_raw_latest\` AS ${BigQueryTable.ZTAR_OF_THE_MATCH}
        ON
          json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = json_value(${BigQueryTable.ZTAR_OF_THE_MATCH}.data, '$.userId')
        LEFT JOIN
          \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.REMIND_UPDATE_DIARIES}_raw_latest\` AS ${BigQueryTable.REMIND_UPDATE_DIARIES}
        ON
          json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = json_value(${BigQueryTable.REMIND_UPDATE_DIARIES}.data, '$.userId')
        WHERE
          json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}'
        AND (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PLAYER_OF_THE_WEEK}_raw_latest\` AS ${BigQueryTable.PLAYER_OF_THE_WEEK}
          WHERE
            ${BigQueryTable.PLAYER_OF_THE_WEEK}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.DIARIES}_raw_latest\` AS ${BigQueryTable.DIARIES}
          WHERE
            ${BigQueryTable.DIARIES}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.TRANSFERS}_raw_latest\` AS ${BigQueryTable.TRANSFERS}
          WHERE
            ${BigQueryTable.TRANSFERS}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PERSONAL_GOALS}_raw_latest\` AS ${BigQueryTable.PERSONAL_GOALS}
          WHERE
            ${BigQueryTable.PERSONAL_GOALS}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.SHARED_BIOGRAPHIES}_raw_latest\` AS ${BigQueryTable.SHARED_BIOGRAPHIES}
          WHERE
            ${BigQueryTable.SHARED_BIOGRAPHIES}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PLAIN_POSTS}_raw_latest\` AS ${BigQueryTable.PLAIN_POSTS}
          WHERE
            ${BigQueryTable.PLAIN_POSTS}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.BIRTHDAYS}_raw_latest\` AS ${BigQueryTable.BIRTHDAYS}
          WHERE
            ${BigQueryTable.BIRTHDAYS}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.ZTAR_OF_THE_MATCH}_raw_latest\` AS ${BigQueryTable.ZTAR_OF_THE_MATCH}
          WHERE
            ${BigQueryTable.ZTAR_OF_THE_MATCH}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        OR (
          SELECT
            COUNT(1)
          FROM
            \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.REMIND_UPDATE_DIARIES}_raw_latest\` AS ${BigQueryTable.REMIND_UPDATE_DIARIES}
          WHERE
            ${BigQueryTable.REMIND_UPDATE_DIARIES}.document_id = json_value(${BigQueryTable.SAVED_POSTS}.DATA, '$.postId')
          AND
            json_value(${BigQueryTable.SAVED_POSTS}.data, '$.userId') = '${currentUserId}') > 0
        ORDER BY
          createdAt ${dir}`;

    if (startAfter && limit) {
      query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    const getSavedPost = rows.map(async ({ data }) => {
      const parseData = JSON.parse(data);

      const { postId, typeOfPost } = parseData;

      const postRef = await db.collection(typeOfPost).doc(postId).get();

      return {
        ...postRef.data(),
        postId,
        typeOfPost,
      };
    });

    const result = await Promise.all(getSavedPost);

    return result;
  }

  async getListFamilyFeed(
    currentUserId: string,
    getListFeedQuery: GetListFeedQuery,
  ) {
    const { startAfter, sorted, limit } = getListFeedQuery;
    const dir = (sorted && sorted.toUpperCase()) || 'DESC';

    let query = `
    SELECT
      ${BigQueryTable.PERSONAL_GOALS}.document_name,
      json_value(${BigQueryTable.PERSONAL_GOALS}.data, '$.createdAt') AS createdAt,
      ${BigQueryTable.PERSONAL_GOALS}.data as data
    FROM
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.PERSONAL_GOALS}_raw_latest\` AS ${BigQueryTable.PERSONAL_GOALS}
    LEFT JOIN
      \`${process.env.FB_PROJECT_ID}.${process.env.DATASET_ID}.${BigQueryTable.USERS}_raw_latest\` AS ${BigQueryTable.USERS}
    ON
      json_value(${BigQueryTable.PERSONAL_GOALS}.DATA, '$.userId') = ${BigQueryTable.USERS}.document_id
    WHERE
      json_value(${BigQueryTable.PERSONAL_GOALS}.DATA, '$.userId') = '${currentUserId}'
    ORDER BY
      createdAt ${dir}`;

    if (startAfter && limit) {
      query += `\n LIMIT ${limit} OFFSET ${limit * (startAfter - 1)}`;
    }

    const options: Query = {
      query,
      location: process.env.REGION,
    };

    const [job] = await bq.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return this.mappingPostInfo(rows);
  }

  async getPhysicallyStrainOfTeam(currentUserId: string, createdAt: number) {
    const { teamIds } = await mappingUserInfoById(currentUserId);

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
