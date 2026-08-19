import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

const MAX_COLLECTIONS = 50;
const MAX_ITEMS = 500;

class CreateCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class AddItemDto {
  @IsUUID()
  publicationId!: string;
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCollectionDto) {
    const count = await this.prisma.collection.count({ where: { userId } });
    if (count >= MAX_COLLECTIONS) {
      throw new BadRequestException({
        code: 'COLLECTION_LIMIT',
        message: `Maksimal ${MAX_COLLECTIONS} koleksi per akun.`,
      });
    }

    const existing = await this.prisma.collection.findUnique({
      where: { userId_name: { userId, name: dto.name.trim() } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'COLLECTION_NAME_TAKEN',
        message: 'Anda sudah punya koleksi dengan nama itu.',
      });
    }

    return this.prisma.collection.create({
      data: {
        userId,
        name: dto.name.trim(),
        isPublic: dto.isPublic ?? false,
      },
      select: { id: true, name: true, isPublic: true, createdAt: true },
    });
  }

  async listOwn(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
  }

  async detail(userId: string | null, id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPublic: true,
        userId: true,
        createdAt: true,
        items: {
          orderBy: { addedAt: 'desc' },
          select: {
            addedAt: true,
            publication: {
              select: {
                id: true,
                title: true,
                doi: true,
                publishedDate: true,
                citationCount: true,
                journal: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!collection || (!collection.isPublic && collection.userId !== userId)) {
      throw new NotFoundException({
        code: 'COLLECTION_NOT_FOUND',
        message: 'Koleksi tidak ditemukan.',
      });
    }

    return {
      id: collection.id,
      name: collection.name,
      isPublic: collection.isPublic,
      isOwner: collection.userId === userId,
      createdAt: collection.createdAt,
      items: collection.items.map((item) => ({
        addedAt: item.addedAt,
        publication: {
          ...item.publication,
          journal: item.publication.journal?.name ?? null,
          year: item.publication.publishedDate?.getFullYear() ?? null,
        },
      })),
    };
  }

  private async mustOwn(userId: string, id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!collection) {
      throw new NotFoundException({
        code: 'COLLECTION_NOT_FOUND',
        message: 'Koleksi tidak ditemukan.',
      });
    }
    if (collection.userId !== userId) {
      throw new ForbiddenException({
        code: 'COLLECTION_FORBIDDEN',
        message: 'Koleksi ini bukan milik Anda.',
      });
    }
  }

  async addItem(userId: string, id: string, publicationId: string) {
    await this.mustOwn(userId, id);

    const itemCount = await this.prisma.collectionItem.count({
      where: { collectionId: id },
    });
    if (itemCount >= MAX_ITEMS) {
      throw new BadRequestException({
        code: 'COLLECTION_FULL',
        message: `Maksimal ${MAX_ITEMS} publikasi per koleksi.`,
      });
    }

    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, status: 'APPROVED' },
      select: { id: true },
    });
    if (!publication) {
      throw new NotFoundException({
        code: 'PUBLICATION_NOT_FOUND',
        message: 'Publikasi tidak ditemukan.',
      });
    }

    await this.prisma.collectionItem.upsert({
      where: {
        collectionId_publicationId: { collectionId: id, publicationId },
      },
      create: { collectionId: id, publicationId },
      update: {},
    });
    return { added: true };
  }

  async removeItem(userId: string, id: string, publicationId: string) {
    await this.mustOwn(userId, id);
    await this.prisma.collectionItem.deleteMany({
      where: { collectionId: id, publicationId },
    });
    return { removed: true };
  }

  async remove(userId: string, id: string) {
    await this.mustOwn(userId, id);
    await this.prisma.collection.delete({ where: { id } });
    return { deleted: true };
  }
}

@Controller({ path: 'collections', version: '1' })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async create(@CurrentUserId() userId: string, @Body() dto: CreateCollectionDto) {
    return { success: true, data: await this.collections.create(userId, dto) };
  }

  @Get()
  @UseGuards(AuthGuard)
  async listOwn(@CurrentUserId() userId: string) {
    return { success: true, data: await this.collections.listOwn(userId) };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async detail(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { success: true, data: await this.collections.detail(userId, id) };
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async addItem(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddItemDto,
  ) {
    return {
      success: true,
      data: await this.collections.addItem(userId, id, dto.publicationId),
    };
  }

  @Delete(':id/items/:publicationId')
  @UseGuards(AuthGuard)
  async removeItem(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
  ) {
    return {
      success: true,
      data: await this.collections.removeItem(userId, id, publicationId),
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { success: true, data: await this.collections.remove(userId, id) };
  }
}

@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
