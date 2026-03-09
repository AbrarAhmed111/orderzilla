"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import SubpageBackButton from "@/components/dashboard/ui/SubpageBackButton";

type DashboardShellProps = {
  children: ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#1f2631] lg:h-screen flex w-full lg:max-w-[1600px] lg:mx-auto lg:border-x border-[#e6e7ea] bg-[#f7f8fa]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:min-h-0 overflow-hidden pt-14 lg:pt-0">
        <main className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <SubpageBackButton />
          {children}
        </main>
      </div>
    </div>
  );
}
