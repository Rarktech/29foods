import { redirect } from "next/navigation";

// Checkout is now part of the Cart screen itself (delivery location + payment
// live there) — this route only exists so old links/bookmarks still land somewhere.
export default function CheckoutPage() {
  redirect("/cart");
}
