import { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}

