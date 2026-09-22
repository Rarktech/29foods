"use client";

import { useState } from "react";
import { RECIPES } from "@/components/admin/recipes/data";

interface DishListItem {
  id: string;
  name: string;
  documented: boolean;
  yieldLabel: string;
  costLabel: string;
  statusLabel: string;
  isSelected: boolean;
  imgFilter: string;
}

function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}
function parseNaira(s: string) {
  return Number(s.replace(/[₦,]/g, ""));
}

export default function AdminRecipesPage() {
  const [selectedId, setSelectedId] = useState("jollof");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("edit");

  const dishes = RECIPES.map((r) => {
    const batchCost = r.lines.reduce((n, l) => n + l.cost, 0);
    const perPortion = r.documented && r.yield ? batchCost / r.yield : 0;
    const isSelected = r.id === selectedId;
    return {
      id: r.id,
      name: r.name,
      documented: r.documented,
      yieldLabel: r.documented ? r.yield + " portions" : "No yield set",
      costLabel: r.documented ? naira(perPortion) + " / portion" : "Cost unknown",
      statusLabel: r.documented ? "Documented" : "Not documented yet",
      isSelected,
      imgFilter: r.documented ? "none" : "grayscale(0.85)",
    };
  });

  const documentedCount = RECIPES.filter((r) => r.documented).length;
  const undocumentedCount = RECIPES.length - documentedCount;

  const sel = RECIPES.find((r) => r.id === selectedId) ?? RECIPES[0]!;
  const selBatchCost = sel.lines.reduce((n, l) => n + l.cost, 0);
  const selPerPortion = sel.documented && sel.yield ? selBatchCost / sel.yield : 0;
  const selPrice = parseNaira(sel.price);
  const foodCostPct = selPrice > 0 && selPerPortion > 0 ? Math.round((selPerPortion / selPrice) * 100) : 0;
  const detailLines = sel.lines.map((l) => ({ ...l, share: Math.round((l.cost / (selBatchCost || 1)) * 100) }));

  function selectDish(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
  }

  const undocumentedNotice =
    undocumentedCount === 1
      ? "1 dish has no recipe on file, so its cost per portion and food-cost % are estimates only."
      : `${undocumentedCount} dishes have no recipe on file, so their cost per portion and food-cost % are estimates only.`;
  const costingNote =
    "Cost per portion is worked out from the ingredient lines below, priced at the unit costs held in Inventory. Only documented recipes feed the food-cost % on Reports — an undocumented dish is a hole in your margin figures.";

  return (
    <div className="flex h-full flex-col">
      {/* Mobile list view */}
      <div className={`flex min-h-0 flex-1 flex-col lg:hidden ${mobileDetail ? "hidden" : ""}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <h1 className="text-[18px] font-extrabold text-heading">Recipes</h1>
          <button onClick={() => { setModalMode("add"); setModalOpen(true); }} className="flex items-center gap-1.5 rounded-full bg-heading px-3 py-2 text-[11.5px] font-bold text-bg">
            <PlusIcon /> Add
          </button>
        </div>
        <div className="scrollbar-none flex-1 overflow-y-auto p-5">
          <p className="mb-3 text-[11.5px] font-bold text-muted">{RECIPES.length} dishes · {documentedCount} documented · {undocumentedCount} still to write up</p>
          {undocumentedCount > 0 && <UndocumentedNotice text={undocumentedNotice} />}
          <DishList dishes={dishes} onSelect={selectDish} />
          <CostingNote text={costingNote} />
        </div>
      </div>

      {/* Mobile detail view */}
      {mobileDetail && (
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
            <button onClick={() => setMobileDetail(false)} aria-label="Back" className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-card">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="flex-1 truncate text-[16.5px] font-extrabold text-heading">{sel.name}</h1>
            {sel.documented && (
              <button onClick={() => { setModalMode("edit"); setModalOpen(true); }} className="shrink-0 rounded-full border border-border px-3.5 py-[7px] text-[11.5px] font-bold text-body">
                Edit
              </button>
            )}
          </div>
          <div className="scrollbar-none flex-1 overflow-y-auto p-5">
            <RecipeDetail sel={sel} selPrice={sel.price} selBatchCost={selBatchCost} selPerPortion={selPerPortion} foodCostPct={foodCostPct} detailLines={detailLines} costingNote={costingNote} onDocument={() => { setModalMode("add"); setModalOpen(true); }} compact />
          </div>
        </div>
      )}

      {/* Desktop master-detail */}
      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-7">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-extrabold text-heading">Recipes</h1>
            <span className="text-[12px] font-bold text-muted">{RECIPES.length} dishes · {documentedCount} documented</span>
          </div>
          <button onClick={() => { setModalMode("add"); setModalOpen(true); }} className="flex items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg">
            <PlusIcon /> Add recipe
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="scrollbar-none w-[336px] shrink-0 overflow-y-auto border-r border-border p-[18px]">
            {undocumentedCount > 0 && <UndocumentedNotice text={undocumentedNotice} />}
            <DishList dishes={dishes} onSelect={setSelectedId} />
          </div>
          <div className="scrollbar-none min-w-0 flex-1 overflow-y-auto">
            <div className="p-7">
              <div className="mb-5 flex items-center gap-3.5">
                <div className="h-[58px] w-[58px] shrink-0 rounded-2xl bg-bg" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[19px] font-extrabold text-heading">{sel.name}</h2>
                  <p className="mt-0.5 text-[12px] text-muted">Menu price {sel.price}</p>
                </div>
                {sel.documented && (
                  <button onClick={() => { setModalMode("edit"); setModalOpen(true); }} className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2.5 text-[12px] font-bold text-body">
                    <EditIcon /> Edit recipe
                  </button>
                )}
              </div>
              <RecipeDetail sel={sel} selPrice={sel.price} selBatchCost={selBatchCost} selPerPortion={selPerPortion} foodCostPct={foodCostPct} detailLines={detailLines} costingNote={costingNote} onDocument={() => { setModalMode("add"); setModalOpen(true); }} />
            </div>
          </div>
        </div>
      </div>

      {modalOpen && <RecipeModal mode={modalMode} recipe={modalMode === "edit" ? sel : undefined} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function DishList({ dishes, onSelect }: { dishes: DishListItem[]; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {dishes.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3 text-left ${d.isSelected ? "border-accent bg-accent-tint" : "border-border bg-card"}`}
        >
          <div className="h-11 w-11 shrink-0 rounded-[11px] bg-bg" style={{ filter: d.imgFilter }} />
          <div className="min-w-0 flex-1">
            <div className={`text-[13px] font-bold ${d.isSelected ? "text-admin-nav-active" : "text-heading"}`}>{d.name}</div>
            <div className="mt-0.5 text-[10.5px] text-muted">{d.yieldLabel} · {d.costLabel}</div>
            <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold ${d.documented ? "bg-success-bg text-success" : "bg-warning/15 text-warning"}`}>{d.statusLabel}</span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      ))}
    </div>
  );
}
function UndocumentedNotice({ text }: { text: string }) {
  return (
    <div className="mb-3.5 flex items-start gap-2 rounded-xl2 border border-border bg-warning/10 p-3">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-warning))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
      <span className="text-[11px] font-semibold leading-[1.5] text-body">{text}</span>
    </div>
  );
}
function CostingNote({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl2 border border-admin-danger-border bg-admin-danger p-3">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--admin-nav-active-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
      <span className="text-[11px] font-semibold leading-[1.55] text-admin-nav-active">{text}</span>
    </div>
  );
}

function RecipeDetail({
  sel,
  selPrice,
  selBatchCost,
  selPerPortion,
  foodCostPct,
  detailLines,
  costingNote,
  onDocument,
  compact,
}: {
  sel: (typeof RECIPES)[number];
  selPrice: string;
  selBatchCost: number;
  selPerPortion: number;
  foodCostPct: number;
  detailLines: { name: string; qty: string; cost: number; share: number }[];
  costingNote: string;
  onDocument: () => void;
  compact?: boolean;
}) {
  if (!sel.documented) {
    return (
      <div className="flex flex-col items-center px-8 py-14 text-center">
        <div className="mb-3.5 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-warning/15">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-warning))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14a4 4 0 1 1 1.6-7.7 4.5 4.5 0 0 1 8.8 0A4 4 0 1 1 18 14" /><path d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" /><path d="M6 17.2h12" /></svg>
        </div>
        <h3 className="mb-1.5 text-[15.5px] font-extrabold text-heading">Not documented yet</h3>
        <p className="mb-[18px] max-w-[380px] text-[12.5px] leading-[1.6] text-muted">
          No recipe has been written up for {sel.name} yet. Until it is, the kitchen is cooking it from memory and its true cost per portion is a guess.
        </p>
        <button onClick={onDocument} className="flex items-center gap-1.5 rounded-xl2 bg-accent px-[18px] py-2.5 text-[13px] font-bold text-white">
          <PlusIcon color="white" /> Document this recipe
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-[52px] w-[52px] shrink-0 rounded-[13px] bg-bg" />
          <div className="min-w-0">
            <div className="text-[12px] text-muted">Menu price</div>
            <div className="mt-0.5 text-[16px] font-extrabold text-heading">{selPrice}</div>
          </div>
        </div>
        <RecipeStatsAndTables sel={sel} selBatchCost={selBatchCost} selPerPortion={selPerPortion} foodCostPct={foodCostPct} detailLines={detailLines} costingNote={costingNote} />
      </>
    );
  }

  return <RecipeStatsAndTables sel={sel} selBatchCost={selBatchCost} selPerPortion={selPerPortion} foodCostPct={foodCostPct} detailLines={detailLines} costingNote={costingNote} />;
}

function RecipeStatsAndTables({
  sel,
  selBatchCost,
  selPerPortion,
  foodCostPct,
  detailLines,
  costingNote,
}: {
  sel: (typeof RECIPES)[number];
  selBatchCost: number;
  selPerPortion: number;
  foodCostPct: number;
  detailLines: { name: string; qty: string; cost: number; share: number }[];
  costingNote: string;
}) {
  const highCost = foodCostPct > 38;
  return (
    <>
      <div className="mb-3 flex gap-2 lg:mb-4 lg:gap-2.5">
        <MiniStat label="Yield" value={`${sel.yield} portions`} />
        <MiniStat label="Prep" value={sel.prep} />
        <MiniStat label="Cook" value={sel.cook} />
      </div>
      <div className="mb-4 flex gap-2 lg:mb-5 lg:gap-2.5">
        <MiniStat label="Batch cost" value={naira(selBatchCost)} />
        <MiniStat label="Cost / portion" value={naira(selPerPortion)} />
        <MiniStat label="Food cost" value={`${foodCostPct}%`} accent={highCost ? "danger" : "success"} />
      </div>

      <h3 className="mb-2.5 text-[13.5px] font-extrabold text-heading">Ingredients per batch</h3>
      <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[1.7fr_0.9fr_0.7fr_0.5fr] border-b border-border bg-admin-row-hover px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted">Ingredient</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted">Quantity</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.04em] text-muted">Cost</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.04em] text-muted">Share</span>
        </div>
        {detailLines.map((l) => (
          <div key={l.name} className="grid grid-cols-[1.7fr_0.9fr_0.7fr_0.5fr] items-center border-b border-admin-row-border px-3.5 py-2.5">
            <span className="pr-2 text-[12.5px] font-semibold text-heading">{l.name}</span>
            <span className="text-[12px] text-body">{l.qty}</span>
            <span className="text-right text-[12px] tabular-nums text-body">{naira(l.cost)}</span>
            <span className="text-right text-[11px] tabular-nums text-muted">{l.share}%</span>
          </div>
        ))}
      </div>

      <h3 className="mb-2.5 text-[13.5px] font-extrabold text-heading">Preparation</h3>
      <div className="mb-5 flex flex-col gap-2.5">
        {sel.steps.map((text, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-accent-tint text-[11px] font-extrabold text-admin-nav-active">{i + 1}</span>
            <span className="text-[12.5px] leading-[1.6] text-body">{text}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-admin-row-hover p-4">
        <div className="mb-2 flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--rating-icon)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M6 14a4 4 0 1 1 1.6-7.7 4.5 4.5 0 0 1 8.8 0A4 4 0 1 1 18 14" /><path d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" /><path d="M6 17.2h12" /></svg>
          <span className="text-[12.5px] font-extrabold text-heading">Chef&rsquo;s notes</span>
        </div>
        <p className="text-[12px] leading-[1.65] text-body">{sel.notes}</p>
      </div>

      <CostingNote text={costingNote} />
    </>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: "danger" | "success" }) {
  return (
    <div className={`flex-1 rounded-xl2 border border-border p-2.5 ${accent === "danger" ? "bg-admin-danger" : accent === "success" ? "bg-success-bg" : "bg-admin-row-hover"}`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.04em] ${accent === "danger" ? "text-admin-nav-active" : accent === "success" ? "text-success" : "text-muted"}`}>{label}</div>
      <div className={`mt-0.5 text-[13px] font-extrabold tabular-nums lg:text-[14.5px] ${accent === "danger" ? "text-admin-nav-active" : accent === "success" ? "text-success" : "text-heading"}`}>{value}</div>
    </div>
  );
}

