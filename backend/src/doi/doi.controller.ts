import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../common/prisma/prisma.service';
import { DoiNotFoundError, DoiResolverService } from './doi-resolver.service';
import { FetchDoiDto } from './dto/fetch-doi.dto';
import { normalizeDoi } from './doi.util';

@Controller({ path: 'publications', version: '1' })
export class DoiController {
  constructor(
    private readonly resolver: DoiResolverService,
    private readonly prisma: PrismaService,
  ) {}

  // TODO: pasang guard autentikasi setelah modul auth tersedia.
  @Post('fetch-doi')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async fetchDoi(@Body() dto: FetchDoiDto) {
    const doi = normalizeDoi(dto.doi);

    if (!doi) {
      throw new BadRequestException({
        code: 'DOI_INVALID',
        message:
          'Format DOI tidak valid. Contoh benar: 10.1016/j.eswa.2024.123456',
      });
    }

    const existing = await this.prisma.publication.findUnique({
      where: { doi },
      select: { id: true, title: true },
    });

    if (existing) {
      throw new ConflictException({
        code: 'DOI_ALREADY_EXISTS',
        message: 'Artikel dengan DOI ini sudah terdaftar.',
        details: { publicationId: existing.id, canClaimAuthorship: true },
      });
    }

    try {
      const data = await this.resolver.resolve(doi);
      return { success: true, data };
    } catch (error) {
      if (error instanceof DoiNotFoundError) {
        throw new NotFoundException({
          code: 'DOI_NOT_FOUND',
          message:
            'DOI tidak terdaftar di CrossRef maupun DataCite. Gunakan input manual.',
          details: { doi },
        });
      }
      throw error;
    }
  }
}
