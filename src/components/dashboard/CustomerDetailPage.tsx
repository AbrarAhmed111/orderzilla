"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
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

export default function CustomerDetailPage({ id }: CustomerDetailPageProps) {
  const [customer, setCustomer] = useState<components["schemas"]["LoyaltyCustomer"] | null>(null);
  const [transactions, setTransactions] = useState<components["schemas"]["LoyaltyTransaction"][]>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [customerData, tx] = await Promise.all([
        orderzillaApi.dashboard.loyalty.customers.byId(id),
        orderzillaApi.dashboard.loyalty.customers.transactions(id, { query: { page: 1, limit: 20 } }),
      ]);
      setCustomer(customerData);
      setTransactions((tx?.transactions ?? []) as components["schemas"]["LoyaltyTransaction"][]);
    } catch {
      setError("Failed to load customer details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const customerName =
    `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() || "Customer";

  const saveAdjustment = async () => {
    const points = Number(adjustAmount);
    if (!Number.isFinite(points) || points === 0) return;
    await orderzillaApi.dashboard.loyalty.customers.adjust(id, {
      body: {
        points,
        description: adjustReason || "Manual adjustment",
      },
    });
    setAdjustAmount("");
    setAdjustReason("");
    await fetchCustomer();
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
            <button type="button" onClick={fetchCustomer} className="font-semibold underline">
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
            <button
              type="button"
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Adjust Points
            </button>
            <Link
              href={`/dashboard/customers/${id}/edit-customer`}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Edit Customer
            </Link>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 text-[14px] font-semibold text-[#cf4a4a]"
            >
              Delete Customer
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Info</h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <InfoPair label="Name" value={customerName} />
                <InfoPair label="Email" value={customer?.email ?? "-"} />
                <InfoPair label="Phone" value={customer?.phone ?? "-"} />
                <div>
                  <p className="text-[13px] text-[#6e7785]">Loyalty Tier</p>
                  <span className="rounded-full bg-[#f6df8c] px-2.5 py-1 text-[12px] font-semibold text-[#7a5a14]">
                    {customer?.tier ?? "BRONZE"}
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
                <InfoPair label="Total Orders" value="-" />
                <div>
                  <p className="text-[13px] text-[#6e7785]">Account Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Toggle
                      on={customer?.is_active ?? true}
                      onToggle={async (next) => {
                        if (!customer) return;
                        setCustomer({ ...customer, is_active: next });
                        await orderzillaApi.dashboard.loyalty.customers.update(id, {
                          body: { is_active: next },
                        });
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
            <div className="mt-3 grid grid-cols-2 gap-3">
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
              <div>
                <p className="text-[13px] text-[#6e7785]">Average Order Value</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">-</p>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-[#6e7785]">Points Earned Over Time</p>
            <div className="mt-2 h-24 rounded-lg bg-gradient-to-t from-[#ebf7bf] to-transparent border border-[#eef2e3]" />
          </article>
        </div>

        <div className="mt-3 grid grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#e9ebef] bg-white">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Transaction History</h2>
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
                {transactions.map((tx) => (
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
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 border-t border-[#e9ebef] text-right text-[14px] text-[#5f6875]">
              Page 1 of 10
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Manual Adjustment</h2>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[13px] text-[#6e7785]">Adjustment Amount</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="e.g. 100 or -50"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
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
                className="h-10 w-full rounded-lg bg-[#d4ff00] text-[14px] font-semibold text-[#1d2512]"
              >
                Save Adjustment
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

