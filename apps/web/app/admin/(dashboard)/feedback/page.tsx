import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { FeedbackView } from "@/components/admin/FeedbackView";

export const revalidate = 0;

export default async function AdminFeedbackPage() {
  const service = getSupabaseServiceClient();

  const { data: rows } = await service
    .from("feedback")
    .select("id, reaction, comment, reason, status, resolution, created_at, order_id, orders(items), users(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const all = rows ?? [];
  const thisMonth = all.filter((f) => new Date(f.created_at) >= monthStart);
  const resolvedCount = all.filter((f) => f.status === "resolved").length;
  const resolutionRate = all.length > 0 ? Math.round((resolvedCount / all.length) * 100) : 0;

  const dishComplaints = new Map<string, number>();
  for (const f of all) {
    if (f.reaction !== "down") continue;
    const order = Array.isArray(f.orders) ? f.orders[0] : f.orders;
    const items = (order?.items ?? []) as { name: string }[];
    for (const item of items) {
      dishComplaints.set(item.name, (dishComplaints.get(item.name) ?? 0) + 1);
    }
  }
  const mostComplained = [...dishComplaints.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const feedbackRows = all.map((f) => {
    const user = Array.isArray(f.users) ? f.users[0] : f.users;
    return {
      id: f.id,
      reaction: f.reaction,
      comment: f.comment,
      reason: f.reason,
      status: f.status,
      resolution: f.resolution,
      createdAt: f.created_at,
      orderId: f.order_id,
      customerName: user?.name ?? null,
    };
  });

  return (
    <FeedbackView
      feedback={feedbackRows}
      totalThisMonth={thisMonth.length}
      resolutionRate={resolutionRate}
      mostComplainedDish={mostComplained}
    />
  );
}
