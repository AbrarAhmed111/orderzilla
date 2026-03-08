"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
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

export default function GlobalSettingsPage() {
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

      const firstLocation = nextLocations.find((loc) => Boolean(loc.id));
      if (firstLocation?.id) {
        setSelectedLocationId(firstLocation.id);
        hydrateBusinessFromLocation(firstLocation);
      }

      const firstTerminal = nextTerminals.find((terminal) => Boolean(terminal.id));
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
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={business.name}
                onChange={(e) => setBusiness((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Business name"
              />
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={business.address}
                onChange={(e) => setBusiness((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={business.city}
                onChange={(e) => setBusiness((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="City"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={business.country}
                  onChange={(e) => setBusiness((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="Country"
                />
                <input
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={business.timezone}
                  onChange={(e) => setBusiness((prev) => ({ ...prev, timezone: e.target.value }))}
                  placeholder="Timezone"
                />
              </div>
              <button
                type="button"
                disabled={!business.id || isSavingBusiness}
                onClick={saveBusiness}
                className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] disabled:opacity-50"
              >
                {isSavingBusiness ? "Saving..." : "Save Business Settings"}
              </button>
            </Card>

            <Card title="Loyalty Program">
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={loyalty.name}
                onChange={(e) => setLoyalty((prev) => ({ ...prev, name: e.target.value }))}
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
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={loyalty.points_per_chf}
                  onChange={(e) =>
                    setLoyalty((prev) => ({ ...prev, points_per_chf: Number(e.target.value || 0) }))
                  }
                  placeholder="Points per CHF"
                />
                <input
                  type="number"
                  min={0.000001}
                  step="0.0001"
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={loyalty.chf_per_point}
                  onChange={(e) =>
                    setLoyalty((prev) => ({ ...prev, chf_per_point: Number(e.target.value || 0) }))
                  }
                  placeholder="CHF per point"
                />
                <input
                  type="number"
                  min={0}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={loyalty.min_redeem_points}
                  onChange={(e) =>
                    setLoyalty((prev) => ({ ...prev, min_redeem_points: Number(e.target.value || 0) }))
                  }
                  placeholder="Min redeem points"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={loyalty.max_redeem_percent}
                  onChange={(e) =>
                    setLoyalty((prev) => ({ ...prev, max_redeem_percent: Number(e.target.value || 0) }))
                  }
                  placeholder="Max redeem %"
                />
              </div>
              <input
                type="number"
                min={1}
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={loyalty.expiry_days}
                onChange={(e) =>
                  setLoyalty((prev) => ({ ...prev, expiry_days: Number(e.target.value || 0) }))
                }
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
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={terminalForm.name}
                onChange={(e) => setTerminalForm((prev) => ({ ...prev, name: e.target.value }))}
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
                placeholder="Printer host"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={terminalForm.printer_port}
                  onChange={(e) =>
                    setTerminalForm((prev) => ({ ...prev, printer_port: Number(e.target.value || 1) }))
                  }
                  placeholder="Printer port"
                />
                <input
                  type="number"
                  min={1}
                  className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={terminalForm.printer_width}
                  onChange={(e) =>
                    setTerminalForm((prev) => ({ ...prev, printer_width: Number(e.target.value || 1) }))
                  }
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
                disabled={!terminalForm.id || isSavingTerminal}
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

