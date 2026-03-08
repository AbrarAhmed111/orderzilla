"use client";

import Link from "next/link";
import { ChevronDown, Ellipsis } from "lucide-react";
import { useMemo, useState } from "react";
import TablePagination from "@/components/dashboard/ui/TablePagination";

const terminals = [
  {
    id: "t1-kiosk",
    name: "Kiosk #1 (T1-Kiosk)",
    location: "Downtown Branch",
    type: "Kiosk",
    status: "Online",
    lastSeen: "Today, 10:45 AM",
    version: "v2.4.1",
    enabled: true,
    selected: true,
    dot: "bg-[#24b458]",
  },
  {
    id: "t2-kiosk",
    name: "Kiosk #2 (T2-Kiosk)",
    location: "Westside Mall",
    type: "Kiosk",
    status: "Maintenance",
    lastSeen: "Yesterday, 3:20 PM",
    version: "v2.4.0",
    enabled: true,
    selected: true,
    dot: "bg-[#d6c225]",
  },
  {
    id: "t3-tab",
    name: "Tablet #1 (T3-Tab)",
    location: "Uptown Station",
    type: "Tablet",
    status: "Offline",
    lastSeen: "Oct 26, 5:12 PM",
    version: "v2.3.9",
    enabled: false,
    selected: false,
    dot: "bg-[#b7bcc5]",
  },
  {
    id: "t4-self",
    name: "Self-check #3 (T4-Self)",
    location: "Downtown Branch",
    type: "Self-check",
    status: "Error",
    lastSeen: "Today, 8:30 AM",
    version: "v2.4.1",
    enabled: true,
    selected: true,
    dot: "bg-[#e13f3f]",
  },
  {
    id: "t5-kiosk",
    name: "Kiosk #3 (T5-Kiosk)",
    location: "Westside Mall",
    type: "Kiosk",
    status: "Online",
    lastSeen: "Today, 11:02 AM",
    version: "v2.4.1",
    enabled: true,
    selected: false,
    dot: "bg-[#24b458]",
  },
];

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

function statusClass(status: string) {
  if (status === "Online") return "bg-[#d5f5dc] text-[#2a6b39]";
  if (status === "Maintenance") return "bg-[#fde8be] text-[#855100]";
  if (status === "Error") return "bg-[#f8d2d2] text-[#8f2a2a]";
  return "bg-[#eceef2] text-[#5f6875]";
}

function FilterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-3 inline-flex items-center gap-2 text-[14px] text-[#424a56]"
    >
      <span>{label}</span>
      <ChevronDown size={14} />
    </button>
  );
}

export default function TerminalsLocationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = terminals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return terminals.slice(start, start + pageSize);
  }, [currentPage, pageSize]);

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">
            Terminals & Locations
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              + Add Terminal
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Import Locations
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#768091]">Location filter</span>
            <FilterButton label="All Locations" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-[#768091]">Status filter</span>
            <FilterButton label="All Statuses" />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#e4e6ea] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
              <tr className="text-[13px] text-[#6e7785] text-left">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#cfd5de]"
                    defaultChecked
                  />
                </th>
                <th className="px-2 py-2 font-semibold">Terminal Name / Device ID</th>
                <th className="px-2 py-2 font-semibold">Location</th>
                <th className="px-2 py-2 font-semibold">Type</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Last Seen</th>
                <th className="px-2 py-2 font-semibold">Software Version</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((terminal) => (
                <tr
                  key={terminal.id}
                  className="border-b last:border-b-0 border-[#edf0f4] text-[15px]"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      defaultChecked={terminal.selected}
                      className="h-4 w-4 rounded border-[#cfd5de]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${terminal.dot}`} />
                      <Link
                        href={`/dashboard/terminals/${terminal.id}`}
                        className="font-semibold text-[#222a35] hover:underline"
                      >
                        {terminal.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{terminal.location}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{terminal.type}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${statusClass(
                        terminal.status,
                      )}`}
                    >
                      {terminal.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{terminal.lastSeen}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{terminal.version}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Toggle on={terminal.enabled} />
                      <button type="button" className="text-[#808998]">
                        <Ellipsis size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex items-center justify-between">
          <p className="text-[14px] font-medium text-[#6e7785]">3 terminals selected</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[14px] font-semibold text-[#3f4653]"
            >
              Activate
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[14px] font-semibold text-[#3f4653]"
            >
              Deactivate
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[14px] font-semibold text-[#3f4653]"
            >
              Send Command
            </button>
            <button
              type="button"
              className="h-10 rounded-lg bg-[#ef4a4c] px-6 text-[14px] font-semibold text-white"
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
          label="terminals"
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

