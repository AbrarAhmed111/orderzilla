"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cloud, GripVertical, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";
import { proxiedImageSrc } from "@/lib/media-url";
import type { TerminalDisplayContent } from "@/lib/api/orderzilla-api";

type TerminalDetailDisplayContentPageProps = {
  id: string;
};

type ApiTerminal = { name?: string; location_name?: string };

type FeaturedItem = {
  id: string;
  label: string;
  type: "category" | "product";
};

function dedupeFeaturedById(items: FeaturedItem[]): FeaturedItem[] {
  const seen = new Set<string>();
  return items.filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
}

type ContentItem = {
  id: string;
  label: string;
  type: "banner" | "category";
  imageUrl?: string | null;
  bannerUrl?: string;
};

const DEFAULT_IDLE_LABEL = "Idle Screen";

const LANGUAGES = [
  { value: "en", label: "EN (English)" },
  { value: "de", label: "DE (German)" },
  { value: "fr", label: "FR (French)" },
];

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "brand", label: "Brand" },
];


export default function TerminalDetailDisplayContentPage({
  id,
}: TerminalDetailDisplayContentPageProps) {
  const [terminalName, setTerminalName] = useState("Kasse 1 Eingang");
  const [locationName, setLocationName] = useState("Filiale Zürich HB");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  // Idle Screen
  const [idleImageUrl, setIdleImageUrl] = useState<string | null>(null);
  const [idleContentLabel, setIdleContentLabel] = useState<string | null>(DEFAULT_IDLE_LABEL);
  const [idleAnimationEnabled, setIdleAnimationEnabled] = useState(true);
  const [idleTimeoutSeconds, setIdleTimeoutSeconds] = useState(120);

  // Promotions & Featured
  const [showFeaturedProducts, setShowFeaturedProducts] = useState(true);
  const [selectedFeatured, setSelectedFeatured] = useState<FeaturedItem[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [featuredOptions, setFeaturedOptions] = useState<FeaturedItem[]>([]);

  // Language & Theme
  const [multiLanguageEnabled, setMultiLanguageEnabled] = useState(true);
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("brand");
  const [accentColor, setAccentColor] = useState("#D0FE1D");

  const addFeatured = (item: FeaturedItem) => {
    setSelectedFeatured((prev) => {
      if (prev.some((f) => f.id === item.id)) return prev;
      return dedupeFeaturedById([...prev, item]);
    });
  };

  const removeFeatured = (itemId: string) => {
    setSelectedFeatured((prev) => prev.filter((f) => f.id !== itemId));
  };

  const moveContentItem = (index: number, direction: "up" | "down") => {
    setContentItems((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetToDefault = () => {
    setIdleImageUrl(null);
    setIdleContentLabel(DEFAULT_IDLE_LABEL);
    setIdleAnimationEnabled(true);
    setIdleTimeoutSeconds(120);
    setShowFeaturedProducts(true);
    setSelectedFeatured([]);
    setContentItems([]);
    setMultiLanguageEnabled(true);
    setLanguage("en");
    setTheme("brand");
    setAccentColor("#D0FE1D");
    toast.success("Reset to default.");
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);
      const featuredCatIds = [
        ...new Set(selectedFeatured.filter((f) => f.type === "category").map((f) => f.id.replace(/^cat-/, ""))),
      ];
      const featuredProdIds = [
        ...new Set(selectedFeatured.filter((f) => f.type === "product").map((f) => f.id.replace(/^prod-/, ""))),
      ];
      await orderzillaApi.dashboard.terminals.displayContent.update(id, {
        body: {
          idle_screen: {
            image_url: idleImageUrl ?? null,
            animation_enabled: idleAnimationEnabled,
            timeout_seconds: idleTimeoutSeconds,
          },
          show_featured_products: showFeaturedProducts,
          featured_categories: featuredCatIds,
          featured_products: featuredProdIds,
          content_items: contentItems.map((c) => ({ id: c.id, type: c.type, label: c.label, image_url: c.imageUrl, banner_url: c.bannerUrl })),
          multi_language_enabled: multiLanguageEnabled,
          language,
          theme,
          accent_color: accentColor,
        },
      });
      toast.success("Display content saved.");
    } catch {
      toast.error("Failed to save display content.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const [terminalRes, displayRes, categoriesRes, productsRes] = await Promise.all([
          orderzillaApi.dashboard.terminals.byId(id),
          orderzillaApi.dashboard.terminals.displayContent.get(id).catch(() => null),
          orderzillaApi.dashboard.categories.list().catch(() => null),
          orderzillaApi.dashboard.products.list().catch(() => null),
        ]);
        const terminal = terminalRes as ApiTerminal;
        setTerminalName(terminal?.name ?? `Terminal #${id.slice(-1)}`);
        setLocationName(terminal?.location_name ?? "Downtown Branch");

        const categories = (categoriesRes as { categories?: Array<{ id?: string; name?: string }> })?.categories ?? [];
        const products = (productsRes as { products?: Array<{ id?: string; name?: string }> })?.products ?? [];
        if (categories.length > 0 || products.length > 0) {
          const opts: FeaturedItem[] = dedupeFeaturedById([
            ...categories.map((c) => ({
              id: `cat-${c.id ?? ""}`,
              label: `${c.name ?? "Category"} (Cat)`,
              type: "category" as const,
            })),
            ...products.map((p) => ({
              id: `prod-${p.id ?? ""}`,
              label: `${p.name ?? "Product"} (Prod)`,
              type: "product" as const,
            })),
          ]).slice(0, 12);
          setFeaturedOptions(opts);
        } else {
          setFeaturedOptions([]);
        }

        const displayData = displayRes as TerminalDisplayContent | null;
        if (displayData && typeof displayData === "object") {
          const idle = displayData.idle_screen;
          if (idle) {
            setIdleImageUrl(idle.image_url ?? null);
            setIdleContentLabel((idle as { label?: string }).label ?? DEFAULT_IDLE_LABEL);
            setIdleAnimationEnabled(idle.animation_enabled ?? true);
            setIdleTimeoutSeconds(idle.timeout_seconds ?? 120);
          }
          setShowFeaturedProducts(displayData.show_featured_products ?? true);
          setMultiLanguageEnabled(displayData.multi_language_enabled ?? true);
          setLanguage(displayData.language ?? "en");
          setTheme(displayData.theme ?? "brand");
          setAccentColor(displayData.accent_color ?? "#D0FE1D");
          if (displayData.featured_categories?.length || displayData.featured_products?.length) {
            const feat: FeaturedItem[] = dedupeFeaturedById([
              ...(displayData.featured_categories ?? []).map((cid) => {
                const c = categories.find((x) => x.id === cid);
                return { id: `cat-${cid}`, label: `${c?.name ?? cid} (Cat)`, type: "category" as const };
              }),
              ...(displayData.featured_products ?? []).map((pid) => {
                const p = products.find((x) => x.id === pid);
                return { id: `prod-${pid}`, label: `${p?.name ?? pid} (Prod)`, type: "product" as const };
              }),
            ]);
            setSelectedFeatured(feat.length > 0 ? feat : []);
          } else {
            setSelectedFeatured([]);
          }
          if (displayData.content_items && Array.isArray(displayData.content_items) && displayData.content_items.length > 0) {
            setContentItems(
              (displayData.content_items as ContentItem[]).map((c) => ({
                id: c.id ?? "",
                label: c.label ?? "",
                type: (c.type as "banner" | "category") ?? "banner",
                imageUrl: c.imageUrl ?? null,
                bannerUrl: c.bannerUrl,
              })),
            );
          } else {
            setContentItems([]);
          }
        } else {
          setIdleContentLabel(DEFAULT_IDLE_LABEL);
          setContentItems([]);
          setSelectedFeatured([]);
        }
      } catch {
        toast.error("Failed to load terminal.");
        setTerminalName(`Terminal #${id.slice(-1)}`);
        setLocationName("-");
        setIdleContentLabel(DEFAULT_IDLE_LABEL);
        setContentItems([]);
        setSelectedFeatured([]);
        setFeaturedOptions([]);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  // Close add dropdown on outside click
  useEffect(() => {
    if (!addDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addDropdownOpen]);

  const finalFeatured = useMemo(() => dedupeFeaturedById(selectedFeatured), [selectedFeatured]);
  const finalContent = contentItems;

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="text-[14px] text-[#7a8291]">
              <Link href="/dashboard/terminals" className="hover:text-[#2f3743]">
                Locations
              </Link>
              <span className="mx-1">/</span>
              <span className="font-semibold text-[#2f3743]">{locationName}</span>
              <span className="mx-1">/</span>
              <span>{terminalName}</span>
            </nav>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {terminalName} Detail
            </h1>
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
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={saveChanges}
              disabled={isSaving}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="h-10 rounded-lg border border-[#e5e7eb] bg-white px-4 text-[14px] font-semibold text-[#414855] hover:bg-[#f9fafb]"
            >
              Reset to Default
            </button>
          </div>
        </div>


        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-4">
            {/* Idle Screen */}
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Idle Screen</h2>
              <div className="mt-4 space-y-4">
                <div
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] py-12 text-center cursor-pointer hover:border-[#9ca3af] hover:bg-[#f3f4f6] transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file?.type.startsWith("image/") || file?.type.startsWith("video/")) {
                      setIdleImageUrl(URL.createObjectURL(file));
                      setIdleContentLabel(file.name.replace(/\.[^/.]+$/, "") || DEFAULT_IDLE_LABEL);
                    }
                  }}
                  onClick={() => document.getElementById("idle-upload")?.click()}
                >
                  <input
                    id="idle-upload"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIdleImageUrl(URL.createObjectURL(file));
                        setIdleContentLabel(file.name.replace(/\.[^/.]+$/, "") || DEFAULT_IDLE_LABEL);
                      }
                    }}
                  />
                  <Cloud size={40} className="text-[#9ca3af] mb-2" />
                  <p className="text-[14px] text-[#6b7280]">
                    Drag and drop an image/video here, or click to browse
                  </p>
                </div>
                {(idleImageUrl || idleContentLabel) && (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-[#d4ff00] px-3 py-1 text-[12px] font-semibold text-[#1d2512]">
                      {idleContentLabel ?? DEFAULT_IDLE_LABEL}
                    </span>
                    <button
                      type="button"
                      onClick={() => document.getElementById("idle-upload")?.click()}
                      className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[13px] font-semibold text-[#414855] hover:bg-[#f9fafb]"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIdleImageUrl(null);
                        setIdleContentLabel(null);
                      }}
                      className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[13px] font-semibold text-[#414855] hover:bg-[#f9fafb]"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">Enable idle animation</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={idleAnimationEnabled}
                    onClick={() => setIdleAnimationEnabled((v) => !v)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      idleAnimationEnabled ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        idleAnimationEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">
                    Timeout before idle (seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={idleTimeoutSeconds}
                    onChange={(e) => setIdleTimeoutSeconds(Number(e.target.value) || 120)}
                    className="h-10 w-32 rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  />
                </div>
              </div>
            </article>

            {/* Promotions & Featured Content */}
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Promotions & Featured Content</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">Show featured products</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showFeaturedProducts}
                    onClick={() => setShowFeaturedProducts((v) => !v)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      showFeaturedProducts ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        showFeaturedProducts ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-2">
                    Choose featured categories/products
                  </label>
                  <div className="flex flex-wrap items-center gap-2 min-h-[40px] rounded-lg border border-[#e4e6ea] bg-white px-3 py-2">
                    {finalFeatured.map((item, fIdx) => (
                      <span
                        key={`featured-chip-${item.id}-${fIdx}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#f0f4e8] px-2.5 py-1 text-[12px] font-medium text-[#1d2512]"
                      >
                        {item.label}
                        <button
                          type="button"
                          onClick={() => removeFeatured(item.id)}
                          className="p-0.5 hover:bg-[#d4ff00]/30 rounded"
                          aria-label={`Remove ${item.label}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <div className="relative" ref={addDropdownRef}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#e4e6ea] bg-white px-3 py-1.5 text-[13px] font-medium text-[#414855] hover:bg-[#f9fafb]"
                        onClick={() => setAddDropdownOpen((v) => !v)}
                      >
                        Add...
                        <ChevronDown size={14} className={`text-[#6b7280] transition-transform ${addDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {addDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1 z-10 min-w-[180px] rounded-lg border border-[#e4e6ea] bg-white py-1 shadow-lg">
                          {featuredOptions
                            .filter((o) => !finalFeatured.some((f) => f.id === o.id))
                            .map((o, optIdx) => (
                              <button
                                key={`add-dropdown-${o.type}-${o.id}-i${optIdx}`}
                                type="button"
                                className="block w-full text-left px-3 py-2 text-[13px] hover:bg-[#f9fafb]"
                                onClick={() => {
                                  addFeatured(o);
                                  setAddDropdownOpen(false);
                                }}
                              >
                                {o.label}
                              </button>
                            ))}
                          {featuredOptions.filter((o) => !finalFeatured.some((f) => f.id === o.id)).length === 0 && (
                            <p className="px-3 py-2 text-[12px] text-[#9ca3af]">All added</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#363f4c] mb-2">Content order</p>
                  <div className="space-y-2">
                    {finalContent.map((item, index) => (
                      <div
                        key={`content-order-${item.id || "row"}-${index}`}
                        className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2"
                      >
                        <GripVertical size={18} className="text-[#9ca3af] shrink-0 cursor-grab" />
                        <span className="inline-flex items-center rounded-full bg-[#d4ff00] px-2.5 py-0.5 text-[11px] font-semibold text-[#1d2512] shrink-0">
                          {item.type === "banner" ? "Summer Special" : item.label}
                        </span>
                        <span className="flex-1 text-[13px] font-medium text-[#2f3743] truncate min-w-0">
                          {item.label}
                        </span>
                        {item.bannerUrl && (
                          <span className="text-[11px] text-[#6b7280] truncate max-w-[140px]">
                            {item.bannerUrl}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            {/* Language & Theme */}
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Language & Theme</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#363f4c]">Enable multi-language</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={multiLanguageEnabled}
                    onClick={() => setMultiLanguageEnabled((v) => !v)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      multiLanguageEnabled ? "bg-[#d4ff00]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        multiLanguageEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Language</label>
                  <SelectMenu
                    value={language}
                    onChange={setLanguage}
                    options={LANGUAGES}
                    className="w-full max-w-[200px]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-2">Theme</label>
                  <div className="flex gap-4">
                    {THEMES.map((t) => (
                      <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="theme"
                          value={t.value}
                          checked={theme === t.value}
                          onChange={() => setTheme(t.value)}
                          className="h-4 w-4"
                        />
                        <span className="text-[14px] font-medium text-[#2f3743]">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold text-[#363f4c] mb-1">Accent color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-14 rounded border border-[#e5e7eb] cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-28 rounded-lg border border-[#dfe3e8] px-3 text-[14px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Live Kiosk Preview */}
          <div className="xl:sticky xl:top-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Live Kiosk Preview</h2>
              <p className="mt-1 text-[12px] text-[#6b7280]">
                Reflects your current settings in real time
              </p>
              <div
                className={`mt-4 rounded-2xl border-4 overflow-hidden min-h-[420px] flex flex-col ${
                  theme === "dark"
                    ? "border-[#374151] bg-[#1f2937]"
                    : theme === "brand"
                      ? "border-[#e5e7eb]"
                      : "border-[#e5e7eb] bg-[#f9fafb]"
                }`}
                style={theme === "brand" ? { backgroundColor: `${accentColor}15` } : undefined}
              >
                {/* Kiosk header */}
                <div
                  className={`px-4 py-3 text-center shrink-0 ${
                    theme === "dark" ? "bg-[#111827]" : "bg-white border-b border-[#e5e7eb]"
                  }`}
                >
                  <p
                    className={`text-[12px] font-bold ${theme === "dark" ? "text-white" : "text-[#1a2029]"}`}
                  >
                    ORDERZILLA
                  </p>
                  <p className={`text-[10px] ${theme === "dark" ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                    {multiLanguageEnabled
                      ? `${LANGUAGES.find((l) => l.value === language)?.label ?? language} · Touch to order`
                      : "Welcome! Touch to order."}
                  </p>
                </div>

                {/* Idle screen / promo banner */}
                <div
                  className="relative h-16 shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: accentColor }}
                >
                  {idleImageUrl ? (
                    <img
                      src={proxiedImageSrc(idleImageUrl) ?? idleImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-90"
                    />
                  ) : null}
                  <span
                    className="relative z-10 font-bold text-[14px] text-white drop-shadow-md px-2 text-center"
                    style={{
                      textShadow: idleImageUrl ? "0 1px 2px rgba(0,0,0,0.5)" : undefined,
                    }}
                  >
                    {idleContentLabel ?? DEFAULT_IDLE_LABEL}
                  </span>
                </div>

                {/* Featured categories/products (when enabled) */}
                {showFeaturedProducts && finalFeatured.length > 0 && (
                  <div className="px-3 py-2 flex gap-2 overflow-x-auto shrink-0">
                    {finalFeatured.map((item, fIdx) => (
                      <div
                        key={`preview-featured-${item.id}-${fIdx}`}
                        className={`shrink-0 rounded-lg px-3 py-2 min-w-[72px] text-center cursor-pointer transition-colors ${
                          theme === "dark"
                            ? "bg-[#374151] hover:bg-[#4b5563]"
                            : "bg-white border border-[#e5e7eb] hover:bg-[#f9fafb]"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold truncate ${
                            theme === "dark" ? "text-white" : "text-[#2f3743]"
                          }`}
                        >
                          {item.label.replace(/\s*\(Cat\)|\s*\(Prod\)/i, "")}
                        </p>
                        <p className={`text-[9px] mt-0.5 ${theme === "dark" ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                          {item.type === "category" ? "Category" : "Product"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content items (banners, etc.) */}
                {finalContent.length > 0 && (
                  <div className="px-3 py-2 space-y-1.5 flex-1 overflow-y-auto">
                    {finalContent.map((item, cIdx) => (
                      <div
                        key={`preview-content-${item.id || "row"}-${cIdx}`}
                        className={`rounded-lg px-3 py-2 flex items-center gap-2 ${
                          item.type === "banner"
                            ? ""
                            : theme === "dark"
                              ? "bg-[#374151]"
                              : "bg-white border border-[#e5e7eb]"
                        }`}
                        style={
                          item.type === "banner"
                            ? { backgroundColor: accentColor, color: "white" }
                            : undefined
                        }
                      >
                        <span className="text-[11px] font-semibold truncate flex-1 min-w-0">
                          {item.label}
                        </span>
                        {item.type === "banner" && (
                          <span className="text-[9px] opacity-90 shrink-0">Banner</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state when no featured and no content */}
                {(!showFeaturedProducts || finalFeatured.length === 0) && finalContent.length === 0 && (
                  <div
                    className={`flex-1 flex items-center justify-center px-4 ${
                      theme === "dark" ? "text-[#6b7280]" : "text-[#9ca3af]"
                    }`}
                  >
                    <p className="text-[12px] text-center">
                      Add featured items or content above to see them here
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div
                  className={`p-3 shrink-0 flex gap-2 ${
                    theme === "dark" ? "border-t border-[#374151]" : "border-t border-[#e5e7eb]"
                  }`}
                >
                  <button
                    type="button"
                    className={`flex-1 h-9 rounded-lg text-[12px] font-semibold ${
                      theme === "dark"
                        ? "bg-[#374151] text-[#e5e7eb]"
                        : "border border-[#e5e7eb] bg-white text-[#414855]"
                    }`}
                  >
                    Brand
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-9 rounded-lg text-[12px] font-semibold text-[#1d2512]"
                    style={{ backgroundColor: accentColor }}
                  >
                    Add to order
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
