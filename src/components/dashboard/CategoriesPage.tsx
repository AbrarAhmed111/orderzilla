"use client";

import Link from "next/link";
import { GripVertical, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type CategoryRow = {
  id: string;
  name: string;
  products: number;
  active: boolean;
  color: string;
};

const colorPresets = [
  "from-[#4f3320] to-[#b56c2f]",
  "from-[#7d4a1a] to-[#f4aa4a]",
  "from-[#8f5d2d] to-[#f4c35a]",
  "from-[#8e512f] to-[#d78c50]",
  "from-[#6e4b43] to-[#d6a79c]",
  "from-[#5f5f5f] to-[#c4c4c4]",
];

function Toggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!active)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        active ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await orderzillaApi.dashboard.categories.list();
      const categories = (response?.categories ?? []) as components["schemas"]["Category"][];
      setRows(
        categories.map((category, index) => ({
          id: category.id ?? crypto.randomUUID(),
          name: category.name ?? "Unnamed category",
          products: category.product_count ?? 0,
          active: category.is_active ?? true,
          color: colorPresets[index % colorPresets.length],
        })),
      );
    } catch {
      setError("Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">
            Categories
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-[#768091]">Location filter</span>
            <SelectMenu
              value="all"
              onChange={() => undefined}
              options={[{ label: "All Locations", value: "all" }]}
              className="min-w-[150px]"
            />
            <Link
              href="/categories/create-category"
              className="h-10 rounded-lg bg-[#d4ff00] px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#1d2512]"
            >
              <Plus size={14} />
              Add Category
            </Link>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchCategories} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={6} columns={4} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#e4e6ea] overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_260px_70px] items-center px-3 py-2 bg-[#f8f9fb] border-b border-[#e9ebef]">
            <span />
            <p className="text-[13px] font-semibold text-[#6f7785]">Category</p>
            <p className="text-[13px] font-semibold text-[#6f7785]">Visibility / Availability</p>
            <p className="text-[13px] font-semibold text-right text-[#6f7785]">Actions</p>
          </div>

          {paginatedRows.map((category, index) => (
            <div
              key={category.id}
              className={`grid grid-cols-[40px_1fr_260px_70px] items-center gap-2 px-3 py-3 ${
                index !== paginatedRows.length - 1 ? "border-b border-[#edf0f4]" : ""
              } ${index === 0 ? "bg-[#f9fafc]" : "bg-white"}`}
            >
              <button type="button" className="text-[#a0a7b2]">
                <GripVertical size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-lg bg-gradient-to-br ${category.color} shadow-inner`}
                />
                <div>
                  <p className="text-[24px] leading-tight font-semibold text-[#1d2430]">
                    {category.name}
                  </p>
                  <p className="text-[12px] text-[#7a8291]">{category.products} products</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Toggle
                  active={category.active}
                  onToggle={async (next) => {
                    setRows((prev) =>
                      prev.map((row) => (row.id === category.id ? { ...row, active: next } : row)),
                    );
                    await orderzillaApi.dashboard.categories.update(category.id, {
                      body: { name: category.name },
                    });
                  }}
                />
                <span
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                    category.active
                      ? "bg-[#dcf5df] text-[#2f6d38]"
                      : "bg-[#eceef2] text-[#6d7684]"
                  }`}
                >
                  {category.active ? "Active" : "Hidden"}
                </span>
              </div>

              <div className="text-right">
                <RowActionMenu
                  actions={[
                    { label: "Edit category", onClick: () => undefined },
                    {
                      label: category.active ? "Hide category" : "Show category",
                      onClick: () =>
                        setRows((prev) =>
                          prev.map((row) =>
                            row.id === category.id ? { ...row, active: !row.active } : row,
                          ),
                        ),
                    },
                    {
                      label: "Delete category",
                      danger: true,
                      onClick: async () => {
                        setRows((prev) => prev.filter((row) => row.id !== category.id));
                        await orderzillaApi.dashboard.categories.remove(category.id);
                      },
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
        )}
        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="categories"
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      </section>
    </div>
  );
}

