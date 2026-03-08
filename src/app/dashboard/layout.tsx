import { ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import SubpageBackButton from "@/components/dashboard/ui/SubpageBackButton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-[#f4f6f8] text-[#1f2631]">
      <div className="max-w-[1600px] mx-auto h-screen border-x border-[#e6e7ea] bg-[#f7f8fa] flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto overflow-x-auto">
            <SubpageBackButton />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

