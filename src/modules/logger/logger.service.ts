import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SendMessageToSlackPayload } from './slack.payload';

@Injectable()
export class LoggerService extends Logger {
  error(message: any, trace?: string, context?: string) {
    // TO DO
    super.error(message, trace, context);
  }

  warn(message: any, context?: string) {
    // TO DO
    super.warn(message, context);
  }

  log(message: any, context?: string) {
    // TO DO
    super.log(message, context);
  }

  debug(message: any, context?: string) {
    // TO DO
    super.debug(message, context);
  }

  verbose(message: any, context?: string) {
    // TO DO
    super.verbose(message, context);
  }

  async sendToSlack(sendMessageToSlackPayload: SendMessageToSlackPayload) {
    try {
      const { title, endpoint, timestamp, logMessage, method, email, roleId } =
        sendMessageToSlackPayload;
      const message = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: title,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `
              *Project:*\n${process.env.FB_PROJECT_ID}\n*TimeStamp:*\n${timestamp}\n*Endpoint:* \n${endpoint}\n*Method:* \n${method}\n*Reasons:* \n${logMessage}\n*Email:* \n${email}\n*RoleId:* \n${roleId}\n`,
            },
          },
        ],
      };

      await axios({
        method: 'POST',
        url: 'https://hooks.slack.com/services/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',
        data: message,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  async send500ToGoogleChat(sendError500Payload: SendMessageToSlackPayload) {
    try {
      const {
        title,
        endpoint,
        timestamp,
        logMessage,
        method,
        email,
        roleId,
        body,
        query,
        params,
      } = sendError500Payload;

      const WEBHOOK_URL = `https://chat.googleapis.com/v1/spaces/${process.env.GCHAT_SPACE_ID}/messages?key=${process.env.GCHAT_KEY}&token=${process.env.GCHAT_TOKEN}`;

      const bodyStr = JSON.stringify(body);
      const queryStr = JSON.stringify(query);
      const paramsStr = JSON.stringify(params)

      const message = JSON.stringify({
        text: `${title}\n*Environment:*\n${process.env.NODE_ENV}\n*TimeStamp:*\n${timestamp}\n*Endpoint:* \n${endpoint}\n*Method:* \n${method}\n*Reason:* \n${logMessage}\n*Body:* \n${bodyStr}\n*Query:* \n${queryStr}\n*Params:* \n${paramsStr}\n*Email:* \n${email}\n*RoleId:* \n${roleId}\n`,
      });

      await axios({
        method: 'POST',
        url: WEBHOOK_URL,
        data: message,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      });
    } catch (error) {
      console.log(`Error Send Log To Google Chat`, error.message);
    }
  }
}
