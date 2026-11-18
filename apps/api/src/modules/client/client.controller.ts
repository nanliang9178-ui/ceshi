import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, Public, TenantId } from '../../common/decorators';
import { AppendItemsDto, CancelOrderDto, CreateOrderDto, OrderListQueryDto } from '../order/dto';
import { BindPhoneDto, ClientLoginDto, ClientService, UpdateProfileDto } from './client.service';

@Controller('client')
export class ClientController {
  constructor(private readonly client: ClientService) {}

  @Public()
  @Get('bootstrap')
  bootstrap(@Query('tenantCode') tenantCode?: string, @Query('scene') scene?: string) {
    return this.client.bootstrap(tenantCode, scene);
  }

  @Public()
  @Get('menu')
  menu(@Query('tenantCode') tenantCode?: string, @Query('scene') scene?: string) {
    return this.client.getMenu(tenantCode, scene);
  }

  @Public()
  @Get('table/:sceneCode')
  table(@Param('sceneCode') sceneCode: string) {
    return this.client.bootstrap(undefined, sceneCode);
  }

  @Public()
  @Post('login')
  login(@Body() dto: ClientLoginDto) {
    return this.client.login(dto);
  }

  @Post('phone')
  bindPhone(@TenantId() tenantId: string, @CurrentUser('sub') customerId: string, @Body() dto: BindPhoneDto) {
    return this.client.bindPhone(tenantId, customerId, dto.code);
  }

  @Put('profile')
  updateProfile(
    @TenantId() tenantId: string,
    @CurrentUser('sub') customerId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.client.updateProfile(tenantId, customerId, dto);
  }

  @Post('orders')
  createOrder(@TenantId() tenantId: string, @CurrentUser('sub') customerId: string, @Body() dto: CreateOrderDto) {
    return this.client.createOrder(tenantId, customerId, dto);
  }

  @Get('orders')
  orderList(
    @TenantId() tenantId: string,
    @CurrentUser('sub') customerId: string,
    @Query() query: OrderListQueryDto,
  ) {
    return this.client.orderList(tenantId, customerId, query);
  }

  @Get('orders/active')
  activeOrder(@TenantId() tenantId: string, @CurrentUser('sub') customerId: string) {
    return this.client.activeOrder(tenantId, customerId);
  }

  @Get('orders/:id')
  orderDetail(
    @TenantId() tenantId: string,
    @CurrentUser('sub') customerId: string,
    @Param('id') id: string,
  ) {
    return this.client.orderDetail(tenantId, customerId, id);
  }

  @Post('orders/:id/items')
  appendItems(
    @TenantId() tenantId: string,
    @CurrentUser('sub') customerId: string,
    @Param('id') id: string,
    @Body() dto: AppendItemsDto,
  ) {
    return this.client.appendItems(tenantId, customerId, id, dto);
  }

  @Post('orders/:id/pay')
  prepay(@TenantId() tenantId: string, @CurrentUser('sub') customerId: string, @Param('id') id: string) {
    return this.client.prepay(tenantId, customerId, id);
  }

  @Post('orders/:id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @CurrentUser('sub') customerId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.client.cancelOrder(tenantId, customerId, id, dto);
  }

  @Post('orders/:id/remind')
  remind(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.client.remind(tenantId, id);
  }
}
