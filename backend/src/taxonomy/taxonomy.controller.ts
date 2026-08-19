import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller({ version: '1' })
export class TaxonomyController {
  constructor(private readonly prisma: PrismaService) {}

  /** Pohon kategori bidang ilmu: akar beserta anaknya. */
  @Get('categories')
  async categories() {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return { success: true, data: roots };
  }

  @Get('indexations')
  async indexations() {
    const data = await this.prisma.indexation.findMany({
      orderBy: [{ name: 'asc' }, { level: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        badgeColor: true,
      },
    });

    return { success: true, data };
  }
}
