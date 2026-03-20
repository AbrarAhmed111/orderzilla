"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowLeft, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

type LoyaltyProgram = components["schemas"]["LoyaltyProgram"];
type LoyaltyCustomer = components["schemas"]["LoyaltyCustomer"];

type TierRow = {
  id: string;
  name: string;
  pointsThreshold: number;
  discountPercent: number | null;
  badgeColor: string;
};

function createEmptyTier(): TierRow {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tier-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    pointsThreshold: 0,
    discountPercent: null,
    badgeColor: "#d4ff00",
  };
}

function normalizeHexColor(hex: string): string {
  const t = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t}`;
  return "#d4ff00";
}

/** Mini charts only when API returns series (e.g. summary_chart / program_metrics_trend). */
function chartDataFromProgram(program: unknown): { m: string; v: number }[] | undefined {
  if (!program || typeof program !== "object") return undefined;
  const p = program as {
    summary_chart?: { m?: string; v?: number }[];
    program_metrics_trend?: { period?: string; value?: number }[];
  };
  const a = p.summary_chart;
  if (Array.isArray(a) && a.length > 0) {
    return a
      .map((pt, i) => ({ m: String(pt.m ?? i + 1), v: typeof pt.v === "number" ? pt.v : 0 }))
      .filter((pt) => Number.isFinite(pt.v));
  }
  const t = p.program_metrics_trend;
  if (Array.isArray(t) && t.length > 0) {
    return t.map((pt, i) => ({
      m: String(pt.period ?? i + 1),
      v: typeof pt.value === "number" ? pt.value : 0,
    }));
  }
  return undefined;
}

function StatCard({ label, value, chartData }: { label: string; value: string; chartData?: { m: string; v: number }[] }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] text-[#717c8e]">{label}</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-[#12161f]">{value}</p>
        </div>
        {chartData && chartData.length > 0 && (
          <div className="h-10 w-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Area type="monotone" dataKey="v" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                <XAxis dataKey="m" hide />
                <YAxis hide />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoyaltyProgramSettingsPage() {
  const [isActive, setIsActive] = useState(true);
  const [pointsPerChf, setPointsPerChf] = useState(1);
  const [chfPerPoint, setChfPerPoint] = useState(0.1);
  const [minRedeemPoints, setMinRedeemPoints] = useState(100);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(25);
  const [expiryDays, setExpiryDays] = useState(365);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [notifyPointsAdded, setNotifyPointsAdded] = useState(true);
  const [notifyPointsRedeemed, setNotifyPointsRedeemed] = useState(true);
  const [notifyTierUpgrade, setNotifyTierUpgrade] = useState(true);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    activeMembersLast30: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [programChartData, setProgramChartData] = useState<{ m: string; v: number }[] | undefined>(undefined);

  const fetchProgram = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      let program: LoyaltyProgram | undefined;
      try {
        program = await orderzillaApi.dashboard.loyalty.program.get();
      } catch (e) {
        if (!(isAxiosError(e) && e.response?.status === 404)) throw e;
      }
      if (program) {
        setProgramChartData(chartDataFromProgram(program));
        setIsActive(program.is_active ?? true);
        setPointsPerChf(program.points_per_chf ?? 1);
        setChfPerPoint(program.chf_per_point ?? 0.1);
        setMinRedeemPoints(program.min_redeem_points ?? 100);
        setMaxDiscountPercent(program.max_redeem_percent ?? 25);
        setExpiryDays(program.expiry_days ?? 365);
      } else {
        setProgramChartData(undefined);
      }
      const tiersData = (program as { tiers?: Array<Record<string, unknown>> })?.tiers;
      if (tiersData && Array.isArray(tiersData) && tiersData.length > 0) {
        setTiers(
          tiersData.map((t) => ({
            id: String(t.id ?? crypto.randomUUID()),
            name: String(t.name ?? ""),
            pointsThreshold: Number(t.points_threshold ?? t.pointsThreshold ?? 0),
            discountPercent: t.discount_percent != null || t.discountPercent != null ? Number(t.discount_percent ?? t.discountPercent) : null,
            badgeColor: String(t.badge_color ?? t.badgeColor ?? "#d4ff00"),
          })),
        );
      } else {
        setTiers([]);
      }
      const notifData = (program as { notifications?: { points_added?: boolean; points_redeemed?: boolean; tier_upgrade?: boolean } })?.notifications;
      if (notifData) {
        setNotifyPointsAdded(notifData.points_added ?? true);
        setNotifyPointsRedeemed(notifData.points_redeemed ?? true);
        setNotifyTierUpgrade(notifData.tier_upgrade ?? true);
      }
      const customersData = await orderzillaApi.dashboard.loyalty.customers.list({
        query: { page: 1, limit: 500 },
      });
      const customers = (customersData?.customers ?? []) as LoyaltyCustomer[];
      const prog = program as {
        total_members?: number;
        total_points_issued?: number;
        total_points_redeemed?: number;
        active_last_30_days?: number;
      } | undefined;
      const totalMembers =
        typeof prog?.total_members === "number" ? prog.total_members : customers.length;
      const totalPointsIssued =
        typeof prog?.total_points_issued === "number"
          ? prog.total_points_issued
          : customers.reduce((s, c) => s + (c.total_points_earned ?? 0), 0);
      const totalPointsRedeemed =
        typeof prog?.total_points_redeemed === "number"
          ? prog.total_points_redeemed
          : customers.reduce((s, c) => s + (c.total_points_redeemed ?? 0), 0);
      const activeMembersLast30 =
        (customersData as { active_last_30_days?: number })?.active_last_30_days ??
        (typeof prog?.active_last_30_days === "number"
          ? prog.active_last_30_days
          : customers.filter((c) => c.is_active).length);
      setSummary({
        totalMembers,
        totalPointsIssued,
        totalPointsRedeemed,
        activeMembersLast30,
      });
    } catch {
      setError("Failed to load loyalty program.");
      setProgramChartData(undefined);
      setTiers([]);
      setSummary({
        totalMembers: 0,
        totalPointsIssued: 0,
        totalPointsRedeemed: 0,
        activeMembersLast30: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const updateTier = useCallback((tierId: string, patch: Partial<TierRow>) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, ...patch } : t)),
    );
  }, []);

  const removeTier = useCallback((tierId: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  }, []);

  const addTier = useCallback(() => {
    setTiers((prev) => [...prev, createEmptyTier()]);
  }, []);

  const onSave = async () => {
    const trimmedTiers = tiers.map((t) => ({
      ...t,
      name: t.name.trim(),
      pointsThreshold: Math.max(0, Math.floor(Number(t.pointsThreshold) || 0)),
      badgeColor: normalizeHexColor(t.badgeColor),
    }));

    const invalid = trimmedTiers.find((t) => !t.name);
    if (trimmedTiers.length > 0 && invalid) {
      toast.error("Each tier needs a name.");
      return;
    }

    const discountInvalid = trimmedTiers.find(
      (t) =>
        t.discountPercent != null &&
        (Number.isNaN(t.discountPercent) || t.discountPercent < 0 || t.discountPercent > 100),
    );
    if (discountInvalid) {
      toast.error("Discount % must be between 0 and 100, or left empty.");
      return;
    }

    const tiersPayload = [...trimmedTiers].sort(
      (a, b) => a.pointsThreshold - b.pointsThreshold,
    );

    setIsSaving(true);
    try {
      await orderzillaApi.dashboard.loyalty.program.update({
        body: {
          is_active: isActive,
          points_per_chf: pointsPerChf,
          chf_per_point: chfPerPoint,
          min_redeem_points: minRedeemPoints,
          max_redeem_percent: maxDiscountPercent,
          expiry_days: expiryDays,
          tiers: tiersPayload.map((t) => ({
            name: t.name,
            points_threshold: t.pointsThreshold,
            discount_percent: t.discountPercent ?? undefined,
            badge_color: t.badgeColor,
          })),
          notifications: {
            points_added: notifyPointsAdded,
            points_redeemed: notifyPointsRedeemed,
            tier_upgrade: notifyTierUpgrade,
          },
        },
      });
      toast.success("Loyalty program settings saved.");
      await fetchProgram();
    } catch {
      toast.error("Failed to save. Endpoint may not support all fields.");
    } finally {
      setIsSaving(false);
    }
  };

  const onReset = () => {
    fetchProgram();
    toast.success("Reset to defaults.");
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4">
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
            <button type="button" onClick={fetchProgram} className="font-semibold underline">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] sm:text-[36px] font-extrabold text-[#12161f]">
            Loyalty Program Settings
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
            <h2 className="text-[18px] font-bold text-[#1a212c]">Program Rules</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-[#363f4c]">Enable Loyalty Program</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((v) => !v)}
                  className={`h-6 w-11 rounded-full transition-colors ${isActive ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"}`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Points earning rate (CHF spent → Points earned)
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={pointsPerChf}
                  onChange={(e) => setPointsPerChf(Number(e.target.value) || 1)}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="1"
                />
                <p className="mt-1 text-[12px] text-[#6e7785]">
                  How many points a customer earns for every 1 CHF spent. (e.g., 1 CHF = 1 Point)
                </p>
              </div>
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Redemption value (Points redeemed → CHF value)
                </label>
                <input
                  type="number"
                  min={1}
                  value={chfPerPoint <= 0 ? "" : Math.round(1 / chfPerPoint)}
                  onChange={(e) => {
                    const pts = Number(e.target.value) || 10;
                    setChfPerPoint(pts > 0 ? 1 / pts : 0.1);
                  }}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="10"
                />
                <p className="mt-1 text-[12px] text-[#6e7785]">
                  The value of points when redeemed for discounts. (e.g., 10 Points = 1 CHF)
                </p>
              </div>
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Minimum points for redemption
                </label>
                <input
                  type="number"
                  min={0}
                  value={minRedeemPoints}
                  onChange={(e) => setMinRedeemPoints(Number(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="100"
                />
                <p className="mt-1 text-[12px] text-[#6e7785]">
                  The minimum points required to start redeeming.
                </p>
              </div>
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Maximum discount % per order
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(Number(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="25"
                />
                <p className="mt-1 text-[12px] text-[#6e7785]">
                  Limit the maximum discount applied using points.
                </p>
              </div>
              <div>
                <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                  Points expiry (days after earning)
                </label>
                <input
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value) || 365)}
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="365"
                />
                <p className="mt-1 text-[12px] text-[#6e7785]">
                  Points expire after this many days of inactivity.
                </p>
              </div>
            </div>
          </article>

          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Tier Configuration</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                    <tr className="text-[12px] text-[#6e7785] text-left">
                      <th className="px-3 py-2 font-semibold">Tier Name</th>
                      <th className="px-2 py-2 font-semibold">Required Points Threshold</th>
                      <th className="px-2 py-2 font-semibold">Discount % (optional)</th>
                      <th className="px-2 py-2 font-semibold">Badge Color</th>
                      <th className="px-3 py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#717c8e]">
                          No tiers yet. Use &quot;+ Add Tier&quot; to define levels (e.g. Bronze, Silver, Gold). Save
                          settings to sync with the server.
                        </td>
                      </tr>
                    ) : (
                      tiers.map((tier) => (
                        <tr key={tier.id} className="border-b border-[#edf0f4] text-[14px]">
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                              className="h-9 w-full min-w-[120px] max-w-[200px] rounded-lg border border-[#dfe3e8] px-2 text-[13px] font-semibold text-[#2f3743]"
                              placeholder="e.g. Gold"
                              aria-label="Tier name"
                            />
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={tier.pointsThreshold}
                                onChange={(e) =>
                                  updateTier(tier.id, {
                                    pointsThreshold: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="h-9 w-full min-w-[100px] max-w-[140px] rounded-lg border border-[#dfe3e8] px-2 text-[13px] text-[#2f3743]"
                                aria-label="Points threshold"
                              />
                              <span className="shrink-0 text-[12px] text-[#6e7785]">pts</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={tier.discountPercent ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  updateTier(tier.id, {
                                    discountPercent: raw === "" ? null : Number(raw),
                                  });
                                }}
                                className="h-9 w-full min-w-[72px] max-w-[100px] rounded-lg border border-[#dfe3e8] px-2 text-[13px] text-[#2f3743]"
                                placeholder="—"
                                aria-label="Optional discount percent"
                              />
                              <span className="shrink-0 text-[12px] text-[#6e7785]">%</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={normalizeHexColor(tier.badgeColor)}
                                onChange={(e) => updateTier(tier.id, { badgeColor: e.target.value })}
                                className="h-9 w-11 cursor-pointer rounded border border-[#dfe3e8] bg-white p-0.5"
                                title="Badge color"
                                aria-label="Badge color"
                              />
                              <span
                                className="inline-block h-5 w-5 shrink-0 rounded-full border border-[#e5e7eb]"
                                style={{ backgroundColor: normalizeHexColor(tier.badgeColor) }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => removeTier(tier.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#fee2e2] text-[#b91c1c] hover:bg-[#fef2f2]"
                              aria-label="Remove tier"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="mt-3 h-9 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[13px] font-semibold text-[#414855] hover:bg-[#f9fafb]"
              >
                + Add Tier
              </button>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Notifications</h2>
              <div className="mt-4 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyPointsAdded}
                    onChange={(e) => setNotifyPointsAdded(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#cfd5de]"
                  />
                  <div>
                    <span className="text-[14px] font-semibold text-[#363f4c]">
                      Notify customer when points are added
                    </span>
                    <p className="text-[12px] text-[#6e7785] mt-0.5">
                      e.g., You&apos;ve earned {"{points}"} points!
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyPointsRedeemed}
                    onChange={(e) => setNotifyPointsRedeemed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#cfd5de]"
                  />
                  <div>
                    <span className="text-[14px] font-semibold text-[#363f4c]">
                      Notify customer when points are redeemed
                    </span>
                    <p className="text-[12px] text-[#6e7785] mt-0.5">
                      e.g., You&apos;ve redeemed {"{points}"} points for a {"{value}"} discount.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyTierUpgrade}
                    onChange={(e) => setNotifyTierUpgrade(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[#cfd5de]"
                  />
                  <div>
                    <span className="text-[14px] font-semibold text-[#363f4c]">
                      Notify customer when tier is upgraded
                    </span>
                    <p className="text-[12px] text-[#6e7785] mt-0.5">
                      e.g., Congratulations! You&apos;ve reached the {"{tier_name}"} tier.
                    </p>
                  </div>
                </label>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Program Summary</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatCard
                  label="Total Members"
                  value={summary.totalMembers.toLocaleString()}
                  chartData={programChartData}
                />
                <StatCard
                  label="Total Points Issued"
                  value={summary.totalPointsIssued.toLocaleString()}
                  chartData={programChartData}
                />
                <StatCard
                  label="Total Points Redeemed"
                  value={summary.totalPointsRedeemed.toLocaleString()}
                  chartData={programChartData}
                />
                <StatCard
                  label="Active Members (Last 30 Days)"
                  value={summary.activeMembersLast30.toLocaleString()}
                  chartData={programChartData}
                />
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
