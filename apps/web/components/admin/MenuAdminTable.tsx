"use client";

import { useState, useTransition } from "react";
import { formatKobo } from "@/lib/format";
import { updateMenuItem, updateStock, createMenuItem } from "@/app/admin/menu/actions";

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
    <div className="flex flex-col gap-8">
      <table className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-500">
          <tr>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Price (₦)</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Available</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {items.map((item) => (
            <MenuRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>

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
      <td className="px-4 py-3 font-medium">{item.name}</td>
      <td className="px-4 py-3 text-neutral-500">{item.category}</td>
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
          className="w-24 rounded-lg border border-neutral-200 px-2 py-1"
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
          className={`w-20 rounded-lg border px-2 py-1 ${lowStock ? "border-amber-400 bg-amber-50" : "border-neutral-200"}`}
        />
        {lowStock && <span className="ml-2 text-xs text-amber-600">low</span>}
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
  const [category, setCategory] = useState<"rice" | "protein" | "drink" | "snack">("rice");
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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-neutral-300 p-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="rounded-lg border border-neutral-200 px-3 py-2">
          <option value="rice">Rice</option>
          <option value="protein">Protein</option>
          <option value="drink">Drink</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Price (₦)</label>
        <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 rounded-lg border border-neutral-200 px-3 py-2" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Initial stock</label>
        <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="w-20 rounded-lg border border-neutral-200 px-3 py-2" />
      </div>
      <button type="submit" disabled={pending} className="rounded-full bg-neutral-900 px-5 py-2 font-medium text-white disabled:opacity-50">
        Add item
      </button>
    </form>
  );
}
