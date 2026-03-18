"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type CustomerDetailPageProps = { id: string };

type LoyaltyCustomer = components["schemas"]["LoyaltyCustomer"];
type LoyaltyTransaction = components["schemas"]["LoyaltyTransaction"];

type ExtendedCustomer = LoyaltyCustomer & {
  total_orders?: number;
  average_order_value?: string;
  lifetime_spend?: string;
  points_earned_over_time?: { month: string; points: number }[];
};

const TX_PAGE_SIZE = 10;

function getTXTypeLabel(type: string): string {
  if (type === "EARN") return "Purchase";
  if (type === "ADJUSTMENT") return "Adjustment";
  if (type === "REDEEM") return "Redemption";
  return type;
}

function getTXTypeClass(type: string): string {
  if (type === "EARN") return "bg-[#d5f5dc] text-[#2a6b39]";
  if (type === "ADJUSTMENT") return "bg-[#fde8be] text-[#855100]";
  if (type === "REDEEM") return "bg-[#f8d2d2] text-[#8f2a2a]";
  return "bg-[#e5e7eb] text-[#6b7280]";
}

function tierClass(tier?: string | null): string {
  if (tier === "GOLD") return "bg-[#fef3c7] text-[#92400e]";
  if (tier === "PLATINUM") return "bg-[#e0e7ff] text-[#3730a3]";
  if (tier === "SILVER") return "bg-[#e5e7eb] text-[#4b5563]";
  return "bg-[#e5e7eb] text-[#6b7280]";
}

