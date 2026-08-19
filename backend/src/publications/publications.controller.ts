import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PublicationsService } from './publications.service';
import { CreatePublicationDto } from './dto/create-publication.dto';

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
}
