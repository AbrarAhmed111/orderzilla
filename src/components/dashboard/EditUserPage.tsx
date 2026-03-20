"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, User, X } from "lucide-react";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { deleteDashboardUserOrThrow } from "@/lib/api/delete-dashboard-user";
import { proxiedImageSrc } from "@/lib/media-url";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type EditUserPageProps = { id: string };

type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";

type LoginActivity = {
  id: string;
  date: string;
  time: string;
  status: "success" | "failed";
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "VIEWER", label: "Staff" },
];

function Toggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle?: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle?.(!on)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function parseName(name: string): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export default function EditUserPage({ id }: EditUserPageProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("MANAGER");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [canManageProducts, setCanManageProducts] = useState(true);
  const [canManageLoyalty, setCanManageLoyalty] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [requirePasswordReset, setRequirePasswordReset] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [lastLogin, setLastLogin] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const displayName = `${firstName} ${lastName}`.trim() || EMPTY_VALUE;

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const user = await orderzillaApi.dashboard.users.byId(id);
      const apiRole = (user?.role as UserRole) ?? "MANAGER";
      setIsOwner(apiRole === "OWNER");
      const first = (user as { first_name?: string })?.first_name ?? parseName(user?.name ?? "").first;
      const last = (user as { last_name?: string })?.last_name ?? parseName(user?.name ?? "").last;
      setFirstName(toDisplayValue(first, ""));
      setLastName(toDisplayValue(last, ""));
      setEmail(toDisplayValue(user?.email, ""));
      setRole(apiRole);
      setIsActive(user?.is_active ?? true);
      setCreatedAt(
        user?.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : EMPTY_VALUE,
      );
      const ext = user as {
        phone?: string;
        location_ids?: string[];
        location_names?: string[];
        can_manage_products?: boolean;
        can_manage_loyalty?: boolean;
        last_login_at?: string;
        created_by?: string;
        login_activity?: LoginActivity[];
        avatar_url?: string;
      };
      setAvatarUrl(toDisplayValue(ext.avatar_url, ""));
      setAvatarLoadError(false);
      setPhone(toDisplayValue(ext.phone, ""));
      setLocationIds(ext.location_ids ?? []);
      setCanManageProducts(ext.can_manage_products ?? true);
      setCanManageLoyalty(ext.can_manage_loyalty ?? false);
      setLastLogin(
        ext.last_login_at
          ? (() => {
              const d = new Date(ext.last_login_at);
              const now = new Date();
              const isYesterday =
                d.getDate() === now.getDate() - 1 &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear();
              return isYesterday
                ? `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                : d.toLocaleString();
            })()
          : EMPTY_VALUE,
      );
      setCreatedBy(toDisplayValue(ext.created_by, EMPTY_VALUE));
      setLoginActivity(ext.login_activity ?? []);
      setTwoFactorEnabled((user as { two_factor_enabled?: boolean })?.two_factor_enabled ?? true);
    } catch {
      setError("Failed to load user.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("MANAGER");
      setLocationIds([]);
      setLastLogin(EMPTY_VALUE);
      setCreatedAt(EMPTY_VALUE);
      setCreatedBy(EMPTY_VALUE);
      setLoginActivity([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    orderzillaApi.dashboard.locations
      .list()
      .then((res) => {
        const list = (res as { locations?: { id?: string; name?: string }[] })?.locations ?? [];
        setLocations(
          list
            .map((l) => ({ id: l.id ?? "", name: toDisplayValue(l.name, EMPTY_VALUE) }))
            .filter((l) => l.id),
        );
      })
      .catch(() => {});
  }, []);

  const onSave = async () => {
    if (isOwner) return;
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.users.update(id, {
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          location_ids: locationIds.length > 0 ? locationIds : undefined,
          can_manage_products: canManageProducts,
          can_manage_loyalty: canManageLoyalty,
          is_active: isActive,
          role: role === "OWNER" ? undefined : (role as "ADMIN" | "MANAGER" | "VIEWER"),
          avatar_url: avatarUrl.trim() || undefined,
        },
      });
      toast.success("User updated.");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "error" in err ? String((err as { error: string }).error) : "";
      toast.error(msg === "cannot_modify_owner" ? "Owner accounts cannot be modified." : "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async () => {
    if (isOwner) return;
    try {
      setIsDeleting(true);
      await deleteDashboardUserOrThrow(id);
      toast.success("User deleted.");
      router.push("/dashboard/users");
    } catch (err: unknown) {
      let msg = "";
      if (err instanceof Error) {
        const e = err as Error & { isDeleteUserError?: boolean };
        if (e.isDeleteUserError) msg = e.message.trim();
      }
      if (!msg && isAxiosError(err) && err.response?.data != null) {
        const d = err.response.data;
        if (typeof d === "object" && d !== null) {
          msg =
            String((d as { message?: string }).message ?? (d as { error?: string }).error ?? "").trim();
        } else if (typeof d === "string") {
          msg = d;
        }
      }
      if (!msg && err && typeof err === "object" && "error" in err) {
        msg = String((err as { error: string }).error);
      }
      const lower = msg.toLowerCase();
      toast.error(
        lower.includes("cannot_modify_owner") || lower.includes("owner")
          ? "Owner accounts cannot be deleted."
          : msg || "Failed to delete user.",
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const onSendPasswordReset = () => {
    toast("Send password reset link: Backend endpoint not available.");
  };

  const onSetNewPassword = async () => {
    if (!id || !newPassword.trim() || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    try {
      setIsResettingPassword(true);
      await orderzillaApi.dashboard.users.resetPassword(id, {
        body: { new_password: newPassword.trim() },
      });
      toast.success("Password updated. User will need to use the new password on next login.");
      setShowSetPasswordModal(false);
      setNewPassword("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message ?? (err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "");
      toast.error(msg || "Failed to set password.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const addLocation = (locId: string) => {
    if (locId && !locationIds.includes(locId)) setLocationIds((prev) => [...prev, locId]);
  };

  const removeLocation = (locId: string) => {
    setLocationIds((prev) => prev.filter((l) => l !== locId));
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Users
          </Link>
          <div className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
            {error}{" "}
            <button type="button" onClick={fetchUser} className="font-semibold underline">
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
        {isOwner && (
          <div className="mb-3 rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-2 text-[12px] text-[#6e7785]">
            Owner accounts cannot be modified. Role, status, and delete actions are disabled.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="text-[14px] text-[#7a8291]">
              <Link href="/dashboard/users" className="hover:text-[#2f3743]">
                Users
              </Link>
              <span className="mx-1">/</span>
              <span className="font-semibold text-[#2f3743]">{displayName}</span>
              <span className="mx-1">/</span>
              <span>Edit</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] font-extrabold text-[#1a2029] mt-1">
              Edit User
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || isOwner}
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <Link
              href="/dashboard/users"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[14px] font-semibold text-[#414855] inline-flex items-center"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={isOwner}
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 rounded-lg border border-[#fecaca] bg-white px-6 text-[14px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2] disabled:opacity-50"
            >
              Delete User
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Basic Information</h2>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isOwner}
                      className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] disabled:opacity-60"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isOwner}
                      className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] disabled:opacity-60"
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isOwner}
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] disabled:opacity-60"
                    placeholder="john.smith@orderzilla.com"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isOwner}
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] disabled:opacity-60"
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden bg-[#e5e7eb] flex items-center justify-center">
                      {avatarUrl.trim() && !avatarLoadError ? (
                        <img
                          src={proxiedImageSrc(avatarUrl.trim()) ?? avatarUrl.trim()}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() => setAvatarLoadError(true)}
                        />
                      ) : (
                        <User size={36} className="text-[#9ca3af]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => { setAvatarUrl(e.target.value); setAvatarLoadError(false); }}
                        disabled={isOwner}
                        placeholder="https://example.com/avatar.jpg"
                        className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] disabled:opacity-60"
                      />
                      <p className="mt-1 text-[11px] text-[#6e7785]">Paste an image URL to set the avatar.</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Role & Permissions</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={isOwner}
                    className="h-10 w-full max-w-[200px] rounded-lg border border-[#dfe3e8] px-3 text-[14px] disabled:opacity-60"
                  >
                    <option value="OWNER">Owner</option>
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                    Location Access
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] rounded-lg border border-[#e4e6ea] bg-white px-3 py-2">
                    {locationIds.map((locId) => {
                      const loc = locations.find((l) => l.id === locId);
                      return (
                        <span
                          key={locId}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f0f4e8] px-2.5 py-1 text-[12px] font-medium text-[#1d2512]"
                        >
                          {toDisplayValue(loc?.name ?? locId, EMPTY_VALUE)}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => removeLocation(locId)}
                              className="p-0.5 hover:bg-[#d4ff00]/30 rounded"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                    {!isOwner && locations.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) addLocation(v);
                          e.target.value = "";
                        }}
                        className="text-[12px] rounded border border-[#dfe3e8] px-2 py-1 bg-white"
                      >
                        <option value="">+ Add location</option>
                        {locations
                          .filter((l) => !locationIds.includes(l.id))
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#363f4c]">Can manage products</span>
                    <Toggle
                      on={canManageProducts}
                      onToggle={setCanManageProducts}
                      disabled={isOwner}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#363f4c]">Can manage loyalty</span>
                    <Toggle
                      on={canManageLoyalty}
                      onToggle={setCanManageLoyalty}
                      disabled={isOwner}
                    />
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Security Settings</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">Active</span>
                  <Toggle on={isActive} onToggle={isOwner ? undefined : setIsActive} disabled={isOwner} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">
                    Require password reset on next login
                  </span>
                  <Toggle
                    on={requirePasswordReset}
                    onToggle={setRequirePasswordReset}
                    disabled={isOwner}
                  />
                </div>
                <button
                  type="button"
                  onClick={onSendPasswordReset}
                  className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
                >
                  Send password reset link
                </button>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">
                    Two-factor authentication
                  </span>
                  <span
                    className={`text-[14px] font-semibold ${
                      twoFactorEnabled ? "text-[#22c55e]" : "text-[#6e7785]"
                    }`}
                  >
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Account Summary</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[12px] text-[#6e7785]">Last login date</p>
                  <p className="text-[14px] font-semibold text-[#2f3743]">{lastLogin}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#6e7785]">Account created date</p>
                  <p className="text-[14px] font-semibold text-[#2f3743]">{createdAt}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#6e7785]">Created by</p>
                  <p className="text-[14px] font-semibold text-[#2f3743]">{createdBy}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#6e7785] mb-2">Login activity summary</p>
                  <div className="space-y-0">
                    {loginActivity.length === 0 ? (
                      <p className="text-[13px] text-[#717c8e]">No login activity yet</p>
                    ) : (
                      loginActivity.map((entry, i) => (
                        <div key={entry.id} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={`h-3 w-3 rounded-full ${
                                entry.status === "success" ? "bg-[#22c55e]" : "bg-[#ef4444]"
                              }`}
                            />
                            {i !== loginActivity.length - 1 && (
                              <div className="mt-0.5 h-5 w-px bg-[#e5e7eb]" />
                            )}
                          </div>
                          <div className="pb-3">
                            <p
                              className={`text-[13px] font-medium ${
                                entry.status === "success" ? "text-[#22c55e]" : "text-[#ef4444]"
                              }`}
                            >
                              {entry.date} - {entry.time} ({entry.status === "success" ? "Success" : "Failed attempt"})
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Danger Zone</h2>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSetPasswordModal(true)}
                  disabled={isOwner}
                  className="h-10 w-full rounded-lg border border-[#fecaca] bg-white text-[14px] font-semibold text-[#b91c1c] disabled:opacity-50"
                >
                  Set new password
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isOwner}
                  className="h-10 w-full rounded-lg bg-[#b91c1c] text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  Delete User
                </button>
                {showSetPasswordModal && (
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                    <p className="text-[13px] text-[#4b5563] mb-2">
                      Set a new password for {displayName}. They will need to use it on next login.
                    </p>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 8 characters)"
                      className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] mb-2"
                      minLength={8}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowSetPasswordModal(false); setNewPassword(""); }}
                        className="h-8 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[12px] font-semibold text-[#414855]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onSetNewPassword}
                        disabled={isResettingPassword || newPassword.trim().length < 8}
                        className="h-8 rounded-lg bg-[#d4ff00] px-3 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
                      >
                        {isResettingPassword ? "Setting..." : "Set password"}
                      </button>
                    </div>
                  </div>
                )}
                {showDeleteConfirm && (
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                    <p className="text-[13px] text-[#4b5563]">
                      Are you sure you want to delete {displayName}?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="h-8 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[12px] font-semibold text-[#414855]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={isDeleting || isOwner}
                        className="h-8 rounded-lg bg-[#b91c1c] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
