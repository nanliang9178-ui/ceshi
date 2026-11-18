import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { RealtimeService } from '../realtime/realtime.service';
import { decryptSecret, encryptSecret, maskSecret } from '../../common/utils/crypto.util';
import { buildOutTradeNo, buildRefundNo } from '../../common/utils/order.util';
import { OrderStatus, PayStatus } from '@tianshu/shared';
import { RefundDto, UpdatePayConfigDto } from './dto';
import { PayNotifyHeaders, WechatPayConfig, WechatPayV3Client } from './wechat-pay-v3.client';

@Injectable()
export class PayService {
  private readonly logger = new Logger(PayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly realtime: RealtimeService,
  ) {}

  private mockAllowed(): boolean {
    return process.env.ALLOW_MOCK_PAY !== 'false';
  }

  private notifyUrl(tenantCode: string): string {
    const base = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/api/pay/notify/${tenantCode}`;
  }

  /** 读取商户完整支付配置（内部使用，含解密后的密钥） */
  private async loadConfig(tenantId: string): Promise<WechatPayConfig & { tenantCode: string }> {
    const config = await this.prisma.paymentConfig.findUnique({ where: { tenantId } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (
      !config ||
      !config.enabled ||
      !config.mchId ||
      !config.serialNo ||
      !config.privateKeyEnc ||
      !config.apiV3KeyEnc
    ) {
      throw new BadRequestException('商户微信支付未配置完成，请先在「支付配置」中补全并启用');
    }
    const appId = config.appId || process.env.WECHAT_APP_ID || '';
    if (!appId) throw new BadRequestException('缺少小程序 AppID，请在「支付配置」中填写');
    return {
      appId,
      mchId: config.mchId,
      serialNo: config.serialNo,
      privateKey: decryptSecret(config.privateKeyEnc),
      apiV3Key: decryptSecret(config.apiV3KeyEnc),
      tenantCode: tenant.code,
    };
  }

  private async getClient(tenantId: string): Promise<WechatPayV3Client | null> {
    try {
      const config = await this.loadConfig(tenantId);
      return new WechatPayV3Client(config, this.cache);
    } catch (error) {
      if (error instanceof BadRequestException) return null;
      throw error;
    }
  }

  /** 后台展示：密钥一律脱敏，永不回显明文 */
  async getConfigView(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const config = await this.prisma.paymentConfig.findUnique({ where: { tenantId } });
    return {
      appId: config?.appId || process.env.WECHAT_APP_ID || '',
      appSecretMasked: maskSecret(config?.appSecretEnc ? decryptSecret(config.appSecretEnc) : ''),
      mchId: config?.mchId || '',
      serialNo: config?.serialNo || '',
      apiV3KeyMasked: maskSecret(config?.apiV3KeyEnc ? decryptSecret(config.apiV3KeyEnc) : ''),
      privateKeyMasked: config?.privateKeyEnc ? '已上传，如需更换请重新上传' : '',
      hasPrivateKey: Boolean(config?.privateKeyEnc),
      enabled: config?.enabled ?? false,
      verifiedAt: config?.verifiedAt ?? null,
      statusMsg: config?.statusMsg ?? null,
      notifyUrl: tenant ? this.notifyUrl(tenant.code) : '',
      mockAllowed: this.mockAllowed(),
      ready: Boolean(config?.enabled && config?.mchId && config?.privateKeyEnc && config?.apiV3KeyEnc),
    };
  }

  /** 小程序配置（AppID / AppSecret / 生成码版本）：扫码进小程序的核心依赖 */
  async getMiniprogramView(tenantId: string) {
    const config = await this.prisma.paymentConfig.findUnique({ where: { tenantId } });
    const appId = config?.appId || process.env.WECHAT_APP_ID || '';
    const secret = config?.appSecretEnc
      ? decryptSecret(config.appSecretEnc)
      : process.env.WECHAT_APP_SECRET || '';
    return {
      appId,
      appSecretMasked: maskSecret(secret),
      hasAppSecret: Boolean(secret),
      envVersion: config?.wxEnvVersion || 'release',
      configured: Boolean(appId && secret),
      homePage: 'pages/menu/index',
    };
  }

  async updateMiniprogramConfig(tenantId: string, dto: { appId?: string; appSecret?: string; envVersion: string }) {
    const data: Record<string, unknown> = { wxEnvVersion: dto.envVersion };
    if (dto.appId !== undefined) data.appId = dto.appId.trim() || null;
    if (dto.appSecret) {
      const secret = dto.appSecret.trim();
      if (secret.length < 16) throw new BadRequestException('AppSecret 长度不正确，请从微信公众平台复制完整密钥');
      data.appSecretEnc = encryptSecret(secret);
    }

    await this.prisma.paymentConfig.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: 'STAFF',
        action: 'MINIPROGRAM_CONFIG_UPDATE',
        targetType: 'PaymentConfig',
        detail: `更新小程序配置（版本 ${dto.envVersion}）`,
      },
    });
    return this.getMiniprogramView(tenantId);
  }

  async updateConfig(tenantId: string, dto: UpdatePayConfigDto) {
    const exists = await this.prisma.paymentConfig.findUnique({ where: { tenantId } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    const data: Record<string, unknown> = {
      appId: dto.appId?.trim() || undefined,
      mchId: dto.mchId?.trim() || undefined,
      serialNo: dto.serialNo?.trim() || undefined,
      enabled: dto.enabled,
    };
    if (dto.appSecret) data.appSecretEnc = encryptSecret(dto.appSecret.trim());
    if (dto.apiV3Key) {
      if (dto.apiV3Key.trim().length !== 32) throw new BadRequestException('APIv3 密钥必须为 32 位');
      data.apiV3KeyEnc = encryptSecret(dto.apiV3Key.trim());
    }
    if (dto.privateKey) {
      const pem = dto.privateKey.trim();
      if (!pem.includes('BEGIN') || !pem.includes('PRIVATE KEY')) {
        throw new BadRequestException('商户私钥格式不正确，请上传 apiclient_key.pem 内容');
      }
      data.privateKeyEnc = encryptSecret(pem);
    }
    if (!exists && tenant) data.notifyUrl = this.notifyUrl(tenant.code);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

    await this.prisma.paymentConfig.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: 'STAFF',
        action: 'PAY_CONFIG_UPDATE',
        targetType: 'PaymentConfig',
        detail: '更新微信支付配置',
      },
    });
    return this.getConfigView(tenantId);
  }

  /** 连接测试：验签 + 解密平台证书，可同时校验商户号/序列号/私钥/APIv3 密钥是否匹配 */
  async testConnection(tenantId: string) {
    const client = await this.getClient(tenantId);
    if (!client) {
      const view = await this.getConfigView(tenantId);
      const missing = [
        !view.mchId && '商户号',
        !view.serialNo && '证书序列号',
        !view.hasPrivateKey && '商户私钥',
        !view.apiV3KeyMasked && 'APIv3 密钥',
        !view.appId && 'AppID',
      ].filter(Boolean);
      throw new BadRequestException(`请先补全：${missing.join('、')}`);
    }
    try {
      const result = await client.testConnection();
      if (!result.ok) throw new BadRequestException('未能获取微信支付平台证书，请检查网络与商户配置');
      await this.prisma.paymentConfig.update({
        where: { tenantId },
        data: { verifiedAt: new Date(), statusMsg: '连接正常', enabled: true },
      });
      return { success: true, certCount: result.certCount, message: '配置校验通过，可以正常收款' };
    } catch (error) {
      const message = (error as Error).message;
      await this.prisma.paymentConfig.update({
        where: { tenantId },
        data: { verifiedAt: null, statusMsg: message },
      });
      throw new BadRequestException(message);
    }
  }

  /**
   * 发起支付
   * - openid 为演示模式时直接走模拟支付
   * - 真实支付返回小程序 wx.requestPayment 所需参数
   */
  async prepay(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.payStatus === PayStatus.PAID) throw new BadRequestException('订单已支付，请勿重复支付');
    if (order.status !== OrderStatus.UNPAID) throw new BadRequestException('当前订单状态不可支付');

    const customer = order.customerId
      ? await this.prisma.customer.findFirst({ where: { id: order.customerId, tenantId } })
      : null;
    const config = await this.prisma.paymentConfig.findUnique({ where: { tenantId } });
    const client = await this.getClient(tenantId);
    // 网页版顾客（h5_ 前缀）没有微信 openid，只能走演示支付或到店支付
    const isMockOpenid =
      !customer?.openid || customer.openid.startsWith('mock_') || customer.openid.startsWith('h5_');

    if (!client || isMockOpenid) {
      if (!this.mockAllowed()) {
        throw new BadRequestException(
          customer?.openid?.startsWith('h5_')
            ? '网页版暂未开通在线支付，请到店向店员付款'
            : client
              ? '演示环境未获取到真实 openid，无法发起微信支付'
              : '商户尚未完成微信支付配置，请联系商家',
        );
      }
      const paid = await this.markPaid(order.id, tenantId, {
        channel: 'MOCK',
        totalAmount: order.totalAmount,
      });
      return { mock: true, payParams: null, order: paid };
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const outTradeNo = order.outTradeNo || buildOutTradeNo();
    const prepayId = await client.jsapiPrepay({
      description: `${tenant?.name || '扫码点单'}-${order.tableName || '自取'}`.slice(0, 120),
      outTradeNo,
      amount: order.totalAmount,
      openid: customer!.openid,
      notifyUrl: this.notifyUrl(tenant!.code),
      attach: order.id,
    });

    await this.prisma.order.update({ where: { id: order.id }, data: { outTradeNo, payChannel: 'WECHAT' } });
    await this.prisma.paymentRecord.upsert({
      where: { outTradeNo },
      update: { amount: order.totalAmount },
      create: {
        tenantId,
        orderId: order.id,
        outTradeNo,
        amount: order.totalAmount,
        channel: 'WECHAT',
        status: 'UNPAID',
      },
    });
    void config;

    return { mock: false, payParams: client.buildPayParams(prepayId), order: null };
  }

  /** 支付成功统一处理（真实回调与模拟支付共用），保证幂等 */
  async markPaid(
    orderId: string,
    tenantId: string,
    payload: { channel: string; transactionId?: string; totalAmount?: number },
  ) {
    const lockKey = `pay:paid:${orderId}`;
    const locked = await this.cache.acquireLock(lockKey, 20);
    if (!locked) {
      const current = await this.prisma.order.findUnique({ where: { id: orderId } });
      return current;
    }

    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.payStatus === PayStatus.PAID) return order;
      if (payload.totalAmount != null && payload.totalAmount !== order.totalAmount) {
        throw new BadRequestException('支付金额与订单金额不一致，已拒绝入账');
      }

      const store = await this.prisma.store.findUnique({ where: { tenantId } });
      const pickupNo = order.pickupNo || (await this.prisma.nextPickupNo(tenantId, order.storeId));
      const now = new Date();
      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          payStatus: PayStatus.PAID,
          payChannel: payload.channel,
          paidAt: now,
          paidAmount: order.totalAmount,
          transactionId: payload.transactionId || order.transactionId,
          pickupNo,
          status: store?.autoAccept ? OrderStatus.PREPARING : OrderStatus.PENDING,
          acceptAt: store?.autoAccept ? now : null,
        },
        include: { items: true },
      });

      if (order.outTradeNo) {
        await this.prisma.paymentRecord
          .update({
            where: { outTradeNo: order.outTradeNo },
            data: { status: 'PAID', transactionId: payload.transactionId, paidAt: now },
          })
          .catch(() => undefined);
      }
      if (order.customerId) {
        await this.prisma.customer
          .update({ where: { id: order.customerId }, data: { lastLoginAt: now } })
          .catch(() => undefined);
      }

      this.realtime.emitNewOrder(tenantId, this.toRealtimePayload(updated));
      return updated;
    } finally {
      await this.cache.del(lockKey);
    }
  }

  private toRealtimePayload(order: Record<string, any>) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      tableName: order.tableName,
      type: order.type,
      status: order.status,
      totalAmount: order.totalAmount,
      pickupNo: order.pickupNo,
      createdAt: order.createdAt,
      items: (order.items || []).map((item: any) => ({
        name: item.productName,
        quantity: item.quantity,
        specText: item.specText,
      })),
    };
  }

  /** 微信支付回调（第三方调用，需原始报文验签） */
  async handleNotify(tenantCode: string, headers: PayNotifyHeaders, rawBody: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { code: tenantCode } });
    if (!tenant) throw new NotFoundException('商户不存在');

    const client = await this.getClient(tenant.id);
    if (!client) throw new BadRequestException('商户支付配置未启用');

    const data = await client.parseNotify(headers, rawBody);
    if (data.trade_state !== 'SUCCESS') {
      return { code: 'SUCCESS', message: '成功' };
    }

    const order = await this.prisma.order.findFirst({
      where: { outTradeNo: data.out_trade_no, tenantId: tenant.id },
    });
    if (!order) {
      this.logger.warn(`回调订单不存在: ${data.out_trade_no}`);
      return { code: 'SUCCESS', message: '成功' };
    }

    await this.markPaid(order.id, tenant.id, {
      channel: 'WECHAT',
      transactionId: data.transaction_id,
      totalAmount: data.amount?.total,
    });
    return { code: 'SUCCESS', message: '成功' };
  }

  /** 退款（MVP 默认整单退款） */
  async refund(tenantId: string, dto: RefundDto, operatorName: string) {
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, tenantId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.payStatus !== PayStatus.PAID) throw new BadRequestException('该订单未支付或已退款');
    if (order.payChannel === 'MOCK') {
      return this.finishRefund(order, order.totalAmount, dto.reason || '模拟退款', operatorName, true);
    }
    if (!order.transactionId) throw new BadRequestException('缺少微信支付交易号，无法退款');

    const client = await this.getClient(tenantId);
    if (!client) throw new BadRequestException('商户支付配置未启用，无法退款');

    const refundNo = buildRefundNo();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const result = await client.refund({
      transactionId: order.transactionId,
      outRefundNo: refundNo,
      refund: order.paidAmount || order.totalAmount,
      total: order.paidAmount || order.totalAmount,
      reason: dto.reason,
      notifyUrl: `${(process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/pay/refund-notify/${tenant?.code}`,
    });

    await this.prisma.refund.create({
      data: {
        refundNo,
        tenantId,
        orderId: order.id,
        amount: order.paidAmount || order.totalAmount,
        status: result.status === 'SUCCESS' ? 'SUCCESS' : 'PROCESSING',
        reason: dto.reason,
        transactionId: order.transactionId,
        operatorName,
        finishedAt: result.status === 'SUCCESS' ? new Date() : null,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { payStatus: PayStatus.REFUNDED, status: OrderStatus.CANCELLED, cancelAt: new Date(), cancelReason: dto.reason },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: 'STAFF',
        actorName: operatorName,
        action: 'ORDER_REFUND',
        targetType: 'Order',
        targetId: order.id,
        detail: `退款 ${((order.paidAmount || order.totalAmount) / 100).toFixed(2)} 元，原因：${dto.reason || '未填写'}`,
      },
    });

    const updated = await this.prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
    if (updated) this.realtime.emitOrderUpdated(tenantId, updated as any);
    return updated;
  }

  private async finishRefund(
    order: Record<string, any>,
    amount: number,
    reason: string,
    operatorName: string,
    mock: boolean,
  ) {
    await this.prisma.refund.create({
      data: {
        refundNo: buildRefundNo(),
        tenantId: order.tenantId,
        orderId: order.id,
        amount,
        status: 'SUCCESS',
        reason,
        operatorName,
        finishedAt: new Date(),
      },
    });
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { payStatus: PayStatus.REFUNDED, status: OrderStatus.CANCELLED, cancelAt: new Date(), cancelReason: reason },
      include: { items: true },
    });
    this.realtime.emitOrderUpdated(order.tenantId, updated as any);
    return { ...updated, mockRefund: mock };
  }
}
