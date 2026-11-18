import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('数据库连接成功');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** 生成当日订单序号（取餐号），按门店当日订单数递增 */
  async nextPickupNo(tenantId: string, storeId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const count = await this.order.count({
      where: { tenantId, storeId, createdAt: { gte: start } },
    });
    return count + 1;
  }
}
