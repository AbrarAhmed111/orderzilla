"use client";

import Link from "next/link";
import { GripVertical, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

type CategoryRow = {
  id: string;
  name: string;
  products: number | null;
  active: boolean;
  color: string;
  imageUrl: string | null;
  availabilityDisplay: string;
};

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_STR_TO_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function formatTimeHHMMSS(hms: string | null | undefined, defaultVal: string): string {
  if (!hms || typeof hms !== "string") return defaultVal;
  const parts = hms.trim().split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return defaultVal;
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatAvailabilityDays(days: (string | number)[] | null | undefined): string {
  if (!days || !Array.isArray(days) || days.length === 0) return "";
  const indices = days
    .map((d) => {
      if (typeof d === "number" && d >= 0 && d <= 6) return d;
      if (typeof d === "string") {
        const key = d.toLowerCase().slice(0, 3);
        const idx = DAY_STR_TO_INDEX[key];
        return idx !== undefined ? idx : -1;
      }
      return -1;
    })
    .filter((i) => i >= 0);
  const unique = [...new Set(indices)].sort((a, b) => a - b);
  if (unique.length === 0) return "";
  if (unique.length === 7) return "Daily";
  return unique.map((i) => DAY_ABBREVS[i]).join(", ");
}

function formatScheduledAvailability(
  availability: string | null | undefined,
  days: (string | number)[] | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (availability !== "scheduled") return availability === "always" ? "Always" : "Always";
  const daysStr = formatAvailabilityDays(days);
  const startStr = formatTimeHHMMSS(start, "12:00 AM");
  const endStr = formatTimeHHMMSS(end, "11:59 PM");
  if (!daysStr) return `${startStr} – ${endStr}`;
  return `${daysStr}, ${startStr} – ${endStr}`;
}

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

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
  const [allRows, setAllRows] = useState<CategoryRow[]>([]);
  const [locationFilter, setLocationFilter] = useState("all");
  const [locationOptions, setLocationOptions] = useState<Array<{ label: string; value: string }>>([
    { label: "All Locations", value: "all" },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSavingSort, setIsSavingSort] = useState(false);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [response, locationsResponse] = await Promise.all([
        orderzillaApi.dashboard.categories.list(),
        orderzillaApi.dashboard.locations.list(),
      ]);
      const categories = (response?.categories ?? []) as components["schemas"]["Category"][];
      const mapped = categories.map((category, index) => {
        const raw = category.product_count;
        const productCount =
          raw == null
            ? null
            : (() => {
                const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
                return Number.isFinite(n) ? n : null;
              })();
        const ext = category as {
          availability?: string;
          availability_days?: (string | number)[];
          availability_start?: string | null;
          availability_end?: string | null;
        };
        const availabilityDisplay = formatScheduledAvailability(
          ext.availability,
          ext.availability_days,
          ext.availability_start,
          ext.availability_end,
        );
        return {
          id: toDisplayValue(category.id, "") || crypto.randomUUID(),
          name: toDisplayValue(category.name, EMPTY_VALUE),
          products: productCount,
          active: category.is_active ?? true,
          color: colorPresets[index % colorPresets.length],
          imageUrl: category.image_url ?? null,
          availabilityDisplay,
        };
      });
      setAllRows(mapped);
      setRows(mapped);
      const locations = (locationsResponse?.locations ?? []) as components["schemas"]["Location"][];
      setLocationOptions([
        { label: "All Locations", value: "all" },
        ...locations
          .filter((location) => Boolean(location.id))
          .map((location) => ({
            label: location.name ?? "Unnamed location",
            value: location.id ?? "",
          })),
      ]);
    } catch {
      setError("Failed to load categories.");
      setAllRows([]);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filterByLocation = async (locationId: string) => {
    if (locationId === "all") {
      setRows(allRows);
      return;
    }
    try {
      setIsLoading(true);
      const terminalsResponse = await orderzillaApi.dashboard.terminals.list();
      const terminals = ((terminalsResponse?.terminals ?? []) as components["schemas"]["Terminal"][]).filter(
        (terminal) => terminal.location_id === locationId && Boolean(terminal.id),
      );
      if (terminals.length === 0) {
        setRows([]);
        return;
      }
      const overrideResponses = await Promise.all(
        terminals.map((terminal) => orderzillaApi.dashboard.terminals.products.list(terminal.id ?? "")),
      );
      const categoryIds = new Set<string>();
      overrideResponses.forEach((response) => {
        (response?.products ?? []).forEach((product) => {
          if (product.category_id) categoryIds.add(product.category_id);
        });
      });
      setRows(allRows.filter((category) => categoryIds.has(category.id)));
    } catch {
      setError("Failed to filter categories by location.");
      setRows(allRows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterByLocation(locationFilter);
  }, [locationFilter, allRows]);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const persistSortOrder = async (nextRows: CategoryRow[]) => {
    const previousRows = rows;
    const previousAllRows = allRows;
    setRows(nextRows);
    if (locationFilter === "all") {
      setAllRows(nextRows);
    }
    setIsSavingSort(true);
    try {
      await Promise.all(
        nextRows.map((row, index) =>
          orderzillaApi.dashboard.categories.update(row.id, {
            body: {
              name: row.name,
              sort_order: index + 1,
            },
          }),
        ),
      );
      if (locationFilter !== "all") {
        setAllRows((prev) => {
          const sortOrderById = new Map(nextRows.map((row, index) => [row.id, index + 1]));
          return [...prev].sort((a, b) => {
            const aOrder = sortOrderById.get(a.id);
            const bOrder = sortOrderById.get(b.id);
            if (aOrder === undefined && bOrder === undefined) return 0;
            if (aOrder === undefined) return 1;
            if (bOrder === undefined) return -1;
            return aOrder - bOrder;
          });
        });
      }
      toast.success("Category order updated.");
    } catch {
      setRows(previousRows);
      setAllRows(previousAllRows);
      toast.error("Failed to update category order.");
    } finally {
      setIsSavingSort(false);
    }
  };

  const handleDropRow = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || isSavingSort) return;
    const fromIndex = rows.findIndex((row) => row.id === draggingId);
    const toIndex = rows.findIndex((row) => row.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...rows];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    await persistSortOrder(next);
  };

  return (
    <div className="p-3 sm:p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029]">
            Categories
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {isSavingSort ? (
              <span className="text-[12px] font-semibold text-[#7a8291]">Saving order...</span>
            ) : null}
            <span className="text-[14px] font-medium text-[#768091]">Location filter</span>
            <SelectMenu
              value={locationFilter}
              onChange={(value) => {
                setLocationFilter(value);
                setPage(1);
              }}
              options={locationOptions}
              className="min-w-[120px] sm:min-w-[150px]"
            />
            <Link
              href="/categories/create-category"
              className="h-10 rounded-lg bg-[#d4ff00] px-3 sm:px-4 inline-flex items-center gap-2 text-[13px] sm:text-[14px] font-semibold text-[#1d2512] shrink-0"
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
          <div className="mt-4 rounded-xl border border-[#e4e6ea] overflow-x-auto">
          <div className="grid grid-cols-[40px_minmax(120px,1fr)_minmax(200px,260px)_70px] items-center gap-2 sm:gap-3 min-w-[520px] px-3 py-2 bg-[#f8f9fb] border-b border-[#e9ebef]">
            <span />
            <p className="text-[13px] font-semibold text-[#6f7785]">Category</p>
            <p className="text-[13px] font-semibold text-[#6f7785]">Visibility / Availability</p>
            <p className="text-[13px] font-semibold text-right text-[#6f7785]">Actions</p>
          </div>

          {paginatedRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[#717c8e]">
              No categories found.
            </div>
          ) : paginatedRows.map((category, index) => (
            <div
              key={category.id}
              draggable={!isSavingSort}
              onDragStart={() => setDraggingId(category.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={async () => {
                await handleDropRow(category.id);
                setDraggingId(null);
              }}
              className={`grid grid-cols-[40px_minmax(120px,1fr)_minmax(200px,260px)_70px] items-center gap-2 sm:gap-3 min-w-[520px] px-3 py-3 ${
                index !== paginatedRows.length - 1 ? "border-b border-[#edf0f4]" : ""
              } ${index === 0 ? "bg-[#f9fafc]" : "bg-white"} ${
                draggingId === category.id ? "opacity-60" : ""
              }`}
            >
              <button type="button" className="cursor-grab text-[#a0a7b2] active:cursor-grabbing">
                <GripVertical size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f8f9fb]">
                  {category.imageUrl ? (
                    <img
                      src={
                        category.imageUrl.startsWith("http")
                          ? category.imageUrl
                          : `/api/proxy${category.imageUrl}`
                      }
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full rounded-lg bg-gradient-to-br ${category.color} shadow-inner`}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[18px] sm:text-[24px] leading-tight font-semibold text-[#1d2430] truncate">
                    {category.name}
                  </p>
                  <p className="text-[12px] text-[#7a8291]">
                    {category.products != null ? `${category.products} products` : `${EMPTY_VALUE} products`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <Toggle
                    active={category.active}
                    onToggle={async (next) => {
                    const previousRows = rows;
                    const previousAllRows = allRows;
                    setUpdatingId(category.id);
                    setRows((prev) =>
                      prev.map((row) => (row.id === category.id ? { ...row, active: next } : row)),
                    );
                    setAllRows((prev) =>
                      prev.map((row) => (row.id === category.id ? { ...row, active: next } : row)),
                    );
                    try {
                      await orderzillaApi.dashboard.categories.update(category.id, {
                        body: { name: category.name, is_active: next },
                      });
                      toast.success(`Category ${next ? "enabled" : "hidden"} successfully.`);
                    } catch {
                      setRows(previousRows);
                      setAllRows(previousAllRows);
                      toast.error("Failed to update category visibility.");
                    } finally {
                      setUpdatingId(null);
                    }
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
                {updatingId === category.id ? (
                  <span className="text-[11px] text-[#7a8291]">Saving...</span>
                ) : null}
                </div>
                <p className="text-[11px] text-[#6e7785]">
                  {category.availabilityDisplay}
                </p>
              </div>

              <div className="text-right">
                <RowActionMenu
                  actions={[
                    {
                      label: "Edit category",
                      onClick: () => {
                        window.location.href = `/categories/${category.id}/edit-category`;
                      },
                    },
                    {
                      label: category.active ? "Hide category" : "Show category",
                      onClick: () => {
                        const target = rows.find((row) => row.id === category.id);
                        if (!target) return;
                        const next = !target.active;
                        setUpdatingId(category.id);
                        const previousRows = rows;
                        const previousAllRows = allRows;
                        setRows((prev) =>
                          prev.map((row) => (row.id === category.id ? { ...row, active: next } : row)),
                        );
                        setAllRows((prev) =>
                          prev.map((row) => (row.id === category.id ? { ...row, active: next } : row)),
                        );
                        orderzillaApi.dashboard.categories
                          .update(category.id, {
                            body: { name: category.name, is_active: next } as never,
                          })
                          .then(() => toast.success(`Category ${next ? "enabled" : "hidden"} successfully.`))
                          .catch(() => {
                            setRows(previousRows);
                            setAllRows(previousAllRows);
                            toast.error("Failed to update category visibility.");
                          })
                          .finally(() => setUpdatingId(null));
                      },
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

