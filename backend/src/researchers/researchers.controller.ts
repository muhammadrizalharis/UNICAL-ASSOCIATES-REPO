import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { ResearchersService } from './researchers.service';

@Controller({ path: 'researchers', version: '1' })
export class ResearchersController {
  constructor(private readonly researchers: ResearchersService) {}

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
