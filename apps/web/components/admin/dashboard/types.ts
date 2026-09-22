export interface TrendBar {
  label: string;
  value: number;
  height: string;
  color: string;
}
export interface PaymentSplitRow {
  label: string;
  pct: number;
  color: string;
}
export interface OrderValueBucket {
  label: string;
  pct: number;
  count: number;
}
export interface TopDish {
  name: string;
  count: number;
  revenue: string;
}

export interface OrderLineItem {
  name: string;
  price: string;
}
export interface TimelineStep {
  label: string;
  time: string;
  color: string;
}
export interface LiveOrder {
  id: string;
  customer: string;
  room: string;
  items: string;
  total: string;
  status: string;
  dotColor: string;
  badgeBg: string;
  lineItems: OrderLineItem[];
  timeline: TimelineStep[];
}

export interface DishDiscount {
  type: "percent" | "flat";
  value: number;
  ends: string;
}
export interface MenuDish {
  id: string;
  name: string;
  price: string;
  category: string;
}
export interface DishSection {
  sectionTitle: string;
  items: MenuDish[];
}
export interface MenuCombo {
  id: string;
  name: string;
  includes: string;
  originalPrice: string;
  comboPrice: string;
}
export interface MenuAddon {
  id: string;
  name: string;
  price: string;
}

export interface CustomerHistoryRow {
  item: string;
  date: string;
  total: string;
}
export interface Subscriber {
  id: string;
  initial: string;
  name: string;
  plan: string;
  room: string;
  daysLeft: string;
  lifetimeSpend: string;
  history: CustomerHistoryRow[];
}

export interface CustomerOrderRow {
  id: string;
  date: string;
  dish: string;
  amount: string;
  status: string;
  statusClass: string;
}
export interface CustomerFeedbackRow {
  orderId: string;
  dish: string;
  reason: string;
  status: string;
  statusClass: string;
  date: string;
}
export interface OrderDetailTimelineStep {
  label: string;
  time: string;
  colorClass: string;
}
export interface OrderDetailPastOrder {
  id: string;
  items: string;
  date: string;
  total: string;
}
export interface OrderDetail {
  id: string;
  customer: string;
  customerId: string;
  phone: string;
  address: string;
  status: string;
  statusClass: string;
  lineItems: OrderLineItem[];
  subtotal: string;
  deliveryFee: string;
  total: string;
  paymentMethod: string;
  rider: { initial: string; name: string; phone: string; status: string; statusClass: string } | null;
  timeline: OrderDetailTimelineStep[];
  pastOrders: OrderDetailPastOrder[];
}

export interface CustomerDetail {
  id: string;
  initial: string;
  name: string;
  phone: string;
  address: string;
  joinDate: string;
  plan: string;
  planActive: boolean;
  tag: string;
  tagClass: string;
  orderCount: number;
  avgOrder: string;
  lifetimeSpend: string;
  feedback: CustomerFeedbackRow[];
  history: CustomerOrderRow[];
}

export interface BusinessHourRow {
  day: string;
  hours: string;
}
export interface DeliveryZoneRow {
  name: string;
  fee: string;
}
export interface StaffRow {
  initial: string;
  name: string;
  role: string;
}
