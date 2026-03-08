"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const EXCLUDED_PATHS = new Set([
  "/",
  "/login",
  "/dashboard",
  "/dashboard/orders",
  "/dashboard/categories",
  "/dashboard/products",
  "/dashboard/extra-groups",
  "/dashboard/locations",
  "/dashboard/terminals",
  "/dashboard/customers",
  "/dashboard/users",
  "/dashboard/settings",
  "/dashboard/loyalty-program-settings",
  "/customers",
]);

function getFallback(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "dashboard" && segments[1]) return `/dashboard/${segments[1]}`;
  if (segments[0] === "categories") return "/dashboard/categories";
  if (segments[0] === "customer-details") return "/dashboard/customers";
  if (segments[0] === "customers") return "/customers";
  return "/dashboard";
}

function shouldShow(pathname: string): boolean {
  if (!pathname || EXCLUDED_PATHS.has(pathname)) return false;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.includes("create") || segments.includes("edit") || segments.includes("detail")) return true;
  if (segments.some((segment) => segment.startsWith("create-") || segment.startsWith("edit-"))) return true;
  if (segments.includes("order-detail")) return true;

  if (segments[0] === "dashboard" && segments[1] === "terminals" && segments.length >= 3) return true;
  if (segments[0] === "dashboard" && segments[1] === "customers" && segments.length >= 3) return true;
  if (segments[0] === "dashboard" && segments[1] === "users" && segments.length >= 4) return true;
  if (segments[0] === "categories" && segments.length >= 2) return true;
  if (segments[0] === "customer-details" && segments.length >= 2) return true;

  return segments.length >= 3;
}

export default function SubpageBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!shouldShow(pathname)) return null;

  const fallback = getFallback(pathname);
  return (
    <div className="px-4 pt-3 md:px-5">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(fallback);
        }}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[12px] font-semibold text-[#3f4653]"
      >
        <ArrowLeft size={14} />
        Back
      </button>
    </div>
  );
}
