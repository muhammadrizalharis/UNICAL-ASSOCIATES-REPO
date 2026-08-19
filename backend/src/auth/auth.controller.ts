import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUserId } from './current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AffiliationDto } from './dto/affiliation.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  async register(@Body() dto: RegisterDto) {
    return { success: true, data: await this.auth.register(dto) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(@Body() dto: LoginDto) {
    return { success: true, data: await this.auth.login(dto) };
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

  @Patch('password')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return {
      success: true,
      data: await this.auth.changePassword(userId, dto),
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUserId() userId: string) {
    return { success: true, data: await this.auth.me(userId) };
  }
}
