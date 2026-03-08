"use client";

import { Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type RowActionMenuProps = {
  actions: Array<{
    label: string;
    onClick: () => void;
    danger?: boolean;
  }>;
};

export default function RowActionMenu({ actions }: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[#808998]"
      >
        <Ellipsis size={18} />
      </button>
      {open && (
        <div className="absolute right-0 z-[9999] mt-1 w-36 rounded-lg border border-[#e4e6ea] bg-white py-1 shadow-md">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-[12px] ${
                action.danger
                  ? "text-[#dc2626] hover:bg-[#fff5f5]"
                  : "text-[#2f3743] hover:bg-[#f6f8fb]"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

