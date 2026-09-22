"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/shop/ThemeToggle";
import { OverviewTab } from "./OverviewTab";
import { OrdersTab } from "./OrdersTab";
import { MenuTab } from "./MenuTab";
import { CustomersTab } from "./CustomersTab";
import { SettingsTab } from "./SettingsTab";
import { AddItemModal, AddComboModal, AddAddonModal, AddCustomerModal, DiscountModal } from "./modals";
import {
  ADDON_BASE,
  applyDiscount,
  COMBO_BASE,
  DISH_SECTIONS_BASE,
  discountBadgeLabel,
  formatNaira,
  ORDERS_RAW,
  SUBSCRIBERS_RAW,
} from "./sampleData";
import type { DishDiscount } from "./types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "menu", label: "Menu" },
  { id: "customers", label: "Customers" },
  { id: "settings", label: "Settings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const DEFAULT_AVAILABILITY: Record<string, boolean> = {
  jollof: true, native: true, ofada: true, garlic: false,
  chicken: true, peppered: true, assortedMeat: true,
  poundedYamEgusi: true, semoOgbono: true,
  fanta: true, zobo: true, chapman: false,
  comboJollofChickenDrink: true, comboStudentSpecial: true, comboSwallowDuo: true, comboOfadaAssorted: false,
  addonExtraProtein: true, addonExtraPlantain: true, addonExtraSauce: true, addonBottledWater: true,
};
const DEFAULT_DISCOUNTS: Record<string, DishDiscount> = {
  native: { type: "percent", value: 15, ends: "Today 9pm" },
  peppered: { type: "flat", value: 300, ends: "No end date" },
};

