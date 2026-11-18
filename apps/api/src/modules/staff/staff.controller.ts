import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { CreateStaffDto, ResetPasswordDto, UpdateStaffDto } from './dto';
import { StaffService } from './staff.service';

@Controller('admin/staff')
@Roles('OWNER')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.staff.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateStaffDto) {
    return this.staff.create(tenantId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(tenantId, id, dto);
  }

  @Post(':id/password')
  resetPassword(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.staff.resetPassword(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('sub') currentId: string) {
    return this.staff.remove(tenantId, id, currentId);
  }
}
