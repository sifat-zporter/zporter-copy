import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as moment from 'moment';
import { LoggerService } from '../../modules/logger/logger.service';
import { OutputHttpExceptionDto } from './dto/http-exception.dto';
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    console.log(exception);

    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      const exceptionStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      const statusResponse =
        exception instanceof HttpException && exceptionStatus in HttpStatus
          ? exceptionStatus
          : HttpStatus.INTERNAL_SERVER_ERROR;

      const errorMessage = exceptionResponse.message
        ? exceptionResponse.message
        : exception.message;

      const messageResponse =
        exception instanceof HttpException &&
        statusResponse !== HttpStatus.INTERNAL_SERVER_ERROR
          ? errorMessage
          : 'INTERNAL_SERVER_ERROR';

      const errorResponse: OutputHttpExceptionDto = {
        method: request.method,
        path: request.url,
        statusCode: statusResponse,
        message: messageResponse,
        timestamp: moment().format(),
      };

      const isLocalHost = request.hostname.includes('localhost');

      if (statusResponse >= 500 && !isLocalHost) {
        // try {
        //   await this.logger.sendToSlack({
        //     title: `You have a new *Internal Server Error*`,
        //     logMessage: message,
        //     timestamp: moment().format(),
        //     endpoint: `${process.env.BACKEND_URL}${request.url}`,
        //     method: request.method,
        //     email: request.res.req['user']?.email,
        //     roleId: request.res.req['user']?.roleId,
        //   });
        // } catch (error) {
        //   console.log(error, 'error sending Slack hook');
        // }

        try {
          await this.logger.send500ToGoogleChat({
            title: `You have a new *Internal Server Error*`,
            logMessage: errorMessage,
            timestamp: moment().format(),
            endpoint: `${process.env.BACKEND_URL}${request.url}`,
            method: request.method,
            email: request.res.req['user']?.email,
            roleId: request.res.req['user']?.roleId,
            body: request.body,
            query: request.query,
            params: request.params,
          });
        } catch (error) {
          console.log(error, 'error sending Google Chat hook');

          return response.status(statusResponse).json(errorResponse);
        }
      }

      return response.status(statusResponse).json(errorResponse);
    } catch (error) {
      console.log(error, 'error exeption filter');
    }
  }
}
