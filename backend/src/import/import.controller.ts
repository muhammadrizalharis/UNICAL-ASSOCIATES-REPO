import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { ImportService } from './import.service';
import { ManualReferenceDto, ResolveIdentifiersDto } from './dto/import.dto';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

@Controller({ path: 'publications/import', version: '1' })
@UseGuards(AuthGuard)
export class ImportController {
  constructor(private readonly importer: ImportService) {}

  /** Banyak identifier sekaligus: DOI, arXiv, PMID, PMCID, atau ISBN. */
  @Post('identifiers')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async identifiers(@Body() dto: ResolveIdentifiersDto) {
    const items = await this.importer.resolveIdentifiers(dto.identifiers);

    return {
      success: true,
      data: {
        total: items.length,
        summary: {
          ok: items.filter((i) => i.status === 'ok').length,
          duplicate: items.filter((i) => i.status === 'duplicate').length,
          invalid: items.filter((i) => i.status === 'invalid').length,
          failed: items.filter((i) => i.status === 'failed').length,
        },
        items,
      },
    };
  }

  /** Unggah berkas pustaka: .bib, .ris, .enw, .txt, atau .csv. */
  @Post('library')
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  async library(@Req() request: FastifyRequest) {
    const file = await this.readFile(request);
    return {
      success: true,
      data: await this.importer.importLibrary(
        file.filename,
        file.buffer.toString('utf8'),
      ),
    };
  }

  /** Unggah PDF; DOI dicari langsung dari isi berkas. */
  @Post('pdf')
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  async pdf(@Req() request: FastifyRequest) {
    const file = await this.readFile(request);

    if (!file.filename.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException({
        code: 'NOT_A_PDF',
        message: 'Berkas harus berekstensi .pdf',
      });
    }

    return {
      success: true,
      data: await this.importer.fromPdf(file.filename, file.buffer),
    };
  }

  @Post('manual')
  async manual(@Body() dto: ManualReferenceDto) {
    return { success: true, data: this.importer.buildManual(dto) };
  }

  private async readFile(
    request: FastifyRequest,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const file = await request.file({ limits: { fileSize: MAX_FILE_BYTES } });

    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Berkas belum dilampirkan.',
      });
    }

    return { filename: file.filename, buffer: await file.toBuffer() };
  }
}
