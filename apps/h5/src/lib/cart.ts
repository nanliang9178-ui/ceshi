export interface CartLine {
  key: string;
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  specOptionIds: string[];
  specText: string;
}

let storageKey = 'ts_h5_cart_demo';
let lines: CartLine[] = [];
let ready = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function persist(): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(lines));
  } catch {
    /* 隐私模式下忽略 */
  }
}

export function configureCart(tenantCode: string): void {
  const nextKey = `ts_h5_cart_${tenantCode}`;
  if (nextKey === storageKey && ready) return;
  storageKey = nextKey;
  try {
    const raw = localStorage.getItem(storageKey);
    lines = raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    lines = [];
  }
  ready = true;
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLines(): CartLine[] {
  return lines;
}

export function summary(): { count: number; amount: number } {
  return {
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    amount: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  };
}

export function addLine(input: Omit<CartLine, 'key' | 'quantity'> & { quantity?: number }): void {
  const key = `${input.productId}__${input.specOptionIds.slice().sort().join(',')}`;
  const exist = lines.find((line) => line.key === key);
  const quantity = input.quantity || 1;
  if (exist) {
    exist.quantity = Math.min(99, exist.quantity + quantity);
  } else {
    lines = [...lines, { ...input, key, quantity }];
  }
  persist();
  emit();
}

export function changeQuantity(key: string, delta: number): void {
  const target = lines.find((line) => line.key === key);
  if (!target) return;
  const next = target.quantity + delta;
  if (next <= 0) {
    lines = lines.filter((line) => line.key !== key);
  } else {
    target.quantity = Math.min(99, next);
    lines = [...lines];
  }
  persist();
  emit();
}

export function clearCart(): void {
  lines = [];
  persist();
  emit();
}

export function countOf(productId: string): number {
  return lines.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);
}

export function toOrderItems(): Array<{ productId: string; quantity: number; specOptionIds: string[] }> {
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    specOptionIds: line.specOptionIds,
  }));
}
