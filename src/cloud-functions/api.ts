/* eslint-disable prettier/prettier */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as functions from 'firebase-functions';
import { join } from 'path';
import { AppModule } from '../app.module';
import { HttpExceptionFilter } from '../common/filter/http-exception.filter';
import { LoggerService } from '../modules/logger/logger.service';
require('newrelic');
const server = express();

export const createNestServer = async (expressInstance) => {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: false,
    },
  );

  app.setBaseViewsDir(join(__dirname, '../src', 'client/views'));
  app.setViewEngine('ejs');

  const logger = app.get<LoggerService>(LoggerService);
  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Use global validation pipe.
  app.useGlobalPipes(new ValidationPipe());
  const options = new DocumentBuilder()
    .setTitle(`Zporter official API - ${process.env.NODE_ENV_PREFIX}`)
    .setDescription(
      `The official API documentation for building Zporter App - ${process.env.NODE_ENV_PREFIX}`,
    )
    .setVersion('1.0')
    .addServer(process.env.BACKEND_URL)
    .addBearerAuth({ type: 'apiKey', name: 'Authorization', in: 'header' })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  app.enableCors();

  return app.init();
};

createNestServer(server)
  .then((v) => console.log('Nest Ready'))
  .catch((err) => console.error('Nest broken', err));

export const api = functions
  .runWith({ memory: '1GB', timeoutSeconds: 360 })
  .region(process.env.REGION)
  .https.onRequest(server);
