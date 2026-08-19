import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller({ path: 'stats', version: '1' })
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  async institution() {
    return { success: true, data: await this.stats.institution() };
  }

  @Get('faculties/:id')
  async facultyReport(@Param('id', ParseUUIDPipe) id: string) {
    const report = await this.stats.facultyReport(id);
    if (!report) {
      throw new NotFoundException({
        code: 'FACULTY_NOT_FOUND',
        message: 'Fakultas tidak ditemukan.',
      });
    }
    return { success: true, data: report };
  }
}
