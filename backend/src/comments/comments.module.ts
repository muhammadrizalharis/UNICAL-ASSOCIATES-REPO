import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import {
  NotificationsService,
  NotificationsModule,
} from '../notifications/notifications.module';

class CreateCommentDto {
  @IsString()
  @MinLength(3, { message: 'Komentar minimal 3 karakter' })
  @MaxLength(2000, { message: 'Komentar maksimal 2000 karakter' })
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

const MODERATOR_ROLES = ['MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(publicationId: string, page: number) {
    const limit = 50;
    const where = { publicationId, parentId: null };

    const [total, roots] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { profile: { select: { fullName: true, unicalId: true } } },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  profile: { select: { fullName: true, unicalId: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const toView = (c: {
      id: string;
      body: string;
      deletedAt: Date | null;
      createdAt: Date;
      user: { profile: { fullName: string; unicalId: string | null } | null };
    }) => ({
      id: c.id,
      body: c.deletedAt ? '[komentar dihapus]' : c.body,
      deleted: Boolean(c.deletedAt),
      createdAt: c.createdAt,
      author: {
        fullName: c.deletedAt ? null : (c.user.profile?.fullName ?? 'Pengguna'),
        unicalId: c.deletedAt ? null : (c.user.profile?.unicalId ?? null),
      },
    });

    return {
      data: roots.map((root) => ({
        ...toView(root),
        replies: root.replies.map(toView),
      })),
      meta: { page, perPage: limit, total },
    };
  }

  async create(userId: string, publicationId: string, dto: CreateCommentDto) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, status: 'APPROVED' },
      select: { id: true, title: true, submittedById: true },
    });
    if (!publication) {
      throw new NotFoundException({
        code: 'PUBLICATION_NOT_FOUND',
        message: 'Publikasi tidak ditemukan.',
      });
    }

    let parentAuthorId: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, publicationId, parentId: null },
        select: { userId: true },
      });
      if (!parent) {
        throw new BadRequestException({
          code: 'PARENT_COMMENT_INVALID',
          message:
            'Balasan hanya bisa untuk komentar utama di publikasi yang sama.',
        });
      }
      parentAuthorId = parent.userId;
    }

    const comment = await this.prisma.comment.create({
      data: {
        publicationId,
        userId,
        parentId: dto.parentId ?? null,
        body: dto.body.trim(),
      },
      include: {
        user: {
          select: { profile: { select: { fullName: true, unicalId: true } } },
        },
      },
    });

    const commenter = comment.user.profile?.fullName ?? 'Seseorang';
    const link = `/publikasi/${publicationId}`;
    if (parentAuthorId && parentAuthorId !== userId) {
      void this.notifications.notify(parentAuthorId, {
        type: 'social.reply',
        title: `${commenter} membalas komentar Anda`,
        body: dto.body.slice(0, 140),
        link,
      });
    } else if (publication.submittedById !== userId) {
      void this.notifications.notify(publication.submittedById, {
        type: 'social.comment',
        title: `${commenter} mengomentari "${publication.title.slice(0, 80)}"`,
        body: dto.body.slice(0, 140),
        link,
      });
    }

    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: {
        fullName: comment.user.profile?.fullName ?? 'Pengguna',
        unicalId: comment.user.profile?.unicalId ?? null,
      },
    };
  }

  /** Penulis menghapus miliknya; moderator boleh menghapus apa pun. */
  async softDelete(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, deletedAt: true },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Komentar tidak ditemukan.',
      });
    }

    if (comment.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user || !MODERATOR_ROLES.includes(user.role)) {
        throw new ForbiddenException({
          code: 'COMMENT_FORBIDDEN',
          message: 'Anda hanya bisa menghapus komentar sendiri.',
        });
      }
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }
}

@Controller({ version: '1' })
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('publications/:id/comments')
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
  ) {
    const result = await this.comments.list(id, Math.max(1, Number(page) || 1));
    return { success: true, ...result };
  }

  @Post('publications/:id/comments')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  async create(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return { success: true, data: await this.comments.create(userId, id, dto) };
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { success: true, data: await this.comments.softDelete(userId, id) };
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
