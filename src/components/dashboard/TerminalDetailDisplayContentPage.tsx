"use client";

import Link from "next/link";
import { ChevronDown, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";

type TerminalDetailDisplayContentPageProps = {
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

function SortRow({ title }: { title: string }) {
  return (
    <div className="h-10 rounded-md border border-[#e3e6eb] bg-white px-3 flex items-center justify-between text-[14px] text-[#36404d]">
      <span>{title}</span>
      <span className="text-[#9aa3ae]">⋮⋮</span>
    </div>
  );
}

export default function TerminalDetailDisplayContentPage({
  id,
}: TerminalDetailDisplayContentPageProps) {
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
              Reset to Default
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
              className="pb-2 text-[#1f2631] border-b-2 border-[#d4ff00]"
            >
              Display Content
            </Link>
            <Link
              href={`/dashboard/terminals/${id}/functions`}
              className="pb-2 text-[#7a8291] hover:text-[#1f2631]"
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

        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-3">
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Idle Screen</h2>
              <div className="mt-2 h-32 rounded-lg border border-dashed border-[#dfe3e8] bg-[#fafbfc] flex flex-col items-center justify-center text-[#7a8392]">
                <UploadCloud size={22} />
                <p className="text-[14px] mt-1 text-center">
                  Drag and drop an image/video here,
                  <br />
                  or click to browse
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-11 w-20 rounded-md bg-gradient-to-br from-[#2b2f39] to-[#926136]" />
                <button className="h-9 rounded-md border border-[#dfe3e8] bg-white px-3 text-[13px] font-semibold text-[#3f4653]">
                  Replace
                </button>
                <button className="h-9 rounded-md border border-[#efc3c3] bg-white px-3 text-[13px] font-semibold text-[#cf4a4a]">
                  Remove
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Toggle on />
                <span className="text-[15px] font-semibold text-[#2f3743]">
                  Enable idle animation
                </span>
              </div>
              <div className="mt-2">
                <label className="text-[13px] text-[#6e7785]">
                  Timeout before idle (seconds)
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-md border border-[#dfe3e8] px-3 text-[14px]"
                  defaultValue="120"
                />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">
                Promotions & Featured Content
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <Toggle on />
                <span className="text-[15px] font-semibold text-[#2f3743]">
                  Show featured products
                </span>
              </div>
              <p className="mt-2 text-[13px] text-[#6e7785]">
                Choose featured categories/products
              </p>
              <div className="mt-1 rounded-md border border-[#dfe3e8] p-2">
                <div className="flex flex-wrap gap-1 text-[12px]">
                  {["Burgers (Cat)", "Drinks (Cat)", "Combo 1 (Prod)"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-[#eef1f5] px-2 py-1 text-[#4b5564]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <button className="text-[#8f98a5]">
                    <X size={14} />
                  </button>
                  <ChevronDown size={14} className="text-[#8f98a5]" />
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="rounded-md border border-[#e3e6eb] bg-[#f9fafc] p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#9aa3ae]">⋮⋮</span>
                    <div className="h-11 w-20 rounded-md bg-gradient-to-br from-[#2b2f39] to-[#926136]" />
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#2f3743]">
                        Summer Special Burger Banner
                      </p>
                      <p className="text-[12px] text-[#8b93a1]">Banner upload</p>
                    </div>
                  </div>
                </div>
                <SortRow title="Burgers (Category)" />
                <SortRow title="Drinks (Category)" />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">
                Promotions & Featured Content
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <Toggle on />
                <span className="text-[15px] font-semibold text-[#2f3743]">
                  Show featured products
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="rounded-md border border-[#e3e6eb] bg-[#f9fafc] p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#9aa3ae]">⋮⋮</span>
                    <div className="h-11 w-20 rounded-md bg-gradient-to-br from-[#2b2f39] to-[#926136]" />
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#2f3743]">
                        Summer Special Burger Banner
                      </p>
                      <p className="text-[12px] text-[#8b93a1]">Banner upload</p>
                    </div>
                  </div>
                </div>
                <SortRow title="Burgers (Category)" />
                <SortRow title="Drinks (Category)" />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Language & Theme</h2>
              <div className="mt-2 flex items-center gap-2">
                <Toggle on />
                <span className="text-[15px] font-semibold text-[#2f3743]">
                  Enable multi-language
                </span>
              </div>
              <p className="mt-2 text-[13px] text-[#6e7785]">Language</p>
              <button className="mt-1 h-10 w-full rounded-md border border-[#dfe3e8] px-3 text-left text-[14px] text-[#2f3743]">
                EN (English)
              </button>
              <div className="mt-1 rounded-md border border-[#dfe3e8] bg-white p-2 text-[14px] text-[#2f3743] space-y-1">
                <p>DE (German)</p>
                <p>FR (French)</p>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[15px]">
                {["Light", "Dark", "Brand"].map((mode, idx) => (
                  <label key={mode} className="flex items-center gap-2">
                    <input type="radio" name="theme" defaultChecked={idx === 2} />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[13px] text-[#6e7785]">Accent color</p>
              <div className="mt-1 h-10 rounded-md border border-[#dfe3e8] px-3 flex items-center gap-2 text-[14px]">
                <span className="h-4 w-4 rounded-sm bg-[#d0fe1d]" />
                <span>#D0FE1D</span>
              </div>
            </article>
          </div>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3 h-fit">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Live Kiosk Preview</h2>
            <div className="mt-2 mx-auto w-[250px] rounded-[24px] border-4 border-[#eceff3] bg-white p-3">
              <h3 className="text-center text-[22px] font-bold text-[#1f2631]">ORDERZILLA</h3>
              <p className="text-center text-[30px] leading-tight font-extrabold text-[#1f2631] mt-1">
                Welcome!
              </p>
              <p className="text-center text-[14px] text-[#7a8291]">Touch to order.</p>
              <div className="mt-2 rounded-lg bg-[#d7ff3f] p-2 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[#202716]">Summer Special Burger</p>
                  <button className="mt-1 rounded bg-[#1f2631] px-2 py-1 text-[10px] text-white">
                    Rank over
                  </button>
                </div>
                <div className="h-14 w-14 rounded bg-gradient-to-br from-[#2b2f39] to-[#926136]" />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] text-center text-[#4f5866]">
                {["Burgers", "Drinks", "Combo 1", "Summer S."].map((x) => (
                  <div key={x} className="space-y-1">
                    <div className="h-8 rounded bg-[#eef1f5]" />
                    <p>{x}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[13px] text-[#2f3743] font-semibold">
                <span>Brand</span>
                <span>$10.00</span>
              </div>
              <button className="mt-2 h-9 w-full rounded-md bg-[#d7ff3f] text-[13px] font-semibold text-[#1f2631]">
                Add to order
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

