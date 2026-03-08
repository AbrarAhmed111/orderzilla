"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ApiTerminal = {
  id?: string;
  terminal_code?: string;
  name?: string;
  mode?: "INDOOR" | "TAKEAWAY";
  status?: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "ERROR";
  last_heartbeat_at?: string | null;
  app_version?: string | null;
  is_active?: boolean;
  location_id?: string;
  location_name?: string;
};

type ApiLocation = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  is_active?: boolean;
};

type TerminalRow = {
  id: string;
  name: string;
  terminalCode: string;
  locationId: string;
  locationName: string;
  mode: "INDOOR" | "TAKEAWAY";
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "ERROR";
  lastSeen: string;
  appVersion: string;
  isActive: boolean;
};

type LocationOption = { id: string; name: string };

type TerminalTableResponse = {
  terminals?: ApiTerminal[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
};

type CommandType = "RELOAD_MENU" | "SHOW_MESSAGE" | "MAINTENANCE_MODE" | "CLEAR_MAINTENANCE";

const MODE_OPTIONS = [
  { label: "All Types", value: "all" },
  { label: "Indoor", value: "indoor" },
  { label: "Takeaway", value: "takeaway" },
];

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Error", value: "error" },
];

const COMMAND_OPTIONS = [
  { label: "Reload Menu", value: "RELOAD_MENU" },
  { label: "Show Message", value: "SHOW_MESSAGE" },
  { label: "Maintenance Mode", value: "MAINTENANCE_MODE" },
  { label: "Clear Maintenance", value: "CLEAR_MAINTENANCE" },
];

const mapTerminal = (item: ApiTerminal): TerminalRow => ({
  id: item.id ?? crypto.randomUUID(),
  name: item.name ?? "Unnamed terminal",
  terminalCode: item.terminal_code ?? "N/A",
  locationId: item.location_id ?? "",
  locationName: item.location_name ?? "Unknown location",
  mode: item.mode ?? "INDOOR",
  status: item.status ?? "OFFLINE",
  lastSeen: item.last_heartbeat_at ? new Date(item.last_heartbeat_at).toLocaleString() : "Never",
  appVersion: item.app_version ?? "-",
  isActive: item.is_active ?? true,
});

function statusClass(status: TerminalRow["status"]) {
  if (status === "ONLINE") return "bg-[#dcfce7] text-[#166534]";
  if (status === "MAINTENANCE") return "bg-[#fef3c7] text-[#92400e]";
  if (status === "ERROR") return "bg-[#fee2e2] text-[#991b1b]";
  return "bg-[#e5e7eb] text-[#374151]";
}

