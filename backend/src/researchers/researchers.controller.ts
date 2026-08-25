import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ResearchersService } from './researchers.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

@Controller({ path: 'researchers', version: '1' })
export class ResearchersController {
  constructor(private readonly researchers: ResearchersService) {}

  @Patch('me')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async updateMe(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return {
      success: true,
      data: await this.researchers.updateProfile(userId, dto),
    };
  }

  @Post('me/avatar')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  async uploadAvatar(
    @CurrentUserId() userId: string,
    @Req() request: FastifyRequest,
  ) {
    const file = await request.file({ limits: { fileSize: MAX_AVATAR_BYTES } });
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Berkas gambar belum dilampirkan.',
      });
    }
    const buffer = await file.toBuffer();
    return {
      success: true,
      data: await this.researchers.setAvatar(userId, buffer),
    };
  }

  @Get('avatar/:profileId')
  async avatar(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Res() reply: FastifyReply,
  ) {
    const object = await this.researchers.getAvatar(profileId);
    reply
      .header('Content-Type', object.contentType)
      .header('Content-Length', object.size)
      .header('Cache-Control', 'public, max-age=86400')
      .send(object.stream);
  }

  @Delete('me/avatar')
  @UseGuards(AuthGuard)
  async removeAvatar(@CurrentUserId() userId: string) {
    return {
      success: true,
      data: await this.researchers.removeAvatar(userId),
    };
  }

  @Get()
  async directory(
    @Query('q') q?: string,
    @Query('facultyId') facultyId?: string,
    @Query('page') page?: string,
  ) {
    const result = await this.researchers.directory({
      q,
      facultyId,
      page: page ? Number(page) : undefined,
    });

    return { success: true, ...result };
  }

  @Get(':unicalId')
  async profile(@Param('unicalId') unicalId: string) {
    return {
      success: true,
      data: await this.researchers.publicProfile(unicalId.toUpperCase()),
    };
  }

  @Get(':unicalId/follow-state')
  @UseGuards(AuthGuard)
  async followState(
    @CurrentUserId() userId: string,
    @Param('unicalId') unicalId: string,
  ) {
    return {
      success: true,
      data: await this.researchers.followState(userId, unicalId.toUpperCase()),
    };
  }

  @Post(':unicalId/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async follow(
    @CurrentUserId() userId: string,
    @Param('unicalId') unicalId: string,
  ) {
    return {
      success: true,
      data: await this.researchers.follow(userId, unicalId.toUpperCase()),
    };
  }

  @Delete(':unicalId/follow')
  @UseGuards(AuthGuard)
  async unfollow(
    @CurrentUserId() userId: string,
    @Param('unicalId') unicalId: string,
  ) {
    return {
      success: true,
      data: await this.researchers.unfollow(userId, unicalId.toUpperCase()),
    };
  }
}
