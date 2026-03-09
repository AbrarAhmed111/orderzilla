"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";

type ToggleProps = {
  on: boolean;
  onToggle?: (next: boolean) => void;
};

function Toggle({ on, onToggle }: ToggleProps) {
  const interactive = typeof onToggle === "function";
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!on)}
      disabled={!interactive}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      } ${interactive ? "cursor-pointer" : "cursor-default"}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-[#e4e6ea] bg-white p-3 md:p-4">
      <h2 className="text-[24px] font-bold text-[#1a212c]">{title}</h2>
      <div className="mt-3 space-y-2.5">{children}</div>
    </article>
  );
}

type ApiLocation = components["schemas"]["Location"];
type ApiTerminal = components["schemas"]["Terminal"];
type ApiLoyaltyProgram = components["schemas"]["LoyaltyProgram"];

type BusinessForm = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
};

type LoyaltyForm = {
  name: string;
  is_active: boolean;
  points_per_chf: number;
  chf_per_point: number;
  min_redeem_points: number;
  max_redeem_percent: number;
  expiry_days: number;
};

type TerminalForm = {
  id: string;
  name: string;
  mode: "INDOOR" | "TAKEAWAY";
  printer_host: string;
  printer_port: number;
  printer_width: number;
  is_active: boolean;
};

const DEFAULT_LOYALTY: LoyaltyForm = {
  name: "Orderzilla Punkte",
  is_active: true,
  points_per_chf: 1,
  chf_per_point: 0.01,
  min_redeem_points: 100,
  max_redeem_percent: 50,
  expiry_days: 365,
};

function mapLoyalty(program?: ApiLoyaltyProgram): LoyaltyForm {
  return {
    name: program?.name ?? DEFAULT_LOYALTY.name,
    is_active: program?.is_active ?? DEFAULT_LOYALTY.is_active,
    points_per_chf: program?.points_per_chf ?? DEFAULT_LOYALTY.points_per_chf,
    chf_per_point: program?.chf_per_point ?? DEFAULT_LOYALTY.chf_per_point,
    min_redeem_points: program?.min_redeem_points ?? DEFAULT_LOYALTY.min_redeem_points,
    max_redeem_percent: program?.max_redeem_percent ?? DEFAULT_LOYALTY.max_redeem_percent,
    expiry_days: program?.expiry_days ?? DEFAULT_LOYALTY.expiry_days,
  };
}

function isBusinessValid(b: BusinessForm): boolean {
  if (!b.name.trim() || b.name.trim().length < 2) return false;
  if (!b.address.trim() || b.address.trim().length < 2) return false;
  if (!b.city.trim() || b.city.trim().length < 2) return false;
  if (!b.timezone.trim() || b.timezone.trim().length < 3) return false;
  if (!/^[A-Za-z0-9_/+-]+$/.test(b.timezone.trim())) return false;
  if (b.country.trim() && !/^[A-Za-z]{2,3}$/.test(b.country.trim())) return false;
  return true;
}

function isLoyaltyValid(l: LoyaltyForm): boolean {
  if (!l.name.trim()) return false;
  const n = Number(l.points_per_chf);
  if (!Number.isFinite(n) || n < 0) return false;
  const c = Number(l.chf_per_point);
  if (!Number.isFinite(c) || c < 0.000001) return false;
  const minR = Number(l.min_redeem_points);
  if (!Number.isFinite(minR) || minR < 0 || minR !== Math.floor(minR)) return false;
  const maxP = Number(l.max_redeem_percent);
  if (!Number.isFinite(maxP) || maxP < 0 || maxP > 100) return false;
  const exp = Number(l.expiry_days);
  if (!Number.isFinite(exp) || exp < 1 || exp !== Math.floor(exp)) return false;
  return true;
}

function isTerminalValid(t: TerminalForm): boolean {
  if (!t.name.trim() || t.name.trim().length < 2) return false;
  if (!Number.isFinite(t.printer_port) || t.printer_port < 1 || t.printer_port > 65535) return false;
  if (!Number.isFinite(t.printer_width) || t.printer_width < 1) return false;
  return true;
}

