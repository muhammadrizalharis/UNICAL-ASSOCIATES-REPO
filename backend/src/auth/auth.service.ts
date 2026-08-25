import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { SessionsService, SessionMeta } from './sessions.service';
import { TotpService } from './totp.service';
import { NotificationsService } from '../notifications/notifications.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AffiliationDto } from './dto/affiliation.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { homePathForRole, isGateValid, readGateConfig } from './gate.util';

// Parameter Argon2id sesuai kebijakan keamanan: memori 64 MB.
const ARGON_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const SESSION_SHORT = '1d';
const SESSION_REMEMBER = '30d';
const SESSION_SHORT_MS = 24 * 60 * 60 * 1000;
const SESSION_REMEMBER_MS = 30 * SESSION_SHORT_MS;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
    private readonly totp: TotpService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta = {}) {
    if (!dto.acceptTerms) {
      throw new BadRequestException({
        code: 'TERMS_NOT_ACCEPTED',
        message: 'Anda harus menyetujui Syarat Layanan dan Kebijakan Privasi.',
      });
    }

    const email = dto.email.trim().toLowerCase();

    const taken = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email ini sudah terdaftar. Silakan masuk.',
      });
    }

    const fullName = [dto.firstName, dto.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hash(dto.password, ARGON_OPTIONS),
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() ?? null,
            fullName,
            country: dto.country ?? null,
          },
        },
      },
      include: { profile: true },
    });

    return {
      token: await this.issueSession(user.id, false, meta),
      user: this.toPublicUser(user),
      homePath: '/dashboard',
      nextStep: 'affiliation',
    };
  }

  async login(dto: LoginDto, meta: SessionMeta = {}) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    // Pesan galat disamakan agar tidak membocorkan email mana yang terdaftar.
    const invalid = new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Email atau kata sandi salah.',
    });

    if (!user) {
      // Tetap jalankan verifikasi palsu agar durasi respons seragam.
      await verify(
        '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$3+jVFJ7Z6mFqHc0S0YQ2Iw',
        dto.password,
      ).catch(() => false);
      throw invalid;
    }

    const ok = await verify(user.passwordHash, dto.password).catch(() => false);
    if (!ok) throw invalid;

    // Pintu masuk harus cocok dengan peran: anggota lewat /welcome/,
    // admin dan super admin lewat URL masing-masing. Galatnya disamakan
    // agar tidak terbaca akun mana yang berperan admin.
    if (!isGateValid(user.role, dto.gate, readGateConfig())) {
      throw invalid;
    }

    // 2FA: bila aktif, kode dari aplikasi autentikator wajib menyertai.
    if (user.totpEnabledAt && user.totpSecret) {
      if (!dto.totpCode) {
        throw new UnauthorizedException({
          code: 'TOTP_REQUIRED',
          message: 'Masukkan kode 6 digit dari aplikasi autentikator Anda.',
        });
      }
      if (!this.totp.verifyLoginCode(user.totpSecret, dto.totpCode)) {
        throw new UnauthorizedException({
          code: 'TOTP_INVALID',
          message: 'Kode 2FA salah.',
        });
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.issueSession(
      user.id,
      dto.rememberMe ?? false,
      meta,
    );

    void this.notifications.notify(user.id, {
      type: 'security.login',
      title: 'Login baru ke akun Anda',
      body: `Perangkat: ${meta.userAgent?.slice(0, 120) ?? 'tidak dikenal'} · IP: ${meta.ipAddress ?? '-'}`,
      link: '/dashboard/keamanan',
    });

    return {
      token,
      user: this.toPublicUser(user),
      homePath: homePathForRole(user.role),
      nextStep: this.nextStepFor(user.profile),
    };
  }

  /** Urutan pelengkapan profil: afiliasi dulu, lalu tautan ORCID. */
  private nextStepFor(
    profile:
      | {
          affiliationCompletedAt: Date | null;
          orcid: string | null;
          orcidPromptDismissedAt: Date | null;
        }
      | null
      | undefined,
  ): 'affiliation' | 'orcid' | null {
    if (!profile?.affiliationCompletedAt) return 'affiliation';
    if (!profile.orcid && !profile.orcidPromptDismissedAt) return 'orcid';
    return null;
  }

  async saveAffiliation(userId: string, dto: AffiliationDto) {
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { facultyId: true },
      });

      if (!department) {
        throw new BadRequestException({
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Program studi tidak ditemukan.',
        });
      }

      if (dto.facultyId && department.facultyId !== dto.facultyId) {
        throw new BadRequestException({
          code: 'DEPARTMENT_FACULTY_MISMATCH',
          message: 'Program studi tidak berada di bawah fakultas yang dipilih.',
        });
      }

      dto.facultyId = department.facultyId;
    }

    const profile = await this.prisma.researcherProfile.update({
      where: { userId },
      data: {
        institution: dto.institution?.trim() ?? undefined,
        facultyId: dto.facultyId ?? null,
        departmentId: dto.departmentId ?? null,
        facultyOther: dto.facultyOther?.trim() ?? null,
        departmentOther: dto.departmentOther?.trim() ?? null,
        affiliationCompletedAt: new Date(),
      },
      include: { faculty: true, department: true },
    });

    return { profile };
  }

  /** Menandai langkah afiliasi selesai tanpa mengisi apa pun. */
  async skipAffiliation(userId: string) {
    await this.prisma.researcherProfile.update({
      where: { userId },
      data: { affiliationCompletedAt: new Date() },
    });
    return { skipped: true };
  }

  /** Ubah kata sandi mandiri; wajib membuktikan kata sandi lama. */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentToken?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();

    const ok = await verify(user.passwordHash, dto.currentPassword).catch(
      () => false,
    );
    if (!ok) {
      throw new UnauthorizedException({
        code: 'CURRENT_PASSWORD_WRONG',
        message: 'Kata sandi saat ini salah.',
      });
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException({
        code: 'PASSWORD_UNCHANGED',
        message: 'Kata sandi baru tidak boleh sama dengan yang lama.',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(dto.newPassword, ARGON_OPTIONS) },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'user.change_password',
        targetType: 'user',
        targetId: userId,
      },
    });

    // Perangkat lain harus login ulang setelah kata sandi berganti.
    if (currentToken) {
      await this.sessions.revokeOthers(userId, currentToken);
    }

    return { changed: true };
  }

  /** Memakai token reset yang diterbitkan super admin. */
  async resetPasswordWithToken(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        message: 'Tautan reset tidak sah atau sudah kedaluwarsa.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hash(newPassword, ARGON_OPTIONS) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: record.userId,
          action: 'user.password_reset_used',
          targetType: 'user',
          targetId: record.userId,
        },
      }),
    ]);

    return { reset: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { faculty: true, department: true } } },
    });

    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }

  private async signToken(userId: string, remember: boolean): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId },
      { expiresIn: remember ? SESSION_REMEMBER : SESSION_SHORT },
    );
  }

  /** Terbitkan JWT dan daftarkan sesinya agar bisa dicabut per perangkat. */
  private async issueSession(
    userId: string,
    remember: boolean,
    meta: SessionMeta,
  ): Promise<string> {
    const token = await this.signToken(userId, remember);
    const ttl = remember ? SESSION_REMEMBER_MS : SESSION_SHORT_MS;
    await this.sessions.createForToken(
      userId,
      token,
      new Date(Date.now() + ttl),
      meta,
    );
    return token;
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: string;
    emailVerifiedAt: Date | null;
    totpEnabledAt?: Date | null;
    profile?: Record<string, any> | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      totpEnabled: Boolean(user.totpEnabledAt),
      profile: user.profile
        ? {
            unicalId: user.profile.unicalId,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            fullName: user.profile.fullName,
            country: user.profile.country,
            institution: user.profile.institution,
            faculty: user.profile.faculty?.name ?? user.profile.facultyOther,
            department:
              user.profile.department?.name ?? user.profile.departmentOther,
            orcid: user.profile.orcid ?? null,
            isVerified: user.profile.isVerified,
            affiliationCompleted: Boolean(user.profile.affiliationCompletedAt),
          }
        : null,
    };
  }
}
