"use client";

import { useState, useTransition } from "react";
import { sendBroadcast } from "@/app/admin/broadcasts/actions";

type Target = "all" | "lodge" | "zone" | "inactive_users";

export function BroadcastForm() {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Target>("all");
  const [targetValue, setTargetValue] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    startTransition(async () => {
      const { sentCount } = await sendBroadcast({ message: message.trim(), target, targetValue: targetValue.trim() || undefined });
      setResult(`Sent to ${sentCount} ${sentCount === 1 ? "person" : "people"}.`);
      setMessage("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's today's special?"
        rows={3}
        className="rounded-xl border border-neutral-200 px-4 py-3"
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <select value={target} onChange={(e) => setTarget(e.target.value as Target)} className="rounded-lg border border-neutral-200 px-3 py-2">
          <option value="all">Everyone</option>
          <option value="lodge">By lodge</option>
          <option value="zone">By zone</option>
          <option value="inactive_users">Inactive (14+ days)</option>
        </select>
        {(target === "lodge" || target === "zone") && (
          <input
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={target === "lodge" ? "e.g. Peace Lodge" : "e.g. presco_core"}
            className="rounded-lg border border-neutral-200 px-3 py-2"
          />
        )}
        <button type="submit" disabled={pending} className="ml-auto rounded-full bg-brand-600 px-5 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "Sending…" : "Send broadcast"}
        </button>
      </div>
      {result && <p className="text-sm text-green-700">{result}</p>}
    </form>
  );
}
