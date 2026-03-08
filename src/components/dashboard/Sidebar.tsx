"use client";

import {
  AlertCircle,
  ChevronDown,
  Home,
  Layers,
  ListChecks,
  MapPin,
  Monitor,
  Package,
  Settings,
  ShoppingCart,
  UserCircle2,
  Users,
  Heart,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clientSignout } from "@/lib/auth/signout";
import { orderzillaApi } from "@/lib/api/orderzilla-api";

type NavItem = {
  label: string;
  icon: LucideIcon;
  badge?: string;
  href?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "ANALYTICS",
    items: [{ label: "Dashboard", icon: Home, href: "/dashboard" }],
  },
  {
    title: "OPERATIONS",
    items: [{ label: "Orders", icon: ShoppingCart, href: "/dashboard/orders" }],
  },
  {
    title: "MENU",
    items: [
      { label: "Categories", icon: Layers, href: "/dashboard/categories" },
      { label: "Products", icon: Package, href: "/dashboard/products" },
      { label: "Extra Groups", icon: ListChecks, href: "/dashboard/extra-groups" },
    ],
  },
  {
    title: "INFRASTRUCTURE",
    items: [
      { label: "Locations", icon: MapPin, href: "/dashboard/locations" },
      { label: "Terminals", icon: Monitor, href: "/dashboard/terminals" },
    ],
  },
  {
    title: "LOYALTY",
    items: [
      { label: "Program", icon: Heart, href: "/dashboard/loyalty-program-settings" },
      { label: "Customers", icon: Users, href: "/customers" },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { label: "Users", icon: UserCircle2, href: "/dashboard/users" },
      { label: "Settings", icon: Settings, href: "/dashboard/settings" },
      { label: "Endpoints Missing", icon: AlertCircle, href: "/dashboard/endpoints-missing" },
    ],
  },
];

type MeResponse = {
  userId?: string;
  orgId?: string;
  email?: string;
  role?: string;
  name?: string;
};

function formatRole(role?: string): string {
  if (!role) return "User";
  const r = role.toUpperCase();
  if (r === "OWNER") return "Owner";
  if (r === "ADMIN") return "Admin";
  if (r === "MANAGER") return "Manager";
  if (r === "VIEWER") return "Viewer";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [userSubtitle, setUserSubtitle] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      sections.reduce<Record<string, boolean>>((acc, section) => {
        acc[section.title] = true;
        return acc;
      }, {}),
  );

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setIsLoadingUser(true);
        const me = (await orderzillaApi.oauth.me()) as MeResponse | null | undefined;
        const name = me?.name?.trim();
        const email = me?.email?.trim();
        const role = me?.role;
        setUserName(name || email || "User");
        setUserSubtitle(name && email ? email : (role ? formatRole(role) : "User"));
      } catch {
        setUserName("User");
        setUserSubtitle("User");
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadCurrentUser();
  }, []);

  const initials = (userName || "User")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/categories") {
      return pathname.startsWith("/dashboard/categories") || pathname.startsWith("/categories");
    }
    if (href === "/customers") {
      return (
        pathname.startsWith("/customers") ||
        pathname.startsWith("/dashboard/customers") ||
        pathname.startsWith("/customer-details")
      );
    }
    if (href === "/dashboard/loyalty-program-settings") {
      return pathname.startsWith("/dashboard/loyalty-program-settings");
    }
    if (href === "/dashboard/locations") {
      return pathname.startsWith("/dashboard/locations");
    }
    return pathname.startsWith(href);
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside className="sticky top-0 h-screen w-[255px] border-r border-[#e6e7ea] bg-gradient-to-b from-[#f9fafb] to-[#f6f8fb] px-4 py-4 flex flex-col">
      <div className="px-2 pb-4 border-b border-[#e9edf3]">
        <h1 className="text-[32px] leading-none font-extrabold tracking-tight text-[#151a22]">
          ORDERZILLA
        </h1>
      </div>

      <nav className="mt-3 flex-1 min-h-0 space-y-3 overflow-y-auto no-scroll pr-1">
        {sections.map((section) => (
          <div key={section.title}>
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              className="mb-1 w-full px-2 flex items-center justify-between text-[11px] font-semibold tracking-wide text-[#8a8f99] hover:text-[#66707d]"
            >
              <span>{section.title}</span>
              <ChevronDown
                size={13}
                className={clsx(
                  "transition-transform duration-200",
                  openSections[section.title] ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            {openSections[section.title] && (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      href={item.href ?? "#"}
                      key={`${section.title}-${item.label}`}
                      className={clsx(
                        "group relative w-full rounded-lg px-2 py-1.5 flex items-center justify-between text-left transition",
                        active
                          ? "bg-[#ebf7bf] text-[#364013] shadow-[inset_0_0_0_1px_rgba(192,235,26,0.45)]"
                          : "hover:bg-[#f0f2f5] text-[#2f343b]",
                      )}
                    >
                      <span
                        className={clsx(
                          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full transition-opacity",
                          active ? "bg-[#c0eb1a] opacity-100" : "opacity-0 group-hover:opacity-60",
                        )}
                      />
                      <span className="flex items-center gap-2 text-[14px] font-medium">
                        <Icon size={15} className={active ? "text-[#4d5f14]" : "text-[#6d7582]"} />
                        {item.label}
                      </span>
                      {!!item.badge && (
                        <span className="rounded-full bg-[#e24958] px-1.5 py-0.5 text-[10px] leading-none text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-3 shrink-0 rounded-2xl border border-[#e7ebf1] bg-white p-2.5 flex items-center gap-2 shadow-[0_1px_2px_rgba(18,22,31,0.06)]">
        <div className="h-10 w-10 rounded-full bg-[#ffd89a] flex items-center justify-center text-[#7b5423] font-semibold ring-2 ring-[#fff5d9] shrink-0">
          {initials || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1d222a] leading-tight truncate">
            {isLoadingUser ? "Loading…" : userName || "User"}
          </p>
          <p className="text-[11px] text-[#8a8f99] leading-tight truncate">
            {isLoadingUser ? "" : userSubtitle || "User"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clientSignout();
          }}
          className="rounded-md border border-[#dfe3e8] px-2 py-1 text-[11px] font-semibold text-[#5f6875] hover:bg-[#f5f7fa]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

