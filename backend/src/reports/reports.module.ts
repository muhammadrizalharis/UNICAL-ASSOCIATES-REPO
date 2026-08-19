import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';

class CreateReportDto {
  @IsOptional()
  @IsUUID()
  publicationId?: string;

  @IsIn(['TAKEDOWN', 'ABUSE', 'OTHER'])
  type!: 'TAKEDOWN' | 'ABUSE' | 'OTHER';

  @IsString()
  @MinLength(20, { message: 'Jelaskan laporan minimal 20 karakter' })
  @MaxLength(4000)
  reason!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;
}

class ResolveReportDto {
  @IsIn(['RESOLVED', 'DISMISSED'])
  status!: 'RESOLVED' | 'DISMISSED';

  @IsString()
  @MinLength(5, { message: 'Catatan penyelesaian minimal 5 karakter' })
  @MaxLength(2000)
  resolutionNote!: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReportDto, reporterId: string | null) {
    if (dto.publicationId) {
      const exists = await this.prisma.publication.findUnique({
        where: { id: dto.publicationId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException({
          code: 'PUBLICATION_NOT_FOUND',
          message: 'Publikasi yang dilaporkan tidak ditemukan.',
        });
      }
    }

    if (!reporterId && !dto.email) {
      throw new BadRequestException({
        code: 'CONTACT_REQUIRED',
        message: 'Sertakan email agar kami dapat menindaklanjuti laporan Anda.',
      });
    }

    const report = await this.prisma.report.create({
      data: {
        publicationId: dto.publicationId ?? null,
        reporterId,
        reporterEmail: dto.email?.toLowerCase() ?? null,
        type: dto.type,
        reason: dto.reason.trim(),
      },
      select: { id: true, createdAt: true },
    });

    return {
      id: report.id,
      receivedAt: report.createdAt,
      message:
        'Laporan diterima. Tim moderasi meninjau laporan takedown dalam 3×24 jam kerja.',
    };
  }

  async list(status: string | undefined, page: number) {
    const limit = 20;
    const where =
      status && ['OPEN', 'RESOLVED', 'DISMISSED'].includes(status)
        ? { status: status as 'OPEN' | 'RESOLVED' | 'DISMISSED' }
        : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          publication: { select: { id: true, title: true, doi: true } },
          reporter: { select: { email: true } },
        },
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        reason: r.reason,
        contact: r.reporter?.email ?? r.reporterEmail,
        publication: r.publication,
        resolutionNote: r.resolutionNote,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
      meta: { page, perPage: limit, total },
    };
  }

  async resolve(adminId: string, id: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!report) {
      throw new NotFoundException({
        code: 'REPORT_NOT_FOUND',
        message: 'Laporan tidak ditemukan.',
      });
    }
    if (report.status !== 'OPEN') {
      throw new BadRequestException({
        code: 'REPORT_ALREADY_CLOSED',
        message: 'Laporan ini sudah ditutup.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id },
        data: {
          status: dto.status,
          resolutionNote: dto.resolutionNote.trim(),
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: `report.${dto.status.toLowerCase()}`,
          targetType: 'report',
          targetId: id,
        },
      }),
    ]);

    return { id, status: dto.status };
  }
}

@Controller({ version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Publik dan boleh anonim; throttle ketat untuk menahan spam. */
  @Post('reports')
  @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
  async create(@Body() dto: CreateReportDto, @Req() request: FastifyRequest) {
    // Bila pengirim login, kaitkan laporannya tanpa mewajibkan token.
    const reporterId =
      (request as FastifyRequest & { userId?: string }).userId ?? null;
    return { success: true, data: await this.reports.create(dto, reporterId) };
  }

  @Get('admin/reports')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async list(@Query('status') status?: string, @Query('page') page?: string) {
    const result = await this.reports.list(status, Math.max(1, Number(page) || 1));
    return { success: true, ...result };
  }

  @Patch('admin/reports/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async resolve(
    @CurrentUserId() adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return { success: true, data: await this.reports.resolve(adminId, id, dto) };
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
