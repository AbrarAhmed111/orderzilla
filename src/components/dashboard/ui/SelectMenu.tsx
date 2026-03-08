"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SelectOption = {
  label: string;
  value: string;
};

type SelectMenuProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  /** When true, dropdown opens upward so options appear above the trigger */
  openAbove?: boolean;
};

export default function SelectMenu({
  value,
  options,
  onChange,
  className,
  openAbove = false,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openAbove || !open) return;
    const closeOnOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [openAbove, open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "";

  if (openAbove) {
    return (
      <div ref={rootRef} className={`relative ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-9 w-full min-w-[130px] rounded-lg border border-[#e4e6ea] bg-white pl-3 pr-8 text-left text-[12px] font-medium text-[#424a56] flex items-center"
        >
          {selectedLabel}
        </button>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#717c8e]"
        />
        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-1 z-[9999] rounded-lg border border-[#e4e6ea] bg-white py-1 shadow-md max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-[12px] font-medium ${
                  option.value === value ? "bg-[#f0f4e8] text-[#1d2512]" : "text-[#424a56] hover:bg-[#f6f8fb]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

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

