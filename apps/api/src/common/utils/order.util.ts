import * as crypto from 'crypto';

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function stamp(date = new Date()): string {
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/** 商户订单号：T + 时间戳 + 6 位随机数（微信要求 ≤32 位、同商户号唯一） */
export function buildOutTradeNo(): string {
  return `T${stamp()}${crypto.randomInt(100000, 999999)}`;
}

/** 系统内部订单号：日期 + 8 位随机，便于人工核对 */
export function buildOrderNo(): string {
  const d = new Date();
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `${day}${crypto.randomInt(10000000, 99999999)}`;
}

/** 退款单号 */
export function buildRefundNo(): string {
  return `R${stamp()}${crypto.randomInt(10000, 99999)}`;
}

/** 桌码短码：8 位 base36，扫码 scene 使用 */
export function buildSceneCode(): string {
  return crypto.randomBytes(5).toString('hex').slice(0, 10);
}
