import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { BroadcastForm } from "@/components/admin/BroadcastForm";

export const revalidate = 0;

export default async function AdminBroadcastsPage() {
  const service = getSupabaseServiceClient();
  const { data: history } = await service
    .from("broadcasts")
    .select("id, message, target, target_value, sent_count, sent_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Broadcasts</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Reaches customers who've messaged the Telegram bot at least once — web-only sign-ins with no bot contact aren't reachable yet.
      </p>
      <BroadcastForm />

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-500">Recent</h2>
      <div className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
        {(history ?? []).map((b) => (
          <div key={b.id} className="p-4">
            <p className="font-medium">{b.message}</p>
            <p className="text-sm text-neutral-500">
              {b.target}
              {b.target_value ? ` (${b.target_value})` : ""} · sent to {b.sent_count}
            </p>
          </div>
        ))}
        {(history ?? []).length === 0 && <p className="p-6 text-center text-neutral-400">No broadcasts yet.</p>}
      </div>
    </div>
  );
}
