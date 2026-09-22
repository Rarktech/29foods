import type { CustomerRow } from "./types";

export function CustomersTab({ customers, total }: { customers: CustomerRow[]; total: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-panel border border-border bg-card p-4">
        <p className="mb-1 text-[11.5px] font-semibold text-muted">Total customers</p>
        <p className="text-[19px] font-extrabold text-heading">{total}</p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-panel border border-border bg-card">
        {customers.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-heading">{c.name ?? c.email ?? "Unnamed customer"}</p>
              <p className="mt-0.5 truncate text-[12px] text-muted">
                {c.lodge ? `${c.lodge}${c.room ? `, ${c.room}` : ""} · ` : ""}
                {c.loyaltyPoints} pts
              </p>
            </div>
            {c.hasActivePlan && (
              <span className="shrink-0 rounded-full bg-success-bg px-3 py-1 text-[11px] font-bold text-success">
                On plan
              </span>
            )}
          </div>
        ))}
        {customers.length === 0 && <p className="p-6 text-center text-[13px] text-muted">No customers yet.</p>}
      </div>
    </div>
  );
}
