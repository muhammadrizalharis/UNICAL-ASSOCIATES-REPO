import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PublicationsService } from './publications.service';
import { CreatePublicationDto } from './dto/create-publication.dto';

const MAX_PDF_BYTES = 25 * 1024 * 1024;

@Controller({ path: 'publications', version: '1' })
export class PublicationsController {
  constructor(private readonly publications: PublicationsService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const result = await this.publications.findMany({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
    });

    return { success: true, ...result };
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.publications.findOne(id) };
  }

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async create(
    @CurrentUserId() userId: string,
    @Body() dto: CreatePublicationDto,
  ) {
    return {
      success: true,
      data: await this.publications.create(userId, dto),
    };
  }

  @Post(':id/pdf')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  async uploadPdf(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: FastifyRequest,
  ) {
    const file = await request.file({ limits: { fileSize: MAX_PDF_BYTES } });
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Berkas PDF belum dilampirkan.',
      });
    }

    const buffer = await file.toBuffer();
    return {
      success: true,
      data: await this.publications.attachPdf(userId, id, buffer),
    };
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() reply: FastifyReply,
  ) {
    const pdf = await this.publications.getPdf(id);
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', pdf.size)
      .header('Content-Disposition', `inline; filename="${pdf.filename}"`)
      .header('Cache-Control', 'public, max-age=3600')
      .send(pdf.stream);
  }
}
