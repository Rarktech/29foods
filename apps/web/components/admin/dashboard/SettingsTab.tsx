"use client";

import { useState, useTransition } from "react";
import { updateOwnAdminName } from "@/app/admin/(dashboard)/dashboard/actions";
import type { AdminRow } from "./types";

export function SettingsTab({
  admins,
  self,
}: {
  admins: AdminRow[];
  self: { id: string; name: string | null; email: string | null; role: string } | null;
}) {
  const [name, setName] = useState(self?.name ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await updateOwnAdminName(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-panel border border-border bg-card p-5">
        <p className="mb-4 text-[13px] font-bold text-heading">Your profile</p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-body"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Email</label>
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-muted">{self?.email ?? "—"}</p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Role</label>
            <p className="rounded-lg border border-border bg-bg px-3 py-2 capitalize text-muted">{self?.role ?? "—"}</p>
          </div>
          <button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">
            Save
          </button>
          {saved && <span className="text-[12px] font-semibold text-success">Saved.</span>}
        </form>
      </div>

      <div className="rounded-panel border border-border bg-card p-5">
        <p className="mb-4 text-[13px] font-bold text-heading">Admin team</p>
        <div className="flex flex-col divide-y divide-border">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2.5">
              <span className="text-[13px] font-semibold text-heading">{a.name ?? "Unnamed"}</span>
              <span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-bold capitalize text-muted">{a.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
