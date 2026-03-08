"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";

type ApiUser = components["schemas"]["User"];
type UserApiRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserApiRole;
  lastLogin: string;
  active: boolean;
};

type UserTableResponse = {
  users?: ApiUser[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_items?: number;
    items_per_page?: number;
  };
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!on)}
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

function roleClass(role: UserApiRole) {
  if (role === "MANAGER") return "bg-[#d7ff3f] text-[#405116]";
  if (role === "ADMIN") return "bg-[#2f3541] text-white";
  if (role === "OWNER") return "bg-[#1f2937] text-white";
  return "bg-[#eceef2] text-[#58606d]";
}

function roleLabel(role: UserApiRole) {
  if (role === "MANAGER") return "Manager";
  if (role === "ADMIN") return "Admin";
  if (role === "OWNER") return "Owner";
  return "Viewer";
}

function roleOptionToApi(value: string): UserApiRole {
  if (value === "admin") return "ADMIN";
  if (value === "manager") return "MANAGER";
  if (value === "owner") return "OWNER";
  return "VIEWER";
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
  assignRole,
  onAssignRoleChange,
}: {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onAssignRole: () => void;
  assignRole: string;
  onAssignRoleChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-[#fafbfc] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] font-medium text-[#6e7785]">{selectedCount} users selected</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onActivate}
          disabled={selectedCount === 0}
          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[12px] font-semibold text-[#3f4653]"
        >
          Activate
        </button>
        <button
          type="button"
          onClick={onDeactivate}
          disabled={selectedCount === 0}
          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[12px] font-semibold text-[#3f4653]"
        >
          Deactivate
        </button>
        <SelectMenu
          value={assignRole}
          onChange={onAssignRoleChange}
          options={[
            { label: "Assign Role", value: "viewer" },
            { label: "Admin", value: "admin" },
            { label: "Manager", value: "manager" },
            { label: "Viewer", value: "viewer" },
          ]}
          className="min-w-[130px]"
        />
        <button
          type="button"
          onClick={onAssignRole}
          disabled={selectedCount === 0}
          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[12px] font-semibold text-[#3f4653]"
        >
          Assign Role
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="h-9 rounded-lg border border-[#efc3c3] bg-[#fff7f7] px-6 text-[12px] font-semibold text-[#cf4a4a]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const importRef = useRef<HTMLInputElement | null>(null);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("limit") ?? "20") || 20;
  const q = searchParams.get("q") ?? "";
  const roleFilter = searchParams.get("role") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";

  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(q);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignRole, setAssignRole] = useState("viewer");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const syncQuery = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") next.delete(key);
        else next.set(key, String(value));
      });
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncQuery({ q: searchInput.trim() || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, syncQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(pageSize));
      if (q.trim()) sp.set("search", q.trim());
      if (roleFilter !== "all") sp.set("role", roleFilter);
      if (statusFilter !== "all") sp.set("status", statusFilter);
      const response = await fetch(`/api/dashboard/users-table?${sp.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = (await response.json()) as UserTableResponse;
      const users = (data.users ?? []) as ApiUser[];
      setRows(
        users.map((user) => ({
          id: user.id ?? crypto.randomUUID(),
          name: user.name ?? "Unnamed user",
          email: user.email ?? "-",
          role: (user.role as UserApiRole) ?? "VIEWER",
          lastLogin: user.created_at ? new Date(user.created_at).toLocaleString() : "-",
          active: user.is_active ?? true,
        })),
      );
      setTotalItems(data.pagination?.total_items ?? users.length);
      setTotalPages(data.pagination?.total_pages ?? 1);
      setSelectedIds((prev) => prev.filter((id) => users.some((user) => user.id === id)));
    } catch {
      setError("Failed to load users.");
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, q, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const allCurrentPageSelected = useMemo(
    () => rows.length > 0 && rows.every((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  );

  const updateUsers = async (ids: string[], payload: { is_active?: boolean; role?: UserApiRole }) => {
    if (!ids.length) return;
    const loadingToast = toast.loading("Updating users...");
    try {
      await Promise.all(ids.map((id) => orderzillaApi.dashboard.users.update(id, { body: payload })));
      toast.success("Users updated.");
      setSelectedIds([]);
      await fetchUsers();
    } catch {
      toast.error("Failed to update users.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const deleteUsers = async (ids: string[]) => {
    if (!ids.length) return;
    const loadingToast = toast.loading("Deleting users...");
    try {
      await Promise.all(ids.map((id) => orderzillaApi.dashboard.users.remove(id)));
      toast.success("Users deleted.");
      setSelectedIds([]);
      await fetchUsers();
    } catch {
      toast.error("Failed to delete users.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleCreateUser = async () => {
    const name = window.prompt("User name")?.trim() ?? "";
    if (!name) return;
    const email = window.prompt("Email")?.trim() ?? "";
    if (!email) return;
    const password = window.prompt("Temporary password (min 8 chars)") ?? "";
    if (!password) return;
    const roleInput = (window.prompt("Role: ADMIN, MANAGER, VIEWER", "MANAGER") ?? "MANAGER").toUpperCase();
    const role: UserApiRole = roleInput === "ADMIN" ? "ADMIN" : roleInput === "VIEWER" ? "VIEWER" : "MANAGER";

    const loadingToast = toast.loading("Creating user...");
    try {
      await orderzillaApi.dashboard.users.create({ body: { name, email, password, role } });
      toast.success("User created.");
      syncQuery({ page: 1 });
      await fetchUsers();
    } catch {
      toast.error("Failed to create user.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      toast.error("CSV is empty.");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = {
      name: headers.indexOf("name"),
      email: headers.indexOf("email"),
      password: headers.indexOf("password"),
      role: headers.indexOf("role"),
    };
    if (idx.name < 0 || idx.email < 0 || idx.password < 0) {
      toast.error("CSV must include name,email,password headers.");
      return;
    }

    const loadingToast = toast.loading("Importing users...");
    try {
      let created = 0;
      for (const line of lines.slice(1)) {
        const cols = line.split(",").map((v) => v.trim());
        const name = cols[idx.name] ?? "";
        const email = cols[idx.email] ?? "";
        const password = cols[idx.password] ?? "";
        if (!name || !email || !password) continue;
        const roleValue = (idx.role >= 0 ? (cols[idx.role] ?? "") : "").toUpperCase();
        const role: UserApiRole =
          roleValue === "ADMIN" ? "ADMIN" : roleValue === "VIEWER" ? "VIEWER" : "MANAGER";
        await orderzillaApi.dashboard.users.create({ body: { name, email, password, role } });
        created += 1;
      }
      toast.success(`Imported ${created} user(s).`);
      syncQuery({ page: 1 });
      await fetchUsers();
    } catch {
      toast.error("Failed to import users.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="p-3 md:p-4 lg:p-5 space-y-3">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">Users</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateUser}
              className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512]"
            >
              + Add User
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="h-9 rounded-lg border border-[#e4e6ea] bg-white px-4 text-[12px] font-semibold text-[#414855]"
            >
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) await handleImport(file);
                event.currentTarget.value = "";
              }}
            />
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full text-[12px] text-[#2f3642] outline-none placeholder:text-[#9aa3ae]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <SelectMenu
              value={roleFilter}
              onChange={(value) => syncQuery({ role: value, page: 1 })}
              options={[
                { label: "All Roles", value: "all" },
                { label: "Admin", value: "admin" },
                { label: "Manager", value: "manager" },
                { label: "Viewer", value: "viewer" },
                { label: "Owner", value: "owner" },
              ]}
              className="min-w-[130px]"
            />
            <SelectMenu
              value={statusFilter}
              onChange={(value) => syncQuery({ status: value, page: 1 })}
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
                setSearchInput("");
                syncQuery({
                  q: undefined,
                  role: undefined,
                  status: undefined,
                  page: 1,
                });
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
                          ? Array.from(new Set([...prev, ...rows.map((r) => r.id)]))
                          : prev.filter((id) => !rows.some((row) => row.id === id)),
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-[13px] text-[#717c8e]">
                    No users found.
                  </td>
                </tr>
              ) : (
                rows.map((user, index) => (
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
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-[#3e4653]">{user.lastLogin}</td>
                  <td className="px-2 py-3">
                    <Toggle on={user.active} onToggle={(next) => updateUsers([user.id], { is_active: next })} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowActionMenu
                      actions={[
                        {
                          label: "Edit user",
                          onClick: () => router.push(`/dashboard/users/${user.id}/edit-user`),
                        },
                        {
                          label: "Assign Admin",
                          onClick: () => updateUsers([user.id], { role: "ADMIN" }),
                        },
                        {
                          label: "Assign Manager",
                          onClick: () => updateUsers([user.id], { role: "MANAGER" }),
                        },
                        {
                          label: "Assign Viewer",
                          onClick: () => updateUsers([user.id], { role: "VIEWER" }),
                        },
                        {
                          label: user.active ? "Deactivate" : "Activate",
                          onClick: () => updateUsers([user.id], { is_active: !user.active }),
                        },
                        {
                          label: "Delete user",
                          onClick: () => deleteUsers([user.id]),
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}

        <div className="mt-4">
          <BulkActions
            selectedCount={selectedIds.length}
            onActivate={() => updateUsers(selectedIds, { is_active: true })}
            onDeactivate={() => updateUsers(selectedIds, { is_active: false })}
            onDelete={() => deleteUsers(selectedIds)}
            assignRole={assignRole}
            onAssignRoleChange={setAssignRole}
            onAssignRole={() => updateUsers(selectedIds, { role: roleOptionToApi(assignRole) })}
          />
        </div>
        <TablePagination
          page={Math.max(1, page)}
          totalPages={Math.max(1, totalPages)}
          totalItems={totalItems}
          pageSize={pageSize}
          label="users"
          onPageChange={(nextPage) => syncQuery({ page: nextPage })}
          onPageSizeChange={(nextPageSize) => {
            syncQuery({ limit: nextPageSize, page: 1 });
          }}
        />
      </section>
    </div>
  );
}