function Toggle({ on, onToggle }: { on: boolean; onToggle?: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function CustomerDetailPage({ id }: CustomerDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txPage = Number(searchParams.get("tx_page") ?? "1") || 1;

  const [customer, setCustomer] = useState<ExtendedCustomer | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [totalTxPages, setTotalTxPages] = useState(1);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomer = useCallback(
    async (txPageNum = 1) => {
      try {
        setIsLoading(true);
        setError("");
        const [customerData, txRes] = await Promise.all([
          orderzillaApi.dashboard.loyalty.customers.byId(id),
          orderzillaApi.dashboard.loyalty.customers.transactions(id, {
            query: { page: txPageNum, limit: TX_PAGE_SIZE },
          }),
        ]);
        const cust = customerData as ExtendedCustomer;
        setCustomer(cust);
        const txList = (txRes?.transactions ?? []) as LoyaltyTransaction[];
        setTransactions(txList);
        const pagination = (txRes as { pagination?: { total_pages?: number } })?.pagination;
        setTotalTxPages(pagination?.total_pages ?? Math.max(1, Math.ceil(txList.length / TX_PAGE_SIZE)));
      } catch {
        setError("Failed to load customer details.");
        setCustomer(null);
        setTransactions([]);
        setTotalTxPages(1);
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchCustomer(txPage);
  }, [fetchCustomer, txPage]);

  const customerName =
    `${toDisplayValue(customer?.first_name, "")} ${toDisplayValue(customer?.last_name, "")}`.trim() || EMPTY_VALUE;

  const currentPoints = customer?.points_balance ?? 0;
  const totalOrders = (customer as ExtendedCustomer)?.total_orders ?? 0;
  const totalEarned = customer?.total_points_earned ?? 0;
  const totalRedeemed = customer?.total_points_redeemed ?? 0;
  const lifetimeSpend =
    (customer as ExtendedCustomer)?.lifetime_spend ?? customer?.total_spent ?? "0.00";
  const avgOrderValue = (customer as ExtendedCustomer)?.average_order_value ?? "0.00";
  const pointsChartData =
    (customer as ExtendedCustomer)?.points_earned_over_time ?? [];

  const displayTransactions = transactions;

  const isAdjustValid =
    adjustAmount.trim() !== "" &&
    Number.isFinite(Number(adjustAmount)) &&
    Number(adjustAmount) !== 0 &&
    Number.isInteger(Number(adjustAmount));

  const saveAdjustment = async () => {
    if (!isAdjustValid) {
      toast.error("Enter a valid adjustment amount (e.g., 100 or -50).");
      return;
    }
    const points = Number(adjustAmount);
    try {
      setIsAdjusting(true);
      await orderzillaApi.dashboard.loyalty.customers.adjust(id, {
        body: {
          points,
          description: adjustReason || "Manual adjustment",
        },
      });
      setAdjustAmount("");
      setAdjustReason("");
      toast.success("Points adjusted.");
      await fetchCustomer(txPage);
    } catch (err) {
      const msg = isAxiosError(err) && err.response?.data && typeof err.response.data === "object" && "message" in err.response.data
        ? String(err.response.data.message)
        : "Failed to adjust points.";
      toast.error(msg);
    } finally {
      setIsAdjusting(false);
    }
  };

  const deleteCustomer = async () => {
    try {
      await orderzillaApi.dashboard.loyalty.customers.remove(id);
      toast.success("Customer deleted.");
      router.push("/dashboard/customers");
    } catch {
      toast.error("Failed to delete customer.");
    }
  };

  const scrollToAdjustment = () => {
    document.getElementById("manual-adjustment")?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading && !customer) {
    return (
      <div className="p-4">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Customers
          </Link>
          <div className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
            {error}{" "}
            <button type="button" onClick={() => fetchCustomer(txPage)} className="font-semibold underline">
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="text-[14px] text-[#7a8291]">
              <Link href="/dashboard/customers" className="hover:text-[#2f3743]">
                Customers
              </Link>
              <span className="mx-1">/</span>
              <span className="font-semibold text-[#2f3743]">{customerName}</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {customerName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToAdjustment}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Adjust Points
            </button>
            <Link
              href={`/dashboard/customers/${id}/edit-customer`}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855] inline-flex items-center"
            >
              Edit Customer
            </Link>
            <button
              type="button"
              onClick={deleteCustomer}
              className="h-10 rounded-lg border border-[#fecaca] bg-white px-4 text-[14px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2]"
            >
              Delete Customer
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Customer Info</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[12px] text-[#6e7785]">Name</p>
                <p className="text-[16px] font-semibold text-[#222a35]">{customerName}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Card Number</p>
                <p className="text-[16px] font-semibold text-[#222a35]">
                  {(customer as { card_number?: string })?.card_number?.trim() || EMPTY_VALUE}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Email</p>
                <p className="text-[16px] font-semibold text-[#222a35]">
                  {customer?.email?.trim() || EMPTY_VALUE}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Phone</p>
                <p className="text-[16px] font-semibold text-[#222a35]">
                  {customer?.phone?.trim() || EMPTY_VALUE}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Loyalty Tier</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold ${tierClass(
                    customer?.tier,
                  )}`}
                >
                  {customer?.tier
                    ? customer.tier.charAt(0) + customer.tier.slice(1).toLowerCase()
                    : EMPTY_VALUE}
                </span>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Current Points Balance</p>
                <p className="text-[32px] leading-tight font-extrabold text-[#1a2029]">
                  {currentPoints} Points
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Total Orders</p>
                <p className="text-[16px] font-semibold text-[#222a35]">{totalOrders}</p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Account Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <Toggle
                    on={customer?.is_active ?? true}
                    onToggle={async (next) => {
                      if (!customer) return;
                      try {
                        setCustomer({ ...customer, is_active: next });
                        await orderzillaApi.dashboard.loyalty.customers.update(id, {
                          body: { is_active: next },
                        });
                        toast.success("Customer status updated.");
                      } catch {
                        setCustomer({ ...customer, is_active: !next });
                        toast.error("Failed to update status.");
                      }
                    }}
                  />
                  <span className="text-[14px] font-semibold text-[#2f3743]">
                    {customer?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Customer Summary</h2>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[12px] text-[#6e7785]">Total Points Earned</p>
                <p className="text-[20px] font-bold text-[#1a2029]">
                  {totalEarned.toLocaleString()} Points
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Total Points Redeemed</p>
                <p className="text-[20px] font-bold text-[#1a2029]">
                  {totalRedeemed.toLocaleString()} Points
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Lifetime Spend</p>
                <p className="text-[20px] font-bold text-[#1a2029]">
                  ${typeof lifetimeSpend === "string" ? lifetimeSpend : "0.00"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785]">Average Order Value</p>
                <p className="text-[20px] font-bold text-[#1a2029]">
                  ${avgOrderValue}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#6e7785] mb-2">Points Earned Over Time</p>
                <div className="h-32">
                  {pointsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pointsChartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <Area
                          type="monotone"
                          dataKey="points"
                          stroke="#d4ff00"
                          fill="#d4ff00"
                          fillOpacity={0.3}
                        />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[12px] italic text-[#9ca3af]">No points history yet</p>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
          <article className="rounded-xl border border-[#e4e6ea] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#e9ebef] bg-white flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Transaction History</h2>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#6e7785]">
                  Page {txPage} of {totalTxPages}
                </span>
                <button
                  type="button"
                  disabled={txPage <= 1}
                  onClick={() =>
                    router.replace(`/dashboard/customers/${id}?tx_page=${txPage - 1}`, {
                      scroll: false,
                    })
                  }
                  className="h-8 rounded border border-[#dfe3e8] px-2 text-[12px] font-semibold disabled:opacity-50"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  disabled={txPage >= totalTxPages}
                  onClick={() =>
                    router.replace(`/dashboard/customers/${id}?tx_page=${txPage + 1}`, {
                      scroll: false,
                    })
                  }
                  className="h-8 rounded border border-[#dfe3e8] px-2 text-[12px] font-semibold disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                  <tr className="text-[12px] text-[#6e7785] text-left">
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-2 py-2 font-semibold">Description</th>
                    <th className="px-2 py-2 font-semibold">Points Earned / Redeemed</th>
                    <th className="px-3 py-2 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-[14px] text-[#6b7280]">
                        No transactions yet
                      </td>
                    </tr>
                  ) : (
                    displayTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-[#edf0f4] text-[14px]">
                      <td className="px-3 py-3 text-[#2f3743]">
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : EMPTY_VALUE}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#2f3743]">
                            {toDisplayValue(tx.description ?? tx.order_number, EMPTY_VALUE)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getTXTypeClass(
                              tx.type ?? "EARN",
                            )}`}
                          >
                            {getTXTypeLabel(tx.type ?? "EARN")}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 font-semibold text-[#2f3743]">
                        {(tx.points ?? 0) >= 0 ? "+ " : ""}
                        {tx.points ?? 0} Points
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-[#2f3743]">
                        {tx.balance_after ?? 0} Points
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article
            id="manual-adjustment"
            className="rounded-xl border border-[#e4e6ea] bg-white p-4"
          >
            <h2 className="text-[18px] font-bold text-[#1a212c]">Manual Adjustment</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Adjustment Amount
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                  placeholder="e.g., 100 or -50"
                />
              </div>
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Reason
                </label>
                <textarea
                  className="w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none focus:border-[#c0eb1a]"
                  rows={4}
                  placeholder="Describe the reason for adjustment (required)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={saveAdjustment}
                disabled={isAdjusting || !isAdjustValid}
                className="h-10 w-full rounded-lg bg-[#d4ff00] text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isAdjusting ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
