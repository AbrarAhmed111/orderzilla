"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api/orderzilla-api";
import type { components } from "@/types/orderzilla-openapi";
type LoyaltyProgram = components["schemas"]["LoyaltyProgram"];
type LoyaltyCustomer = components["schemas"]["LoyaltyCustomer"];

type ProgramForm = {
  name: string;
  is_active: boolean;
  points_per_chf: number;
  chf_per_point: number;
  min_redeem_points: number;
  max_redeem_percent: number;
  expiry_days: number;
};

const DEFAULT_FORM: ProgramForm = {
  name: "Orderzilla Punkte",
  is_active: true,
  points_per_chf: 1,
  chf_per_point: 0.01,
  min_redeem_points: 100,
  max_redeem_percent: 50,
  expiry_days: 365,
};

function mapProgramToForm(program?: LoyaltyProgram): ProgramForm {
  return {
    name: program?.name ?? DEFAULT_FORM.name,
    is_active: program?.is_active ?? DEFAULT_FORM.is_active,
    points_per_chf: program?.points_per_chf ?? DEFAULT_FORM.points_per_chf,
    chf_per_point: program?.chf_per_point ?? DEFAULT_FORM.chf_per_point,
    min_redeem_points: program?.min_redeem_points ?? DEFAULT_FORM.min_redeem_points,
    max_redeem_percent: program?.max_redeem_percent ?? DEFAULT_FORM.max_redeem_percent,
    expiry_days: program?.expiry_days ?? DEFAULT_FORM.expiry_days,
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
      <p className="text-[12px] text-[#717c8e]">{label}</p>
      <p className="mt-1 text-[24px] font-extrabold leading-none text-[#12161f]">{value}</p>
    </div>
  );
}

