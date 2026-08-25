import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/observability/all-exceptions.filter';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // trustProxy wajib karena API berada di belakang nginx dan proxy kampus.
    new FastifyAdapter({ trustProxy: true, bodyLimit: MAX_UPLOAD_BYTES }),
  );

  // CSP diatur di unical-nginx agar tidak dobel dengan header dari proxy.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });

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

  // Observability: catat galat 5xx (dengan stack) tanpa mengubah bentuk respons.
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  // Catat permintaan lambat (>1s) atau bergalat server untuk pemantauan latensi.
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onResponse', (request, reply, done) => {
    const ms = reply.elapsedTime;
    if (reply.statusCode >= 500 || ms > 1000) {
      Logger.warn(
        `${request.method} ${request.url} ${reply.statusCode} ${Math.round(ms)}ms`,
        'HTTP',
      );
    }
    done();
  });

  // Dokumentasi API publik: /api/docs (UI) dan /api/docs-json (spec).
  const openapi = new DocumentBuilder()
    .setTitle('UNICAL ASSOCIATES REPO API')
    .setDescription(
      'API publik repositori publikasi ilmiah Universitas Muhammadiyah Makassar. ' +
        'Endpoint baca (publikasi, pencarian, peneliti, statistik) terbuka; ' +
        'endpoint tulis membutuhkan token Bearer.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, openapi),
    { customSiteTitle: 'UNICAL API Docs' },
  );

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`unical-api siap di port ${port}`, 'Bootstrap');
}

void bootstrap();
