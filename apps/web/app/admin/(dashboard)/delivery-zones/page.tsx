"use client";

import { useState } from "react";

interface ZoneBase {
  key: string;
  name: string;
  km: number;
  fee: number;
  cost: number;
  mins: number;
  orders: number;
}

const BASE: ZoneBase[] = [
  { key: "z1", name: "Peace Lodge", km: 0.8, fee: 300, cost: 210, mins: 18, orders: 214 },
  { key: "z2", name: "Unity Hall", km: 1.1, fee: 350, cost: 250, mins: 21, orders: 147 },
  { key: "z3", name: "Hilltop Hostel", km: 1.4, fee: 400, cost: 290, mins: 24, orders: 168 },
  { key: "z4", name: "Presco Campus Gate", km: 1.9, fee: 450, cost: 340, mins: 27, orders: 96 },
  { key: "z5", name: "Off-campus (≤2km)", km: 2.0, fee: 600, cost: 380, mins: 29, orders: 132 },
  { key: "z6", name: "Kpirikpiri Road", km: 3.2, fee: 600, cost: 640, mins: 38, orders: 41 },
  { key: "z7", name: "Azuiyiokwu Layout", km: 4.1, fee: 750, cost: 880, mins: 46, orders: 23 },
];

// Positioned around a 560×368 schematic; scales fine to mobile widths since it's an SVG viewBox.
const MAP_POS: Record<string, { x: number; y: number; labelAnchor: "start" | "end"; labelDx: number; labelDy: number }> = {
  z1: { x: 261.2, y: 160.1, labelAnchor: "start", labelDx: 13, labelDy: 3.5 },
  z2: { x: 284.5, y: 195.2, labelAnchor: "start", labelDx: 13, labelDy: 3.5 },
  z3: { x: 215.7, y: 153.1, labelAnchor: "end", labelDx: -13, labelDy: 3.5 },
  z4: { x: 228.6, y: 242.9, labelAnchor: "end", labelDx: -13, labelDy: 3.5 },
  z5: { x: 311.2, y: 159.3, labelAnchor: "start", labelDx: 13, labelDy: 3.5 },
  z6: { x: 148, y: 211.3, labelAnchor: "end", labelDx: -13, labelDy: 3.5 },
  z7: { x: 313.5, y: 303.5, labelAnchor: "start", labelDx: 13, labelDy: 3.5 },
};
const BASE_X = 250;
const BASE_Y = 184;

function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

