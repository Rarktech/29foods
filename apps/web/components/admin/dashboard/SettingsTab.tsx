import { BUSINESS_HOURS, DELIVERY_ZONES, STAFF } from "./sampleData";

export function SettingsTab() {
  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3.5 text-[14px] font-bold text-heading">Business hours</h3>
        <div className="flex flex-col gap-2">
          {BUSINESS_HOURS.map((d) => (
            <div key={d.day} className="flex justify-between text-[12.5px]">
              <span className="font-semibold text-body">{d.day}</span>
              <span className="font-bold text-heading">{d.hours}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3.5 text-[14px] font-bold text-heading">Delivery zones</h3>
        <div className="flex flex-col gap-2.5">
          {DELIVERY_ZONES.map((z) => (
            <div key={z.name} className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-heading">{z.name}</span>
              <span className="text-[11.5px] font-bold text-muted">{z.fee}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
        <h3 className="mb-3.5 text-[14px] font-bold text-heading">Staff &amp; roles</h3>
        <div className="flex flex-col gap-2.5">
          {STAFF.map((s) => (
            <div key={s.name} className="flex items-center justify-between border-b border-admin-row-border pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-border text-[11.5px] font-extrabold text-body">{s.initial}</span>
                <span className="text-[12.5px] font-bold text-heading">{s.name}</span>
              </div>
              <span className="rounded-full bg-border px-2.5 py-1 text-[11px] font-bold text-body">{s.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
