"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type LocationRow = {
  id: string;
  name: string;
  city: string;
  terminals: number;
  ordersToday: number;
  status: "Active" | "Maintenance";
};

export default function LocationsPage() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await orderzillaApi.dashboard.locations.list();
      const locations = (response?.locations ?? []) as components["schemas"]["Location"][];
      setRows(
        locations.map((location) => ({
          id: location.id ?? crypto.randomUUID(),
          name: location.name ?? "Unnamed",
          city: location.city ?? "-",
          terminals: location.terminal_count ?? 0,
          ordersToday: 0,
          status: location.is_active ? "Active" : "Maintenance",
        })),
      );
    } catch {
      setError("Failed to load locations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const visibleRows = useMemo(
    () =>
      statusFilter === "all"
        ? rows
        : rows.filter((row) =>
            statusFilter === "active" ? row.status === "Active" : row.status !== "Active",
          ),
    [rows, statusFilter],
  );
  const totalItems = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Locations</h1>
          <div className="flex items-center gap-2">
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
            <button
              type="button"
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

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e6ea]">
          <table className="w-full min-w-[880px]">
            <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
              <tr className="text-[12px] text-[#6e7785] text-left">
                <th className="px-3 py-2 font-semibold">Location</th>
                <th className="px-2 py-2 font-semibold">City</th>
                <th className="px-2 py-2 font-semibold">Terminals</th>
                <th className="px-2 py-2 font-semibold">Orders Today</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((location, index) => (
                <tr
                  key={location.id}
                  className={`border-b last:border-b-0 border-[#edf0f4] text-[13px] ${
                    index === 1 ? "bg-[#f8f9fb]" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="text-[#717c8e]" />
                      <span className="font-semibold text-[#222a35]">{location.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{location.city}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{location.terminals}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{location.ordersToday}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        location.status === "Active"
                          ? "bg-[#d5f5dc] text-[#2a6b39]"
                          : "bg-[#fde8be] text-[#855100]"
                      }`}
                    >
                      {location.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowActionMenu
                      actions={[
                        { label: "Edit location", onClick: () => undefined },
                        {
                          label: location.status === "Active" ? "Set maintenance" : "Activate",
                          onClick: () =>
                            setRows((prev) =>
                              prev.map((row) =>
                                row.id === location.id
                                  ? {
                                      ...row,
                                      status: row.status === "Active" ? "Maintenance" : "Active",
                                    }
                                  : row,
                              ),
                            ),
                        },
                        {
                          label: "Delete location",
                          danger: true,
                          onClick: async () => {
                            setRows((prev) => prev.filter((row) => row.id !== location.id));
                            await orderzillaApi.dashboard.locations.remove(location.id);
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
        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="locations"
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

