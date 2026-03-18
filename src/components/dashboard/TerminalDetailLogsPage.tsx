"use client";

import Link from "next/link";
import { Search, RefreshCw, FileText } from "lucide-react";
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
  app_version?: string | null;
  vitals?: { network_type?: string } | null;
};

type LogLevel = "Info" | "Success" | "Warning" | "Error" | "Critical";

type TerminalLog = {
  id: string;
  timestamp: string;
  level: LogLevel;
  eventType: string;
  message: string;
  source: string;
  detailedMessage?: string;
  responseJson?: string;
  stackTrace?: string;
  deviceMetadata?: {
    os?: string;
    app?: string;
    network?: string;
  };
};

const MOCK_LOGS: TerminalLog[] = [
  {
    id: "1",
    timestamp: "2023-10-26T12:45:30",
    level: "Info",
    eventType: "System Startup",
    message: "Terminal initialized successfully. Software version v2.4.1 loaded.",
    source: "System",
    detailedMessage: "Terminal initialized successfully. Software version v2.4.1 loaded.",
    deviceMetadata: { os: "Android 12", app: "v2.4.1", network: "Wi-Fi (Strong)" },
  },
  {
    id: "2",
    timestamp: "2023-10-26T12:48:15",
    level: "Success",
    eventType: "Menu Reload",
    message: "Menu data reloaded from server.",
    source: "User Action",
    detailedMessage: "Menu data reloaded from server.",
    deviceMetadata: { os: "Android 12", app: "v2.4.1", network: "Wi-Fi (Strong)" },
  },
  {
    id: "3",
    timestamp: "2023-10-26T12:52:10",
    level: "Warning",
    eventType: "Network Stability",
    message: "Intermittent connectivity detected.",
    source: "Network",
    detailedMessage: "Intermittent connectivity detected.",
    deviceMetadata: { os: "Android 12", app: "v2.4.1", network: "Wi-Fi (Weak)" },
  },
  {
    id: "4",
    timestamp: "2023-10-26T13:05:45",
    level: "Error",
    eventType: "Payment Failure",
    message: "Transaction declined by payment gateway. Error code: 1024.",
    source: "Payment",
    detailedMessage:
      "Transaction declined by payment gateway. Error code: 1824. Request ID: req_123abc.",
    responseJson: "{ 'status': 'failed', 'error': 'insufficient_funds' }",
    stackTrace:
      "at com.orderzilla.payment.Gateway.process (Gateway.java:150)\n...",
    deviceMetadata: { os: "Android 12", app: "v2.4.1", network: "Wi-Fi (Strong)" },
  },
  {
    id: "5",
    timestamp: "2023-10-26T13:10:20",
    level: "Critical",
    eventType: "Hardware Error",
    message: "Printer paper jam detected. Requires manual intervention.",
    source: "Hardware",
    detailedMessage: "Printer paper jam detected. Requires manual intervention.",
    deviceMetadata: { os: "Android 12", app: "v2.4.1", network: "Wi-Fi (Strong)" },
  },
  {
    id: "6",
    timestamp: "2023-10-26T13:15:00",
    level: "Info",
    eventType: "Idle State",
    message: "Terminal entered idle mode after 120 seconds.",
    source: "System",
    detailedMessage: "Terminal entered idle mode after 120 seconds.",
    deviceMetadata: { os: "Android 12", app: "v2.4.1", network: "Wi-Fi (Strong)" },
  },
];

const DATE_RANGES = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

const LOG_LEVELS = [
  { value: "all", label: "All" },
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Critical" },
];

