export interface OverviewData {
  todayRevenueKobo: number;
  ordersToday: number;
  activePlans: number;
  newCustomersThisWeek: number;
  last7Days: { label: string; count: number }[];
  channelBreakdown: { channel: string; count: number }[];
  topDishes: { name: string; qty: number }[];
  orderValueBuckets: { label: string; count: number }[];
}

export interface OrderRow {
  id: string;
  itemsSummary: string;
  total: number;
  lodge: string;
  room: string | null;
  orderStatus: string;
  paymentStatus: string;
  channel: string;
  createdAt: string;
  delayed: boolean;
}

export interface MenuRow {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  stockCount: number;
  lowStockThreshold: number;
}

export interface CustomerRow {
  id: string;
  name: string | null;
  email: string | null;
  lodge: string | null;
  room: string | null;
  loyaltyPoints: number;
  createdAt: string;
  hasActivePlan: boolean;
}

export interface AdminRow {
  id: string;
  name: string | null;
  role: string;
}
