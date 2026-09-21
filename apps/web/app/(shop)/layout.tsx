import { CartProvider } from "@/lib/cart-context";
import { ShopShell } from "@/components/shop/ShopShell";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ShopShell>{children}</ShopShell>
    </CartProvider>
  );
}
