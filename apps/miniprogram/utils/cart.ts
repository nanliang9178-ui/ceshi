import { STORAGE_KEYS } from './env';

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  specOptionIds: string[];
  specText: string;
  remark?: string;
}

export interface CartSummary {
  count: number;
  amount: number;
  items: CartItem[];
}

type Listener = (summary: CartSummary) => void;

let items: CartItem[] = [];
let listeners: Listener[] = [];
let loaded = false;

function storage(): CartItem[] {
  if (!loaded) {
    items = wx.getStorageSync(STORAGE_KEYS.cart) || [];
    loaded = true;
  }
  return items;
}

function persist(): void {
  wx.setStorageSync(STORAGE_KEYS.cart, items);
}

export function getSummary(): CartSummary {
  const list = storage();
  return {
    count: list.reduce((sum, item) => sum + item.quantity, 0),
    amount: list.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    items: list,
  };
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  listener(getSummary());
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

function notify(): void {
  persist();
  const summary = getSummary();
  listeners.forEach((listener) => listener(summary));
}

export function addItem(item: Omit<CartItem, 'key' | 'quantity'> & { quantity?: number }): void {
  const list = storage();
  const key = `${item.productId}__${(item.specOptionIds || []).slice().sort().join(',')}`;
  const exist = list.find((entry) => entry.key === key);
  const quantity = item.quantity || 1;

  if (exist) {
    exist.quantity = Math.min(99, exist.quantity + quantity);
  } else {
    list.push({ ...item, key, quantity });
  }
  notify();
  wx.vibrateShort({ type: 'light' });
}

export function changeQuantity(key: string, delta: number): void {
  const list = storage();
  const target = list.find((item) => item.key === key);
  if (!target) return;
  target.quantity += delta;
  if (target.quantity <= 0) {
    items = list.filter((item) => item.key !== key);
  }
  notify();
}

export function removeItem(key: string): void {
  items = storage().filter((item) => item.key !== key);
  notify();
}

export function clearCart(): void {
  items = [];
  notify();
}

export function countOf(productId: string): number {
  return storage()
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function buildOrderItems(): Array<{
  productId: string;
  quantity: number;
  specOptionIds: string[];
  remark?: string;
}> {
  return storage().map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    specOptionIds: item.specOptionIds || [],
    remark: item.remark || undefined,
  }));
}
