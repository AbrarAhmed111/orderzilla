"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type OrderDetailPageProps = {
  id: string;
};

type OrderDetail = components["schemas"]["OrderDetail"];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[14px]">
      <span className="text-[#3b4350]">{label}</span>
      <span className="font-semibold text-right text-[#1d2430]">{value}</span>
    </div>
  );
}

export default function OrderDetailPage({ id }: OrderDetailPageProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await orderzillaApi.dashboard.orders.byId(id);
      setOrder(data as OrderDetail);
    } catch {
      setError("Failed to load order details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const mapStatusLabel = (status?: string) => {
    if (status === "PREPARING") return "Preparing";
    if (status === "READY") return "Ready";
    if (status === "COMPLETED") return "Completed";
    if (status === "CANCELLED") return "Cancelled";
    return "Pending";
  };

  const updateStatus = async (status: "READY" | "CANCELLED" | "COMPLETED") => {
    await orderzillaApi.dashboard.orders.updateStatus(id, { body: { status } });
    await fetchOrder();
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {error ? (
          <div className="mb-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchOrder} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/orders"
              className="text-[14px] text-[#616a78] hover:text-[#2f3743]"
            >
              ← Back to Orders
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-[42px] leading-none font-extrabold text-[#171d27]">
                Order {order?.order_number ? `#${order.order_number}` : `#${id}`}
              </h1>
              <span className="rounded-full bg-[#ebf7bf] px-3 py-1 text-[13px] font-semibold text-[#4f6610]">
                {mapStatusLabel(order?.status)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#3f4653]"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              onClick={() => updateStatus("CANCELLED")}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-[#f8faf2] px-4 text-[14px] font-semibold text-[#7d8736]"
            >
              Cancel Order
            </button>
            <button
              type="button"
              onClick={() => updateStatus("READY")}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Mark as Ready
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[30px] font-bold text-[#1a212c]">Order Items</h2>
            <div className="mt-2 divide-y divide-[#eceff3]">
              {(order?.items ?? []).map((item) => (
                <div key={item.id ?? item.product_name} className="py-3">
                  <div className="grid grid-cols-[1.5fr_0.6fr_0.7fr_0.5fr] gap-2 items-start text-[15px]">
                    <div>
                      <p className="font-semibold text-[#1f2733]">{item.product_name ?? "-"}</p>
                      <p className="text-[13px] text-[#6e7785]">Selected modifiers</p>
                      {(item.extras ?? []).map((modifier, modifierIndex) => (
                        <p key={`${modifier.extra_name ?? "extra"}-${modifierIndex}`} className="text-[13px] text-[#3e4653]">
                          + {modifier.extra_name}
                        </p>
                      ))}
                    </div>
                    <p className="text-[#7b8492]">-</p>
                    <p className="font-semibold text-[#2a313d]">
                      {item.quantity ?? 1} x ${item.unit_price ?? "0.00"}
                    </p>
                    <p className="font-semibold text-right text-[#2a313d]">
                      ${item.total_gross_price ?? "0.00"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 border-t border-[#eceff3] pt-3 space-y-1.5">
              <div className="flex items-center justify-end gap-8 text-[15px]">
                <span className="text-[#3a4350]">Subtotal</span>
                <span className="font-semibold text-[#1d2430]">${order?.subtotal_gross ?? "0.00"}</span>
              </div>
              <div className="flex items-center justify-end gap-8 text-[15px]">
                <span className="text-[#3a4350]">VAT (10%)</span>
                <span className="font-semibold text-[#1d2430]">${order?.tax_breakdown?.[0]?.tax ?? "0.00"}</span>
              </div>
              <div className="flex items-center justify-end gap-8 text-[15px]">
                <span className="text-[#3a4350]">Discount (if applied)</span>
                <span className="font-semibold text-[#1d2430]">-${order?.discount_amount ?? "0.00"}</span>
              </div>
              <div className="flex items-center justify-end gap-8 text-[31px] font-extrabold text-[#111822]">
                <span>Final Total</span>
                <span>${order?.total_gross ?? "0.00"}</span>
              </div>
            </div>
          </article>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h3 className="text-[30px] font-bold text-[#1a212c]">Customer Info</h3>
              <div className="mt-3 space-y-2">
                <InfoRow
                  label="Customer name"
                  value={`${order?.customer_first_name ?? ""} ${order?.customer_last_name ?? ""}`.trim() || "-"}
                />
                <InfoRow label="Email" value="-" />
                <InfoRow label="Loyalty card" value={order?.customer_card ?? "-"} />
                <InfoRow label="Phone number" value="-" />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h3 className="text-[30px] font-bold text-[#1a212c]">Payment Details</h3>
              <div className="mt-3 space-y-2">
                <InfoRow label="Payment Method" value={order?.payment_method ?? "-"} />
                <InfoRow label="Transaction ID" value={order?.id ?? "-"} />
                <InfoRow label="Paid amount" value={`$${order?.total_gross ?? "0.00"}`} />
                <InfoRow
                  label="VAT breakdown"
                  value={`$${order?.tax_breakdown?.[0]?.tax ?? "0.00"} (${order?.tax_breakdown?.[0]?.rate ?? 0}%)`}
                />
                <InfoRow label="Payment status" value={order?.payment_status ?? "-"} />
              </div>
            </article>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h3 className="text-[30px] font-bold text-[#1a212c]">Order Timeline</h3>
            <div className="mt-4 grid grid-cols-2 gap-10">
              <div className="space-y-4">
                {[
                  "Order Created",
                  "Payment Confirmed",
                  "Sent to Kitchen",
                ].map((step, idx) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className="h-4 w-4 rounded-full bg-[#0ea35b]" />
                      {idx !== 2 && <span className="mt-1 h-8 w-[2px] bg-[#b9deca]" />}
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold leading-tight text-[#1e2530]">
                        {step}
                      </p>
                      <p className="text-[14px] text-[#656f7d]">Oct 26, 2023 - 12:45 PM</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {["Preparing", "Ready", "Completed"].map((step, idx) => {
                  const isCurrent = idx === 0;
                  return (
                    <div key={step} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`h-4 w-4 rounded-full ${
                            isCurrent
                              ? "bg-[#d7ff3c] ring-4 ring-[#edf8c6]"
                              : "bg-white border-2 border-[#c8ced7]"
                          }`}
                        />
                        {idx !== 2 && <span className="mt-1 h-8 w-[2px] bg-[#d7dde6]" />}
                      </div>
                      <div>
                        <p
                          className={`text-[22px] font-semibold leading-tight ${
                            isCurrent ? "text-[#1e2530]" : "text-[#8a92a0]"
                          }`}
                        >
                          {step}
                        </p>
                        {isCurrent && (
                          <p className="text-[14px] text-[#656f7d]">
                            Oct 26, 2023 - 12:46 PM
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h3 className="text-[30px] font-bold text-[#1a212c]">Order Meta</h3>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
              <div>
                <p className="text-[#6d7684]">Terminal</p>
                <p className="font-semibold text-[#1d2430]">{order?.terminal_name ?? "-"}</p>
              </div>
              <div>
                <p className="text-[#6d7684]">Location</p>
                <p className="font-semibold text-[#1d2430]">{order?.location_name ?? "-"}</p>
              </div>
              <div>
                <p className="text-[#6d7684]">Order Type</p>
                <p className="font-semibold text-[#1d2430]">{order?.mode ?? "-"}</p>
              </div>
              <div>
                <p className="text-[#6d7684]">Table number</p>
                <p className="font-semibold text-[#1d2430]">-</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#6d7684]">Staff override</p>
                <p className="font-semibold text-[#1d2430]">None</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

