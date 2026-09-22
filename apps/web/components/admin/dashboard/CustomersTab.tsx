import Link from "next/link";
import type { Subscriber } from "./types";

export function CustomersTab({
  subscribers,
  onOpenAddCustomer,
}: {
  subscribers: Subscriber[];
  onOpenAddCustomer: () => void;
}) {
  return (
    <div>
      <div className="mb-[18px] grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Total customers</p>
          <p className="text-[24px] font-extrabold tabular-nums text-heading">842</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">On meal plans</p>
          <p className="text-[24px] font-extrabold tabular-nums text-heading">63</p>
        </div>
      </div>
      <div className="mb-3 flex justify-end">
        <button onClick={onOpenAddCustomer} className="flex items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
          Add customer
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_90px] border-b border-border bg-admin-row-hover px-[18px] py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Customer</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Room</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Plan</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Renews</span>
          <span />
        </div>
        {subscribers.map((sub) => (
          <Link
            key={sub.id}
            href={`/admin/customers/${sub.id}`}
            className="grid grid-cols-[1.4fr_1fr_1fr_1fr_90px] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-tint text-[11.5px] font-extrabold text-admin-nav-active">{sub.initial}</span>
              <span className="text-[13px] font-bold text-heading">{sub.name}</span>
            </div>
            <span className="text-[12px] text-muted">{sub.room}</span>
            <span className="text-[12px] text-body">{sub.plan}</span>
            <span className="w-fit rounded-full bg-success-bg px-2.5 py-1 text-[10.5px] font-bold text-success">{sub.daysLeft}</span>
            <span className="text-right text-[11.5px] font-bold text-admin-nav-active">View →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
