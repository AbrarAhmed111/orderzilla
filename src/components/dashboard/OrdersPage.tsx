"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { Skeleton, TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components, paths } from "@/types/orderzilla-openapi";

type ApiOrder = components["schemas"]["OrderSummary"];

type UIRow = {
  idKey: string;
  id: string;
  date: string;
  terminal: string;
  items: number;
  type: "Indoor" | "Takeaway";
  payment: string;
  total: string;
  status: "Pending" | "Preparing" | "Ready" | "Completed" | "Cancelled";
};

const fallbackOrders: UIRow[] = [];

const statusToLabel: Record<string, UIRow["status"]> = {
  PENDING: "Pending",
  CONFIRMED: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const labelToApiStatus: Record<UIRow["status"], "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"> = {
  Pending: "PENDING",
  Preparing: "PREPARING",
  Ready: "READY",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",
};

const tabToApiStatus: Record<
  string,
  "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | undefined
> = {
  "All Orders": undefined,
  Pending: "PENDING",
  Preparing: "PREPARING",
  Ready: "READY",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",
};

type OrdersQuery =
  NonNullable<paths["/v1/dashboard/orders"]["get"]["parameters"]["query"]> & {
    search?: string;
  };

type TimelineFilter = "all" | "today" | "last7" | "last30" | "thisMonth";

function formatDateTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusClass(status: string) {
  if (status === "Completed") return "bg-[#c8f3d5] text-[#1b6a34]";
  if (status === "Ready") return "bg-[#cde0ff] text-[#1f4ca0]";
  if (status === "Preparing") return "bg-[#ffe1a8] text-[#7a4b00]";
  if (status === "Cancelled") return "bg-[#f6c9cc] text-[#9c2228]";
  return "bg-[#edf0f4] text-[#5f6875]";
}

function normalizePaymentMethod(value?: string | null) {
  if (!value) return { label: "Pending", value: "pending" };
  const normalized = value.toLowerCase();
  if (normalized === "card") return { label: "Card", value: "card" };
  if (normalized === "cash") return { label: "Cash", value: "cash" };
  if (normalized === "wallet") return { label: "Wallet", value: "wallet" };
  return { label: value, value: normalized };
}

function paymentFilterValue(paymentLabel: string) {
  return normalizePaymentMethod(paymentLabel).value;
}

function formatAsDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getTimelineDateRange(timeline: TimelineFilter): { date_from?: string; date_to?: string } {
  if (timeline === "all") return {};

  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (timeline === "today") {
    return { date_from: formatAsDate(start), date_to: formatAsDate(end) };
  }
  if (timeline === "last7") {
    start.setDate(start.getDate() - 6);
    return { date_from: formatAsDate(start), date_to: formatAsDate(end) };
  }
  if (timeline === "last30") {
    start.setDate(start.getDate() - 29);
    return { date_from: formatAsDate(start), date_to: formatAsDate(end) };
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { date_from: formatAsDate(monthStart), date_to: formatAsDate(end) };
}

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab");
  const initialSearch = searchParams.get("q");
  const initialLocation = searchParams.get("location");
  const initialTerminal = searchParams.get("terminal");
  const initialPayment = searchParams.get("payment");
  const initialType = searchParams.get("type");
  const initialStatus = searchParams.get("status");
  const initialTimeline = searchParams.get("timeline");
  const initialPage = Number(searchParams.get("page") ?? "1");
  const initialLimit = Number(searchParams.get("limit") ?? "20");

  const [rows, setRows] = useState<UIRow[]>(fallbackOrders);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(
    initialTab && tabToApiStatus[initialTab] !== undefined ? initialTab : "All Orders",
  );
  const [search, setSearch] = useState(initialSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState((initialSearch ?? "").trim());
  const [locationFilter, setLocationFilter] = useState(initialLocation ?? "all");
  const [terminalFilter, setTerminalFilter] = useState(initialTerminal ?? "all");
  const [paymentFilter, setPaymentFilter] = useState(initialPayment ?? "all");
  const [typeFilter, setTypeFilter] = useState(initialType ?? "all");
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "all");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>(
    initialTimeline === "today" ||
      initialTimeline === "last7" ||
      initialTimeline === "last30" ||
      initialTimeline === "thisMonth" ||
      initialTimeline === "all"
      ? initialTimeline
      : "last7",
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [pageSize, setPageSize] =
    useState(Number.isFinite(initialLimit) && initialLimit > 0 ? initialLimit : 20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [locationOptions, setLocationOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [terminalOptions, setTerminalOptions] = useState<Array<{ label: string; value: string }>>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const buildOrdersQuery = (targetPage = page, targetPageSize = pageSize): OrdersQuery => {
    const tabStatus = tabToApiStatus[activeTab];
    const effectiveStatus = tabStatus ?? (statusFilter === "all" ? undefined : statusFilter.toUpperCase());
    const dateRange = getTimelineDateRange(timelineFilter);
    return {
      page: targetPage,
      limit: targetPageSize,
      status: effectiveStatus as OrdersQuery["status"],
      mode: typeFilter === "all" ? undefined : (typeFilter.toUpperCase() as OrdersQuery["mode"]),
      location_id: locationFilter === "all" ? undefined : locationFilter,
      terminal_id: terminalFilter === "all" ? undefined : terminalFilter,
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
      search: debouncedSearch || undefined,
    };
  };

  const fetchOrders = async (targetPage = page, targetPageSize = pageSize) => {
    try {
      setIsLoading(true);
      setError("");
      const query = buildOrdersQuery(targetPage, targetPageSize);
      const response = await orderzillaApi.dashboard.orders.list({
        query: query as never,
      });
      const items = (response?.orders ?? []) as ApiOrder[];
      const mapped: UIRow[] = items.map((item) => {
        const idKey = item.id ?? item.order_number ?? crypto.randomUUID();
        return {
          idKey,
          id: item.order_number ? `#${item.order_number}` : `#${String(idKey).slice(0, 6)}`,
          date: formatDateTime(item.created_at),
          terminal: item.terminal_name ?? item.terminal_code ?? "-",
          items: 1,
          type: item.mode === "TAKEAWAY" ? "Takeaway" : "Indoor",
          payment: normalizePaymentMethod(item.payment_method).label,
          total: item.total_gross ? `$${item.total_gross}` : "$0.00",
          status: statusToLabel[item.status ?? "PENDING"] ?? "Pending",
        };
      });
      setRows(mapped);
      const pagination = response?.pagination;
      setTotalItems(pagination?.total_items ?? mapped.length);
      setTotalPages(pagination?.total_pages ?? 1);
      setPage(pagination?.current_page ?? targetPage);
    } catch {
      setError("Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page, pageSize);
  }, [page, pageSize, activeTab, statusFilter, typeFilter, locationFilter, terminalFilter, timelineFilter, debouncedSearch]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [locationsResponse, terminalsResponse] = await Promise.all([
          orderzillaApi.dashboard.locations.list(),
          orderzillaApi.dashboard.terminals.list(),
        ]);
        const locations = (locationsResponse?.locations ?? []) as components["schemas"]["Location"][];
        const terminals = (terminalsResponse?.terminals ?? []) as components["schemas"]["Terminal"][];
        setLocationOptions(
          locations.map((loc) => ({
            label: loc.name ?? "Unnamed location",
            value: loc.id ?? "",
          })),
        );
        setTerminalOptions(
          terminals.map((terminal) => ({
            label: terminal.name ?? terminal.code ?? "Unnamed terminal",
            value: terminal.id ?? "",
          })),
        );
      } catch {
        setLocationOptions([]);
        setTerminalOptions([]);
      }
    };
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (activeTab !== "All Orders") next.set("tab", activeTab);
    if (search) next.set("q", search);
    if (locationFilter !== "all") next.set("location", locationFilter);
    if (terminalFilter !== "all") next.set("terminal", terminalFilter);
    if (paymentFilter !== "all") next.set("payment", paymentFilter);
    if (typeFilter !== "all") next.set("type", typeFilter);
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (timelineFilter !== "last7") next.set("timeline", timelineFilter);
    if (page !== 1) next.set("page", String(page));
    if (pageSize !== 20) next.set("limit", String(pageSize));
    const nextQuery = next.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [
    activeTab,
    search,
    locationFilter,
    terminalFilter,
    paymentFilter,
    typeFilter,
    statusFilter,
    timelineFilter,
    page,
    pageSize,
    pathname,
    router,
    searchParams,
  ]);

  const orderTabs = useMemo(() => {
    const counts = rows.reduce(
      (acc, row) => {
        acc.all += 1;
        acc[row.status] += 1;
        return acc;
      },
      {
        all: 0,
        Pending: 0,
        Preparing: 0,
        Ready: 0,
        Completed: 0,
        Cancelled: 0,
      } as Record<"all" | UIRow["status"], number>,
    );

    return [
      { label: "All Orders", count: counts.all, color: "bg-[#d6ff3e]" },
      { label: "Pending", count: counts.Pending, color: "bg-[#e9edf2]" },
      { label: "Preparing", count: counts.Preparing, color: "bg-[#ffc14a]" },
      { label: "Ready", count: counts.Ready, color: "bg-[#7eaaf8]" },
      { label: "Completed", count: counts.Completed, color: "bg-[#6bdc95]" },
      { label: "Cancelled", count: counts.Cancelled, color: "bg-[#f06f73]" },
    ];
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesPayment =
        paymentFilter === "all" || paymentFilterValue(row.payment) === paymentFilter;
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        row.id.toLowerCase().includes(searchValue) ||
        row.payment.toLowerCase().includes(searchValue) ||
        row.terminal.toLowerCase().includes(searchValue);
      return matchesPayment && matchesSearch;
    });
  }, [rows, paymentFilter, search]);

  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row.idKey));

  const setStatusForOrderIds = async (
    ids: string[],
    status: UIRow["status"],
    options?: { clearSelection?: boolean },
  ) => {
    const selected = rows.filter((row) => ids.includes(row.idKey));
    if (selected.length === 0) {
      toast("Select at least one order first.");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        ids.includes(row.idKey)
          ? {
              ...row,
              status,
            }
          : row,
      ),
    );

    const results = await Promise.allSettled(
      selected.map((row) =>
        orderzillaApi.dashboard.orders.updateStatus(row.idKey, {
          body: { status: labelToApiStatus[status] },
        }),
      ),
    );
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.length - successCount;

    if (successCount > 0) {
      toast.success(
        `${successCount} order${successCount > 1 ? "s" : ""} marked as ${status.toLowerCase()}.`,
      );
    }
    if (failedCount > 0) {
      toast.error(`Failed to update ${failedCount} order${failedCount > 1 ? "s" : ""}.`);
      fetchOrders(page, pageSize);
    }

    if (options?.clearSelection) {
      setSelectedIds([]);
    }
  };

  const setStatusForSelected = async (status: UIRow["status"]) => {
    await setStatusForOrderIds(selectedIds, status, { clearSelection: true });
  };

  const printOrders = () => {
    const selected = rows.filter((row) => selectedIds.includes(row.idKey));
    const toPrint = selected.length > 0 ? selected : visibleRows;

    if (toPrint.length === 0) {
      toast("No orders available to print.");
      return;
    }

    const popup = window.open("", "_blank", "width=1024,height=760");
    if (!popup) {
      toast.error("Unable to open print window. Please allow popups and try again.");
      return;
    }

    const tableRows = toPrint
      .map(
        (order) => `
          <tr>
            <td>${order.id}</td>
            <td>${order.date}</td>
            <td>${order.terminal}</td>
            <td>${order.payment}</td>
            <td>${order.total}</td>
            <td>${order.status}</td>
          </tr>
        `,
      )
      .join("");

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Orders Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin: 0 0 12px; font-size: 20px; }
            p { margin: 0 0 16px; color: #4b5563; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Orders</h1>
          <p>Printed on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date & Time</th>
                <th>Terminal</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
    popup.close();

    toast.success(
      `Printing ${toPrint.length} order${toPrint.length > 1 ? "s" : ""}.`,
    );
  };

  const exportOrders = async () => {
    try {
      setIsExporting(true);
      const exportLimit = 200;
      let currentPage = 1;
      let totalPageCount = 1;
      const allRows: UIRow[] = [];

      while (currentPage <= totalPageCount) {
        const query = buildOrdersQuery(currentPage, exportLimit);
        const response = await orderzillaApi.dashboard.orders.list({ query: query as never });
        const items = (response?.orders ?? []) as ApiOrder[];
        allRows.push(
          ...items.map((item) => {
            const idKey = item.id ?? item.order_number ?? crypto.randomUUID();
            return {
              idKey,
              id: item.order_number ? `#${item.order_number}` : `#${String(idKey).slice(0, 6)}`,
              date: formatDateTime(item.created_at),
              terminal: item.terminal_name ?? item.terminal_code ?? "-",
              items: 1,
              type: item.mode === "TAKEAWAY" ? "Takeaway" : "Indoor",
              payment: normalizePaymentMethod(item.payment_method).label,
              total: item.total_gross ? `$${item.total_gross}` : "$0.00",
              status: statusToLabel[item.status ?? "PENDING"] ?? "Pending",
            };
          }),
        );
        totalPageCount = response?.pagination?.total_pages ?? 1;
        currentPage += 1;
      }

      const filtered = allRows.filter((row) =>
        paymentFilter === "all" ? true : paymentFilterValue(row.payment) === paymentFilter,
      );
      if (filtered.length === 0) {
        toast("No orders to export.");
        return;
      }

      const csvHeader = ["Order ID", "Date & Time", "Terminal", "Items", "Type", "Payment", "Total", "Status"];
      const csvRows = filtered.map((row) => [
        row.id,
        row.date,
        row.terminal,
        String(row.items),
        row.type,
        row.payment,
        row.total,
        row.status,
      ]);
      const csv = [csvHeader, ...csvRows]
        .map((line) =>
          line
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      toast.success(`Exported ${filtered.length} orders.`);
    } catch {
      toast.error("Failed to export orders.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleNewOrder = () => {
    toast.error("Create order endpoint is not available in current API spec.");
  };

  const deleteSelected = () => {
    setRows((prev) => prev.filter((row) => !selectedIds.includes(row.idKey)));
    setSelectedIds([]);
  };

  const resetFilters = () => {
    setSearch("");
    setLocationFilter("all");
    setTerminalFilter("all");
    setPaymentFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setTimelineFilter("last7");
    setActiveTab("All Orders");
    setPage(1);
  };

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Orders</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[150px]">
              <SelectMenu
                value={timelineFilter}
                onChange={(value) => {
                  setTimelineFilter(value as TimelineFilter);
                  setPage(1);
                }}
                options={[
                  { label: "Today", value: "today" },
                  { label: "Last 7 days", value: "last7" },
                  { label: "Last 30 days", value: "last30" },
                  { label: "This month", value: "thisMonth" },
                  { label: "All time", value: "all" },
                ]}
                className="w-full"
              />
            </div>
            <SelectMenu
              value={locationFilter}
              onChange={(value) => {
                setLocationFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Locations", value: "all" },
                ...locationOptions,
              ]}
              className="min-w-[140px]"
            />
            <button
              type="button"
              onClick={exportOrders}
              disabled={isExporting}
              className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[12px] font-semibold text-[#414855]"
            >
              {isExporting ? "Exporting..." : "Export"}
            </button>
            <button
              type="button"
              onClick={handleNewOrder}
              className="h-9 rounded-lg bg-[#d4ff00] px-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#1d2512]"
            >
              <Plus size={13} />
              New Order
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchOrders} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-4 border-b border-[#eceef2] overflow-x-auto">
          <div className="flex min-w-[760px] items-center gap-4">
            {orderTabs.map((tab, index) => (
              <button
                type="button"
                key={tab.label}
                onClick={() => {
                  setActiveTab(tab.label);
                  setPage(1);
                }}
                className={`pb-2 text-[15px] font-semibold flex items-center gap-2 ${
                  activeTab === tab.label
                    ? "text-[#222a35] border-b-2 border-[#d4ff00]"
                    : "text-[#6a7280]"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-1.5 py-[1px] text-[11px] text-[#1f2631] ${tab.color}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[18px] font-bold text-[#1f2631]">Filter</p>
          <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="h-9 flex-1 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
              <Search size={15} className="text-[#97a0ad]" />
              <input
                placeholder="Search by Order ID or customer"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <SelectMenu
                value={terminalFilter}
                onChange={(value) => {
                  setTerminalFilter(value);
                  setPage(1);
                }}
                options={[
                  { label: "All Terminals", value: "all" },
                  ...terminalOptions,
                ]}
                className="min-w-[130px]"
              />
              <SelectMenu
                value={paymentFilter}
                onChange={(value) => {
                  setPaymentFilter(value);
                  setPage(1);
                }}
                options={[
                  { label: "All Payments", value: "all" },
                  { label: "Card", value: "card" },
                  { label: "Cash", value: "cash" },
                  { label: "Wallet", value: "wallet" },
                  { label: "Pending", value: "pending" },
                ]}
                className="min-w-[130px]"
              />
              <SelectMenu
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
                options={[
                  { label: "All Types", value: "all" },
                  { label: "Indoor", value: "indoor" },
                  { label: "Takeaway", value: "takeaway" },
                ]}
                className="min-w-[120px]"
              />
              <SelectMenu
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={[
                  { label: "All Statuses", value: "all" },
                  { label: "Pending", value: "pending" },
                  { label: "Preparing", value: "preparing" },
                  { label: "Ready", value: "ready" },
                  { label: "Completed", value: "completed" },
                  { label: "Cancelled", value: "cancelled" },
                ]}
                className="min-w-[120px]"
              />
              <button
                type="button"
                onClick={resetFilters}
                className="text-[12px] font-semibold text-[#6385b5] ml-1"
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
            <TableSkeleton rows={7} columns={10} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e6ea]">
            <table className="w-full min-w-[980px]">
              <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                <tr className="text-[12px] text-[#6e7785] text-left">
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, ...visibleRows.map((r) => r.idKey)]))
                            : prev.filter((id) => !visibleRows.some((row) => row.idKey === id)),
                        )
                      }
                      className="h-4 w-4 rounded border-[#cfd5de]"
                    />
                  </th>
                  <th className="px-2 py-2 font-semibold">Order ID</th>
                  <th className="px-2 py-2 font-semibold">Date & Time</th>
                  <th className="px-2 py-2 font-semibold">Terminal</th>
                  <th className="px-2 py-2 font-semibold">Items</th>
                  <th className="px-2 py-2 font-semibold">Order Type</th>
                  <th className="px-2 py-2 font-semibold">Payment</th>
                  <th className="px-2 py-2 font-semibold">Total</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[13px] text-[#717c8e]">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((order, index) => (
                    <tr
                      key={order.idKey}
                      className={`border-b last:border-b-0 border-[#edf0f4] text-[12px] ${
                        index === 1 || index === 3 ? "bg-[#f4f6f8]" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.idKey)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, order.idKey]
                                : prev.filter((id) => id !== order.idKey),
                            )
                          }
                          className="h-4 w-4 rounded border-[#cfd5de]"
                        />
                      </td>
                      <td className="px-2 py-3 font-semibold text-[#222a35]">{order.id}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{order.date}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{order.terminal}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{order.items}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{order.type}</td>
                      <td className="px-2 py-3 text-[#3e4653]">{order.payment}</td>
                      <td className="px-2 py-3 font-semibold text-[#222a35]">{order.total}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <RowActionMenu
                          actions={[
                            { label: "View details", onClick: () => undefined },
                            {
                              label: "Mark completed",
                              onClick: () => setStatusForOrderIds([order.idKey], "Completed"),
                            },
                            {
                              label: "Delete order",
                              onClick: () =>
                                setRows((prev) => prev.filter((r) => r.idKey !== order.idKey)),
                              danger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-[#6e7785]">
            {selectedIds.length} orders selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusForSelected("Completed")}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Mark as Completed
            </button>
            <button
              type="button"
              onClick={() => setStatusForSelected("Cancelled")}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Mark as Cancelled
            </button>
            <button
              type="button"
              onClick={printOrders}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
            >
              Print
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="h-9 rounded-lg bg-[#ef4a4c] px-4 text-[12px] font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="orders"
          onPageChange={(nextPage) => {
            setSelectedIds([]);
            setPage(nextPage);
          }}
          onPageSizeChange={(nextPageSize) => {
            setSelectedIds([]);
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      </section>
    </div>
  );
}

