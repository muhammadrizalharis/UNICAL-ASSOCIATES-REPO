import {
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
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';
import { AdminService } from './admin.service';

class RejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller({ path: 'admin', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('publications')
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async pendingPublications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.admin.pendingPublications(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
    return { success: true, ...result };
  }

  @Patch('publications/:id/approve')
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async approve(
    @CurrentUserId() moderatorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: await this.admin.decidePublication(moderatorId, id, true),
    };
  }

  @Patch('publications/:id/reject')
  @Roles('MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN')
  async reject(
    @CurrentUserId() moderatorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDto,
  ) {
    return {
      success: true,
      data: await this.admin.decidePublication(
        moderatorId,
        id,
        false,
        dto.reason,
      ),
    };
  }

  @Get('researchers/pending')
  @Roles('FACULTY_ADMIN', 'SUPER_ADMIN')
  async pendingResearchers() {
    return { success: true, data: await this.admin.pendingUsers() };
  }

  @Post('metrics/recalculate')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN')
  async recalculateMetrics() {
    return { success: true, data: await this.admin.recalculateAllMetrics() };
  }

  @Patch('researchers/:id/verify')
  @Roles('FACULTY_ADMIN', 'SUPER_ADMIN')
  async verifyResearcher(
    @CurrentUserId() adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: await this.admin.verifyResearcher(adminId, id),
    };
  }
}
