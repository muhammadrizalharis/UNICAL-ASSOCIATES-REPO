import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // trustProxy wajib karena API berada di belakang nginx dan proxy kampus.
    new FastifyAdapter({ trustProxy: true, bodyLimit: MAX_UPLOAD_BYTES }),
  );

  // CSP diatur di unical-nginx agar tidak dobel dengan header dari proxy.
  await app.register(helmet, { contentSecurityPolicy: false });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`unical-api siap di port ${port}`, 'Bootstrap');
}

void bootstrap();
