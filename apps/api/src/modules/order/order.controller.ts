import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { OrderService } from './order.service';
import { CancelOrderDto, OrderListQueryDto } from './dto';

@Controller('admin/orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  list(@TenantId() tenantId: string, @Query() query: OrderListQueryDto) {
    return this.orders.listForAdmin(tenantId, query);
  }

  @Get('table/:tableId')
  tableBill(@TenantId() tenantId: string, @Param('tableId') tableId: string) {
    return this.orders.tableBill(tenantId, tableId);
  }

  @Get(':id')
  detail(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.orders.getForAdmin(tenantId, id);
  }

  @Post(':id/accept')
  @Roles('STAFF')
  accept(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.orders.accept(tenantId, id);
  }

  @Post(':id/ready')
  @Roles('STAFF')
  ready(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.orders.markReady(tenantId, id);
  }

  @Post(':id/complete')
  @Roles('STAFF')
  complete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.orders.complete(tenantId, id);
  }

  @Post(':id/cancel')
  @Roles('MANAGER')
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.cancelByAdmin(tenantId, id, dto, user.name);
  }
}
