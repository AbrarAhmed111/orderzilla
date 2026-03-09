"use client";

import SelectMenu from "@/components/dashboard/ui/SelectMenu";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label?: string;
};

export default function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  label = "items",
}: TablePaginationProps) {
  return (
    <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] text-[#6e7785]">
        {totalItems} {label}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#5f6875]">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 rounded-lg border border-[#dfe3e8] bg-white px-3 font-semibold disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {Math.max(1, page)} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 rounded-lg border border-[#dfe3e8] bg-white px-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
        <span className="ml-2">Rows per page</span>
        <SelectMenu
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={pageSizeOptions.map((option) => ({ label: String(option), value: String(option) }))}
          className="w-[88px]"
        />
      </div>
    </div>
  );
}

