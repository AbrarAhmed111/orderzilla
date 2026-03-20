import { Suspense } from "react";
import CustomersPage from "@/components/dashboard/CustomersPage";

/** List route for /dashboard/customers (breadcrumbs & links from detail/edit pages). */
export default function DashboardCustomersRoute() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <CustomersPage />
    </Suspense>
  );
}
