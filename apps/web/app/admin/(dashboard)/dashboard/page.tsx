import { Suspense } from "react";
import { DashboardTabs } from "@/components/admin/dashboard/DashboardTabs";

export default function AdminDashboardPage() {
  return (
    <Suspense>
      <DashboardTabs />
    </Suspense>
  );
}
