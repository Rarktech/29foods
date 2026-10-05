"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";

/**
 * Who's being ordered for right now. Once there's a second person it's a row of chips —
 * the highlighted one is where every "+" and "Add" goes until you switch — and when
 * ordering solo it shrinks to a single "Ordering for friends too?" row. Used on Home
 * (sticky above the menu) and on the item page next to the Add button.
 */
export function OrderingForBar({ compact = false }: { compact?: boolean }) {
  const { baskets, lines, activeBasketId, setActiveBasket, addBasket } = useCart();
  const [promptOpen, setPromptOpen] = useState(false);

  const countFor = (basketId: string) => lines.filter((l) => l.basketId === basketId).reduce((n, l) => n + l.qty, 0);

  return (
    <>
      {baskets.length < 2 ? (
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          className={`flex w-full items-center gap-2 text-left ${compact ? "py-1" : "rounded-[14px] border border-dashed px-3.5 py-2.5"}`}
          style={compact ? undefined : { borderColor: "var(--muted-border-strong)" }}
        >
          <PeopleIcon />
          <span className="flex-grow text-[12.5px] font-semibold text-body">Ordering for friends too?</span>
          <span className="shrink-0 text-[12.5px] font-bold text-accent">+ Add a person</span>
        </button>
      ) : (
        <div>
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted">Ordering for</div>
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {baskets.map((basket) => {
              const active = basket.id === activeBasketId;
              const count = countFor(basket.id);
              return (
                <button
                  key={basket.id}
                  type="button"
                  onClick={() => setActiveBasket(basket.id)}
                  aria-pressed={active}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold"
                  style={{
                    background: active ? "rgb(var(--color-accent))" : "rgb(var(--color-card))",
                    color: active ? "#FFFFFF" : "rgb(var(--color-heading))",
                    border: active ? "1.5px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--color-border))",
                  }}
                >
                  <span className="max-w-[110px] truncate">{basket.label || "Unnamed"}</span>
                  {count > 0 && (
                    <span
                      className="rounded-full px-1.5 text-[10.5px] font-extrabold"
                      style={{ background: active ? "rgba(255,255,255,0.25)" : "rgb(var(--color-accent-tint))", color: active ? "#FFFFFF" : "rgb(var(--color-accent))" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPromptOpen(true)}
              className="shrink-0 rounded-full border-[1.5px] border-dashed px-3.5 py-2 text-[12.5px] font-bold text-body"
              style={{ borderColor: "var(--muted-border-strong)" }}
            >
              + Person
            </button>
          </div>
        </div>
      )}

      <PersonNameSheet open={promptOpen} onClose={() => setPromptOpen(false)} onSave={(name) => addBasket(name)} />
    </>
  );
}

/** "Who's this pack for?" — names a new person's basket (it becomes the active one). */
export function PersonNameSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    // Focus after the sheet mounts so the keyboard opens straight away on phones.
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const trimmed = name.trim();
  const save = () => {
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[430px] rounded-t-[24px] bg-card p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 -8px 28px rgba(0,0,0,0.2)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-1 text-[17px] font-extrabold text-heading">Who&rsquo;s this pack for?</h3>
        <p className="mb-4 text-[12.5px] leading-[1.5] text-muted">
          We write their name on their pack. Everything you add next goes into it, and you can switch back anytime.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="e.g. Tolu"
            className="mb-4 w-full rounded-[14px] border-[1.5px] border-border bg-bg px-4 py-3 text-[15px] font-bold text-heading outline-none"
          />
          <button type="submit" disabled={!trimmed} className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {trimmed ? `Start ${trimmed}'s pack` : "Enter a name"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
