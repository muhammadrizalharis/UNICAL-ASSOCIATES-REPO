import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { SessionsService } from './sessions.service';

export interface AuthenticatedRequest extends FastifyRequest {
  userId?: string;
  sessionToken?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Token tidak ditemukan.',
      });
    }

    const token = header.slice(7);

    try {
      await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Token tidak sah atau sudah kedaluwarsa.',
      });
    }

    // Token sah secara kriptografis, tetapi sesinya bisa saja sudah dicabut.
    const userId = await this.sessions.validate(token);
    if (!userId) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Sesi sudah berakhir. Silakan login kembali.',
      });
    }

    request.userId = userId;
    request.sessionToken = token;
    return true;
  }
}
