"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";

type ApiCustomer = components["schemas"]["LoyaltyCustomer"];

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "Gold" | "Silver" | "Bronze" | "Platinum";
  points: number;
  orders: number;
  spend: string;
  status: "Active" | "Inactive";
};

function TierBadge({ tier }: { tier: string }) {
  if (tier === "Platinum") {
    return (
      <span className="rounded-full bg-[#e9d5ff] px-2.5 py-1 text-[11px] font-semibold text-[#6b21a8]">
        Platinum
      </span>
    );
  }
  if (tier === "Gold") {
    return (
      <span className="rounded-full bg-[#f6df8c] px-2.5 py-1 text-[11px] font-semibold text-[#7a5a14]">
        Gold
      </span>
    );
  }
  if (tier === "Silver") {
    return (
      <span className="rounded-full bg-[#e7ebf0] px-2.5 py-1 text-[11px] font-semibold text-[#56606d]">
        Silver
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#f0dfd1] px-2.5 py-1 text-[11px] font-semibold text-[#7f5a3a]">
      Bronze
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
          tier:
            tierFilter === "all"
              ? undefined
              : (tierFilter.toUpperCase() as "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"),
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
          tier:
            customer.tier === "PLATINUM"
              ? "Platinum"
              : customer.tier === "GOLD"
              ? "Gold"
              : customer.tier === "SILVER"
                ? "Silver"
                : "Bronze",
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

  const handleCreateCustomer = async () => {
    const cardNumber = window.prompt("Card number (required)")?.trim() ?? "";
    if (!cardNumber) {
      toast.error("Card number is required.");
      return;
    }

    const firstName = window.prompt("First name (optional)")?.trim() ?? "";
    const lastName = window.prompt("Last name (optional)")?.trim() ?? "";
    const email = window.prompt("Email (optional)")?.trim() ?? "";
    const phone = window.prompt("Phone (optional)")?.trim() ?? "";
    const birthDate = window.prompt("Birth date YYYY-MM-DD (optional)")?.trim() ?? "";

    const loadingToast = toast.loading("Creating customer...");
    try {
      await orderzillaApi.dashboard.loyalty.customers.create({
        body: {
          card_number: cardNumber,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          birth_date: birthDate || undefined,
        },
      });
      toast.success("Customer created.");
      syncQuery({ page: 1 });
      await fetchCustomers();
    } catch {
      toast.error("Failed to create customer.");
    } finally {
      toast.dismiss(loadingToast);
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
                { label: "Platinum", value: "platinum" },
                { label: "Gold", value: "gold" },
                { label: "Silver", value: "silver" },
                { label: "Bronze", value: "bronze" },
              ]}
              className="min-w-[130px]"
            />
            <button
              type="button"
              onClick={handleCreateCustomer}
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
    </div>
  );
}

