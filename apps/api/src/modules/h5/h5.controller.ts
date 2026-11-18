import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { H5LoginDto, H5Service } from './h5.service';

@Controller('h5')
export class H5Controller {
  constructor(private readonly h5: H5Service) {}

  /** 网页版静默登录：浏览器生成 clientId，换取与小程序一致的 token */
  @Public()
  @Post('login')
  login(@Body() dto: H5LoginDto) {
    return this.h5.login(dto);
  }

  /** 网页版能力探测：是否支持在线支付（未配置公众号时仅支持到店支付/演示支付） */
  @Public()
  @Get('capability')
  capability(@Query('tenantCode') tenantCode?: string) {
    const mockPay = process.env.ALLOW_MOCK_PAY !== 'false';
    return {
      tenantCode: tenantCode || process.env.DEFAULT_TENANT_CODE || '',
      mockPay,
      payChannel: mockPay ? 'MOCK' : 'WECHAT_JSAPI',
      tip: mockPay ? '当前为演示支付：下单后直接标记已支付，不产生真实资金流' : '正式环境请通过微信支付完成付款',
    };
  }
}
