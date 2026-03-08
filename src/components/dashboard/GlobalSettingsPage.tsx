"use client";

import { type ReactNode, useMemo, useState } from "react";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";

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
      <h2 className="text-[31px] font-bold text-[#1a212c]">{title}</h2>
      <div className="mt-3 space-y-2.5">{children}</div>
    </article>
  );
}

export default function GlobalSettingsPage() {
  const defaultSettings = useMemo(
    () => ({
      companyName: "Orderzilla Foods Ltd.",
      primaryColor: "#D0FE1D",
      receiptFooter: "Thank you for ordering with Orderzilla! Follow us @orderzilla.",
      addressLine: "123 Main St",
      zip: "8000",
      city: "Zurich",
      region: "Zurich",
      country: "Switzerland",
      vatRate: "standard",
      currency: "chf",
      includeVat: true,
      rounding: "005",
      decimalFormat: "comma",
      printReceipt: true,
      emailReceipt: true,
      kitchenPrinter: "Kitchen Printer #1",
      idleTimeout: "60",
      autoRefreshMenu: true,
      maintenanceMode: false,
      paymentCash: true,
      paymentCard: true,
      paymentMobile: true,
      paymentGiftCard: false,
      defaultPaymentMethod: "card",
      autoCloseSeconds: "10",
      orderTimeout: "120",
      loyaltyEnabled: true,
      allowPriceOverride: false,
      debugLogs: false,
    }),
    [],
  );

  const [settings, setSettings] = useState(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);

  const updateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const onReset = () => {
    setSettings(defaultSettings);
    setIsDirty(false);
  };

  const onSave = () => {
    setIsDirty(false);
  };

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">Global Settings</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              className={`h-9 rounded-lg px-4 text-[12px] font-semibold ${
                isDirty
                  ? "bg-[#d4ff00] text-[#1d2512]"
                  : "bg-[#eef2d2] text-[#69753c]"
              }`}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onReset}
              className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#414855]"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
          <Card title="Company & Branding">
            <div>
              <label className="text-[13px] text-[#6e7785]">Company Name</label>
              <input
                className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.companyName}
                onChange={(e) => updateSetting("companyName", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <div>
                <label className="text-[13px] text-[#6e7785]">Logo</label>
                <div className="mt-1 h-[92px] w-[92px] rounded-lg bg-[#d7ff3f] flex items-center justify-center font-bold text-[#1f2631] text-[11px] text-center">
                  ORDERZILLA
                </div>
                <button className="mt-1 h-9 w-full rounded-md border border-[#dfe3e8] bg-white text-[13px] font-semibold text-[#3f4653]">
                  Upload
                </button>
              </div>
              <div>
                <label className="text-[13px] text-[#6e7785]">Primary Brand Color</label>
                <div className="mt-1 h-9 rounded-lg border border-[#dfe3e8] px-3 flex items-center gap-2 text-[12px]">
                  <span className="h-4 w-4 rounded-sm bg-[#d0fe1d]" />
                  <input
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting("primaryColor", e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
                <label className="mt-2 block text-[13px] text-[#6e7785]">Receipt Footer Text</label>
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[12px]"
                  value={settings.receiptFooter}
                  onChange={(e) => updateSetting("receiptFooter", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[13px] text-[#6e7785]">Address</label>
              <input
                className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.addressLine}
                onChange={(e) => updateSetting("addressLine", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.zip}
                onChange={(e) => updateSetting("zip", e.target.value)}
              />
              <input
                className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.city}
                onChange={(e) => updateSetting("city", e.target.value)}
              />
              <input
                className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.region}
                onChange={(e) => updateSetting("region", e.target.value)}
              />
              <input
                className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.country}
                onChange={(e) => updateSetting("country", e.target.value)}
              />
            </div>
          </Card>

          <div className="space-y-3">
            <Card title="Tax & Currency Settings">
              <SelectMenu
                value={settings.vatRate}
                onChange={(value) => updateSetting("vatRate", value)}
                options={[
                  { label: "7.7% (Standard)", value: "standard" },
                  { label: "2.5% (Reduced)", value: "reduced" },
                ]}
              />
              <SelectMenu
                value={settings.currency}
                onChange={(value) => updateSetting("currency", value)}
                options={[
                  { label: "CHF", value: "chf" },
                  { label: "EUR", value: "eur" },
                  { label: "USD", value: "usd" },
                ]}
              />
              <div className="flex items-center gap-2">
                <Toggle
                  on={settings.includeVat}
                  onToggle={(next) => updateSetting("includeVat", next)}
                />
                <span className="text-[13px] font-semibold text-[#2f3743]">Prices include VAT</span>
              </div>
              <SelectMenu
                value={settings.rounding}
                onChange={(value) => updateSetting("rounding", value)}
                options={[
                  { label: "Round to nearest 0.05", value: "005" },
                  { label: "Round to nearest 0.10", value: "010" },
                ]}
              />
              <SelectMenu
                value={settings.decimalFormat}
                onChange={(value) => updateSetting("decimalFormat", value)}
                options={[
                  { label: "Comma (,)", value: "comma" },
                  { label: "Dot (.)", value: "dot" },
                ]}
              />
            </Card>

            <Card title="Receipt & Printing">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Toggle
                      on={settings.printReceipt}
                      onToggle={(next) => updateSetting("printReceipt", next)}
                    />
                    <span className="text-[13px] font-semibold text-[#2f3743]">Print receipt automatically</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      on={settings.emailReceipt}
                      onToggle={(next) => updateSetting("emailReceipt", next)}
                    />
                    <span className="text-[13px] font-semibold text-[#2f3743]">Email receipt</span>
                  </div>
                </div>
                <div className="h-20 w-16 rounded border border-[#dfe3e8] bg-[#fafbfc] text-[9px] flex items-center justify-center text-[#6e7785]">
                  RECEIPT
                </div>
              </div>
              <SelectMenu
                value={settings.kitchenPrinter}
                onChange={(value) => updateSetting("kitchenPrinter", value)}
                options={[
                  { label: "Kitchen Printer #1", value: "Kitchen Printer #1" },
                  { label: "Kitchen Printer #2", value: "Kitchen Printer #2" },
                ]}
              />
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.idleTimeout}
                onChange={(e) => updateSetting("idleTimeout", e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#2f3743]">Auto-refresh menu</span>
                <Toggle
                  on={settings.autoRefreshMenu}
                  onToggle={(next) => updateSetting("autoRefreshMenu", next)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#2f3743]">Maintenance mode (global)</span>
                <Toggle
                  on={settings.maintenanceMode}
                  onToggle={(next) => updateSetting("maintenanceMode", next)}
                />
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <Card title="Payment Settings">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Enable Cash</span><Toggle on={settings.paymentCash} onToggle={(next) => updateSetting("paymentCash", next)} /></div>
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Enable Card</span><Toggle on={settings.paymentCard} onToggle={(next) => updateSetting("paymentCard", next)} /></div>
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Enable Mobile Pay</span><Toggle on={settings.paymentMobile} onToggle={(next) => updateSetting("paymentMobile", next)} /></div>
                <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Enable Gift Cards</span><Toggle on={settings.paymentGiftCard} onToggle={(next) => updateSetting("paymentGiftCard", next)} /></div>
              </div>
              <SelectMenu
                value={settings.defaultPaymentMethod}
                onChange={(value) => updateSetting("defaultPaymentMethod", value)}
                options={[
                  { label: "Card", value: "card" },
                  { label: "Cash", value: "cash" },
                  { label: "Mobile Pay", value: "mobile" },
                ]}
              />
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.autoCloseSeconds}
                onChange={(e) => updateSetting("autoCloseSeconds", e.target.value)}
              />
            </Card>

            <Card title="Operational Settings">
              <input
                className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                value={settings.orderTimeout}
                onChange={(e) => updateSetting("orderTimeout", e.target.value)}
              />
            </Card>

            <Card title="System Controls">
              <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Enable Loyalty Program</span><Toggle on={settings.loyaltyEnabled} onToggle={(next) => updateSetting("loyaltyEnabled", next)} /></div>
              <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Allow price override at terminal</span><Toggle on={settings.allowPriceOverride} onToggle={(next) => updateSetting("allowPriceOverride", next)} /></div>
              <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-[#2f3743]">Enable debug logs</span><Toggle on={settings.debugLogs} onToggle={(next) => updateSetting("debugLogs", next)} /></div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white text-[12px] font-semibold text-[#3f4653]"
                >
                  Export system logs
                </button>
                <button
                  type="button"
                  className="h-9 rounded-lg border border-[#dfe3e8] bg-white text-[12px] font-semibold text-[#3f4653]"
                >
                  Backup database
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

