"use client";

import { useState, useTransition } from "react";
import { sendBroadcast } from "@/app/admin/(dashboard)/messages/actions";

type Target = "all" | "lodge" | "zone" | "inactive_users" | "meal_plan_subscribers";

export function MessageForm() {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-panel border border-border bg-card p-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's today's special?"
        rows={3}
        className="rounded-xl2 border border-border bg-bg px-4 py-3 text-[13px] text-body"
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <select value={target} onChange={(e) => setTarget(e.target.value as Target)} className="rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-body">
          <option value="all">Everyone</option>
          <option value="lodge">By lodge</option>
          <option value="zone">By zone</option>
          <option value="inactive_users">Inactive (14+ days)</option>
          <option value="meal_plan_subscribers">Meal plan subscribers</option>
        </select>
        {(target === "lodge" || target === "zone") && (
          <input
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={target === "lodge" ? "e.g. Peace Lodge" : "e.g. presco_core"}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-body"
          />
        )}
        <button type="submit" disabled={pending} className="ml-auto rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
      {result && <p className="text-[12.5px] font-semibold text-success">{result}</p>}
    </form>
  );
}
