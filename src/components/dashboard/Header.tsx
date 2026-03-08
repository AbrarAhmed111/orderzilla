"use client";

import { CalendarDays, ChevronDown, MapPin } from "lucide-react";

function FilterButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-3 inline-flex items-center gap-2 text-[13px] text-[#4e5561]"
    >
      {icon}
      <span>{label}</span>
      <ChevronDown size={14} />
    </button>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-20 h-[68px] flex items-center justify-between px-6 border-b border-[#e6e7ea] bg-[#f7f8fa]">
      <h2 className="text-[34px] leading-none font-extrabold text-[#1a1f27]">
        Dashboard
      </h2>
      <div className="flex items-center gap-2">
        <FilterButton icon={<CalendarDays size={14} />} label="Today" />
        <FilterButton icon={<MapPin size={14} />} label="All Locations" />
      </div>
    </header>
  );
}

