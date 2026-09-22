"use client";

import { useState } from "react";

const AUDIENCES = [
  { id: "all", label: "All customers", reach: 842 },
  { id: "peace_lodge", label: "Peace Lodge", reach: 410 },
  { id: "hilltop_hostel", label: "Hilltop Hostel", reach: 248 },
  { id: "unity_hall", label: "Unity Hall", reach: 184 },
  { id: "meal_plan", label: "Meal plan subscribers", reach: 63 },
] as const;
type AudienceId = (typeof AUDIENCES)[number]["id"];

interface Broadcast {
  id: string;
  audience: string;
  text: string;
  date: string;
  delivered: string;
  opened: string;
}

const SAMPLE_HISTORY: Broadcast[] = [
  { id: "1", audience: "All customers", text: "We've got Party Jollof + Grilled Chicken back on the menu today! Order before 8pm for free delivery within Peace Lodge.", date: "Today, 2:10pm", delivered: "842", opened: "611" },
  { id: "2", audience: "Meal plan subscribers", text: "Your meal plan renews in 3 days. Renew now and get a free drink with your next order.", date: "Yesterday, 9:00am", delivered: "63", opened: "58" },
  { id: "3", audience: "Hilltop Hostel", text: "Heads up — deliveries to Hilltop Hostel may run 10-15 min slower today due to rain. Thanks for your patience!", date: "2 days ago, 5:40pm", delivered: "210", opened: "184" },
  { id: "4", audience: "All customers", text: "New: EXAMWEEK promo code is live — get ₦500 off orders above ₦2,500 all week.", date: "4 days ago, 11:00am", delivered: "836", opened: "702" },
  { id: "5", audience: "Unity Hall", text: "Unity Hall friends — we now deliver till 11pm on weekends. Order your late-night Jollof!", date: "1 week ago, 6:30pm", delivered: "128", opened: "96" },
];

export default function AdminMessagesPage() {
  const [audienceId, setAudienceId] = useState<AudienceId>("all");
  const [message, setMessage] = useState("We've got Party Jollof + Grilled Chicken back on the menu today! Order before 8pm for free delivery within Peace Lodge.");
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState(SAMPLE_HISTORY);

  const audience = AUDIENCES.find((a) => a.id === audienceId)!;

  function confirmSend() {
    setHistory((h) => [
      { id: crypto.randomUUID(), audience: audience.label, text: message, date: "Today, just now", delivered: String(audience.reach), opened: String(Math.round(audience.reach * (0.7 + Math.random() * 0.1))) },
      ...h,
    ]);
    setModalOpen(false);
    setMessage("");
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex h-16 items-center border-b border-border bg-bg px-5 lg:px-7">
        <h1 className="text-[18px] font-extrabold text-heading">Messages</h1>
      </div>

      <div className="mx-auto max-w-2xl p-5 lg:max-w-none lg:p-7">
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 lg:p-5">
          <h3 className="mb-3.5 text-[13.5px] font-bold text-heading lg:text-[14px]">Compose broadcast</h3>
          <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto pb-0.5 lg:mb-3">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAudienceId(a.id)}
                className={`shrink-0 rounded-full px-3.5 py-[7px] text-[12px] font-bold ${audienceId === a.id ? "bg-heading text-bg" : "bg-admin-row-hover font-semibold text-body"}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="What's today's special?"
            className="mb-3.5 w-full resize-none rounded-xl2 border border-border bg-admin-row-hover px-3.5 py-3 text-[13px] text-heading outline-none"
          />
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11.5px] text-muted">Estimated reach: {audience.reach.toLocaleString("en-NG")} customers</span>
            <button
              onClick={() => setModalOpen(true)}
              disabled={!message.trim()}
              className="flex items-center justify-center gap-1.5 rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white disabled:opacity-45"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
              Send broadcast
            </button>
          </div>
        </div>

        <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.05em] text-muted lg:text-[13px]">Previously sent</p>
        <div className="flex flex-col gap-2.5">
          {history.map((b) => (
            <div key={b.id} className="rounded-[14px] border border-border bg-card p-4 lg:rounded-2xl lg:px-[18px] lg:py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-bold text-admin-nav-active">{b.audience}</span>
                <span className="text-[11.5px] text-muted">{b.date}</span>
              </div>
              <p className="mb-2.5 text-[13px] leading-[1.4] text-heading">{b.text}</p>
              <div className="flex gap-4">
                <span className="text-[11.5px] text-muted"><strong className="font-bold text-heading">{b.delivered}</strong> delivered</span>
                <span className="text-[11.5px] text-muted"><strong className="font-bold text-heading">{b.opened}</strong> opened</span>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="p-6 text-center text-[13px] text-muted">No messages yet.</p>}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-heading">Send broadcast?</h3>
              <button onClick={() => setModalOpen(false)} aria-label="Close" className="flex p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-3.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Audience</p>
              <span className="rounded-full bg-accent-tint px-3 py-[5px] text-[12px] font-bold text-admin-nav-active">{audience.label}</span>
            </div>

            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Message</p>
              <div className="rounded-xl2 border border-border bg-admin-row-hover px-3.5 py-3 text-[13px] leading-[1.4] text-heading">{message}</div>
            </div>

            <div className="mb-5 flex items-start gap-2.5 rounded-xl2 border border-admin-danger-border bg-admin-danger p-3.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
              <span className="text-[12px] leading-[1.4] text-accent">
                This will be sent to ~{audience.reach.toLocaleString("en-NG")} customers in <strong>{audience.label}</strong>. This can&rsquo;t be undone.
              </span>
            </div>

            <div className="flex justify-end gap-2.5">
              <button onClick={() => setModalOpen(false)} className="rounded-[10px] bg-admin-row-hover px-[18px] py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
              <button onClick={confirmSend} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Confirm &amp; send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
