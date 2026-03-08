"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";

type ApiCustomer = components["schemas"]["LoyaltyCustomer"];

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  points: number;
  orders: number;
  spend: string;
  status: "Active" | "Inactive";
};

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  PLATINUM: { bg: "bg-[#e9d5ff]", text: "text-[#6b21a8]" },
  GOLD: { bg: "bg-[#f6df8c]", text: "text-[#7a5a14]" },
  SILVER: { bg: "bg-[#e7ebf0]", text: "text-[#56606d]" },
  BRONZE: { bg: "bg-[#f0dfd1]", text: "text-[#7f5a3a]" },
  STANDARD: { bg: "bg-[#e5e7eb]", text: "text-[#4b5563]" },
};

function TierBadge({ tier }: { tier: string }) {
  const upper = (tier ?? "").toUpperCase();
  const style = TIER_STYLES[upper] ?? TIER_STYLES.STANDARD;
  const label = upper ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : "—";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCardNumber, setCreateCardNumber] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const search = searchParams.get("search") ?? "";
  const tierFilter = searchParams.get("tier") ?? "all";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("limit") ?? "20") || 20;

  const syncQuery = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncQuery({ search: searchInput.trim() || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, syncQuery]);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await orderzillaApi.dashboard.loyalty.customers.list({
        query: {
          search: search || undefined,
          tier: tierFilter === "all" ? undefined : tierFilter.toUpperCase(),
          page,
          limit: pageSize,
        },
      });
      const customers = (response?.customers ?? []) as ApiCustomer[];
      setRows(
        customers.map((customer) => ({
          id: customer.id ?? crypto.randomUUID(),
          name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Unknown",
          email: customer.email ?? "-",
          phone: customer.phone ?? "-",
          tier: customer.tier ?? "STANDARD",
          points: customer.points_balance ?? 0,
          orders: 0,
          spend: customer.total_spent ? `$${customer.total_spent}` : "$0.00",
          status: customer.is_active ? "Active" : "Inactive",
        })),
      );
      const pagination = response?.pagination;
      setTotalItems(pagination?.total_items ?? customers.length);
      setTotalPages(pagination?.total_pages ?? 1);
    } catch {
      setError("Failed to load customers.");
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, tierFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const resetCreateForm = () => {
    setCreateCardNumber("");
    setCreateFirstName("");
    setCreateLastName("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateBirthDate("");
  };

  const cardNumberError = validateField(createCardNumber, [
    { type: "required", message: "Card number is required." },
    { type: "minLength", value: 2, message: "Card number must be at least 2 characters." },
  ]);
  const emailError =
    createEmail.trim().length > 0
      ? validateField(createEmail, [{ type: "email", message: "Enter a valid email address." }])
      : null;
  const phoneError =
    createPhone.trim().length > 0
      ? validateField(createPhone, [{ type: "phone", message: "Enter a valid phone number." }])
      : null;
  const isCreateFormValid = !cardNumberError && !emailError && !phoneError;

  const handleCreateCustomer = async () => {
    if (!isCreateFormValid) return;
    const cardNumber = createCardNumber.trim();
    try {
      setIsCreateSubmitting(true);
      await orderzillaApi.dashboard.loyalty.customers.create({
        body: {
          card_number: cardNumber,
          first_name: createFirstName.trim() || undefined,
          last_name: createLastName.trim() || undefined,
          email: createEmail.trim() || undefined,
          phone: createPhone.trim() || undefined,
          birth_date: createBirthDate || undefined,
        },
      });
      toast.success("Customer created.");
      setIsCreateModalOpen(false);
      resetCreateForm();
      syncQuery({ page: 1 });
      await fetchCustomers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error("A customer with this card number already exists.");
      } else {
        toast.error("Failed to create customer.");
      }
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const updateCustomerStatus = async (id: string, nextIsActive: boolean) => {
    try {
      setIsUpdatingStatus(true);
      await orderzillaApi.dashboard.loyalty.customers.update(id, {
        body: { is_active: nextIsActive },
      });
      toast.success("Customer status updated.");
      await fetchCustomers();
    } catch {
      toast.error("Failed to update customer status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Customers</h1>
          <div className="flex items-center gap-2">
            <SelectMenu
              value={tierFilter}
              onChange={(value) => {
                syncQuery({ tier: value, page: 1 });
              }}
              options={[
                { label: "All Tiers", value: "all" },
                { label: "Standard", value: "standard" },
                { label: "Bronze", value: "bronze" },
                { label: "Silver", value: "silver" },
                { label: "Gold", value: "gold" },
                { label: "Platinum", value: "platinum" },
              ]}
              className="min-w-[130px]"
            />
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[13px] font-semibold text-[#1d2512]"
            >
              + Add Customer
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchCustomers} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-3 h-10 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
          <Search size={16} className="text-[#97a0ad]" />
          <input
            type="search"
            autoComplete="off"
            placeholder="Search by name, email, or phone"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full text-[13px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
          />
        </div>

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e6ea]">
          <table className="w-full min-w-[960px]">
            <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
              <tr className="text-[12px] text-[#6e7785] text-left">
                <th className="px-3 py-2 font-semibold">Customer</th>
                <th className="px-2 py-2 font-semibold">Phone</th>
                <th className="px-2 py-2 font-semibold">Tier</th>
                <th className="px-2 py-2 font-semibold">Points</th>
                <th className="px-2 py-2 font-semibold">Orders</th>
                <th className="px-2 py-2 font-semibold">Lifetime Spend</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-[13px] text-[#717c8e]">
                    No customers found.
                  </td>
                </tr>
              ) : (
                rows.map((customer, index) => (
                <tr
                  key={customer.id}
                  className={`border-b last:border-b-0 border-[#edf0f4] text-[13px] ${
                    index === 1 ? "bg-[#f8f9fb]" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-3">
                    <div>
                      <p className="font-semibold text-[#222a35]">{customer.name}</p>
                      <p className="text-[#717c8e]">{customer.email}</p>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{customer.phone}</td>
                  <td className="px-2 py-3">
                    <TierBadge tier={customer.tier} />
                  </td>
                  <td className="px-2 py-3 font-semibold text-[#222a35]">{customer.points}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{customer.orders}</td>
                  <td className="px-2 py-3 text-[#3e4653]">{customer.spend}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        customer.status === "Active"
                          ? "bg-[#d5f5dc] text-[#2a6b39]"
                          : "bg-[#eceef2] text-[#5f6875]"
                      }`}
                    >
                      {customer.status}
                    </span>
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        updateCustomerStatus(customer.id, customer.status !== "Active")
                      }
                      className="ml-2 text-[11px] font-semibold text-[#6385b5] disabled:opacity-50"
                    >
                      {customer.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="text-[12px] font-semibold text-[#3f4653] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="customers"
          onPageChange={(nextPage) => syncQuery({ page: nextPage })}
          onPageSizeChange={(nextPageSize) => {
            syncQuery({ page: 1, limit: nextPageSize });
          }}
        />
      </section>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[620px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Create Customer</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[12px] text-[#6e7785]">Card Number *</label>
                <ValidatedInput
                  autoComplete="off"
                  value={createCardNumber}
                  onChange={setCreateCardNumber}
                  rules={[
                    { type: "required", message: "Card number is required." },
                    { type: "minLength", value: 2, message: "Card number must be at least 2 characters." },
                  ]}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                  placeholder="e.g. DEMO-0001"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">First Name</label>
                <input
                  autoComplete="off"
                  value={createFirstName}
                  onChange={(event) => setCreateFirstName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Last Name</label>
                <input
                  autoComplete="off"
                  value={createLastName}
                  onChange={(event) => setCreateLastName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Email</label>
                <ValidatedInput
                  type="email"
                  autoComplete="email"
                  name="customer-create-email"
                  value={createEmail}
                  onChange={setCreateEmail}
                  rules={[{ type: "email", message: "Enter a valid email address." }]}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6e7785]">Phone</label>
                <ValidatedInput
                  autoComplete="off"
                  value={createPhone}
                  onChange={setCreatePhone}
                  rules={[{ type: "phone", message: "Enter a valid phone number." }]}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[12px] text-[#6e7785]">Birth Date</label>
                <input
                  type="date"
                  autoComplete="off"
                  value={createBirthDate}
                  onChange={(event) => setCreateBirthDate(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomer}
                disabled={isCreateSubmitting || !isCreateFormValid}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isCreateSubmitting ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

