import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardTabs } from "@/components/admin/dashboard/DashboardTabs";
import type {
  CustomerRow,
  MenuRow,
  OrderRow,
  OverviewData,
} from "@/components/admin/dashboard/types";

export const revalidate = 0;

const DELAY_THRESHOLD_MS = 45 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  const service = getSupabaseServiceClient();
  const session = await getSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [ordersRes, menuItemsRes, usersRes, activeSubsRes, adminProfilesRes] = await Promise.all([
    service
      .from("orders")
      .select("id, items, total, lodge, room, order_status, payment_status, channel, created_at, paid_at, assigned_rider_id")
      .order("created_at", { ascending: false })
      .limit(100),
    service
      .from("menu_items")
      .select("id, name, category, price, is_available, inventory(stock_count, low_stock_threshold)")
      .order("category")
      .order("name"),
    service
      .from("users")
      .select("id, name, email, lodge, room, loyalty_points, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    service.from("subscriptions").select("user_id").eq("status", "active"),
    service.from("admin_profiles").select("id, name, role, created_at").order("created_at"),
  ]);

  const orders = ordersRes.data ?? [];
  const activeSubUserIds = new Set((activeSubsRes.data ?? []).map((s) => s.user_id));

  // ---- Overview aggregates ----
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart);
  const todayRevenueKobo = todayOrders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  const newCustomersThisWeek = (usersRes.data ?? []).filter((u) => new Date(u.created_at) >= weekAgo).length;

  const last7Days: OverviewData["last7Days"] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(sevenDaysAgo.getTime() + i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const count = orders.filter((o) => {
      const t = new Date(o.created_at);
      return t >= dayStart && t < dayEnd;
    }).length;
    last7Days.push({
      label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    });
  }

  const last7DaysOrders = orders.filter((o) => new Date(o.created_at) >= sevenDaysAgo);
  const channelCounts = new Map<string, number>();
  const dishQty = new Map<string, number>();
  const valueBuckets = [
    { label: "< ₦2k", max: 200000, count: 0 },
    { label: "₦2k–5k", max: 500000, count: 0 },
    { label: "₦5k–10k", max: 1000000, count: 0 },
    { label: "₦10k+", max: Infinity, count: 0 },
  ];
  for (const o of last7DaysOrders) {
    channelCounts.set(o.channel, (channelCounts.get(o.channel) ?? 0) + 1);
    const bucket = valueBuckets.find((b) => o.total < b.max);
    if (bucket) bucket.count += 1;
    const items = (o.items ?? []) as { name: string; qty: number }[];
    for (const item of items) {
      dishQty.set(item.name, (dishQty.get(item.name) ?? 0) + item.qty);
    }
  }
  const topDishes = [...dishQty.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const overview: OverviewData = {
    todayRevenueKobo,
    ordersToday: todayOrders.length,
    activePlans: activeSubUserIds.size,
    newCustomersThisWeek,
    last7Days,
    channelBreakdown: [...channelCounts.entries()].map(([channel, count]) => ({ channel, count })),
    topDishes,
    orderValueBuckets: valueBuckets.map((b) => ({ label: b.label, count: b.count })),
  };

  // ---- Orders tab ----
  const orderRows: OrderRow[] = orders.slice(0, 50).map((o) => {
    const items = (o.items ?? []) as { name: string; qty: number }[];
    const ageMs = now.getTime() - new Date(o.created_at).getTime();
    const delayed = ageMs > DELAY_THRESHOLD_MS && !["delivered", "cancelled"].includes(o.order_status);
    return {
      id: o.id,
      itemsSummary: items.map((i) => `${i.qty}x ${i.name}`).join(", "),
      total: o.total,
      lodge: o.lodge,
      room: o.room,
      orderStatus: o.order_status,
      paymentStatus: o.payment_status,
      channel: o.channel,
      createdAt: o.created_at,
      delayed,
    };
  });

  // ---- Menu tab ----
  const menuRows: MenuRow[] = (menuItemsRes.data ?? []).map((item) => {
    const inv = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      isAvailable: item.is_available,
      stockCount: inv?.stock_count ?? 0,
      lowStockThreshold: inv?.low_stock_threshold ?? 5,
    };
  });

  // ---- Customers tab ----
  const customerRows: CustomerRow[] = (usersRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    lodge: u.lodge,
    room: u.room,
    loyaltyPoints: u.loyalty_points,
    createdAt: u.created_at,
    hasActivePlan: activeSubUserIds.has(u.id),
  }));

  const admins = (adminProfilesRes.data ?? []).map((a) => ({ id: a.id, name: a.name, role: a.role }));
  const self = admins.find((a) => a.id === user?.id) ?? null;

  return (
    <DashboardTabs
      overview={overview}
      orders={orderRows}
      menu={menuRows}
      customers={customerRows}
      customerCount={usersRes.data?.length ?? 0}
      admins={admins}
      self={self ? { id: self.id, name: self.name, email: user?.email ?? null, role: self.role } : null}
    />
  );
}
