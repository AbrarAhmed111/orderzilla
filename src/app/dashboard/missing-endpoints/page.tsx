"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MissingEndpointsPage() {
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
        <h1 className="mt-2 text-[28px] sm:text-[36px] font-extrabold text-[#171d27]">
          Missing & Partial API Endpoints
        </h1>
        <p className="mt-1 text-[15px] text-[#5f6875]">
          Data that is still mock or derived instead of coming from the backend.
        </p>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Endpoints missing from Postman collection</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          These endpoints are used by the app (per OpenAPI) but are not in the Postman collection.
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Product prices</strong> — <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/products/{`{id}`}/prices</code>, <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/products/{`{id}`}/prices</code>, <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/products/{`{id}`}/prices/{`{priceId}`}</code>
            </li>
            <li>
              <strong>Extra groups (create/update/delete)</strong> — <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/extras</code>, <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/extras/{`{id}`}</code>, <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/extras/{`{id}`}</code>
            </li>
            <li>
              <strong>Extra group options</strong> — <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/extras/{`{id}`}/options</code>, <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/extras/{`{id}`}/options</code>, <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/extras/{`{id}`}/options/{`{optId}`}</code>, <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/extras/{`{id}`}/options/{`{optId}`}</code>
            </li>
            <li>
              <strong>Terminals (create/update/delete)</strong> — <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/terminals</code>, <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/terminals/{`{id}`}</code>, <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/terminals/{`{id}`}</code>
            </li>
            <li>
              <strong>Terminal products</strong> — <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/terminals/{`{id}`}/products</code>, <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/terminals/{`{id}`}/products</code>
            </li>
            <li>
              <strong>Terminal commands</strong> — <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/terminals/{`{id}`}/commands</code>
            </li>
            <li>
              <strong>Loyalty customers (create/update/adjust)</strong> — <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/loyalty/customers</code>, <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/loyalty/customers/{`{id}`}</code>, <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/loyalty/customers/{`{id}`}/adjust</code>
            </li>
            <li>
              <strong>Users (delete, reset password)</strong> — <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/users/{`{id}`}</code>, <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/users/{`{id}`}/reset-password</code>
            </li>
            <li>
              <strong>Settings — logo upload</strong> — <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/settings/logo</code> (multipart/form-data with <code className="rounded bg-[#fef3c7] px-1">logo</code> file). Used by Global Settings for company logo. Postman has GET, PUT, export-logs, backup but not logo.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Orders Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Orders list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/orders</code>) and Order detail (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/orders/order-detail/[id]</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Order Timeline — &quot;Ready&quot; step timestamp</strong> — When the order is in Ready or later status, the &quot;Ready&quot; step time is derived by adding 4 minutes to <code className="rounded bg-[#fef3c7] px-1">created_at</code> instead of using a real timestamp from the backend. The API should return <code className="rounded bg-[#fef3c7] px-1">ready_at</code> (or equivalent) as an ISO 8601 string.
            </li>
            <li>
              <strong>Order Timeline — per-step timestamps</strong> — The backend should return <code className="rounded bg-[#fef3c7] px-1">payment_confirmed_at</code>, <code className="rounded bg-[#fef3c7] px-1">sent_to_kitchen_at</code>, <code className="rounded bg-[#fef3c7] px-1">preparing_at</code> as ISO 8601 strings for accurate timeline display.
            </li>
            <li>
              <strong>created_at</strong> — Must be an ISO 8601 string for the timeline to display correctly.
            </li>
            <li>
              <strong>extras[].extra_name</strong> — The backend should include <code className="rounded bg-[#fef3c7] px-1">extra_name</code> on each modifier so the &quot;Selected modifiers&quot; section displays names correctly.
            </li>
            <li>
              <strong>Tab counts (Orders list)</strong> — The badge counts (Pending, Confirmed, Preparing, etc.) are computed from the current page&apos;s rows only, not from the API. For accurate counts across all orders, the backend would need to return <code className="rounded bg-[#fef3c7] px-1">status_counts</code> or similar in the list response.
            </li>
            <li>
              <strong>Delete order</strong> — The &quot;Delete&quot; action and row menu &quot;Delete order&quot; only remove orders from local state; they do not call a delete API. If order deletion is required, a <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/orders/{`{id}`}</code> endpoint would be needed.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Categories Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Categories list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/categories</code>), Create category (<code className="rounded bg-[#e5e7eb] px-1">/categories/create-category</code>), and Edit category (<code className="rounded bg-[#e5e7eb] px-1">/categories/[id]/edit-category</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Category color</strong> — The thumbnail/placeholder color for each category row is derived from the list index using a hardcoded <code className="rounded bg-[#fef3c7] px-1">colorPresets</code> array. The API does not return <code className="rounded bg-[#fef3c7] px-1">color</code> or <code className="rounded bg-[#fef3c7] px-1">color_id</code>. The backend should return a color per category for consistent display.
            </li>
            <li>
              <strong>Location filter</strong> — Filtering categories by location is implemented by fetching terminals, then terminal products, and deriving category IDs from <code className="rounded bg-[#fef3c7] px-1">product.category_id</code>. A dedicated endpoint such as <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/categories?location_id={`{id}`}</code> or categories including <code className="rounded bg-[#fef3c7] px-1">location_ids</code> would simplify this and reduce round-trips.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Products Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Products list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/products</code>), Create product (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/products/create-product</code>), and Edit product (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/products/edit-product?id={`{id}`}</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Stock status</strong> — &quot;In Stock&quot; / &quot;Out of Stock&quot; is derived from <code className="rounded bg-[#fef3c7] px-1">is_active</code> (visibility). Real inventory/stock would require a separate field (e.g. <code className="rounded bg-[#fef3c7] px-1">stock_quantity</code> or <code className="rounded bg-[#fef3c7] px-1">in_stock</code>) from the backend.
            </li>
            <li>
              <strong>Location Override</strong> — The Location Override column (MapPin/Tag icons) is always empty; <code className="rounded bg-[#fef3c7] px-1">locationOverride</code> is hardcoded to <code className="rounded bg-[#fef3c7] px-1">&quot;&quot;</code>. The API does not return per-product location override info.
            </li>
            <li>
              <strong>Product Prices (Pricing tab)</strong> — Price endpoints are missing from Postman (see above). The Remove button removes rows optimistically; if the delete API fails, the row is still removed from the form but may need a save to sync.
            </li>
            <li>
              <strong>Edit Product Save — 500 Internal Server Error</strong> — When clicking Save, the backend returns <code className="rounded bg-[#fef3c7] px-1">{`{"error":"server_error","message":"Internal server error"}`}</code>. The client uses the correct endpoints per the OpenAPI spec: <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/products/{`{id}`}</code> (General), <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/products/{`{id}`}/prices</code> (Pricing), <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/products/{`{id}`}/availability</code> (Availability), <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/products/{`{id}`}/advanced</code> (Advanced), plus extras attach/detach and image upload. The error appears to be backend-side.
            </li>
            <li>
              <strong>Product image URLs not accessible</strong> — The API returns <code className="rounded bg-[#fef3c7] px-1">image_url</code> as absolute URLs (e.g. <code className="rounded bg-[#fef3c7] px-1">http://orderzilla-api.tappy-app.ch/uploads/1772979796812-k2dophp0al.png</code>). These images are not accessible from the dashboard (CORS, network, or auth). The backend should either serve images via a public CDN, use relative paths that the dashboard can proxy, or provide signed/authenticated URLs.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Extra Groups Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Extra groups list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/extra-groups</code>) and Create/Edit extra group (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/extra-groups/create-extra-group</code> or <code className="rounded bg-[#e5e7eb] px-1">?id={`{id}`}</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Extra group create/update/delete</strong> — POST, PUT, DELETE extras endpoints are missing from Postman (see above). The Create/Edit page uses them for Save and Delete.
            </li>
            <li>
              <strong>Extra Group Options table</strong> — Options endpoints are missing from Postman (see above). The Create/Edit page Options table uses them; the list page &quot;Options&quot; column shows <code className="rounded bg-[#fef3c7] px-1">option_count</code> from GET /extras.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Locations Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Locations list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/locations</code>). Create and edit are done via modals on the same page.
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Assign Country dropdown</strong> — The bulk &quot;Assign Country&quot; action uses a hardcoded list of 3 options (CH, DE, FR). The Create Location modal uses the full ISO country list; the bulk action could use the same or the backend could provide supported countries.
            </li>
            <li>
              <strong>Delete location</strong> — <code className="rounded bg-[#fef3c7] px-1">DELETE /v1/dashboard/locations/{`{id}`}</code> returns an internal server error. The endpoint exists but appears to fail on the backend.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Terminals Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Terminals list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/terminals</code>), Terminal detail Overview (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/terminals/[id]</code>), Display Content, Functions, and Logs subpages.
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Terminal Overview — System Health</strong> — Memory usage (40%, 3.2 GB / 8 GB) and CPU load (25%) are hardcoded. The backend should return <code className="rounded bg-[#fef3c7] px-1">vitals</code> with <code className="rounded bg-[#fef3c7] px-1">memory_used_mb</code>, <code className="rounded bg-[#fef3c7] px-1">cpu_load</code>, etc.
            </li>
            <li>
              <strong>Terminal Overview — Reboot, Reassign Locations</strong> — The Reboot button is disabled (no API). The Active toggle now persists via <code className="rounded bg-[#fef3c7] px-1">PUT /terminals/{`{id}`}</code>. Assigned Locations toggles update local state only; the API does not support updating <code className="rounded bg-[#fef3c7] px-1">assigned_locations</code>. Reassign Locations has no handler.
            </li>
            <li>
              <strong>Terminal Logs</strong> — The UI uses <code className="rounded bg-[#fef3c7] px-1">MOCK_LOGS</code> (6 hardcoded entries) when real data is unavailable. The backend should provide <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/terminals/{`{id}`}/logs</code> with <code className="rounded bg-[#fef3c7] px-1">date_range</code> support.
            </li>
            <li>
              <strong>Terminal Functions</strong> — The backend should return terminal function settings (order, payment, loyalty, discounts, maintenance) from <code className="rounded bg-[#fef3c7] px-1">GET /terminals/{`{id}`}/functions</code>.
            </li>
            <li>
              <strong>Display Content Save</strong> — <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/terminals/{`{id}`}/display-content</code> returns <code className="rounded bg-[#fef3c7] px-1">{`{"error":"server_error","message":"Internal server error"}`}</code> when clicking Save. The endpoint exists in Postman but appears to fail on the backend.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Loyalty Program Pages</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Loyalty Program Settings (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/loyalty-program-settings</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Program Summary chart data</strong> — The StatCards (Total Members, Points Issued, Points Redeemed, Active Members) use <code className="rounded bg-[#fef3c7] px-1">MOCK_CHART_DATA</code> (6 hardcoded values) for the mini area charts. The backend should return <code className="rounded bg-[#fef3c7] px-1">summary</code> or <code className="rounded bg-[#fef3c7] px-1">chart_data</code> for real trends.
            </li>
            <li>
              <strong>Program Summary metrics</strong> — Total Members, Points Issued, Points Redeemed, and Active Members (Last 30 Days) are derived by fetching up to 500 customers and aggregating client-side. The backend should provide <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/loyalty/program</code> or a dedicated stats endpoint with <code className="rounded bg-[#fef3c7] px-1">total_members</code>, <code className="rounded bg-[#fef3c7] px-1">total_points_issued</code>, <code className="rounded bg-[#fef3c7] px-1">total_points_redeemed</code>, <code className="rounded bg-[#fef3c7] px-1">active_last_30_days</code>.
            </li>
            <li>
              <strong>Tier Configuration — Add/Edit</strong> — The &quot;+ Add Tier&quot; button and tier row &quot;Edit&quot; (MoreHorizontal) have no handlers. Tiers are only persisted when saving the full program; the backend should support tier CRUD or the UI needs handlers to add/edit tiers before save.
            </li>
            <li>
              <strong>Save Settings</strong> — <code className="rounded bg-[#fef3c7] px-1">PUT /v1/dashboard/loyalty/program</code> returns <code className="rounded bg-[#fef3c7] px-1">{`{"error":"server_error","message":"Internal server error"}`}</code> when clicking Save. The client sends <code className="rounded bg-[#fef3c7] px-1">is_active</code>, <code className="rounded bg-[#fef3c7] px-1">points_per_chf</code>, <code className="rounded bg-[#fef3c7] px-1">chf_per_point</code>, <code className="rounded bg-[#fef3c7] px-1">min_redeem_points</code>, <code className="rounded bg-[#fef3c7] px-1">max_redeem_percent</code>, <code className="rounded bg-[#fef3c7] px-1">expiry_days</code>, <code className="rounded bg-[#fef3c7] px-1">tiers</code>, and <code className="rounded bg-[#fef3c7] px-1">notifications</code> per the OpenAPI spec. The error appears to be backend-side.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Customers Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Customers list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/customers</code>), Customer detail (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/customers/[id]</code>), and Edit customer (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/customers/[id]/edit-customer</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Endpoints missing from Postman</strong> — POST (create), PUT (update), and POST /adjust (manual points) are used by the app but not in the collection (see above).
            </li>
            <li>
              <strong>GET customers query params</strong> — The list page uses <code className="rounded bg-[#fef3c7] px-1">search</code> and <code className="rounded bg-[#fef3c7] px-1">tier</code> filters. Postman only shows <code className="rounded bg-[#fef3c7] px-1">page</code> and <code className="rounded bg-[#fef3c7] px-1">limit</code>. Add <code className="rounded bg-[#fef3c7] px-1">search</code> and <code className="rounded bg-[#fef3c7] px-1">tier</code> to the collection if the API supports them.
            </li>
            <li>
              <strong>Currency / Spend display</strong> — Lifetime Spend is displayed with a hardcoded <code className="rounded bg-[#fef3c7] px-1">$</code> prefix. The API may need to return <code className="rounded bg-[#fef3c7] px-1">currency</code> or the UI should use the tenant&apos;s currency (e.g. CHF).
            </li>
            <li>
              <strong>Edit Customer — Loyalty Tier</strong> — The tier is displayed as read-only. The API does not support changing tier via the update endpoint; tier assignment would need a dedicated endpoint or the update payload to include <code className="rounded bg-[#fef3c7] px-1">tier</code>.
            </li>
            <li>
              <strong>Manual Points Adjustment</strong> — <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/loyalty/customers/{`{id}`}/adjust</code> is missing from Postman. When the adjust fails, the backend may return 500 or an error. The client sends <code className="rounded bg-[#fef3c7] px-1">{"{ points, description }"}</code> per the OpenAPI spec.
            </li>
            <li>
              <strong>Transaction History pagination</strong> — The backend should return <code className="rounded bg-[#fef3c7] px-1">pagination.total_pages</code> or <code className="rounded bg-[#fef3c7] px-1">has_more</code> in the transactions response for accurate pagination.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Users Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Users list (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/users</code>), Create user (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/users/create-user</code>), and Edit user (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/users/[id]/edit-user</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>name derivation</strong> — The users list displays <code className="rounded bg-[#fef3c7] px-1">name</code> or derives it from <code className="rounded bg-[#fef3c7] px-1">first_name</code> + <code className="rounded bg-[#fef3c7] px-1">last_name</code>. The <code className="rounded bg-[#fef3c7] px-1">/api/dashboard/users-table</code> route builds <code className="rounded bg-[#fef3c7] px-1">name</code> when missing. The backend should return <code className="rounded bg-[#fef3c7] px-1">name</code> or both first/last names in the users list response.
            </li>
            <li>
              <strong>Avatar URL</strong> — Edit user now supports <code className="rounded bg-[#fef3c7] px-1">avatar_url</code> via URL input (sent in PUT body). The backend should return and accept <code className="rounded bg-[#fef3c7] px-1">avatar_url</code>. File upload would require <code className="rounded bg-[#fef3c7] px-1">POST /users/{`{id}`}/avatar</code>.
            </li>
            <li>
              <strong>Edit User — Set new password</strong> — The &quot;Set new password&quot; button in Danger Zone now uses <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/users/{`{id}`}/reset-password</code> (missing from Postman). &quot;Send password reset link&quot; still shows a toast; a separate <code className="rounded bg-[#fef3c7] px-1">send-password-reset</code> endpoint would be needed for the email-link flow.
            </li>
            <li>
              <strong>Edit User — require_password_reset</strong> — The &quot;Require password reset on next login&quot; toggle is never populated from the API; it defaults to false. The backend should return <code className="rounded bg-[#fef3c7] px-1">require_password_reset</code> and support it in the update payload.
            </li>
          </ul>
        </div>

        <h2 className="mt-8 text-[20px] font-bold text-[#1a2029]">Settings Page</h2>
        <p className="mt-1 text-[14px] text-[#5f6875]">
          Global Settings (<code className="rounded bg-[#e5e7eb] px-1">/dashboard/settings</code>).
        </p>
        <div className="mt-3 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-4">
          <ul className="space-y-1.5 text-[13px] text-[#b45309]">
            <li>
              <strong>Company info fallback</strong> — The backend should always return settings from <code className="rounded bg-[#fef3c7] px-1">GET /v1/dashboard/settings</code>.
            </li>
            <li>
              <strong>Rounding rules &amp; decimal format</strong> — The Tax &amp; Currency card shows <code className="rounded bg-[#fef3c7] px-1">rounding</code> (0.05, 0.10, 0.01) and <code className="rounded bg-[#fef3c7] px-1">decimal_format</code> (comma/dot) from local defaults. These are not returned by the API and not sent on save. The backend should return and accept <code className="rounded bg-[#fef3c7] px-1">rounding</code> and <code className="rounded bg-[#fef3c7] px-1">decimal_format</code> in the settings schema.
            </li>
            <li>
              <strong>Receipt &amp; Printing settings</strong> — Print automatically, Email receipt, Kitchen printer routing, Idle screen timeout, Auto-refresh menu, and Maintenance mode are stored in local state only. The save handler does not send them to the API. The backend should return and accept <code className="rounded bg-[#fef3c7] px-1">print_automatically</code>, <code className="rounded bg-[#fef3c7] px-1">email_receipt</code>, <code className="rounded bg-[#fef3c7] px-1">kitchen_printer_id</code>, <code className="rounded bg-[#fef3c7] px-1">idle_screen_timeout</code>, <code className="rounded bg-[#fef3c7] px-1">auto_refresh_menu</code>, <code className="rounded bg-[#fef3c7] px-1">maintenance_mode</code>.
            </li>
            <li>
              <strong>Kitchen printer options</strong> — When terminals exist, options are derived from the terminals list. Otherwise the UI uses hardcoded &quot;Kitchen Printer #1/2/3&quot;. The backend should return <code className="rounded bg-[#fef3c7] px-1">kitchen_printers</code> or similar in settings, or the terminals list should indicate which support kitchen printing.
            </li>
            <li>
              <strong>Payment — terminal auto-close</strong> — The &quot;Terminal auto-close after payment (seconds)&quot; field is not sent in the settings update. The backend should accept <code className="rounded bg-[#fef3c7] px-1">terminal_auto_close</code> in the settings payload.
            </li>
            <li>
              <strong>Operational — order timeout</strong> — The &quot;Order timeout duration (seconds)&quot; field is not sent in the settings update. The backend should return and accept <code className="rounded bg-[#fef3c7] px-1">order_timeout</code>.
            </li>
            <li>
              <strong>System — allow price override &amp; debug logs</strong> — &quot;Allow price override at terminal&quot; and &quot;Enable debug logs&quot; are stored locally only; they are not returned by the API or sent on save. The backend should return and accept <code className="rounded bg-[#fef3c7] px-1">allow_price_override</code> and <code className="rounded bg-[#fef3c7] px-1">enable_debug_logs</code>.
            </li>
            <li>
              <strong>Logo upload</strong> — The logo upload calls <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/settings/logo</code> (missing from Postman). The backend should support logo upload and return <code className="rounded bg-[#fef3c7] px-1">logo_url</code> in the settings response.
            </li>
            <li>
              <strong>Reset Defaults</strong> — The &quot;Reset Defaults&quot; button resets all form state to hardcoded defaults locally; it does not call any API. If a true reset is needed, the backend could provide <code className="rounded bg-[#fef3c7] px-1">POST /v1/dashboard/settings/reset</code> or the UI could reload from the API.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
