"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

type MissingEndpoint = {
  method: string;
  path: string;
  where: string;
  why: string;
  routeDetails: string;
};

const missingEndpoints: MissingEndpoint[] = [
  {
    method: "POST",
    path: "/v1/dashboard/orders",
    where: "Orders page – New Order button",
    why: "Allows staff to create orders manually (e.g. phone orders, walk-in). Currently only list, detail, and status update exist.",
    routeDetails:
      "Request: { items: [{ product_id, quantity, extras? }], mode?: INDOOR|TAKEAWAY, customer_id?, location_id?, terminal_id? }. Response: OrderDetail.",
  },
  {
    method: "DELETE",
    path: "/v1/dashboard/terminals/{id}/logs",
    where: "Terminal Logs tab – Clear Logs button",
    why: "Clears stored event logs for a terminal to free storage and reduce noise. Logs are currently derived from terminal heartbeat; a real logs API would need this companion.",
    routeDetails:
      "Path param: id (terminal UUID). Response: { ok: true }. Scope: dashboard:terminals.",
  },
  {
    method: "GET",
    path: "/v1/dashboard/loyalty/customers/{id}/point-trend",
    where: "Customer Detail page – Points trend chart",
    why: "Provides time-series data (points over time) for the loyalty chart. Transactions exist but no aggregated trend endpoint.",
    routeDetails:
      "Path param: id (customer UUID). Query: date_from?, date_to?, granularity?: day|week|month. Response: { points: [{ date, balance, earned, redeemed }] }.",
  },
];

export default function EndpointsMissingPage() {
  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-8 w-8 text-[#f59e0b]" />
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">
            Endpoints Missing
          </h1>
        </div>
        <p className="text-[14px] text-[#6e7785] mb-6">
          Backend endpoints that the dashboard expects but are not yet in the API spec. Integrate
          these to enable the listed features.
        </p>

        <div className="space-y-4">
          {missingEndpoints.map((ep, idx) => (
            <article
              key={`${ep.method}-${ep.path}`}
              className="rounded-xl border border-[#e4e6ea] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#e9ebef] bg-[#f8f9fb] flex items-center gap-2">
                <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-[#1a2029] text-white">
                  {ep.method}
                </span>
                <code className="text-[14px] font-mono font-semibold text-[#2f3743]">{ep.path}</code>
              </div>
              <div className="px-4 py-3 space-y-2 text-[13px]">
                <div>
                  <span className="font-semibold text-[#4b5563]">Where:</span>{" "}
                  <span className="text-[#2f3743]">{ep.where}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#4b5563]">Why:</span>{" "}
                  <span className="text-[#2f3743]">{ep.why}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#4b5563]">Route details:</span>{" "}
                  <span className="text-[#2f3743]">{ep.routeDetails}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#e9ebef]">
          <Link
            href="/dashboard/settings"
            className="text-[14px] font-semibold text-[#4f46e5] hover:underline"
          >
            ← Back to Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