function levelClass(level: LogLevel) {
  if (level === "Info") return "bg-[#cfe2ff] text-[#2457a6]";
  if (level === "Success") return "bg-[#d5f5dc] text-[#2a6b39]";
  if (level === "Warning") return "bg-[#fde8be] text-[#855100]";
  if (level === "Critical") return "bg-[#f8d2d2] text-[#8f2a2a]";
  return "bg-[#f8d2d2] text-[#8f2a2a]";
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TerminalDetailLogsPage({ id }: TerminalDetailLogsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = Number(searchParams.get("limit") ?? "20") || 20;
  const q = searchParams.get("q") ?? "";
  const level = searchParams.get("level") ?? "all";
  const dateRange = searchParams.get("date") ?? "24h";

  const [terminalName, setTerminalName] = useState(`Terminal #${id.slice(-1)}`);
  const [terminalCode, setTerminalCode] = useState(`T${id.slice(-1)}-Kiosk`);
  const [locationName, setLocationName] = useState("Downtown Branch");
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<TerminalLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockLogs, setUseMockLogs] = useState(true);
  const [searchInput, setSearchInput] = useState(q);
  const [showSystemLogs, setShowSystemLogs] = useState(true);
  const [showUserActions, setShowUserActions] = useState(true);
  const [totalLogs, setTotalLogs] = useState(985);
  const [totalPagesLogs, setTotalPagesLogs] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

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

  const expandedLogs = useMemo(() => {
    if (!useMockLogs || logs.length === 0) return logs;
    const padded: TerminalLog[] = [];
    for (let i = 0; i < totalLogs; i++) {
      const src = logs[i % logs.length];
      padded.push({ ...src, id: `mock-${i}` });
    }
    return padded;
  }, [logs, useMockLogs, totalLogs]);

  useEffect(() => {
    if (useMockLogs && selectedLog && expandedLogs.length > 0 && !String(selectedLog.id).startsWith("mock-")) {
      const match = expandedLogs.find(
        (l) => l.eventType === selectedLog?.eventType && l.timestamp === selectedLog?.timestamp,
      );
      if (match) setSelectedLog(match);
    }
  }, [useMockLogs, expandedLogs, selectedLog]);

  const mapApiLogToTerminalLog = (entry: Record<string, unknown>): TerminalLog => ({
    id: String(entry.id ?? crypto.randomUUID()),
    timestamp: String(entry.timestamp ?? ""),
    level: (entry.level ?? "Info") as LogLevel,
    eventType: String(entry.event_type ?? ""),
    message: String(entry.message ?? ""),
    source: String(entry.source ?? ""),
    detailedMessage: entry.detailed_message as string | undefined,
    responseJson: entry.response_json as string | undefined,
    stackTrace: entry.stack_trace as string | undefined,
    deviceMetadata: entry.device_metadata as TerminalLog["deviceMetadata"],
  });

  const dateFrom = useMemo(() => {
    const now = Date.now();
    const ms =
      dateRange === "24h"
        ? 864e5
        : dateRange === "7d"
          ? 7 * 864e5
          : dateRange === "30d"
            ? 30 * 864e5
            : dateRange === "90d"
              ? 90 * 864e5
              : 864e5;
    return new Date(now - ms).toISOString().slice(0, 10);
  }, [dateRange]);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const [terminalRes, logsRes] = await Promise.all([
          orderzillaApi.dashboard.terminals.byId(id),
          orderzillaApi.dashboard.terminals.logs.list(id, {
            query: {
              page,
              limit,
              log_level: level !== "all" ? level : undefined,
              date_from: dateFrom,
            },
          }),
        ]);
        const terminal = terminalRes as ApiTerminal;
        setTerminalName(terminal?.name ?? `Terminal #${id.slice(-1)}`);
        setLocationName(terminal?.location_name ?? "Downtown Branch");
        setTerminalCode(terminal?.terminal_code ?? `T${id.slice(-1)}-Kiosk`);

        const apiLogs = (logsRes as { logs?: unknown[] })?.logs;
        if (apiLogs && Array.isArray(apiLogs)) {
          setUseMockLogs(false);
          const mapped = apiLogs.map((e) => mapApiLogToTerminalLog(e as Record<string, unknown>));
          setLogs(mapped);
          setSelectedLog(mapped[0] ?? null);
          const pagination = (logsRes as { pagination?: { total_items?: number; total_pages?: number } })?.pagination;
          setTotalLogs(pagination?.total_items ?? mapped.length);
          setTotalPagesLogs(pagination?.total_pages ?? 1);
        } else {
          setUseMockLogs(true);
          setLogs(MOCK_LOGS);
          setSelectedLog(MOCK_LOGS[3] ?? MOCK_LOGS[0] ?? null);
          setTotalLogs(985);
          setTotalPagesLogs(50);
        }
      } catch {
        toast.error("Failed to load terminal logs.");
        setTerminalName(`Terminal #${id.slice(-1)}`);
        setLocationName("Downtown Branch");
        setLogs(MOCK_LOGS);
        setSelectedLog(MOCK_LOGS[3] ?? null);
        setUseMockLogs(true);
        setTotalLogs(985);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id, page, limit, level, dateFrom]);

  const filteredLogs = useMemo(() => {
    let data = expandedLogs;
    if (q.trim()) {
      const keyword = q.trim().toLowerCase();
      data = data.filter(
        (item) =>
          item.eventType.toLowerCase().includes(keyword) ||
          item.message.toLowerCase().includes(keyword) ||
          item.source.toLowerCase().includes(keyword) ||
          item.level.toLowerCase().includes(keyword),
      );
    }
    if (level !== "all") {
      data = data.filter((item) => item.level.toLowerCase() === level);
    }
    if (!showSystemLogs) {
      data = data.filter((item) => item.source !== "System");
    }
    if (!showUserActions) {
      data = data.filter((item) => item.source !== "User Action");
    }
    return data;
  }, [expandedLogs, level, q, showSystemLogs, showUserActions]);

  const totalPages = useMockLogs
    ? Math.max(1, Math.ceil(filteredLogs.length / limit))
    : totalPagesLogs;
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    if (useMockLogs) {
      const start = (currentPage - 1) * limit;
      return filteredLogs.slice(start, start + limit);
    }
    return filteredLogs;
  }, [currentPage, filteredLogs, limit, useMockLogs]);

  const refreshLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const logsRes = await orderzillaApi.dashboard.terminals.logs.list(id, {
        query: {
          page,
          limit,
          log_level: level !== "all" ? level : undefined,
          date_from: dateFrom,
        },
      });
      const apiLogs = (logsRes as { logs?: unknown[] })?.logs;
      if (apiLogs && Array.isArray(apiLogs)) {
        const mapped = apiLogs.map((e) => mapApiLogToTerminalLog(e as Record<string, unknown>));
        setLogs(mapped);
        setUseMockLogs(false);
        setSelectedLog(mapped[0] ?? null);
        const pagination = (logsRes as { pagination?: { total_items?: number } })?.pagination;
        setTotalLogs(pagination?.total_items ?? mapped.length);
        setTotalPagesLogs((logsRes as { pagination?: { total_pages?: number } })?.pagination?.total_pages ?? 1);
      } else {
        setLogs(MOCK_LOGS);
        setUseMockLogs(true);
      }
      toast.success("Logs refreshed.");
    } catch {
      toast.error("Failed to refresh logs.");
    } finally {
      setIsLoading(false);
    }
  }, [id, page, limit, level, dateFrom]);

  const exportLogs = async () => {
    try {
      setIsExporting(true);
      const from = dateRange === "24h" ? new Date(Date.now() - 864e5) : dateRange === "7d" ? new Date(Date.now() - 7 * 864e5) : dateRange === "30d" ? new Date(Date.now() - 30 * 864e5) : dateRange === "90d" ? new Date(Date.now() - 90 * 864e5) : new Date(Date.now() - 864e5);
      const blob = await orderzillaApi.dashboard.terminals.logs.export(id, {
        body: {
          format: "CSV",
          date_range: { from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
          filters: level !== "all" ? { log_level: level } : undefined,
        },
      });
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `terminal-${id}-logs.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Logs exported.");
    } catch {
      if (filteredLogs.length > 0) {
        const csv = [
          "timestamp,level,event_type,message,source",
          ...filteredLogs.map((item) =>
            [
              JSON.stringify(formatTimestamp(item.timestamp)),
              JSON.stringify(item.level),
              JSON.stringify(item.eventType),
              JSON.stringify(item.message),
              JSON.stringify(item.source),
            ].join(","),
          ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `terminal-${id}-logs.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Logs exported (client-side).");
      } else {
        toast("No logs to export.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const clearLogs = async () => {
    try {
      setIsClearing(true);
      await orderzillaApi.dashboard.terminals.logs.delete(id);
      setLogs([]);
      setSelectedLog(null);
      setTotalLogs(0);
      setTotalPagesLogs(1);
      setUseMockLogs(false);
      toast.success("Logs cleared.");
    } catch {
      toast.error("Failed to clear logs.");
    } finally {
      setIsClearing(false);
    }
  };

  const copyToClipboard = () => {
    if (!selectedLog) return;
    const text = [
      `Full Timestamp: ${formatTimestamp(selectedLog.timestamp)}`,
      `Terminal ID: ${terminalCode}`,
      `Log Level: ${selectedLog.level}`,
      `Event Type: ${selectedLog.eventType}`,
      `Detailed Message: ${selectedLog.detailedMessage ?? selectedLog.message}`,
      selectedLog.responseJson ? `Response: ${selectedLog.responseJson}` : "",
      selectedLog.stackTrace ? `Stack Trace: ${selectedLog.stackTrace}` : "",
      selectedLog.deviceMetadata
        ? `Device Metadata: OS ${selectedLog.deviceMetadata.os}, App ${selectedLog.deviceMetadata.app}, Network ${selectedLog.deviceMetadata.network}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard.");
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  const displayLogs = paginatedLogs;
  const displayTotalPages = totalPages;

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="text-[14px] text-[#7a8291]">
              <Link href="/dashboard/terminals" className="hover:text-[#2f3743]">
                Locations
              </Link>
              <span className="mx-1">/</span>
              <span className="font-semibold text-[#2f3743]">{locationName}</span>
              <span className="mx-1">/</span>
              <span>{terminalName}</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {terminalName} Detail
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportLogs}
              disabled={isExporting}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Export Logs"}
            </button>
            <button
              type="button"
              onClick={clearLogs}
              disabled={isClearing}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855] disabled:opacity-50"
            >
              {isClearing ? "Clearing..." : "Clear Logs"}
            </button>
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


        {/* Filters & Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="h-10 flex-1 min-w-[200px] max-w-md rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
            <Search size={16} className="text-[#97a0ad]" />
            <input
              type="search"
              autoComplete="off"
              placeholder="Search by keyword, error code, or event..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full text-[14px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
            />
          </div>
          <SelectMenu
            value={dateRange}
            onChange={(v) => syncQuery({ date: v, page: 1 })}
            options={DATE_RANGES}
            className="w-[160px]"
          />
          <SelectMenu
            value={level}
            onChange={(v) => syncQuery({ level: v, page: 1 })}
            options={LOG_LEVELS}
            className="w-[120px]"
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#363f4c]">Show system logs</span>
              <button
                type="button"
                role="switch"
                aria-checked={showSystemLogs}
                onClick={() => setShowSystemLogs((v) => !v)}
                className={`h-6 w-11 rounded-full transition-colors ${
                  showSystemLogs ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    showSystemLogs ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#363f4c]">Show user actions</span>
              <button
                type="button"
                role="switch"
                aria-checked={showUserActions}
                onClick={() => setShowUserActions((v) => !v)}
                className={`h-6 w-11 rounded-full transition-colors ${
                  showUserActions ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    showUserActions ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshLogs}
            className="h-10 w-10 rounded-lg border border-[#dfe3e8] bg-white flex items-center justify-center text-[#6e7785] hover:text-[#2f3743]"
            aria-label="Refresh logs"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
          <article className="rounded-xl border border-[#e4e6ea] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#e9ebef] bg-white">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                  <tr className="text-[12px] text-[#6e7785] text-left">
                    <th className="px-3 py-2 font-semibold">Timestamp</th>
                    <th className="px-2 py-2 font-semibold">Log Level</th>
                    <th className="px-2 py-2 font-semibold">Event Type</th>
                    <th className="px-2 py-2 font-semibold">Message</th>
                    <th className="px-2 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-[13px] text-[#717c8e]">
                        No logs found.
                      </td>
                    </tr>
                  ) : (
                    displayLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`border-b last:border-b-0 border-[#edf0f4] text-[13px] cursor-pointer transition-colors ${
                          selectedLog?.id === log.id ? "bg-[#f0f4e8]" : "bg-white hover:bg-[#f9fafb]"
                        }`}
                      >
                        <td className="px-3 py-3 text-[#2f3743] whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-2 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${levelClass(log.level)}`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-[#2f3743]">{log.eventType}</td>
                        <td className="px-2 py-3 text-[#2f3743] max-w-[200px] truncate">
                          {log.message}
                        </td>
                        <td className="px-2 py-3 text-[#2f3743]">{log.source}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-1.5 text-[#6e7785] hover:text-[#2f3743] rounded"
                            aria-label="View log detail"
                          >
                            <FileText size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-[#e9ebef] bg-[#fafbfc]">
              <TablePagination
                page={currentPage}
                totalPages={displayTotalPages}
                totalItems={useMockLogs ? filteredLogs.length : totalLogs}
                pageSize={limit}
                pageSizeOptions={[10, 20, 50]}
                label="logs"
                onPageChange={(nextPage) => syncQuery({ page: nextPage })}
                onPageSizeChange={(nextSize) => syncQuery({ page: 1, limit: nextSize })}
              />
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Log Detail</h2>
            <div className="mt-4 space-y-4 text-[14px]">
              <div>
                <p className="text-[12px] font-semibold text-[#6e7785] mb-1">Full Timestamp</p>
                <p className="font-medium text-[#2f3743]">
                  {selectedLog ? formatTimestamp(selectedLog.timestamp) : "-"}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#6e7785] mb-1">Terminal ID</p>
                <p className="font-medium text-[#2f3743]">{terminalCode}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#6e7785] mb-1">Log Level</p>
                {selectedLog ? (
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold ${levelClass(selectedLog.level)}`}
                  >
                    {selectedLog.level}
                  </span>
                ) : (
                  <p className="text-[#2f3743]">-</p>
                )}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#6e7785] mb-1">Detailed Message</p>
                <div className="rounded-lg bg-[#f6f7f9] p-3 text-[12px] text-[#2f3743] font-mono whitespace-pre-wrap break-words">
                  {selectedLog?.detailedMessage ?? selectedLog?.message ?? "-"}
                  {selectedLog?.responseJson && (
                    <>
                      {"\n\nResponse:\n"}
                      {selectedLog.responseJson}
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#6e7785] mb-1">Stack Trace</p>
                <div className="rounded-lg bg-[#f6f7f9] p-3 text-[12px] text-[#2f3743] font-mono whitespace-pre-wrap break-words">
                  {selectedLog?.stackTrace ?? "-"}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#6e7785] mb-1">Device Metadata</p>
                <div className="rounded-lg bg-[#f6f7f9] p-3 text-[12px] text-[#2f3743] space-y-1">
                  {selectedLog?.deviceMetadata ? (
                    <>
                      <p>OS: {selectedLog.deviceMetadata.os ?? "-"}</p>
                      <p>App: {selectedLog.deviceMetadata.app ?? "-"}</p>
                      <p>Network: {selectedLog.deviceMetadata.network ?? "-"}</p>
                    </>
                  ) : (
                    <p className="italic text-[#8a92a0]">-</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white text-[14px] font-semibold text-[#3f4653] hover:bg-[#f9fafb]"
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