export function DashboardTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabId | null;
  const tab: TabId = urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : "overview";

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addComboModalOpen, setAddComboModalOpen] = useState(false);
  const [addAddonModalOpen, setAddAddonModalOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountTargetId, setDiscountTargetId] = useState<string | null>(null);
  const [discountDraftType, setDiscountDraftType] = useState<"percent" | "flat">("percent");
  const [menuAvailability, setMenuAvailability] = useState(DEFAULT_AVAILABILITY);
  const [itemDiscounts, setItemDiscounts] = useState(DEFAULT_DISCOUNTS);

  function selectTab(id: TabId) {
    setSelectedOrderId(null);
    router.replace(`/admin/dashboard?tab=${id}`, { scroll: false });
  }

  function toggleMenuItem(id: string) {
    setMenuAvailability((s) => ({ ...s, [id]: !s[id] }));
  }
  function openDiscountModal(id: string) {
    const existing = itemDiscounts[id];
    setDiscountTargetId(id);
    setDiscountDraftType(existing ? existing.type : "percent");
    setDiscountModalOpen(true);
  }
  function closeDiscountModal() {
    setDiscountModalOpen(false);
    setDiscountTargetId(null);
  }
  function removeDiscount() {
    if (!discountTargetId) return;
    setItemDiscounts((s) => {
      const next = { ...s };
      delete next[discountTargetId];
      return next;
    });
    closeDiscountModal();
  }

  const dishSections = useMemo(
    () =>
      DISH_SECTIONS_BASE.map((sec) => ({
        sectionTitle: sec.sectionTitle,
        count: sec.items.length,
        items: sec.items.map((m) => {
          const available = menuAvailability[m.id] ?? false;
          const discount = itemDiscounts[m.id];
          const hasDiscount = !!discount;
          return {
            ...m,
            available,
            imgFilter: available ? "none" : "grayscale(1)",
            hasDiscount,
            discountBadge: hasDiscount ? discountBadgeLabel(discount) : "",
            discountedPrice: hasDiscount ? formatNaira(applyDiscount(m.price, discount)) : m.price,
          };
        }),
      })),
    [menuAvailability, itemDiscounts],
  );
  const menuCount = dishSections.reduce((n, s) => n + s.items.length, 0);
  const allDishItems = dishSections.flatMap((s) => s.items);

  const combos = useMemo(
    () =>
      COMBO_BASE.map((c) => {
        const available = menuAvailability[c.id] ?? false;
        const discount = itemDiscounts[c.id];
        const hasDiscount = !!discount;
        return {
          ...c,
          available,
          imgFilter: available ? "none" : "grayscale(1)",
          hasDiscount,
          discountBadge: hasDiscount ? discountBadgeLabel(discount) : "",
          displayPrice: hasDiscount ? formatNaira(applyDiscount(c.comboPrice, discount)) : c.comboPrice,
        };
      }),
    [menuAvailability, itemDiscounts],
  );
  const allDiscountable = [...allDishItems.map((i) => ({ id: i.id, name: i.name })), ...combos.map((c) => ({ id: c.id, name: c.name }))];

  const addons = useMemo(
    () => ADDON_BASE.map((a) => ({ ...a, available: menuAvailability[a.id] ?? false })),
    [menuAvailability],
  );

  const liveOrders = ORDERS_RAW.map((o) => ({ ...o, open: () => setSelectedOrderId(o.id) }));
  const selectedOrder = selectedOrderId ? ORDERS_RAW.find((o) => o.id === selectedOrderId) ?? null : null;

  const discountTarget = discountTargetId ? allDiscountable.find((d) => d.id === discountTargetId) ?? null : null;
  const existingDiscount = discountTargetId ? itemDiscounts[discountTargetId] : undefined;

  const MOBILE_TABS = TABS.filter((t) => t.id !== "settings");

  return (
    <div>
      {/* Desktop top bar: search + notifications + theme toggle, matching AdminDashboardWebDark exactly */}
      <div className="sticky top-0 z-10 hidden h-16 items-center justify-between border-b border-border bg-bg px-7 lg:flex">
        <h1 className="text-[18px] font-extrabold text-heading">{TABS.find((t) => t.id === tab)!.label}</h1>
        <div className="flex items-center gap-3">
          <div className="flex w-60 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 py-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <span className="text-[12.5px] text-muted">Search orders, customers...</span>
          </div>
          <ThemeToggle />
          <button aria-label="Notifications" className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-border bg-card">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full bg-accent ring-2 ring-card" />
          </button>
        </div>
      </div>

      {/* Mobile section pills — no Settings pill here; it stays reachable via the drawer nav */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-5 pb-3.5 pt-1 lg:hidden">
        {MOBILE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-[12.5px] transition-colors ${
              tab === t.id ? "border-transparent bg-heading font-bold text-bg" : "border-border bg-card font-semibold text-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 lg:p-7">
      {tab === "overview" && <OverviewTab />}
      {tab === "orders" && <OrdersTab liveOrders={liveOrders} selectedOrder={selectedOrder} closeOrder={() => setSelectedOrderId(null)} />}
      {tab === "menu" && (
        <MenuTab
          dishSections={dishSections}
          menuCount={menuCount}
          combos={combos}
          addons={addons}
          onToggle={toggleMenuItem}
          onOpenDiscount={openDiscountModal}
          onOpenAddItem={() => setAddItemModalOpen(true)}
          onOpenAddCombo={() => setAddComboModalOpen(true)}
          onOpenAddAddon={() => setAddAddonModalOpen(true)}
        />
      )}
      {tab === "customers" && (
        <CustomersTab
          subscribers={SUBSCRIBERS_RAW}
          onOpenAddCustomer={() => setAddCustomerModalOpen(true)}
        />
      )}
      {tab === "settings" && <SettingsTab />}
      </div>

      {addItemModalOpen && <AddItemModal onClose={() => setAddItemModalOpen(false)} />}
      {addComboModalOpen && <AddComboModal onClose={() => setAddComboModalOpen(false)} />}
      {addAddonModalOpen && <AddAddonModal onClose={() => setAddAddonModalOpen(false)} />}
      {addCustomerModalOpen && <AddCustomerModal onClose={() => setAddCustomerModalOpen(false)} />}
      {discountModalOpen && (
        <DiscountModal
          itemName={discountTarget?.name ?? ""}
          draftType={discountDraftType}
          setDraftType={setDiscountDraftType}
          existingValue={existingDiscount?.value}
          onRemove={removeDiscount}
          onClose={closeDiscountModal}
          onSave={closeDiscountModal}
        />
      )}
    </div>
  );
}
