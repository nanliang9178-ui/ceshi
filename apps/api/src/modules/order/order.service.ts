import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PayStatus, canAppendItems, canTransition, sumFen } from '@tianshu/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PayService } from '../pay/pay.service';
import { buildOrderNo } from '../../common/utils/order.util';
import { parsePagination } from '../../common/dto/pagination.dto';
import { AppendItemsDto, CancelOrderDto, CreateOrderDto, OrderItemInputDto, OrderListQueryDto } from './dto';
import { serializeOrder, serializeOrderList } from './order.serializer';

interface PricedItem {
  productId: string;
  productName: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  amount: number;
  specText: string | null;
  remark: string | null;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly realtime: RealtimeService,
    private readonly pay: PayService,
  ) {}

  // ---------------- 计价（服务端强制重算，客户端金额只作展示） ----------------

  private async priceItems(tenantId: string, inputs: OrderItemInputDto[]): Promise<{ items: PricedItem[]; itemAmount: number }> {
    if (!inputs?.length) throw new BadRequestException('请先选择菜品');
    const ids = Array.from(new Set(inputs.map((item) => item.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, tenantId },
      include: { specGroups: { include: { options: true } } },
    });
    const map = new Map(products.map((product) => [product.id, product]));

    const items: PricedItem[] = inputs.map((input) => {
      const product = map.get(input.productId);
      if (!product) throw new BadRequestException('部分菜品已删除，请刷新菜单后重试');
      if (product.status !== 'ON') throw new BadRequestException(`「${product.name}」已下架`);
      if (product.soldOut) throw new BadRequestException(`「${product.name}」已售罄`);
      if (product.stockEnabled && product.stock < input.quantity) {
        throw new BadRequestException(`「${product.name}」库存不足，仅剩 ${product.stock} 份`);
      }

      const selectedIds = input.specOptionIds || [];
      const allOptions = product.specGroups.flatMap((group) =>
        group.options.map((option) => ({ ...option, groupId: group.id, groupName: group.name })),
      );
      const selected = allOptions.filter((option) => selectedIds.includes(option.id));
      if (selected.length !== selectedIds.length) {
        throw new BadRequestException(`「${product.name}」规格选择有误，请重新选择`);
      }

      for (const group of product.specGroups) {
        const picked = selected.filter((option) => option.groupId === group.id);
        if (group.required && picked.length === 0) {
          throw new BadRequestException(`请选择「${product.name}」的${group.name}`);
        }
        if (!group.multiple && picked.length > 1) {
          throw new BadRequestException(`「${product.name}」的${group.name}只能选择一项`);
        }
      }

      const delta = selected.reduce((sum, option) => sum + option.priceDelta, 0);
      const unitPrice = product.price + delta;
      const specText =
        product.specGroups
          .map((group) => {
            const names = selected.filter((option) => option.groupId === group.id).map((option) => option.name);
            return names.length ? `${group.name}:${names.join('+')}` : null;
          })
          .filter(Boolean)
          .join(' / ') || null;

      return {
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        unitPrice,
        quantity: input.quantity,
        amount: unitPrice * input.quantity,
        specText,
        remark: input.remark || null,
      };
    });

    return { items, itemAmount: sumFen(items.map((item) => item.amount)) };
  }

  private computeTotals(store: Record<string, any>, itemAmount: number, type: string) {
    const threshold = store?.fullReduceThreshold || 0;
    const reduce = store?.fullReduceAmount || 0;
    const discountAmount = threshold > 0 && itemAmount >= threshold ? reduce : 0;
    const packingFee = type === 'TAKEAWAY' ? store?.packingFee || 0 : 0;
    const deliveryFee = type === 'DELIVERY' ? store?.deliveryFee || 0 : 0;
    const totalAmount = Math.max(0, itemAmount - discountAmount + packingFee + deliveryFee);
    return { itemAmount, discountAmount, packingFee, deliveryFee, totalAmount };
  }

  private async ensureStore(tenantId: string) {
    const store = await this.prisma.store.findUnique({ where: { tenantId } });
    if (!store) throw new NotFoundException('门店不存在');
    return store;
  }

  private async resolveTable(tenantId: string, dto: { tableId?: string; sceneCode?: string }) {
    if (dto.tableId) {
      const table = await this.prisma.diningTable.findFirst({ where: { id: dto.tableId, tenantId } });
      if (!table) throw new NotFoundException('桌位不存在，请重新扫码');
      return table;
    }
    if (dto.sceneCode) {
      const table = await this.prisma.diningTable.findUnique({ where: { sceneCode: dto.sceneCode } });
      if (!table || table.tenantId !== tenantId) throw new NotFoundException('桌码无效，请联系店员');
      return table;
    }
    return null;
  }

  // ---------------- 顾客端 ----------------

  async createByCustomer(tenantId: string, customerId: string, dto: CreateOrderDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findFirst({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
        include: { items: true },
      });
      if (existing) return serializeOrder(existing);
      const locked = await this.cache.acquireLock(`order:create:${tenantId}:${dto.idempotencyKey}`, 10);
      if (!locked) throw new BadRequestException('正在处理上一笔订单，请稍候');
    }

    const store = await this.ensureStore(tenantId);
    if (!store.openStatus) throw new BadRequestException('门店休息中，暂不接单');

    const type = dto.type || (dto.tableId || dto.sceneCode ? 'DINE_IN' : 'TAKEAWAY');
    const table = await this.resolveTable(tenantId, dto);
    const { items, itemAmount } = await this.priceItems(tenantId, dto.items);
    const totals = this.computeTotals(store, itemAmount, type);

    if (type === 'TAKEAWAY' && store.minOrderAmount > 0 && totals.totalAmount < store.minOrderAmount) {
      throw new BadRequestException(`自取订单需满 ${(store.minOrderAmount / 100).toFixed(2)} 元`);
    }

    // 外卖：校验收货信息与起送价
    let receiver: { name: string; phone: string; address: string } | null = null;
    if (type === 'DELIVERY') {
      const name = (dto.receiverName || '').trim();
      const phone = (dto.receiverPhone || '').trim();
      const address = (dto.address || '').trim();
      if (!name) throw new BadRequestException('请填写收货人姓名');
      if (!/^1[3-9]\d{9}$/.test(phone)) throw new BadRequestException('请填写正确的手机号');
      if (address.length < 5) throw new BadRequestException('请填写详细收货地址（不少于 5 个字）');
      if (store.deliveryMinAmount > 0 && totals.itemAmount < store.deliveryMinAmount) {
        throw new BadRequestException(`外卖订单需满 ${(store.deliveryMinAmount / 100).toFixed(2)} 元起送`);
      }
      if (table) throw new BadRequestException('外卖订单无需桌号，请重新选择用餐方式');
      receiver = { name, phone, address };
    }

    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });

    const order = await this.prisma.order.create({
      data: {
        orderNo: buildOrderNo(),
        tenantId,
        storeId: store.id,
        tableId: table?.id,
        tableName: table?.name,
        type,
        status: OrderStatus.UNPAID,
        payStatus: PayStatus.UNPAID,
        customerId,
        customerName: customer?.nickname || customer?.phone || receiver?.name || null,
        peopleCount: dto.peopleCount,
        remark: dto.remark,
        receiverName: receiver?.name,
        receiverPhone: receiver?.phone,
        address: receiver?.address,
        deliveryEta: type === 'DELIVERY' ? store.deliveryEta : null,
        ...totals,
        idempotencyKey: dto.idempotencyKey,
        items: {
          create: items.map((item) => ({ ...item, tenantId })),
        },
      },
      include: { items: true },
    });

    // 库存扣减（开启库存管理的商品）
    for (const item of items) {
      await this.prisma.product
        .updateMany({
          where: { id: item.productId, tenantId, stockEnabled: true },
          data: { stock: { decrement: item.quantity }, monthlySales: { increment: item.quantity } },
        })
        .catch(() => undefined);
    }

    return serializeOrder(order);
  }

  /**
   * 加菜：为同一桌位创建一张子订单（独立支付、独立出餐），
   * 桌台账单会把同桌多张订单汇总，便于结账。
   */
  async appendItems(tenantId: string, orderId: string, dto: AppendItemsDto, customerId?: string) {
    const parent = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!parent) throw new NotFoundException('订单不存在');
    if (customerId && parent.customerId && parent.customerId !== customerId) {
      throw new BadRequestException('无权操作该订单');
    }
    if (!canAppendItems(parent.status)) throw new BadRequestException('当前订单状态不支持加菜');

    const created = await this.createByCustomer(tenantId, customerId || parent.customerId!, {
      tableId: parent.type === 'DELIVERY' ? undefined : parent.tableId || undefined,
      type: parent.type,
      peopleCount: parent.peopleCount || undefined,
      remark: `加菜（原单 ${parent.orderNo}）`,
      receiverName: parent.receiverName || undefined,
      receiverPhone: parent.receiverPhone || undefined,
      address: parent.address || undefined,
      items: dto.items,
      idempotencyKey: `append:${orderId}:${Date.now()}`,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: customerId ? 'CUSTOMER' : 'STAFF',
        action: 'ORDER_APPEND',
        targetType: 'Order',
        targetId: created.id,
        detail: `订单 ${parent.orderNo} 加菜，生成子订单 ${created.orderNo}`,
      },
    });
    return created;
  }

  async getForCustomer(tenantId: string, orderId: string, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, refunds: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.customerId && order.customerId !== customerId) throw new BadRequestException('无权查看该订单');
    return serializeOrder(order);
  }

  async listForCustomer(tenantId: string, customerId: string, query: OrderListQueryDto) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: any = { tenantId, customerId };
    if (query.status && query.status !== 'ALL') where.status = query.status;
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { list: serializeOrderList(list as any), total, page, pageSize };
  }

  /** 顾客主动取消：未支付直接关闭，已支付未接单自动退款 */
  async cancelByCustomer(tenantId: string, orderId: string, customerId: string, dto: CancelOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.customerId && order.customerId !== customerId) throw new BadRequestException('无权操作该订单');

    if (order.status === OrderStatus.UNPAID) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          payStatus: PayStatus.CLOSED,
          cancelAt: new Date(),
          cancelReason: dto.reason || '顾客取消',
        },
      });
      return { success: true, refunded: false };
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('商家已接单，请联系店员处理');
    }
    const result = await this.pay.refund(tenantId, { orderId: order.id, reason: dto.reason || '顾客取消' }, '顾客自助取消');
    return { success: true, refunded: true, order: result };
  }

  /** 催单：推送到商户端 */
  async remind(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (!['PENDING', 'PREPARING'].includes(order.status)) {
      throw new BadRequestException('当前订单无需催单');
    }
    const key = `remind:${orderId}`;
    const locked = await this.cache.acquireLock(key, 60);
    if (!locked) throw new BadRequestException('已提醒过商家，请耐心等待');

    this.realtime.emitOrderUpdated(tenantId, { ...order, reminded: true, id: order.id });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: 'CUSTOMER',
        action: 'ORDER_REMIND',
        targetType: 'Order',
        targetId: order.id,
        detail: `订单 ${order.orderNo} 催单`,
      },
    });
    return { success: true };
  }

  // ---------------- 商户端 ----------------

  async listForAdmin(tenantId: string, query: OrderListQueryDto) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: any = { tenantId };
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.keyword) {
      const keyword = query.keyword.trim();
      where.OR = [{ orderNo: { contains: keyword } }, { tableName: { contains: keyword } }];
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(`${query.dateFrom}T00:00:00`);
      if (query.dateTo) where.createdAt.lte = new Date(`${query.dateTo}T23:59:59`);
    }

    // 状态数量需与当前筛选条件（关键词 / 日期）保持一致，仅忽略 status 本身
    const countWhere = { ...where };
    delete countWhere.status;

    const [list, total, grouped] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], where: countWhere, _count: { _all: true } }),
    ]);

    const counts: Record<string, number> = {};
    grouped.forEach((item) => {
      counts[item.status] = item._count._all;
    });

    return { list: serializeOrderList(list as any), total, page, pageSize, counts };
  }

  async getForAdmin(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, refunds: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return serializeOrder(order);
  }

  /** 桌台账单：该桌未完成订单 */
  async tableBill(tenantId: string, tableId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        tableId,
        status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY] },
      },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    });
    return {
      tableId,
      total: sumFen(orders.map((order) => order.totalAmount)),
      orders: serializeOrderList(orders as any),
    };
  }

  private async transition(tenantId: string, orderId: string, to: string, extra: Record<string, unknown> = {}) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (!canTransition(order.status, to)) {
      throw new BadRequestException(`订单当前状态为「${order.status}」，无法执行该操作`);
    }
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: to, ...extra },
      include: { items: true },
    });
    this.realtime.emitOrderUpdated(tenantId, updated as any);
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: 'STAFF',
        action: `ORDER_${to}`,
        targetType: 'Order',
        targetId: order.id,
        detail: `订单 ${order.orderNo} 状态变更为 ${to}`,
      },
    });
    return serializeOrder(updated);
  }

  accept(tenantId: string, orderId: string) {
    return this.transition(tenantId, orderId, OrderStatus.PREPARING, { acceptAt: new Date() });
  }

  markReady(tenantId: string, orderId: string) {
    return this.transition(tenantId, orderId, OrderStatus.READY, { readyAt: new Date() });
  }

  complete(tenantId: string, orderId: string) {
    return this.transition(tenantId, orderId, OrderStatus.COMPLETED, { completeAt: new Date() });
  }

  /** 商家拒单/取消：已支付自动退款 */
  async cancelByAdmin(tenantId: string, orderId: string, dto: CancelOrderDto, operatorName: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status as any)) {
      throw new BadRequestException('订单已结束，无法取消');
    }

    if (order.payStatus === PayStatus.PAID) {
      const result = await this.pay.refund(tenantId, { orderId, reason: dto.reason || '商家取消' }, operatorName);
      return { success: true, refunded: true, order: result };
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        payStatus: PayStatus.CLOSED,
        cancelAt: new Date(),
        cancelReason: dto.reason || '商家取消',
      },
      include: { items: true },
    });
    this.realtime.emitOrderUpdated(tenantId, updated as any);
    return { success: true, refunded: false, order: serializeOrder(updated) };
  }
}
