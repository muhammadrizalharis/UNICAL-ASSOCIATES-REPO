import {
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';
import { SessionsService } from './sessions.service';
import { TotpService } from './totp.service';
import { CurrentUserId } from './current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AffiliationDto } from './dto/affiliation.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IsString, Length, MinLength, MaxLength } from 'class-validator';

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(12, { message: 'Kata sandi baru minimal 12 karakter' })
  @MaxLength(128)
  newPassword!: string;
}

class TotpCodeDto {
  @IsString()
  @Length(6, 6, { message: 'Kode 2FA harus 6 digit' })
  code!: string;
}

function requestMeta(request: FastifyRequest) {
  return {
    userAgent: request.headers['user-agent'] ?? null,
    ipAddress: request.ip ?? null,
  };
}

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly totp: TotpService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  async register(@Body() dto: RegisterDto, @Req() request: FastifyRequest) {
    return {
      success: true,
      data: await this.auth.register(dto, requestMeta(request)),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(@Body() dto: LoginDto, @Req() request: FastifyRequest) {
    return {
      success: true,
      data: await this.auth.login(dto, requestMeta(request)),
    };
  }

  @Patch('affiliation')
  @UseGuards(AuthGuard)
  async saveAffiliation(
    @CurrentUserId() userId: string,
    @Body() dto: AffiliationDto,
  ) {
    return { success: true, data: await this.auth.saveAffiliation(userId, dto) };
  }

  @Post('affiliation/skip')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async skipAffiliation(@CurrentUserId() userId: string) {
    return { success: true, data: await this.auth.skipAffiliation(userId) };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return {
      success: true,
      data: await this.auth.resetPasswordWithToken(dto.token, dto.newPassword),
    };
  }

  @Patch('password')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.auth.changePassword(userId, dto, request.sessionToken),
    };
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async listSessions(
    @CurrentUserId() userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.sessions.list(userId, request.sessionToken ?? ''),
    };
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  async revokeSession(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: { revoked: await this.sessions.revoke(userId, id) },
    };
  }

  @Post('totp/setup')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async totpSetup(@CurrentUserId() userId: string) {
    return { success: true, data: await this.totp.setup(userId) };
  }

  @Post('totp/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async totpEnable(@CurrentUserId() userId: string, @Body() dto: TotpCodeDto) {
    return { success: true, data: await this.totp.enable(userId, dto.code) };
  }

  @Post('totp/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async totpDisable(@CurrentUserId() userId: string, @Body() dto: TotpCodeDto) {
    return { success: true, data: await this.totp.disable(userId, dto.code) };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUserId() userId: string) {
    return { success: true, data: await this.auth.me(userId) };
  }
}
