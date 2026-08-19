import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedRequest } from './auth.guard';
import { AppRole, ROLES_KEY } from './roles.decorator';

/** Dipakai setelah AuthGuard; membaca peran dari database, bukan dari token. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowed?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { role: true },
    });

    if (!user || !allowed.includes(user.role as AppRole)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Peran Anda tidak berwenang melakukan aksi ini.',
      });
    }

    return true;
  }
}
