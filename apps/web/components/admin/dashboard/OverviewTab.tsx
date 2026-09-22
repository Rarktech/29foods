import { ORDER_VALUE_BUCKETS, PAYMENT_SPLIT, TOP_DISHES, TREND_RAW } from "./sampleData";

export function OverviewTab() {
  const maxVal = Math.max(...TREND_RAW.map((d) => d.value));
  const trendBars = TREND_RAW.map((d, i) => ({
    ...d,
    height: Math.round((d.value / maxVal) * 100) + "%",
    isLast: i === TREND_RAW.length - 1,
  }));

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, #6B1010 100%)" }}>
          <div className="absolute -right-[18px] -top-[18px] h-[90px] w-[90px] rounded-full bg-white/[0.07]" />
          <p className="relative z-[1] mb-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#FFD9A0]">Today&rsquo;s revenue</p>
          <p className="relative z-[1] text-[25px] font-extrabold tabular-nums text-white">₦184,200</p>
          <p className="relative z-[1] mt-1 text-[11.5px] font-bold text-[#FFDAD3]">↑ 12% vs yesterday</p>
        </div>
        <StatCard label="Orders today" value="47" sub="↑ 6 vs yesterday" subClass="text-success" />
        <StatCard label="Active plans" value="63" sub="₦1.2M booked" />
        <StatCard label="New customers" value="9" sub="this week" />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-heading">Orders, last 7 days</h3>
            <span className="text-[11.5px] font-bold text-muted">312 total</span>
          </div>
          <div className="flex h-[130px] items-end gap-3.5">
            {trendBars.map((bar) => (
              <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-bold tabular-nums text-body">{bar.value}</span>
                <div
                  className={`w-full max-w-[34px] rounded-t-[7px] rounded-b-[3px] ${bar.isLast ? "bg-accent" : "bg-admin-chart-bar"}`}
                  style={{ height: bar.height }}
                />
                <span className="text-[11px] font-semibold text-muted">{bar.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-3.5 text-[14px] font-bold text-heading">Payment methods</h3>
          <div className="flex flex-col gap-3">
            {PAYMENT_SPLIT.map((p) => (
              <div key={p.label}>
                <div className="mb-1 flex justify-between">
                  <span className="text-[12.5px] font-semibold text-body">{p.label}</span>
                  <span className="text-[12.5px] font-bold text-heading">{p.pct}%</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Panel>
          <h3 className="mb-3.5 text-[14px] font-bold text-heading">Top dishes this week</h3>
          <div className="flex flex-col gap-2.5">
            {TOP_DISHES.map((dish) => (
              <div key={dish.name} className="flex items-center gap-3">
                <div className="h-[38px] w-[38px] shrink-0 rounded-[10px] bg-bg" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-heading">{dish.name}</div>
                  <div className="text-[11px] text-muted">{dish.count} orders</div>
                </div>
                <span className="text-[12.5px] font-extrabold tabular-nums text-heading">{dish.revenue}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-3.5 text-[14px] font-bold text-heading">Order value distribution</h3>
          <div className="flex flex-col gap-2.5">
            {ORDER_VALUE_BUCKETS.map((b) => (
              <div key={b.label} className="flex items-center gap-2.5">
                <span className="w-[76px] shrink-0 text-[12px] text-body">{b.label}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-[6px] bg-border">
                  <div className="h-full rounded-[6px] bg-accent" style={{ width: `${b.pct}%` }} />
                </div>
                <span className="w-[30px] shrink-0 text-right text-[11.5px] font-bold text-heading">{b.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, subClass }: { label: string; value: string; sub: string; subClass?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="text-[25px] font-extrabold tabular-nums text-heading">{value}</p>
      <p className={`mt-1 text-[11.5px] font-bold ${subClass ?? "text-muted"}`}>{sub}</p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-[18px]">{children}</div>;
}
