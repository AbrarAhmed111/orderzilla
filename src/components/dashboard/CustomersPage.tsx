"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type ApiCustomer = components["schemas"]["LoyaltyCustomer"];

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "Gold" | "Silver" | "Bronze";
  points: number;
  orders: number;
  spend: string;
  status: "Active" | "Inactive";
};

function TierBadge({ tier }: { tier: string }) {
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
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchCustomers = async () => {
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
            customer.tier === "GOLD"
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
      setPage(pagination?.current_page ?? page);
    } catch {
      setError("Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, tierFilter, page, pageSize]);

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029]">Customers</h1>
          <div className="flex items-center gap-2">
            <SelectMenu
              value={tierFilter}
              onChange={(value) => {
                setTierFilter(value);
                setPage(1);
              }}
              options={[
                { label: "All Tiers", value: "all" },
                { label: "Gold", value: "gold" },
                { label: "Silver", value: "silver" },
                { label: "Bronze", value: "bronze" },
              ]}
              className="min-w-[130px]"
            />
            <button
              type="button"
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
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
              {rows.map((customer, index) => (
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
              ))}
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
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      </section>
    </div>
  );
}

