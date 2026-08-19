import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClaimsService } from './claims.service';
import {
  EXPORT_FORMATS,
  ExportFormat,
} from '../publications/citation-export.util';

class SubmitClaimDto {
  @IsInt()
  @Min(1)
  authorOrder!: number;
}

class RejectClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller({ version: '1' })
export class ClaimsController {
  constructor(
    private readonly claims: ClaimsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Tombol "Ini publikasi saya" pada halaman detail. */
  @Post('publications/:id/claim')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async submit(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) publicationId: string,
    @Body() dto: SubmitClaimDto,
  ) {
    return {
      success: true,
      data: await this.claims.submit(userId, publicationId, dto.authorOrder),
    };
  }

  /** Ekspor sitasi; publik karena metadata memang terbuka. */
  @Get('publications/:id/export')
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const chosen = (format ?? 'bibtex') as ExportFormat;
    const spec = EXPORT_FORMATS[chosen];
    if (!spec) {
      throw new BadRequestException({
        code: 'FORMAT_UNSUPPORTED',
        message: 'Format harus salah satu dari: bibtex, ris, apa.',
      });
    }

    const row = await this.prisma.publication.findUnique({
      where: { id, status: 'APPROVED' },
      select: {
        doi: true,
        title: true,
        volume: true,
        issue: true,
        pages: true,
        publishedDate: true,
        journal: { select: { name: true } },
        authors: {
          orderBy: { authorOrder: 'asc' },
          select: { rawAuthorName: true },
        },
      },
    });

    if (!row) {
      throw new BadRequestException({
        code: 'PUBLICATION_NOT_FOUND',
        message: 'Publikasi tidak ditemukan.',
      });
    }

    const text = spec.fn({
      doi: row.doi,
      title: row.title,
      authors: row.authors.map((a) => a.rawAuthorName),
      journal: row.journal?.name ?? null,
      year: row.publishedDate?.getFullYear() ?? null,
      volume: row.volume,
      issue: row.issue,
      pages: row.pages,
    });

    reply
      .header('Content-Type', `${spec.mime}; charset=utf-8`)
      .header(
        'Content-Disposition',
        `attachment; filename="unical-${id.slice(0, 8)}.${spec.ext}"`,
      )
      .send(text);
  }

  @Get('admin/claims')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async pending(@Query('page') page?: string) {
    const result = await this.claims.pending(page ? Number(page) : 1);
    return { success: true, ...result };
  }

  @Patch('admin/claims/:id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async approve(
    @CurrentUserId() reviewerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: await this.claims.decide(reviewerId, id, true),
    };
  }

  @Patch('admin/claims/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async reject(
    @CurrentUserId() reviewerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectClaimDto,
  ) {
    return {
      success: true,
      data: await this.claims.decide(reviewerId, id, false, dto.reason),
    };
  }
}
