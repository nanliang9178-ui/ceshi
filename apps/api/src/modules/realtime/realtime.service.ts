import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  /** 新订单推送给商户端（含语音提醒触发信号） */
  emitNewOrder(tenantId: string, order: unknown): void {
    this.emit(`tenant:${tenantId}`, 'order:new', order);
  }

  /** 订单状态变化：同时通知商户端与顾客 */
  emitOrderUpdated(tenantId: string, order: Record<string, any>): void {
    this.emit(`tenant:${tenantId}`, 'order:updated', order);
    this.emit(`order:${order.id}`, 'order:updated', order);
    if (order.customerId) this.emit(`customer:${order.customerId}`, 'order:updated', order);
  }

  /** 顾客端订阅单个订单的实时状态 */
  joinOrderRoom(orderId: string): string {
    return `order:${orderId}`;
  }

  private emit(room: string, event: string, payload: unknown): void {
    const server = this.gateway?.server;
    if (!server) return;
    try {
      server.to(room).emit(event, payload);
    } catch (error) {
      this.logger.warn(`推送失败 ${room}/${event}: ${(error as Error).message}`);
    }
  }
}
