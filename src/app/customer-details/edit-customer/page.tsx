import { Suspense } from "react";
import EditCustomerPage from "@/components/dashboard/EditCustomerPage";

export default function EditCustomerStandaloneRoute() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <EditCustomerPage />
    </Suspense>
  );
}

