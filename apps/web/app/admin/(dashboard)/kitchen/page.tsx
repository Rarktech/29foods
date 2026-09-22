const QUEUED = [
  { id: "#29F-1046", wait: "3 min", items: "Native Jollof, Fanta" },
  { id: "#29F-1045", wait: "5 min", items: "Garlic Fried Rice" },
  { id: "#29F-1044", wait: "6 min", items: "Peppered Chicken ×2" },
];

const COOKING = [
  { id: "#29F-1043", wait: "9 min", items: "Ofada Special", danger: false },
  { id: "#29F-1042", wait: "12 min", items: "Party Jollof + Chicken, Fanta", danger: false },
  { id: "#29F-1040", wait: "15 min", items: "Native Jollof", danger: false },
  { id: "#29F-1038", wait: "22 min", items: "Garlic Fried Rice, Fanta", danger: true },
];

const READY = [
  { id: "#29F-1039", items: "Peppered Chicken ×2" },
  { id: "#29F-1037", items: "Ofada Special, Fanta" },
];

export default function AdminKitchenPage() {
  return (
    <div className="p-5 lg:p-7">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-heading">Kitchen</h1>
        <span className="text-[12px] font-semibold text-muted">Live prep queue · auto-updates</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 lg:gap-3.5">
        <StatCard label="Orders in queue" value="9" />
        <StatCard label="Avg prep time" value="14 min" />
        <StatCard label="Longest wait" value="22 min" danger />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-4">
        <Column dot="bg-muted" title="Queued" count={3} countBg="bg-border" countText="text-muted">
          {QUEUED.map((o) => (
            <Card key={o.id} id={o.id} items={o.items} badge={{ text: o.wait, bg: "bg-border", text_: "text-muted" }}>
              <button className="w-full rounded-[9px] bg-border px-2 py-2 text-[11.5px] font-bold text-body">Start cooking</button>
            </Card>
          ))}
        </Column>

        <Column dot="bg-warning" title="Cooking" count={4} countBg="bg-warning/15" countText="text-warning">
          {COOKING.map((o) => (
            <Card
              key={o.id}
              id={o.id}
              items={o.items}
              danger={o.danger}
              borderClass={o.danger ? undefined : "border-[#3A2E17]"}
              badge={o.danger ? { text: o.wait, bg: "bg-accent-tint", text_: "text-admin-nav-active" } : { text: o.wait, bg: "bg-warning/15", text_: "text-warning" }}
            >
              <button className="w-full rounded-[9px] bg-heading px-2 py-2 text-[11.5px] font-bold text-bg">Mark ready</button>
            </Card>
          ))}
        </Column>

        <Column dot="bg-success" title="Ready for pickup" count={2} countBg="bg-success-bg" countText="text-success">
          {READY.map((o) => (
            <Card key={o.id} id={o.id} items={o.items} borderClass="border-[#234934]" badge={{ text: "Waiting rider", bg: "bg-success-bg", text_: "text-success" }}>
              <button className="w-full rounded-[9px] bg-success-bg px-2 py-2 text-[11.5px] font-bold text-success">Hand to rider</button>
            </Card>
          ))}
        </Column>
      </div>
    </div>
  );
}

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-panel border p-4 ${danger ? "border-admin-danger-border bg-admin-danger" : "border-border bg-card"}`}>
      <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.05em] ${danger ? "text-admin-nav-active" : "text-muted"}`}>{label}</p>
      <p className={`text-[19px] font-extrabold tabular-nums lg:text-[22px] ${danger ? "text-admin-nav-active" : "text-heading"}`}>{value}</p>
    </div>
  );
}

function Column({
  dot,
  title,
  count,
  countBg,
  countText,
  children,
}: {
  dot: string;
  title: string;
  count: number;
  countBg: string;
  countText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-heading">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${countBg} ${countText}`}>{count}</span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Card({
  id,
  items,
  badge,
  danger,
  borderClass,
  children,
}: {
  id: string;
  items: string;
  badge: { text: string; bg: string; text_: string };
  danger?: boolean;
  borderClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 ${danger ? "border-admin-danger-border bg-admin-danger" : `${borderClass ?? "border-border"} bg-card`}`}>
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[12.5px] font-bold text-heading">{id}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${badge.bg} ${badge.text_}`}>{badge.text}</span>
      </div>
      <div className="mb-3 text-[12.5px] text-body">{items}</div>
      {children}
    </div>
  );
}
