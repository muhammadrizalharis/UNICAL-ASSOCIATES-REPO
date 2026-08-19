import { Controller, Get, Param, Query } from '@nestjs/common';
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
}
