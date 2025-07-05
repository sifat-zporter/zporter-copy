import * as hubspot from '@hubspot/api-client';

export const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
  // apiKey: process.env.HUBSPOT_API_KEY,
});
