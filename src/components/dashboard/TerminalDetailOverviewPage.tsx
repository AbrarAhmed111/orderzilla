"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plug, Wifi, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type TerminalDetailOverviewPageProps = {
  id: string;
};

type ApiTerminal = {
  id?: string;
  terminal_code?: string;
  name?: string;
  mode?: "INDOOR" | "TAKEAWAY";
  status?: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "ERROR";
  last_heartbeat_at?: string | null;
  app_version?: string | null;
  printer_host?: string | null;
  printer_port?: number;
  printer_width?: number;
  is_active?: boolean;
  location_name?: string;
  created_at?: string;
  vitals?: {
    battery_level?: number;
    storage_free_mb?: number;
    network_type?: string;
  } | null;
};

type ActivityEvent = {
  id: string;
  label: string;
  at: string;
  done: boolean;
  current?: boolean;
};

type AssignedLocation = {
  id: string;
  name: string;
  enabled: boolean;
};


const commandOptions = [
  { label: "Reload Menu", value: "RELOAD_MENU" },
  { label: "Show Message", value: "SHOW_MESSAGE" },
  { label: "Maintenance Mode", value: "MAINTENANCE_MODE" },
  { label: "Clear Maintenance", value: "CLEAR_MAINTENANCE" },
] as const;

