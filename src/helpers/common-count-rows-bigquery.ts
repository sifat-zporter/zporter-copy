import { bq } from '../config/firebase.config';

export const commonGetCountRows = async (query: string, field: string) => {
  const optionsQueryCount = {
    query: `select count(${field}) as count from (${query})`,
    location: process.env.REGION,
  };

  const [job] = await bq.createQueryJob(optionsQueryCount);
  const [rows] = await job.getQueryResults();

  const count = rows[0]?.count || 0;

  return count;
};
