import 'reflect-metadata';
import dotenv from 'dotenv';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

dotenv.config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Emulator Studio API')
    .setDescription('REST API for local multi-cloud emulator dashboards')
    .setVersion('0.1.0')
    .addTag('Health')
    .addTag('Pub/Sub')
    .addTag('Emulators')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.getHttpAdapter().get('/docs.json', (_req, res) => {
    res.json(document);
  });

  const port = Number(process.env.API_PORT ?? 3001);
  app.enableShutdownHooks();
  await app.listen(port);

  console.log(`Emulator Studio API http://localhost:${port}`);
  console.log(`Swagger UI http://localhost:${port}/docs`);
  console.log(`Project: ${process.env.GOOGLE_CLOUD_PROJECT ?? 'local-dev'}`);
  console.log(`Emulator: ${process.env.PUBSUB_EMULATOR_HOST ?? '(PUBSUB_EMULATOR_HOST not set)'}`);
}

bootstrap().catch((err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n[api] Port ${process.env.API_PORT ?? 3001} is already in use.\n` +
        'Stop the other process (Ctrl+C on an old npm run dev) or change API_PORT in .env\n'
    );
  } else {
    console.error('[api] Failed to start:', err);
  }
  process.exit(1);
});