function formatLastSeen(iso?: string | null) {
  if (!iso) return EMPTY_VALUE;
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return isToday
    ? `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

export default function TerminalDetailOverviewPage({ id }: TerminalDetailOverviewPageProps) {
  const [terminal, setTerminal] = useState<ApiTerminal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [command, setCommand] =
    useState<(typeof commandOptions)[number]["value"]>("RELOAD_MENU");
  const [commandMessage, setCommandMessage] = useState("");
  const [assignedLocations, setAssignedLocations] = useState<AssignedLocation[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState("");

  const deviceName = toDisplayValue(terminal?.name, EMPTY_VALUE);
  const deviceId = toDisplayValue(terminal?.terminal_code, EMPTY_VALUE);
  const locationName = toDisplayValue(terminal?.location_name, EMPTY_VALUE);
  const lastSeen = formatLastSeen(terminal?.last_heartbeat_at) || EMPTY_VALUE;
  const softwareVersion = toDisplayValue(terminal?.app_version, EMPTY_VALUE);
  const typeLabel = terminal?.mode === "TAKEAWAY" ? "Takeaway" : "Kiosk";
  const statusLabel = terminal?.status ?? "ONLINE";
  const isActive = terminal?.is_active ?? true;

  const storageUsedPct = terminal?.vitals?.storage_free_mb != null
    ? Math.round(100 - (terminal.vitals.storage_free_mb / 25400) * 100)
    : 65;
  const storageUsedGb = terminal?.vitals?.storage_free_mb != null
    ? ((25400 - terminal.vitals.storage_free_mb) / 1000).toFixed(1)
    : "16.5";
  const storageTotalGb = "25.4";

  const memoryUsedPct = 40;
  const memoryUsedGb = "3.2";
  const memoryTotalGb = "8";

  const cpuLoad = 25;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = (await orderzillaApi.dashboard.terminals.byId(id)) as ApiTerminal;
      setTerminal(response);
      const apiLocs = (response as { assigned_locations?: AssignedLocation[] })?.assigned_locations;
      setAssignedLocations(
        Array.isArray(apiLocs) && apiLocs.length > 0
          ? apiLocs
          : response?.location_name
            ? [{ id: "loc-1", name: response.location_name, enabled: true }]
            : [],
      );
      const apiActivity = (response as { activity_events?: ActivityEvent[] })?.activity_events;
      setActivityEvents(
        Array.isArray(apiActivity) && apiActivity.length > 0
          ? apiActivity
          : response?.created_at && typeof response.created_at === "string"
            ? [
                {
                  id: "1",
                  label: "Device Registered",
                  at: new Date(response.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                  done: true,
                },
              ]
            : [],
      );
    } catch {
      setError("Failed to load terminal details.");
      setTerminal(null);
      setAssignedLocations([]);
      setActivityEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendCommand = async (
    cmd?: (typeof commandOptions)[number]["value"],
  ) => {
    const effectiveCmd = cmd ?? command;
    if (effectiveCmd === "SHOW_MESSAGE" && !commandMessage.trim()) {
      toast.error("Message is required for SHOW_MESSAGE.");
      return;
    }
    try {
      setIsSending(true);
      await orderzillaApi.dashboard.terminals.commands.create(id, {
        body: {
          command: effectiveCmd,
          payload:
            effectiveCmd === "SHOW_MESSAGE"
              ? ({ message: commandMessage.trim() } as unknown as Record<string, never>)
              : undefined,
        },
      });
      toast.success("Command queued.");
      if (effectiveCmd === "SHOW_MESSAGE") setCommandMessage("");
    } catch {
      toast.error("Failed to queue terminal command.");
    } finally {
      setIsSending(false);
    }
  };

  const toggleLocation = (locId: string) => {
    setAssignedLocations((prev) =>
      prev.map((l) => (l.id === locId ? { ...l, enabled: !l.enabled } : l)),
    );
  };

  const toggleActive = async () => {
    const next = !isActive;
    setTerminal((prev) => (prev ? { ...prev, is_active: next } : null));
    try {
      await orderzillaApi.dashboard.terminals.update(id, {
        body: { is_active: next },
      });
      toast.success(next ? "Terminal activated." : "Terminal deactivated.");
    } catch {
      setTerminal((prev) => (prev ? { ...prev, is_active: !next } : null));
      toast.error("Failed to update terminal status.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  if (error && !terminal) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/terminals"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Terminals
          </Link>
          <div className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
            {error}{" "}
            <button type="button" onClick={fetchData} className="font-semibold underline">
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

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
              <span>{deviceName}</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {deviceName} Detail
            </h1>
            <div className="mt-3 border-b border-[#e9ebef]">
              <div className="flex items-center gap-8 text-[15px] font-semibold">
                <Link
                  href={`/dashboard/terminals/${id}?tab=overview`}
                  className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
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
                  className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
                >
                  Logs
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => sendCommand()}
              disabled={isSending}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send Command"}
            </button>
            <Link
              href={`/dashboard/terminals/${id}/functions`}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#414855]"
            >
              Edit Terminal
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Terminal Information</h2>
              <div className="mt-4 space-y-3 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">Device Name / ID</span>
                  <span className="font-semibold text-[#2f3743]">
                    {deviceName} ({deviceId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">Location</span>
                  <span className="font-bold text-[#2f3743]">{locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">Type</span>
                  <span className="font-semibold text-[#2f3743]">{typeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">Last Seen</span>
                  <span className="font-semibold text-[#2f3743]">{lastSeen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">Software Version</span>
                  <span className="font-semibold text-[#2f3743]">{softwareVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">IP Address</span>
                  <span className="font-semibold text-[#2f3743]">
                    {toDisplayValue((terminal as { ip_address?: string })?.ip_address, EMPTY_VALUE)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6e7785]">Status</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      statusLabel === "ONLINE"
                        ? "bg-[#d4ff00] text-[#1d2512]"
                        : statusLabel === "OFFLINE"
                          ? "bg-[#e5e7eb] text-[#6b7280]"
                          : statusLabel === "ERROR"
                            ? "bg-[#fee2e2] text-[#991b1b]"
                            : "bg-[#fef3c7] text-[#92400e]"
                    }`}
                  >
                    {statusLabel === "ONLINE" ? "Online" : statusLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e7785]">Serial Number</span>
                  <span className="font-semibold text-[#2f3743]">
                    {toDisplayValue((terminal as { serial_number?: string })?.serial_number, EMPTY_VALUE)}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">System Health</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[14px] mb-1">
                    <span className="text-[#6e7785]">Storage Usage</span>
                    <span className="font-semibold text-[#2f3743]">{storageUsedPct}% Used</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
                    <div
                      className="h-full bg-[#d4ff00] rounded-full transition-all"
                      style={{ width: `${Math.min(storageUsedPct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-[#6e7785]">
                    {storageUsedGb} GB of {storageTotalGb} GB
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-[14px] mb-1">
                    <span className="text-[#6e7785]">Memory Usage</span>
                    <span className="font-semibold text-[#2f3743]">{memoryUsedPct}% Used</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e5e7eb] overflow-hidden">
                    <div
                      className="h-full bg-[#d4ff00] rounded-full transition-all"
                      style={{ width: `${memoryUsedPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-[#6e7785]">
                    {memoryUsedGb} GB of {memoryTotalGb} GB
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#d4ff00"
                        strokeWidth="2"
                        strokeDasharray={`${cpuLoad} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#2f3743]">
                      {cpuLoad}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#2f3743]">CPU Load</p>
                    <p className="text-[12px] text-[#6e7785]">Low Load</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Plug size={20} className="text-[#6e7785]" />
                  <span className="text-[14px] font-semibold text-[#2f3743]">
                    {toDisplayValue((terminal as { power_status?: string })?.power_status, EMPTY_VALUE)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Wifi size={20} className="text-[#6e7785]" />
                  <span className="text-[14px] font-semibold text-[#2f3743]">
                    {toDisplayValue((terminal as { network_status?: string })?.network_status, EMPTY_VALUE)}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Quick Actions</h2>
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sendCommand("SHOW_MESSAGE")}
                    disabled={isSending}
                    className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[13px] font-semibold text-[#414855] disabled:opacity-50"
                  >
                    Send Message
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCommand("RELOAD_MENU")}
                    disabled={isSending}
                    className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[13px] font-semibold text-[#414855] disabled:opacity-50"
                  >
                    Reload Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => sendCommand("MAINTENANCE_MODE")}
                    disabled={isSending}
                    className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[13px] font-semibold text-[#414855] disabled:opacity-50"
                  >
                    Enter Maintenance Mode
                  </button>
                  <button
                    type="button"
                    disabled
                    className="h-9 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 text-[13px] font-semibold text-[#9ca3af] cursor-not-allowed"
                  >
                    Reboot
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[14px] font-semibold text-[#363f4c]">Active</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={toggleActive}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      isActive ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isActive ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Activity / Event Log</h2>
              <div className="mt-4 space-y-0">
                {activityEvents.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full ${
                          event.current
                            ? "border-2 border-[#d4ff00] bg-[#edf8c6]"
                            : event.done
                              ? "bg-[#22c55e]"
                              : "border-2 border-[#c8ced7] bg-white"
                        }`}
                      />
                      {index !== activityEvents.length - 1 && (
                        <div
                          className={`mt-1 h-6 shrink-0 ${
                            event.done ? "w-0.5 bg-[#22c55e]" : "w-0 border-l-2 border-dashed border-[#d1d5db]"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-[14px] font-semibold ${
                          event.done ? "text-[#1e2530]" : "text-[#8a92a0]"
                        }`}
                      >
                        {event.label}
                      </p>
                      <p className="text-[12px] text-[#656f7d]">{event.at}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Assigned Locations</h2>
              <div className="mt-4 space-y-3">
                {assignedLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between rounded-lg border border-[#e5e7eb] px-3 py-2"
                  >
                    <span className="text-[14px] font-semibold text-[#2f3743]">{loc.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1 text-[#6e7785] hover:text-[#2f3743]"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={loc.enabled}
                        onClick={() => toggleLocation(loc.id)}
                        className={`h-5 w-9 rounded-full transition-colors ${
                          loc.enabled ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            loc.enabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-[14px] font-medium text-[#6b7280] text-left flex items-center justify-between"
                >
                  Reassign Locations...
                  <span className="text-[#9ca3af]">▼</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
