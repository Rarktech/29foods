import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { MessageForm } from "@/components/admin/MessageForm";

export const revalidate = 0;

export default async function AdminMessagesPage() {
  const service = getSupabaseServiceClient();
  const { data: history } = await service
    .from("broadcasts")
    .select("id, message, target, target_value, sent_count, sent_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-[20px] font-extrabold text-heading">Messages</h1>
        <p className="mt-1 text-[13px] text-muted">
          Reaches customers who&rsquo;ve messaged the Telegram bot at least once — web-only sign-ins with no bot contact aren&rsquo;t reachable yet.
        </p>
      </div>

      <MessageForm />

      <div>
        <p className="mb-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">Recent</p>
        <div className="flex flex-col divide-y divide-border rounded-panel border border-border bg-card">
          {(history ?? []).map((b) => (
            <div key={b.id} className="p-4">
              <p className="text-[13.5px] font-semibold text-heading">{b.message}</p>
              <p className="mt-0.5 text-[12px] capitalize text-muted">
                {b.target.replace(/_/g, " ")}
                {b.target_value ? ` (${b.target_value})` : ""} · sent to {b.sent_count}
              </p>
            </div>
          ))}
          {(history ?? []).length === 0 && <p className="p-6 text-center text-[13px] text-muted">No messages yet.</p>}
        </div>
      </div>
    </div>
  );
}
