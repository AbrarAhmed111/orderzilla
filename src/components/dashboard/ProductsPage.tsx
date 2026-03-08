"use client";

import Link from "next/link";
import { MapPin, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
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
  categoryId: string;
  category: string;
  rawTaxRate: number | undefined;
  basePrice: string;
  vat: string;
  stock: "In Stock" | "Out of Stock";
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
  return "bg-[#f8d2d2] text-[#8f2a2a]";
}

type TableResponse = {
  products?: ApiProduct[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
};

export default function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const importRef = useRef<HTMLInputElement | null>(null);

  const initialSearch = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? "all";
  const initialStatus = searchParams.get("status") ?? "all";
  const initialLocation = searchParams.get("location") ?? "all";
  const initialPriceRange = searchParams.get("price_range") ?? "all";
  const initialAvailability = searchParams.get("availability") ?? "all";
  const initialPage = Number(searchParams.get("page") ?? "1");
  const initialLimit = Number(searchParams.get("limit") ?? "20");

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [locations, setLocations] = useState<components["schemas"]["Location"][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [priceRangeFilter, setPriceRangeFilter] = useState(initialPriceRange);
  const [availabilityFilter, setAvailabilityFilter] = useState(initialAvailability);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [pageSize, setPageSize] =
    useState(Number.isFinite(initialLimit) && initialLimit > 0 ? initialLimit : 20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [assignCategoryId, setAssignCategoryId] = useState("all");
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const mapProduct = (item: ApiProduct): ProductRow => ({
    id: item.id ?? crypto.randomUUID(),
    name: item.name ?? "Unnamed product",
    sku: item.sku ?? "N/A",
    categoryId: item.category_id ?? "",
    category: item.category_name ?? "Uncategorized",
    rawTaxRate: item.tax_rate,
    basePrice: item.base_price ? `$${item.base_price}` : "$0.00",
    vat: item.tax_rate ? `${item.tax_rate}%` : "-",
    stock: item.is_active ? "In Stock" : "Out of Stock",
    visible: item.is_active ?? true,
    locationOverride: "",
  });

  const buildTableQuery = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (categoryFilter !== "all") params.set("category_id", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (locationFilter !== "all") params.set("location_id", locationFilter);
    if (priceRangeFilter !== "all") params.set("price_range", priceRangeFilter);
    if (availabilityFilter !== "all") params.set("availability", availabilityFilter);
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    return params;
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [tableResponse, categoriesResponse, locationsResponse] = await Promise.all([
        fetch(`/api/dashboard/products-table?${buildTableQuery().toString()}`, {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
        }).then((res) => res.json() as Promise<TableResponse>),
        orderzillaApi.dashboard.categories.list(),
        orderzillaApi.dashboard.locations.list(),
      ]);

      const productItems = (tableResponse?.products ?? []) as ApiProduct[];
      const pagination = tableResponse?.pagination;
      setRows(productItems.map(mapProduct));
      setCategories((categoriesResponse?.categories ?? []) as ApiCategory[]);
      setLocations((locationsResponse?.locations ?? []) as components["schemas"]["Location"][]);
      setTotalItems(pagination?.total_items ?? productItems.length);
      setTotalPages(pagination?.total_pages ?? 1);
      setPage(pagination?.current_page ?? page);
    } catch {
      setError("Failed to load products.");
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, pageSize, search, categoryFilter, statusFilter, locationFilter, priceRangeFilter, availabilityFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (locationFilter !== "all") params.set("location", locationFilter);
    if (priceRangeFilter !== "all") params.set("price_range", priceRangeFilter);
    if (availabilityFilter !== "all") params.set("availability", availabilityFilter);
    if (page !== 1) params.set("page", String(page));
    if (pageSize !== 20) params.set("limit", String(pageSize));
    const nextQuery = params.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [search, categoryFilter, statusFilter, locationFilter, priceRangeFilter, availabilityFilter, page, pageSize, pathname, router, searchParams]);

  const paginatedRows = useMemo(() => rows, [rows]);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const allVisibleSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id));

  const updateProductsVisibility = async (nextVisible: boolean) => {
    if (selectedIds.length === 0) {
      toast("Select products first.");
      return;
    }
    try {
      setIsBulkActionLoading(true);
      await Promise.all(
        rows
          .filter((row) => selectedIds.includes(row.id))
          .map((row) =>
            orderzillaApi.dashboard.products.update(row.id, {
              body: {
                name: row.name,
                category_id: row.categoryId || undefined,
                sku: row.sku === "N/A" ? undefined : row.sku,
                tax_rate: row.rawTaxRate,
                is_active: nextVisible,
              } as never,
            }),
          ),
      );
      toast.success(`Updated ${selectedIds.length} products.`);
      setSelectedIds([]);
      fetchProducts();
    } catch {
      toast.error("Failed to update products.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const bulkDeleteProducts = async () => {
    if (selectedIds.length === 0) {
      toast("Select products first.");
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.length} selected product(s)?`)) {
      return;
    }
    try {
      setIsBulkActionLoading(true);
      await Promise.all(selectedIds.map((id) => orderzillaApi.dashboard.products.remove(id)));
      toast.success(`Deleted ${selectedIds.length} products.`);
      setSelectedIds([]);
      await fetchProducts();
    } catch {
      toast.error("Failed to delete products.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const deleteSingleProduct = async (id: string) => {
    if (!window.confirm("Delete this product?")) {
      return;
    }
    try {
      setIsBulkActionLoading(true);
      await orderzillaApi.dashboard.products.remove(id);
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      toast.success("Product deleted.");
      await fetchProducts();
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const assignCategory = async () => {
    if (selectedIds.length === 0) {
      toast("Select products first.");
      return;
    }
    if (assignCategoryId === "all") {
      toast.error("Choose a target category.");
      return;
    }
    const targetCategory = categories.find((category) => category.id === assignCategoryId);
    try {
      setIsBulkActionLoading(true);
      await Promise.all(
        rows
          .filter((row) => selectedIds.includes(row.id))
          .map((row) =>
            orderzillaApi.dashboard.products.update(row.id, {
              body: {
                name: row.name,
                category_id: assignCategoryId,
                sku: row.sku === "N/A" ? undefined : row.sku,
                tax_rate: row.rawTaxRate,
                is_active: row.visible,
              } as never,
            }),
          ),
      );
      toast.success(`Assigned ${selectedIds.length} products to ${targetCategory?.name ?? "category"}.`);
      setSelectedIds([]);
      fetchProducts();
    } catch {
      toast.error("Failed to assign category.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const parseCsvLine = (line: string) => line.split(",").map((token) => token.trim());

  const importProducts = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length <= 1) {
        toast.error("CSV file is empty.");
        return;
      }
      const header = parseCsvLine(lines[0]).map((token) => token.toLowerCase());
      const idxName = header.indexOf("name");
      const idxSku = header.indexOf("sku");
      const idxCategoryId = header.indexOf("category_id");
      const idxCategoryName = header.indexOf("category_name");
      const idxTaxRate = header.indexOf("tax_rate");
      if (idxName < 0) {
        toast.error("CSV must include 'name' column.");
        return;
      }

      const categoryByName = new Map(
        categories.map((category) => [(category.name ?? "").toLowerCase(), category.id ?? ""]),
      );

      const payloads = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        const categoryIdRaw = idxCategoryId >= 0 ? cols[idxCategoryId] : "";
        const categoryNameRaw = idxCategoryName >= 0 ? cols[idxCategoryName] : "";
        const resolvedCategoryId =
          categoryIdRaw || categoryByName.get((categoryNameRaw ?? "").toLowerCase()) || undefined;
        const taxRate = idxTaxRate >= 0 ? Number(cols[idxTaxRate]) : undefined;
        return {
          name: (cols[idxName] ?? "").trim(),
          sku: idxSku >= 0 ? cols[idxSku] || undefined : undefined,
          category_id: resolvedCategoryId,
          tax_rate: Number.isFinite(taxRate) ? taxRate : undefined,
        };
      });

      const validPayloads = payloads.filter((payload) => payload.name.length > 0);
      if (validPayloads.length === 0) {
        toast.error("No valid product rows found.");
        return;
      }

      setIsBulkActionLoading(true);
      await Promise.all(
        validPayloads.map((payload) =>
          orderzillaApi.dashboard.products.create({
            body: payload as never,
          }),
        ),
      );
      toast.success(`Imported ${validPayloads.length} products.`);
      fetchProducts();
    } catch {
      toast.error("Failed to import products.");
    } finally {
      setIsBulkActionLoading(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Products</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[#768091]">Location filter</span>
            <SelectMenu
              value={locationFilter}
              onChange={(value) => {
                setLocationFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Locations", value: "all" },
                ...locations.map((location, index) => ({
                  label: location.name ?? "Unnamed location",
                  value: location.id ?? `missing-location-${index}`,
                })),
              ]}
              className="min-w-[140px]"
            />
            <SelectMenu
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Categories", value: "all" },
                ...categories.map((cat, index) => ({
                  label: cat.name ?? "Unnamed",
                  value: cat.id ?? `missing-category-id-${index}`,
                })),
              ]}
              className="min-w-[140px]"
            />
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              disabled={isBulkActionLoading}
              className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[12px] font-semibold text-[#414855]"
            >
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setIsImportModalOpen(false);
                  importProducts(file);
                }
              }}
            />
            <button
              type="button"
              onClick={() => router.push("/dashboard/products/create-product")}
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
              type="search"
              autoComplete="off"
              placeholder="Search by product name or SKU"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <span className="text-[12px] font-semibold text-[#4e5664] px-1">Status</span>
            <SelectMenu
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Statuses", value: "all" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
              className="min-w-[130px]"
            />
            <SelectMenu
              value={priceRangeFilter}
              onChange={(value) => {
                setPriceRangeFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Prices", value: "all" },
                { label: "0 - 10", value: "0-10" },
                { label: "10 - 20", value: "10-20" },
                { label: "20 - 50", value: "20-50" },
                { label: "50+", value: "50+" },
              ]}
              className="min-w-[120px]"
            />
            <SelectMenu
              value={availabilityFilter}
              onChange={(value) => {
                setAvailabilityFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Availability", value: "all" },
                { label: "With Price", value: "with_price" },
                { label: "No Price", value: "no_price" },
              ]}
              className="min-w-[140px]"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
                setLocationFilter("all");
                setPriceRangeFilter("all");
                setAvailabilityFilter("all");
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
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[13px] text-[#717c8e]">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((product, index) => (
                    <tr
                      key={`${product.id}-${index}`}
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
                          onToggle={async (next) => {
                            try {
                              await orderzillaApi.dashboard.products.update(product.id, {
                                body: {
                                  name: product.name,
                                  category_id: product.categoryId || undefined,
                                  sku: product.sku === "N/A" ? undefined : product.sku,
                                  tax_rate: product.rawTaxRate,
                                  is_active: next,
                                } as never,
                              });
                              setRows((prev) =>
                                prev.map((row) =>
                                  row.id === product.id
                                    ? { ...row, visible: next, stock: next ? "In Stock" : "Out of Stock" }
                                    : row,
                                ),
                              );
                              toast.success(`Product ${next ? "activated" : "deactivated"}.`);
                            } catch {
                              toast.error("Failed to update product.");
                            }
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
                            { label: "Edit product", onClick: () => router.push(`/dashboard/products/edit-product?id=${product.id}`) },
                            {
                              label: product.visible ? "Deactivate" : "Activate",
                              onClick: async () => {
                                const next = !product.visible;
                                try {
                                  await orderzillaApi.dashboard.products.update(product.id, {
                                    body: {
                                      name: product.name,
                                      category_id: product.categoryId || undefined,
                                      sku: product.sku === "N/A" ? undefined : product.sku,
                                      tax_rate: product.rawTaxRate,
                                      is_active: next,
                                    } as never,
                                  });
                                  setRows((prev) =>
                                    prev.map((row) =>
                                      row.id === product.id
                                        ? { ...row, visible: next, stock: next ? "In Stock" : "Out of Stock" }
                                        : row,
                                    ),
                                  );
                                  toast.success(`Product ${next ? "activated" : "deactivated"}.`);
                                } catch {
                                  toast.error("Failed to update product.");
                                }
                              },
                            },
                            {
                              label: "Delete product",
                              danger: true,
                              onClick: async () => deleteSingleProduct(product.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-medium text-[#6e7785]">{selectedIds.length} products selected</p>
            <button
              type="button"
              disabled={isBulkActionLoading}
              onClick={() => updateProductsVisibility(true)}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={isBulkActionLoading}
              onClick={() => updateProductsVisibility(false)}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Deactivate
            </button>
            <SelectMenu
              value={assignCategoryId}
              onChange={setAssignCategoryId}
              options={[
                { label: "Select category", value: "all" },
                ...categories.map((cat, index) => ({
                  label: cat.name ?? "Unnamed",
                  value: cat.id ?? `missing-category-id-${index}`,
                })),
              ]}
              className="min-w-[160px]"
            />
            <button
              type="button"
              disabled={isBulkActionLoading}
              onClick={assignCategory}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Assign Category
            </button>
            <button
              type="button"
              onClick={() => router.push("/categories/create-category")}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Create Category
            </button>
            <button
              type="button"
              disabled={isBulkActionLoading}
              onClick={bulkDeleteProducts}
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
          onPageChange={(nextPage) => {
            setSelectedIds([]);
            setPage(nextPage);
          }}
          onPageSizeChange={(nextPageSize) => {
            setSelectedIds([]);
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      </section>

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[640px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Import Products CSV</h2>
            <p className="mt-1 text-[13px] text-[#6e7785]">
              Please make sure your CSV includes the required columns before upload.
            </p>

            <div className="mt-4 rounded-lg border border-[#e4e6ea] bg-[#fafbfc] p-3 text-[13px]">
              <p className="font-semibold text-[#2f3743]">Required</p>
              <p className="mt-1 text-[#4f5a69]">
                <code>name</code>
              </p>
              <p className="mt-3 font-semibold text-[#2f3743]">Optional</p>
              <p className="mt-1 text-[#4f5a69]">
                <code>sku</code>, <code>category_id</code>, <code>category_name</code>,{" "}
                <code>tax_rate</code>
              </p>
              <p className="mt-3 font-semibold text-[#2f3743]">Example header</p>
              <p className="mt-1 text-[#4f5a69] break-all">
                name,sku,category_id,category_name,tax_rate
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512]"
              >
                Choose CSV File
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

