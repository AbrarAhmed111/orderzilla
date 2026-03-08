"use client";

import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";

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

export default function EditUserPage({ id }: EditUserPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "VIEWER">("MANAGER");
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError("");
      const user = await orderzillaApi.dashboard.users.byId(id);
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setRole((user?.role as "ADMIN" | "MANAGER" | "VIEWER") ?? "MANAGER");
      setActive(user?.is_active ?? true);
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
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.users.update(id, {
        body: { name, role, is_active: active },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async () => {
    await orderzillaApi.dashboard.users.remove(id);
  };

  const onResetPassword = async () => {
    await orderzillaApi.dashboard.users.resetPassword(id, {
      body: { new_password: "Temp@123456" },
    });
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">Users / {name || "User"} / Edit</p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              Edit User
            </h1>
            <p className="text-[12px] text-[#9aa3ae] mt-1">User ID: {id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512]"
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
              onClick={onDelete}
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-6 text-[14px] font-semibold text-[#cf4a4a]"
            >
              Delete User
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-3">
          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Basic Information</h2>
              <div className="mt-3 grid grid-cols-[1fr_1fr_90px] gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">First Name</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    value={name.split(" ")[0] ?? ""}
                    onChange={(e) => {
                      const last = name.split(" ").slice(1).join(" ");
                      setName(`${e.target.value} ${last}`.trim());
                    }}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Last Name</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    value={name.split(" ").slice(1).join(" ")}
                    onChange={(e) => {
                      const first = name.split(" ")[0] ?? "";
                      setName(`${first} ${e.target.value}`.trim());
                    }}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Avatar</label>
                  <div className="mt-1 h-14 w-14 rounded-full bg-[#ffd7b1] flex items-center justify-center text-[16px] font-bold text-[#7a4f21]">
                    JS
                  </div>
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
                  <label className="text-[14px] font-semibold text-[#4e5664]">
                    Phone <span className="font-normal text-[#7a8291]">(optional)</span>
                  </label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    defaultValue="+1 555 123 4567"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white text-[14px] font-semibold text-[#3f4653]"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Role & Permissions</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "ADMIN" | "MANAGER" | "VIEWER")}
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-left text-[14px] text-[#2f3743]"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Location Access</label>
                  <button
                    type="button"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-left text-[14px] text-[#2f3743]"
                  >
                    Downtown Branch, Westside Mall
                  </button>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-semibold text-[#2f3743]">Can manage products</span>
                      <Toggle on />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-semibold text-[#2f3743]">Can manage loyalty</span>
                      <Toggle on={false} />
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Security Settings</h2>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2f3743]">Active</span>
                  <div className="flex items-center gap-2">
                    <Toggle on={active} onToggle={setActive} />
                    <button
                      type="button"
                      onClick={onResetPassword}
                      className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#3f4653]"
                    >
                      Send password reset link
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2f3743]">
                    Require password reset on next login
                  </span>
                  <Toggle on={false} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2f3743]">
                    Two-factor authentication
                  </span>
                  <span className="rounded-full bg-[#d5f5dc] px-2.5 py-1 text-[12px] font-semibold text-[#2a6b39]">
                    Enabled
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Account Summary</h2>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-[13px] text-[#6e7785]">Last login date</p>
                  <p className="text-[16px] font-semibold text-[#2f3743]">Yesterday, 3:20 PM</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Account created date</p>
                  <p className="text-[16px] font-semibold text-[#2f3743]">Oct 15, 2023</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Created by</p>
                  <p className="text-[16px] font-semibold text-[#2f3743]">Anna Meier</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Login activity summary</p>
                  <ul className="mt-1 text-[13px] text-[#2f3743] space-y-1 list-disc pl-4">
                    <li>Oct 26 - 3:20 PM (Success)</li>
                    <li>Oct 25 - 11:02 AM (Success)</li>
                    <li>Oct 24 - 9:45 AM (Failed attempt)</li>
                  </ul>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#c33f3f]">Danger Zone</h2>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="h-10 w-full rounded-lg border border-[#efc3c3] bg-white text-[14px] font-semibold text-[#cf4a4a]"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="h-10 w-full rounded-lg bg-[#de2f2f] text-[14px] font-semibold text-white"
                >
                  Delete User
                </button>
                <p className="text-[14px] text-[#6e7785] text-center pt-1">
                  Are you sure you want to delete
                  <br />
                  {name || "this user"}?
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

