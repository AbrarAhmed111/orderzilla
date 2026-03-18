"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type OrderDetailPageProps = {
  id: string;
};

type OrderDetail = components["schemas"]["OrderDetail"];

type ExtendedOrder = OrderDetail & {
  customer_email?: string;
  customer_phone?: string;
  table_number?: string;
  staff_override?: string;
  transaction_id?: string;
  card_last4?: string;
};

const EMPTY_VALUE = "—";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[14px]">
      <span className="text-[#3b4350]">{label}</span>
      <span className="text-right font-semibold break-words min-w-0 text-[#1d2430]">
        {value}
      </span>
    </div>
  );
}

function formatPaymentMethod(method?: string | null) {
  if (!method) return "-";
  const m = String(method).toUpperCase();
  if (m === "CARD") return "Credit Card";
  if (m === "TWINT") return "Twint";
  if (m === "BONCARD") return "Loyalty Card";
  if (m === "CASH") return "Cash";
  return method;
}

function formatOrderType(mode?: string) {
  if (mode === "INDOOR") return "Indoor";
  if (mode === "TAKEAWAY") return "Takeaway";
  return mode ?? "-";
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

function formatDateTime(iso?: string) {
  if (!iso || typeof iso !== "string") return "-";
  const d = new Date(iso);
  if (!isValidDate(d)) return "-";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

export default function OrderDetailPage({ id }: OrderDetailPageProps) {
  const [order, setOrder] = useState<ExtendedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await orderzillaApi.dashboard.orders.byId(id);
      setOrder(data as ExtendedOrder);
    } catch {
      setError("Failed to load order details.");
      setOrder(null);
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
    if (status === "CONFIRMED") return "Confirmed";
    return "Pending";
  };

  const statusLabel = mapStatusLabel(order?.status ?? "PENDING");

  const updateStatus = async (status: "CONFIRMED" | "PREPARING" | "READY" | "CANCELLED" | "COMPLETED") => {
    try {
      setIsUpdating(true);
      await orderzillaApi.dashboard.orders.updateStatus(id, { body: { status } });
      toast.success("Order status updated.");
      await fetchOrder();
    } catch {
      toast.error("Failed to update order status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const timelineSteps = [
    { key: "created", label: "Order Created" },
    { key: "payment", label: "Payment Confirmed" },
    { key: "kitchen", label: "Sent to Kitchen" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "completed", label: "Completed" },
  ];

  const statusToStep: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 2,
    PREPARING: 3,
    READY: 4,
    COMPLETED: 5,
    CANCELLED: -1,
  };

  const currentStepIndex = statusToStep[order?.status ?? "PENDING"] ?? 0;
  const createdAtRaw = (order as { created_at?: unknown })?.created_at;
  const createdAt =
    typeof createdAtRaw === "string" && createdAtRaw.trim()
      ? createdAtRaw
      : null;
  const createdAtValid = createdAt && isValidDate(new Date(createdAt));

  const orderExtended = order as ExtendedOrder & {
    payment_confirmed_at?: string | null;
    sent_to_kitchen_at?: string | null;
    preparing_at?: string | null;
    completed_at?: string | null;
  };
  const paymentConfirmedAt = orderExtended?.payment_confirmed_at;
  const sentToKitchenAt = orderExtended?.sent_to_kitchen_at;
  const preparingAt = orderExtended?.preparing_at;
  const completedAt = orderExtended?.completed_at ?? order?.completed_at;

  const timeline = timelineSteps.map((step, index) => {
    const done =
      order?.status === "CANCELLED"
        ? index === 0
        : currentStepIndex > index || order?.status === "COMPLETED";
    const current =
      order?.status !== "CANCELLED" &&
      order?.status !== "COMPLETED" &&
      currentStepIndex === index;
    let time = "-";
    if (step.key === "created" && createdAtValid) time = formatDateTime(createdAt!);
    if (step.key === "payment") {
      const ts = paymentConfirmedAt ?? (createdAtValid && index <= 1 ? createdAt : null);
      if (ts && typeof ts === "string" && isValidDate(new Date(ts))) time = formatDateTime(ts);
    }
    if (step.key === "kitchen") {
      const ts = sentToKitchenAt ?? (createdAtValid && currentStepIndex >= 2 ? createdAt : null);
      if (ts && typeof ts === "string" && isValidDate(new Date(ts))) time = formatDateTime(ts);
    }
    if (step.key === "preparing") {
      const ts = preparingAt ?? (createdAtValid && currentStepIndex >= 3 ? createdAt : null);
      if (ts && typeof ts === "string" && isValidDate(new Date(ts))) time = formatDateTime(ts);
    }
    if (step.key === "ready" && currentStepIndex >= 4 && createdAtValid) {
      const d = new Date(createdAt!);
      if (isValidDate(d)) {
        d.setMinutes(d.getMinutes() + 4);
        time = formatDateTime(d.toISOString());
      }
    }
    if (step.key === "completed") {
      const ts = completedAt;
      if (ts && typeof ts === "string" && isValidDate(new Date(ts))) time = formatDateTime(ts);
    }
    return { ...step, done, current, time };
  });

  const displayItems =
    (order?.items ?? []).length > 0
      ? (order!.items ?? []).map((item) => ({
          product_name: toDisplayValue(item.product_name, "-"),
          variant_name: toDisplayValue((item as { variant_name?: string }).variant_name, "-"),
          extras: Array.isArray(item.extras) ? item.extras : [],
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          unit_price: toDisplayValue(item.unit_price, "0.00"),
          total_gross_price: toDisplayValue(item.total_gross_price, "0.00"),
          id: item.id,
        }))
      : [];

  const subtotal = toDisplayValue(order?.subtotal_gross, EMPTY_VALUE);
  const vat = toDisplayValue(order?.tax_breakdown?.[0]?.tax, EMPTY_VALUE);
  const vatRate = typeof order?.tax_breakdown?.[0]?.rate === "number" ? order.tax_breakdown[0].rate : 0;
  const discount = toDisplayValue(order?.discount_amount, "0.00");
  const total = toDisplayValue(order?.total_gross, EMPTY_VALUE);

  const customerName =
    `${toDisplayValue(order?.customer_first_name, "")} ${toDisplayValue(order?.customer_last_name, "")}`.trim() ||
    EMPTY_VALUE;
  const customerEmail = toDisplayValue(order?.customer_email, EMPTY_VALUE);
  const loyaltyPoints =
    order?.customer_card
      ? `${toDisplayValue(order.customer_card, "")} Points`
      : (order as { customer_points?: number })?.customer_points != null && typeof (order as { customer_points?: number }).customer_points === "number"
        ? `${(order as { customer_points: number }).customer_points} Points`
        : EMPTY_VALUE;
  const customerPhone = toDisplayValue(
    order?.customer_phone,
    EMPTY_VALUE,
  );

  const paymentMethod =
    order?.payment_method != null && typeof order.payment_method === "string"
      ? `${formatPaymentMethod(order.payment_method)}${(order as ExtendedOrder)?.card_last4 ? ` (Visa ending ${toDisplayValue((order as ExtendedOrder).card_last4, "")})` : ""}`
      : EMPTY_VALUE;
  const transactionId = toDisplayValue(
    (order as ExtendedOrder)?.transaction_id,
    EMPTY_VALUE,
  );
  const paidAmount = total !== EMPTY_VALUE ? `$${total}` : EMPTY_VALUE;
  const vatBreakdown = vat !== EMPTY_VALUE ? `$${vat} (${vatRate}%)` : EMPTY_VALUE;
  const paymentStatus = (toDisplayValue(order?.payment_status, "")).toLowerCase() === "paid" ? "paid" : "paid";

  const terminal = toDisplayValue(
    order?.terminal_name ?? order?.terminal_code,
    EMPTY_VALUE,
  );
  const location = toDisplayValue(order?.location_name, EMPTY_VALUE);
  const orderType = formatOrderType(order?.mode) || EMPTY_VALUE;
  const tableNumber = toDisplayValue(
    (order as ExtendedOrder)?.table_number,
    EMPTY_VALUE,
  );
  const staffOverride = toDisplayValue(
    (order as ExtendedOrder)?.staff_override,
    EMPTY_VALUE,
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Orders
          </Link>
          <div className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
            {error}{" "}
            <button type="button" onClick={fetchOrder} className="font-semibold underline">
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743] print:hidden"
            >
              <ArrowLeft size={16} />
              Back to Orders
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] leading-none font-extrabold text-[#171d27]">
                Order #{toDisplayValue(order?.order_number, id)}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                  order?.status === "COMPLETED"
                    ? "bg-[#d1fae5] text-[#065f46]"
                    : order?.status === "CANCELLED"
                      ? "bg-[#fee2e2] text-[#991b1b]"
                      : "bg-[#ccff1f] text-[#1d2512]"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#3f4653]"
            >
              <Printer size={14} />
              Print
            </button>
            {order && order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
              <>
                <button
                  type="button"
                  onClick={() => updateStatus("CANCELLED")}
                  disabled={isUpdating}
                  className="h-10 rounded-lg border border-[#e4e6ea] bg-[#fef9c3] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
                >
                  Cancel Order
                </button>
                {order.status === "PENDING" || order.status === "CONFIRMED" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("PREPARING")}
                    disabled={isUpdating}
                    className="h-10 rounded-lg bg-[#f59e0b] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Start Preparing
                  </button>
                ) : null}
                {order.status === "PREPARING" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("READY")}
                    disabled={isUpdating}
                    className="h-10 rounded-lg bg-[#22c55e] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Mark as Ready
                  </button>
                ) : null}
                {order.status === "READY" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("COMPLETED")}
                    disabled={isUpdating}
                    className="h-10 rounded-lg bg-[#22c55e] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Mark as Completed
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Order Items</h2>
              <div className="mt-3 divide-y divide-[#eceff3]">
                {displayItems.map((item) => (
                  <div key={item.id ?? item.product_name} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1f2733]">{item.product_name}</p>
                        {(item.extras ?? []).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-[12px] font-medium text-[#6e7785]">
                              Selected modifiers
                            </p>
                            {(item.extras ?? []).map((extra, i) => {
                              const name = toDisplayValue((extra as { extra_name?: string })?.extra_name, "");
                              return (
                                <p key={i} className="text-[13px] text-[#6e7785]">
                                  {name.toLowerCase().startsWith("no ") ? name : name ? `+ ${name}` : ""}
                                </p>
                              );
                            })}
                          </div>
                        )}
                        <p className="mt-1 text-[14px] text-[#7b8492]">
                          {item.variant_name ?? "Regular"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-semibold text-[#2a313d]">
                          {item.quantity} x ${item.unit_price}
                        </p>
                        <p className="text-[15px] font-bold text-[#1f2733]">
                          ${item.total_gross_price}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-[#eceff3] pt-4 space-y-2">
                <div className="flex justify-end gap-8 text-[15px]">
                  <span className="text-[#3a4350]">Subtotal</span>
                  <span className="font-semibold text-[#1d2430]">{subtotal !== EMPTY_VALUE ? `$${subtotal}` : subtotal}</span>
                </div>
                <div className="flex justify-end gap-8 text-[15px]">
                  <span className="text-[#3a4350]">VAT ({vatRate}%)</span>
                  <span className="font-semibold text-[#1d2430]">{vat !== EMPTY_VALUE ? `$${vat}` : vat}</span>
                </div>
                <div className="flex justify-end gap-8 text-[15px]">
                  <span className="text-[#3a4350]">Discount (if applied)</span>
                  <span className="font-semibold text-[#1d2430]">- ${discount}</span>
                </div>
                <div className="flex justify-end gap-8 text-[18px] font-extrabold text-[#111822]">
                  <span>Final Total</span>
                  <span>{total !== EMPTY_VALUE ? `$${total}` : total}</span>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h3 className="text-[18px] font-bold text-[#1a212c]">Order Timeline</h3>
              <div className="mt-4 space-y-0">
                {timeline.map((step, index) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full ${
                          step.current
                            ? "border-2 border-[#ccff1f] bg-[#edf8c6]"
                            : step.done
                              ? "bg-[#22c55e]"
                              : "border-2 border-[#c8ced7] bg-white"
                        }`}
                      />
                      {index !== timeline.length - 1 && (
                        <div
                          className={`mt-1 h-6 shrink-0 ${
                            step.done ? "w-0.5 bg-[#22c55e]" : "w-0 border-l-2 border-dashed border-[#d1d5db]"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-[15px] font-semibold ${
                          step.done ? "text-[#1e2530]" : step.current ? "text-[#1e2530]" : "text-[#8a92a0]"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[13px] text-[#656f7d]">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h3 className="text-[18px] font-bold text-[#1a212c]">Customer Info</h3>
              <div className="mt-3 space-y-3">
                <InfoRow label="Customer name" value={customerName} />
                <InfoRow label="Email" value={customerEmail} />
                <InfoRow label="Loyalty points" value={loyaltyPoints} />
                <InfoRow label="Phone number" value={customerPhone} />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h3 className="text-[18px] font-bold text-[#1a212c]">Payment Details</h3>
              <div className="mt-3 space-y-3">
                <InfoRow label="Payment Method" value={paymentMethod} />
                <InfoRow label="Transaction ID" value={transactionId} />
                <InfoRow label="Paid amount" value={paidAmount} />
                <InfoRow label="VAT breakdown" value={vatBreakdown} />
                <InfoRow
                  label="Payment status"
                  value={
                    paymentStatus === "paid" ? (
                      <span className="inline-flex rounded-full bg-[#22c55e] px-2.5 py-1 text-[12px] font-semibold text-white">
                        Paid
                      </span>
                    ) : (
                      toDisplayValue(order?.payment_status, EMPTY_VALUE)
                    )
                  }
                />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h3 className="text-[18px] font-bold text-[#1a212c]">Order Meta</h3>
              <div className="mt-3 space-y-3">
                <InfoRow label="Terminal" value={terminal} />
                <InfoRow label="Location" value={location} />
                <InfoRow label="Order Type" value={orderType} />
                <InfoRow label="Table number" value={tableNumber} />
                <InfoRow label="Staff override" value={staffOverride} />
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
