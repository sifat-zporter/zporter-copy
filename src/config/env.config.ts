import { config } from 'dotenv';

const { NODE_ENV } = process.env;

config({
  path: NODE_ENV === 'dev' ? '.env.dev' : `.env.${NODE_ENV}`,
});
