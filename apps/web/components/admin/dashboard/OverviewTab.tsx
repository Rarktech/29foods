import { formatKobo } from "@/lib/format";
import type { OverviewData } from "./types";

export function OverviewTab({ data }: { data: OverviewData }) {
  const maxDay = Math.max(1, ...data.last7Days.map((d) => d.count));
  const maxBucket = Math.max(1, ...data.orderValueBuckets.map((b) => b.count));
  const totalChannel = Math.max(1, data.channelBreakdown.reduce((s, c) => s + c.count, 0));
  const maxDish = Math.max(1, ...data.topDishes.map((d) => d.qty));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's revenue" value={formatKobo(data.todayRevenueKobo)} />
        <StatCard label="Orders today" value={String(data.ordersToday)} />
        <StatCard label="Active plans" value={String(data.activePlans)} />
        <StatCard label="New customers (7d)" value={String(data.newCustomersThisWeek)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Orders, last 7 days">
          <div className="flex h-32 items-end gap-2.5 px-1">
            {data.last7Days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-lg bg-accent"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                />
                <span className="text-[11px] font-semibold text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Order value distribution">
          <div className="flex flex-col gap-2.5">
            {data.orderValueBuckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[12px] font-semibold text-body">{b.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] font-semibold text-muted">{b.count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Orders by channel (7d)">
          <div className="flex flex-col gap-2.5">
            {data.channelBreakdown.length === 0 && <p className="text-[12px] text-muted">No orders yet.</p>}
            {data.channelBreakdown.map((c) => (
              <div key={c.channel} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[12px] font-semibold capitalize text-body">{c.channel}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(c.count / totalChannel) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] font-semibold text-muted">{c.count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top dishes this week">
          <div className="flex flex-col gap-2.5">
            {data.topDishes.length === 0 && <p className="text-[12px] text-muted">No orders yet.</p>}
            {data.topDishes.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[12px] font-semibold text-body">{d.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(d.qty / maxDish) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] font-semibold text-muted">{d.qty}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <p className="mb-1.5 text-[11.5px] font-semibold text-muted">{label}</p>
      <p className="text-[19px] font-extrabold text-heading">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <p className="mb-4 text-[13px] font-bold text-heading">{title}</p>
      {children}
    </div>
  );
}