export default function LoyaltyProgramSettingsPage() {
  const [form, setForm] = useState<ProgramForm>(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState<ProgramForm>(DEFAULT_FORM);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    activeMembers: 0,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchLoyaltyProgram = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      let program: LoyaltyProgram | undefined;
      try {
        program = await orderzillaApi.dashboard.loyalty.program.get();
      } catch (programError) {
        if (!(isAxiosError(programError) && programError.response?.status === 404)) {
          throw programError;
        }
      }

      const customersData = await orderzillaApi.dashboard.loyalty.customers.list({
        query: { page: 1, limit: 200 },
      });
      const nextForm = mapProgramToForm(program);
      setForm(nextForm);
      setInitialForm(nextForm);

      const customers = (customersData?.customers ?? []) as LoyaltyCustomer[];
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
      setIsDirty(false);
    } catch {
      setError("Failed to load loyalty program data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoyaltyProgram();
  }, [fetchLoyaltyProgram]);

  const onSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim() || DEFAULT_FORM.name,
        points_per_chf: Math.max(0, form.points_per_chf),
        chf_per_point: Math.max(0.000001, form.chf_per_point),
        min_redeem_points: Math.max(0, Math.floor(form.min_redeem_points)),
        max_redeem_percent: Math.min(100, Math.max(0, form.max_redeem_percent)),
        expiry_days: Math.max(1, Math.floor(form.expiry_days)),
        is_active: form.is_active,
      };

      const response = await orderzillaApi.dashboard.loyalty.program.update({ body: payload });
      const mapped = mapProgramToForm(response);
      setForm(mapped);
      setInitialForm(mapped);
      setIsDirty(false);
      toast.success("Loyalty program settings saved.");
    } catch {
      toast.error("Failed to save loyalty program settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const onReset = () => {
    setForm(initialForm);
    setIsDirty(false);
  };

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[30px] font-extrabold text-[#12161f]">Loyalty Program Settings</h1>
            <p className="text-[13px] text-[#717c8e]">
              Configure points and redemption rules backed by your live API.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || !isDirty}
              onClick={onSave}
              className="h-9 rounded-lg bg-[#d0fe1d] px-4 text-[12px] font-semibold text-[#12161f] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="h-9 rounded-lg border border-[#d1d6db] bg-white px-4 text-[12px] font-semibold text-[#12161f]"
            >
              Reset Changes
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
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <article className="rounded-xl border border-[#e5e7eb] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#12161f]">Program Rules</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-[12px] font-semibold text-[#4b5563]">Program Name</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#d1d6db] px-3 text-[13px]"
                    value={form.name}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, name: event.target.value }));
                      setIsDirty(true);
                    }}
                    placeholder="Orderzilla Punkte"
                  />
                </div>
                <label className="flex items-center gap-2 text-[13px] font-semibold text-[#12161f]">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, is_active: event.target.checked }));
                      setIsDirty(true);
                    }}
                  />
                  Enable Loyalty Program
                </label>
              <div>
                <label className="text-[12px] font-semibold text-[#4b5563]">Points Per CHF</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#d1d6db] px-3 text-[13px]"
                  value={form.points_per_chf}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, points_per_chf: Number(event.target.value || 0) }));
                    setIsDirty(true);
                  }}
                  type="number"
                  min={0}
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#4b5563]">CHF Per Point</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#d1d6db] px-3 text-[13px]"
                  value={form.chf_per_point}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, chf_per_point: Number(event.target.value || 0) }));
                    setIsDirty(true);
                  }}
                  type="number"
                  min={0.000001}
                  step="0.0001"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#4b5563]">Minimum Redeem Points</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#d1d6db] px-3 text-[13px]"
                  value={form.min_redeem_points}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, min_redeem_points: Number(event.target.value || 0) }));
                    setIsDirty(true);
                  }}
                  type="number"
                  min={0}
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#4b5563]">Max Redeem Percent</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#d1d6db] px-3 text-[13px]"
                  value={form.max_redeem_percent}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, max_redeem_percent: Number(event.target.value || 0) }));
                    setIsDirty(true);
                  }}
                  type="number"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#4b5563]">Expiry Days</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#d1d6db] px-3 text-[13px]"
                  value={form.expiry_days}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, expiry_days: Number(event.target.value || 0) }));
                    setIsDirty(true);
                  }}
                  type="number"
                  min={1}
                />
              </div>
              </div>
            </article>

            <div className="space-y-3">
              <article className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                <h2 className="text-[18px] font-bold text-[#12161f]">Live Program Summary</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatCard label="Total Members" value={summary.totalMembers.toLocaleString()} />
                  <StatCard label="Points Issued" value={summary.totalPointsIssued.toLocaleString()} />
                  <StatCard label="Points Redeemed" value={summary.totalPointsRedeemed.toLocaleString()} />
                  <StatCard label="Active Members" value={summary.activeMembers.toLocaleString()} />
                </div>
              </article>

              <article className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                <h2 className="text-[18px] font-bold text-[#12161f]">Current Conversion</h2>
                <div className="mt-3 space-y-2 text-[13px] text-[#374151]">
                  <p>
                    <span className="font-semibold">{form.points_per_chf}</span> point(s) earned per 1 CHF spent
                  </p>
                  <p>
                    1 point equals{" "}
                    <span className="font-semibold">
                      CHF {Number.isFinite(form.chf_per_point) ? form.chf_per_point.toFixed(4) : "0.0000"}
                    </span>
                  </p>
                  <p>
                    Minimum redeem threshold: <span className="font-semibold">{form.min_redeem_points}</span> points
                  </p>
                  <p>
                    Max order discount via points: <span className="font-semibold">{form.max_redeem_percent}%</span>
                  </p>
                  <p>
                    Points expiry policy: <span className="font-semibold">{form.expiry_days}</span> day(s)
                  </p>
                  <p>
                    Program status:{" "}
                    <span className={`font-semibold ${form.is_active ? "text-[#15803d]" : "text-[#b91c1c]"}`}>
                      {form.is_active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </article>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

