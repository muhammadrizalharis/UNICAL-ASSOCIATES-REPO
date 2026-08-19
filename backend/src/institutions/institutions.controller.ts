import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller({ path: 'institutions', version: '1' })
export class InstitutionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('faculties')
  async faculties() {
    const data = await this.prisma.faculty.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        website: true,
        _count: { select: { departments: true } },
      },
    });

    return { success: true, data };
  }

  /** Menyuplai autocomplete program studi pada langkah afiliasi. */
  @Get('departments')
  async departments(
    @Query('facultyId') facultyId?: string,
    @Query('q') q?: string,
  ) {
    const data = await this.prisma.department.findMany({
      where: {
        facultyId: facultyId || undefined,
        name: q ? { contains: q, mode: 'insensitive' } : undefined,
      },
      orderBy: [{ faculty: { order: 'asc' } }, { name: 'asc' }],
      take: 50,
      select: {
        id: true,
        name: true,
        degree: true,
        faculty: { select: { id: true, name: true } },
      },
    });

    return { success: true, data };
  }
}
