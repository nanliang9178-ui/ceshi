import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Roles, TenantId } from '../../common/decorators';
import { TableService } from './table.service';
import { BatchCreateTableDto, CreateTableDto, UpdateTableDto } from './dto';

@Controller('admin/tables')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.tableService.list(tenantId);
  }

  @Post()
  @Roles('MANAGER')
  create(@TenantId() tenantId: string, @Body() dto: CreateTableDto) {
    return this.tableService.create(tenantId, dto);
  }

  @Post('batch')
  @Roles('MANAGER')
  batchCreate(@TenantId() tenantId: string, @Body() dto: BatchCreateTableDto) {
    return this.tableService.batchCreate(tenantId, dto);
  }

  @Put(':id')
  @Roles('MANAGER')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tableService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tableService.remove(tenantId, id);
  }

  @Post(':id/qrcode')
  @Roles('MANAGER')
  generateQr(@TenantId() tenantId: string, @Param('id') id: string, @Query('force') force?: string) {
    return this.tableService.generateQrCode(tenantId, id, force === '1');
  }

  @Post('qrcode/all')
  @Roles('MANAGER')
  generateAll(@TenantId() tenantId: string) {
    return this.tableService.generateAll(tenantId);
  }
}
