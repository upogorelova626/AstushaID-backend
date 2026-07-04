import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

function getAllowedOrigins(): string[] {
  const origins = process.env.CLIENT_ORIGINS;

  if (!origins) {
    return ['http://localhost:4202', 'http://localhost:4200'];
  }

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Astusha ID API')
    .setDescription('Identity service API for Astusha ecosystem')
    .setVersion('1.0.0')
    .addCookieAuth('accessToken')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api_id', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3002);
}

void bootstrap();
