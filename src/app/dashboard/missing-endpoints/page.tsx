"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Postman: `src/resourcesa/api_setup_info/3 march latest Orderzilla API Copy 2.postman_collection.json` — “Report 2 – New Endpoints”. */

function Section({
  title,
  route,
  children,
}: {
  title: string;
  route?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[20px] font-bold text-[#1a2029]">{title}</h2>
      {route ? (
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Route: <code className="rounded bg-[#e5e7eb] px-1">{route}</code>
        </p>
      ) : null}
      <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
        <ul className="space-y-1.5 text-[13px] text-[#b45309] list-disc pl-4">{children}</ul>
      </div>
    </section>
  );
}

function Li({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export default function MissingEndpointsPage() {
  return (
    <div className="p-3 sm:p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <h1 className="mt-2 text-[28px] sm:text-[36px] font-extrabold text-[#171d27]">
          Missing &amp; partial API coverage
        </h1>
        <p className="mt-1 text-[15px] text-[#5f6875]">
          Problems, gaps, and missing or unconfirmed endpoints only — not a full API description.
        </p>

        <Section title="API stability">
          <Li>
            Intermittent <code className="rounded bg-[#fef3c7] px-1">server_error</code> / HTTP 500 — unhandled server failure;
            dashboard can only show error / empty state.
          </Li>
        </Section>

        <Section title="Images (`image_url`)">
          <Li>
            Assets still inaccessible for some <code className="rounded bg-[#fef3c7] px-1">image_url</code> values (CDN/auth,
            proxy allowlist, non-public URL, non-image response).
          </Li>
          <Li>
            Missing contract: expected URL shape, signed URLs, allowed hosts for{" "}
            <code className="rounded bg-[#fef3c7] px-1">ORDERZILLA_MEDIA_PROXY_ALLOW_HOSTS</code>, and whether assets must be
            fetchable server-side without extra auth.
          </Li>
        </Section>

        <Section title="Dashboard (Overview)" route="/dashboard">
          <Li>KPI / chart widgets empty or zero when corresponding <code className="rounded bg-[#fef3c7] px-1">GET …/kpi/*</code> calls fail.</Li>
          <Li>Period “% change” not in API — estimated client-side when missing.</Li>
        </Section>

        <Section title="Categories" route="/dashboard/categories">
          <Li>No <code className="rounded bg-[#fef3c7] px-1">color</code> from API — UI uses a fixed palette.</Li>
          <Li>
            No <code className="rounded bg-[#fef3c7] px-1">GET /categories?location_id=</code> (or equivalent) — filter is
            inferred via extra client round-trips.
          </Li>
        </Section>

        <Section title="Products" route="/dashboard/products">
          <Li>No dedicated stock fields — “stock” inferred from <code className="rounded bg-[#fef3c7] px-1">is_active</code> only.</Li>
          <Li>Per-location override column empty without API support.</Li>
          <Li>
            <code className="rounded bg-[#fef3c7] px-1">GET/PUT …/products/{`{id}`}/prices</code> may differ from Postman vs production.
          </Li>
        </Section>

        <Section title="Extra groups" route="/dashboard/extra-groups">
          <Li>Extras create/edit/delete — confirm all methods exist and match OpenAPI in your environment.</Li>
        </Section>

        <Section title="Locations" route="/dashboard/locations">
          <Li>Bulk country list is hardcoded unless API exposes supported countries.</Li>
          <Li>
            <code className="rounded bg-[#fef3c7] px-1">DELETE /locations/{`{id}`}</code> may return errors despite docs.
          </Li>
        </Section>

        <Section title="Terminal — Overview" route="/dashboard/terminals/[id]">
          <Li>
            System health blank unless response includes vitals: <code className="rounded bg-[#fef3c7] px-1">storage_*</code>,{" "}
            <code className="rounded bg-[#fef3c7] px-1">memory_*</code>, <code className="rounded bg-[#fef3c7] px-1">cpu_load_percent</code>.
          </Li>
          <Li>
            Multi-location assignment may lack <code className="rounded bg-[#fef3c7] px-1">assigned_locations</code> + dedicated update
            endpoint.
          </Li>
          <Li>Rich activity timeline needs <code className="rounded bg-[#fef3c7] px-1">activity_events</code> — otherwise minimal fallback.</Li>
          <Li>Reboot control disabled — no reboot endpoint documented for the UI.</Li>
        </Section>

        <Section title="Terminal — Display content" route="/dashboard/terminals/[id]/display-content">
          <Li>
            <code className="rounded bg-[#fef3c7] px-1">PUT …/display-content</code> Save returning 500 — backend fix required.
          </Li>
        </Section>

        <Section title="Terminal — Logs" route="/dashboard/terminals/[id]/logs">
          <Li>List search/filters are client-side only — no list API query params for filter/search.</Li>
        </Section>

        <Section title="Orders" route="/dashboard/orders · /dashboard/orders/order-detail/[id]">
          <Li>
            <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/orders/{`{id}`}</code> — internal server error; order
            detail page cannot load until the API is fixed.
          </Li>
          <Li>Tab totals wrong or partial when <code className="rounded bg-[#fef3c7] px-1">status_counts</code> omitted from list response.</Li>
          <Li>Payment method filter is client-side on the current page only — no server list filter param.</Li>
          <Li>
            Order detail “Ready” time approximate if <code className="rounded bg-[#fef3c7] px-1">ready_at</code> missing.
          </Li>
          <Li>Currency falls back to CHF when order payload has no <code className="rounded bg-[#fef3c7] px-1">currency</code>.</Li>
        </Section>

        <Section title="Customers" route="/dashboard/customers">
          <Li>
            Loyalty <code className="rounded bg-[#fef3c7] px-1">tier</code> on edit may be read-only if PUT customer does not accept{" "}
            <code className="rounded bg-[#fef3c7] px-1">tier</code>.
          </Li>
          <Li>Transaction paging depends on API returning pagination / has_more consistently.</Li>
        </Section>

        <Section title="Loyalty program settings" route="/dashboard/loyalty-program-settings">
          <Li>Summary stats and mini charts missing unless API returns program-level aggregates and/or chart series fields.</Li>
          <Li>
            <code className="rounded bg-[#fef3c7] px-1">PUT …/loyalty/program</code> <code className="rounded bg-[#fef3c7] px-1">tiers</code> — confirm
            persistence server-side.
          </Li>
          <Li>Save returning 500 — backend issue.</Li>
        </Section>

        <Section title="Users" route="/dashboard/users">
          <Li>
            DELETE returns 2xx but user still listed after refresh — upstream delete not applied or wrong id semantics.
          </Li>
          <Li>
            “Email password reset link” not wired unless something like{" "}
            <code className="rounded bg-[#fef3c7] px-1">POST …/send-password-reset</code> exists.
          </Li>
          <Li>
            <code className="rounded bg-[#fef3c7] px-1">require_password_reset</code> not in GET/PUT user payload when product needs it.
          </Li>
        </Section>

        <Section title="Global settings" route="/dashboard/settings">
          <Li>
            Receipt/printing, idle timeout, maintenance, rounding, decimal format, terminal auto-close, order timeout, price
            override, debug logs — may be ignored by API if <code className="rounded bg-[#fef3c7] px-1">GET/PUT /settings</code> does not
            persist those keys.
          </Li>
          <Li>
            No <code className="rounded bg-[#fef3c7] px-1">POST /settings/reset</code> — “Reset defaults” is local UI only.
          </Li>
        </Section>
      </div>
    </div>
  );
}
