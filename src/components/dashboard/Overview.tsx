"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { proxiedImageSrc } from "@/lib/media-url";

type MetricCard = {
  title: string;
  value: string;
  change: string;
  changeUp?: boolean | null;
  chartData: { time: string; value: number }[];
  chartData2?: { time: string; value: number }[];
};
type RevenuePoint = { time: string; value: number };
type TerminalPoint = { id: string; value: number };
type ProductPoint = { id?: string; name: string; amount: string; progress: number; imageUrl?: string | null };
type RecentOrder = { id: string; rowKey: string; items: number; total: string; status: string };

function statusClass(status: string) {
  if (status === "Completed") {
    return "bg-[#63d790] text-[#136a35]";
  }
  if (status === "Ready") {
    return "bg-[#7eaaf8] text-[#1f4ca0]";
  }
  if (status === "Preparing") {
    return "bg-[#ffc14a] text-[#7a4b00]";
  }
  return "bg-[#eef0f3] text-[#6e7682]";
}

type TimelineFilter = "today" | "last7" | "last30" | "thisMonth" | "all";

function getNum(obj: Record<string, unknown> | null | undefined, key: string): number {
  if (!obj || typeof obj !== "object") return 0;
  const snake = key.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
  const v = obj[key] ?? obj[snake];
  return typeof v === "number" ? v : 0;
}

function getStr(obj: Record<string, unknown> | null | undefined, key: string): string {
  if (!obj || typeof obj !== "object") return "";
  const snake = key.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
  const v = obj[key] ?? obj[snake];
  return typeof v === "string" ? v : "";
}

function formatAsDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getTimelineDateRange(timeline: TimelineFilter): { date_from?: string; date_to?: string } {
  if (timeline === "all") return {};

  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (timeline === "today") return { date_from: formatAsDate(start), date_to: formatAsDate(end) };
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

export default function Overview() {
  const searchParams = useSearchParams();
  const timelineParam = searchParams.get("timeline");
  const locationParam = searchParams.get("location");
  const timelineFilter: TimelineFilter =
    timelineParam === "today" ||
    timelineParam === "last7" ||
    timelineParam === "last30" ||
    timelineParam === "thisMonth" ||
    timelineParam === "all"
      ? timelineParam
      : "all";
  const locationId = locationParam && locationParam !== "all" ? locationParam : undefined;

  const [cards, setCards] = useState<MetricCard[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [terminalChart, setTerminalChart] = useState<TerminalPoint[]>([]);
  const [products, setProducts] = useState<ProductPoint[]>([]);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        setError("");
        const dateRange = getTimelineDateRange(timelineFilter);
        const sharedQuery = {
          date_from: dateRange.date_from,
          date_to: dateRange.date_to,
          location_id: locationId,
        };
        const results = await Promise.allSettled([
          orderzillaApi.dashboard.kpi.overview({ query: sharedQuery }),
          orderzillaApi.dashboard.kpi.byTerminal({ query: sharedQuery }),
          orderzillaApi.dashboard.kpi.byDay({ query: sharedQuery }),
          orderzillaApi.dashboard.kpi.topProducts({ query: { ...sharedQuery, limit: 5 } }),
          orderzillaApi.dashboard.kpi.hourly({ query: sharedQuery }),
          orderzillaApi.dashboard.orders.list({
            query: { ...sharedQuery, page: 1, limit: 5 },
          }),
        ]);

        const overview = results[0].status === "fulfilled" ? results[0].value : null;
        const byTerminal = results[1].status === "fulfilled" ? results[1].value : null;
        const byDay = results[2].status === "fulfilled" ? results[2].value : null;
        const top = results[3].status === "fulfilled" ? results[3].value : null;
        const hourly = results[4].status === "fulfilled" ? results[4].value : null;
        const orderList = results[5].status === "fulfilled" ? results[5].value : null;

        const failedCount = results.filter((r) => r.status === "rejected").length;
        if (failedCount === results.length) {
          throw new Error("All KPI requests failed.");
        }

        const byDayObj = byDay as Record<string, unknown> | null;
        const daysRaw = Array.isArray(byDayObj)
          ? byDayObj
          : (byDayObj?.days ?? byDayObj?.data ?? []) as Array<Record<string, unknown>>;
        const days = Array.isArray(daysRaw) ? daysRaw : [];
        const sortedDays = [...days].sort(
          (a, b) => String(getStr(a, "day")).localeCompare(String(getStr(b, "day"))),
        );

        const toChartData = (
          getValue: (d: Record<string, unknown>) => number,
        ): { time: string; value: number }[] =>
          sortedDays.map((d) => ({
            time: (() => {
              const dayStr = getStr(d, "day");
              if (!dayStr) return "";
              try {
                return new Date(dayStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              } catch {
                return dayStr;
              }
            })(),
            value: getValue(d),
          }));

        const calcChange = (data: { value: number }[]): { change: string; up: boolean | null } => {
          if (data.length < 2) return { change: "→ 0.0%", up: null };
          const mid = Math.floor(data.length / 2);
          const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.value, 0) / Math.max(1, mid);
          const secondHalf = data.slice(mid).reduce((s, d) => s + d.value, 0) / Math.max(1, data.length - mid);
          if (firstHalf === 0) return { change: "→ 0.0%", up: null };
          const pct = ((secondHalf - firstHalf) / firstHalf) * 100;
          const up = pct > 0;
          const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
          return { change: `${arrow} ${Math.abs(pct).toFixed(1)}%`, up: pct !== 0 ? up : null };
        };

        const overviewObj = overview as Record<string, unknown> | null;
        const revenueData = toChartData((d) => getNum(d, "revenueGross"));
        const ordersData = toChartData((d) => getNum(d, "orderCount"));
        const avgBasketData = toChartData((d) => getNum(d, "avgBasket"));
        const taxData = toChartData((d) => getNum(d, "revenueGross") - getNum(d, "revenueNet"));
        const indoorData = toChartData((d) => getNum(d, "indoorCount"));
        const takeawayData = toChartData((d) => getNum(d, "takeawayCount"));
        const indoorTakeawayData = sortedDays.map((d, i) => ({
          time: (() => {
            const dayStr = getStr(d, "day");
            if (!dayStr) return "";
            try {
              return new Date(dayStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            } catch {
              return dayStr;
            }
          })(),
          indoor: indoorData[i]?.value ?? 0,
          takeaway: takeawayData[i]?.value ?? 0,
        }));

        const indoorCount = getNum(overviewObj, "indoorCount");
        const takeawayCount = getNum(overviewObj, "takeawayCount");
        const totalOrders = indoorCount + takeawayCount;
        const indoorPct = totalOrders > 0 ? Math.round((indoorCount / totalOrders) * 100) : 0;
        const takeawayPct = totalOrders > 0 ? Math.round((takeawayCount / totalOrders) * 100) : 0;
        const indoorChange = indoorData.length >= 2 ? calcChange(indoorData) : { change: "→ 0%", up: null };
        const takeawayChange = takeawayData.length >= 2 ? calcChange(takeawayData) : { change: "→ 0%", up: null };

        const revCh = calcChange(revenueData);
        const ordCh = calcChange(ordersData);
        const avgCh = calcChange(avgBasketData);
        const taxCh = calcChange(taxData);

        setCards([
          {
            title: "REVENUE (GROSS)",
            value: `$${getNum(overviewObj, "revenueGross")}`,
            change: revCh.change,
            changeUp: revCh.up,
            chartData: revenueData,
          },
          {
            title: "ORDERS",
            value: `${getNum(overviewObj, "orderCount")}`,
            change: ordCh.change,
            changeUp: ordCh.up,
            chartData: ordersData,
          },
          {
            title: "AVG. BASKET",
            value: `$${getNum(overviewObj, "avgBasket")}`,
            change: avgCh.change,
            changeUp: avgCh.up,
            chartData: avgBasketData,
          },
          {
            title: "VAT TOTAL",
            value: `$${getNum(overviewObj, "taxTotal")}`,
            change: taxCh.change,
            changeUp: taxCh.up,
            chartData: taxData,
          },
          {
            title: "INDOOR / TAKEAWAY",
            value: `${indoorPct}% / ${takeawayPct}%`,
            change: `${indoorChange.change} / ${takeawayChange.change}`,
            changeUp: null,
            chartData: indoorTakeawayData.map((d) => ({ time: d.time, value: d.indoor })),
            chartData2: indoorTakeawayData.map((d) => ({ time: d.time, value: d.takeaway })),
          },
        ]);

        const byTerminalObj = byTerminal as Record<string, unknown> | null;
        const terminalsRaw = Array.isArray(byTerminalObj)
          ? byTerminalObj
          : (byTerminalObj?.terminals ?? byTerminalObj?.data ?? []) as Array<Record<string, unknown>>;
        const terminals = Array.isArray(terminalsRaw) ? terminalsRaw : [];
        setTerminalChart(
          terminals.map((t) => ({
            id: (t.terminalCode ?? t.terminal_code ?? t.terminalName ?? t.terminal_name ?? "-") as string,
            value: getNum(t, "revenueGross"),
          })),
        );

        const hourlyObj = hourly as Record<string, unknown> | null;
        const hourlyRaw = Array.isArray(hourlyObj)
          ? hourlyObj
          : (hourlyObj?.hourly ?? hourlyObj?.data ?? []) as Array<Record<string, unknown>>;
        const hourlyArr = Array.isArray(hourlyRaw) ? hourlyRaw : [];
        setRevenue(
          (() => {
            const byHour = new Map<number, number>();
            hourlyArr.forEach((row) => {
              const h = getNum(row, "hour");
              if (h >= 0 && h <= 23) {
                byHour.set(h, (byHour.get(h) ?? 0) + getNum(row, "revenueGross"));
              }
            });
            return Array.from(byHour.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([hour, value]) => ({
                time: `${String(hour).padStart(2, "0")}:00`,
                value,
              }));
          })(),
        );

        const topObj = top as Record<string, unknown> | null;
        const productsRaw = Array.isArray(topObj)
          ? topObj
          : (topObj?.products ?? topObj?.data ?? []) as Array<Record<string, unknown>>;
        const source = Array.isArray(productsRaw) ? productsRaw : [];
        const maxRevenue = Math.max(
          1,
          ...source.map((item) => getNum(item, "revenueGross")),
        );
        const mapped = source.map((item) => ({
          id: (item.productId ?? item.product_id) as string | undefined,
          name: (item.productName ?? item.product_name ?? "Product") as string,
          amount: `$${getNum(item, "revenueGross")}`,
          progress: Math.round((getNum(item, "revenueGross") / maxRevenue) * 100),
          imageUrl: null as string | null | undefined,
        }));
        setProducts(mapped);

        // Fetch product images for top products
        const ids = source.map((p) => p.productId ?? p.product_id).filter(Boolean) as string[];
        if (ids.length > 0) {
          Promise.all(ids.map((id) => orderzillaApi.dashboard.products.byId(id)))
            .then((productDetails) => {
              setProducts((prev) =>
                prev.map((p, i) => ({
                  ...p,
                  imageUrl: (productDetails[i] as { image_url?: string | null })?.image_url ?? null,
                })),
              );
            })
            .catch(() => {});
        }

        const orderListObj = orderList as Record<string, unknown> | null;
        const ordersRaw = Array.isArray(orderListObj)
          ? orderListObj
          : (orderListObj?.orders ?? orderListObj?.data ?? []) as Array<Record<string, unknown>>;
        const ordersArr = Array.isArray(ordersRaw) ? ordersRaw : [];
        setOrders(
          ordersArr.map((order, index) => {
            const orderNum = order.order_number ?? order.orderNumber;
            const total = order.total_gross ?? order.totalGross;
            const status = (order.status as string) ?? "PENDING";
            const displayId = orderNum ? `#${orderNum}` : "#-";
            const rowKey = String(order.id ?? order.order_id ?? `order-${index}`);
            return {
              id: displayId,
              rowKey,
              items: 1,
              total: total != null ? `$${total}` : "$0.00",
              status:
                status === "COMPLETED"
                  ? "Completed"
                  : status === "READY"
                    ? "Ready"
                    : status === "PREPARING"
                      ? "Preparing"
                      : "Pending",
            };
          }),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load dashboard data.";
        setError(msg);
        if (typeof console !== "undefined" && console.error) {
          console.error("[Overview] fetch error:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [timelineFilter, locationId]);

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      {error ? (
        <div className="rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
          {error}
        </div>
      ) : null}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {cards.length === 0 ? (
          <article className="col-span-2 sm:col-span-3 lg:col-span-5 rounded-xl border border-[#e6e7ea] bg-white p-4 sm:p-6 text-center text-[13px] text-[#717c8e]">
            No KPI data available for selected filters.
          </article>
        ) : (
          cards.map((card, index) => (
            <article
              key={card.title}
              className="rounded-xl border border-[#e6e7ea] bg-white p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[10px] sm:text-[11px] font-semibold text-[#808794] truncate">{card.title}</p>
              <p
                className={`mt-1 leading-[1] font-extrabold tracking-tight text-[#161b22] truncate ${
                  index === 4 ? "text-[20px] sm:text-[26px] lg:text-[30px]" : "text-[24px] sm:text-[32px] lg:text-[38px]"
                }`}
              >
                {card.value}
              </p>
              <p
                className={`mt-1 text-[12px] sm:text-[14px] font-medium ${
                  card.changeUp === true
                    ? "text-[#16a34a]"
                    : card.changeUp === false
                      ? "text-[#dc2626]"
                      : "text-[#66707e]"
                }`}
              >
                {card.change}
              </p>
              <div className="mt-2 h-12 w-full min-h-[48px]">
                {card.chartData.length > 0 ? (
                  index === 4 && card.chartData2 && card.chartData2.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={card.chartData.map((d, i) => ({
                          ...d,
                          takeaway: card.chartData2?.[i]?.value ?? 0,
                        }))}
                        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                      >
                        <defs>
                          <linearGradient id={`indoorFill-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id={`takeawayFill-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill={`url(#indoorFill-${index})`}
                        />
                        <Area
                          type="monotone"
                          dataKey="takeaway"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill={`url(#takeawayFill-${index})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={card.chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <defs>
                          <linearGradient id={`cardFill-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d5ff32" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#d5ff32" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#c8fb17"
                          strokeWidth={2}
                          fill={`url(#cardFill-${index})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <div className="h-full w-full rounded bg-[#f0f1f4]" />
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <h3 className="text-[18px] sm:text-[22px] font-bold text-[#1b2028]">Daily Revenue Trend</h3>
          <div className="h-[200px] sm:h-[250px] mt-2">
            {revenue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-[#717c8e]">
                No daily revenue data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d5ff32" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#d5ff32" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eceef2" strokeDasharray="4 4" />
                  <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#c8fb17"
                    strokeWidth={3}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <h3 className="text-[18px] sm:text-[22px] font-bold text-[#1b2028]">Revenue by Terminal</h3>
          <div className="h-[200px] sm:h-[250px] mt-2">
            {terminalChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-[#717c8e]">
                No terminal revenue data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={terminalChart}>
                  <CartesianGrid stroke="#eceef2" strokeDasharray="4 4" />
                  <XAxis dataKey="id" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ccff1f" radius={[8, 8, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-3">
        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <h3 className="text-[18px] sm:text-[22px] font-bold text-[#1b2028]">Top Products</h3>
          <div className="mt-3 space-y-3">
            {products.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#717c8e]">No top products data available.</p>
            ) : (
              products.map((product, index) => (
                <div key={`${product.id ?? product.name}-${product.amount}-${index}`}>
                  <div className="flex items-center justify-between text-[14px] sm:text-[17px] gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f8f9fb]">
                        {product.imageUrl ? (
                          <img
                            src={proxiedImageSrc(product.imageUrl) ?? product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[14px] font-bold text-[#9ca3af]">
                            {product.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-[#222a35] truncate">{product.name}</span>
                    </div>
                    <span className="font-bold text-[#222a35] shrink-0">{product.amount}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[#e8eaef]">
                    <div
                      className="h-2 rounded-full bg-[#ceff1f]"
                      style={{ width: `${product.progress}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[18px] sm:text-[22px] font-bold text-[#1b2028]">Recent Orders</h3>
            <Link
              href="/dashboard/orders"
              className="text-[14px] sm:text-[16px] font-semibold text-[#4d5560] hover:text-[#2f3743] hover:underline shrink-0"
            >
              View all →
            </Link>
          </div>
          <div className="mt-2 overflow-x-auto -mx-1 px-1">
            <table className="w-full text-left min-w-[320px]">
              <thead>
                <tr className="text-[13px] text-[#7b8492]">
                  <th className="py-1 font-semibold">Order ID</th>
                  <th className="py-1 font-semibold">Items</th>
                  <th className="py-1 font-semibold">Total</th>
                  <th className="py-1 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[13px] text-[#717c8e]">
                      No recent orders available.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.rowKey} className="border-t border-[#eceef2] text-[14px] sm:text-[16px]">
                      <td className="py-2 font-semibold text-[#242b36]">{order.id}</td>
                      <td className="py-2 text-[#4f5867]">{order.items}</td>
                      <td className="py-2 font-bold text-[#242b36]">{order.total}</td>
                      <td className="py-2 text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${statusClass(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

