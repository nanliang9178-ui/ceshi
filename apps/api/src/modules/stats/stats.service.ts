import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** 数据看板：今日核心指标 + 7 日趋势 + 热销榜 */
  async dashboard(tenantId: string) {
    const cacheKey = `stats:dashboard:${tenantId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const today = startOfDay();
    const tomorrow = addDays(today, 1);
    const yesterday = addDays(today, -1);

    const paidWhere = { tenantId, payStatus: 'PAID' as const };

    const [todayAgg, todayCount, yesterdayAgg, pendingCount, refundCount, weekOrders] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...paidWhere, paidAt: { gte: today, lt: tomorrow } },
        _sum: { paidAmount: true },
      }),
      this.prisma.order.count({ where: { ...paidWhere, paidAt: { gte: today, lt: tomorrow } } }),
      this.prisma.order.aggregate({
        where: { ...paidWhere, paidAt: { gte: yesterday, lt: today } },
        _sum: { paidAmount: true },
      }),
      this.prisma.order.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.order.count({
        where: { tenantId, payStatus: 'REFUNDED', createdAt: { gte: today, lt: tomorrow } },
      }),
      this.prisma.order.findMany({
        where: { ...paidWhere, paidAt: { gte: addDays(today, -6), lt: tomorrow } },
        select: { paidAt: true, paidAmount: true },
      }),
    ]);

    const trendMap = new Map<string, { date: string; amount: number; count: number }>();
    for (let i = 6; i >= 0; i -= 1) {
      const day = addDays(today, -i);
      trendMap.set(dayKey(day), { date: dayKey(day), amount: 0, count: 0 });
    }
    weekOrders.forEach((order) => {
      if (!order.paidAt) return;
      const key = dayKey(order.paidAt);
      const item = trendMap.get(key);
      if (item) {
        item.amount += order.paidAmount || 0;
        item.count += 1;
      }
    });

    const todayAmount = todayAgg._sum.paidAmount || 0;
    const yesterdayAmount = yesterdayAgg._sum.paidAmount || 0;
    const avgPrice = todayCount > 0 ? Math.round(todayAmount / todayCount) : 0;

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productName'],
      where: {
        tenantId,
        order: { payStatus: 'PAID', paidAt: { gte: addDays(today, -6), lt: tomorrow } },
      },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });

    const result = {
      today: {
        amount: todayAmount,
        count: todayCount,
        avgPrice,
        pendingCount,
        refundCount,
        compareRate: yesterdayAmount > 0 ? Number((((todayAmount - yesterdayAmount) / yesterdayAmount) * 100).toFixed(1)) : null,
      },
      yesterdayAmount,
      trend: Array.from(trendMap.values()),
      topProducts: topProducts.map((item) => ({
        name: item.productName,
        quantity: item._sum.quantity || 0,
        amount: item._sum.amount || 0,
      })),
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  /** 经营统计：区间营业额、订单数、客单价、时段分布、分类占比 */
  async overview(tenantId: string, dateFrom?: string, dateTo?: string) {
    const end = dateTo ? new Date(`${dateTo}T23:59:59`) : new Date();
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : startOfDay(addDays(end, -6));

    const orders = await this.prisma.order.findMany({
      where: { tenantId, payStatus: 'PAID', paidAt: { gte: start, lte: end } },
      select: { paidAt: true, paidAmount: true, id: true },
    });

    const items = await this.prisma.orderItem.findMany({
      where: { tenantId, order: { payStatus: 'PAID', paidAt: { gte: start, lte: end } } },
      select: { productName: true, quantity: true, amount: true, orderId: true },
    });

    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, category: { select: { name: true } } },
    });
    const categoryOf = new Map(products.map((product) => [product.name, product.category?.name || '未分类']));

    // 先按区间补齐每一天，保证趋势图连续（无订单的日期也显示为 0）
    const days = new Map<string, { date: string; amount: number; count: number }>();
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    // 最多补 400 天，避免异常区间导致长循环
    while (cursor.getTime() <= end.getTime() && days.size < 400) {
      days.set(dayKey(cursor), { date: dayKey(cursor), amount: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const hours = new Map<number, { hour: number; amount: number; count: number }>();
    for (let i = 0; i < 24; i += 1) hours.set(i, { hour: i, amount: 0, count: 0 });

    let totalAmount = 0;
    orders.forEach((order) => {
      if (!order.paidAt) return;
      totalAmount += order.paidAmount || 0;
      const key = dayKey(order.paidAt);
      const day = days.get(key) || { date: key, amount: 0, count: 0 };
      day.amount += order.paidAmount || 0;
      day.count += 1;
      days.set(key, day);

      const hour = hours.get(order.paidAt.getHours())!;
      hour.amount += order.paidAmount || 0;
      hour.count += 1;
    });

    const categories = new Map<string, { name: string; amount: number; quantity: number }>();
    items.forEach((item) => {
      const name = categoryOf.get(item.productName) || '其他';
      const entry = categories.get(name) || { name, amount: 0, quantity: 0 };
      entry.amount += item.amount || 0;
      entry.quantity += item.quantity || 0;
      categories.set(name, entry);
    });

    return {
      range: { from: dayKey(start), to: dayKey(end) },
      summary: {
        amount: totalAmount,
        count: orders.length,
        avgPrice: orders.length ? Math.round(totalAmount / orders.length) : 0,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      },
      daily: Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date)),
      hours: Array.from(hours.values()),
      categories: Array.from(categories.values()).sort((a, b) => b.amount - a.amount),
    };
  }
}
