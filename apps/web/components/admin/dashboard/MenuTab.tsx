interface DishItemVM {
  id: string;
  name: string;
  price: string;
  category: string;
  available: boolean;
  imgFilter: string;
  hasDiscount: boolean;
  discountBadge: string;
  discountedPrice: string;
}
interface DishSectionVM {
  sectionTitle: string;
  count: number;
  items: DishItemVM[];
}
interface ComboVM {
  id: string;
  name: string;
  includes: string;
  originalPrice: string;
  comboPrice: string;
  available: boolean;
  imgFilter: string;
  hasDiscount: boolean;
  discountBadge: string;
  displayPrice: string;
}
interface AddonVM {
  id: string;
  name: string;
  price: string;
  available: boolean;
}

export function MenuTab({
  dishSections,
  menuCount,
  combos,
  addons,
  onToggle,
  onOpenDiscount,
  onOpenAddItem,
  onOpenAddCombo,
  onOpenAddAddon,
}: {
  dishSections: DishSectionVM[];
  menuCount: number;
  combos: ComboVM[];
  addons: AddonVM[];
  onToggle: (id: string) => void;
  onOpenDiscount: (id: string) => void;
  onOpenAddItem: () => void;
  onOpenAddCombo: () => void;
  onOpenAddAddon: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted">{menuCount} items</span>
        <button onClick={onOpenAddItem} className="flex items-center gap-1.5 rounded-[10px] bg-heading px-4 py-2.5 text-[12.5px] font-bold text-bg">
          <PlusIcon />
          Add dish
        </button>
      </div>

      {dishSections.map((sec) => (
        <div key={sec.sectionTitle} className="mb-[22px]">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[13.5px] font-extrabold text-heading">{sec.sectionTitle}</h3>
            <span className="text-[11px] font-bold text-muted">{sec.count} items</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[56px_1.5fr_1.1fr_0.8fr_44px_80px] border-b border-border bg-admin-row-hover px-[18px] py-3">
              <span />
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Dish</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Price</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Category</span>
              <span />
              <span className="text-right text-[11px] font-bold uppercase tracking-[0.04em] text-muted">Live</span>
            </div>
            {sec.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[56px_1.5fr_1.1fr_0.8fr_44px_80px] items-center border-b border-admin-row-border px-[18px] py-2.5 transition-colors hover:bg-admin-row-hover">
                <div className="h-9 w-9 rounded-[9px] bg-bg" style={{ filter: item.imgFilter }} />
                <div>
                  <span className={`text-[13px] font-bold ${item.available ? "text-heading" : "text-muted"}`}>{item.name}</span>
                  {item.hasDiscount && (
                    <span className="ml-1.5 inline-block rounded-full bg-accent-tint px-1.5 py-0.5 align-middle text-[9.5px] font-extrabold text-admin-nav-active">{item.discountBadge}</span>
                  )}
                </div>
                <div>
                  {item.hasDiscount ? (
                    <>
                      <span className="mr-1.5 text-[11px] text-muted line-through">{item.price}</span>
                      <span className="text-[12.5px] font-extrabold tabular-nums text-admin-nav-active">{item.discountedPrice}</span>
                    </>
                  ) : (
                    <span className="text-[12.5px] tabular-nums text-body">{item.price}</span>
                  )}
                </div>
                <span className="text-[12px] text-muted">{item.category}</span>
                <button onClick={() => onOpenDiscount(item.id)} aria-label="Discount" title="Discount" className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border">
                  <DiscountIcon active={item.hasDiscount} />
                </button>
                <div className="text-right">
                  <Toggle on={item.available} onClick={() => onToggle(item.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Combos */}
      <div className="mb-[22px]">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-[13.5px] font-extrabold text-heading">Combos</h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-muted">{combos.length} items</span>
            <button onClick={onOpenAddCombo} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-bold text-heading">
              <PlusIcon small />
              Add combo
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {combos.map((combo) => (
            <div key={combo.id} className="flex items-center gap-3.5 border-b border-admin-row-border px-[18px] py-3.5 transition-colors hover:bg-admin-row-hover">
              <div className="h-11 w-11 shrink-0 rounded-[10px] bg-bg" style={{ filter: combo.imgFilter }} />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[13px] font-bold" style={{ color: combo.available ? undefined : "rgb(var(--color-muted))" }}>
                  <span className={combo.available ? "text-heading" : "text-muted"}>{combo.name}</span>
                  {combo.hasDiscount && (
                    <span className="ml-1.5 inline-block rounded-full bg-accent-tint px-1.5 py-0.5 align-middle text-[9.5px] font-extrabold text-admin-nav-active">{combo.discountBadge}</span>
                  )}
                </div>
                <div className="text-[11.5px] text-muted">{combo.includes}</div>
              </div>
              <div className="w-[120px] shrink-0 text-right">
                <div className="text-[11.5px] text-muted line-through">{combo.originalPrice}</div>
                <div className={`text-[14px] font-extrabold tabular-nums ${combo.hasDiscount ? "text-admin-nav-active" : "text-success"}`}>{combo.displayPrice}</div>
              </div>
              <button onClick={() => onOpenDiscount(combo.id)} aria-label="Discount" title="Discount" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-border">
                <DiscountIcon active={combo.hasDiscount} />
              </button>
              <div className="w-20 shrink-0 text-right">
                <Toggle on={combo.available} onClick={() => onToggle(combo.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-[13.5px] font-extrabold text-heading">Add-ons &amp; extras</h3>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-muted">{addons.length} items</span>
            <button onClick={onOpenAddAddon} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-bold text-heading">
              <PlusIcon small />
              Add add-on
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {addons.map((addon) => (
            <div key={addon.id} className="flex items-center gap-3 border-b border-admin-row-border px-[18px] py-2.5">
              <div className="h-[30px] w-[30px] shrink-0 rounded-lg bg-bg" style={{ filter: addon.available ? "none" : "grayscale(1)" }} />
              <span className={`flex-1 text-[12.5px] font-bold ${addon.available ? "text-heading" : "text-muted"}`}>{addon.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-[12px] tabular-nums text-body">{addon.price}</span>
                <Toggle small on={addon.available} onClick={() => onToggle(addon.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, small }: { on: boolean; onClick: () => void; small?: boolean }) {
  const w = small ? 34 : 38;
  const h = small ? 20 : 22;
  const knob = small ? 16 : 18;
  return (
    <button
      onClick={onClick}
      aria-label="Toggle availability"
      className="relative shrink-0 rounded-full p-0"
      style={{ width: w, height: h, background: on ? "rgb(var(--color-success))" : "rgb(var(--color-border))" }}
    >
      <span
        className="absolute top-0.5 left-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform"
        style={{ width: knob, height: knob, transform: on ? `translateX(${w - knob - 4}px)` : "translateX(0)" }}
      />
    </button>
  );
}

function PlusIcon({ small }: { small?: boolean }) {
  const s = small ? 12 : 14;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={small ? 2.8 : 2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}
function DiscountIcon({ active }: { active: boolean }) {
  const color = active ? "var(--admin-nav-active-text)" : "rgb(var(--color-muted))";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
