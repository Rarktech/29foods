import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="flex gap-6 border-b border-neutral-200 bg-white px-6 py-4">
        <Link href="/admin/menu" className="font-semibold">
          29Foods Admin
        </Link>
        <Link href="/admin/menu" className="text-neutral-600 hover:text-neutral-900">
          Menu & Stock
        </Link>
        <Link href="/admin/orders" className="text-neutral-600 hover:text-neutral-900">
          Orders
        </Link>
        <Link href="/admin/broadcasts" className="text-neutral-600 hover:text-neutral-900">
          Broadcasts
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