export default function TerminalsLocationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const importLocationsRef = useRef<HTMLInputElement | null>(null);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = Number(searchParams.get("limit") ?? "10") || 10;
  const q = searchParams.get("q") ?? "";
  const locationId = searchParams.get("location") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const mode = searchParams.get("type") ?? "all";

  const [searchInput, setSearchInput] = useState(q);
  const [rows, setRows] = useState<TerminalRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [command, setCommand] = useState<CommandType>("RELOAD_MENU");
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tableError, setTableError] = useState("");

  const locationOptions = useMemo(
    () => [
      { label: "All Locations", value: "all" },
      ...locations.map((loc) => ({ label: loc.name, value: loc.id })),
    ],
    [locations],
  );

  const syncQuery = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") next.delete(key);
        else next.set(key, String(value));
      });
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncQuery({ q: searchInput.trim() || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, syncQuery]);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await orderzillaApi.dashboard.locations.list();
      const items = (response?.locations ?? []) as ApiLocation[];
      setLocations(items.filter((loc) => Boolean(loc.id)).map((loc) => ({ id: loc.id!, name: loc.name ?? "Unnamed" })));
    } catch {
      setLocations([]);
    }
  }, []);

  const fetchTerminals = useCallback(async () => {
    try {
      setIsLoading(true);
      setTableError("");
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (q.trim()) sp.set("search", q.trim());
      if (locationId !== "all") sp.set("location_id", locationId);
      if (status !== "all") sp.set("status", status);
      if (mode !== "all") sp.set("mode", mode);

      const response = await fetch(`/api/dashboard/terminals-table?${sp.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch terminals");
      const data = (await response.json()) as TerminalTableResponse;
      const mapped = (data.terminals ?? []).map(mapTerminal);
      setRows(mapped);
      setTotalItems(data.pagination?.total_items ?? mapped.length);
      setTotalPages(data.pagination?.total_pages ?? 1);
      setSelectedIds((prev) => prev.filter((id) => mapped.some((row) => row.id === id)));
    } catch {
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
      setTableError("Failed to load terminals.");
    } finally {
      setIsLoading(false);
    }
  }, [limit, locationId, mode, page, q, status]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchTerminals();
  }, [fetchTerminals]);

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
  const selectedCount = selectedIds.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(rows.map((row) => row.id));
    else setSelectedIds([]);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  };

  const updateActive = async (ids: string[], isActive: boolean) => {
    if (!ids.length) return;
    const loadingToast = toast.loading(isActive ? "Activating terminals..." : "Deactivating terminals...");
    try {
      await Promise.all(
        ids.map((id) => orderzillaApi.dashboard.terminals.update(id, { body: { is_active: isActive } })),
      );
      toast.success(isActive ? "Terminals activated." : "Terminals deactivated.");
      setSelectedIds([]);
      await fetchTerminals();
    } catch {
      toast.error("Failed to update terminal status.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const deleteTerminals = async (ids: string[]) => {
    if (!ids.length) return;
    const loadingToast = toast.loading("Deleting terminals...");
    try {
      await Promise.all(ids.map((id) => orderzillaApi.dashboard.terminals.remove(id)));
      toast.success("Terminals deleted.");
      setSelectedIds([]);
      await fetchTerminals();
    } catch {
      toast.error("Failed to delete terminals.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const sendCommand = async (ids: string[], commandType: CommandType) => {
    if (!ids.length) return;
    const message = commandType === "SHOW_MESSAGE" ? window.prompt("Enter message for terminals:")?.trim() ?? "" : "";
    if (commandType === "SHOW_MESSAGE" && !message) {
      toast.error("Message is required for SHOW_MESSAGE.");
      return;
    }
    const payload = commandType === "SHOW_MESSAGE" ? ({ message } as unknown as Record<string, never>) : undefined;
    const loadingToast = toast.loading("Sending command...");
    try {
      await Promise.all(
        ids.map((id) =>
          orderzillaApi.dashboard.terminals.commands.create(id, {
            body: { command: commandType, payload: payload ?? undefined },
          }),
        ),
      );
      toast.success("Command queued for selected terminals.");
    } catch {
      toast.error("Failed to send command.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleCreateTerminal = async () => {
    if (!locations.length) {
      toast.error("No locations available. Create a location first.");
      return;
    }
    const name = window.prompt("Terminal name")?.trim() ?? "";
    if (!name) return;
    const terminalCode = window.prompt("Terminal code (e.g. ZH01-T1)")?.trim() ?? "";
    if (!terminalCode) return;
    const modeInput = (window.prompt("Terminal mode: INDOOR or TAKEAWAY", "INDOOR") ?? "INDOOR").toUpperCase();
    const terminalMode: "INDOOR" | "TAKEAWAY" = modeInput === "TAKEAWAY" ? "TAKEAWAY" : "INDOOR";
    const selectedLocationId = locationId !== "all" ? locationId : locations[0].id;
    const loadingToast = toast.loading("Creating terminal...");
    try {
      await orderzillaApi.dashboard.terminals.create({
        body: {
          name,
          terminal_code: terminalCode,
          location_id: selectedLocationId,
          mode: terminalMode,
          printer_port: 9100,
          printer_width: 80,
        },
      });
      toast.success("Terminal created.");
      await fetchTerminals();
    } catch {
      toast.error("Failed to create terminal.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleImportLocations = async (file: File) => {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      toast.error("CSV is empty.");
      return;
    }

    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
    const idx = {
      name: headers.indexOf("name"),
      address: headers.indexOf("address"),
      city: headers.indexOf("city"),
      country: headers.indexOf("country"),
      timezone: headers.indexOf("timezone"),
    };
    if (idx.name < 0) {
      toast.error("CSV must include `name` header.");
      return;
    }

    const loadingToast = toast.loading("Importing locations...");
    try {
      let created = 0;
      for (const line of dataLines) {
        const cols = line.split(",").map((v) => v.trim());
        const name = cols[idx.name] ?? "";
        if (!name) continue;
        await orderzillaApi.dashboard.locations.create({
          body: {
            name,
            address: idx.address >= 0 ? cols[idx.address] ?? "" : "",
            city: idx.city >= 0 ? cols[idx.city] ?? "" : "",
            country: idx.country >= 0 ? cols[idx.country] ?? "CH" : "CH",
            timezone: idx.timezone >= 0 ? cols[idx.timezone] ?? "Europe/Zurich" : "Europe/Zurich",
          },
        });
        created += 1;
      }
      toast.success(`Imported ${created} location(s).`);
      await fetchLocations();
      await fetchTerminals();
    } catch {
      toast.error("Failed to import locations.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[30px] font-extrabold text-[#12161f]">Terminals & Locations</h1>
            <p className="text-[13px] text-[#717c8e]">Live terminal status, actions, and location imports.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateTerminal}
              className="h-10 rounded-lg bg-[#d0fe1d] px-4 text-[13px] font-semibold text-[#12161f]"
            >
              + Add Terminal
            </button>
            <button
              type="button"
              onClick={() => importLocationsRef.current?.click()}
              className="h-10 rounded-lg border border-[#d1d6db] bg-white px-4 text-[13px] font-semibold text-[#12161f]"
            >
              Import Locations
            </button>
            <input
              ref={importLocationsRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) await handleImportLocations(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search terminal name, code, location"
            className="h-10 rounded-lg border border-[#d1d6db] bg-white px-3 text-[13px] text-[#12161f] outline-none focus:border-[#c0eb1a]"
          />
          <SelectMenu
            value={locationId}
            onChange={(value) => syncQuery({ location: value, page: 1 })}
            options={locationOptions}
          />
          <SelectMenu
            value={status}
            onChange={(value) => syncQuery({ status: value, page: 1 })}
            options={STATUS_OPTIONS}
          />
          <SelectMenu
            value={mode}
            onChange={(value) => syncQuery({ type: value, page: 1 })}
            options={MODE_OPTIONS}
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#e5e7eb]">
          <table className="w-full">
            <thead className="border-b border-[#e5e7eb] bg-[#f7f8fa]">
              <tr className="text-left text-[12px] font-semibold text-[#717c8e]">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#d1d6db]"
                    checked={allSelected}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                  />
                </th>
                <th className="px-2 py-2">Terminal</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Last Seen</th>
                <th className="px-2 py-2">Version</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <TableSkeleton columns={8} rows={6} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-[13px] text-[#717c8e]">
                    {tableError || "No terminals found."}
                  </td>
                </tr>
              ) : (
                rows.map((terminal) => (
                  <tr key={terminal.id} className="border-b border-[#edf0f4] text-[13px] text-[#12161f] last:border-b-0">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#d1d6db]"
                        checked={selectedIds.includes(terminal.id)}
                        onChange={(event) => toggleOne(terminal.id, event.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/dashboard/terminals/${terminal.id}`} className="font-semibold text-[#12161f] hover:underline">
                        {terminal.name} ({terminal.terminalCode})
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-[#4b5563]">{terminal.locationName}</td>
                    <td className="px-2 py-3 text-[#4b5563]">{terminal.mode === "TAKEAWAY" ? "Takeaway" : "Indoor"}</td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(terminal.status)}`}>
                        {terminal.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[#4b5563]">{terminal.lastSeen}</td>
                    <td className="px-2 py-3 text-[#4b5563]">{terminal.appVersion}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => updateActive([terminal.id], !terminal.isActive)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                            terminal.isActive ? "border-[#c0eb1a] bg-[#d0fe1d]" : "border-[#d1d6db] bg-[#f3f4f6]"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white transition ${
                              terminal.isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <RowActionMenu
                          actions={[
                            {
                              label: "Open Details",
                              onClick: () => router.push(`/dashboard/terminals/${terminal.id}`),
                            },
                            {
                              label: "Send Reload Menu",
                              onClick: () => sendCommand([terminal.id], "RELOAD_MENU"),
                            },
                            {
                              label: terminal.isActive ? "Deactivate" : "Activate",
                              onClick: () => updateActive([terminal.id], !terminal.isActive),
                            },
                            {
                              label: "Delete",
                              danger: true,
                              onClick: () => deleteTerminals([terminal.id]),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] px-4 py-3">
          <p className="text-[13px] text-[#717c8e]">{selectedCount} terminal(s) selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => updateActive(selectedIds, true)}
              className="h-9 rounded-lg border border-[#d1d6db] bg-white px-4 text-[12px] font-semibold text-[#12161f] disabled:opacity-50"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => updateActive(selectedIds, false)}
              className="h-9 rounded-lg border border-[#d1d6db] bg-white px-4 text-[12px] font-semibold text-[#12161f] disabled:opacity-50"
            >
              Deactivate
            </button>
            <SelectMenu value={command} onChange={(value) => setCommand(value as CommandType)} options={COMMAND_OPTIONS} className="w-[180px]" />
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => sendCommand(selectedIds, command)}
              className="h-9 rounded-lg border border-[#d1d6db] bg-white px-4 text-[12px] font-semibold text-[#12161f] disabled:opacity-50"
            >
              Send Command
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => deleteTerminals(selectedIds)}
              className="h-9 rounded-lg bg-[#dc2626] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>

        <TablePagination
          page={Math.max(1, page)}
          totalPages={Math.max(1, totalPages)}
          totalItems={totalItems}
          pageSize={limit}
          label="terminals"
          onPageChange={(nextPage) => syncQuery({ page: nextPage })}
          onPageSizeChange={(nextSize) => syncQuery({ limit: nextSize, page: 1 })}
        />
      </section>
    </div>
  );
}

