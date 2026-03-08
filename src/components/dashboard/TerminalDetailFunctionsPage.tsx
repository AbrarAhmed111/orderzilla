"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";

type TerminalDetailFunctionsPageProps = {
  id: string;
};

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </span>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[16px] font-semibold text-[#2f3743]">{label}</span>
      <Toggle on={on} />
    </div>
  );
}

function FunctionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
      <h2 className="text-[31px] font-bold text-[#1a212c]">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </article>
  );
}

export default function TerminalDetailFunctionsPage({
  id,
}: TerminalDetailFunctionsPageProps) {
  const [terminalName, setTerminalName] = useState(`Terminal #${id.toUpperCase()}`);
  const [locationName, setLocationName] = useState("Location");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      const terminal = await orderzillaApi.dashboard.terminals.byId(id);
      setTerminalName(terminal?.name ?? `Terminal #${id.toUpperCase()}`);
      setLocationName(terminal?.location_name ?? "Location");
      setIsLoading(false);
    };
    run();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">
              Locations / {locationName} / {terminalName}
            </p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {terminalName} Detail
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Save Changes
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="mt-3 border-b border-[#e9ebef]">
          <div className="flex items-center gap-8 text-[15px] font-semibold">
            <Link
              href={`/dashboard/terminals/${id}`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Overview
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/display-content`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Display Content
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/functions`}
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
            >
              Functions
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/logs`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
            >
              Logs
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <FunctionCard title="Order Capabilities">
            <ToggleRow label="Enable Dine-in" on />
            <ToggleRow label="Enable Takeaway" on />
            <ToggleRow label="Enable Delivery" on={false} />
            <ToggleRow label="Allow order modification before payment" on />
            <div className="pt-1">
              <label className="text-[14px] font-semibold text-[#4e5664]">
                Order timeout duration (seconds)
              </label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                defaultValue="120"
              />
            </div>
          </FunctionCard>

          <FunctionCard title="Payment Options">
            <ToggleRow label="Enable Cash" on />
            <ToggleRow label="Enable Card" on />
            <ToggleRow label="Enable Mobile Pay" on />
            <ToggleRow label="Enable Gift Cards" on={false} />
            <div className="pt-1">
              <label className="text-[14px] font-semibold text-[#4e5664]">
                Default payment method
              </label>
              <button
                type="button"
                className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 inline-flex items-center justify-between text-[14px] text-[#2f3743]"
              >
                <span>Card</span>
                <ChevronDown size={14} />
              </button>
            </div>
            <ToggleRow label="Auto-close order after payment" on />
          </FunctionCard>

          <FunctionCard title="Discounts & Overrides">
            <ToggleRow label="Allow manual discount" on />
            <ToggleRow label="Allow staff override" on />
            <div className="pt-1">
              <label className="text-[14px] font-semibold text-[#4e5664]">
                Max discount %
              </label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                defaultValue="25"
              />
            </div>
            <ToggleRow label="Require manager PIN" on={false} />
          </FunctionCard>

          <FunctionCard title="Loyalty & Identification">
            <ToggleRow label="Enable loyalty login" on />
            <ToggleRow label="Allow QR code scan" on />
            <ToggleRow label="Require customer email" on={false} />
            <ToggleRow label="Allow guest checkout" on />
          </FunctionCard>

          <FunctionCard title="Maintenance & Security">
            <ToggleRow label="Enable maintenance mode access" on={false} />
            <ToggleRow label="Show debug info" on={false} />
            <div className="pt-1">
              <label className="text-[14px] font-semibold text-[#4e5664]">
                Auto-logout after inactivity (seconds)
              </label>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                defaultValue="300"
              />
            </div>
            <ToggleRow
              label="Age verification (if alcohol products enabled)"
              on={false}
            />
          </FunctionCard>
        </div>
      </section>
    </div>
  );
}

