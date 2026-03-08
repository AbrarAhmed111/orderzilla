"use client";

import { useEffect, useState } from "react";
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

const metricCards = [
  { title: "REVENUE (GROSS)", value: "$12,450.00", change: "↑ 4.5%" },
  { title: "ORDERS", value: "450", change: "↑ 3.2%" },
  { title: "AVG. BASKET", value: "$27.66", change: "↑ 1.8%" },
  { title: "VAT TOTAL", value: "$1,867.50", change: "→ 0.0%" },
  { title: "INDOOR / TAKEAWAY", value: "65% / 35%", change: "↑ 2%   ↓ 3%" },
];

const revenueData = [
  { time: "8 AM", value: 72 },
  { time: "10 AM", value: 108 },
  { time: "12 PM", value: 98 },
  { time: "2 PM", value: 145 },
  { time: "4 PM", value: 158 },
  { time: "6 PM", value: 142 },
  { time: "8 PM", value: 168 },
];

const terminalData = [
  { id: "T1", value: 350 },
  { id: "T2", value: 280 },
  { id: "T3", value: 405 },
  { id: "T4", value: 445 },
  { id: "T5", value: 290 },
];

const topProducts = [
  { name: "Classic Cheeseburger", amount: "$1,450.00", progress: 95 },
  { name: "Large Fries", amount: "$980.50", progress: 70 },
  { name: "Chicken Nuggets (10pc)", amount: "$850.20", progress: 61 },
  { name: "Soft Drink (L)", amount: "$720.10", progress: 52 },
  { name: "Vanilla Shake", amount: "$640.80", progress: 45 },
];

const recentOrders = [
  { id: "#12345", items: 3, total: "$35.40", status: "Completed" },
  { id: "#12344", items: 2, total: "$22.10", status: "Ready" },
  { id: "#12343", items: 5, total: "$58.90", status: "Preparing" },
  { id: "#12342", items: 4, total: "$45.20", status: "Pending" },
  { id: "#12341", items: 1, total: "$12.50", status: "Completed" },
];

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

export default function Overview() {
  const [cards, setCards] = useState(metricCards);
  const [revenue, setRevenue] = useState(revenueData);
  const [terminalChart, setTerminalChart] = useState(terminalData);
  const [products, setProducts] = useState(topProducts);
  const [orders, setOrders] = useState(recentOrders);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        const [overview, byTerminal, top, hourly, orderList] = await Promise.all([
          orderzillaApi.dashboard.kpi.overview(),
          orderzillaApi.dashboard.kpi.byTerminal(),
          orderzillaApi.dashboard.kpi.topProducts(),
          orderzillaApi.dashboard.kpi.hourly(),
          orderzillaApi.dashboard.orders.list({ query: { page: 1, limit: 5 } }),
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
          ((byTerminal as { rows?: Array<{ terminal?: string; revenueGross?: number }> })?.rows ?? []).map((row) => ({
            id: row.terminal ?? "-",
            value: row.revenueGross ?? 0,
          })),
        );

        setRevenue(
          ((hourly as { rows?: Array<{ hour?: string; revenueGross?: number }> })?.rows ?? []).map((row) => ({
            time: row.hour ?? "-",
            value: row.revenueGross ?? 0,
          })),
        );

        setProducts(
          ((top as { products?: Array<{ name?: string; revenueGross?: number; share?: number }> })?.products ?? []).map(
            (item) => ({
              name: item.name ?? "Product",
              amount: `$${item.revenueGross ?? 0}`,
              progress: item.share ? Math.min(100, Math.round(item.share * 100)) : 0,
            }),
          ),
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <section className="grid grid-cols-5 gap-3">
        {cards.map((card, index) => (
          <article
            key={card.title}
            className="rounded-xl border border-[#e6e7ea] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[11px] font-semibold text-[#808794]">{card.title}</p>
            <p
              className={`mt-1 leading-[1] font-extrabold tracking-tight text-[#161b22] ${
                index === 4 ? "text-[30px]" : "text-[38px]"
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
        ))}
      </section>

      <section className="grid grid-cols-[2fr_1fr] gap-3">
        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <h3 className="text-[22px] font-bold text-[#1b2028]">Daily Revenue Trend</h3>
          <div className="h-[250px] mt-2">
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
          </div>
        </article>

        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <h3 className="text-[22px] font-bold text-[#1b2028]">Revenue by Terminal</h3>
          <div className="h-[250px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={terminalChart}>
                <CartesianGrid stroke="#eceef2" strokeDasharray="4 4" />
                <XAxis dataKey="id" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#ccff1f" radius={[8, 8, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-[1.1fr_1fr] gap-3">
        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <h3 className="text-[22px] font-bold text-[#1b2028]">Top Products</h3>
          <div className="mt-3 space-y-3">
            {products.map((product) => (
              <div key={product.name}>
                <div className="flex items-center justify-between text-[17px]">
                  <span className="font-semibold text-[#222a35]">{product.name}</span>
                  <span className="font-bold text-[#222a35]">{product.amount}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#e8eaef]">
                  <div
                    className="h-2 rounded-full bg-[#ceff1f]"
                    style={{ width: `${product.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[#e6e7ea] bg-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[22px] font-bold text-[#1b2028]">Recent Orders</h3>
            <button type="button" className="text-[16px] font-semibold text-[#4d5560]">
              View all →
            </button>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[13px] text-[#7b8492]">
                  <th className="py-1 font-semibold">Order ID</th>
                  <th className="py-1 font-semibold">Items</th>
                  <th className="py-1 font-semibold">Total</th>
                  <th className="py-1 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-[#eceef2] text-[16px]">
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
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

