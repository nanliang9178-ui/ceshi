import { Module } from '@nestjs/common';
import { WechatModule } from '../wechat/wechat.module';
import { TableController } from './table.controller';
import { TableService } from './table.service';

@Module({
  imports: [WechatModule],
  controllers: [TableController],
  providers: [TableService],
  exports: [TableService],
})
export class TableModule {}
