"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type ApiUser = components["schemas"]["User"];

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "Manager" | "Admin" | "Staff";
  lastLogin: string;
  active: boolean;
};

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </span>
  );
}

function roleClass(role: string) {
  if (role === "Manager") return "bg-[#d7ff3f] text-[#405116]";
  if (role === "Admin") return "bg-[#2f3541] text-white";
  return "bg-[#eceef2] text-[#58606d]";
}

function InitialAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-[#ffd7b1] flex items-center justify-center text-[12px] font-semibold text-[#7a4f21]">
      {initials}
    </div>
  );
}

function BulkActions({
  selectedCount,
  onActivate,
  onDeactivate,
  onDelete,
  onAssignRole,
}: {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onAssignRole: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] font-medium text-[#6e7785]">{selectedCount} users selected</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onActivate}
          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[12px] font-semibold text-[#3f4653]"
        >
          Activate
        </button>
        <button
          type="button"
          onClick={onDeactivate}
          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[12px] font-semibold text-[#3f4653]"
        >
          Deactivate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-9 rounded-lg border border-[#efc3c3] bg-[#fff7f7] px-6 text-[12px] font-semibold text-[#cf4a4a]"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onAssignRole}
          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[12px] font-semibold text-[#3f4653]"
        >
          Assign Role
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await orderzillaApi.dashboard.users.list();
      const users = (response?.users ?? []) as ApiUser[];
      setRows(
        users.map((user) => ({
          id: user.id ?? crypto.randomUUID(),
          name: user.name ?? "Unnamed user",
          email: user.email ?? "-",
          role:
            user.role === "ADMIN"
              ? "Admin"
              : user.role === "MANAGER"
                ? "Manager"
                : "Staff",
          lastLogin: user.created_at ? new Date(user.created_at).toLocaleString() : "-",
          active: user.is_active ?? true,
        })),
      );
    } catch {
      setError("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole =
        roleFilter === "all" || row.role.toLowerCase() === roleFilter.toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? row.active : !row.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);
  const allCurrentPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id));

  const setActiveForSelected = (active: boolean) => {
    setRows((prev) =>
      prev.map((row) => (selectedIds.includes(row.id) ? { ...row, active } : row)),
    );
  };

  const deleteSelected = () => {
    setRows((prev) => prev.filter((row) => !selectedIds.includes(row.id)));
    setSelectedIds([]);
  };

  return (
    <div className="p-3 md:p-4 lg:p-5 space-y-3">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">Users</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512]"
            >
              + Add User
            </button>
            <button
              type="button"
              className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[12px] font-semibold text-[#414855]"
            >
              Import
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchUsers} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="h-9 flex-1 rounded-lg border border-[#e4e6ea] bg-white px-3 flex items-center gap-2">
            <Search size={15} className="text-[#97a0ad]" />
            <input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <SelectMenu
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { label: "All Roles", value: "all" },
                { label: "Admin", value: "admin" },
                { label: "Manager", value: "manager" },
                { label: "Staff", value: "staff" },
              ]}
              className="min-w-[130px]"
            />
            <SelectMenu
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All Statuses", value: "all" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
              className="min-w-[130px]"
            />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
              className="text-[12px] font-semibold text-[#6385b5] ml-1"
            >
              Reset filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e6ea]">
          <table className="w-full min-w-[900px]">
            <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
              <tr className="text-[12px] text-[#6e7785] text-left">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked
                          ? Array.from(new Set([...prev, ...paginatedRows.map((r) => r.id)]))
                          : prev.filter((id) => !paginatedRows.some((row) => row.id === id)),
                      )
                    }
                    className="h-4 w-4 rounded border-[#cfd5de]"
                  />
                </th>
                <th className="px-2 py-2 font-semibold">Avatar</th>
                <th className="px-2 py-2 font-semibold">Name</th>
                <th className="px-2 py-2 font-semibold">Email</th>
                <th className="px-2 py-2 font-semibold">Role</th>
                <th className="px-2 py-2 font-semibold">Last Login</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((user, index) => (
                <tr
                  key={user.id}
                  className={`border-b last:border-b-0 border-[#edf0f4] text-[13px] ${
                    index === 0 || index === 1 ? "bg-[#f8f9fb]" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, user.id]
                            : prev.filter((id) => id !== user.id),
                        )
                      }
                      className="h-4 w-4 rounded border-[#cfd5de]"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <InitialAvatar name={user.name} />
                  </td>
                  <td className="px-2 py-3 font-semibold text-[#222a35]">
                    <Link
                      href={`/dashboard/users/${user.id}/edit-user`}
                      className="hover:underline"
                    >
                      {user.name}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{user.email}</td>
                  <td className="px-2 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${roleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{user.lastLogin}</td>
                  <td className="px-2 py-3">
                    <Toggle on={user.active} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowActionMenu
                      actions={[
                        { label: "Edit user", onClick: () => undefined },
                        {
                          label: user.active ? "Deactivate" : "Activate",
                          onClick: async () => {
                            const next = !user.active;
                            setRows((prev) =>
                              prev.map((row) =>
                                row.id === user.id ? { ...row, active: next } : row,
                              ),
                            );
                            await orderzillaApi.dashboard.users.update(user.id, {
                              body: {
                                is_active: next,
                                name: user.name,
                              },
                            });
                          },
                        },
                        {
                          label: "Delete user",
                          onClick: async () => {
                            setRows((prev) => prev.filter((row) => row.id !== user.id));
                            await orderzillaApi.dashboard.users.remove(user.id);
                          },
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <div className="mt-4">
          <BulkActions
            selectedCount={selectedIds.length}
            onActivate={() => setActiveForSelected(true)}
            onDeactivate={() => setActiveForSelected(false)}
            onDelete={deleteSelected}
            onAssignRole={() => undefined}
          />
        </div>
        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          label="users"
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          }}
        />
      </section>

      <BulkActions
        selectedCount={selectedIds.length}
        onActivate={() => setActiveForSelected(true)}
        onDeactivate={() => setActiveForSelected(false)}
        onDelete={deleteSelected}
        onAssignRole={() => undefined}
      />
    </div>
  );
}

