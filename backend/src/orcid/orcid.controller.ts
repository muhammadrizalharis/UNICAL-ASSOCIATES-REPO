import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrcidService } from './orcid.service';

class LinkOrcidDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, {
    message: 'Format ORCID iD tidak valid. Contoh: 0000-0003-1469-9468',
  })
  orcid!: string;
}

@Controller({ version: '1' })
@UseGuards(AuthGuard)
export class OrcidController {
  constructor(
    private readonly orcid: OrcidService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Peneliti menautkan ORCID iD ke profilnya sendiri; afiliasi dan seluruh
   * karyanya langsung disinkronkan sehingga profil terisi sekali jalan.
   */
  @Patch('researchers/me/orcid')
  @Throttle({ default: { ttl: 300_000, limit: 3 } })
  async linkSelf(@CurrentUserId() userId: string, @Body() dto: LinkOrcidDto) {
    return {
      success: true,
      data: await this.orcid.linkAndSync(userId, dto.orcid),
    };
  }

  /** Pengguna memilih menunda penautan ORCID; ajakan tidak muncul lagi. */
  @Post('researchers/me/orcid/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissPrompt(@CurrentUserId() userId: string) {
    await this.prisma.researcherProfile.update({
      where: { userId },
      data: { orcidPromptDismissedAt: new Date() },
    });
    return { success: true, data: { dismissed: true } };
  }

  /** Peneliti mengimpor karya dari ORCID miliknya sendiri. */
  @Post('researchers/me/orcid/import')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 300_000, limit: 2 } })
  async importSelf(@CurrentUserId() userId: string) {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return {
      success: true,
      data: await this.orcid.importWorks(profile!.id),
    };
  }

  /** Admin memicu impor ORCID untuk peneliti mana pun. */
  @Post('admin/researchers/:id/orcid/import')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('FACULTY_ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  async importFor(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.orcid.importWorks(id) };
  }
}
