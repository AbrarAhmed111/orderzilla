"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type ApiLocation = components["schemas"]["Location"];

type LocationRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  terminals: number;
  ordersToday: number;
  active: boolean;
};

type LocationsTableResponse = {
  locations?: ApiLocation[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
};

export default function LocationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const importRef = useRef<HTMLInputElement | null>(null);

  const initialSearch = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "all";
  const initialPage = Number(searchParams.get("page") ?? "1");
  const initialLimit = Number(searchParams.get("limit") ?? "10");

  const [rows, setRows] = useState<LocationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [pageSize, setPageSize] =
    useState(Number.isFinite(initialLimit) && initialLimit > 0 ? initialLimit : 10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [assignCategory, setAssignCategory] = useState("CH");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const mapLocation = (location: ApiLocation): LocationRow => ({
    id: location.id ?? crypto.randomUUID(),
    name: location.name ?? "Unnamed",
    address: location.address ?? "",
    city: location.city ?? "-",
    country: location.country ?? "CH",
    timezone: location.timezone ?? "Europe/Zurich",
    terminals: location.terminal_count ?? 0,
    ordersToday: 0,
    active: location.is_active ?? true,
  });

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const response = (await fetch(`/api/dashboard/locations-table?${params.toString()}`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      }).then((res) => res.json())) as LocationsTableResponse;

      const items = (response?.locations ?? []) as ApiLocation[];
      const pagination = response?.pagination;
      setRows(items.map(mapLocation));
      setTotalItems(pagination?.total_items ?? items.length);
      setTotalPages(pagination?.total_pages ?? 1);
      setPage(pagination?.current_page ?? page);
    } catch {
      setError("Failed to load locations.");
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (page !== 1) params.set("page", String(page));
    if (pageSize !== 10) params.set("limit", String(pageSize));
    const nextQuery = params.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [search, statusFilter, page, pageSize, pathname, router, searchParams]);

  const paginatedRows = useMemo(() => rows, [rows]);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const allCurrentSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id));

  const updateRow = async (row: LocationRow, patch: Partial<LocationRow>) => {
    const next = { ...row, ...patch };
    await orderzillaApi.dashboard.locations.update(row.id, {
      body: {
        name: next.name,
        address: next.address || undefined,
        city: next.city === "-" ? undefined : next.city,
        country: next.country,
        timezone: next.timezone,
        is_active: next.active,
      } as never,
    });
  };

  const bulkActivate = async (active: boolean) => {
    if (selectedIds.length === 0) {
      toast("Select locations first.");
      return;
    }
    try {
      setIsBulkUpdating(true);
      const targets = rows.filter((row) => selectedIds.includes(row.id));
      await Promise.all(targets.map((row) => updateRow(row, { active })));
      setRows((prev) => prev.map((row) => (selectedIds.includes(row.id) ? { ...row, active } : row)));
      setSelectedIds([]);
      toast.success(`Updated ${targets.length} locations.`);
    } catch {
      toast.error("Failed to update locations.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast("Select locations first.");
      return;
    }
    try {
      setIsBulkUpdating(true);
      await Promise.all(selectedIds.map((id) => orderzillaApi.dashboard.locations.remove(id)));
      setRows((prev) => prev.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
      toast.success("Selected locations deleted.");
    } catch {
      toast.error("Failed to delete selected locations.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const assignCategoryToSelected = async () => {
    if (selectedIds.length === 0) {
      toast("Select locations first.");
      return;
    }
    try {
      setIsBulkUpdating(true);
      const targets = rows.filter((row) => selectedIds.includes(row.id));
      await Promise.all(targets.map((row) => updateRow(row, { country: assignCategory })));
      setRows((prev) =>
        prev.map((row) => (selectedIds.includes(row.id) ? { ...row, country: assignCategory } : row)),
      );
      setSelectedIds([]);
      toast.success(`Assigned category ${assignCategory} to selected locations.`);
    } catch {
      toast.error("Failed to assign category.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const createLocation = async () => {
    const name = window.prompt("Location name");
    if (!name) return;
    const city = window.prompt("City", "Zurich") ?? "Zurich";
    try {
      await orderzillaApi.dashboard.locations.create({
        body: {
          name: name.trim(),
          city,
          country: "CH",
          timezone: "Europe/Zurich",
        },
      });
      toast.success("Location created.");
      fetchLocations();
    } catch {
      toast.error("Failed to create location.");
    }
  };

  const parseCsvLine = (line: string) => line.split(",").map((value) => value.trim());

  const importLocations = async (file: File) => {
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
      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idxName = header.indexOf("name");
      const idxAddress = header.indexOf("address");
      const idxCity = header.indexOf("city");
      const idxCountry = header.indexOf("country");
      const idxTimezone = header.indexOf("timezone");
      if (idxName < 0) {
        toast.error("CSV must include 'name' column.");
        return;
      }
      const payloads = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        return {
          name: (cols[idxName] ?? "").trim(),
          address: idxAddress >= 0 ? cols[idxAddress] || undefined : undefined,
          city: idxCity >= 0 ? cols[idxCity] || undefined : undefined,
          country: idxCountry >= 0 ? cols[idxCountry] || "CH" : "CH",
          timezone: idxTimezone >= 0 ? cols[idxTimezone] || "Europe/Zurich" : "Europe/Zurich",
        };
      });
      const valid = payloads.filter((p) => p.name.length > 0);
      if (valid.length === 0) {
        toast.error("No valid rows found.");
        return;
      }
      setIsBulkUpdating(true);
      await Promise.all(valid.map((body) => orderzillaApi.dashboard.locations.create({ body })));
      toast.success(`Imported ${valid.length} locations.`);
      fetchLocations();
    } catch {
      toast.error("Failed to import locations.");
    } finally {
      setIsBulkUpdating(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Locations</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[13px] font-semibold text-[#414855]"
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
                if (file) importLocations(file);
              }}
            />
            <button
              type="button"
              onClick={createLocation}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[13px] font-semibold text-[#1d2512]"
            >
              + Add Location
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchLocations} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="h-9 flex-1 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
            <Search size={15} className="text-[#97a0ad]" />
            <input
              placeholder="Search by location, city, or country"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
            />
          </div>
          <SelectMenu
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[
              { label: "All Statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "Maintenance", value: "maintenance" },
            ]}
            className="min-w-[130px]"
          />
        </div>

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={6} columns={7} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e6ea]">
            <table className="w-full min-w-[980px]">
              <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                <tr className="text-[12px] text-[#6e7785] text-left">
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, ...paginatedRows.map((row) => row.id)]))
                            : prev.filter((id) => !paginatedRows.some((row) => row.id === id)),
                        )
                      }
                      className="h-4 w-4 rounded border-[#cfd5de]"
                    />
                  </th>
                  <th className="px-2 py-2 font-semibold">Location</th>
                  <th className="px-2 py-2 font-semibold">City</th>
                  <th className="px-2 py-2 font-semibold">Country</th>
                  <th className="px-2 py-2 font-semibold">Terminals</th>
                  <th className="px-2 py-2 font-semibold">Orders Today</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-[#717c8e]">
                      No locations found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((location) => (
                    <tr key={location.id} className="border-b last:border-b-0 border-[#edf0f4] text-[13px] bg-white">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(location.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, location.id] : prev.filter((id) => id !== location.id),
                            )
                          }
                          className="h-4 w-4 rounded border-[#cfd5de]"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-[#717c8e]" />
                          <span className="font-semibold text-[#222a35]">{location.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-[#3e4653]">{location.city}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{location.country}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{location.terminals}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{location.ordersToday}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            location.active ? "bg-[#d5f5dc] text-[#2a6b39]" : "bg-[#fde8be] text-[#855100]"
                          }`}
                        >
                          {location.active ? "Active" : "Maintenance"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <RowActionMenu
                          actions={[
                            {
                              label: location.active ? "Deactivate" : "Activate",
                              onClick: async () => {
                                try {
                                  await updateRow(location, { active: !location.active });
                                  setRows((prev) =>
                                    prev.map((row) =>
                                      row.id === location.id ? { ...row, active: !row.active } : row,
                                    ),
                                  );
                                  toast.success("Location updated.");
                                } catch {
                                  toast.error("Failed to update location.");
                                }
                              },
                            },
                            {
                              label: "Delete location",
                              danger: true,
                              onClick: async () => {
                                try {
                                  await orderzillaApi.dashboard.locations.remove(location.id);
                                  setRows((prev) => prev.filter((row) => row.id !== location.id));
                                  toast.success("Location deleted.");
                                } catch {
                                  toast.error("Failed to delete location.");
                                }
                              },
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
            <p className="text-[13px] font-medium text-[#6e7785]">{selectedIds.length} locations selected</p>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => bulkActivate(true)}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => bulkActivate(false)}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Deactivate
            </button>
            <SelectMenu
              value={assignCategory}
              onChange={setAssignCategory}
              options={[
                { label: "CH Category", value: "CH" },
                { label: "DE Category", value: "DE" },
                { label: "FR Category", value: "FR" },
              ]}
              className="min-w-[150px]"
            />
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={assignCategoryToSelected}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Assign Category
            </button>
            <button
              type="button"
              onClick={createLocation}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Create Location
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={bulkDelete}
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
          label="locations"
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
    </div>
  );
}

