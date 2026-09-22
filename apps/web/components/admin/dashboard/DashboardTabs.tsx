"use client";

import { useState } from "react";
import { OverviewTab } from "./OverviewTab";
import { OrdersTab } from "./OrdersTab";
import { MenuTab } from "./MenuTab";
import { CustomersTab } from "./CustomersTab";
import { SettingsTab } from "./SettingsTab";
import type { AdminRow, CustomerRow, MenuRow, OrderRow, OverviewData } from "./types";

const TABS = ["Overview", "Orders", "Menu", "Customers", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function DashboardTabs({
  overview,
  orders,
  menu,
  customers,
  customerCount,
  admins,
  self,
}: {
  overview: OverviewData;
  orders: OrderRow[];
  menu: MenuRow[];
  customers: CustomerRow[];
  customerCount: number;
  admins: AdminRow[];
  self: { id: string; name: string | null; email: string | null; role: string } | null;
}) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-[22px] font-extrabold text-heading">Dashboard</h1>
      <p className="mb-6 text-[13px] text-muted">Everything your team needs to keep Abakaliki fed, on time.</p>

      <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 pb-3 text-[13.5px] font-bold transition-colors ${
              tab === t ? "border-accent text-accent" : "border-transparent text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab data={overview} />}
      {tab === "Orders" && <OrdersTab orders={orders} />}
      {tab === "Menu" && <MenuTab items={menu} />}
      {tab === "Customers" && <CustomersTab customers={customers} total={customerCount} />}
      {tab === "Settings" && <SettingsTab admins={admins} self={self} />}
    </div>
  );
}
