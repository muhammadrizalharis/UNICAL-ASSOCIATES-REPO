import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AffiliationDto } from './dto/affiliation.dto';
import {
  homePathForRole,
  isGateValid,
  readGateConfig,
} from './gate.util';

// Parameter Argon2id sesuai kebijakan keamanan: memori 64 MB.
const ARGON_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const SESSION_SHORT = '1d';
const SESSION_REMEMBER = '30d';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
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
      token: await this.signToken(user.id, false),
      user: this.toPublicUser(user),
      homePath: '/dashboard',
      nextStep: 'affiliation',
    };
  }

  async login(dto: LoginDto) {
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token: await this.signToken(user.id, dto.rememberMe ?? false),
      user: this.toPublicUser(user),
      homePath: homePathForRole(user.role),
      nextStep: user.profile?.affiliationCompletedAt ? null : 'affiliation',
    };
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

  private toPublicUser(user: {
    id: string;
    email: string;
    role: string;
    emailVerifiedAt: Date | null;
    profile?: Record<string, any> | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
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
            isVerified: user.profile.isVerified,
            affiliationCompleted: Boolean(user.profile.affiliationCompletedAt),
          }
        : null,
    };
  }
}
