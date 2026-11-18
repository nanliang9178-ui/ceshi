import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser, Public, Roles, SkipTransform, TenantId } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { PayService } from './pay.service';
import { MiniprogramConfigDto, RefundDto, UpdatePayConfigDto } from './dto';

@Controller()
export class PayController {
  private readonly logger = new Logger(PayController.name);

  constructor(private readonly pay: PayService) {}

  @Public()
  @SkipTransform()
  @Post('pay/notify/:tenantCode')
  @HttpCode(200)
  async notify(
    @Param('tenantCode') tenantCode: string,
    @Headers() headers: Record<string, string>,
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
      const result = await this.pay.handleNotify(
        tenantCode,
        {
          timestamp: headers['wechatpay-timestamp'],
          nonce: headers['wechatpay-nonce'],
          signature: headers['wechatpay-signature'],
          serial: headers['wechatpay-serial'],
        },
        rawBody,
      );
      res.status(200).json(result);
    } catch (error) {
      this.logger.error(`支付回调处理失败: ${(error as Error).message}`);
      // 返回非 2xx 让微信支付按策略重试
      res.status(500).json({ code: 'FAIL', message: (error as Error).message });
    }
  }

  @Get('admin/pay/config')
  @Roles('OWNER')
  getConfig(@TenantId() tenantId: string) {
    return this.pay.getConfigView(tenantId);
  }

  @Put('admin/pay/config')
  @Roles('OWNER')
  updateConfig(@TenantId() tenantId: string, @Body() dto: UpdatePayConfigDto) {
    return this.pay.updateConfig(tenantId, dto);
  }

  @Get('admin/pay/miniprogram')
  @Roles('MANAGER')
  getMiniprogram(@TenantId() tenantId: string) {
    return this.pay.getMiniprogramView(tenantId);
  }

  @Put('admin/pay/miniprogram')
  @Roles('OWNER')
  updateMiniprogram(@TenantId() tenantId: string, @Body() dto: MiniprogramConfigDto) {
    return this.pay.updateMiniprogramConfig(tenantId, dto);
  }

  @Post('admin/pay/config/test')
  @Roles('OWNER')
  testConfig(@TenantId() tenantId: string) {
    return this.pay.testConnection(tenantId);
  }

  @Post('admin/pay/refund')
  @Roles('MANAGER')
  refund(@TenantId() tenantId: string, @Body() dto: RefundDto, @CurrentUser() user: AuthUser) {
    return this.pay.refund(tenantId, dto, user.name);
  }
}
