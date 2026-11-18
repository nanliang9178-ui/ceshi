/**
 * 金额工具：系统内所有金额一律使用「整数分」存储与计算。
 * 浮点只出现在最终展示位置。
 */

export function fenToYuan(fen: number): number {
  if (!Number.isFinite(fen)) return 0;
  return Math.round(fen) / 100;
}

export function fenToYuanText(fen: number, withSymbol = false): string {
  const yuan = fenToYuan(fen);
  const text = Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
  return withSymbol ? `¥${text}` : text;
}

export function yuanToFen(yuan: number | string): number {
  const value = typeof yuan === 'string' ? Number(yuan) : yuan;
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/** 计算多行小计之和，避免浮点误差 */
export function sumFen(list: number[]): number {
  return list.reduce((acc, cur) => acc + Math.round(cur || 0), 0);
}
