"use client";

import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";

type EditCustomerPageProps = {
  id?: string;
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

export default function EditCustomerPage({ id }: EditCustomerPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState("BRONZE");
  const [points, setPoints] = useState("0");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setIsLoading(true);
      const customer = await orderzillaApi.dashboard.loyalty.customers.byId(id);
      const fullName = `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim();
      setName(fullName);
      setEmail(customer?.email ?? "");
      setPhone(customer?.phone ?? "");
      setTier(customer?.tier ?? "BRONZE");
      setPoints(String(customer?.points_balance ?? 0));
      setActive(customer?.is_active ?? true);
      setIsLoading(false);
    };
    run();
  }, [id]);

  const onSave = async () => {
    if (!id) return;
    const [first_name, ...rest] = name.trim().split(" ");
    const last_name = rest.join(" ");
    await orderzillaApi.dashboard.loyalty.customers.update(id, {
      body: {
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        is_active: active,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">Customers / John Doe / Edit</p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              Edit Customer
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Save Changes
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_1fr] gap-3">
          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Info</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Name</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
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
                  <label className="text-[14px] font-semibold text-[#4e5664]">Phone</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Loyalty Tier</label>
                  <SelectMenu
                    value={tier}
                    onChange={setTier}
                    options={[
                      { label: "Gold", value: "GOLD" },
                      { label: "Silver", value: "SILVER" },
                      { label: "Bronze", value: "BRONZE" },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Points Balance</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4e5664]">Account Status</label>
                  <div className="mt-2 flex items-center gap-2">
                    <Toggle on={active} onToggle={setActive} />
                    <span className="text-[16px] font-semibold text-[#2f3743]">
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <label className="text-[14px] font-semibold text-[#4e5664]">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px]"
                  rows={3}
                  placeholder="Add notes about this customer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#e9ebef] bg-white">
                <h2 className="text-[31px] font-bold text-[#1a212c]">
                  Transaction History (Read-Only)
                </h2>
              </div>
              <table className="w-full">
                <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                  <tr className="text-[13px] text-[#6e7785] text-left">
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-2 py-2 font-semibold">Description</th>
                    <th className="px-2 py-2 font-semibold">Points Earned / Redeemed</th>
                    <th className="px-3 py-2 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#edf0f4] text-[14px]">
                    <td className="px-3 py-3 text-[#2f3743]">Oct 26, 2023</td>
                    <td className="px-2 py-3 font-semibold text-[#2f3743]">Order #10482</td>
                    <td className="px-2 py-3 font-semibold text-[#2f3743]">+ 50 Points</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#2f3743]">450 Points</td>
                  </tr>
                  <tr className="border-b border-[#edf0f4] text-[14px]">
                    <td className="px-3 py-3 text-[#2f3743]">Oct 15, 2023</td>
                    <td className="px-2 py-3 font-semibold text-[#2f3743]">
                      Manual Adjustment: Bonus
                    </td>
                    <td className="px-2 py-3 font-semibold text-[#2f3743]">+ 100 Points</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#2f3743]">400 Points</td>
                  </tr>
                  <tr className="text-[14px]">
                    <td className="px-3 py-3 text-[#2f3743]">Oct 10, 2023</td>
                    <td className="px-2 py-3 font-semibold text-[#2f3743]">Redemption for Free Meal</td>
                    <td className="px-2 py-3 font-semibold text-[#2f3743]">- 200 Points</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#2f3743]">300 Points</td>
                  </tr>
                </tbody>
              </table>
            </article>
          </div>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Customer Summary</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[13px] text-[#6e7785]">Total Points Earned</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">1,250 Points</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Total Points Redeemed</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">800 Points</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Lifetime Spend</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">$2,450.00</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#6e7785]">Average Order Value</p>
                  <p className="text-[31px] leading-tight font-bold text-[#1a2029]">$20.42</p>
                </div>
              </div>
              <p className="mt-2 text-[13px] text-[#6e7785]">Points Earned Over Time</p>
              <div className="mt-2 h-24 rounded-lg bg-gradient-to-t from-[#ebf7bf] to-transparent border border-[#eef2e3]" />
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Manual Points Adjustment</h2>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[13px] text-[#6e7785]">Adjustment Amount (+ / -)</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                    placeholder="e.g., 100 or -50"
                  />
                </div>
                <div>
                  <label className="text-[13px] text-[#6e7785]">Reason (required)</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px]"
                    rows={3}
                    placeholder="Describe the reason for adjustment"
                  />
                </div>
                <button
                  type="button"
                  className="h-10 w-full rounded-lg bg-[#d4ff00] text-[14px] font-semibold text-[#1d2512]"
                >
                  Save Adjustment
                </button>
                <button
                  type="button"
                  className="h-9 w-full rounded-lg text-[14px] font-semibold text-[#6e7785]"
                >
                  Cancel
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

