"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import type { components } from "@/types/orderzilla-openapi";

type CustomerDetailPageProps = { id: string };

function Toggle({ on, onToggle }: { on: boolean; onToggle?: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!on)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] text-[#6e7785]">{label}</p>
      <p className="text-[16px] font-semibold text-[#222a35]">{value}</p>
    </div>
  );
}

const TX_PAGE_SIZE = 20;

export default function CustomerDetailPage({ id }: CustomerDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txPage = Number(searchParams.get("tx_page") ?? "1") || 1;

  const [customer, setCustomer] = useState<components["schemas"]["LoyaltyCustomer"] | null>(null);
  const [transactions, setTransactions] = useState<components["schemas"]["LoyaltyTransaction"][]>([]);
  const [hasMoreTx, setHasMoreTx] = useState(true);
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
        const [customerData, tx] = await Promise.all([
          orderzillaApi.dashboard.loyalty.customers.byId(id),
          orderzillaApi.dashboard.loyalty.customers.transactions(id, {
            query: { page: txPageNum, limit: TX_PAGE_SIZE },
          }),
        ]);
        setCustomer(customerData);
        const txList = (tx?.transactions ?? []) as components["schemas"]["LoyaltyTransaction"][];
        setTransactions(txList);
        setHasMoreTx(txList.length >= TX_PAGE_SIZE);
      } catch {
        setError("Failed to load customer details.");
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
    `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() || "Customer";

  const adjustAmountError = validateField(adjustAmount, [
    {
      type: "custom",
      validate: (v) => {
        const n = Number(v);
        if (!v.trim()) return "Adjustment amount is required.";
        if (!Number.isFinite(n)) return "Must be a valid number.";
        if (n === 0) return "Amount must be non-zero (use + or -).";
        if (!Number.isInteger(n)) return "Must be a whole number.";
        return null;
      },
    },
  ]);
  const isAdjustFormValid = !adjustAmountError;

  const saveAdjustment = async () => {
    if (!isAdjustFormValid) return;
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
    } catch {
      toast.error("Failed to adjust points.");
    } finally {
      setIsAdjusting(false);
    }
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
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {error ? (
          <div className="mb-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button
              type="button"
              onClick={() => fetchCustomer(txPage)}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">Customers / {customerName}</p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {customerName}
            </h1>
            <p className="text-[12px] text-[#9aa3ae] mt-1">Customer ID: {id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/customers/${id}/edit-customer`}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] inline-flex items-center"
            >
              Edit Customer
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Info</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <InfoPair label="Name" value={customerName} />
                <InfoPair label="Email" value={customer?.email ?? "-"} />
                <InfoPair label="Phone" value={customer?.phone ?? "-"} />
                <div>
                  <p className="text-[13px] text-[#6e7785]">Loyalty Tier</p>
                  <span className="rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[12px] font-semibold text-[#4b5563]">
                    {customer?.tier
                      ? customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1).toLowerCase()
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[13px] text-[#6e7785]">Current Points Balance</p>
                  <p className="text-[44px] leading-none font-extrabold text-[#1a2029]">
                    {customer?.points_balance ?? 0} Points
                  </p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Account Status</p>
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
                    <span className="text-[16px] font-semibold text-[#2f3743]">
                      {customer?.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Summary</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[13px] text-[#6e7785]">Total Points Earned</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">
                    {customer?.total_points_earned ?? 0} Points
                  </p>
              </div>
              <div>
                <p className="text-[13px] text-[#6e7785]">Total Points Redeemed</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">
                    {customer?.total_points_redeemed ?? 0} Points
                  </p>
              </div>
              <div>
                <p className="text-[13px] text-[#6e7785]">Lifetime Spend</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">
                    ${customer?.total_spent ?? "0.00"}
                  </p>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-3 grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#e9ebef] bg-white flex items-center justify-between">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Transaction History</h2>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#6e7785]">Page {txPage}</span>
                <button
                  type="button"
                  disabled={txPage <= 1}
                  onClick={() =>
                    router.replace(
                      `/dashboard/customers/${id}?tx_page=${txPage - 1}`,
                      { scroll: false },
                    )
                  }
                  className="h-8 rounded border border-[#dfe3e8] px-2 text-[12px] font-semibold disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={!hasMoreTx}
                  onClick={() =>
                    router.replace(
                      `/dashboard/customers/${id}?tx_page=${txPage + 1}`,
                      { scroll: false },
                    )
                  }
                  className="h-8 rounded border border-[#dfe3e8] px-2 text-[12px] font-semibold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                <tr className="text-[13px] text-[#6e7785] text-left">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold">Description</th>
                  <th className="px-2 py-2 font-semibold">Points Earned / Redeemed</th>
                  <th className="px-3 py-2 font-semibold text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-[13px] text-[#717c8e]">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-[#edf0f4] text-[14px]">
                      <td className="px-3 py-3 text-[#2f3743]">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-semibold text-[#2f3743]">{tx.description ?? tx.type}</p>
                      </td>
                      <td className="px-2 py-3 font-semibold text-[#2f3743]">
                        {tx.points && tx.points > 0 ? "+" : ""}
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
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Manual Adjustment</h2>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[13px] text-[#6e7785]">Adjustment Amount</label>
                <ValidatedInput
                  value={adjustAmount}
                  onChange={setAdjustAmount}
                  rules={[
                    {
                      type: "custom",
                      validate: (v) => {
                        const n = Number(v);
                        if (!v.trim()) return "Adjustment amount is required.";
                        if (!Number.isFinite(n)) return "Must be a valid number.";
                        if (n === 0) return "Amount must be non-zero (use + or -).";
                        if (!Number.isInteger(n)) return "Must be a whole number.";
                        return null;
                      },
                    },
                  ]}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                  placeholder="e.g. 100 or -50"
                />
              </div>
              <div>
                <label className="text-[13px] text-[#6e7785]">Reason</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px]"
                  rows={4}
                  placeholder="Describe the reason for adjustment (required)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={saveAdjustment}
                disabled={isAdjusting || !isAdjustFormValid}
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