export default function GlobalSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [business, setBusiness] = useState<BusinessForm>({
    id: "",
    name: "",
    address: "",
    city: "",
    country: "CH",
    timezone: "Europe/Zurich",
  });

  const [loyalty, setLoyalty] = useState<LoyaltyForm>(DEFAULT_LOYALTY);
  const [terminals, setTerminals] = useState<ApiTerminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState("");
  const [terminalForm, setTerminalForm] = useState<TerminalForm>({
    id: "",
    name: "",
    mode: "INDOOR",
    printer_host: "",
    printer_port: 9100,
    printer_width: 80,
    is_active: true,
  });

  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);
  const [isSavingTerminal, setIsSavingTerminal] = useState(false);

  const syncQuery = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, {
      scroll: false,
    });
  };

  const locationOptions = useMemo(
    () =>
      locations
        .filter((loc): loc is ApiLocation & { id: string } => Boolean(loc.id))
        .map((loc) => ({ label: loc.name ?? "Unnamed location", value: loc.id })),
    [locations],
  );

  const terminalOptions = useMemo(
    () =>
      terminals
        .filter((terminal): terminal is ApiTerminal & { id: string } => Boolean(terminal.id))
        .map((terminal) => ({
          label: `${terminal.name ?? "Unnamed"} (${terminal.terminal_code ?? "N/A"})`,
          value: terminal.id,
        })),
    [terminals],
  );

  const hydrateBusinessFromLocation = (location?: ApiLocation) => {
    if (!location?.id) return;
    setBusiness({
      id: location.id,
      name: location.name ?? "",
      address: location.address ?? "",
      city: location.city ?? "",
      country: location.country ?? "CH",
      timezone: location.timezone ?? "Europe/Zurich",
    });
  };

  const hydrateTerminalForm = (terminal?: ApiTerminal) => {
    if (!terminal?.id) return;
    setTerminalForm({
      id: terminal.id,
      name: terminal.name ?? "",
      mode: terminal.mode ?? "INDOOR",
      printer_host: terminal.printer_host ?? "",
      printer_port: terminal.printer_port ?? 9100,
      printer_width: terminal.printer_width ?? 80,
      is_active: terminal.is_active ?? true,
    });
  };

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [locationsRes, terminalsRes, loyaltyRes] = await Promise.all([
        orderzillaApi.dashboard.locations.list(),
        orderzillaApi.dashboard.terminals.list(),
        orderzillaApi.dashboard.loyalty.program.get().catch(() => undefined),
      ]);

      const nextLocations = (locationsRes?.locations ?? []) as ApiLocation[];
      const nextTerminals = (terminalsRes?.terminals ?? []) as ApiTerminal[];

      setLocations(nextLocations);
      setTerminals(nextTerminals);
      setLoyalty(mapLoyalty(loyaltyRes as ApiLoyaltyProgram | undefined));

      const initialLocationFromUrl = searchParams.get("location");
      const locationFromUrl = nextLocations.find((loc) => loc.id === initialLocationFromUrl);
      const firstLocation = locationFromUrl ?? nextLocations.find((loc) => Boolean(loc.id));
      if (firstLocation?.id) {
        setSelectedLocationId(firstLocation.id);
        hydrateBusinessFromLocation(firstLocation);
      }

      const initialTerminalFromUrl = searchParams.get("terminal");
      const terminalFromUrl = nextTerminals.find((terminal) => terminal.id === initialTerminalFromUrl);
      const firstTerminal = terminalFromUrl ?? nextTerminals.find((terminal) => Boolean(terminal.id));
      if (firstTerminal?.id) {
        setSelectedTerminalId(firstTerminal.id);
        hydrateTerminalForm(firstTerminal);
      }
    } catch {
      setError("Failed to load settings data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    syncQuery({
      location: selectedLocationId || undefined,
      terminal: selectedTerminalId || undefined,
    });
  }, [selectedLocationId, selectedTerminalId]);

  useEffect(() => {
    const target = locations.find((loc) => loc.id === selectedLocationId);
    if (target) hydrateBusinessFromLocation(target);
  }, [selectedLocationId, locations]);

  useEffect(() => {
    const target = terminals.find((terminal) => terminal.id === selectedTerminalId);
    if (target) hydrateTerminalForm(target);
  }, [selectedTerminalId, terminals]);

  const saveBusiness = async () => {
    if (!business.id) return;
    setIsSavingBusiness(true);
    try {
      await orderzillaApi.dashboard.locations.update(business.id, {
        body: {
          name: business.name,
          address: business.address,
          city: business.city,
          country: business.country,
          timezone: business.timezone,
        },
      });
      toast.success("Business settings saved.");
      await fetchAll();
    } catch {
      toast.error("Failed to save business settings.");
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const saveLoyalty = async () => {
    if (!isLoyaltyValid(loyalty)) {
      toast.error("Please fix validation errors before saving.");
      return;
    }
    setIsSavingLoyalty(true);
    try {
      await orderzillaApi.dashboard.loyalty.program.update({
        body: {
          name: loyalty.name,
          points_per_chf: Math.max(0, loyalty.points_per_chf),
          chf_per_point: Math.max(0.000001, loyalty.chf_per_point),
          min_redeem_points: Math.max(0, Math.floor(loyalty.min_redeem_points)),
          max_redeem_percent: Math.min(100, Math.max(0, loyalty.max_redeem_percent)),
          expiry_days: Math.max(1, Math.floor(loyalty.expiry_days)),
          is_active: loyalty.is_active,
        },
      });
      toast.success("Loyalty settings saved.");
      await fetchAll();
    } catch {
      toast.error("Failed to save loyalty settings.");
    } finally {
      setIsSavingLoyalty(false);
    }
  };

  const saveTerminal = async () => {
    if (!terminalForm.id) return;
    setIsSavingTerminal(true);
    try {
      await orderzillaApi.dashboard.terminals.update(terminalForm.id, {
        body: {
          name: terminalForm.name,
          mode: terminalForm.mode,
          printer_host: terminalForm.printer_host || undefined,
          printer_port: Math.max(1, terminalForm.printer_port),
          printer_width: Math.max(1, terminalForm.printer_width),
          is_active: terminalForm.is_active,
        },
      });
      toast.success("Terminal settings saved.");
      await fetchAll();
    } catch {
      toast.error("Failed to save terminal settings.");
    } finally {
      setIsSavingTerminal(false);
    }
  };

  const sendTerminalCommand = async (
    command: "RELOAD_MENU" | "MAINTENANCE_MODE" | "CLEAR_MAINTENANCE",
  ) => {
    const ids = selectedTerminalId
      ? [selectedTerminalId]
      : terminals.map((terminal) => terminal.id).filter(Boolean) as string[];
    if (!ids.length) {
      toast.error("No terminals available.");
      return;
    }
    const loadingToast = toast.loading("Sending command...");
    try {
      await Promise.all(
        ids.map((id) =>
          orderzillaApi.dashboard.terminals.commands.create(id, {
            body: { command },
          }),
        ),
      );
      toast.success("Command queued.");
    } catch {
      toast.error("Failed to send command.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 md:px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[36px] leading-none font-extrabold text-[#1a2029]">Global Settings</h1>
          <button
            type="button"
            onClick={fetchAll}
            className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855]"
          >
            Refresh
          </button>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchAll} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={8} columns={4} />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3 items-start">
            <Card title="Business Profile">
              <SelectMenu
                value={selectedLocationId}
                onChange={setSelectedLocationId}
                options={locationOptions.length ? locationOptions : [{ label: "No locations", value: "" }]}
              />
              <ValidatedInput
                value={business.name}
                onChange={(v) => setBusiness((prev) => ({ ...prev, name: v }))}
                rules={[
                  { type: "required", message: "Business name is required." },
                  { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                ]}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                placeholder="Business name"
              />
              <ValidatedInput
                value={business.address}
                onChange={(v) => setBusiness((prev) => ({ ...prev, address: v }))}
                rules={[
                  { type: "required", message: "Address is required." },
                  { type: "minLength", value: 2, message: "Address must be at least 2 characters." },
                ]}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                placeholder="Address"
              />
              <ValidatedInput
                value={business.city}
                onChange={(v) => setBusiness((prev) => ({ ...prev, city: v }))}
                rules={[
                  { type: "required", message: "City is required." },
                  { type: "minLength", value: 2, message: "City must be at least 2 characters." },
                ]}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                placeholder="City"
              />
              <div className="grid grid-cols-2 gap-2">
                <ValidatedInput
                  value={business.country}
                  onChange={(v) => setBusiness((prev) => ({ ...prev, country: v }))}
                  rules={[
                    {
                      type: "custom",
                      validate: (v) =>
                        v.trim() && !/^[A-Za-z]{2,3}$/.test(v.trim())
                          ? "Use 2–3 letter country code (e.g. CH, DE)"
                          : null,
                    },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Country"
                />
                <ValidatedInput
                  value={business.timezone}
                  onChange={(v) => setBusiness((prev) => ({ ...prev, timezone: v }))}
                  rules={[
                    { type: "required", message: "Timezone is required." },
                    {
                      type: "custom",
                      validate: (v) =>
                        v.trim().length < 3
                          ? "Enter a valid timezone (e.g. Europe/Zurich)"
                          : !/^[A-Za-z0-9_/+-]+$/.test(v.trim())
                            ? "Invalid timezone format"
                            : null,
                    },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Timezone (e.g. Europe/Zurich)"
                />
              </div>
              <button
                type="button"
                disabled={!business.id || isSavingBusiness || !isBusinessValid(business)}
                onClick={saveBusiness}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isSavingBusiness ? "Saving..." : "Save Business Settings"}
              </button>
            </Card>

            <Card title="Loyalty Program">
              <ValidatedInput
                value={loyalty.name}
                onChange={(v) => setLoyalty((prev) => ({ ...prev, name: v }))}
                rules={[
                  { type: "required", message: "Program name is required." },
                  { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                ]}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                placeholder="Program name"
              />
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#2f3743]">Program active</span>
                <Toggle
                  on={loyalty.is_active}
                  onToggle={(next) => setLoyalty((prev) => ({ ...prev, is_active: next }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ValidatedInput
                  value={String(loyalty.points_per_chf)}
                  onChange={(v) =>
                    setLoyalty((prev) => ({ ...prev, points_per_chf: Number(v) || 0 }))
                  }
                  rules={[
                    { type: "number", min: 0, message: "Must be ≥ 0." },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Points per CHF"
                />
                <ValidatedInput
                  value={String(loyalty.chf_per_point)}
                  onChange={(v) =>
                    setLoyalty((prev) => ({ ...prev, chf_per_point: Number(v) || 0 }))
                  }
                  rules={[
                    {
                      type: "custom",
                      validate: (v) => {
                        const n = Number(v);
                        if (!v.trim()) return null;
                        if (!Number.isFinite(n)) return "Must be a valid number.";
                        if (n < 0.000001) return "Must be at least 0.000001.";
                        return null;
                      },
                    },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="CHF per point"
                />
                <ValidatedInput
                  value={String(loyalty.min_redeem_points)}
                  onChange={(v) =>
                    setLoyalty((prev) => ({ ...prev, min_redeem_points: Number(v) || 0 }))
                  }
                  rules={[
                    { type: "number", min: 0, integer: true, message: "Must be a whole number ≥ 0." },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Min redeem points"
                />
                <ValidatedInput
                  value={String(loyalty.max_redeem_percent)}
                  onChange={(v) =>
                    setLoyalty((prev) => ({ ...prev, max_redeem_percent: Number(v) || 0 }))
                  }
                  rules={[
                    { type: "number", min: 0, max: 100, message: "Must be between 0 and 100." },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Max redeem %"
                />
              </div>
              <ValidatedInput
                value={String(loyalty.expiry_days)}
                onChange={(v) =>
                  setLoyalty((prev) => ({ ...prev, expiry_days: Number(v) || 0 }))
                }
                rules={[
                  { type: "number", min: 1, integer: true, message: "Must be at least 1 day." },
                ]}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                placeholder="Expiry days"
              />
              <button
                type="button"
                disabled={isSavingLoyalty}
                onClick={saveLoyalty}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isSavingLoyalty ? "Saving..." : "Save Loyalty Settings"}
              </button>
            </Card>

            <Card title="Terminal Controls">
              <SelectMenu
                value={selectedTerminalId}
                onChange={setSelectedTerminalId}
                options={terminalOptions.length ? terminalOptions : [{ label: "No terminals", value: "" }]}
              />
              <ValidatedInput
                value={terminalForm.name}
                onChange={(v) => setTerminalForm((prev) => ({ ...prev, name: v }))}
                rules={[
                  { type: "required", message: "Terminal name is required." },
                  { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                ]}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                placeholder="Terminal name"
              />
              <SelectMenu
                value={terminalForm.mode}
                onChange={(value) =>
                  setTerminalForm((prev) => ({
                    ...prev,
                    mode: value === "TAKEAWAY" ? "TAKEAWAY" : "INDOOR",
                  }))
                }
                options={[
                  { label: "Indoor", value: "INDOOR" },
                  { label: "Takeaway", value: "TAKEAWAY" },
                ]}
              />
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={terminalForm.printer_host}
                onChange={(e) => setTerminalForm((prev) => ({ ...prev, printer_host: e.target.value }))}
                placeholder="Printer host (optional)"
              />
              <div className="grid grid-cols-2 gap-2">
                <ValidatedInput
                  value={String(terminalForm.printer_port)}
                  onChange={(v) =>
                    setTerminalForm((prev) => ({
                      ...prev,
                      printer_port: v.trim() ? Number(v) : 0,
                    }))
                  }
                  rules={[
                    {
                      type: "custom",
                      validate: (v) => {
                        const n = Number(v);
                        if (!v.trim()) return "Port is required.";
                        if (!Number.isFinite(n) || !Number.isInteger(n))
                          return "Must be a whole number.";
                        if (n < 1 || n > 65535) return "Port must be 1–65535.";
                        return null;
                      },
                    },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Printer port"
                />
                <ValidatedInput
                  value={String(terminalForm.printer_width)}
                  onChange={(v) =>
                    setTerminalForm((prev) => ({
                      ...prev,
                      printer_width: v.trim() ? Number(v) : 0,
                    }))
                  }
                  rules={[
                    { type: "number", min: 1, integer: true, message: "Must be at least 1." },
                  ]}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Printer width"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#2f3743]">Terminal active</span>
                <Toggle
                  on={terminalForm.is_active}
                  onToggle={(next) => setTerminalForm((prev) => ({ ...prev, is_active: next }))}
                />
              </div>
              <button
                type="button"
                disabled={!terminalForm.id || isSavingTerminal || !isTerminalValid(terminalForm)}
                onClick={saveTerminal}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isSavingTerminal ? "Saving..." : "Save Terminal Config"}
              </button>
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => sendTerminalCommand("RELOAD_MENU")}
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white text-[12px] font-semibold text-[#3f4653]"
                >
                  Send Reload Menu
                </button>
                <button
                  type="button"
                  onClick={() => sendTerminalCommand("MAINTENANCE_MODE")}
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white text-[12px] font-semibold text-[#3f4653]"
                >
                  Enable Maintenance Mode
                </button>
                <button
                  type="button"
                  onClick={() => sendTerminalCommand("CLEAR_MAINTENANCE")}
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white text-[12px] font-semibold text-[#3f4653]"
                >
                  Clear Maintenance Mode
                </button>
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}

