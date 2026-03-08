"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { useMemo, useState } from "react";
import TablePagination from "@/components/dashboard/ui/TablePagination";

const groups = [
  {
    name: "Burger Modifiers",
    type: "Optional",
    selectionType: "Multi-select",
    options: "10 Options",
    active: true,
    selected: true,
  },
  {
    name: "Drink Sizes",
    type: "Required",
    selectionType: "Single select",
    options: "3 Options",
    active: true,
    selected: true,
  },
  {
    name: "Side Choices",
    type: "Optional",
    selectionType: "Single select",
    options: "5 Options",
    active: true,
    selected: false,
  },
  {
    name: "Sauce Selection",
    type: "Optional",
    selectionType: "Multi-select",
    options: "8 Options",
    active: true,
    selected: true,
  },
  {
    name: "Dessert Toppings",
    type: "Optional",
    selectionType: "Multi-select",
    options: "6 Options",
    active: false,
    selected: false,
  },
  {
    name: "Side Choices",
    type: "Optional",
    selectionType: "Multi-select",
    options: "5 Options",
    active: false,
    selected: false,
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
        className={`h-5 w-5 rounded-full bg-[#1f2631] shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1 bg-white"
        }`}
      />
    </span>
  );
}

export default function ExtraGroupsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = groups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groups.slice(start, start + pageSize);
  }, [currentPage, pageSize]);

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">
            Extra Groups
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Import
            </button>
            <Link
              href="/dashboard/extra-groups/create-extra-group"
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              + Add Extra Group
            </Link>
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
                <th className="px-2 py-2 font-semibold">Group Name</th>
                <th className="px-2 py-2 font-semibold">Type</th>
                <th className="px-2 py-2 font-semibold">Selection Type</th>
                <th className="px-2 py-2 font-semibold">Number of Options</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((group, index) => (
                <tr
                  key={`${group.name}-${index}`}
                  className={`border-b last:border-b-0 border-[#edf0f4] text-[15px] ${
                    index === 0 || index === 3 || index === 4 ? "bg-[#f8f9fb]" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      defaultChecked={group.selected}
                      className="h-4 w-4 rounded border-[#cfd5de]"
                    />
                  </td>
                  <td
                    className={`px-2 py-3 font-semibold ${
                      !group.active ? "text-[#9aa2af]" : "text-[#222a35]"
                    }`}
                  >
                    {group.name}
                  </td>
                  <td className={`px-2 py-3 ${!group.active ? "text-[#a2aab6]" : "text-[#3e4653]"}`}>
                    {group.type}
                  </td>
                  <td className={`px-2 py-3 ${!group.active ? "text-[#a2aab6]" : "text-[#3e4653]"}`}>
                    {group.selectionType}
                  </td>
                  <td className={`px-2 py-3 ${!group.active ? "text-[#a2aab6]" : "text-[#3e4653]"}`}>
                    {group.options}
                  </td>
                  <td className="px-2 py-3">
                    <Toggle on={group.active} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" className="text-[#808998]">
                      <Ellipsis size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex items-center justify-between">
          <p className="text-[14px] font-medium text-[#6e7785]">3 extra groups selected</p>
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
              className="h-10 rounded-lg border border-[#efc3c3] bg-[#fff7f7] px-6 text-[14px] font-semibold text-[#cf4a4a]"
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
    </div>
  );
}

