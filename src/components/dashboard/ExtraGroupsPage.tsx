"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type ApiExtraGroup = components["schemas"]["ExtraGroup"];
type GroupRow = {
  id: string;
  name: string;
  isRequired: boolean;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelections: number;
  maxSelections: number | null;
  sortOrder: number;
  optionCount: number;
};

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!on)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function ExtraGroupsPage() {
  const importRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const mapGroup = (group: ApiExtraGroup): GroupRow => ({
    id: group.id ?? crypto.randomUUID(),
    name: group.name ?? "Unnamed group",
    isRequired: group.is_required ?? false,
    selectionType: group.selection_type ?? "MULTIPLE",
    minSelections: group.min_selections ?? 0,
    maxSelections: group.max_selections ?? null,
    sortOrder: group.sort_order ?? 0,
    optionCount: group.option_count ?? 0,
  });

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await orderzillaApi.dashboard.extras.list();
      const groups = (response?.extra_groups ?? []) as ApiExtraGroup[];
      setRows(groups.map(mapGroup));
    } catch {
      setError("Failed to load extra groups.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.selectionType.toLowerCase().includes(term) ||
        String(row.optionCount).includes(term),
    );
  }, [rows, search]);

  const totalItems = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const allCurrentSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id));

  const updateGroupRequired = async (row: GroupRow, nextRequired: boolean) => {
    const previous = rows;
    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, isRequired: nextRequired } : item)));
    try {
      await orderzillaApi.dashboard.extras.update(row.id, {
        body: {
          name: row.name,
          selection_type: row.selectionType,
          min_selections: row.minSelections,
          max_selections: row.maxSelections,
          is_required: nextRequired,
          sort_order: row.sortOrder,
        },
      });
      toast.success(`Group marked ${nextRequired ? "required" : "optional"}.`);
    } catch {
      setRows(previous);
      toast.error("Failed to update extra group.");
    }
  };

  const bulkSetRequired = async (nextRequired: boolean) => {
    if (selectedIds.length === 0) {
      toast("Select groups first.");
      return;
    }
    try {
      setIsBulkUpdating(true);
      const targets = rows.filter((row) => selectedIds.includes(row.id));
      await Promise.all(
        targets.map((row) =>
          orderzillaApi.dashboard.extras.update(row.id, {
            body: {
              name: row.name,
              selection_type: row.selectionType,
              min_selections: row.minSelections,
              max_selections: row.maxSelections,
              is_required: nextRequired,
              sort_order: row.sortOrder,
            },
          }),
        ),
      );
      setRows((prev) =>
        prev.map((row) => (selectedIds.includes(row.id) ? { ...row, isRequired: nextRequired } : row)),
      );
      toast.success(`Updated ${selectedIds.length} groups.`);
      setSelectedIds([]);
    } catch {
      toast.error("Failed to update selected groups.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast("Select groups first.");
      return;
    }
    try {
      setIsBulkUpdating(true);
      await Promise.all(selectedIds.map((id) => orderzillaApi.dashboard.extras.remove(id)));
      setRows((prev) => prev.filter((row) => !selectedIds.includes(row.id)));
      toast.success(`Deleted ${selectedIds.length} groups.`);
      setSelectedIds([]);
    } catch {
      toast.error("Failed to delete selected groups.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const parseCsvLine = (line: string) => line.split(",").map((value) => value.trim());

  const importGroups = async (file: File) => {
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

      const header = parseCsvLine(lines[0]).map((name) => name.toLowerCase());
      const idxName = header.indexOf("name");
      const idxType = header.indexOf("selection_type");
      const idxMin = header.indexOf("min_selections");
      const idxMax = header.indexOf("max_selections");
      const idxRequired = header.indexOf("is_required");
      const idxSort = header.indexOf("sort_order");
      if (idxName < 0) {
        toast.error("CSV must include 'name' column.");
        return;
      }

      const payloads = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        const selectionTypeRaw = (idxType >= 0 ? cols[idxType] : "MULTIPLE").toUpperCase();
        const selection_type = selectionTypeRaw === "SINGLE" ? "SINGLE" : "MULTIPLE";
        const min = Number(idxMin >= 0 ? cols[idxMin] : "0");
        const maxRaw = idxMax >= 0 ? cols[idxMax] : "";
        const requiredRaw = (idxRequired >= 0 ? cols[idxRequired] : "false").toLowerCase();
        const sort = Number(idxSort >= 0 ? cols[idxSort] : "0");
        return {
          name: cols[idxName] ?? "",
          selection_type,
          min_selections: Number.isFinite(min) ? min : 0,
          max_selections: maxRaw ? Number(maxRaw) : null,
          is_required: requiredRaw === "true" || requiredRaw === "1" || requiredRaw === "yes",
          sort_order: Number.isFinite(sort) ? sort : 0,
        };
      });

      const valid = payloads.filter((row) => row.name.trim().length > 0);
      if (valid.length === 0) {
        toast.error("No valid rows found in CSV.");
        return;
      }

      setIsBulkUpdating(true);
      await Promise.all(
        valid.map((body) =>
          orderzillaApi.dashboard.extras.create({
            body: { ...body, selection_type: body.selection_type as "SINGLE" | "MULTIPLE" } as never,
          }),
        ),
      );
      toast.success(`Imported ${valid.length} extra groups.`);
      fetchGroups();
    } catch {
      toast.error("Failed to import extra groups.");
    } finally {
      setIsBulkUpdating(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 md:px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029]">Extra Groups</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              disabled={isBulkUpdating}
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
                  importGroups(file);
                }
              }}
            />
            <Link
              href="/dashboard/extra-groups/create-extra-group"
              className="h-9 rounded-lg bg-[#d4ff00] px-3 sm:px-4 inline-flex items-center text-[12px] font-semibold text-[#1d2512] shrink-0"
            >
              + Add Extra Group
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchGroups} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-4 h-9 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
          <Search size={14} className="text-[#97a0ad]" />
          <input
            type="search"
            autoComplete="off"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search group name or type"
            className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
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
                  <th className="px-2 py-2 font-semibold">Group Name</th>
                  <th className="px-2 py-2 font-semibold">Required</th>
                  <th className="px-2 py-2 font-semibold">Selection Type</th>
                  <th className="px-2 py-2 font-semibold">Options</th>
                  <th className="px-2 py-2 font-semibold">Limits</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[#717c8e]">
                      No extra groups found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((group) => (
                    <tr key={group.id} className="border-b last:border-b-0 border-[#edf0f4] text-[13px] bg-white">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(group.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, group.id] : prev.filter((id) => id !== group.id),
                            )
                          }
                          className="h-4 w-4 rounded border-[#cfd5de]"
                        />
                      </td>
                      <td className="px-2 py-3 font-semibold text-[#222a35]">{group.name}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <Toggle on={group.isRequired} onToggle={(next) => updateGroupRequired(group, next)} />
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              group.isRequired
                                ? "bg-[#d5f5dc] text-[#2a6b39]"
                                : "bg-[#eceef2] text-[#5f6875]"
                            }`}
                          >
                            {group.isRequired ? "Required" : "Optional"}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-[#3e4653]">
                        {group.selectionType === "SINGLE" ? "Single-select" : "Multi-select"}
                      </td>
                      <td className="px-2 py-3 text-[#3e4653]">{group.optionCount}</td>
                      <td className="px-2 py-3 text-[#3e4653]">
                        {group.minSelections} / {group.maxSelections ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <RowActionMenu
                          actions={[
                            {
                              label: "Edit group",
                              onClick: () =>
                                (window.location.href = `/dashboard/extra-groups/create-extra-group?id=${group.id}`),
                            },
                            {
                              label: group.isRequired ? "Set optional" : "Set required",
                              onClick: () => updateGroupRequired(group, !group.isRequired),
                            },
                            {
                              label: "Delete group",
                              danger: true,
                              onClick: async () => {
                                try {
                                  await orderzillaApi.dashboard.extras.remove(group.id);
                                  setRows((prev) => prev.filter((row) => row.id !== group.id));
                                  toast.success("Extra group deleted.");
                                } catch {
                                  toast.error("Failed to delete extra group.");
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
          <p className="text-[13px] font-medium text-[#6e7785]">{selectedIds.length} groups selected</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => bulkSetRequired(true)}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Set Required
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => bulkSetRequired(false)}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Set Optional
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={bulkDelete}
              className="h-9 rounded-lg border border-[#efc3c3] bg-[#fff7f7] px-4 text-[12px] font-semibold text-[#cf4a4a]"
            >
              Delete
            </button>
          </div>
        </div>

        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="extra groups"
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      </section>

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[640px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Import Extra Groups CSV</h2>
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
                <code>selection_type</code>, <code>min_selections</code>, <code>max_selections</code>,{" "}
                <code>is_required</code>, <code>sort_order</code>
              </p>
              <p className="mt-3 font-semibold text-[#2f3743]">Example header</p>
              <p className="mt-1 text-[#4f5a69] break-all">
                name,selection_type,min_selections,max_selections,is_required,sort_order
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

