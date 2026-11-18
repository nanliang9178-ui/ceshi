import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination } from '../../common/dto/pagination.dto';
import { CreateTenantDto, ResetOwnerPasswordDto, TenantListQueryDto, UpdateTenantDto } from './dto';

function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    const random = Math.random().toString(36).slice(2, 8);
    return `t${Date.now().toString(36).slice(-4)}${random}`.toLowerCase();
  }

  async overview() {
    const today = startOfDay();
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    const weekLater = new Date(today.getTime() + 7 * 24 * 3600 * 1000);

    const [tenantTotal, tenantActive, tenantExpiring, todayAgg, todayOrders, recentTenants] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'ACTIVE', expireAt: { lte: weekLater } } }),
      this.prisma.order.aggregate({
        where: { payStatus: 'PAID', paidAt: { gte: today, lt: tomorrow } },
        _sum: { paidAmount: true },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          store: { select: { name: true } },
          _count: { select: { orders: true } },
        },
      }),
    ]);

    return {
      tenants: { total: tenantTotal, active: tenantActive, expiring: tenantExpiring },
      today: { gmv: todayAgg._sum.paidAmount || 0, orders: todayOrders },
      recentTenants: recentTenants.map((tenant) => ({
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        status: tenant.status,
        storeName: tenant.store?.name || '-',
        orders: tenant._count.orders,
        createdAt: tenant.createdAt,
        expireAt: tenant.expireAt,
      })),
    };
  }

  async listTenants(query: TenantListQueryDto) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: any = {};
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }, { contactPhone: { contains: keyword } }];
    }

    const [list, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          store: { select: { name: true, openStatus: true } },
          _count: { select: { orders: true, staff: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const tenantIds = list.map((tenant) => tenant.id);
    const amounts = tenantIds.length
      ? await this.prisma.order.groupBy({
          by: ['tenantId'],
          where: { tenantId: { in: tenantIds }, payStatus: 'PAID' },
          _sum: { paidAmount: true },
        })
      : [];
    const amountMap = new Map(amounts.map((item) => [item.tenantId, item._sum.paidAmount || 0]));

    return {
      list: list.map((tenant) => ({
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        contactName: tenant.contactName,
        contactPhone: tenant.contactPhone,
        status: tenant.status,
        plan: tenant.plan,
        expireAt: tenant.expireAt,
        createdAt: tenant.createdAt,
        storeName: tenant.store?.name,
        openStatus: tenant.store?.openStatus,
        orderCount: tenant._count.orders,
        staffCount: tenant._count.staff,
        gmv: amountMap.get(tenant.id) || 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async createTenant(dto: CreateTenantDto) {
    const code = this.generateCode();
    const expireAt = dto.expireAt ? new Date(dto.expireAt) : new Date(Date.now() + 365 * 24 * 3600 * 1000);

    const tenant = await this.prisma.tenant.create({
      data: {
        code,
        name: dto.name.trim(),
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        plan: dto.plan || 'BASIC',
        expireAt,
        brand: {
          create: {
            primaryColor: '#FF5A1F',
            accentColor: '#F2B544',
            slogan: '扫码点单，先人一步',
            copyright: `© ${new Date().getFullYear()} ${dto.name.trim()}`,
            banners: '[]',
          },
        },
        store: {
          create: {
            name: dto.storeName?.trim() || dto.name.trim(),
            openStatus: true,
            businessHours: '10:00-22:00',
          },
        },
        paymentConfig: { create: {} },
      },
      include: { store: true },
    });

    const staff = await this.prisma.staffUser.create({
      data: {
        tenantId: tenant.id,
        storeId: tenant.store?.id,
        username: dto.ownerUsername.trim(),
        name: dto.contactName || '老板',
        role: 'OWNER',
        passwordHash: await bcrypt.hash(dto.ownerPassword, 10),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: 'PLATFORM',
        actorName: '平台运营',
        action: 'TENANT_CREATE',
        targetType: 'Tenant',
        targetId: tenant.id,
        detail: `开通商户「${tenant.name}」，账号 ${staff.username}`,
      },
    });

    return { ...tenant, ownerUsername: staff.username, loginCode: tenant.code };
  }

  async detail(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        brand: true,
        store: true,
        staff: { select: { id: true, username: true, name: true, role: true, status: true } },
        paymentConfig: true,
        _count: { select: { orders: true, categories: true, products: true, tables: true } },
      },
    });
    if (!tenant) throw new NotFoundException('商户不存在');

    const [gmv, todayOrders] = await Promise.all([
      this.prisma.order.aggregate({ where: { tenantId: id, payStatus: 'PAID' }, _sum: { paidAmount: true } }),
      this.prisma.order.count({ where: { tenantId: id, createdAt: { gte: startOfDay() } } }),
    ]);

    return {
      ...tenant,
      paymentConfig: tenant.paymentConfig
        ? {
            appId: tenant.paymentConfig.appId,
            mchId: tenant.paymentConfig.mchId,
            enabled: tenant.paymentConfig.enabled,
            verifiedAt: tenant.paymentConfig.verifiedAt,
            statusMsg: tenant.paymentConfig.statusMsg,
          }
        : null,
      stats: { gmv: gmv._sum.paidAmount || 0, todayOrders, orderCount: tenant._count.orders },
    };
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (dto.expireAt && Number.isNaN(new Date(dto.expireAt).getTime())) {
      throw new BadRequestException('到期时间格式不正确');
    }
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        status: dto.status,
        plan: dto.plan,
        expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
        remark: dto.remark,
      },
    });
  }

  async resetOwnerPassword(id: string, dto: ResetOwnerPasswordDto) {
    const owner = await this.prisma.staffUser.findFirst({ where: { tenantId: id, role: 'OWNER' } });
    if (!owner) throw new NotFoundException('该商户没有老板账号');
    await this.prisma.staffUser.update({
      where: { id: owner.id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return { success: true, username: owner.username };
  }
}
