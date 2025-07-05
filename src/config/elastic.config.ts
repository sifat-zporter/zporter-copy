import { Client } from '@elastic/elasticsearch';
import './env.config';

// Initialize Elastic, requires installing Elastic dependencies:
// https://github.com/elastic/elasticsearch-js
//
// ID, username, and password are stored in functions config variables
const ELASTIC_ID = process.env.ELASTIC_ID;
const ELASTIC_USERNAME = process.env.ELASTIC_USERNAME;
const ELASTIC_PASSWORD = process.env.ELASTIC_PASSWORD;

export const elasticClient = new Client({
  cloud: {
    id: ELASTIC_ID,
    username: ELASTIC_USERNAME,
    password: ELASTIC_PASSWORD,
  },
});
