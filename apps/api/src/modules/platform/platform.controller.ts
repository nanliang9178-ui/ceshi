import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import {
  CreateTenantDto,
  ResetOwnerPasswordDto,
  TenantListQueryDto,
  UpdateTenantDto,
} from './dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@Roles('PLATFORM')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('overview')
  overview() {
    return this.platform.overview();
  }

  @Get('tenants')
  list(@Query() query: TenantListQueryDto) {
    return this.platform.listTenants(query);
  }

  @Post('tenants')
  create(@Body() dto: CreateTenantDto) {
    return this.platform.createTenant(dto);
  }

  @Get('tenants/:id')
  detail(@Param('id') id: string) {
    return this.platform.detail(id);
  }

  @Put('tenants/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.platform.updateTenant(id, dto);
  }

  @Post('tenants/:id/owner-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetOwnerPasswordDto) {
    return this.platform.resetOwnerPassword(id, dto);
  }
}
