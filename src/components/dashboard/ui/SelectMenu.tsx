"use client";

import { ChevronDown } from "lucide-react";

type SelectOption = {
  label: string;
  value: string;
};

type SelectMenuProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
};

export default function SelectMenu({
  value,
  options,
  onChange,
  className,
}: SelectMenuProps) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-[#e4e6ea] bg-white pl-3 pr-8 text-[12px] font-medium text-[#424a56]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#717c8e]"
      />
    </div>
  );
}

