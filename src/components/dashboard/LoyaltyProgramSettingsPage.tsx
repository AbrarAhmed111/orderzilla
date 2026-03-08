"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import RowActionMenu from "@/components/dashboard/ui/RowActionMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type ToggleProps = {
  on: boolean;
  onToggle?: (next: boolean) => void;
};

type Tier = {
  id: string;
  name: string;
  points: number;
  discount: number;
  badgeColor: string;
};

type NotificationKey = "pointsAdded" | "pointsRedeemed" | "tierUpgraded";

type NotificationConfig = {
  enabled: boolean;
  message: string;
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e4e6ea] bg-white p-2">
      <p className="text-[13px] text-[#6e7785]">{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-[42px] leading-none font-extrabold text-[#1a2029]">{value}</p>
        <div className="h-8 w-20 rounded bg-gradient-to-t from-[#ebf7bf] to-transparent border border-[#eef2e3]" />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-[#e4e6ea] bg-white p-3 md:p-4">
      <h2 className="text-[31px] font-bold text-[#1a212c]">{title}</h2>
      <div className="mt-2 space-y-2.5">{children}</div>
    </article>
  );
}

export default function LoyaltyProgramSettingsPage() {
  const defaultRuleSettings = useMemo(
    () => ({
      enabled: true,
      pointsEarnRate: "1 CHF = 1 Point",
      redemptionValue: "10 Points = 1 CHF",
      minimumRedemptionPoints: "100 Points",
      maxDiscountPerOrder: "25%",
      pointsExpiryDays: "365 Days",
    }),
    [],
  );

  const defaultNotifications = useMemo(
    () =>
      ({
        pointsAdded: {
          enabled: true,
          message: "e.g., You've earned {points} points!",
        },
        pointsRedeemed: {
          enabled: true,
          message: "e.g., You've redeemed {points} points for a {value} discount.",
        },
        tierUpgraded: {
          enabled: true,
          message: "e.g., Congratulations! You've reached the {tier_name} tier.",
        },
      }) satisfies Record<NotificationKey, NotificationConfig>,
    [],
  );

  const defaultTiers = useMemo<Tier[]>(
    () => [
      { id: "gold", name: "Gold", points: 5000, discount: 10, badgeColor: "#d2a92f" },
      { id: "silver", name: "Silver", points: 2000, discount: 5, badgeColor: "#b4bac4" },
      { id: "bronze", name: "Bronze", points: 0, discount: 0, badgeColor: "#b07445" },
    ],
    [],
  );

  const [rules, setRules] = useState(defaultRuleSettings);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [tiers, setTiers] = useState(defaultTiers);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    activeMembers: 0,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const updateRule = <K extends keyof typeof rules>(key: K, value: (typeof rules)[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const updateNotification = <K extends NotificationKey>(
    key: K,
    payload: Partial<NotificationConfig>,
  ) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...payload },
    }));
    setIsDirty(true);
  };

  const updateTier = (id: string, payload: Partial<Tier>) => {
    setTiers((prev) => prev.map((tier) => (tier.id === id ? { ...tier, ...payload } : tier)));
    setIsDirty(true);
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        id: `tier-${Date.now()}`,
        name: `Tier ${prev.length + 1}`,
        points: 1000,
        discount: 3,
        badgeColor: "#8c96a6",
      },
    ]);
    setIsDirty(true);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => (prev.length > 1 ? prev.filter((tier) => tier.id !== id) : prev));
    setIsDirty(true);
  };

  const fetchLoyaltyProgram = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [program, customersData] = await Promise.all([
        orderzillaApi.dashboard.loyalty.program.get(),
        orderzillaApi.dashboard.loyalty.customers.list({ query: { page: 1, limit: 200 } }),
      ]);

      setRules((prev) => ({
        ...prev,
        enabled: program?.is_active ?? prev.enabled,
        pointsEarnRate: `${program?.points_per_chf ?? 1} CHF = 1 Point`,
        redemptionValue: `${Math.round(1 / (program?.chf_per_point ?? 0.1)) || 10} Points = 1 CHF`,
        minimumRedemptionPoints: `${program?.min_redeem_points ?? 100} Points`,
        maxDiscountPerOrder: `${program?.max_redeem_percent ?? 25}%`,
        pointsExpiryDays: `${program?.expiry_days ?? 365} Days`,
      }));

      const customers = (customersData?.customers ?? []) as components["schemas"]["LoyaltyCustomer"][];
      const totalMembers = customers.length;
      const totalPointsIssued = customers.reduce(
        (sum, customer) => sum + (customer.total_points_earned ?? 0),
        0,
      );
      const totalPointsRedeemed = customers.reduce(
        (sum, customer) => sum + (customer.total_points_redeemed ?? 0),
        0,
      );
      const activeMembers = customers.filter((customer) => customer.is_active).length;
      setSummary({ totalMembers, totalPointsIssued, totalPointsRedeemed, activeMembers });
    } catch {
      setError("Failed to load loyalty program data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyProgram();
  }, []);

  const onSave = async () => {
    const parseLeadingNumber = (value: string, fallback: number) => {
      const number = Number(value.replace(/[^\d.]/g, ""));
      return Number.isFinite(number) && number > 0 ? number : fallback;
    };

    await orderzillaApi.dashboard.loyalty.program.update({
      body: {
        points_per_chf: parseLeadingNumber(rules.pointsEarnRate, 1),
        chf_per_point: 0.1,
        min_redeem_points: parseLeadingNumber(rules.minimumRedemptionPoints, 100),
        max_redeem_percent: parseLeadingNumber(rules.maxDiscountPerOrder, 25),
        expiry_days: parseLeadingNumber(rules.pointsExpiryDays, 365),
        is_active: rules.enabled,
      },
    });
    setIsDirty(false);
  };

  const onReset = () => {
    setRules(defaultRuleSettings);
    setNotifications(defaultNotifications);
    setTiers(defaultTiers);
    setIsDirty(false);
  };

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 md:px-5 md:py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029]">
            Loyalty Program Settings
          </h1>
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
              Save Settings
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
        {error ? (
          <div className="mt-3 rounded-lg border border-[#ffd2d2] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#b42323]">
            {error}{" "}
            <button type="button" onClick={fetchLoyaltyProgram} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={8} columns={4} />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
          <Card title="Program Rules">
            <div className="mt-2 flex items-center gap-2">
              <Toggle on={rules.enabled} onToggle={(next) => updateRule("enabled", next)} />
              <span className="text-[13px] font-semibold text-[#2f3743]">Enable Loyalty Program</span>
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[13px] font-semibold text-[#4e5664]">
                  Points earning rate (CHF spent -&gt; Points earned)
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={rules.pointsEarnRate}
                  onChange={(e) => updateRule("pointsEarnRate", e.target.value)}
                />
                <p className="mt-1 text-[12px] text-[#7a8291]">
                  How many points a customer earns for every 1 CHF spent.
                </p>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#4e5664]">
                  Redemption value (Points redeemed -&gt; CHF value)
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={rules.redemptionValue}
                  onChange={(e) => updateRule("redemptionValue", e.target.value)}
                />
                <p className="mt-1 text-[12px] text-[#7a8291]">
                  The value of points when redeemed for discounts.
                </p>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#4e5664]">
                  Minimum points for redemption
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={rules.minimumRedemptionPoints}
                  onChange={(e) => updateRule("minimumRedemptionPoints", e.target.value)}
                />
                <p className="mt-1 text-[12px] text-[#7a8291]">
                  The minimum points required to start redeeming.
                </p>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#4e5664]">
                  Maximum discount % per order
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={rules.maxDiscountPerOrder}
                  onChange={(e) => updateRule("maxDiscountPerOrder", e.target.value)}
                />
                <p className="mt-1 text-[12px] text-[#7a8291]">
                  Limit the maximum discount applied using points.
                </p>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#4e5664]">
                  Points expiry (days after earning)
                </label>
                <input
                  className="mt-1 h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[12px]"
                  value={rules.pointsExpiryDays}
                  onChange={(e) => updateRule("pointsExpiryDays", e.target.value)}
                />
                <p className="mt-1 text-[12px] text-[#7a8291]">
                  Points expire after this many days of inactivity.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <Card title="Tier Configuration">
              <div className="mt-2 rounded-lg border border-[#e4e6ea] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                  <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                    <tr className="text-[12px] text-[#6e7785] text-left">
                      <th className="px-2 py-2 w-6">⇅</th>
                      <th className="px-2 py-2 font-semibold">Tier Name</th>
                      <th className="px-2 py-2 font-semibold">Required Points Threshold</th>
                      <th className="px-2 py-2 font-semibold">Discount %</th>
                      <th className="px-2 py-2 font-semibold">Badge Color</th>
                      <th className="px-2 py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 border-[#edf0f4] text-[12px]">
                        <td className="px-2 py-2 text-[#9aa3ae]">⋮⋮</td>
                        <td className="px-2 py-2 font-semibold text-[#2f3743]">
                          <input
                            value={row.name}
                            onChange={(e) => updateTier(row.id, { name: e.target.value })}
                            className="h-8 w-full rounded-md border border-[#e1e5ea] px-2 text-[12px]"
                          />
                        </td>
                        <td className="px-2 py-2 text-[#2f3743]">
                          <input
                            value={row.points}
                            onChange={(e) => updateTier(row.id, { points: Number(e.target.value || 0) })}
                            className="h-8 w-full rounded-md border border-[#e1e5ea] px-2 text-[12px]"
                            type="number"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2 text-[#2f3743]">
                          <input
                            value={row.discount}
                            onChange={(e) =>
                              updateTier(row.id, { discount: Number(e.target.value || 0) })
                            }
                            className="h-8 w-full rounded-md border border-[#e1e5ea] px-2 text-[12px]"
                            type="number"
                            min={0}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.badgeColor}
                            onChange={(e) => updateTier(row.id, { badgeColor: e.target.value })}
                            className="h-8 w-20 rounded-md border border-[#e1e5ea] px-2 text-[12px]"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <RowActionMenu
                            actions={[
                              {
                                label: "Increase discount",
                                onClick: () => updateTier(row.id, { discount: row.discount + 1 }),
                              },
                              {
                                label: "Decrease threshold",
                                onClick: () => updateTier(row.id, { points: Math.max(0, row.points - 500) }),
                              },
                              {
                                label: "Remove tier",
                                onClick: () => removeTier(row.id),
                                danger: true,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="mt-2 h-9 w-full rounded-lg border border-[#dfe3e8] bg-white text-[12px] font-semibold text-[#3f4653]"
              >
                + Add Tier
              </button>
            </Card>

            <Card title="Notifications">
              <div className="mt-2 space-y-2">
                {[
                  {
                    key: "pointsAdded",
                    label: "Notify customer when points are added",
                  },
                  {
                    key: "pointsRedeemed",
                    label: "Notify customer when points are redeemed",
                  },
                  {
                    key: "tierUpgraded",
                    label: "Notify customer when tier is upgraded",
                  },
                ].map((item) => {
                  const notification = notifications[item.key as NotificationKey];
                  return (
                  <div key={item.label}>
                    <label className="flex items-center gap-2 text-[14px] font-semibold text-[#2f3743]">
                      <input
                        type="checkbox"
                        checked={notification.enabled}
                        onChange={(e) =>
                          updateNotification(item.key as NotificationKey, {
                            enabled: e.target.checked,
                          })
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[12px]"
                      rows={2}
                      value={notification.message}
                      onChange={(e) =>
                        updateNotification(item.key as NotificationKey, { message: e.target.value })
                      }
                    />
                  </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Program Summary">
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatCard label="Total Members" value={summary.totalMembers.toLocaleString()} />
                <StatCard label="Total Points Issued" value={summary.totalPointsIssued.toLocaleString()} />
                <StatCard label="Total Points Redeemed" value={summary.totalPointsRedeemed.toLocaleString()} />
                <StatCard label="Active Members (Last 30 Days)" value={summary.activeMembers.toLocaleString()} />
              </div>
            </Card>
          </div>
        </div>
        )}
      </section>
    </div>
  );
}

