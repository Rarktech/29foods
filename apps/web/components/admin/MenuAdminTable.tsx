"use client";

import { useState, useTransition } from "react";
import { formatKobo } from "@/lib/format";
import { updateMenuItem, updateStock, createMenuItem } from "@/app/admin/menu/actions";

const CATEGORIES = ["rice", "protein", "drink", "snack", "swallow"] as const;
type Category = (typeof CATEGORIES)[number];

interface MenuRow {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  stockCount: number;
  lowStockThreshold: number;
}

export function MenuAdminTable({ items }: { items: MenuRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-panel border border-border bg-card">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-bg text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price (₦)</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <MenuRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-6 text-center text-muted">No menu items yet.</p>}
      </div>

      <AddItemForm />
    </div>
  );
}

function MenuRow({ item }: { item: MenuRow }) {
  const [price, setPrice] = useState((item.price / 100).toString());
  const [stock, setStock] = useState(item.stockCount.toString());
  const [available, setAvailable] = useState(item.isAvailable);
  const [pending, startTransition] = useTransition();

  const lowStock = item.stockCount > 0 && item.stockCount <= item.lowStockThreshold;

  return (
    <tr className={pending ? "opacity-60" : ""}>
      <td className="px-4 py-3 font-semibold text-heading">{item.name}</td>
      <td className="px-4 py-3 capitalize text-muted">{item.category}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const naira = Number(price);
            if (Number.isNaN(naira) || naira < 0) return;
            startTransition(() => updateMenuItem(item.id, { price: Math.round(naira * 100) }));
          }}
          className="w-24 rounded-lg border border-border bg-bg px-2 py-1 text-body"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onBlur={() => {
            const count = Number(stock);
            if (Number.isNaN(count)) return;
            startTransition(() => updateStock(item.id, count));
          }}
          className={`w-20 rounded-lg border bg-bg px-2 py-1 text-body ${lowStock ? "border-warning" : "border-border"}`}
        />
        {lowStock && <span className="ml-2 text-[11px] font-semibold text-warning">low</span>}
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => {
            setAvailable(e.target.checked);
            startTransition(() => updateMenuItem(item.id, { is_available: e.target.checked }));
          }}
        />
      </td>
    </tr>
  );
}

function AddItemForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("rice");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("20");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const naira = Number(price);
    const stockCount = Number(stock);
    if (!name.trim() || Number.isNaN(naira) || Number.isNaN(stockCount)) return;

    startTransition(async () => {
      await createMenuItem({ name: name.trim(), category, price: Math.round(naira * 100), stockCount });
      setName("");
      setPrice("");
      setStock("20");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-panel border border-dashed border-muted-border-strong p-4">
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-border bg-bg px-3 py-2 text-body" required />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="rounded-lg border border-border bg-bg px-3 py-2 text-body capitalize">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Price (₦)</label>
        <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 rounded-lg border border-border bg-bg px-3 py-2 text-body" required />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-muted">Initial stock</label>
        <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="w-20 rounded-lg border border-border bg-bg px-3 py-2 text-body" />
      </div>
      <button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">
        Add item
      </button>
    </form>
  );
}
