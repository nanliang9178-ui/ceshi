import { Controller, Get, Query } from '@nestjs/common';
import { TenantId } from '../../common/decorators';
import { StatsService } from './stats.service';

@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('dashboard')
  dashboard(@TenantId() tenantId: string) {
    return this.stats.dashboard(tenantId);
  }

  @Get('overview')
  overview(
    @TenantId() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.stats.overview(tenantId, dateFrom, dateTo);
  }
}
