import Link from "next/link";

const COMPLAINTS = [
  { customer: "Emeka Obi", orderId: "#29F-1038", dish: "Garlic Fried Rice", reason: "Cold food", resolution: "Replacement sent", date: "Today", status: "RESOLVED" },
  { customer: "Ngozi Eze", orderId: "#29F-1031", dish: "Peppered Chicken", reason: "Late delivery", resolution: "Store credit issued", date: "Yesterday", status: "RESOLVED" },
  { customer: "Uche Igwe", orderId: "#29F-1027", dish: "Ofada Special", reason: "Wrong item", resolution: "Under review", date: "2 days ago", status: "UNDER REVIEW" },
  { customer: "Fatima Sani", orderId: "#29F-1019", dish: "Party Jollof + Chicken", reason: "Late delivery", resolution: "Escalated to rider", date: "3 days ago", status: "RESOLVED" },
  { customer: "Tobi Alabi", orderId: "#29F-1012", dish: "Native Jollof", reason: "Cold food", resolution: "Resolved — no action needed", date: "4 days ago", status: "CLOSED" },
  { customer: "Chiamaka Nnadi", orderId: "#29F-1004", dish: "Garlic Fried Rice", reason: "Wrong item", resolution: "Apology + free add-on next order", date: "5 days ago", status: "RESOLVED" },
  { customer: "David Okon", orderId: "#29F-0996", dish: "Peppered Chicken ×2", reason: "Late delivery", resolution: "Under review", date: "1 week ago", status: "UNDER REVIEW" },
] as const;

const RIDERS_LINKED = [
  { initial: "T", name: "Tochukwu Eze", delaysShort: "2 delays", delaysFull: "2 late-delivery complaints this month", severe: true },
  { initial: "K", name: "Kelechi Obi", delaysShort: "1 delay", delaysFull: "1 late-delivery complaint this month", severe: false },
];

const STATUS_STYLES: Record<string, string> = {
  RESOLVED: "bg-success-bg text-success",
  "UNDER REVIEW": "bg-warning/15 text-warning",
  CLOSED: "bg-admin-danger text-admin-nav-active",
};

export default function AdminFeedbackPage() {
  return (
    <div>
      <div className="sticky top-0 z-10 flex h-16 items-center border-b border-border bg-bg px-5 lg:px-7">
        <h1 className="text-[18px] font-extrabold text-heading">Feedback</h1>
      </div>

      <div className="mx-auto max-w-2xl p-5 lg:max-w-none lg:p-7">
        <div className="mb-[18px] grid grid-cols-3 gap-2.5 lg:mb-5 lg:gap-3.5">
          <StatCard label="Complaints" labelLong="Total complaints this month" value="18" />
          <StatCard label="Resolved" labelLong="Resolution rate" value="94%" valueClass="text-success" />
          <StatCard label="Top issue dish" labelLong="Most-complained dish" value="Garlic Fried Rice" small />
        </div>

        {/* Mobile: card list */}
        <div className="lg:hidden">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">Complaints</p>
          <div className="mb-[22px] flex flex-col gap-2.5">
            {COMPLAINTS.map((c) => (
              <div key={c.orderId + c.customer} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-heading">{c.customer}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                </div>
                <div className="text-[11.5px] text-body">{c.orderId} · {c.dish}</div>
                <div className="text-[11px] text-muted">{c.reason} · {c.date}</div>
                <div className="mt-0.5 text-[12px] font-bold text-heading">{c.resolution}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: table */}
        <div className="mb-5 hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1.4fr_1fr_1fr_1fr] border-b border-border bg-admin-row-hover px-[18px] py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Customer</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Order</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Dish</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Reason</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Resolution</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Date</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Status</span>
          </div>
          {COMPLAINTS.map((c) => (
            <Link
              key={c.orderId + c.customer}
              href="/admin/dashboard?tab=orders"
              className="grid grid-cols-[1.2fr_1fr_1.2fr_1.4fr_1fr_1fr_1fr] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover"
            >
              <span className="text-[12.5px] font-bold text-heading">{c.customer}</span>
              <span className="text-[12px] text-body">{c.orderId}</span>
              <span className="text-[12px] text-body">{c.dish}</span>
              <span className="text-[12px] text-muted">{c.reason}</span>
              <span className="text-[12.5px] font-bold text-heading">{c.resolution}</span>
              <span className="text-[11.5px] text-muted">{c.date}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[10.5px] font-bold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
            </Link>
          ))}
        </div>

        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted lg:hidden">Riders linked to delays</p>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5 lg:gap-2.5 lg:p-[18px]">
          <h3 className="hidden text-[13.5px] font-bold text-heading lg:block lg:mb-1">Riders linked to delivery delays</h3>
          {RIDERS_LINKED.map((r, i) => (
            <div key={r.name} className={`flex items-center justify-between ${i < RIDERS_LINKED.length - 1 ? "border-b border-admin-row-border pb-2.5" : ""}`}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-border text-[11.5px] font-extrabold text-body">{r.initial}</span>
                <span className="text-[12.5px] font-bold text-heading">{r.name}</span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold lg:px-[10px] lg:py-1 ${r.severe ? "bg-admin-danger text-admin-nav-active" : "bg-warning/15 text-warning"}`}>
                <span className="lg:hidden">{r.delaysShort}</span>
                <span className="hidden lg:inline">{r.delaysFull}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, labelLong, value, valueClass, small }: { label: string; labelLong: string; value: string; valueClass?: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 lg:p-[18px]">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-muted lg:mb-[9px] lg:text-[11px]">
        <span className="lg:hidden">{label}</span>
        <span className="hidden lg:inline">{labelLong}</span>
      </p>
      <p className={`font-extrabold tabular-nums ${small ? "text-[12.5px] leading-[1.2] lg:text-[20px]" : "text-[19px] lg:text-[24px]"} ${valueClass ?? "text-heading"}`}>{value}</p>
    </div>
  );
}
