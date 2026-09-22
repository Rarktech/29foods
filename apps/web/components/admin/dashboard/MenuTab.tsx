import { MenuAdminTable } from "@/components/admin/MenuAdminTable";
import type { MenuRow } from "./types";

export function MenuTab({ items }: { items: MenuRow[] }) {
  return <MenuAdminTable items={items} />;
}
