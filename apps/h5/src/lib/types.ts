export interface Brand {
  logoUrl: string;
  coverUrl: string;
  primaryColor: string;
  accentColor: string;
  slogan: string;
  announcement: string;
  servicePhone: string;
  copyright: string;
  banners: Array<{ url: string }>;
}

export interface StoreInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  businessHours: string;
  openStatus: boolean;
  packingFee: number;
  minOrderAmount: number;
  deliveryFee: number;
  deliveryMinAmount: number;
  deliveryRange: string;
  deliveryEta: number;
  fullReduceThreshold: number;
  fullReduceAmount: number;
  notice: string;
}

export interface TableInfo {
  id: string;
  name: string;
  area: string;
  seats: number;
  sceneCode: string;
}

export interface ShopBoot {
  tenant: { id: string; code: string; name: string };
  brand: Brand;
  store: StoreInfo | null;
  table: TableInfo | null;
  wechat: { appId: string; mock: boolean };
}

export interface SpecOption {
  id: string;
  name: string;
  priceDelta: number;
  defaultSelected: boolean;
}

export interface SpecGroup {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  options: SpecOption[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  originalPrice?: number | null;
  unit?: string;
  tags?: string[];
  monthlySales?: number;
  soldOut: boolean;
  specGroups: SpecGroup[];
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  promoLabel?: string;
  promoTitle?: string;
  products: Product[];
}

export interface OrderItem {
  id: string;
  productName: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  amount: number;
  specText?: string | null;
  remark?: string | null;
}

export interface Order {
  id: string;
  orderNo: string;
  tableName?: string | null;
  type: string;
  status: string;
  statusText: string;
  payStatus: string;
  payStatusText: string;
  pickupNo?: number | null;
  itemAmount: number;
  discountAmount: number;
  packingFee: number;
  deliveryFee: number;
  deliveryEta?: number | null;
  totalAmount: number;
  remark?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  address?: string | null;
  createdAt: string;
  items: OrderItem[];
  itemCount: number;
  allowedActions?: Record<string, boolean>;
}

export interface LoginResult {
  token: string;
  tenant: { id: string; code: string; name: string };
  table: TableInfo | null;
}
