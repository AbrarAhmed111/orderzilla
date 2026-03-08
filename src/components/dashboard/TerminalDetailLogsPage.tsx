"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";

type TerminalDetailLogsPageProps = {
  id: string;
};

type ApiTerminal = {
  id?: string;
  terminal_code?: string;
  name?: string;
  location_name?: string;
  status?: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "ERROR";
  mode?: "INDOOR" | "TAKEAWAY";
  is_active?: boolean;
  app_version?: string | null;
  created_at?: string;
  last_heartbeat_at?: string | null;
  vitals?: {
    battery_level?: number;
    storage_free_mb?: number;
    network_type?: string;
  } | null;
};

type TerminalEvent = {
  id: string;
  at: string;
  level: "Info" | "Warning" | "Error" | "Success";
  event: string;
  message: string;
  source: string;
};

function levelClass(level: TerminalEvent["level"]) {
  if (level === "Info") return "bg-[#cfe2ff] text-[#2457a6]";
  if (level === "Success") return "bg-[#d5f5dc] text-[#2a6b39]";
  if (level === "Warning") return "bg-[#fde8be] text-[#855100]";
  return "bg-[#f8d2d2] text-[#8f2a2a]";
}

export default function TerminalDetailLogsPage({ id }: TerminalDetailLogsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = Number(searchParams.get("limit") ?? "10") || 10;
  const q = searchParams.get("q") ?? "";
  const level = searchParams.get("level") ?? "all";

  const [terminalName, setTerminalName] = useState(`Terminal #${id.slice(0, 6).toUpperCase()}`);
  const [locationName, setLocationName] = useState("Location");
  const [events, setEvents] = useState<TerminalEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TerminalEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q);

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
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, syncQuery]);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const terminal = (await orderzillaApi.dashboard.terminals.byId(id)) as ApiTerminal;
        setTerminalName(terminal?.name ?? `Terminal #${id.slice(0, 6).toUpperCase()}`);
        setLocationName(terminal?.location_name ?? "Location");

        const derivedEvents: TerminalEvent[] = [
          {
            id: "created",
            at: terminal.created_at ?? new Date().toISOString(),
            level: "Info",
            event: "Terminal Registered",
            message: `Terminal ${terminal.terminal_code ?? terminal.name ?? id} created.`,
            source: "Backend",
          },
          {
            id: "status",
            at: terminal.last_heartbeat_at ?? terminal.created_at ?? new Date().toISOString(),
            level:
              terminal.status === "ERROR"
                ? "Error"
                : terminal.status === "MAINTENANCE"
                  ? "Warning"
                  : "Success",
            event: "Current Status",
            message: `Status is ${terminal.status ?? "UNKNOWN"} and mode is ${terminal.mode ?? "-"}.`,
            source: "Terminal",
          },
          {
            id: "heartbeat",
            at: terminal.last_heartbeat_at ?? terminal.created_at ?? new Date().toISOString(),
            level: terminal.last_heartbeat_at ? "Success" : "Warning",
            event: "Heartbeat",
            message: terminal.last_heartbeat_at
              ? `Last heartbeat at ${new Date(terminal.last_heartbeat_at).toLocaleString()}.`
              : "No heartbeat received yet.",
            source: "Terminal",
          },
          {
            id: "vitals",
            at: terminal.last_heartbeat_at ?? terminal.created_at ?? new Date().toISOString(),
            level: "Info",
            event: "Vitals Snapshot",
            message: `Battery ${terminal.vitals?.battery_level ?? "-"}%, storage ${terminal.vitals?.storage_free_mb ?? "-"}MB, network ${terminal.vitals?.network_type ?? "-"}.`,
            source: "System",
          },
          {
            id: "activity",
            at: terminal.last_heartbeat_at ?? terminal.created_at ?? new Date().toISOString(),
            level: terminal.is_active ? "Success" : "Warning",
            event: "Activation State",
            message: terminal.is_active
              ? "Terminal is active and can receive commands."
              : "Terminal is inactive.",
            source: "Backend",
          },
        ];
        setEvents(derivedEvents);
        setSelectedEvent(derivedEvents[0] ?? null);
      } catch {
        toast.error("Failed to load terminal logs view.");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  const filteredEvents = useMemo(() => {
    let data = events;
    if (q.trim()) {
      const keyword = q.trim().toLowerCase();
      data = data.filter(
        (item) =>
          item.event.toLowerCase().includes(keyword) ||
          item.message.toLowerCase().includes(keyword) ||
          item.source.toLowerCase().includes(keyword),
      );
    }
    if (level !== "all") data = data.filter((item) => item.level.toLowerCase() === level);
    return data;
  }, [events, level, q]);

  const totalItems = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredEvents.slice(start, start + limit);
  }, [currentPage, filteredEvents, limit]);

  const exportEvents = () => {
    if (filteredEvents.length === 0) {
      toast("No events to export.");
      return;
    }
    const csv = [
      "timestamp,level,event,message,source",
      ...filteredEvents.map((item) =>
        [
          JSON.stringify(new Date(item.at).toISOString()),
          JSON.stringify(item.level),
          JSON.stringify(item.event),
          JSON.stringify(item.message),
          JSON.stringify(item.source),
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal-${id}-events.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">
              Locations / {locationName} / {terminalName}
            </p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {terminalName} Detail
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportEvents}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Export Events
            </button>
            <Link
              href="/dashboard/endpoints-missing"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855] inline-flex items-center"
            >
              Clear Logs
            </Link>
          </div>
        </div>

        <div className="mt-3 border-b border-[#e9ebef]">
          <div className="flex items-center gap-8 text-[15px] font-semibold">
            <Link
              href={`/dashboard/terminals/${id}?tab=overview`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Overview
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/display-content?tab=display-content`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Display Content
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/functions?tab=functions`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Functions
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/logs?tab=logs`}
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
            >
              Logs
            </Link>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-[#e4e6ea] p-3">
          <p className="text-[15px] font-semibold text-[#2f3743]">Filters</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-[1.5fr_0.7fr] gap-2 items-center">
            <div className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
              <Search size={16} className="text-[#97a0ad]" />
              <input
                type="search"
                autoComplete="off"
                placeholder="Search by event, source, or message"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full text-[14px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
              />
            </div>
            <SelectMenu
              value={level}
              onChange={(value) => syncQuery({ level: value, page: 1 })}
              options={[
                { label: "All Levels", value: "all" },
                { label: "Info", value: "info" },
                { label: "Success", value: "success" },
                { label: "Warning", value: "warning" },
                { label: "Error", value: "error" },
              ]}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[2.4fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#e9ebef] bg-white">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Logs</h2>
            </div>
            <table className="w-full">
              <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                <tr className="text-[13px] text-[#6e7785] text-left">
                  <th className="px-3 py-2 font-semibold">Timestamp</th>
                  <th className="px-2 py-2 font-semibold">Log Level</th>
                  <th className="px-2 py-2 font-semibold">Event Type</th>
                  <th className="px-2 py-2 font-semibold">Message</th>
                  <th className="px-2 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[13px] text-[#717c8e]">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-b-0 border-[#edf0f4] text-[14px] bg-white"
                  >
                    <td className="px-3 py-3 text-[#2f3743]">{new Date(log.at).toLocaleString()}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${levelClass(log.level)}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[#2f3743]">{log.event}</td>
                    <td className="px-2 py-3 text-[#2f3743]">{log.message}</td>
                    <td className="px-2 py-3 text-[#2f3743]">{log.source}</td>
                    <td className="px-3 py-3 text-right text-[#7d8593]">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(log)}
                        className="rounded border border-[#dfe3e8] px-2 py-1 text-[12px]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-3 py-2 border-t border-[#e9ebef]">
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={limit}
                label="events"
                onPageChange={(nextPage) => syncQuery({ page: nextPage })}
                onPageSizeChange={(nextSize) => syncQuery({ page: 1, limit: nextSize })}
              />
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Event Detail</h2>
            <div className="mt-3 space-y-2 text-[14px]">
              <div>
                <p className="text-[#6e7785]">Full Timestamp</p>
                <p className="font-semibold text-[#2f3743]">
                  {selectedEvent ? new Date(selectedEvent.at).toLocaleString() : "-"}
                </p>
              </div>
              <div>
                <p className="text-[#6e7785]">Terminal ID</p>
                <p className="font-semibold text-[#2f3743]">{id}</p>
              </div>
              <div>
                <p className="text-[#6e7785]">Level</p>
                {selectedEvent ? (
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${levelClass(selectedEvent.level)}`}>
                    {selectedEvent.level}
                  </span>
                ) : (
                  <p className="text-[#2f3743]">-</p>
                )}
              </div>
              <div>
                <p className="text-[#6e7785]">Event</p>
                <div className="mt-1 rounded-md bg-[#f6f7f9] p-2 text-[12px] text-[#2f3743]">
                  {selectedEvent?.event ?? "-"}
                </div>
              </div>
              <div>
                <p className="text-[#6e7785]">Detailed Message</p>
                <p className="text-[#2f3743] text-[12px]">{selectedEvent?.message ?? "-"}</p>
              </div>
              <div>
                <p className="text-[#6e7785]">Source</p>
                <p className="text-[#2f3743] text-[12px]">{selectedEvent?.source ?? "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!selectedEvent) return;
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      {
                        terminal_id: id,
                        ...selectedEvent,
                      },
                      null,
                      2,
                    ),
                  );
                  toast.success("Event copied to clipboard.");
                }}
                className="mt-2 h-10 w-full rounded-lg border border-[#dfe3e8] bg-white text-[14px] font-semibold text-[#3f4653]"
              >
                Copy to clipboard
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

