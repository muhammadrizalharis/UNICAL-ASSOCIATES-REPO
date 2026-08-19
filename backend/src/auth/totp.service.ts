import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../common/prisma/prisma.service';

const ISSUER = 'UNICAL ASSOCIATES REPO';

/** 2FA berbasis TOTP (Google Authenticator, Aegis, dan sejenisnya). */
@Injectable()
export class TotpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Buat rahasia baru; aktif hanya setelah kode pertama diverifikasi. */
  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, totpEnabledAt: true },
    });
    if (!user) throw new UnauthorizedException();
    if (user.totpEnabledAt) {
      throw new BadRequestException({
        code: 'TOTP_ALREADY_ENABLED',
        message: '2FA sudah aktif. Nonaktifkan dulu untuk membuat rahasia baru.',
      });
    }

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    });

    const otpauth = authenticator.keyuri(user.email, ISSUER, secret);
    return {
      secret,
      otpauth,
      qrDataUrl: await toDataURL(otpauth, { margin: 1, width: 220 }),
    };
  }

  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabledAt: true },
    });
    if (!user?.totpSecret) {
      throw new BadRequestException({
        code: 'TOTP_NOT_SETUP',
        message: 'Jalankan setup 2FA terlebih dahulu.',
      });
    }
    if (user.totpEnabledAt) return { enabled: true };

    if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new BadRequestException({
        code: 'TOTP_INVALID',
        message: 'Kode 2FA salah. Periksa aplikasi autentikator Anda.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { totpEnabledAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'user.totp_enable',
          targetType: 'user',
          targetId: userId,
        },
      }),
    ]);

    return { enabled: true };
  }

  async disable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabledAt: true },
    });
    if (!user?.totpEnabledAt || !user.totpSecret) return { disabled: true };

    if (!authenticator.verify({ token: code, secret: user.totpSecret })) {
      throw new BadRequestException({
        code: 'TOTP_INVALID',
        message: 'Kode 2FA salah.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { totpSecret: null, totpEnabledAt: null },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'user.totp_disable',
          targetType: 'user',
          targetId: userId,
        },
      }),
    ]);

    return { disabled: true };
  }

  verifyLoginCode(secret: string, code: string): boolean {
    return authenticator.verify({ token: code, secret });
  }
}
