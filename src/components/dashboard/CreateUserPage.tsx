"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, X } from "lucide-react";
import toast from "react-hot-toast";
import { orderzillaApi } from "@/lib/api";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "VIEWER", label: "Staff" },
];

type LocationOption = { id: string; name: string };

function Toggle({ on, onToggle }: { on: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function CreateUserPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "VIEWER">("MANAGER");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [canManageProducts, setCanManageProducts] = useState(true);
  const [canManageLoyalty, setCanManageLoyalty] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8;

  useEffect(() => {
    orderzillaApi.dashboard.locations
      .list()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { locations?: LocationOption[] })?.locations ?? [];
        setLocations(
          list.map((l: { id?: string; name?: string }) => ({
            id: l.id ?? "",
            name: toDisplayValue(l.name, EMPTY_VALUE),
          })),
        );
      })
      .catch(() => {});
  }, []);

  const addLocation = (id: string) => {
    if (id && !locationIds.includes(id)) setLocationIds((prev) => [...prev, id]);
  };

  const removeLocation = (id: string) => {
    setLocationIds((prev) => prev.filter((l) => l !== id));
  };

  const onSave = async () => {
    if (!isFormValid) return;
    try {
      setIsSubmitting(true);
      await orderzillaApi.dashboard.users.create({
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim() || undefined,
          location_ids: locationIds.length > 0 ? locationIds : undefined,
          can_manage_products: canManageProducts,
          can_manage_loyalty: canManageLoyalty,
          is_active: isActive,
        },
      });
      toast.success("User created.");
      router.push("/dashboard/users");
    } catch {
      toast.error("Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="text-[14px] text-[#7a8291]">
              <Link href="/dashboard/users" className="hover:text-[#2f3743]">
                Users
              </Link>
              <span className="mx-1">/</span>
              <span>Create</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] font-extrabold text-[#1a2029] mt-1">
              Create User
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSubmitting || !isFormValid}
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Save"}
            </button>
            <Link
              href="/dashboard/users"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-6 text-[14px] font-semibold text-[#414855] inline-flex items-center"
            >
              Cancel
            </Link>
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
                      className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
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
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    placeholder="john.smith@orderzilla.com"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                    Password (temporary)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    placeholder="Min 8 characters"
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
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-[#e5e7eb] flex items-center justify-center">
                      <User size={36} className="text-[#9ca3af]" />
                    </div>
                    <button
                      type="button"
                      className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[13px] font-semibold text-[#414855]"
                    >
                      Upload
                    </button>
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
                    onChange={(e) => setRole(e.target.value as "ADMIN" | "MANAGER" | "VIEWER")}
                    className="h-10 w-full max-w-[200px] rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  >
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
                    {locationIds.map((id) => {
                      const loc = locations.find((l) => l.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f0f4e8] px-2.5 py-1 text-[12px] font-medium text-[#1d2512]"
                        >
                          {toDisplayValue(loc?.name ?? id, EMPTY_VALUE)}
                          <button
                            type="button"
                            onClick={() => removeLocation(id)}
                            className="p-0.5 hover:bg-[#d4ff00]/30 rounded"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                    {locations.length > 0 && (
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
                    <Toggle on={canManageProducts} onToggle={setCanManageProducts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#363f4c]">Can manage loyalty</span>
                    <Toggle on={canManageLoyalty} onToggle={setCanManageLoyalty} />
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Security Settings</h2>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">Active</span>
                  <Toggle on={isActive} onToggle={setIsActive} />
                </div>
              </div>
            </article>
          </div>

          <div>
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Create User</h2>
              <p className="mt-2 text-[14px] text-[#6e7785]">
                Fill in the basic information and role to create a new dashboard user. The user will receive an email to set up their account.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
