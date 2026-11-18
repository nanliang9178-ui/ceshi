import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { MenuService } from '../menu/menu.service';
import { WechatService } from '../wechat/wechat.service';
import { OrderService } from '../order/order.service';
import { PayService } from '../pay/pay.service';
import { serializeOrder, serializeOrderList } from '../order/order.serializer';
import { parsePagination } from '../../common/dto/pagination.dto';
import { AppendItemsDto, CancelOrderDto, CreateOrderDto, OrderListQueryDto } from '../order/dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClientLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tenantCode?: string;
}

export class BindPhoneDto {
  @IsString()
  code: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly jwt: JwtService,
    private readonly menuService: MenuService,
    private readonly wechat: WechatService,
    private readonly orders: OrderService,
    private readonly pay: PayService,
  ) {}

  private parseBanners(raw?: string | null): Array<{ url: string; link?: string }> {
    try {
      const list = JSON.parse(raw || '[]');
      return Array.isArray(list) ? list.filter((item) => item && item.url) : [];
    } catch {
      return [];
    }
  }

  private async resolveTenant(tenantCode?: string, scene?: string) {
    let table = null as null | Record<string, any>;
    let tenant = null as null | Record<string, any>;

    if (scene) {
      table = await this.prisma.diningTable.findUnique({ where: { sceneCode: scene } });
      if (table) tenant = await this.prisma.tenant.findUnique({ where: { id: table.tenantId } });
    }
    if (!tenant) {
      const code = tenantCode || process.env.DEFAULT_TENANT_CODE;
      if (code) {
        tenant = await this.prisma.tenant.findUnique({ where: { code } });
      } else if (process.env.NODE_ENV !== 'production') {
        tenant = await this.prisma.tenant.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
      }
    }
    if (!tenant) throw new NotFoundException('门店不存在，请重新扫码');
    if (tenant.status !== 'ACTIVE') throw new BadRequestException('门店暂停营业，请联系商家');
    return { tenant, table };
  }

  /** 小程序启动聚合接口：品牌 + 门店 + 桌号 + 微信配置 */
  async bootstrap(tenantCode?: string, scene?: string) {
    const { tenant, table } = await this.resolveTenant(tenantCode, scene);
    const cacheKey = `bootstrap:${tenant.id}:${table?.sceneCode || 'none'}`;
    const cached = await this.cache.get<Record<string, any>>(cacheKey);
    if (cached) return cached;

    const [brand, store, wechat] = await Promise.all([
      this.prisma.tenantBrand.findUnique({ where: { tenantId: tenant.id } }),
      this.prisma.store.findUnique({ where: { tenantId: tenant.id } }),
      this.wechat.getRuntimeConfig(tenant.id),
    ]);

    const payload = {
      tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
      brand: {
        logoUrl: brand?.logoUrl || '',
        coverUrl: brand?.coverUrl || '',
        primaryColor: brand?.primaryColor || '#FF5A1F',
        accentColor: brand?.accentColor || '#F2B544',
        slogan: brand?.slogan || '',
        announcement: brand?.announcement || '',
        servicePhone: brand?.servicePhone || '',
        copyright: brand?.copyright || '',
        banners: this.parseBanners(brand?.banners),
      },
      store: store
        ? {
            id: store.id,
            name: store.name,
            address: store.address || '',
            phone: store.phone || '',
            businessHours: store.businessHours,
            openStatus: store.openStatus,
            packingFee: store.packingFee,
            minOrderAmount: store.minOrderAmount,
            deliveryFee: store.deliveryFee,
            deliveryMinAmount: store.deliveryMinAmount,
            deliveryRange: store.deliveryRange || '',
            deliveryEta: store.deliveryEta,
            fullReduceThreshold: store.fullReduceThreshold,
            fullReduceAmount: store.fullReduceAmount,
            notice: store.notice || '',
          }
        : null,
      table: table
        ? { id: table.id, name: table.name, area: table.area, seats: table.seats, sceneCode: table.sceneCode }
        : null,
      wechat: { appId: wechat.appId, mock: wechat.mock },
      serverTime: Date.now(),
    };

    await this.cache.set(cacheKey, payload, 30);
    return payload;
  }

  async getMenu(tenantCode?: string, scene?: string) {
    const { tenant } = await this.resolveTenant(tenantCode, scene);
    return this.menuService.getClientMenu(tenant.id);
  }

  async login(dto: ClientLoginDto) {
    const { tenant } = await this.resolveTenant(dto.tenantCode);
    const { openid, mock } = await this.wechat.code2session(tenant.id, dto.code);

    const customer = await this.prisma.customer.upsert({
      where: { tenantId_openid: { tenantId: tenant.id, openid } },
      update: { lastLoginAt: new Date() },
      create: { tenantId: tenant.id, openid, lastLoginAt: new Date() },
    });

    const token = await this.jwt.signAsync({
      sub: customer.id,
      type: 'customer',
      tenantId: tenant.id,
      role: 'CUSTOMER',
      name: customer.nickname || '顾客',
    });

    return {
      token,
      mock,
      customer: { id: customer.id, nickname: customer.nickname, phone: customer.phone, avatarUrl: customer.avatarUrl },
    };
  }

  async bindPhone(tenantId: string, customerId: string, code: string) {
    const phone = await this.wechat.getPhoneNumber(tenantId, code);
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { phone },
    });
    return { phone: customer.phone };
  }

  async updateProfile(tenantId: string, customerId: string, dto: UpdateProfileDto) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { nickname: dto.nickname, avatarUrl: dto.avatarUrl },
    });
    return { id: customer.id, nickname: customer.nickname, avatarUrl: customer.avatarUrl };
  }

  async createOrder(tenantId: string, customerId: string, dto: CreateOrderDto) {
    return this.orders.createByCustomer(tenantId, customerId, dto);
  }

  async appendItems(tenantId: string, customerId: string, orderId: string, dto: AppendItemsDto) {
    return this.orders.appendItems(tenantId, orderId, dto, customerId);
  }

  async orderDetail(tenantId: string, customerId: string, orderId: string) {
    return this.orders.getForCustomer(tenantId, orderId, customerId);
  }

  async orderList(tenantId: string, customerId: string, query: OrderListQueryDto) {
    return this.orders.listForCustomer(tenantId, customerId, query);
  }

  async cancelOrder(tenantId: string, customerId: string, orderId: string, dto: CancelOrderDto) {
    return this.orders.cancelByCustomer(tenantId, orderId, customerId, dto);
  }

  async remind(tenantId: string, orderId: string) {
    return this.orders.remind(tenantId, orderId);
  }

  async prepay(tenantId: string, customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.customerId && order.customerId !== customerId) throw new UnauthorizedException('无权支付该订单');
    return this.pay.prepay(tenantId, orderId);
  }

  /** 历史订单分页（顾客端「我的订单」） */
  async history(tenantId: string, customerId: string, query: OrderListQueryDto) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { items: true },
      }),
      this.prisma.order.count({ where: { tenantId, customerId } }),
    ]);
    return { list: serializeOrderList(list as any), total, page, pageSize };
  }

  async activeOrder(tenantId: string, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        tenantId,
        customerId,
        status: { in: ['PENDING', 'PREPARING', 'READY', 'UNPAID'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return order ? serializeOrder(order) : null;
  }
}