function RecipeModal({ mode, recipe, onClose }: { mode: "add" | "edit"; recipe?: (typeof RECIPES)[number]; onClose: () => void }) {
  const source = mode === "edit" && recipe?.documented ? recipe : undefined;
  const rows = Array.from({ length: 6 }, (_, i) => source?.lines[i] ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="scrollbar-none w-full max-w-[620px] max-h-[760px] overflow-y-auto rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-[18px] flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold text-heading">{mode === "add" ? "Add recipe" : "Edit recipe"}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mb-5 flex flex-col gap-3.5">
          <Field label="Dish"><TextInput defaultValue={source?.name ?? recipe?.name ?? ""} /></Field>
          <div className="flex gap-3">
            <div className="flex-1"><Field label="Yield (portions)"><TextInput defaultValue={source ? String(source.yield) : "16"} /></Field></div>
            <div className="flex-1"><Field label="Prep time"><TextInput defaultValue={source?.prep ?? "30 min"} /></Field></div>
            <div className="flex-1"><Field label="Cook time"><TextInput defaultValue={source?.cook ?? "55 min"} /></Field></div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Ingredients — quantity per batch</label>
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-[1.6] rounded-[10px] border-[1.5px] border-border bg-admin-input px-3 py-2.5">
                    <input defaultValue={row?.name ?? ""} placeholder={row ? "" : "Add an ingredient"} className="w-full border-none bg-transparent text-[12.5px] text-heading outline-none" />
                  </div>
                  <div className="flex-1 rounded-[10px] border-[1.5px] border-border bg-admin-input px-3 py-2.5">
                    <input defaultValue={row?.qty ?? ""} placeholder={row ? "" : "Quantity per batch"} className="w-full border-none bg-transparent text-[12.5px] text-heading outline-none" />
                  </div>
                  <button aria-label="Remove ingredient" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-bg">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-dashed border-muted-border-strong px-3 py-2 text-[11.5px] font-bold text-body">
              <PlusIcon small /> Add ingredient row
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Preparation steps — one per line, numbered</label>
            <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
              <textarea rows={7} defaultValue={(source?.steps ?? []).map((s, i) => `${i + 1}. ${s}`).join("\n\n")} className="w-full resize-y border-none bg-transparent text-[12.5px] leading-[1.55] text-heading outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Chef&rsquo;s notes</label>
            <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">
              <textarea rows={3} defaultValue={source?.notes ?? "Consistency and seasoning cues for the kitchen — what it should look, smell and taste like when it is right."} className="w-full resize-y border-none bg-transparent text-[12.5px] leading-[1.55] text-heading outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="px-3.5 py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
          <button onClick={onClose} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">{mode === "add" ? "Save recipe" : "Save changes"}</button>
        </div>
      </div>
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
function TextInput({ defaultValue }: { defaultValue: string }) {
  return <input defaultValue={defaultValue} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />;
}

function PlusIcon({ small, color }: { small?: boolean; color?: string }) {
  const s = small ? 12 : 14;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color ?? "currentColor"} strokeWidth={small ? 2.8 : 2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  );
}
