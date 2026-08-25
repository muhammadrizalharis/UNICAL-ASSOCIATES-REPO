import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

/** Mencatat galat server (5xx) berikut stack tanpa mengubah bentuk respons default. */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      const req = host.switchToHttp().getRequest<FastifyRequest>();
      const err = exception as Error;
      this.logger.error(
        `${req.method} ${req.url} -> ${status}: ${err.message}`,
        err.stack,
      );
    }
    super.catch(exception, host);
  }
}
