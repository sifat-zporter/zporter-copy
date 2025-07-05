import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as chalk from 'chalk';
import { LoggerService } from '../../modules/logger/logger.service';
import * as moment from 'moment';

const mappingChalk = (s: number, text = 'ms') => {
  const logging = s + text;
  if (s < 750) {
    return chalk.green(logging);
  }

  if (s > 750 && s < 1500) {
    return chalk.yellow(logging);
  }

  if (s > 1500) {
    return chalk.red(logging);
  }
};

const mappingMethodChalk = (method: string, originalUrl: string) => {
  const endpoint = `${method}: ${originalUrl}`;
  if (method === 'GET') {
    return chalk.hex('#61affe')(endpoint);
  }

  if (method === 'POST') {
    return chalk.hex('#49cc90')(method);
  }

  if (method === 'PUT') {
    return chalk.hex('#fca130')(method);
  }

  if (method === 'PATCH') {
    return chalk.hex('#50e3c2')(method);
  }

  if (method === 'DELETE') {
    return chalk.hex('#f93e3e')(method);
  }
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    const method = context.switchToHttp().getRequest<Request>().method;
    const originalUrl = context
      .switchToHttp()
      .getRequest<Request>().originalUrl;
    const hostname = context.switchToHttp().getRequest<Request>().hostname;

    const endpoint = mappingMethodChalk(method, originalUrl);

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        // if (responseTime > 5000 && !hostname.includes('localhost')) {
        //   this.logger.sendToSlack({
        //     title: `Bad Performance`,
        //     logMessage: `Your response times over 5 seconds. Investigate and improve it now!!!`,
        //     timestamp: moment().format(),
        //     endpoint: `${process.env.BACKEND_URL}${originalUrl}`,
        //     method: method,
        //   });
        // }

        context.switchToHttp().getRequest<Request>().method.toLowerCase() !==
          'options' &&
          console.log(`${endpoint} - ${mappingChalk(responseTime)}`);
      }),
    );
  }
}
