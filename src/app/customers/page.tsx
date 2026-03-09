import { Suspense } from "react";
import CustomersPage from "@/components/dashboard/CustomersPage";

export default function CustomersRoute() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <CustomersPage />
    </Suspense>
  );
}

