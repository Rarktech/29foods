"use client";

import { useState, useTransition } from "react";
import { createRider, updateRiderStatus } from "@/app/admin/(dashboard)/riders/actions";

const STATUS_OPTIONS = ["at_base", "heading_back", "out_delivering", "offline"] as const;
type CycleStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<string, string> = {
  at_base: "bg-success-bg text-success",
  heading_back: "bg-warning/15 text-warning",
  out_delivering: "bg-accent-tint text-accent",
  offline: "bg-bg text-muted",
};

interface RiderRow {
  id: string;
  name: string;
  phone: string | null;
  cycleStatus: string;
  assignedBike: string | null;
  deliveries: number;
}

export function RidersView({ riders }: { riders: RiderRow[] }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-[20px] font-extrabold text-heading">Riders</h1>
        <p className="mt-1 text-[13px] text-muted">{riders.length} on the team, {riders.filter((r) => r.cycleStatus !== "offline").length} active now.</p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-panel border border-border bg-card">
        {riders.map((r) => (
          <RiderRow key={r.id} rider={r} />
        ))}
        {riders.length === 0 && <p className="p-6 text-center text-[13px] text-muted">No riders yet.</p>}
      </div>

      <AddRiderForm />
    </div>
  );
}

function RiderRow({ rider }: { rider: RiderRow }) {
  const [status, setStatus] = useState<CycleStatus>(rider.cycleStatus as CycleStatus);
  const [pending, startTransition] = useTransition();

  return (
    <div className={`flex items-center justify-between gap-4 p-4 ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-heading">{rider.name}</p>
        <p className="mt-0.5 text-[12px] text-muted">
          {rider.phone ?? "No phone"}
          {rider.assignedBike ? ` · ${rider.assignedBike}` : ""} · {rider.deliveries} delivered
        </p>
      </div>
      <select
        value={status}
        onChange={(e) => {
          const next = e.target.value as CycleStatus;
          setStatus(next);
          startTransition(() => updateRiderStatus(rider.id, next));
        }}
        className={`shrink-0 rounded-full border-0 px-3 py-1.5 text-[11px] font-bold capitalize ${STATUS_STYLES[status]}`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddRiderForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bike, setBike] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createRider({ name: name.trim(), phone: phone.trim() || null, assignedBike: bike.trim() || null });
      setName("");
      setPhone("");
      setBike("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-panel border border-dashed border-muted-border-strong p-4">
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-bg px-3 py-2 text-body" required />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-border bg-bg px-3 py-2 text-body" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Bike</label>
        <input value={bike} onChange={(e) => setBike(e.target.value)} className="rounded-lg border border-border bg-bg px-3 py-2 text-body" />
      </div>
      <button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">
        Add rider
      </button>
    </form>
  );
}
