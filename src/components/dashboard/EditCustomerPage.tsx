"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type EditCustomerPageProps = {
  id?: string;
};

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

const TX_PAGE_SIZE = 20;

/** API may return snake_case or camelCase; value may be date string, ISO datetime, or timestamp. */
function loyaltyBirthDateToInput(data: unknown): string {
  if (data == null || typeof data !== "object") return "";
  const o = data as Record<string, unknown>;
  const raw = o.birth_date ?? o.birthDate;
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export default function EditCustomerPage({ id }: EditCustomerPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txPage = Number(searchParams.get("tx_page") ?? "1") || 1;

  const [customer, setCustomer] = useState<components["schemas"]["LoyaltyCustomer"] | null>(null);
  const [transactions, setTransactions] = useState<components["schemas"]["LoyaltyTransaction"][]>([]);
  const [hasMoreTx, setHasMoreTx] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [tier, setTier] = useState("STANDARD");
  const [points, setPoints] = useState("0");
  const [active, setActive] = useState(true);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(
    async (txPageNum = 1) => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError("");
        const [customerData, txData] = await Promise.all([
          orderzillaApi.dashboard.loyalty.customers.byId(id),
          orderzillaApi.dashboard.loyalty.customers.transactions(id, {
            query: { page: txPageNum, limit: TX_PAGE_SIZE },
          }),
        ]);
        setCustomer(customerData);
        const txList = (txData?.transactions ?? []) as components["schemas"]["LoyaltyTransaction"][];
        setTransactions(txList);
        setHasMoreTx(txList.length >= TX_PAGE_SIZE);
        const fullName = `${toDisplayValue(customerData?.first_name, "")} ${toDisplayValue(customerData?.last_name, "")}`.trim();
        setName(fullName);
        setEmail(customerData?.email ?? "");
        setPhone(customerData?.phone ?? "");
        setBirthDate(loyaltyBirthDateToInput(customerData));
        setTier(customerData?.tier ?? "STANDARD");
        setPoints(String(customerData?.points_balance ?? 0));
        setActive(customerData?.is_active ?? true);
      } catch {
        setError("Failed to load customer.");
        setCustomer(null);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchData(txPage);
  }, [fetchData, txPage]);

  const onSave = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const trimmedName = name.trim();
      const [first_name, ...rest] = trimmedName.split(/\s+/).filter(Boolean);
      const last_name = rest.join(" ");
      const birthIso = birthDate.trim().slice(0, 10);
      const hasBirth = Boolean(birthIso && /^\d{4}-\d{2}-\d{2}$/.test(birthIso));
      /** Some backends expect camelCase JSON; send both when set. Omit when empty so strict APIs don’t reject null. */
      const birthPayload = hasBirth ? { birth_date: birthIso, birthDate: birthIso } : {};

      await orderzillaApi.dashboard.loyalty.customers.update(id, {
        body: {
          first_name: first_name || undefined,
          last_name: last_name || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          ...birthPayload,
          is_active: active,
        } as Parameters<typeof orderzillaApi.dashboard.loyalty.customers.update>[1]["body"],
      });
      toast.success("Customer updated.");
      await fetchData(txPage);
    } catch {
      toast.error("Failed to update customer.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const onDeleteCustomer = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      await orderzillaApi.dashboard.loyalty.customers.remove(id);
      toast.success("Customer deleted.");
      router.push("/dashboard/customers");
    } catch {
      toast.error("Failed to delete customer.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const onAdjustPoints = async () => {
    if (!id || !isAdjustFormValid) return;
    const amount = Number(adjustAmount);
    try {
      setIsAdjusting(true);
      await orderzillaApi.dashboard.loyalty.customers.adjust(id, {
        body: {
          points: amount,
          description: adjustReason.trim() || "Manual adjustment",
        },
      });
      toast.success("Points adjusted.");
      setAdjustAmount("");
      setAdjustReason("");
      await fetchData(txPage);
      const updated = await orderzillaApi.dashboard.loyalty.customers.byId(id);
      setCustomer(updated);
      setPoints(String(updated?.points_balance ?? 0));
    } catch (err) {
      const msg = isAxiosError(err) && err.response?.data && typeof err.response.data === "object" && "message" in err.response.data
        ? String(err.response.data.message)
        : "Failed to adjust points.";
      toast.error(msg);
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
            <button type="button" onClick={() => fetchData(txPage)} className="font-semibold underline">
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">Customers / {toDisplayValue(name, EMPTY_VALUE)} / Edit</p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              Edit Customer
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={id ? `/dashboard/customers/${id}` : "/customers"}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855] inline-flex items-center"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-10 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 text-[14px] font-semibold text-[#dc2626] hover:bg-[#fee2e2]"
            >
              Delete Customer
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Info</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Name</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Email</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Phone</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Birth Date</label>
                <input
                  type="date"
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Loyalty Tier</label>
                <p className="mt-1 text-[14px] font-medium text-[#2f3743]">{tier}</p>
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Points Balance</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  disabled
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Account Status</label>
                <div className="mt-2 flex items-center gap-2">
                  <Toggle on={active} onToggle={setActive} />
                  <span className="text-[16px] font-semibold text-[#2f3743]">
                    {active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Summary</h2>
            <div className="mt-3 space-y-2 text-[14px]">
              <p>
                Total Points Earned:{" "}
                <span className="font-semibold">{customer?.total_points_earned ?? 0}</span>
              </p>
              <p>
                Total Points Redeemed:{" "}
                <span className="font-semibold">{customer?.total_points_redeemed ?? 0}</span>
              </p>
              <p>
                Lifetime Spend: <span className="font-semibold">${customer?.total_spent ?? "0.00"}</span>
              </p>
            </div>
          </article>

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
                      `/dashboard/customers/${id}/edit-customer?tx_page=${txPage - 1}`,
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
                      `/dashboard/customers/${id}/edit-customer?tx_page=${txPage + 1}`,
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
                  <th className="px-2 py-2 font-semibold">Points</th>
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
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : EMPTY_VALUE}
                      </td>
                      <td className="px-2 py-3 font-semibold text-[#2f3743]">
                        {toDisplayValue(tx.description ?? tx.type, EMPTY_VALUE)}
                      </td>
                      <td className="px-2 py-3 font-semibold text-[#2f3743]">
                        {(tx.points ?? 0) > 0 ? "+" : ""}
                        {tx.points ?? 0}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-[#2f3743]">
                        {tx.balance_after ?? 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Manual Points Adjustment</h2>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[13px] text-[#6e7785]">Adjustment Amount (+ / -)</label>
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
                  placeholder="e.g., 100 or -50"
                />
              </div>
              <div>
                <label className="text-[13px] text-[#6e7785]">Reason (required)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px]"
                  rows={3}
                  placeholder="Describe the reason for adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={isAdjusting || !isAdjustFormValid}
                onClick={onAdjustPoints}
                className="h-10 w-full rounded-lg bg-[#d4ff00] text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isAdjusting ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </article>
        </div>
      </section>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[520px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Delete Customer</h2>
            <p className="mt-2 text-[13px] text-[#6e7785]">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onDeleteCustomer}
                className="h-9 rounded-lg bg-[#ef4a4c] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

