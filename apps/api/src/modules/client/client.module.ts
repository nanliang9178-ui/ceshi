import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module';
import { OrderModule } from '../order/order.module';
import { PayModule } from '../pay/pay.module';
import { WechatModule } from '../wechat/wechat.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [MenuModule, OrderModule, PayModule, WechatModule],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
