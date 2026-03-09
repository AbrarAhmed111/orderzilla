"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";

type TerminalDetailFunctionsPageProps = {
  id: string;
};

type ApiTerminal = {
  name?: string;
  location_name?: string;
  mode?: "INDOOR" | "TAKEAWAY";
  is_active?: boolean;
  printer_host?: string | null;
  printer_port?: number;
  printer_width?: number;
};

const commandOptions = [
  { label: "Reload Menu", value: "RELOAD_MENU" },
  { label: "Show Message", value: "SHOW_MESSAGE" },
  { label: "Maintenance Mode", value: "MAINTENANCE_MODE" },
  { label: "Clear Maintenance", value: "CLEAR_MAINTENANCE" },
];

export default function TerminalDetailFunctionsPage({
  id,
}: TerminalDetailFunctionsPageProps) {
  const [terminal, setTerminal] = useState<ApiTerminal | null>(null);
  const [terminalName, setTerminalName] = useState(`Terminal #${id.slice(0, 6).toUpperCase()}`);
  const [locationName, setLocationName] = useState("Location");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [mode, setMode] = useState<"INDOOR" | "TAKEAWAY">("INDOOR");
  const [isActive, setIsActive] = useState(true);
  const [printerHost, setPrinterHost] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerWidth, setPrinterWidth] = useState("80");
  const [command, setCommand] = useState("RELOAD_MENU");
  const [message, setMessage] = useState("");

  const syncForm = (data: ApiTerminal) => {
    setMode(data.mode ?? "INDOOR");
    setIsActive(data.is_active ?? true);
    setPrinterHost(data.printer_host ?? "");
    setPrinterPort(String(data.printer_port ?? 9100));
    setPrinterWidth(String(data.printer_width ?? 80));
  };

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const response = (await orderzillaApi.dashboard.terminals.byId(id)) as ApiTerminal;
        setTerminal(response);
        setTerminalName(response?.name ?? `Terminal #${id.slice(0, 6).toUpperCase()}`);
        setLocationName(response?.location_name ?? "Location");
        syncForm(response);
      } catch {
        toast.error("Failed to load terminal.");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.terminals.update(id, {
        body: {
          mode,
          is_active: isActive,
          printer_host: printerHost.trim() || undefined,
          printer_port: Number(printerPort || 9100),
          printer_width: Number(printerWidth || 80),
        },
      });
      toast.success("Terminal settings saved.");
      const refreshed = (await orderzillaApi.dashboard.terminals.byId(id)) as ApiTerminal;
      setTerminal(refreshed);
      syncForm(refreshed);
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendCommand = async () => {
    if (command === "SHOW_MESSAGE" && !message.trim()) {
      toast.error("Please enter message text.");
      return;
    }
    try {
      setIsSending(true);
      await orderzillaApi.dashboard.terminals.commands.create(id, {
        body: {
          command: command as "RELOAD_MENU" | "SHOW_MESSAGE" | "MAINTENANCE_MODE" | "CLEAR_MAINTENANCE",
          payload:
            command === "SHOW_MESSAGE"
              ? ({ message: message.trim() } as unknown as Record<string, never>)
              : undefined,
        },
      });
      toast.success("Command queued.");
      if (command === "SHOW_MESSAGE") setMessage("");
    } catch {
      toast.error("Failed to send command.");
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
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
              onClick={saveSettings}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => terminal && syncForm(terminal)}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Reset to Defaults
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
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
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

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[24px] font-bold text-[#1a212c]">Terminal Runtime Settings</h2>
            <div className="mt-3 space-y-3">
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
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#2f3743]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-[#cfd5de]"
                />
                Terminal active
              </label>
              <div>
                <label className="text-[12px] text-[#6e7785]">Printer Host</label>
                <input
                  value={printerHost}
                  onChange={(event) => setPrinterHost(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                  placeholder="192.168.1.50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[24px] font-bold text-[#1a212c]">Command Actions</h2>
            <div className="mt-3 space-y-2">
              <SelectMenu value={command} onChange={setCommand} options={commandOptions} className="w-full" />
              {command === "SHOW_MESSAGE" ? (
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="h-24 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[13px]"
                  placeholder="Message shown on terminal"
                />
              ) : null}
              <button
                type="button"
                onClick={sendCommand}
                disabled={isSending}
                className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[13px] font-semibold text-[#3f4653] disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Queue Command"}
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

