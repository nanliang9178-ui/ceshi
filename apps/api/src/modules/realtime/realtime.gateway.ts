import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../common/types';

/**
 * 实时通知：商户端新单提醒、顾客订单状态变化
 * 连接地址：ws://host/ws?token=xxx
 */
@WebSocketGateway({ path: '/ws', cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = (client.handshake.query?.token as string) || (client.handshake.auth?.token as string);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      (client.data as any).user = payload;
      if (payload.type === 'staff' && payload.tenantId) {
        await client.join(`tenant:${payload.tenantId}`);
      }
      if (payload.type === 'platform') await client.join('platform');
      if (payload.type === 'customer') await client.join(`customer:${payload.sub}`);
      client.emit('connected', { ok: true });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = (client.data as any)?.user as JwtPayload | undefined;
    if (user?.type === 'staff') this.logger.debug(`商户端断开 ${user.name}`);
  }
}
