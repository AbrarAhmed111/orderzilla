"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";

type EditUserPageProps = {
  id: string;
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

type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";

export default function EditUserPage({ id }: EditUserPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("MANAGER");
  const [active, setActive] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError("");
      const user = await orderzillaApi.dashboard.users.byId(id);
      const userRole = (user?.role as UserRole) ?? "MANAGER";
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setRole(userRole);
      setActive(user?.is_active ?? true);
      setIsOwner(userRole === "OWNER");
      setCreatedAt(user?.created_at ? new Date(user.created_at).toLocaleString() : "-");
    } catch {
      setError("Failed to load user.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const onSave = async () => {
    if (isOwner) return;
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.users.update(id, {
        body: { name, role, is_active: active },
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
      await orderzillaApi.dashboard.users.remove(id);
      toast.success("User deleted.");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "error" in err ? String((err as { error: string }).error) : "";
      toast.error(msg === "cannot_modify_owner" ? "Owner accounts cannot be deleted." : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const nameError = validateField(name, [
    { type: "required", message: "Name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const passwordError = validateField(newPassword, [
    { type: "required", message: "Password is required." },
    { type: "minLength", value: 8, message: "Password must be at least 8 characters." },
  ]);
  const isFormValid = !nameError;
  const isResetPasswordValid = newPassword.length > 0 && !passwordError;

  const onResetPassword = async () => {
    if (!isResetPasswordValid || passwordError || isOwner) return;
    try {
      setIsResettingPassword(true);
      await orderzillaApi.dashboard.users.resetPassword(id, {
        body: { new_password: newPassword },
      });
      setNewPassword("");
      toast.success("Password reset.");
    } catch {
      toast.error("Failed to reset password.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {error ? (
          <div className="mb-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}
          </div>
        ) : null}
        {isOwner ? (
          <div className="mb-3 rounded-lg border border-[#e5e7eb] bg-[#f8f9fb] px-3 py-2 text-[12px] text-[#6e7785]">
            Owner accounts cannot be modified. Role, status, and delete actions are disabled.
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">Users / {name || "User"} / Edit</p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">Edit User</h1>
            <p className="text-[12px] text-[#9aa3ae] mt-1">User ID: {id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !isFormValid || isOwner}
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[14px] font-semibold text-[#414855]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting || isOwner}
              onClick={onDelete}
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-6 text-[14px] font-semibold text-[#cf4a4a] disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">User Configuration</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[14px] font-semibold text-[#4e5664]">Name</label>
                <ValidatedInput
                  value={name}
                  onChange={setName}
                  rules={[
                    { type: "required", message: "Name is required." },
                    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                  ]}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[14px] font-semibold text-[#4e5664]">Email</label>
                <ValidatedInput
                  type="email"
                  value={email}
                  onChange={setEmail}
                  rules={[
                    { type: "required", message: "Email is required." },
                    { type: "email", message: "Enter a valid email address." },
                  ]}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#4e5664]">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={isOwner}
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-left text-[14px] text-[#2f3743] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#2f3743]">
                  <Toggle on={active} onToggle={isOwner ? undefined : setActive} />
                  {active ? "Active" : "Inactive"}
                </label>
              </div>
            </div>
          </article>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Account Summary</h2>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-[13px] text-[#6e7785]">Account created</p>
                  <p className="text-[16px] font-semibold text-[#2f3743]">{createdAt}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">User ID</p>
                  <p className="text-[16px] font-semibold text-[#2f3743]">{id}</p>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Reset Password</h2>
              {isOwner ? (
                <p className="mt-3 text-[13px] text-[#6e7785]">Owner accounts cannot be modified.</p>
              ) : (
              <div className="mt-3 space-y-2">
                <ValidatedInput
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  rules={[
                    { type: "required", message: "Password is required." },
                    { type: "minLength", value: 8, message: "Password must be at least 8 characters." },
                  ]}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                  placeholder="New password (min 8 chars)"
                />
                <button
                  type="button"
                  onClick={onResetPassword}
                  disabled={isResettingPassword || !isResetPasswordValid}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white text-[14px] font-semibold text-[#3f4653] disabled:opacity-50"
                >
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                </button>
              </div>
              )}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

