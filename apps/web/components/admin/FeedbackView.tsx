"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resolveFeedback, updateFeedbackStatus } from "@/app/admin/(dashboard)/feedback/actions";

const REACTION_EMOJI: Record<string, string> = { fire: "🔥", neutral: "😐", down: "👎" };
const STATUS_STYLES: Record<string, string> = {
  new: "bg-accent-tint text-accent",
  under_review: "bg-warning/15 text-warning",
  resolved: "bg-success-bg text-success",
};

interface FeedbackRow {
  id: string;
  reaction: string;
  comment: string | null;
  reason: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  orderId: string;
  customerName: string | null;
}

export function FeedbackView({
  feedback,
  totalThisMonth,
  resolutionRate,
  mostComplainedDish,
}: {
  feedback: FeedbackRow[];
  totalThisMonth: number;
  resolutionRate: number;
  mostComplainedDish: string;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-[20px] font-extrabold text-heading">Feedback</h1>
        <p className="mt-1 text-[13px] text-muted">Customer reactions and complaints, with resolution tracking.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="This month" value={String(totalThisMonth)} />
        <StatCard label="Resolution rate" value={`${resolutionRate}%`} />
        <StatCard label="Most complained" value={mostComplainedDish} />
      </div>

      <div className="flex flex-col divide-y divide-border rounded-panel border border-border bg-card">
        {feedback.map((f) => (
          <FeedbackRowItem key={f.id} item={f} />
        ))}
        {feedback.length === 0 && <p className="p-6 text-center text-[13px] text-muted">No feedback yet.</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <p className="mb-1.5 text-[11px] font-semibold text-muted">{label}</p>
      <p className="truncate text-[16px] font-extrabold text-heading">{value}</p>
    </div>
  );
}

function FeedbackRowItem({ item }: { item: FeedbackRow }) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [pending, startTransition] = useTransition();

  function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolution.trim()) return;
    startTransition(async () => {
      await resolveFeedback(item.id, resolution.trim());
      setResolveOpen(false);
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-heading">
            {REACTION_EMOJI[item.reaction] ?? ""} {item.customerName ?? "Customer"}
            <Link href={`/admin/orders/${item.orderId}`} className="ml-2 text-[11.5px] font-semibold text-accent">
              view order
            </Link>
          </p>
          {(item.comment || item.reason) && <p className="mt-1 text-[12.5px] text-body">{item.comment ?? item.reason}</p>}
          {item.resolution && <p className="mt-1.5 text-[12px] text-success">Resolved: {item.resolution}</p>}
          <p className="mt-1 text-[11px] text-muted">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
        <select
          value={item.status}
          onChange={(e) => startTransition(() => updateFeedbackStatus(item.id, e.target.value as never))}
          className={`shrink-0 rounded-full border-0 px-3 py-1.5 text-[11px] font-bold capitalize ${STATUS_STYLES[item.status]}`}
        >
          <option value="new">New</option>
          <option value="under_review">Under review</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {item.status !== "resolved" && (
        <div className="mt-2">
          {!resolveOpen ? (
            <button onClick={() => setResolveOpen(true)} className="text-[12px] font-bold text-accent">
              Resolve with a note
            </button>
          ) : (
            <form onSubmit={handleResolve} className="mt-2 flex items-center gap-2">
              <input
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="What was done about it?"
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-[12.5px] text-body"
                required
              />
              <button type="submit" disabled={pending} className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-50">
                Save
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
