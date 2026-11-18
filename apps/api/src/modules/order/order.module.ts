import { Module } from '@nestjs/common';
import { PayModule } from '../pay/pay.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PayModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
