"use client";

import Link from "next/link";
import { ChevronDown, MapPin, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type ApiProduct = components["schemas"]["Product"];
type ApiCategory = components["schemas"]["Category"];

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: string;
  vat: string;
  stock: "In Stock" | "Low Stock" | "Out of Stock";
  visible: boolean;
  locationOverride: "" | "pin" | "tag";
};

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

function stockClass(stock: string) {
  if (stock === "In Stock") return "bg-[#d5f5dc] text-[#2a6b39]";
  if (stock === "Low Stock") return "bg-[#fde8be] text-[#855100]";
  return "bg-[#f8d2d2] text-[#8f2a2a]";
}

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [productsResponse, categoriesResponse] = await Promise.all([
        orderzillaApi.dashboard.products.list(),
        orderzillaApi.dashboard.categories.list(),
      ]);

      const productItems = (productsResponse?.products ?? []) as ApiProduct[];
      setCategories((categoriesResponse?.categories ?? []) as ApiCategory[]);
      setRows(
        productItems.map((item) => ({
          id: item.id ?? crypto.randomUUID(),
          name: item.name ?? "Unnamed product",
          sku: item.sku ?? "N/A",
          category: item.category_name ?? "Uncategorized",
          basePrice: item.base_price ? `$${item.base_price}` : "$0.00",
          vat: item.tax_rate ? `${item.tax_rate}%` : "-",
          stock: item.is_active ? "In Stock" : "Out of Stock",
          visible: item.is_active ?? true,
          locationOverride: "",
        })),
      );
    } catch {
      setError("Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || row.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? row.visible : !row.visible);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [rows, search, categoryFilter, statusFilter]);

  const totalItems = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const allVisibleSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Products</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[#768091]">Location filter</span>
            <SelectMenu
              value="all"
              onChange={() => undefined}
              options={[{ label: "All Locations", value: "all" }]}
              className="min-w-[140px]"
            />
            <SelectMenu
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { label: "All Categories", value: "all" },
                ...categories.map((cat) => ({
                  label: cat.name ?? "Unnamed",
                  value: (cat.name ?? "Unnamed").toLowerCase(),
                })),
              ]}
              className="min-w-[140px]"
            />
            <button
              type="button"
              className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[12px] font-semibold text-[#414855]"
            >
              Import
            </button>
            <button
              type="button"
              className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512]"
            >
              + Add Product
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchProducts} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="h-9 flex-1 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
            <Search size={15} className="text-[#97a0ad]" />
            <input
              placeholder="Search by product name or SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <span className="text-[12px] font-semibold text-[#4e5664] px-1">Status</span>
              <SelectMenu
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "All Statuses", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
                className="min-w-[130px]"
              />
              <button
                type="button"
                className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-3 inline-flex items-center gap-2 text-[12px] font-medium text-[#424a56]"
              >
                <span>Price range</span>
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-3 inline-flex items-center gap-2 text-[12px] font-medium text-[#424a56]"
              >
                <span>Availability</span>
                <ChevronDown size={13} />
              </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
              className="text-[12px] font-semibold text-[#6385b5] ml-1"
            >
              Reset filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={6} columns={9} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e6ea]">
          <table className="w-full min-w-[980px]">
            <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
              <tr className="text-[13px] text-[#6e7785] text-left">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked
                          ? Array.from(new Set([...prev, ...paginatedRows.map((r) => r.id)]))
                          : prev.filter((id) => !paginatedRows.some((row) => row.id === id)),
                      )
                    }
                    className="h-4 w-4 rounded border-[#cfd5de]"
                  />
                </th>
                <th className="px-2 py-2 font-semibold">Product Name</th>
                <th className="px-2 py-2 font-semibold">Category</th>
                <th className="px-2 py-2 font-semibold">Base Price</th>
                <th className="px-2 py-2 font-semibold">VAT Rate</th>
                <th className="px-2 py-2 font-semibold">Stock Status</th>
                <th className="px-2 py-2 font-semibold">Visibility</th>
                <th className="px-2 py-2 font-semibold">Location Override</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((product, index) => (
                <tr
                  key={product.id}
                  className={`border-b last:border-b-0 border-[#edf0f4] text-[13px] ${
                    index === 1 || index === 3 ? "bg-[#f6f7f9]" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, product.id]
                            : prev.filter((id) => id !== product.id),
                        )
                      }
                      className="h-4 w-4 rounded border-[#cfd5de]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-lg ${
                          index % 2 === 0
                            ? "bg-gradient-to-br from-[#5b3b28] to-[#bb7237]"
                            : "bg-gradient-to-br from-[#6a5a44] to-[#d8b183]"
                        }`}
                      />
                      <div>
                        <Link
                          href={`/dashboard/products/edit-product?id=${product.id}`}
                          className="text-[20px] leading-tight font-bold text-[#1d2430] hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="text-[12px] text-[#7a8291]">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span className="rounded-full bg-[#eceef2] px-2.5 py-1 text-[12px] font-semibold text-[#505864]">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-semibold text-[#2a313d]">{product.basePrice}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{product.vat}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stockClass(
                        product.stock,
                      )}`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Toggle
                      active={product.visible}
                      onToggle={(next) => {
                        setRows((prev) =>
                          prev.map((row) => (row.id === product.id ? { ...row, visible: next } : row)),
                        );
                      }}
                    />
                  </td>
                  <td className="px-2 py-3 text-[#687181]">
                    {product.locationOverride === "pin" && <MapPin size={17} />}
                    {product.locationOverride === "tag" && <Tag size={17} />}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowActionMenu
                      actions={[
                        { label: "Edit product", onClick: () => undefined },
                        {
                          label: product.visible ? "Deactivate" : "Activate",
                          onClick: () => {
                            const next = !product.visible;
                            setRows((prev) =>
                              prev.map((row) =>
                                row.id === product.id ? { ...row, visible: next } : row,
                              ),
                            );
                          },
                        },
                        {
                          label: "Delete product",
                          danger: true,
                          onClick: async () => {
                            setRows((prev) => prev.filter((row) => row.id !== product.id));
                            await orderzillaApi.dashboard.products.remove(product.id);
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-medium text-[#6e7785]">{selectedIds.length} products selected</p>
            <button
              type="button"
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Activate
            </button>
            <button
              type="button"
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Deactivate
            </button>
            <button
              type="button"
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Assign Category
            </button>
            <button
              type="button"
              className="h-9 rounded-lg bg-[#ef4a4c] px-4 text-[12px] font-semibold text-white"
            >
              Delete
            </button>
          </div>

          <div className="text-[12px] text-[#5f6875]">
            Page {currentPage} of {totalPages}
          </div>
        </div>
        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="products"
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

