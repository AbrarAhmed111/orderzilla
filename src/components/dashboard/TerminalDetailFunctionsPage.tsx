"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type TerminalDetailFunctionsPageProps = {
  id: string;
};

type ApiTerminal = {
  name?: string;
  location_name?: string;
  mode?: "INDOOR" | "TAKEAWAY";
  is_active?: boolean;
  printer_host?: string | null;
  printer_port?: number;
  printer_width?: number;
  // Extended fields from functions endpoint (mock when absent)
  functions?: {
    enable_dine_in?: boolean;
    enable_takeaway?: boolean;
    enable_delivery?: boolean;
    allow_order_modification_before_payment?: boolean;
    order_timeout_seconds?: number;
    enable_loyalty_login?: boolean;
    allow_qr_code_scan?: boolean;
    require_customer_email?: boolean;
    allow_guest_checkout?: boolean;
    enable_cash?: boolean;
    enable_card?: boolean;
    enable_mobile_pay?: boolean;
    enable_gift_cards?: boolean;
    default_payment_method?: string;
    auto_close_order_after_payment?: boolean;
    enable_maintenance_mode_access?: boolean;
    show_debug_info?: boolean;
    age_verification?: boolean;
    auto_logout_seconds?: number;
    allow_manual_discount?: boolean;
    allow_staff_override?: boolean;
    max_discount_percent?: number;
    require_manager_pin?: boolean;
  };
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mobile", label: "Mobile Pay" },
  { value: "gift_card", label: "Gift Card" },
];

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] font-semibold text-[#363f4c]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function TerminalDetailFunctionsPage({
  id,
}: TerminalDetailFunctionsPageProps) {
  const [terminal, setTerminal] = useState<ApiTerminal | null>(null);
  const [terminalName, setTerminalName] = useState(EMPTY_VALUE);
  const [locationName, setLocationName] = useState(EMPTY_VALUE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Order Capabilities
  const [enableDineIn, setEnableDineIn] = useState(true);
  const [enableTakeaway, setEnableTakeaway] = useState(true);
  const [enableDelivery, setEnableDelivery] = useState(false);
  const [allowOrderModification, setAllowOrderModification] = useState(true);
  const [orderTimeoutSeconds, setOrderTimeoutSeconds] = useState(120);

  // Loyalty & Identification
  const [enableLoyaltyLogin, setEnableLoyaltyLogin] = useState(true);
  const [allowQrCodeScan, setAllowQrCodeScan] = useState(true);
  const [requireCustomerEmail, setRequireCustomerEmail] = useState(false);
  const [allowGuestCheckout, setAllowGuestCheckout] = useState(true);

  // Payment Options
  const [enableCash, setEnableCash] = useState(true);
  const [enableCard, setEnableCard] = useState(true);
  const [enableMobilePay, setEnableMobilePay] = useState(true);
  const [enableGiftCards, setEnableGiftCards] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("card");
  const [autoCloseOrderAfterPayment, setAutoCloseOrderAfterPayment] = useState(true);

  // Maintenance & Security
  const [enableMaintenanceModeAccess, setEnableMaintenanceModeAccess] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [ageVerification, setAgeVerification] = useState(false);
  const [autoLogoutSeconds, setAutoLogoutSeconds] = useState(300);

  // Discounts & Overrides
  const [allowManualDiscount, setAllowManualDiscount] = useState(true);
  const [allowStaffOverride, setAllowStaffOverride] = useState(true);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(25);
  const [requireManagerPin, setRequireManagerPin] = useState(false);

  const syncFromApi = (f: {
    order?: { enable_dine_in?: boolean; enable_takeaway?: boolean; enable_delivery?: boolean; allow_order_modification?: boolean; order_timeout_seconds?: number };
    payment?: { enable_cash?: boolean; enable_card?: boolean; enable_mobile_pay?: boolean; enable_gift_cards?: boolean; default_payment_method?: string; auto_close_order_after_payment?: boolean };
    loyalty?: { enable_loyalty_login?: boolean; allow_qr_code_scan?: boolean; require_customer_email?: boolean; allow_guest_checkout?: boolean };
    discounts?: { allow_manual_discount?: boolean; allow_staff_override?: boolean; max_discount_percent?: number; require_manager_pin?: boolean };
    maintenance?: { enable_maintenance_mode_access?: boolean; show_debug_info?: boolean; age_verification?: boolean; auto_logout_seconds?: number };
  } | null) => {
    if (f) {
      setEnableDineIn(f.order?.enable_dine_in ?? true);
      setEnableTakeaway(f.order?.enable_takeaway ?? true);
      setEnableDelivery(f.order?.enable_delivery ?? false);
      setAllowOrderModification(f.order?.allow_order_modification ?? true);
      setOrderTimeoutSeconds(f.order?.order_timeout_seconds ?? 120);
      setEnableLoyaltyLogin(f.loyalty?.enable_loyalty_login ?? true);
      setAllowQrCodeScan(f.loyalty?.allow_qr_code_scan ?? true);
      setRequireCustomerEmail(f.loyalty?.require_customer_email ?? false);
      setAllowGuestCheckout(f.loyalty?.allow_guest_checkout ?? true);
      setEnableCash(f.payment?.enable_cash ?? true);
      setEnableCard(f.payment?.enable_card ?? true);
      setEnableMobilePay(f.payment?.enable_mobile_pay ?? true);
      setEnableGiftCards(f.payment?.enable_gift_cards ?? false);
      setDefaultPaymentMethod((f.payment?.default_payment_method ?? "CARD").toLowerCase());
      setAutoCloseOrderAfterPayment(f.payment?.auto_close_order_after_payment ?? true);
      setEnableMaintenanceModeAccess(f.maintenance?.enable_maintenance_mode_access ?? false);
      setShowDebugInfo(f.maintenance?.show_debug_info ?? false);
      setAgeVerification(f.maintenance?.age_verification ?? false);
      setAutoLogoutSeconds(f.maintenance?.auto_logout_seconds ?? 300);
      setAllowManualDiscount(f.discounts?.allow_manual_discount ?? true);
      setAllowStaffOverride(f.discounts?.allow_staff_override ?? true);
      setMaxDiscountPercent(f.discounts?.max_discount_percent ?? 25);
      setRequireManagerPin(f.discounts?.require_manager_pin ?? false);
    }
  };

  const resetToDefaults = () => {
    setEnableDineIn(true);
    setEnableTakeaway(true);
    setEnableDelivery(false);
    setAllowOrderModification(true);
    setOrderTimeoutSeconds(120);
    setEnableLoyaltyLogin(true);
    setAllowQrCodeScan(true);
    setRequireCustomerEmail(false);
    setAllowGuestCheckout(true);
    setEnableCash(true);
    setEnableCard(true);
    setEnableMobilePay(true);
    setEnableGiftCards(false);
    setDefaultPaymentMethod("card");
    setAutoCloseOrderAfterPayment(true);
    setEnableMaintenanceModeAccess(false);
    setShowDebugInfo(false);
    setAgeVerification(false);
    setAutoLogoutSeconds(300);
    setAllowManualDiscount(true);
    setAllowStaffOverride(true);
    setMaxDiscountPercent(25);
    setRequireManagerPin(false);
    toast.success("Reset to defaults.");
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [terminalRes, functionsRes] = await Promise.all([
        orderzillaApi.dashboard.terminals.byId(id),
        orderzillaApi.dashboard.terminals.functions.get(id).catch(() => null),
      ]);
      const response = terminalRes as ApiTerminal;
      setTerminal(response);
      setTerminalName(toDisplayValue(response?.name, EMPTY_VALUE));
      setLocationName(toDisplayValue(response?.location_name, EMPTY_VALUE));
      syncFromApi(functionsRes);
    } catch {
      setError("Failed to load terminal.");
      setTerminal(null);
      setTerminalName(EMPTY_VALUE);
      setLocationName(EMPTY_VALUE);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.terminals.update(id, {
        body: {
          mode: terminal?.mode ?? "INDOOR",
          is_active: terminal?.is_active ?? true,
          printer_host: terminal?.printer_host ?? undefined,
          printer_port: terminal?.printer_port ?? 9100,
          printer_width: terminal?.printer_width ?? 80,
        },
      });
      await orderzillaApi.dashboard.terminals.functions.update(id, {
        body: {
          order: {
            enable_dine_in: enableDineIn,
            enable_takeaway: enableTakeaway,
            enable_delivery: enableDelivery,
            allow_order_modification: allowOrderModification,
            order_timeout_seconds: orderTimeoutSeconds,
          },
          payment: {
            enable_cash: enableCash,
            enable_card: enableCard,
            enable_mobile_pay: enableMobilePay,
            enable_gift_cards: enableGiftCards,
            default_payment_method: defaultPaymentMethod.toUpperCase(),
            auto_close_order_after_payment: autoCloseOrderAfterPayment,
          },
          loyalty: {
            enable_loyalty_login: enableLoyaltyLogin,
            allow_qr_code_scan: allowQrCodeScan,
            require_customer_email: requireCustomerEmail,
            allow_guest_checkout: allowGuestCheckout,
          },
          discounts: {
            allow_manual_discount: allowManualDiscount,
            allow_staff_override: allowStaffOverride,
            max_discount_percent: maxDiscountPercent,
            require_manager_pin: requireManagerPin,
          },
          maintenance: {
            enable_maintenance_mode_access: enableMaintenanceModeAccess,
            show_debug_info: showDebugInfo,
            age_verification: ageVerification,
            auto_logout_seconds: autoLogoutSeconds,
          },
        },
      });
      toast.success("Terminal settings saved.");
      const refreshed = await orderzillaApi.dashboard.terminals.functions.get(id);
      syncFromApi(refreshed);
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  if (error && !terminal) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/terminals"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Terminals
          </Link>
          <div className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
            {error}{" "}
            <button type="button" onClick={fetchData} className="font-semibold underline">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="text-[14px] text-[#7a8291]">
              <Link href="/dashboard/terminals" className="hover:text-[#2f3743]">
                Locations
              </Link>
              <span className="mx-1">/</span>
              <span className="font-semibold text-[#2f3743]">{locationName}</span>
              <span className="mx-1">/</span>
              <span>{terminalName}</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {terminalName} Detail
            </h1>
            <div className="mt-3 border-b border-[#e9ebef]">
              <div className="flex items-center gap-8 text-[15px] font-semibold">
                <Link
                  href={`/dashboard/terminals/${id}?tab=overview`}
                  className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
                >
                  Overview
                </Link>
                <Link
                  href={`/dashboard/terminals/${id}/display-content?tab=display-content`}
                  className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
                >
                  Display Content
                </Link>
                <Link
                  href={`/dashboard/terminals/${id}/functions?tab=functions`}
                  className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
                >
                  Functions
                </Link>
                <Link
                  href={`/dashboard/terminals/${id}/logs?tab=logs`}
                  className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
                >
                  Logs
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={resetToDefaults}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Reset Defaults
            </button>
          </div>
        </div>


        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Order Capabilities */}
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Order Capabilities</h2>
            <div className="mt-4 space-y-3">
              <ToggleSwitch checked={enableDineIn} onChange={setEnableDineIn} label="Enable Dine-in" />
              <ToggleSwitch checked={enableTakeaway} onChange={setEnableTakeaway} label="Enable Takeaway" />
              <ToggleSwitch checked={enableDelivery} onChange={setEnableDelivery} label="Enable Delivery" />
              <ToggleSwitch
                checked={allowOrderModification}
                onChange={setAllowOrderModification}
                label="Allow order modification before payment"
              />
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Order timeout duration (seconds)
                </label>
                <input
                  type="number"
                  min={30}
                  max={600}
                  value={orderTimeoutSeconds}
                  onChange={(e) => setOrderTimeoutSeconds(Number(e.target.value) || 120)}
                  className="h-10 w-32 rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                />
              </div>
            </div>
          </article>

          {/* Loyalty & Identification */}
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Loyalty & Identification</h2>
            <div className="mt-4 space-y-3">
              <ToggleSwitch checked={enableLoyaltyLogin} onChange={setEnableLoyaltyLogin} label="Enable loyalty login" />
              <ToggleSwitch checked={allowQrCodeScan} onChange={setAllowQrCodeScan} label="Allow QR code scan" />
              <ToggleSwitch checked={requireCustomerEmail} onChange={setRequireCustomerEmail} label="Require customer email" />
              <ToggleSwitch checked={allowGuestCheckout} onChange={setAllowGuestCheckout} label="Allow guest checkout" />
            </div>
          </article>

          {/* Payment Options */}
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Payment Options</h2>
            <div className="mt-4 space-y-3">
              <ToggleSwitch checked={enableCash} onChange={setEnableCash} label="Enable Cash" />
              <ToggleSwitch checked={enableCard} onChange={setEnableCard} label="Enable Card" />
              <ToggleSwitch checked={enableMobilePay} onChange={setEnableMobilePay} label="Enable Mobile Pay" />
              <ToggleSwitch checked={enableGiftCards} onChange={setEnableGiftCards} label="Enable Gift Cards" />
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Default payment method
                </label>
                <SelectMenu
                  value={defaultPaymentMethod}
                  onChange={setDefaultPaymentMethod}
                  options={PAYMENT_METHODS}
                  className="w-full max-w-[200px]"
                />
              </div>
              <ToggleSwitch
                checked={autoCloseOrderAfterPayment}
                onChange={setAutoCloseOrderAfterPayment}
                label="Auto-close order after payment"
              />
            </div>
          </article>

          {/* Maintenance & Security */}
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Maintenance & Security</h2>
            <div className="mt-4 space-y-3">
              <ToggleSwitch
                checked={enableMaintenanceModeAccess}
                onChange={setEnableMaintenanceModeAccess}
                label="Enable maintenance mode access"
              />
              <ToggleSwitch checked={showDebugInfo} onChange={setShowDebugInfo} label="Show debug info" />
              <ToggleSwitch
                checked={ageVerification}
                onChange={setAgeVerification}
                label="Age verification (if alcohol products enabled)"
              />
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Auto-logout after inactivity (seconds)
                </label>
                <input
                  type="number"
                  min={60}
                  max={3600}
                  value={autoLogoutSeconds}
                  onChange={(e) => setAutoLogoutSeconds(Number(e.target.value) || 300)}
                  className="h-10 w-32 rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                />
              </div>
            </div>
          </article>

          {/* Discounts & Overrides */}
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Discounts & Overrides</h2>
            <div className="mt-4 space-y-3">
              <ToggleSwitch checked={allowManualDiscount} onChange={setAllowManualDiscount} label="Allow manual discount" />
              <ToggleSwitch checked={allowStaffOverride} onChange={setAllowStaffOverride} label="Allow staff override" />
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Max discount %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(Number(e.target.value) || 0)}
                  className="h-10 w-24 rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                />
              </div>
              <ToggleSwitch
                checked={requireManagerPin}
                onChange={setRequireManagerPin}
                label="Require manager PIN"
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
