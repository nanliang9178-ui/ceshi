import * as crypto from 'crypto';

/**
 * 敏感配置加解密（微信支付私钥、APIv3 密钥）
 * 算法：AES-256-GCM，输出 base64(iv|tag|ciphertext)
 * 主密钥来自环境变量 CONFIG_ENCRYPTION_KEY（32 字节 base64）
 */

const DEV_FALLBACK_KEY = 'tianshu-dev-only-config-key-32byte';

function getKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
    // 允许直接传 32 位明文字符串
    if (raw.length === 32) return Buffer.from(raw, 'utf8');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CONFIG_ENCRYPTION_KEY 未配置或长度不正确，无法加密商户密钥');
  }
  return crypto.createHash('sha256').update(DEV_FALLBACK_KEY).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string): string {
  if (!payload) return '';
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** 脱敏展示：只保留首尾字符 */
export function maskSecret(value?: string | null, keep = 4): string {
  if (!value) return '';
  if (value.length <= keep * 2) return '*'.repeat(value.length);
  return `${value.slice(0, keep)}${'*'.repeat(Math.min(12, value.length - keep * 2))}${value.slice(-keep)}`;
}

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function randomToken(len = 12): string {
  return crypto.randomBytes(len).toString('hex');
}