export default function AdminDeliveryZonesPage() {
  const [paused, setPaused] = useState<Record<string, boolean>>({ z7: true });
  const [freeThreshold, setFreeThreshold] = useState("5,000");
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  function toggleZone(key: string) {
    setPaused((p) => {
      const next = { ...p };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }

  const zones = BASE.map((z) => {
    const margin = z.fee - z.cost;
    const isActive = !paused[z.key];
    const positive = margin >= 0;
    return {
      ...z,
      distance: z.km.toFixed(1) + " km",
      feeLabel: naira(z.fee),
      costLabel: naira(z.cost),
      marginLabel: (positive ? "+" : "−") + naira(Math.abs(margin)),
      positive,
      isActive,
    };
  });

  const activeZones = zones.filter((z) => z.isActive);
  const avgFee = activeZones.length ? activeZones.reduce((n, z) => n + z.fee, 0) / activeZones.length : 0;
  const furthest = BASE.reduce((a, z) => (z.km > a.km ? z : a), BASE[0]!);
  const busiest = BASE.reduce((a, z) => (z.orders > a.orders ? z : a), BASE[0]!);
  const losing = zones.filter((z) => z.isActive && !z.positive);
  const zoneNotice = losing.length
    ? `${losing.map((z) => z.name).join(", ")} ${losing.length === 1 ? "loses" : "lose"} ${naira(
        losing.reduce((n, z) => n + (z.cost - z.fee), 0) / losing.length,
      )} per delivery on average — raise the fee for that zone or pause it.`
    : "Every active zone is covering its own cost to serve.";

  const editing = editingKey ? BASE.find((z) => z.key === editingKey) : null;

  return (
    <div>
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg px-5 lg:px-7">
        <h1 className="text-[18px] font-extrabold text-heading">Delivery zones</h1>
        <button onClick={() => { setEditingKey(null); setZoneModalOpen(true); }} className="flex items-center gap-1.5 rounded-full bg-heading px-3.5 py-2 text-[11.5px] font-bold text-bg lg:rounded-[10px] lg:px-4 lg:py-2.5 lg:text-[12.5px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
          Add zone
        </button>
      </div>

      <div className="p-5 lg:p-7">
        <div className="mb-[18px] grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          <StatCard label="Active zones" value={`${activeZones.length} of ${BASE.length}`} sub="Paused zones take no new deliveries" />
          <StatCard label="Average delivery fee" value={naira(avgFee)} sub="Across active zones" />
          <StatCard label="Furthest zone" value={`${furthest.km.toFixed(1)} km`} sub={furthest.name} />
          <StatCard label="Most orders — 30 days" value={`${busiest.orders} orders`} sub={busiest.name} />
        </div>

        <div className="mb-[18px] flex items-center gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--admin-nav-active-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
          <span className="text-[12px] font-semibold text-admin-nav-active lg:text-[12.5px]">{zoneNotice}</span>
        </div>

        <div className="mb-[18px] grid grid-cols-1 gap-3.5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[12.5px] font-bold text-heading">Zone map — distance from base</h3>
              <span className="text-[11px] font-bold text-muted">Schematic, not to scale</span>
            </div>
            <svg viewBox="0 0 560 368" width="100%" className="block max-h-[280px] lg:max-h-[368px]" role="img" aria-label="Schematic map of delivery zones around the 29Foods base">
              <rect x="0" y="0" width="560" height="368" fill="rgb(var(--color-bg))" rx="14" />
              {[33, 66, 99, 132].map((r, i) => (
                <g key={r}>
                  <circle cx={BASE_X} cy={BASE_Y} r={r} fill="none" stroke="rgb(var(--color-border))" strokeWidth="1" strokeDasharray="3 4" />
                  <text x={BASE_X + 3} y={BASE_Y - r - 4} fontFamily="'Inter Tight', sans-serif" fontSize="9.5" fontWeight="700" fill="rgb(var(--color-muted))">{i + 1}km</text>
                </g>
              ))}
              {BASE.map((z) => {
                const pos = MAP_POS[z.key]!;
                const isActive = !paused[z.key];
                const positive = z.fee - z.cost >= 0;
                const fill = positive ? "rgb(var(--color-success))" : "rgb(var(--color-accent))";
                const halo = positive ? "rgb(var(--color-success-bg))" : "rgb(var(--color-accent-tint))";
                const opacity = isActive ? 1 : 0.35;
                return (
                  <g key={z.key} opacity={opacity}>
                    <line x1={BASE_X} y1={BASE_Y} x2={pos.x} y2={pos.y} stroke="rgb(var(--color-border))" strokeWidth="1" />
                    <circle cx={pos.x} cy={pos.y} r="10" fill={halo} />
                    <circle cx={pos.x} cy={pos.y} r="6" fill={fill} stroke="rgb(var(--color-card))" strokeWidth="1.5" />
                    <text x={pos.x + pos.labelDx} y={pos.y + pos.labelDy} textAnchor={pos.labelAnchor} fontFamily="'Inter Tight', sans-serif" fontSize="11.5" fontWeight="700" fill={isActive ? "rgb(var(--color-body))" : "rgb(var(--color-muted))"}>
                      {z.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              <circle cx={BASE_X} cy={BASE_Y} r="15" fill="rgb(var(--color-accent-tint))" />
              <circle cx={BASE_X} cy={BASE_Y} r="8" fill="rgb(var(--color-accent))" stroke="rgb(var(--color-card))" strokeWidth="2" />
              <text x={BASE_X} y={BASE_Y + 30} textAnchor="middle" fontFamily="'Inter Tight', sans-serif" fontSize="11.5" fontWeight="800" fill="rgb(var(--color-heading))">29Foods base</text>
            </svg>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Legend color="bg-success" label="Margin positive" />
              <Legend color="bg-accent" label="Margin negative" />
              <Legend color="bg-accent/35" label="Paused" />
              <span className="text-[10.5px] font-semibold text-muted">Rings mark straight-line distance from base</span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-1 text-[13.5px] font-extrabold text-heading">Free delivery threshold</h3>
              <p className="mb-3.5 text-[11.5px] leading-[1.45] text-muted">Set the basket size at which 29Foods covers the delivery fee itself.</p>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Free delivery on orders above</label>
              <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
                <span className="text-[14px] font-extrabold text-heading">₦</span>
                <input value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} className="min-w-0 flex-1 border-none bg-transparent text-[14px] font-bold text-heading outline-none" />
              </div>
              <p className="mt-2.5 text-[11px] leading-[1.5] text-muted">Orders at or above ₦{freeThreshold} ship free — the delivery fee is absorbed by 29Foods, so check it against the margins below.</p>
            </div>
            <div className="rounded-2xl border border-border bg-admin-row-hover p-4">
              <div className="mb-2 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
                <span className="text-[12px] font-bold text-heading">How margin per delivery is worked out</span>
              </div>
              <p className="text-[11.5px] leading-[1.55] text-muted">Delivery fee charged minus the estimated cost to serve — the rider&rsquo;s time on that run plus fuel. A negative margin means every order to that zone is subsidised out of food profit.</p>
            </div>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {zones.map((z) => (
            <div key={z.key} className="rounded-2xl border border-border bg-card p-3.5" style={{ opacity: z.isActive ? 1 : 0.55 }}>
              <div className="mb-2.5 flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-heading">{z.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{z.distance} from base · {z.mins} min avg · {z.orders} orders 30d</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${z.isActive ? "bg-success-bg text-success" : "bg-border text-muted"}`}>{z.isActive ? "Active" : "Paused"}</span>
              </div>
              <div className="mb-2.5 flex gap-2">
                <MiniStat label="Fee" value={z.feeLabel} />
                <MiniStat label="Cost" value={z.costLabel} />
                <MiniStat label="Margin" value={z.marginLabel} accent={z.positive ? "success" : "danger"} />
              </div>
              <div className="flex items-center gap-2.5">
                <Toggle on={z.isActive} onClick={() => toggleZone(z.key)} />
                <button onClick={() => { setEditingKey(z.key); setZoneModalOpen(true); }} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-body">Edit</button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.95fr_0.95fr_0.8fr_0.75fr_0.95fr_52px] border-b border-border bg-admin-row-hover px-[18px] py-3">
            {["Zone", "Distance", "Fee", "Cost to serve", "Margin", "Avg time", "Orders 30d", "Status", ""].map((h) => (
              <span key={h} className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">{h}</span>
            ))}
          </div>
          {zones.map((z) => (
            <div key={z.key} className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.95fr_0.95fr_0.8fr_0.75fr_0.95fr_52px] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover" style={{ opacity: z.isActive ? 1 : 0.55 }}>
              <span className="text-[13px] font-bold text-heading">{z.name}</span>
              <span className="text-[12.5px] tabular-nums text-body">{z.distance}</span>
              <span className="text-[12.5px] tabular-nums text-body">{z.feeLabel}</span>
              <span className="text-[12.5px] tabular-nums text-muted">{z.costLabel}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[12px] font-extrabold tabular-nums ${z.positive ? "bg-success-bg text-success" : "bg-accent-tint text-accent"}`}>{z.marginLabel}</span>
              <span className="text-[12.5px] tabular-nums text-body">{z.mins} min</span>
              <span className="text-[12.5px] tabular-nums text-body">{z.orders}</span>
              <div className="flex items-center gap-2.5">
                <Toggle on={z.isActive} onClick={() => toggleZone(z.key)} />
                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${z.isActive ? "bg-success-bg text-success" : "bg-border text-muted"}`}>{z.isActive ? "Active" : "Paused"}</span>
              </div>
              <button onClick={() => { setEditingKey(z.key); setZoneModalOpen(true); }} className="justify-self-end rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-body">Edit</button>
            </div>
          ))}
        </div>
      </div>

      {zoneModalOpen && (
        <ZoneModal
          editing={editing}
          onClose={() => setZoneModalOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="text-[19px] font-extrabold tabular-nums text-heading lg:text-[22px]">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
    </div>
  );
}
function MiniStat({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <div className={`flex-1 rounded-[10px] p-2 ${accent === "danger" ? "bg-admin-danger" : accent === "success" ? "bg-success-bg" : "bg-admin-row-hover"}`}>
      <div className={`text-[9.5px] font-bold uppercase tracking-[0.04em] ${accent === "danger" ? "text-admin-nav-active" : accent === "success" ? "text-success" : "text-muted"}`}>{label}</div>
      <div className={`mt-0.5 text-[13px] font-extrabold tabular-nums ${accent === "danger" ? "text-admin-nav-active" : accent === "success" ? "text-success" : "text-heading"}`}>{value}</div>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
      <span className={`inline-block h-[9px] w-[9px] rounded-full ${color}`} />
      {label}
    </span>
  );
}
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={on ? "Pause" : "Activate"} className="relative h-[19px] w-[34px] shrink-0 rounded-full p-0" style={{ background: on ? "rgb(var(--color-success))" : "rgb(var(--color-border))" }}>
      <span className="absolute top-0.5 h-[15px] w-[15px] rounded-full bg-card transition-all" style={{ left: on ? 15 : 2 }} />
    </button>
  );
}

function ZoneModal({ editing, onClose }: { editing: ZoneBase | null | undefined; onClose: () => void }) {
  const form = editing
    ? { name: editing.name, distance: editing.km.toFixed(1) + " km", fee: naira(editing.fee), cost: naira(editing.cost), time: editing.mins + " min" }
    : { name: "Ishieke Junction", distance: "2.6 km", fee: "₦650", cost: "₦480", time: "33 min" };
  const [active, setActive] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-[18px] flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold text-heading">{editing ? "Edit zone" : "Add zone"}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mb-5 flex flex-col gap-3.5">
          <Field label="Zone name"><input defaultValue={form.name} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field>
          <div className="flex gap-3">
            <div className="flex-1"><Field label="Distance from base"><input defaultValue={form.distance} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
            <div className="flex-1"><Field label="Estimated delivery time"><input defaultValue={form.time} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><Field label="Delivery fee"><input defaultValue={form.fee} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
            <div className="flex-1"><Field label="Estimated cost to serve"><input defaultValue={form.cost} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-border bg-admin-row-hover px-3.5 py-2.5">
            <div>
              <div className="text-[12.5px] font-bold text-heading">Zone status</div>
              <div className="mt-0.5 text-[11px] text-muted">Paused zones stop accepting new delivery orders.</div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="text-[11.5px] font-bold text-body">{active ? "Active" : "Paused"}</span>
              <Toggle on={active} onClick={() => setActive((a) => !a)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="px-3.5 py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
          <button onClick={onClose} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">{editing ? "Save zone" : "Add zone"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">{children}</div>
    </div>
  );
}
