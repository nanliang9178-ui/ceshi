import { BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../../common/cache/cache.service';

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  serialNo: string;
  /** 商户 API 私钥 PEM */
  privateKey: string;
  /** APIv3 密钥，32 位 */
  apiV3Key: string;
}

export interface PayNotifyHeaders {
  timestamp?: string;
  nonce?: string;
  signature?: string;
  serial?: string;
}

interface EncryptedResource {
  algorithm: string;
  ciphertext: string;
  associated_data?: string;
  nonce: string;
}

const BASE = 'https://api.mch.weixin.qq.com';
const PLATFORM_CERT_TTL = 12 * 3600;

/**
 * 微信支付 APIv3 轻量客户端
 * 覆盖 JSAPI 下单、回调验签解密、退款、平台证书拉取与连接测试。
 * 不依赖第三方 SDK，避免其长期不维护带来的安全隐患。
 */
export class WechatPayV3Client {
  private readonly logger = new Logger('WechatPayV3');
  private certCache: Map<string, string> | null = null;
  private certFetchedAt = 0;

  constructor(
    private readonly config: WechatPayConfig,
    private readonly cache: CacheService,
  ) {}

  private sign(message: string): string {
    return crypto.createSign('RSA-SHA256').update(message).sign(this.config.privateKey, 'base64');
  }

  private authorization(method: string, path: string, body: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.sign(message);
    return (
      'WECHATPAY2-SHA256-RSA2048 ' +
      `mchid="${this.config.mchId}",nonce_str="${nonce}",signature="${signature}",` +
      `timestamp="${timestamp}",serial_no="${this.config.serialNo}"`
    );
  }

