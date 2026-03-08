"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";

type TerminalDetailOverviewPageProps = {
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] text-[#6e7785]">{label}</p>
      <p className="text-[16px] font-semibold text-[#222a35]">{value}</p>
    </div>
  );
}

export default function TerminalDetailOverviewPage({
  id,
}: TerminalDetailOverviewPageProps) {
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
              Send Command
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Edit Terminal
            </button>
          </div>
        </div>

        <div className="mt-3 border-b border-[#e9ebef]">
          <div className="flex items-center gap-8 text-[15px] font-semibold">
            <Link
              href={`/dashboard/terminals/${id}`}
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
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
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Logs
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-3">
          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Terminal Information</h2>
              <div className="mt-3 grid grid-cols-4 gap-4">
                <InfoItem label="Device Name / ID" value="Kiosk #2 (T2-Kiosk)" />
                <InfoItem label="Location" value="Downtown Branch" />
                <InfoItem label="Type" value="Kiosk" />
                <InfoItem label="Status" value="Online" />
                <InfoItem label="Last Seen" value="Today, 10:45 AM" />
                <InfoItem label="Software Version" value="v2.4.1" />
                <InfoItem label="IP Address" value="192.168.1.105" />
                <InfoItem label="Serial Number" value="SN-123456789" />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">System Health</h2>
              <div className="mt-3 grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="font-semibold text-[#2f3743]">Storage Usage</span>
                      <span className="font-semibold text-[#2f3743]">65% Used</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#eceef2]">
                      <div className="h-2 w-[65%] rounded-full bg-[#d7ff3f]" />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[13px] text-[#6e7785]">
                      <span>65% Used</span>
                      <span>16.5 GB of 25.4 GB</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="font-semibold text-[#2f3743]">Memory Usage</span>
                      <span className="font-semibold text-[#2f3743]">40% Used</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#eceef2]">
                      <div className="h-2 w-[40%] rounded-full bg-[#d7ff3f]" />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[13px] text-[#6e7785]">
                      <span>40% Used</span>
                      <span>3.2 GB of 8 GB</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <p className="text-[14px] font-semibold text-[#2f3743]">CPU Load</p>
                  <div className="mt-2 h-24 w-24 rounded-full border-[8px] border-[#eceef2] border-t-[#d7ff3f] flex items-center justify-center">
                    <p className="text-[24px] font-bold text-[#222a35]">25%</p>
                  </div>
                  <p className="text-[13px] text-[#6e7785]">Low Load</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[#2f3743]">Power Status</p>
                    <p className="text-[16px] font-semibold text-[#222a35]">AC Connected</p>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#2f3743]">Network Status</p>
                    <p className="text-[16px] font-semibold text-[#222a35]">Connected</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-[#eceff3] pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[31px] font-bold text-[#1a212c]">Quick Actions</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-[#2f3743]">Active</span>
                    <Toggle on />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {["Send Message", "Reload Menu", "Enter Maintenance Mode", "Reboot"].map(
                    (action, idx) => (
                      <button
                        type="button"
                        key={action}
                        className={`h-10 rounded-lg border px-4 text-[14px] font-semibold ${
                          idx === 3
                            ? "border-[#e5e7eb] bg-[#f4f6f8] text-[#9da5b2]"
                            : "border-[#dfe3e8] bg-white text-[#3f4653]"
                        }`}
                      >
                        {action}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Activity / Event Log</h2>
              <div className="mt-3 space-y-3">
                {[
                  { title: "Device Registered", time: "Oct 10, 2023 - 9:00 AM", active: true },
                  { title: "Software Updated to v2.4.1", time: "Oct 25, 2023 - 2:30 PM", active: true },
                  { title: "Menu Reloaded", time: "Today - 10:30 AM", active: true, current: true },
                  { title: "Status Changed: Offline -> Online", time: "Today - 10:40 AM", active: false },
                  { title: "Error Detected: Printer Jam", time: "Today - 10:43 AM", active: false },
                ].map((item, idx, arr) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-3.5 w-3.5 rounded-full ${
                          item.current
                            ? "bg-[#d7ff3f] ring-4 ring-[#eef8cb]"
                            : item.active
                              ? "bg-[#22b35a]"
                              : "bg-white border border-[#cfd5de]"
                        }`}
                      />
                      {idx !== arr.length - 1 && (
                        <span className="mt-1 h-7 w-[2px] bg-[#dfe4ea]" />
                      )}
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-[#222a35]">{item.title}</p>
                      <p className="text-[13px] text-[#6e7785]">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Assigned Locations</h2>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Downtown Branch", on: true },
                  { name: "Westside Mall", on: false },
                ].map((loc) => (
                  <div key={loc.name} className="flex items-center justify-between">
                    <span className="text-[16px] font-semibold text-[#2f3743]">{loc.name}</span>
                    <Toggle on={loc.on} />
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-2 h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-left text-[14px] text-[#6e7785]"
                >
                  Reassign Locations...
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

