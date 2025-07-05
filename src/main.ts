import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';
import { LoggerService } from './modules/logger/logger.service';
import { db } from './config/firebase.config';
import { RouteService } from './authorization/service/route.service';
import { AuthorizationService } from './authorization/service/authorization.service';
import { PermissionService } from './authorization/service/permission.service';
import { NormalizeStringPipe } from './pipe/normalize-string.pipe';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const options = new DocumentBuilder()
    .setTitle(`Zporter official API - ${process.env.NODE_ENV_PREFIX}`)
    .setDescription(
      `The official API documentation for building Zporter App - ${process.env.NODE_ENV_PREFIX}`,
    )
    .setVersion('1.0')
    // .addServer(`process.env.BACKEND_URL`)
    .addBearerAuth({ type: 'apiKey', name: 'Authorization', in: 'header' })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  app.setBaseViewsDir(join(__dirname, '../src', 'client/views'));
  app.setViewEngine('ejs');
  const logger = app.get<LoggerService>(LoggerService);
  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Use global validation pipe.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );
  app.useGlobalPipes(new NormalizeStringPipe());

  app.use('/webhook', express.raw({ type: '*/*' }));

  app.enableCors();

  await app.listen(process.env.BE_PORT);

  //# Save: endpoint into db
  const server = app.getHttpServer();
  const route = server._events.request._router;
  const stacks = route.stack;

  const routeService = new RouteService();
  const permissionService = new PermissionService();

  const authorizationService = new AuthorizationService(
    permissionService,
    routeService,
  );
  authorizationService.updateWhenAppStart(stacks);

  console.table({
    current_ENV: process.env.NODE_ENV_PREFIX,
    firebaseProjectID: process.env.FB_PROJECT_ID,
    live_endpoint: process.env.BACKEND_URL,
  });
}
bootstrap();
