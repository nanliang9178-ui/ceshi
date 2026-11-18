export interface TenantInfo {
  id: string;
  code: string;
  name: string;
  status: string;
  plan: string;
  expireAt?: string;
}

export interface BrandInfo {
  logoUrl?: string;
  coverUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  slogan?: string;
  announcement?: string;
  servicePhone?: string;
  copyright?: string;
  banners?: Array<{ url: string; link?: string }>;
}

export interface StoreInfo {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  businessHours: string;
  openStatus: boolean;
  autoAccept: boolean;
  packingFee: number;
  minOrderAmount: number;
  deliveryFee: number;
  deliveryMinAmount: number;
  deliveryRange?: string | null;
  deliveryEta: number;
  fullReduceThreshold: number;
  fullReduceAmount: number;
  notice?: string;
}

export interface MeInfo {
  type: 'staff' | 'platform';
  name: string;
  username?: string;
  role: string;
  tenant?: TenantInfo | null;
  brand?: BrandInfo | null;
  store?: StoreInfo | null;
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
  payStatus: string;
  statusText: string;
  payStatusText: string;
  customerName?: string | null;
  peopleCount?: number | null;
  remark?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  address?: string | null;
  deliveryFee: number;
  deliveryEta?: number | null;
  itemAmount: number;
  discountAmount: number;
  packingFee: number;
  totalAmount: number;
  paidAmount: number;
  pickupNo?: number | null;
  payChannel?: string | null;
  createdAt: string;
  paidAt?: string | null;
  cancelReason?: string | null;
  items: OrderItem[];
  itemCount: number;
  shopName?: string;
  allowedActions?: Record<string, boolean>;
}

export interface SpecOption {
  id?: string;
  name: string;
  priceDelta: number;
  sort?: number;
  defaultSelected?: boolean;
}

export interface SpecGroup {
  id?: string;
  name: string;
  required: boolean;
  multiple: boolean;
  sort?: number;
  options: SpecOption[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  originalPrice?: number | null;
  unit: string;
  tags: string;
  monthlySales: number;
  stockEnabled: boolean;
  stock: number;
  soldOut: boolean;
  status: string;
  sort: number;
  category?: { id: string; name: string };
  specGroups?: SpecGroup[];
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  promoLabel?: string | null;
  promoTitle?: string | null;
  sort: number;
  status: string;
  _count?: { products: number };
}

export interface DiningTable {
  id: string;
  name: string;
  area: string;
  seats: number;
  sceneCode: string;
  qrCodeUrl?: string | null;
  qrContent?: string | null;
}

export interface DashboardData {
  today: {
    amount: number;
    count: number;
    avgPrice: number;
    pendingCount: number;
    refundCount: number;
    compareRate: number | null;
  };
  yesterdayAmount: number;
  trend: Array<{ date: string; amount: number; count: number }>;
  topProducts: Array<{ name: string; quantity: number; amount: number }>;
}
