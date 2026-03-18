"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { DashboardSettings } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

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
      <h2 className="text-[18px] font-bold text-[#1a212c]">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </article>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[12px] font-semibold text-[#4b5563] mb-1">
      {children}
    </label>
  );
}

type ApiLocation = components["schemas"]["Location"];
type ApiLoyaltyProgram = components["schemas"]["LoyaltyProgram"];
type ApiTerminal = components["schemas"]["Terminal"];

const VAT_OPTIONS = [
  { value: "8.1", label: "8.1% (Standard CH)" },
  { value: "7.7", label: "7.7% (Standard)" },
  { value: "2.5", label: "2.5% (Reduced)" },
  { value: "0", label: "0% (Exempt)" },
];

const CURRENCY_OPTIONS = [
  { value: "CHF", label: "CHF" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
];

const ROUNDING_OPTIONS = [
  { value: "0.05", label: "Round to nearest 0.05" },
  { value: "0.10", label: "Round to nearest 0.10" },
  { value: "0.01", label: "Round to nearest 0.01" },
];

const DECIMAL_OPTIONS = [
  { value: "comma", label: "Comma (,)" },
  { value: "dot", label: "Dot (.)" },
];

const KITCHEN_PRINTER_OPTIONS = [
  { value: "1", label: "Kitchen Printer #1" },
  { value: "2", label: "Kitchen Printer #2" },
  { value: "3", label: "Kitchen Printer #3" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_PAY", label: "Mobile Pay" },
  { value: "GIFT_CARD", label: "Gift Card" },
];

const DEFAULT_COMPANY = {
  name: "",
  logoUrl: null as string | null,
  primaryColor: "#D0FE1D",
  receiptFooter: "",
  street: "",
  zip: "",
  city: "",
  country: "",
};

const DEFAULT_TAX = {
  defaultVat: "8.1",
  currency: "CHF",
  pricesIncludeVat: true,
  rounding: "0.05",
  decimalFormat: "comma",
};

const DEFAULT_RECEIPT = {
  printAutomatically: true,
  emailReceipt: true,
  kitchenPrinter: "1",
  idleScreenTimeout: 60,
  autoRefreshMenu: true,
  maintenanceMode: false,
};

const DEFAULT_PAYMENT = {
  enableCash: true,
  enableCard: true,
  enableMobilePay: true,
  enableGiftCards: false,
  defaultMethod: "CARD",
  terminalAutoClose: 10,
};

const DEFAULT_OPERATIONAL = {
  orderTimeout: 120,
};

const DEFAULT_SYSTEM = {
  enableLoyalty: true,
  allowPriceOverride: false,
  enableDebugLogs: false,
};

export default function GlobalSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [loyaltyProgram, setLoyaltyProgram] = useState<ApiLoyaltyProgram | null>(null);
  const [terminals, setTerminals] = useState<ApiTerminal[]>([]);

  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [tax, setTax] = useState(DEFAULT_TAX);
  const [receipt, setReceipt] = useState(DEFAULT_RECEIPT);
  const [payment, setPayment] = useState(DEFAULT_PAYMENT);
  const [operational, setOperational] = useState(DEFAULT_OPERATIONAL);
  const [system, setSystem] = useState(DEFAULT_SYSTEM);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [settingsRes, locationsRes, loyaltyRes, terminalsRes] = await Promise.all([
        orderzillaApi.dashboard.settings.get().catch(() => null),
        orderzillaApi.dashboard.locations.list(),
        orderzillaApi.dashboard.loyalty.program.get().catch(() => undefined),
        orderzillaApi.dashboard.terminals.list(),
      ]);

      const nextLocations = (locationsRes?.locations ?? []) as ApiLocation[];
      const nextTerminals = (terminalsRes?.terminals ?? []) as ApiTerminal[];

      setLocations(nextLocations);
      setTerminals(nextTerminals);
      setLoyaltyProgram((loyaltyRes as ApiLoyaltyProgram) ?? null);

      const settings = settingsRes as DashboardSettings | null;
      if (settings) {
        setCompany((prev) => ({
          ...prev,
          name: toDisplayValue(settings.company_name, ""),
          logoUrl: settings.logo_url ?? null,
          primaryColor: toDisplayValue(settings.primary_brand_color, prev.primaryColor),
          receiptFooter: toDisplayValue(settings.receipt_footer_text, ""),
          street: toDisplayValue(settings.address?.street, ""),
          zip: toDisplayValue(settings.address?.zip, ""),
          city: toDisplayValue(settings.address?.city, ""),
          country: toDisplayValue(settings.address?.country, ""),
        }));
        setTax((prev) => ({
          ...prev,
          defaultVat: settings.default_vat_rate != null ? String(settings.default_vat_rate) : prev.defaultVat,
          currency: settings.currency ?? prev.currency,
          pricesIncludeVat: settings.prices_include_vat ?? prev.pricesIncludeVat,
        }));
        const pm = settings.default_payment_method?.toUpperCase();
        const validMethod = ["CARD", "CASH", "MOBILE_PAY", "GIFT_CARD"].includes(pm ?? "")
          ? pm!
          : "CARD";
        setPayment((prev) => ({
          ...prev,
          enableCash: settings.enable_cash ?? prev.enableCash,
          enableCard: settings.enable_card ?? prev.enableCard,
          enableMobilePay: settings.enable_mobile_pay ?? prev.enableMobilePay,
          enableGiftCards: settings.enable_gift_cards ?? prev.enableGiftCards,
          defaultMethod: validMethod,
        }));
        setSystem((prev) => ({
          ...prev,
          enableLoyalty: settings.enable_loyalty_program ?? prev.enableLoyalty,
        }));
      } else {
        const firstLoc = nextLocations.find((l) => l.id);
        if (firstLoc) {
          setCompany((prev) => ({
            ...prev,
            name: toDisplayValue(firstLoc.name, ""),
            street: toDisplayValue(firstLoc.address, ""),
            city: toDisplayValue(firstLoc.city, ""),
            country: toDisplayValue(firstLoc.country, ""),
          }));
        }
        if (loyaltyRes && typeof loyaltyRes === "object" && "is_active" in loyaltyRes) {
          setSystem((prev) => ({
            ...prev,
            enableLoyalty: (loyaltyRes as ApiLoyaltyProgram).is_active ?? prev.enableLoyalty,
          }));
        }
      }
    } catch {
      setError("Failed to load settings.");
      setCompany(DEFAULT_COMPANY);
      setTax(DEFAULT_TAX);
      setReceipt(DEFAULT_RECEIPT);
      setPayment(DEFAULT_PAYMENT);
      setOperational(DEFAULT_OPERATIONAL);
      setSystem(DEFAULT_SYSTEM);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await orderzillaApi.dashboard.settings.update({
        company_name: company.name,
        primary_brand_color: company.primaryColor,
        receipt_footer_text: company.receiptFooter,
        address: {
          street: company.street,
          zip: company.zip,
          city: company.city,
          country: company.country,
        },
        default_vat_rate: Number(tax.defaultVat) || 8.1,
        currency: tax.currency,
        prices_include_vat: tax.pricesIncludeVat,
        enable_cash: payment.enableCash,
        enable_card: payment.enableCard,
        enable_mobile_pay: payment.enableMobilePay,
        enable_gift_cards: payment.enableGiftCards,
        default_payment_method: payment.defaultMethod,
        enable_loyalty_program: system.enableLoyalty,
      });
      toast.success("Settings saved.");
      await fetchData();
    } catch (err) {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setCompany(DEFAULT_COMPANY);
    setTax(DEFAULT_TAX);
    setReceipt(DEFAULT_RECEIPT);
    setPayment(DEFAULT_PAYMENT);
    setOperational(DEFAULT_OPERATIONAL);
    setSystem(DEFAULT_SYSTEM);
    toast.success("Reset to defaults.");
  };

  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportLogs = async () => {
    setIsExportingLogs(true);
    try {
      const now = new Date();
      const dateTo = now.toISOString().slice(0, 10);
      const dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await orderzillaApi.dashboard.settings.exportLogs({
        format: "CSV",
        date_from: dateFrom,
        date_to: dateTo,
        filters: {},
      });
      if (res?.download_url) {
        window.open(res.download_url, "_blank");
        toast.success("Log export started. Download will begin shortly.");
      } else {
        toast.success(res?.message ?? "Log export requested.");
      }
    } catch {
      toast.error("Failed to export logs.");
    } finally {
      setIsExportingLogs(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, etc.).");
      e.target.value = "";
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCompany((p) => ({ ...p, logoUrl: objectUrl }));
    e.target.value = "";
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const { axiosInstance } = await import("@/utils/axios");
      const res = await axiosInstance.post<{ logo_url?: string }>(
        "/v1/dashboard/settings/logo",
        formData,
      );
      const data = res.data;
      if (data?.logo_url) {
        URL.revokeObjectURL(objectUrl);
        setCompany((p) => ({ ...p, logoUrl: data.logo_url ?? null }));
        toast.success("Logo uploaded.");
      } else {
        toast.success("Logo preview updated.");
      }
    } catch {
      toast.success("Logo preview updated.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      const res = await orderzillaApi.dashboard.settings.backup({
        backup_format: "SQL",
        destination: "LOCAL",
      });
      if (res?.download_url) {
        window.open(res.download_url, "_blank");
        toast.success("Backup started. Download will begin shortly.");
      } else {
        toast.success(res?.message ?? "Backup requested.");
      }
    } catch {
      toast.error("Failed to create backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const kitchenPrinterOptions = useMemo(() => {
    const fromTerminals = terminals
      .filter((t): t is ApiTerminal & { id: string } => Boolean(t.id))
      .map((t, i) => ({
        value: t.id,
        label: toDisplayValue(t.name, `Kitchen Printer #${i + 1}`),
      }));
    return fromTerminals.length ? fromTerminals : KITCHEN_PRINTER_OPTIONS;
  }, [terminals]);

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-5">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
          <h1 className="text-[36px] font-extrabold text-[#1a2029]">Global Settings</h1>
          <div className="mt-4">
            <TableSkeleton rows={12} columns={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4 md:p-5">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
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
    <div className="p-3 sm:p-4 md:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 md:px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] sm:text-[36px] leading-none font-extrabold text-[#1a2029]">
            Global Settings
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855] hover:bg-[#f9fafb]"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[12px] font-semibold text-[#1d2512] hover:bg-[#c9f339] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left: Company & Branding */}
          <div className="space-y-4">
            <Card title="Company & Branding">
              <div>
                <Label>Company Name</Label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Company Name"
                />
              </div>
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-[#fef08a] flex items-center justify-center overflow-hidden shrink-0">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-[#854d0e] text-center px-1">
                        ORDERZILLA
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="h-8 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[11px] font-semibold text-[#414855] hover:bg-[#f9fafb] disabled:opacity-50"
                    >
                      {isUploadingLogo ? "Uploading..." : "Upload"}
                    </button>
                    {company.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setCompany((p) => ({ ...p, logoUrl: null }))}
                        className="h-8 rounded-lg border border-[#fecaca] bg-white px-3 text-[11px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label>Primary Brand Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={company.primaryColor}
                    onChange={(e) => setCompany((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="h-9 w-14 cursor-pointer rounded border border-[#dfe3e8] p-0.5"
                  />
                  <input
                    type="text"
                    value={company.primaryColor}
                    onChange={(e) => setCompany((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="h-9 flex-1 rounded-lg border border-[#dfe3e8] px-3 text-[12px] font-mono outline-none focus:border-[#c0eb1a]"
                  />
                </div>
              </div>
              <div>
                <Label>Receipt Footer Text</Label>
                <textarea
                  value={company.receiptFooter}
                  onChange={(e) => setCompany((p) => ({ ...p, receiptFooter: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[12px] outline-none focus:border-[#c0eb1a] resize-none"
                  placeholder="Thank you for ordering..."
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <input
                  type="text"
                  value={company.street}
                  onChange={(e) => setCompany((p) => ({ ...p, street: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Street"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={company.zip}
                    onChange={(e) => setCompany((p) => ({ ...p, zip: e.target.value }))}
                    className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                    placeholder="ZIP"
                  />
                  <input
                    type="text"
                    value={company.city}
                    onChange={(e) => setCompany((p) => ({ ...p, city: e.target.value }))}
                    className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a] col-span-2"
                    placeholder="City"
                  />
                </div>
                <input
                  type="text"
                  value={company.country}
                  onChange={(e) => setCompany((p) => ({ ...p, country: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                  placeholder="Country"
                />
              </div>
            </Card>
          </div>

          {/* Middle: Tax & Currency, Receipt & Printing */}
          <div className="space-y-4">
            <Card title="Tax & Currency Settings">
              <div>
                <Label>Default VAT rate</Label>
                <SelectMenu
                  value={tax.defaultVat}
                  onChange={(v) => setTax((p) => ({ ...p, defaultVat: v }))}
                  options={VAT_OPTIONS}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <SelectMenu
                  value={tax.currency}
                  onChange={(v) => setTax((p) => ({ ...p, currency: v }))}
                  options={CURRENCY_OPTIONS}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Prices include VAT</span>
                <Toggle
                  on={tax.pricesIncludeVat}
                  onToggle={(next) => setTax((p) => ({ ...p, pricesIncludeVat: next }))}
                />
              </div>
              <div>
                <Label>Rounding rules</Label>
                <SelectMenu
                  value={tax.rounding}
                  onChange={(v) => setTax((p) => ({ ...p, rounding: v }))}
                  options={ROUNDING_OPTIONS}
                />
              </div>
              <div>
                <Label>Decimal format</Label>
                <SelectMenu
                  value={tax.decimalFormat}
                  onChange={(v) => setTax((p) => ({ ...p, decimalFormat: v }))}
                  options={DECIMAL_OPTIONS}
                />
              </div>
            </Card>

            <Card title="Receipt & Printing">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#2f3743]">
                      Print receipt automatically
                    </span>
                    <Toggle
                      on={receipt.printAutomatically}
                      onToggle={(next) =>
                        setReceipt((p) => ({ ...p, printAutomatically: next }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#2f3743]">Email receipt</span>
                    <Toggle
                      on={receipt.emailReceipt}
                      onToggle={(next) => setReceipt((p) => ({ ...p, emailReceipt: next }))}
                    />
                  </div>
                  <div>
                    <Label>Kitchen printer routing</Label>
                    <SelectMenu
                      value={
                        kitchenPrinterOptions.some((o) => o.value === receipt.kitchenPrinter)
                          ? receipt.kitchenPrinter
                          : kitchenPrinterOptions[0]?.value ?? receipt.kitchenPrinter
                      }
                      onChange={(v) => setReceipt((p) => ({ ...p, kitchenPrinter: v }))}
                      options={kitchenPrinterOptions}
                    />
                  </div>
                </div>
                <div className="hidden sm:block w-24 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-2 text-[10px] text-center text-[#6b7280]">
                  ORDERZILLA RECEIPT
                </div>
              </div>
              <div>
                <Label>Idle screen timeout (seconds)</Label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={receipt.idleScreenTimeout}
                  onChange={(e) =>
                    setReceipt((p) => ({
                      ...p,
                      idleScreenTimeout: Math.max(10, Math.min(300, Number(e.target.value) || 60)),
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Auto-refresh menu</span>
                <Toggle
                  on={receipt.autoRefreshMenu}
                  onToggle={(next) => setReceipt((p) => ({ ...p, autoRefreshMenu: next }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">
                  Maintenance mode (global)
                </span>
                <Toggle
                  on={receipt.maintenanceMode}
                  onToggle={(next) => setReceipt((p) => ({ ...p, maintenanceMode: next }))}
                />
              </div>
            </Card>
          </div>

          {/* Right: Payment, Operational, System */}
          <div className="space-y-4">
            <Card title="Payment Settings">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Enable Cash</span>
                <Toggle
                  on={payment.enableCash}
                  onToggle={(next) => setPayment((p) => ({ ...p, enableCash: next }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Enable Card</span>
                <Toggle
                  on={payment.enableCard}
                  onToggle={(next) => setPayment((p) => ({ ...p, enableCard: next }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Enable Mobile Pay</span>
                <Toggle
                  on={payment.enableMobilePay}
                  onToggle={(next) => setPayment((p) => ({ ...p, enableMobilePay: next }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Enable Gift Cards</span>
                <Toggle
                  on={payment.enableGiftCards}
                  onToggle={(next) => setPayment((p) => ({ ...p, enableGiftCards: next }))}
                />
              </div>
              <div>
                <Label>Default Payment Method</Label>
                <SelectMenu
                  value={payment.defaultMethod}
                  onChange={(v) => setPayment((p) => ({ ...p, defaultMethod: v }))}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </div>
              <div>
                <Label>Terminal auto-close after payment (seconds)</Label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={payment.terminalAutoClose}
                  onChange={(e) =>
                    setPayment((p) => ({
                      ...p,
                      terminalAutoClose: Math.max(0, Math.min(60, Number(e.target.value) || 10)),
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
            </Card>

            <Card title="Operational Settings">
              <div>
                <Label>Order timeout duration (seconds)</Label>
                <input
                  type="number"
                  min={30}
                  max={600}
                  value={operational.orderTimeout}
                  onChange={(e) =>
                    setOperational((p) => ({
                      ...p,
                      orderTimeout: Math.max(30, Math.min(600, Number(e.target.value) || 120)),
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px] outline-none focus:border-[#c0eb1a]"
                />
              </div>
            </Card>

            <Card title="System Controls">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Enable Loyalty Program</span>
                <Toggle
                  on={system.enableLoyalty}
                  onToggle={(next) => setSystem((p) => ({ ...p, enableLoyalty: next }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">
                  Allow price override at terminal
                </span>
                <Toggle
                  on={system.allowPriceOverride}
                  onToggle={(next) => setSystem((p) => ({ ...p, allowPriceOverride: next }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#2f3743]">Enable debug logs</span>
                <Toggle
                  on={system.enableDebugLogs}
                  onToggle={(next) => setSystem((p) => ({ ...p, enableDebugLogs: next }))}
                />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleExportLogs}
                  disabled={isExportingLogs}
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855] hover:bg-[#f9fafb] disabled:opacity-50"
                >
                  {isExportingLogs ? "Exporting..." : "Export system logs"}
                </button>
                <button
                  type="button"
                  onClick={handleBackupDatabase}
                  disabled={isBackingUp}
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855] hover:bg-[#f9fafb] disabled:opacity-50"
                >
                  {isBackingUp ? "Backing up..." : "Backup database"}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
