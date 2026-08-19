import { Injectable, Logger, Module } from '@nestjs/common';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

export interface NotifyPayload {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Kirim notifikasi dalam aplikasi; kegagalan tidak boleh mengganggu alur utama. */
  async notify(userId: string, payload: NotifyPayload): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { userId, ...payload },
      });
    } catch (error) {
      this.logger.warn(`Notifikasi gagal: ${(error as Error).message}`);
    }
  }

  async notifyMany(userIds: string[], payload: NotifyPayload): Promise<void> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: unique.map((userId) => ({ userId, ...payload })),
      });
    } catch (error) {
      this.logger.warn(`Notifikasi massal gagal: ${(error as Error).message}`);
    }
  }

  async list(userId: string, page: number) {
    const limit = 20;
    const [total, unread, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows,
      meta: { page, perPage: limit, total, unread },
    };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: result.count };
  }
}

@Controller({ path: 'notifications', version: '1' })
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUserId() userId: string, @Query('page') page?: string) {
    const result = await this.notifications.list(
      userId,
      Math.max(1, Number(page) || 1),
    );
    return { success: true, ...result };
  }

  @Patch('read-all')
  async readAll(@CurrentUserId() userId: string) {
    return { success: true, data: await this.notifications.markAllRead(userId) };
  }

  @Patch(':id/read')
  async read(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { success: true, data: await this.notifications.markRead(userId, id) };
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
