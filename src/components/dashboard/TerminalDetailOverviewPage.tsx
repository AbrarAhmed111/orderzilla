"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";

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

const commandOptions = [
  { label: "Reload Menu", value: "RELOAD_MENU" },
  { label: "Show Message", value: "SHOW_MESSAGE" },
  { label: "Maintenance Mode", value: "MAINTENANCE_MODE" },
  { label: "Clear Maintenance", value: "CLEAR_MAINTENANCE" },
] as const;

export default function TerminalDetailOverviewPage({
  id,
}: TerminalDetailOverviewPageProps) {
  const [terminal, setTerminal] = useState<ApiTerminal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [command, setCommand] =
    useState<(typeof commandOptions)[number]["value"]>("RELOAD_MENU");
  const [commandMessage, setCommandMessage] = useState("");

  const [name, setName] = useState("");
  const [mode, setMode] = useState<"INDOOR" | "TAKEAWAY">("INDOOR");
  const [printerHost, setPrinterHost] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerWidth, setPrinterWidth] = useState("80");
  const [isActive, setIsActive] = useState(true);

  const syncForm = (data: ApiTerminal) => {
    setName(data.name ?? "");
    setMode(data.mode ?? "INDOOR");
    setPrinterHost(data.printer_host ?? "");
    setPrinterPort(String(data.printer_port ?? 9100));
    setPrinterWidth(String(data.printer_width ?? 80));
    setIsActive(data.is_active ?? true);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const response = (await orderzillaApi.dashboard.terminals.byId(id)) as ApiTerminal;
        setTerminal(response);
        syncForm(response);
      } catch {
        toast.error("Failed to load terminal details.");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  const terminalName = terminal?.name ?? `Terminal #${id.toUpperCase()}`;
  const locationName = terminal?.location_name ?? "Location";

  const lastSeen = useMemo(() => {
    if (!terminal?.last_heartbeat_at) return "Never";
    return new Date(terminal.last_heartbeat_at).toLocaleString();
  }, [terminal?.last_heartbeat_at]);

  const isDirty =
    name !== (terminal?.name ?? "") ||
    mode !== (terminal?.mode ?? "INDOOR") ||
    printerHost !== (terminal?.printer_host ?? "") ||
    Number(printerPort || 9100) !== (terminal?.printer_port ?? 9100) ||
    Number(printerWidth || 80) !== (terminal?.printer_width ?? 80) ||
    isActive !== (terminal?.is_active ?? true);

  const refreshTerminal = async () => {
    const response = (await orderzillaApi.dashboard.terminals.byId(id)) as ApiTerminal;
    setTerminal(response);
    syncForm(response);
  };

  const saveConfig = async () => {
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.terminals.update(id, {
        body: {
          name: name.trim() || undefined,
          mode,
          printer_host: printerHost.trim() || undefined,
          printer_port: Number(printerPort || 9100),
          printer_width: Number(printerWidth || 80),
          is_active: isActive,
        },
      });
      toast.success("Terminal configuration saved.");
      await refreshTerminal();
    } catch {
      toast.error("Failed to save terminal configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendCommand = async () => {
    if (command === "SHOW_MESSAGE" && !commandMessage.trim()) {
      toast.error("Message is required for SHOW_MESSAGE.");
      return;
    }
    try {
      setIsSending(true);
      await orderzillaApi.dashboard.terminals.commands.create(id, {
        body: {
          command,
          payload:
            command === "SHOW_MESSAGE"
              ? ({ message: commandMessage.trim() } as unknown as Record<string, never>)
              : undefined,
        },
      });
      toast.success("Command queued.");
      if (command === "SHOW_MESSAGE") setCommandMessage("");
    } catch {
      toast.error("Failed to queue terminal command.");
    } finally {
      setIsSending(false);
    }
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[14px] text-[#7a8291]">
              Locations / {locationName} / {terminalName}
            </p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {terminalName} Detail
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={saveConfig}
              disabled={!isDirty || isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Config"}
            </button>
            <button
              type="button"
              onClick={() => terminal && syncForm(terminal)}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Reset
            </button>
          </div>
        </div>

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

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[24px] font-bold text-[#1a212c]">Terminal Configuration</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-[#6e7785]">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Mode</label>
                <div className="mt-1">
                  <SelectMenu
                    value={mode}
                    onChange={(value) => setMode(value as "INDOOR" | "TAKEAWAY")}
                    options={[
                      { label: "Indoor", value: "INDOOR" },
                      { label: "Takeaway", value: "TAKEAWAY" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Printer Host</label>
                <input
                  value={printerHost}
                  onChange={(event) => setPrinterHost(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                  placeholder="192.168.1.50"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Printer Port</label>
                <input
                  type="number"
                  value={printerPort}
                  onChange={(event) => setPrinterPort(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Printer Width (mm)</label>
                <input
                  type="number"
                  value={printerWidth}
                  onChange={(event) => setPrinterWidth(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2f3743]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-[#cfd5de]"
                />
                Terminal is active
              </label>
            </div>
          </article>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[24px] font-bold text-[#1a212c]">Live Status</h2>
              <div className="mt-3 space-y-2 text-[13px]">
                <p className="text-[#6e7785]">
                  Code: <span className="font-semibold text-[#2f3743]">{terminal?.terminal_code ?? "-"}</span>
                </p>
                <p className="text-[#6e7785]">
                  Status: <span className="font-semibold text-[#2f3743]">{terminal?.status ?? "-"}</span>
                </p>
                <p className="text-[#6e7785]">
                  Last heartbeat: <span className="font-semibold text-[#2f3743]">{lastSeen}</span>
                </p>
                <p className="text-[#6e7785]">
                  App version: <span className="font-semibold text-[#2f3743]">{terminal?.app_version ?? "-"}</span>
                </p>
                <p className="text-[#6e7785]">
                  Battery:{" "}
                  <span className="font-semibold text-[#2f3743]">
                    {terminal?.vitals?.battery_level ?? "-"}
                    {terminal?.vitals?.battery_level !== undefined ? "%" : ""}
                  </span>
                </p>
                <p className="text-[#6e7785]">
                  Storage free:{" "}
                  <span className="font-semibold text-[#2f3743]">
                    {terminal?.vitals?.storage_free_mb ?? "-"}
                    {terminal?.vitals?.storage_free_mb !== undefined ? " MB" : ""}
                  </span>
                </p>
                <p className="text-[#6e7785]">
                  Network:{" "}
                  <span className="font-semibold text-[#2f3743]">{terminal?.vitals?.network_type ?? "-"}</span>
                </p>
                <p className="text-[#6e7785]">
                  Created:{" "}
                  <span className="font-semibold text-[#2f3743]">
                    {terminal?.created_at ? new Date(terminal.created_at).toLocaleString() : "-"}
                  </span>
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[24px] font-bold text-[#1a212c]">Command Center</h2>
              <div className="mt-3 space-y-2">
                <SelectMenu
                  value={command}
                  onChange={(value) =>
                    setCommand(value as (typeof commandOptions)[number]["value"])
                  }
                  options={commandOptions.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  className="w-full"
                />
                {command === "SHOW_MESSAGE" ? (
                  <textarea
                    value={commandMessage}
                    onChange={(event) => setCommandMessage(event.target.value)}
                    className="h-24 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[13px]"
                    placeholder="Message shown on terminal"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={sendCommand}
                  disabled={isSending}
                  className="h-10 w-full rounded-lg bg-[#d4ff00] px-4 text-[13px] font-semibold text-[#1d2512] disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Send Command"}
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

