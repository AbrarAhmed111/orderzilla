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

type MetricCard = { title: string; value: string; change: string };
type RevenuePoint = { time: string; value: number };
type TerminalPoint = { id: string; value: number };
type ProductPoint = { name: string; amount: string; progress: number };
type RecentOrder = { id: string; items: number; total: string; status: string };

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
      : "last7";
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
        const [overview, byTerminal, top, hourly, orderList] = await Promise.all([
          orderzillaApi.dashboard.kpi.overview({ query: sharedQuery }),
          orderzillaApi.dashboard.kpi.byTerminal({ query: sharedQuery }),
          orderzillaApi.dashboard.kpi.topProducts({ query: { ...sharedQuery, limit: 5 } }),
          orderzillaApi.dashboard.kpi.hourly({ query: sharedQuery }),
          orderzillaApi.dashboard.orders.list({
            query: { ...sharedQuery, page: 1, limit: 5 },
          }),
        ]);

        setCards([
          { title: "REVENUE (GROSS)", value: `$${overview?.revenueGross ?? 0}`, change: "Live" },
          { title: "ORDERS", value: `${overview?.orderCount ?? 0}`, change: "Live" },
          { title: "AVG. BASKET", value: `$${overview?.avgBasket ?? 0}`, change: "Live" },
          { title: "VAT TOTAL", value: `$${overview?.taxTotal ?? 0}`, change: "Live" },
          {
            title: "INDOOR / TAKEAWAY",
            value: `${overview?.indoorCount ?? 0} / ${overview?.takeawayCount ?? 0}`,
            change: "Live",
          },
        ]);

        setTerminalChart(
          (
            (byTerminal as {
              terminals?: Array<{ terminalCode?: string; terminalName?: string; revenueGross?: number }>;
            })?.terminals ?? []
          ).map((terminal) => ({
            id: terminal.terminalCode ?? terminal.terminalName ?? "-",
            value: terminal.revenueGross ?? 0,
          })),
        );

        setRevenue(
          (() => {
            const source =
              (hourly as { hourly?: Array<{ hour?: number; revenueGross?: number }> })?.hourly ?? [];
            const byHour = new Map<number, number>();
            source.forEach((row) => {
              if (typeof row.hour !== "number") return;
              byHour.set(row.hour, (byHour.get(row.hour) ?? 0) + (row.revenueGross ?? 0));
            });
            return Array.from(byHour.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([hour, value]) => ({
                time: `${String(hour).padStart(2, "0")}:00`,
                value,
              }));
          })(),
        );

        setProducts(
          (() => {
            const source =
              (top as { products?: Array<{ productName?: string; revenueGross?: number }> })?.products ?? [];
            const maxRevenue = Math.max(
              1,
              ...source.map((item) => item.revenueGross ?? 0),
            );
            const mapped = source.map((item) => ({
              name: item.productName ?? "Product",
              amount: `$${item.revenueGross ?? 0}`,
              progress: Math.round(((item.revenueGross ?? 0) / maxRevenue) * 100),
            }));
            return mapped;
          })(),
        );

        setOrders(
          (orderList?.orders ?? []).map((order) => ({
            id: order.order_number ? `#${order.order_number}` : "#-",
            items: 1,
            total: order.total_gross ? `$${order.total_gross}` : "$0.00",
            status:
              order.status === "COMPLETED"
                ? "Completed"
                : order.status === "READY"
                  ? "Ready"
                  : order.status === "PREPARING"
                    ? "Preparing"
                    : "Pending",
          })),
        );
      } catch {
        setError("Failed to load dashboard data.");
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
              <p className="mt-1 text-[14px] text-[#66707e]">{card.change}</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#f0f1f4]">
                <div
                  className="h-1.5 rounded-full bg-[#ccff1f]"
                  style={{ width: `${70 - index * 6}%` }}
                />
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
                <div key={`${product.name}-${product.amount}-${index}`}>
                  <div className="flex items-center justify-between text-[14px] sm:text-[17px] gap-2">
                    <span className="font-semibold text-[#222a35] truncate min-w-0">{product.name}</span>
                    <span className="font-bold text-[#222a35]">{product.amount}</span>
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
                    <tr key={order.id} className="border-t border-[#eceef2] text-[14px] sm:text-[16px]">
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

