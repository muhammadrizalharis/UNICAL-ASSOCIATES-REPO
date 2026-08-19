import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';

const LAST_SEEN_STALE_MS = 5 * 60 * 1000;

export interface SessionMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

/** Registri sesi perangkat; JWT hanya sah bila sesinya masih hidup. */
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createForToken(
    userId: string,
    token: string,
    expiresAt: Date,
    meta: SessionMeta,
  ): Promise<void> {
    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt,
      },
    });
  }

  /** Mengembalikan userId bila sesi hidup; null bila dicabut/kedaluwarsa. */
  async validate(token: string): Promise<string | null> {
    const tokenHash = this.hashToken(token);
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, revokedAt: true, expiresAt: true, lastSeenAt: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_STALE_MS) {
      // Fire-and-forget; kegagalan tidak mengganggu permintaan.
      void this.prisma.userSession
        .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined);
    }

    return session.userId;
  }

  async list(userId: string, currentToken: string) {
    const currentHash = this.hashToken(currentToken);
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        tokenHash: true,
        userAgent: true,
        ipAddress: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastSeenAt: s.lastSeenAt,
      createdAt: s.createdAt,
      current: s.tokenHash === currentHash,
    }));
  }

  async revoke(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  /** Cabut semua sesi lain, misalnya setelah ganti kata sandi. */
  async revokeOthers(userId: string, currentToken: string): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        tokenHash: { not: this.hashToken(currentToken) },
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}
