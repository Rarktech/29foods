"use client";

import Link from "next/link";
import { useState } from "react";
import { PROMOTIONS } from "@/components/admin/promotions/data";

export default function AdminPromotionsPage() {
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");

  const activeCount = PROMOTIONS.filter((p) => p.status === "ACTIVE").length;

  return (
    <div>
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg px-5 lg:px-7">
        <h1 className="text-[18px] font-extrabold text-heading">Promotions</h1>
        <button onClick={() => setPromoModalOpen(true)} className="flex items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>
          Create promo code
        </button>
      </div>

      <div className="p-5 lg:p-7">
        <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 lg:p-[18px]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Active promo codes</p>
            <p className="text-[22px] font-extrabold tabular-nums text-heading lg:text-[24px]">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 lg:p-[18px]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Redemptions this week</p>
            <p className="text-[22px] font-extrabold tabular-nums text-heading lg:text-[24px]">86</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 lg:p-[18px]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Revenue from promos</p>
            <p className="text-[22px] font-extrabold tabular-nums text-success lg:text-[24px]">₦231,400</p>
          </div>
        </div>

        {/* Mobile card list */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          {PROMOTIONS.map((p) => (
            <Link key={p.code} href={`/admin/promotions/${p.code}`} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold tracking-[0.02em] text-heading">{p.code}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${p.statusClass}`}>{p.status}</span>
              </div>
              <div className="mb-0.5 text-[12.5px] font-bold text-accent">{p.discount}</div>
              <div className="flex items-center gap-2.5 text-[11px] text-muted">
                <span className="tabular-nums">{p.uses} / {p.limit} uses</span>
                <span>·</span>
                <span>{p.expiry}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-border bg-admin-row-hover px-[18px] py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Code</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Discount</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Uses / Limit</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Expiry</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Status</span>
          </div>
          {PROMOTIONS.map((p) => (
            <Link key={p.code} href={`/admin/promotions/${p.code}`} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center border-b border-admin-row-border px-[18px] py-3 transition-colors hover:bg-admin-row-hover">
              <span className="text-[13px] font-extrabold tracking-[0.02em] text-heading">{p.code}</span>
              <span className="text-[12.5px] font-bold text-accent">{p.discount}</span>
              <span className="text-[12px] tabular-nums text-body">{p.uses} / {p.limit}</span>
              <span className="text-[12px] text-muted">{p.expiry}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[10.5px] font-bold ${p.statusClass}`}>{p.status}</span>
            </Link>
          ))}
        </div>
      </div>

      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:items-center" onClick={() => setPromoModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-t-[20px] border border-border bg-card p-6 shadow-[0_-12px_32px_rgba(0,0,0,0.2)] lg:rounded-[20px] lg:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-[18px] flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-heading">Create promo code</h3>
              <button onClick={() => setPromoModalOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-5 flex flex-col gap-3.5">
              <Field label="Code"><input defaultValue="STUDENT15" className="w-full border-none bg-transparent text-[13px] font-bold tracking-[0.02em] text-heading outline-none" /></Field>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Discount type</label>
                  <div className="flex rounded-[10px] border border-border bg-bg p-[3px]">
                    <button onClick={() => setDiscountType("percent")} className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-bold ${discountType === "percent" ? "bg-heading text-bg" : "text-muted"}`}>% off</button>
                    <button onClick={() => setDiscountType("flat")} className={`flex-1 rounded-[8px] py-1.5 text-[12px] font-bold ${discountType === "flat" ? "bg-heading text-bg" : "text-muted"}`}>₦ off</button>
                  </div>
                </div>
                <div className="flex-1"><Field label="Value"><input type="number" defaultValue={15} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1"><Field label="Usage limit"><input type="number" defaultValue={200} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
                <div className="flex-1"><Field label="Expiry date"><input defaultValue="2026-10-31" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" /></Field></div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setPromoModalOpen(false)} className="px-3.5 py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
              <button onClick={() => setPromoModalOpen(false)} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Create code</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">{children}</div>
    </div>
  );
}
