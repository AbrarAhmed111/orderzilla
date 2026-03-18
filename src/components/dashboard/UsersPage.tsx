"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import TablePagination from "@/components/dashboard/ui/TablePagination";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type ApiUser = components["schemas"]["User"];
type UserApiRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserApiRole;
  lastLogin: string;
  active: boolean;
  avatarUrl: string | null;
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

function Toggle({ on, onToggle }: { on: boolean; onToggle?: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!on)}
      disabled={!onToggle}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition disabled:opacity-60 disabled:cursor-not-allowed ${
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

function UserAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = avatarUrl && avatarUrl.trim() !== "" && !imgError;
  return showImage ? (
    <img
      src={avatarUrl}
      alt={name}
      className="h-9 w-9 rounded-full object-cover bg-[#f0f1f3]"
      onError={() => setImgError(true)}
    />
  ) : (
    <InitialAvatar name={name} />
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
            { label: "Assign Role", value: "" },
            { label: "Admin", value: "admin" },
            { label: "Manager", value: "manager" },
            { label: "Viewer", value: "viewer" },
          ]}
          className="min-w-[130px]"
          openAbove
        />
        <button
          type="button"
          onClick={onAssignRole}
          disabled={selectedCount === 0 || !assignRole}
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
  const [assignRole, setAssignRole] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("manager");
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
        users.map((user) => {
          const u = user as ApiUser & { last_login_at?: string; avatar_url?: string | null };
          const loginAt = u.last_login_at ?? user.created_at;
          const avatarUrl = typeof u.avatar_url === "string" && u.avatar_url.trim() ? u.avatar_url : null;
          return {
            id: toDisplayValue(user.id, "") || crypto.randomUUID(),
            name: toDisplayValue(user.name, EMPTY_VALUE),
            email: toDisplayValue(user.email, EMPTY_VALUE),
            role: (user.role as UserApiRole) ?? "VIEWER",
            lastLogin: loginAt ? new Date(loginAt).toLocaleString() : EMPTY_VALUE,
            active: user.is_active ?? true,
            avatarUrl,
          };
        }),
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

  const selectableRows = useMemo(() => rows.filter((r) => r.role !== "OWNER"), [rows]);
  const allCurrentPageSelected = useMemo(
    () =>
      selectableRows.length > 0 &&
      selectableRows.every((row) => selectedIds.includes(row.id)),
    [selectableRows, selectedIds],
  );

  const updateUsers = async (ids: string[], payload: { is_active?: boolean; role?: UserApiRole }) => {
    const ownerIds = new Set(rows.filter((r) => r.role === "OWNER").map((r) => r.id));
    const modifiableIds = ids.filter((id) => !ownerIds.has(id));
    if (!modifiableIds.length) return;
    const loadingToast = toast.loading("Updating users...");
    try {
      await Promise.all(
        modifiableIds.map((id) =>
          orderzillaApi.dashboard.users.update(id, {
            body: {
              is_active: payload.is_active,
              role: payload.role === "OWNER" ? undefined : (payload.role as "ADMIN" | "MANAGER" | "VIEWER"),
            },
          }),
        ),
      );
      toast.success("Users updated.");
      setSelectedIds([]);
      await fetchUsers();
    } catch {
      toast.error("Failed to update users.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const openDeleteModal = (ids: string[]) => {
    setDeleteIds(ids);
    setIsDeleteModalOpen(true);
  };

  const deleteUsers = async (ids: string[]) => {
    const ownerIds = new Set(rows.filter((r) => r.role === "OWNER").map((r) => r.id));
    const modifiableIds = ids.filter((id) => !ownerIds.has(id));
    if (!modifiableIds.length) return;
    try {
      setIsDeleteSubmitting(true);
      await Promise.all(modifiableIds.map((id) => orderzillaApi.dashboard.users.remove(id)));
      toast.success("Users deleted.");
      setSelectedIds([]);
      setDeleteIds([]);
      setIsDeleteModalOpen(false);
      await fetchUsers();
    } catch {
      toast.error("Failed to delete users.");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("manager");
  };

  const createNameError = validateField(createName, [
    { type: "required", message: "Full name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const createEmailError = validateField(createEmail, [
    { type: "required", message: "Email is required." },
    { type: "email", message: "Enter a valid email address." },
  ]);
  const createPasswordError = validateField(createPassword, [
    { type: "required", message: "Password is required." },
    { type: "minLength", value: 8, message: "Password must be at least 8 characters." },
  ]);
  const isCreateUserFormValid =
    !createNameError && !createEmailError && !createPasswordError;

  const resetPasswordError = validateField(resetPasswordValue, [
    { type: "required", message: "Password is required." },
    { type: "minLength", value: 8, message: "Password must be at least 8 characters." },
  ]);
  const isResetPasswordFormValid = !resetPasswordError;

  const splitName = (name: string): { first: string; last: string } => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return { first: "", last: "" };
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  };

  const handleCreateUser = async () => {
    if (!isCreateUserFormValid) return;
    const { first, last } = splitName(createName);
    const email = createEmail.trim();
    const password = createPassword;
    const role = roleOptionToApi(createRole);
    try {
      setIsCreateSubmitting(true);
      await orderzillaApi.dashboard.users.create({
        body: {
          first_name: first,
          last_name: last,
          email,
          password,
          role: role === "OWNER" ? "MANAGER" : (role as "ADMIN" | "MANAGER" | "VIEWER"),
        },
      });
      toast.success("User created.");
      setIsCreateModalOpen(false);
      resetCreateForm();
      syncQuery({ page: 1 });
      await fetchUsers();
    } catch {
      toast.error("Failed to create user.");
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const openResetPasswordModal = (userId: string) => {
    setResetPasswordUserId(userId);
    setResetPasswordValue("");
    setIsResetPasswordModalOpen(true);
  };

  const submitResetPassword = async () => {
    if (!resetPasswordUserId || !isResetPasswordFormValid) return;
    try {
      setIsResettingPassword(true);
      await orderzillaApi.dashboard.users.resetPassword(resetPasswordUserId, {
        body: { new_password: resetPasswordValue },
      });
      toast.success("Password reset successfully.");
      setIsResetPasswordModalOpen(false);
      setResetPasswordUserId("");
      setResetPasswordValue("");
    } catch {
      toast.error("Failed to reset password.");
    } finally {
      setIsResettingPassword(false);
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
        const { first, last } = (() => {
          const parts = name.trim().split(/\s+/);
          if (parts.length === 0) return { first: "", last: "" };
          if (parts.length === 1) return { first: parts[0], last: "" };
          return { first: parts[0], last: parts.slice(1).join(" ") };
        })();
        await orderzillaApi.dashboard.users.create({
          body: {
            first_name: first,
            last_name: last,
            email,
            password,
            role,
          },
        });
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
    <div className="p-3 sm:p-4 md:p-4 lg:p-5 space-y-3">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 md:px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029]">Users</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/users/create-user"
              className="h-9 rounded-lg bg-[#d4ff00] px-3 sm:px-4 text-[12px] font-semibold text-[#1d2512] shrink-0 inline-flex items-center"
            >
              + Add User
            </Link>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
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
                if (file) {
                  setIsImportModalOpen(false);
                  await handleImport(file);
                }
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
              type="search"
              autoComplete="off"
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

        {selectedIds.length > 0 ? (
          <div className="mt-3">
            <BulkActions
              selectedCount={selectedIds.length}
              onActivate={() => updateUsers(selectedIds, { is_active: true })}
              onDeactivate={() => updateUsers(selectedIds, { is_active: false })}
              onDelete={() => openDeleteModal(selectedIds)}
              assignRole={assignRole}
              onAssignRoleChange={setAssignRole}
              onAssignRole={() => updateUsers(selectedIds, { role: roleOptionToApi(assignRole) })}
            />
          </div>
        ) : null}

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
                          ? Array.from(new Set([...prev, ...selectableRows.map((r) => r.id)]))
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
                      disabled={user.role === "OWNER"}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? [...prev, user.id]
                            : prev.filter((id) => id !== user.id),
                        )
                      }
                      className="h-4 w-4 rounded border-[#cfd5de] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <UserAvatar avatarUrl={user.avatarUrl} name={user.name} />
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
                    <Toggle
                      on={user.active}
                      onToggle={user.role === "OWNER" ? undefined : (next) => updateUsers([user.id], { is_active: next })}
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowActionMenu
                      actions={
                        user.role === "OWNER"
                          ? [
                              {
                                label: "Edit user",
                                onClick: () => router.push(`/dashboard/users/${user.id}/edit-user`),
                              },
                            ]
                          : [
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
                                onClick: () => openDeleteModal([user.id]),
                                danger: true,
                              },
                              {
                                label: "Reset Password",
                                onClick: () => openResetPasswordModal(user.id),
                              },
                            ]
                      }
                    />
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}

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

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[640px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Import Users CSV</h2>
            <p className="mt-1 text-[13px] text-[#6e7785]">
              Please make sure your CSV includes the required columns before upload.
            </p>

            <div className="mt-4 rounded-lg border border-[#e4e6ea] bg-[#fafbfc] p-3 text-[13px]">
              <p className="font-semibold text-[#2f3743]">Required</p>
              <p className="mt-1 text-[#4f5a69]">
                <code>name</code>, <code>email</code>, <code>password</code>
              </p>
              <p className="mt-3 font-semibold text-[#2f3743]">Optional</p>
              <p className="mt-1 text-[#4f5a69]">
                <code>role</code> (ADMIN, MANAGER, VIEWER)
              </p>
              <p className="mt-3 font-semibold text-[#2f3743]">Example header</p>
              <p className="mt-1 text-[#4f5a69] break-all">name,email,password,role</p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512]"
              >
                Choose CSV File
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[560px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Create User</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <ValidatedInput
                autoComplete="off"
                value={createName}
                onChange={setCreateName}
                rules={[
                  { type: "required", message: "Full name is required." },
                  { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                ]}
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                placeholder="Full name"
              />
              <ValidatedInput
                type="email"
                autoComplete="email"
                name="user-create-email"
                value={createEmail}
                onChange={setCreateEmail}
                rules={[
                  { type: "required", message: "Email is required." },
                  { type: "email", message: "Enter a valid email address." },
                ]}
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                placeholder="Email"
              />
              <ValidatedInput
                type="password"
                autoComplete="new-password"
                name="user-create-password"
                value={createPassword}
                onChange={setCreatePassword}
                rules={[
                  { type: "required", message: "Password is required." },
                  { type: "minLength", value: 8, message: "Password must be at least 8 characters." },
                ]}
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
                placeholder="Temporary password (min 8 chars)"
              />
              <SelectMenu
                value={createRole}
                onChange={setCreateRole}
                options={[
                  { label: "Manager", value: "manager" },
                  { label: "Admin", value: "admin" },
                  { label: "Viewer", value: "viewer" },
                ]}
              />
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
                onClick={handleCreateUser}
                disabled={isCreateSubmitting || !isCreateUserFormValid}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isCreateSubmitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[520px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">
              {deleteIds.length === 1 ? "Delete User" : "Delete Users"}
            </h2>
            <p className="mt-2 text-[13px] text-[#6e7785]">
              {deleteIds.length === 1
                ? "Are you sure you want to delete this user?"
                : `Are you sure you want to delete ${deleteIds.length} selected users?`}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleteSubmitting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteIds([]);
                }}
                className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleteSubmitting}
                onClick={() => deleteUsers(deleteIds)}
                className="h-9 rounded-lg bg-[#ef4a4c] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {isDeleteSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isResetPasswordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[520px] rounded-xl border border-[#e4e6ea] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-[20px] font-bold text-[#1a212c]">Reset User Password</h2>
            <p className="mt-1 text-[13px] text-[#6e7785]">Set a new temporary password.</p>
            <ValidatedInput
              type="password"
              autoComplete="new-password"
              name="user-reset-password"
              value={resetPasswordValue}
              onChange={setResetPasswordValue}
              rules={[
                { type: "required", message: "Password is required." },
                { type: "minLength", value: 8, message: "Password must be at least 8 characters." },
              ]}
              className="mt-4 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[13px] outline-none focus:border-[#c0eb1a]"
              placeholder="New password (min 8 chars)"
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isResettingPassword}
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingPassword || !isResetPasswordFormValid}
                onClick={submitResetPassword}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isResettingPassword ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

