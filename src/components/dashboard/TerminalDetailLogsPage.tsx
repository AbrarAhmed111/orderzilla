"use client";

import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";

type TerminalDetailLogsPageProps = {
  id: string;
};

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </span>
  );
}

function levelClass(level: string) {
  if (level === "Info") return "bg-[#cfe2ff] text-[#2457a6]";
  if (level === "Success") return "bg-[#d5f5dc] text-[#2a6b39]";
  if (level === "Warning") return "bg-[#fde8be] text-[#855100]";
  if (level === "Error") return "bg-[#f8d2d2] text-[#8f2a2a]";
  return "bg-[#ead4d4] text-[#7e2222]";
}

const logs = [
  {
    timestamp: "Oct 26, 2023 - 12:45:30 PM",
    level: "Info",
    event: "System Startup",
    message: "Terminal initialized successfully. Software version v2.4.1 loaded.",
    source: "System",
  },
  {
    timestamp: "Oct 26, 2023 - 12:48:15 PM",
    level: "Success",
    event: "Menu Reload",
    message: "Menu data reloaded from server.",
    source: "User Action",
  },
  {
    timestamp: "Oct 26, 2023 - 12:52:10 PM",
    level: "Warning",
    event: "Network Stability",
    message: "Intermittent connectivity detected.",
    source: "Network",
  },
  {
    timestamp: "Oct 26, 2023 - 1:05:45 PM",
    level: "Error",
    event: "Payment Failure",
    message: "Transaction declined by payment gateway. Error code: 1024.",
    source: "Payment",
  },
  {
    timestamp: "Oct 26, 2023 - 1:10:20 PM",
    level: "Critib1B",
    event: "Hardware Error",
    message: "Printer paper jam detected. Requires manual intervention.",
    source: "Hardware",
  },
  {
    timestamp: "Oct 26, 2023 - 1:15:00 PM",
    level: "Info",
    event: "Idle State",
    message: "Terminal entered idle mode after 120 seconds.",
    source: "System",
  },
];

export default function TerminalDetailLogsPage({ id }: TerminalDetailLogsPageProps) {
  const [terminalName, setTerminalName] = useState(`Terminal #${id.toUpperCase()}`);
  const [locationName, setLocationName] = useState("Location");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      const terminal = await orderzillaApi.dashboard.terminals.byId(id);
      setTerminalName(terminal?.name ?? `Terminal #${id.toUpperCase()}`);
      setLocationName(terminal?.location_name ?? "Location");
      setIsLoading(false);
    };
    run();
  }, [id]);

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
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Export Logs
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="mt-3 border-b border-[#e9ebef]">
          <div className="flex items-center gap-8 text-[15px] font-semibold">
            <Link
              href={`/dashboard/terminals/${id}`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Overview
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/display-content`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Display Content
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/functions`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Functions
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/logs`}
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
            >
              Logs
            </Link>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-[#e4e6ea] p-3">
          <p className="text-[15px] font-semibold text-[#2f3743]">Filters & Controls Row</p>
          <div className="mt-2 grid grid-cols-[1.5fr_0.7fr_0.7fr_1fr_auto] gap-2 items-center">
            <div className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
              <Search size={16} className="text-[#97a0ad]" />
              <input
                placeholder="Search by keyword, error code, or event..."
                className="w-full text-[14px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
              />
            </div>
            <button className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-3 inline-flex items-center justify-between text-[14px] text-[#2f3743]">
              <span>Last 24 Hours</span>
              <ChevronDown size={14} />
            </button>
            <button className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-3 inline-flex items-center justify-between text-[14px] text-[#2f3743]">
              <span>All</span>
              <ChevronDown size={14} />
            </button>
            <div className="flex items-center gap-4 justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-[#2f3743]">On</span>
                <Toggle on />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-[#2f3743]">On</span>
                <Toggle on />
              </div>
            </div>
            <button className="h-10 w-10 rounded-lg border border-[#dfe3e8] bg-white text-[#7d8593]">
              C
            </button>
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
                {logs.map((log, idx) => (
                  <tr
                    key={`${log.timestamp}-${idx}`}
                    className={`border-b last:border-b-0 border-[#edf0f4] text-[14px] ${
                      idx === 3 ? "bg-[#f4f6f8]" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-3 text-[#2f3743]">{log.timestamp}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${levelClass(
                          log.level,
                        )}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[#2f3743]">{log.event}</td>
                    <td className="px-2 py-3 text-[#2f3743]">{log.message}</td>
                    <td className="px-2 py-3 text-[#2f3743]">{log.source}</td>
                    <td className="px-3 py-3 text-right text-[#7d8593]">📄</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 border-t border-[#e9ebef] flex items-center justify-between text-[14px] text-[#5f6875]">
              <div className="flex items-center gap-2">
                <span>Page</span>
                <span className="h-8 w-8 rounded-md border border-[#dfe3e8] inline-flex items-center justify-center">
                  1
                </span>
                <span>of 50</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Rows per page: 20</span>
                <span>Total Logs: 985</span>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Log Detail</h2>
            <div className="mt-3 space-y-2 text-[14px]">
              <div>
                <p className="text-[#6e7785]">Full Timestamp</p>
                <p className="font-semibold text-[#2f3743]">Oct 26, 2023 - 1:05:45 PM</p>
              </div>
              <div>
                <p className="text-[#6e7785]">Terminal ID</p>
                <p className="font-semibold text-[#2f3743]">T2-Kiosk</p>
              </div>
              <div>
                <p className="text-[#6e7785]">Log Level:</p>
                <span className="rounded-full bg-[#f8d2d2] px-2.5 py-1 text-[12px] font-semibold text-[#8f2a2a]">
                  Error
                </span>
              </div>
              <div>
                <p className="text-[#6e7785]">Detailed Message</p>
                <div className="mt-1 rounded-md bg-[#f6f7f9] p-2 text-[12px] text-[#2f3743]">
                  Transaction declined by payment gateway. Error code: 1024.
                  Request ID: req_123abc Response:
                  <br />
                  {'{ "status": "failed", "error": "insufficient_funds" }'}
                </div>
              </div>
              <div>
                <p className="text-[#6e7785]">Stack Trace</p>
                <p className="text-[#2f3743] text-[12px]">
                  at com.orderzilla.payment.Gateway.process (Gateway.java:150) ...
                </p>
              </div>
              <div>
                <p className="text-[#6e7785]">Device Metadata</p>
                <p className="text-[#2f3743] text-[12px]">
                  OS: Android 12
                  <br />
                  App: v2.4.1
                  <br />
                  Network: Wi-Fi (Strong)
                </p>
              </div>
              <button className="mt-2 h-10 w-full rounded-lg border border-[#dfe3e8] bg-white text-[14px] font-semibold text-[#3f4653]">
                Copy to clipboard
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

