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

type TerminalDetailDisplayContentPageProps = {
  id: string;
};

type ApiTerminal = { name?: string; location_name?: string };
type OverrideRow = {
  id: string;
  name: string;
  category: string;
  isVisible: boolean;
  isSoldOut: boolean;
  sortOverride: string;
};

export default function TerminalDetailDisplayContentPage({
  id,
}: TerminalDetailDisplayContentPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = Number(searchParams.get("limit") ?? "10") || 10;
  const q = searchParams.get("q") ?? "";
  const visibility = searchParams.get("visibility") ?? "all";
  const sold = searchParams.get("sold") ?? "all";

  const [terminalName, setTerminalName] = useState(`Terminal #${id.slice(0, 6).toUpperCase()}`);
  const [locationName, setLocationName] = useState("Location");
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      const nextQ = searchInput.trim();
      if (nextQ === q) return;
      syncQuery({ q: nextQ || undefined, page: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, searchInput, syncQuery]);

  const load = useCallback(async () => {
    const run = async () => {
      try {
        setIsLoading(true);
        const [terminalResponse, overrideResponse] = await Promise.all([
          orderzillaApi.dashboard.terminals.byId(id),
          orderzillaApi.dashboard.terminals.products.list(id),
        ]);
        const terminal = terminalResponse as ApiTerminal;
        setTerminalName(terminal?.name ?? `Terminal #${id.slice(0, 6).toUpperCase()}`);
        setLocationName(terminal?.location_name ?? "Location");
        const products = ((overrideResponse as { products?: Array<Record<string, unknown>> })?.products ??
          []) as Array<Record<string, unknown>>;
        setRows(
          products.map((item) => ({
            id: String(item.id ?? ""),
            name: String(item.name ?? "Unnamed product"),
            category: String(item.category_name ?? "-"),
            isVisible: Boolean(item.is_visible ?? true),
            isSoldOut: Boolean(item.is_sold_out ?? false),
            sortOverride:
              item.sort_override === null || item.sort_override === undefined
                ? ""
                : String(item.sort_override),
          })),
        );
      } catch {
        toast.error("Failed to load terminal display content.");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    let data = rows;
    if (q.trim()) {
      const keyword = q.trim().toLowerCase();
      data = data.filter(
        (row) =>
          row.name.toLowerCase().includes(keyword) || row.category.toLowerCase().includes(keyword),
      );
    }
    if (visibility === "visible") data = data.filter((row) => row.isVisible);
    if (visibility === "hidden") data = data.filter((row) => !row.isVisible);
    if (sold === "sold") data = data.filter((row) => row.isSoldOut);
    if (sold === "available") data = data.filter((row) => !row.isSoldOut);
    return data;
  }, [rows, q, sold, visibility]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [currentPage, filteredRows, limit]);

  const updateRow = (
    productId: string,
    patch: Partial<Pick<OverrideRow, "isVisible" | "isSoldOut" | "sortOverride">>,
  ) => {
    setRows((prev) => prev.map((row) => (row.id === productId ? { ...row, ...patch } : row)));
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.terminals.products.assign(id, {
        body: {
          overrides: rows.map((row) => ({
            product_id: row.id,
            is_visible: row.isVisible,
            is_sold_out: row.isSoldOut,
            sort_override: row.sortOverride === "" ? null : Number(row.sortOverride),
          })),
        } as never,
      });
      toast.success("Display overrides updated.");
      await load();
    } catch {
      toast.error("Failed to update display overrides.");
    } finally {
      setIsSaving(false);
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
              onClick={saveChanges}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={load}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Reload
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
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
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

        <div className="mt-4 rounded-xl border border-[#e4e6ea] overflow-hidden">
          <div className="border-b border-[#e9ebef] bg-[#f8f9fb] p-3">
            <div className="grid grid-cols-1 md:grid-cols-[1.6fr_0.8fr_0.8fr] gap-2">
              <div className="h-10 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
                <Search size={15} className="text-[#97a0ad]" />
                <input
                  type="search"
                  autoComplete="off"
                  placeholder="Search product or category"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="w-full text-[13px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
                />
              </div>
              <SelectMenu
                value={visibility}
                onChange={(value) => syncQuery({ visibility: value, page: 1 })}
                options={[
                  { label: "All visibility", value: "all" },
                  { label: "Visible", value: "visible" },
                  { label: "Hidden", value: "hidden" },
                ]}
                className="w-full"
              />
              <SelectMenu
                value={sold}
                onChange={(value) => syncQuery({ sold: value, page: 1 })}
                options={[
                  { label: "All stock states", value: "all" },
                  { label: "Sold out", value: "sold" },
                  { label: "Available", value: "available" },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <table className="w-full min-w-[900px]">
            <thead className="bg-white border-b border-[#e9ebef]">
              <tr className="text-[12px] text-[#6e7785] text-left">
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-2 py-2 font-semibold">Category</th>
                <th className="px-2 py-2 font-semibold">Visible</th>
                <th className="px-2 py-2 font-semibold">Sold Out</th>
                <th className="px-2 py-2 font-semibold">Sort Override</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-[13px] text-[#717c8e]">
                    No product overrides found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0 border-[#edf0f4] text-[13px] bg-white">
                    <td className="px-3 py-3 font-semibold text-[#222a35]">{row.name}</td>
                    <td className="px-2 py-3 text-[#3e4653]">{row.category}</td>
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={row.isVisible}
                        onChange={(event) => updateRow(row.id, { isVisible: event.target.checked })}
                        className="h-4 w-4 rounded border-[#cfd5de]"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={row.isSoldOut}
                        onChange={(event) => updateRow(row.id, { isSoldOut: event.target.checked })}
                        className="h-4 w-4 rounded border-[#cfd5de]"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="number"
                        value={row.sortOverride}
                        onChange={(event) => updateRow(row.id, { sortOverride: event.target.value })}
                        className="h-9 w-28 rounded-lg border border-[#dfe3e8] px-2 text-[13px]"
                        placeholder="auto"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="p-3">
            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={limit}
              label="products"
              onPageChange={(nextPage) => syncQuery({ page: nextPage })}
              onPageSizeChange={(nextSize) => syncQuery({ page: 1, limit: nextSize })}
            />
          </div>
        </div>

      </section>
    </div>
  );
}