  private async request<T = any>(
    method: 'GET' | 'POST',
    path: string,
    payload?: unknown,
    options: { verify?: boolean } = { verify: true },
  ): Promise<T> {
    const body = payload ? JSON.stringify(payload) : '';
    const headers: Record<string, string> = {
      Authorization: this.authorization(method, path, body),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'tianshu-ordering/1.0',
    };

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: method === 'GET' ? undefined : body,
    });
    const text = await res.text();

    if (options.verify !== false && res.ok) {
      const verified = await this.verifyResponse(headers, res, text);
      if (!verified) {
        this.logger.warn(`微信支付应答验签失败: ${method} ${path}`);
      }
    }

    if (!res.ok) {
      let code = '';
      let message = `微信支付接口错误（HTTP ${res.status}）`;
      try {
        const json = JSON.parse(text);
        code = json.code || '';
        message = json.message || message;
      } catch {
        /* 忽略非 JSON 响应 */
      }
      throw new BadRequestException(this.translateError(code, message));
    }

    return (text ? JSON.parse(text) : {}) as T;
  }

  private async verifyResponse(
    requestHeaders: Record<string, string>,
    res: Response,
    body: string,
  ): Promise<boolean> {
    const timestamp = res.headers.get('wechatpay-timestamp');
    const nonce = res.headers.get('wechatpay-nonce');
    const signature = res.headers.get('wechatpay-signature');
    const serial = res.headers.get('wechatpay-serial');
    if (!timestamp || !nonce || !signature || !serial) return false;

    const publicKey = await this.getPlatformCert(serial);
    if (!publicKey) return false;
    const message = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64');
  }

  /** 拉取平台证书（含私钥签名校验与 APIv3 密钥解密） */
  private async loadCertificates(): Promise<Map<string, string>> {
    if (this.certCache && Date.now() - this.certFetchedAt < PLATFORM_CERT_TTL * 1000) {
      return this.certCache;
    }
    const cacheKey = `wxp:certs:${this.config.mchId}`;
    const cached = await this.cache.get<Record<string, string>>(cacheKey);
    if (cached && Object.keys(cached).length) {
      this.certCache = new Map(Object.entries(cached));
      this.certFetchedAt = Date.now();
      return this.certCache;
    }

    const data = await this.request<{ data: Array<{ serial_no: string; encrypt_certificate: EncryptedResource }> }>(
      'GET',
      '/v3/certificates',
      undefined,
      { verify: false },
    );

    const map = new Map<string, string>();
    for (const item of data.data || []) {
      const pem = this.decryptResource(item.encrypt_certificate);
      map.set(item.serial_no, pem);
    }
    this.certCache = map;
    this.certFetchedAt = Date.now();
    await this.cache.set(cacheKey, Object.fromEntries(map), PLATFORM_CERT_TTL);
    return map;
  }

  private async getPlatformCert(serial: string): Promise<string | null> {
    try {
      let map = this.certCache;
      if (!map || Date.now() - this.certFetchedAt >= PLATFORM_CERT_TTL * 1000) {
        map = await this.loadCertificates();
      }
      if (map.has(serial)) return map.get(serial)!;
      // 证书轮换后重新拉取一次
      map = await this.loadCertificates();
      return map.get(serial) || null;
    } catch (error) {
      this.logger.error(`获取微信支付平台证书失败: ${(error as Error).message}`);
      return null;
    }
  }

  /** AES-256-GCM 解密回调 / 证书密文 */
  decryptResource(resource: EncryptedResource): string {
    const key = Buffer.from(this.config.apiV3Key, 'utf8');
    const iv = Buffer.from(resource.nonce, 'utf8');
    const aad = Buffer.from(resource.associated_data || '', 'utf8');
    const buf = Buffer.from(resource.ciphertext, 'base64');
    const tag = buf.subarray(buf.length - 16);
    const data = buf.subarray(0, buf.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(aad);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  /** 回调验签 + 解密，返回业务明文 */
  async parseNotify(headers: PayNotifyHeaders, rawBody: string): Promise<any> {
    const { timestamp, nonce, signature, serial } = headers;
    if (!timestamp || !nonce || !signature || !serial) {
      throw new BadRequestException('微信支付回调缺少签名头');
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      throw new BadRequestException('微信支付回调时间戳已过期');
    }
    const publicKey = await this.getPlatformCert(serial);
    if (!publicKey) throw new BadRequestException('无法获取微信支付平台证书，验签失败');

    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const ok = crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64');
    if (!ok) throw new BadRequestException('微信支付回调验签失败');

    const body = JSON.parse(rawBody);
    if (!body.resource) throw new BadRequestException('微信支付回调数据格式错误');
    return JSON.parse(this.decryptResource(body.resource));
  }

  async jsapiPrepay(params: {
    description: string;
    outTradeNo: string;
    amount: number;
    openid: string;
    notifyUrl: string;
    attach?: string;
  }): Promise<string> {
    const result = await this.request<{ prepay_id: string }>('POST', '/v3/pay/transactions/jsapi', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      attach: params.attach,
      amount: { total: params.amount, currency: 'CNY' },
      payer: { openid: params.openid },
    });
    if (!result.prepay_id) throw new BadRequestException('微信支付下单失败：未返回 prepay_id');
    return result.prepay_id;
  }

  buildPayParams(prepayId: string): Record<string, string> {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    const message = `${this.config.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    return {
      timeStamp,
      nonceStr,
      package: pkg,
      signType: 'RSA',
      paySign: this.sign(message),
    };
  }

  async refund(params: {
    transactionId: string;
    outRefundNo: string;
    refund: number;
    total: number;
    reason?: string;
    notifyUrl?: string;
  }): Promise<{ refund_id: string; status: string }> {
    return this.request('POST', '/v3/refund/domestic/refunds', {
      transaction_id: params.transactionId,
      out_refund_no: params.outRefundNo,
      reason: params.reason,
      notify_url: params.notifyUrl,
      amount: { refund: params.refund, total: params.total, currency: 'CNY' },
    });
  }

  async queryOrder(outTradeNo: string): Promise<any> {
    return this.request('GET', `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.config.mchId}`);
  }

  async testConnection(): Promise<{ ok: boolean; certCount: number }> {
    const certs = await this.loadCertificates();
    return { ok: certs.size > 0, certCount: certs.size };
  }

  private translateError(code: string, message: string): string {
    const map: Record<string, string> = {
      APPID_MCHID_NOT_MATCH: 'AppID 与商户号不匹配，请检查小程序 AppID 是否绑定该商户号',
      MCH_NOT_EXISTS: '商户号不存在，请检查商户号是否填写正确',
      INVALID_REQUEST: '请求参数有误，请检查商户号、证书序列号、私钥是否匹配',
      SIGN_ERROR: '签名失败：商户私钥与证书序列号不匹配，请重新上传 API 证书私钥',
      NO_AUTH: '商户号权限不足，请在商户平台开通 JSAPI 支付',
      PARAM_ERROR: '参数错误，请检查金额、openid 等必填项',
      ORDERPAID: '该订单已支付，请勿重复支付',
      ORDERNOTEXIST: '订单不存在或已过期',
      OUT_TRADE_NO_USED: '商户订单号重复，请重新下单',
      NOT_ENOUGH: '商户号余额不足',
      FREQUENCY_LIMITED: '操作过于频繁，请稍后重试',
    };
    return map[code] || `微信支付错误${code ? `（${code}）` : ''}：${message}`;
  }
}
