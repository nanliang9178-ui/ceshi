import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { decryptSecret } from '../../common/utils/crypto.util';

export interface WechatRuntimeConfig {
  appId: string;
  appSecret: string;
  envVersion: string;
  mock: boolean;
}

/**
 * 微信小程序登录 / 手机号
 * 未配置 AppID 时进入 mock 模式，保证本地演示可跑通完整下单链路。
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getRuntimeConfig(tenantId: string): Promise<WechatRuntimeConfig> {
    const config = await this.prisma.paymentConfig.findUnique({ where: { tenantId } });
    const appId = config?.appId || process.env.WECHAT_APP_ID || '';
    const appSecret = config?.appSecretEnc
      ? decryptSecret(config.appSecretEnc)
      : process.env.WECHAT_APP_SECRET || '';
    const allowMock = process.env.ALLOW_MOCK_PAY !== 'false';
    const envVersion = config?.wxEnvVersion || process.env.WX_ENV_VERSION || 'release';
    return { appId, appSecret, envVersion, mock: !appId || !appSecret ? allowMock : false };
  }

  private async getAccessToken(appId: string, appSecret: string): Promise<string> {
    const cacheKey = `wx:token:${appId}`;
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const url =
      'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential' +
      `&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
    const res = await fetch(url);
    const json: any = await res.json();
    if (!json.access_token) {
      this.logger.error(`获取 access_token 失败: ${json.errcode} ${json.errmsg}`);
      throw new BadRequestException(this.translateWxError(json.errcode, json.errmsg));
    }
    await this.cache.set(cacheKey, json.access_token, Math.max(60, (json.expires_in || 7200) - 300));
    return json.access_token;
  }

  async code2session(tenantId: string, code: string): Promise<{ openid: string; mock: boolean }> {
    const config = await this.getRuntimeConfig(tenantId);
    if (config.mock) {
      // 演示模式：用 code 派生稳定 openid，刷新登录仍指向同一顾客
      return { openid: `mock_${tenantId}_${code.slice(0, 24)}`, mock: true };
    }

    const url =
      'https://api.weixin.qq.com/sns/jscode2session?grant_type=authorization_code' +
      `&appid=${encodeURIComponent(config.appId)}&secret=${encodeURIComponent(config.appSecret)}` +
      `&js_code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    const json: any = await res.json();
    if (!json.openid) {
      throw new BadRequestException(this.translateWxError(json.errcode, json.errmsg));
    }
    return { openid: json.openid as string, mock: false };
  }

  async getPhoneNumber(tenantId: string, phoneCode: string): Promise<string> {
    const config = await this.getRuntimeConfig(tenantId);
    if (config.mock) return '13800138000';

    const token = await this.getAccessToken(config.appId, config.appSecret);
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneCode }),
      },
    );
    const json: any = await res.json();
    if (json.errcode !== 0 || !json.phone_info) {
      throw new BadRequestException(this.translateWxError(json.errcode, json.errmsg));
    }
    return json.phone_info.purePhoneNumber || json.phone_info.phoneNumber;
  }

  /**
   * 生成小程序码（wxacode.getUnlimited）
   * 顾客扫码后直接打开小程序对应页面，scene 用于识别桌号。
   */
  async getUnlimitedQrCode(tenantId: string, scene: string, page = 'pages/menu/index'): Promise<Buffer> {
    const config = await this.getRuntimeConfig(tenantId);
    if (!config.appId || !config.appSecret) {
      throw new BadRequestException(
        '尚未配置小程序 AppID / AppSecret，无法生成可扫码打开的小程序码。请先到「小程序配置」填写后再生成。',
      );
    }

    const token = await this.getAccessToken(config.appId, config.appSecret);
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          page,
          check_path: false,
          env_version: config.envVersion,
          width: 430,
          auto_color: false,
          line_color: { r: 23, g: 24, b: 28 },
        }),
      },
    );

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json: any = await res.json();
      this.logger.warn(`小程序码生成失败: ${json.errcode} ${json.errmsg}（page=${page} env=${config.envVersion}）`);
      throw new BadRequestException(this.translateWxError(json.errcode, json.errmsg));
    }
    return Buffer.from(await res.arrayBuffer());
  }

  private translateWxError(code?: number, msg?: string): string {
    const map: Record<number, string> = {
      40013: '小程序 AppID 无效，请到「小程序配置」核对',
      40125: '小程序 AppSecret 无效，请到「小程序配置」重新填写',
      40029: '登录凭证 code 无效或已过期，请重新进入小程序',
      45011: '微信接口调用过于频繁，请稍后再试',
      40163: '登录凭证已被使用，请重新登录',
      40001: 'AppSecret 不正确或已被重置，请到「小程序配置」重新填写',
      41030: '页面路径不存在：请确认小程序已发布，且 page 为 pages/menu/index',
      85096: '小程序未发布，请先在微信开发者工具上传并发布体验版/正式版',
    };
    return map[code as number] || `微信接口调用失败（${code || 'unknown'}）：${msg || '请稍后重试'}`;
  }
}
