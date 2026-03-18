"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Trash2, UploadCloud } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type ApiCategory = components["schemas"]["Category"];
type ApiLocation = components["schemas"]["Location"];
type ApiTerminal = components["schemas"]["Terminal"];
type ApiPrice = components["schemas"]["Price"];
type ApiExtraGroup = components["schemas"]["ExtraGroup"];

type PriceDraft = {
  localId: string;
  priceId: string;
  mode: "INDOOR" | "TAKEAWAY" | "BOTH";
  price: string;
  currency: string;
  location_id: string;
  terminal_id: string;
  valid_from: string;
  valid_until: string;
};

type ProductVariant = {
  id: string;
  size: string;
  price: string;
  sku: string;
  isDefault: boolean;
};

const COLOR_TAGS = [
  { value: "red", color: "bg-red-500" },
  { value: "blue", color: "bg-blue-500" },
  { value: "green", color: "bg-green-500" },
  { value: "yellow", color: "bg-yellow-400" },
  { value: "none", color: "border-2 border-[#d4ff00]" },
];

const toDateInputValue = (value?: string | null) => {
  if (value == null || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const createPriceDraft = (overrides?: Partial<PriceDraft>): PriceDraft => ({
  localId: crypto.randomUUID(),
  priceId: "",
  mode: "BOTH",
  price: "",
  currency: "CHF",
  location_id: "",
  terminal_id: "",
  valid_from: "",
  valid_until: "",
  ...overrides,
});

const mapApiPrice = (price: ApiPrice): PriceDraft => ({
  localId: crypto.randomUUID(),
  priceId: String(price.id ?? ""),
  mode:
    price.mode === "INDOOR" || price.mode === "TAKEAWAY" || price.mode === "BOTH"
      ? price.mode
      : "BOTH",
  price: String(price.price ?? ""),
  currency: String(price.currency ?? "CHF"),
  location_id: price.location_id != null ? String(price.location_id) : "",
  terminal_id: price.terminal_id != null ? String(price.terminal_id) : "",
  valid_from: toDateInputValue(price.valid_from),
  valid_until: toDateInputValue(price.valid_until),
});

const TABS = ["General", "Pricing", "Availability", "Modifiers", "Advanced"] as const;
const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_STR_TO_FORM_INDEX: Record<string, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

function parseAvailabilityDays(raw: (string | number)[] | null | undefined): number[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [0, 1, 2, 3, 4, 5, 6];
  const formIndices = raw
    .map((d) => {
      if (typeof d === "number") {
        return d === 0 ? 6 : d - 1;
      }
      const key = typeof d === "string" ? d.toLowerCase().slice(0, 3) : "";
      return DAY_STR_TO_FORM_INDEX[key] ?? -1;
    })
    .filter((i) => i >= 0);
  return formIndices.length > 0 ? [...new Set(formIndices)].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
}

function toTimeInput(hms: string | null | undefined, defaultVal: string): string {
  if (!hms || typeof hms !== "string") return defaultVal;
  const parts = hms.trim().split(":");
  const h = (parts[0] ?? "0").padStart(2, "0");
  const m = (parts[1] ?? "0").padStart(2, "0");
  return `${h}:${m}`;
}
const TAB_VALUES = TABS.map((t) => t.toLowerCase());

function parseTabParam(value: string | null): (typeof TABS)[number] {
  const v = (value ?? "").toLowerCase();
  const idx = TAB_VALUES.indexOf(v);
  return idx >= 0 ? TABS[idx] : "General";
}

export default function EditProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const productId = searchParams.get("id") ?? "";
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(() =>
    parseTabParam(tabParam),
  );
  const [name, setName] = useState("");
  const [internalName, setInternalName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxRate, setTaxRate] = useState<number | "">(8.1);
  const [sortOrder, setSortOrder] = useState<number | "">(1);
  const [visibleInPos, setVisibleInPos] = useState(true);
  const [featured, setFeatured] = useState(true);
  const [colorTag, setColorTag] = useState("none");
  const [productType, setProductType] = useState<"standard" | "variant" | "combo">("standard");
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [prices, setPrices] = useState<PriceDraft[]>([createPriceDraft()]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [terminals, setTerminals] = useState<ApiTerminal[]>([]);
  const [extraGroups, setExtraGroups] = useState<ApiExtraGroup[]>([]);
  const [selectedExtraGroupIds, setSelectedExtraGroupIds] = useState<string[]>([]);
  const [initialExtraGroupIds, setInitialExtraGroupIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"always" | "scheduled">("always");
  const [availabilityDays, setAvailabilityDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [availabilityLocationIds, setAvailabilityLocationIds] = useState<string[]>([]);
  const [barcode, setBarcode] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [allergenInput, setAllergenInput] = useState("");
  const [nutritional, setNutritional] = useState({ calories: "", protein: "", fat: "", carbs: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const displayName = name || EMPTY_VALUE;
  const displayPrice = prices[0]?.price || "";
  const displaySku = sku || EMPTY_VALUE;

  const fetchData = async () => {
    if (!productId) {
      setError("Product id is missing.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const [
        product,
        categoriesRes,
        locationsRes,
        terminalsRes,
        pricesRes,
        linkedExtrasRes,
        extrasRes,
        variantsRes,
        availabilityRes,
        advancedRes,
      ] = await Promise.all([
        orderzillaApi.dashboard.products.byId(productId),
        orderzillaApi.dashboard.categories.list(),
        orderzillaApi.dashboard.locations.list(),
        orderzillaApi.dashboard.terminals.list(),
        orderzillaApi.dashboard.products.prices.list(productId).catch(() => ({ prices: [] })),
        orderzillaApi.dashboard.products.extras.list(productId).catch(() => ({ extra_groups: [] })),
        orderzillaApi.dashboard.extras.list().catch(() => ({ extra_groups: [] })),
        orderzillaApi.dashboard.products.variants.list(productId).catch(() => ({ variants: [] })),
        orderzillaApi.dashboard.products.availability.get(productId).catch(() => null),
        orderzillaApi.dashboard.products.advanced.get(productId).catch(() => null),
      ]);

      setName(typeof product?.name === "string" ? product.name : "");
      const trans = product?.translations as Record<string, { description?: string }> | undefined;
      const desc =
        product?.description ?? trans?.de?.description ?? trans?.en?.description ?? "";
      setDescription(typeof desc === "string" ? desc : "");
      setSku(typeof product?.sku === "string" ? product.sku : String(product?.sku ?? ""));
      setCategoryId(
        product?.category_id != null ? String(product.category_id) : "",
      );
      setTaxRate(product?.tax_rate != null ? Number(product.tax_rate) || 8.1 : 8.1);
      setSortOrder(product?.sort_order ?? 1);
      setImageUrl(
        typeof product?.image_url === "string" ? product.image_url : "",
      );
      const intName = (product as { internal_name?: string })?.internal_name;
      setInternalName(typeof intName === "string" ? intName : "");
      setVisibleInPos((product as { visible_in_pos?: boolean })?.visible_in_pos ?? true);
      setFeatured((product as { featured?: boolean })?.featured ?? true);
      setColorTag((product as { color_tag?: string })?.color_tag ?? "none");
      const pt = (product as { product_type?: string })?.product_type;
      setProductType(
        pt === "variant" || pt === "combo" ? pt : "standard",
      );
      const apiVariants = (variantsRes?.variants ?? []) as Array<{ id?: string; name?: string; sku?: string; price?: number | string; is_default?: boolean }>;
      setVariants(
        apiVariants.length > 0
          ? apiVariants.map((v, i) => ({
              id: String(v.id ?? `v${i}`),
              size: String(v.name ?? ""),
              price: String(v.price ?? ""),
              sku: String(v.sku ?? ""),
              isDefault: v.is_default ?? i === 0,
            }))
          : [],
      );

      const priceRows = (pricesRes?.prices ?? []) as ApiPrice[];
      const basePrice = (product as { base_price?: string | number })?.base_price;
      setPrices(
        priceRows.length
          ? priceRows.map(mapApiPrice)
          : [createPriceDraft(basePrice != null ? { price: String(basePrice) } : undefined)],
      );

      setCategories((categoriesRes?.categories ?? []) as ApiCategory[]);
      setLocations((locationsRes?.locations ?? []) as ApiLocation[]);
      setTerminals((terminalsRes?.terminals ?? []) as ApiTerminal[]);
      setExtraGroups((extrasRes?.extra_groups ?? []) as ApiExtraGroup[]);

      const linked = ((linkedExtrasRes?.extra_groups ?? []) as ApiExtraGroup[])
        .map((group) => group.id)
        .filter((id): id is string => id != null && id !== "")
        .map((id) => String(id));
      setSelectedExtraGroupIds(linked);
      setInitialExtraGroupIds(linked);

      if (availabilityRes) {
        setAvailability(availabilityRes.availability === "scheduled" ? "scheduled" : "always");
        setAvailabilityDays(parseAvailabilityDays(availabilityRes.availability_days));
        setAvailabilityStart(toTimeInput(availabilityRes.availability_start, "00:00"));
        setAvailabilityEnd(toTimeInput(availabilityRes.availability_end, "23:59"));
        setAvailabilityLocationIds(
          Array.isArray(availabilityRes.location_ids)
            ? availabilityRes.location_ids.map((id) => String(id))
            : [],
        );
      }

      if (advancedRes) {
        setBarcode(typeof advancedRes.barcode === "string" ? advancedRes.barcode : "");
        setAllergens(
          Array.isArray(advancedRes.allergens)
            ? advancedRes.allergens.filter((a): a is string => typeof a === "string")
            : [],
        );
        const nut = advancedRes.nutritional;
        setNutritional({
          calories: nut?.calories != null ? String(nut.calories) : "",
          protein: nut?.protein != null ? String(nut.protein) : "",
          fat: nut?.fat != null ? String(nut.fat) : "",
          carbs: nut?.carbs != null ? String(nut.carbs) : "",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load product. ${msg}`);
      console.error("EditProduct fetchData error:", err);
      setName("");
      setSku("");
      setDescription("");
      setSortOrder(0);
      setVariants([]);
      setCategoryId("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  useEffect(() => {
    setActiveTab(parseTabParam(tabParam));
  }, [tabParam]);

  const setTab = (tab: (typeof TABS)[number]) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "General") {
      params.delete("tab");
    } else {
      params.set("tab", tab.toLowerCase());
    }
    router.replace(`/dashboard/products/edit-product?${params.toString()}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const updatePrice = <K extends keyof PriceDraft>(localId: string, key: K, value: PriceDraft[K]) => {
    setPrices((prev) => prev.map((row) => (row.localId === localId ? { ...row, [key]: value } : row)));
  };

  const removePrice = async (row: PriceDraft) => {
    if (prices.length <= 1) return;
    setPrices((prev) => prev.filter((item) => item.localId !== row.localId));
    if (row.priceId && productId) {
      try {
        await orderzillaApi.dashboard.products.prices.remove(productId, row.priceId);
        toast.success("Price removed.");
      } catch {
        toast.error("Price removed from form. Save may be needed to sync with server.");
      }
    }
  };

  const setVariantDefault = (variantId: string) => {
    setVariants((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === variantId })),
    );
  };

  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantSku, setNewVariantSku] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newVariantDefault, setNewVariantDefault] = useState(false);
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  const addVariant = async () => {
    if (!productId || !newVariantName.trim()) return;
    const priceVal = Number(newVariantPrice);
    if (!Number.isFinite(priceVal) || priceVal < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    try {
      setIsAddingVariant(true);
      const created = await orderzillaApi.dashboard.products.variants.create(productId, {
        body: {
          name: newVariantName.trim(),
          sku: newVariantSku.trim() || undefined,
          price: priceVal,
          is_default: newVariantDefault,
          sort_order: variants.length,
        },
      });
      setVariants((prev) => [
        ...prev,
        {
          id: created?.id ?? crypto.randomUUID(),
          size: newVariantName.trim(),
          price: newVariantPrice,
          sku: newVariantSku.trim(),
          isDefault: newVariantDefault,
        },
      ]);
      setNewVariantName("");
      setNewVariantSku("");
      setNewVariantPrice("");
      setNewVariantDefault(false);
      setIsAddVariantOpen(false);
      toast.success("Variant added.");
    } catch {
      toast.error("Failed to add variant.");
    } finally {
      setIsAddingVariant(false);
    }
  };

  const nameError = validateField(name || displayName, [
    { type: "required", message: "Product name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const hasValidPrice = prices.some((p) => p.price.trim().length > 0) || displayPrice;
  const isFormValid = !nameError && (hasValidPrice || !!displayPrice);

  const saveProduct = async () => {
    const effectiveName = (name || displayName).trim();
    if (!productId || !effectiveName) return;

    const validPrices = prices.filter((p) => p.price.trim().length > 0);
    if (validPrices.length === 0 && displayPrice) {
      validPrices.push({
        ...createPriceDraft(),
        price: displayPrice,
        currency: "CHF",
      });
    }

    try {
      setIsSaving(true);

      await orderzillaApi.dashboard.products.update(productId, {
        body: {
          name: effectiveName,
          internal_name: internalName.trim() || undefined,
          description: (description || "").trim() || undefined,
          sku: (sku || displaySku).trim() || undefined,
          category_id: categoryId?.trim() ? categoryId : undefined,
          tax_rate: taxRate === "" ? undefined : Number(taxRate),
          sort_order: sortOrder === "" ? undefined : Number(sortOrder),
          visible_in_pos: visibleInPos,
          featured,
          color_tag: colorTag === "none" ? undefined : colorTag || undefined,
          product_type: productType,
          translations: (description || "").trim()
            ? {
                de: { name: effectiveName, description: (description || "").trim() },
                en: { name: effectiveName, description: (description || "").trim() },
              }
            : undefined,
        },
      });

      if (validPrices.length > 0) {
        await orderzillaApi.dashboard.products.prices.upsert(productId, {
          body: {
            prices: validPrices.map((price) => ({
              mode: price.mode,
              price: price.price.trim(),
              currency: price.currency.trim() || "CHF",
              location_id: price.location_id || null,
              terminal_id: price.terminal_id || null,
              valid_from: price.valid_from || null,
              valid_until: price.valid_until || null,
            })),
          },
        });
      }

      const toAttach = selectedExtraGroupIds.filter((id) => !initialExtraGroupIds.includes(id));
      const toDetach = initialExtraGroupIds.filter((id) => !selectedExtraGroupIds.includes(id));

      if (toAttach.length > 0) {
        await Promise.all(
          toAttach.map((groupId, index) =>
            orderzillaApi.dashboard.products.extras.attach(productId, {
              body: { extra_group_id: groupId, sort_order: index },
            }),
          ),
        );
      }

      if (toDetach.length > 0) {
        await Promise.all(
          toDetach.map((groupId) =>
            orderzillaApi.dashboard.products.extras.detach(productId, groupId),
          ),
        );
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        await orderzillaApi.dashboard.products.uploadImage(productId, {
          body: formData as never,
        });
      }

      await orderzillaApi.dashboard.products.availability.update(productId, {
        availability,
        availability_days: availability === "scheduled" ? availabilityDays.map((d) => (d === 6 ? 0 : d + 1)) : undefined,
        availability_start: availability === "scheduled" && availabilityStart ? `${availabilityStart}:00` : undefined,
        availability_end: availability === "scheduled" && availabilityEnd ? `${availabilityEnd}:00` : undefined,
        location_ids: availability === "scheduled" && availabilityLocationIds.length > 0 ? availabilityLocationIds : undefined,
      });

      const cal = Number(nutritional.calories);
      const prot = Number(nutritional.protein);
      const fatVal = Number(nutritional.fat);
      const carbsVal = Number(nutritional.carbs);
      await orderzillaApi.dashboard.products.advanced.update(productId, {
        barcode: barcode.trim() || undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional:
          Number.isFinite(cal) || Number.isFinite(prot) || Number.isFinite(fatVal) || Number.isFinite(carbsVal)
            ? {
                calories: Number.isFinite(cal) ? cal : undefined,
                protein: Number.isFinite(prot) ? prot : undefined,
                fat: Number.isFinite(fatVal) ? fatVal : undefined,
                carbs: Number.isFinite(carbsVal) ? carbsVal : undefined,
              }
            : undefined,
      });

      toast.success("Product updated successfully.");
      router.push("/dashboard/products");
    } catch {
      toast.error("Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!productId) return;
    if (!window.confirm("Delete this product?")) return;
    try {
      setIsDeleting(true);
      await orderzillaApi.dashboard.products.remove(productId);
      toast.success("Product deleted.");
      router.push("/dashboard/products");
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setIsDeleting(false);
    }
  };

  const terminalOptionsByLocation = useMemo(() => {
    return new Map(
      prices.map((price) => [
        price.localId,
        terminals
          .filter((terminal) => {
            if (!terminal.id) return false;
            if (!price.location_id) return true;
            return terminal.location_id === price.location_id;
          })
          .map((terminal) => ({
            label: `${toDisplayValue(terminal.name, EMPTY_VALUE)} (${toDisplayValue(terminal.terminal_code, EMPTY_VALUE)})`,
            value: terminal.id ?? "",
          })),
      ]),
    );
  }, [prices, terminals]);

  const categoryOptions = [
    { label: "No Category", value: "" },
    ...categories
      .filter((c) => Boolean(c.id))
      .map((c) => ({ label: toDisplayValue(c.name, EMPTY_VALUE), value: c.id ?? "" })),
  ];
  const categorySelectOptions =
    categoryOptions.length > 0
      ? categoryOptions
      : [{ label: "No Category", value: "" }];

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            ← Back to Products
          </Link>
          <div className="mt-4 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
            {error}{" "}
            <button type="button" onClick={fetchData} className="font-semibold underline">
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <nav className="text-[13px] text-[#67707d]">
              <Link href="/dashboard/products" className="hover:text-[#2f3743]">
                Products
              </Link>
              <span className="mx-1">/</span>
              <span>Edit Product</span>
            </nav>
            <h1 className="mt-1 text-[28px] sm:text-[36px] leading-none font-extrabold text-[#1a2029]">
              {displayName}
            </h1>
            <div className="mt-4 flex gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTab(tab)}
                  className={`px-4 py-2 rounded-lg text-[14px] font-semibold ${
                    activeTab === tab
                      ? "bg-[#d4ff00] text-[#1d2512]"
                      : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push("/dashboard/products")}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProduct}
              disabled={isSaving || !isFormValid || !productId}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            {productId && (
              <button
                type="button"
                onClick={deleteProduct}
                disabled={isDeleting}
                className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#cf4a4a] disabled:opacity-50"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            {activeTab === "General" && (
              <>
                <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                  <h2 className="text-[18px] font-bold text-[#1a212c]">Basic Information</h2>
                  <div className="mt-4 flex flex-col sm:flex-row gap-6">
                    <div className="shrink-0">
                      <div className="h-20 w-20 overflow-hidden rounded-lg border border-[#e4e6ea] bg-[#f6f8fa]">
                        {(imagePreviewUrl || imageUrl) ? (
                          <img
                            src={
                              imagePreviewUrl ||
                              (imageUrl?.startsWith("http") ? imageUrl : `/api/proxy${imageUrl}`)
                            }
                            alt="Product"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-[#4f3320] to-[#b56c2f]" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 h-9 rounded-lg border border-[#dfe3e8] bg-white px-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#414855]"
                      >
                        <UploadCloud size={14} />
                        Upload
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1 space-y-3 min-w-0">
                      <div>
                        <label className="text-[14px] font-semibold text-[#363f4c]">
                          Product Name
                        </label>
                        <ValidatedInput
                          value={name || displayName}
                          onChange={setName}
                          rules={[
                            { type: "required", message: "Product name is required." },
                            { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                          ]}
                          className="mt-1 h-10 w-full rounded-lg border-2 border-[#d4ff00] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          placeholder="Product name"
                        />
                      </div>
                      <div>
                        <label className="text-[14px] font-semibold text-[#363f4c]">
                          Internal Name (optional)
                        </label>
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={internalName}
                          onChange={(e) => setInternalName(e.target.value)}
                          placeholder="e.g. CB-Classic"
                        />
                      </div>
                      <div>
                        <label className="text-[14px] font-semibold text-[#363f4c]">SKU</label>
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={sku || displaySku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="SKU"
                        />
                      </div>
                      <div>
                        <label className="text-[14px] font-semibold text-[#363f4c]">Tax rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          className="mt-1 h-10 w-24 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="8.1"
                        />
                      </div>
                      <div>
                        <label className="text-[14px] font-semibold text-[#363f4c]">Category</label>
                        <SelectMenu
                          value={categoryId}
                          onChange={setCategoryId}
                          options={categorySelectOptions}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[14px] font-semibold text-[#363f4c]">
                          Description
                        </label>
                        <textarea
                          className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none focus:border-[#c0eb1a]"
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the product..."
                        />
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                  <h2 className="text-[18px] font-bold text-[#1a212c]">Display Settings</h2>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[14px] font-semibold text-[#363f4c]">
                        Visible in POS
                      </label>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visibleInPos}
                        onClick={() => setVisibleInPos(!visibleInPos)}
                        className={`h-6 w-11 rounded-full transition-colors ${
                          visibleInPos ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            visibleInPos ? "translate-x-6" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[14px] font-semibold text-[#363f4c]">
                        Featured product
                      </label>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={featured}
                        onClick={() => setFeatured(!featured)}
                        className={`h-6 w-11 rounded-full transition-colors ${
                          featured ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            featured ? "translate-x-6" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <div>
                      <label className="text-[14px] font-semibold text-[#363f4c]">
                        Display order
                      </label>
                      <input
                        type="number"
                        className="mt-1 h-10 w-24 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="text-[14px] font-semibold text-[#363f4c]">Color tag</label>
                      <div className="mt-2 flex gap-2">
                        {COLOR_TAGS.map((tag) => (
                          <button
                            key={tag.value}
                            type="button"
                            onClick={() => setColorTag(tag.value)}
                            className={`h-8 w-8 rounded ${tag.color} ${
                              colorTag === tag.value ? "ring-2 ring-offset-2 ring-[#1d2512]" : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                  <h2 className="text-[18px] font-bold text-[#1a212c]">Product Type</h2>
                  <div className="mt-4 flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={productType === "standard"}
                        onChange={() => setProductType("standard")}
                        className="rounded-full"
                      />
                      <span className="text-[14px]">Standard Product</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={productType === "variant"}
                        onChange={() => setProductType("variant")}
                        className="rounded-full"
                      />
                      <span className="text-[14px]">Variant Product</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={productType === "combo"}
                        onChange={() => setProductType("combo")}
                        className="rounded-full"
                      />
                      <span className="text-[14px]">Combo / Meal</span>
                    </label>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]">
                          <th className="text-left py-2 font-semibold text-[#363f4c]">Size</th>
                          <th className="text-left py-2 font-semibold text-[#363f4c]">Price</th>
                          <th className="text-left py-2 font-semibold text-[#363f4c]">SKU</th>
                          <th className="text-left py-2 font-semibold text-[#363f4c]">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-[13px] text-[#717c8e]">
                              No variants. Add one below.
                            </td>
                          </tr>
                        ) : variants.map((v) => (
                          <tr key={v.id} className="border-b border-[#e5e7eb]">
                            <td className="py-2">{v.size}</td>
                            <td className="py-2">${v.price}</td>
                            <td className="py-2">{v.sku}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={v.isDefault}
                                onClick={() => setVariantDefault(v.id)}
                                className={`h-5 w-9 rounded-full transition-colors ${
                                  v.isDefault ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                                }`}
                              >
                                <span
                                  className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    v.isDefault ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddVariantOpen(true)}
                    className="mt-3 h-9 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[13px] font-semibold text-[#414855]"
                  >
                    + Add Variant
                  </button>
                  {isAddVariantOpen ? (
                    <div className="mt-3 rounded-lg border border-[#e4e6ea] bg-[#fafbfc] p-3">
                      <h3 className="text-[14px] font-semibold text-[#2f3743] mb-2">New Variant</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                          value={newVariantName}
                          onChange={(e) => setNewVariantName(e.target.value)}
                          placeholder="Name (e.g. Large)"
                        />
                        <input
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                          value={newVariantPrice}
                          onChange={(e) => setNewVariantPrice(e.target.value)}
                          placeholder="Price"
                        />
                        <input
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                          value={newVariantSku}
                          onChange={(e) => setNewVariantSku(e.target.value)}
                          placeholder="SKU"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newVariantDefault}
                            onChange={(e) => setNewVariantDefault(e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-[13px]">Default</span>
                        </label>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={addVariant}
                          disabled={isAddingVariant || !newVariantName.trim()}
                          className="h-9 rounded-lg bg-[#d4ff00] px-4 text-[13px] font-semibold text-[#1d2512] disabled:opacity-50"
                        >
                          {isAddingVariant ? "Adding..." : "Add"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddVariantOpen(false);
                            setNewVariantName("");
                            setNewVariantSku("");
                            setNewVariantPrice("");
                            setNewVariantDefault(false);
                          }}
                          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[13px] font-semibold text-[#414855]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              </>
            )}

            {activeTab === "Pricing" && (
              <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                <h2 className="text-[18px] font-bold text-[#1a212c]">Prices</h2>
                <div className="mt-4 space-y-2">
                  {prices.map((price, index) => (
                    <div key={price.localId} className="rounded-lg border border-[#e5e7eb] p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <SelectMenu
                          value={price.mode}
                          onChange={(value) =>
                            updatePrice(
                              price.localId,
                              "mode",
                              value === "INDOOR" || value === "TAKEAWAY" ? value : "BOTH",
                            )
                          }
                          options={[
                            { label: "Both", value: "BOTH" },
                            { label: "Indoor", value: "INDOOR" },
                            { label: "Takeaway", value: "TAKEAWAY" },
                          ]}
                        />
                        <input
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                          value={price.price}
                          onChange={(e) => updatePrice(price.localId, "price", e.target.value)}
                          placeholder="Price"
                        />
                        <SelectMenu
                          value={price.location_id}
                          onChange={(value) => updatePrice(price.localId, "location_id", value)}
                          options={[
                            { label: "All Locations", value: "" },
                            ...locations
                              .filter((l) => Boolean(l.id))
                              .map((l) => ({ label: toDisplayValue(l.name, EMPTY_VALUE), value: l.id ?? "" })),
                          ]}
                        />
                        <SelectMenu
                          value={price.terminal_id}
                          onChange={(value) => updatePrice(price.localId, "terminal_id", value)}
                          options={[
                            { label: "All Terminals", value: "" },
                            ...(terminalOptionsByLocation.get(price.localId) ?? []),
                          ]}
                        />
                        <input
                          type="date"
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                          value={price.valid_from}
                          onChange={(e) => updatePrice(price.localId, "valid_from", e.target.value)}
                        />
                        <input
                          type="date"
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                          value={price.valid_until}
                          onChange={(e) => updatePrice(price.localId, "valid_until", e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={prices.length <= 1}
                          onClick={() => removePrice(price)}
                          className="h-9 rounded-lg border border-[#efc3c3] bg-white px-3 text-[12px] font-semibold text-[#cf4a4a] disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPrices((prev) => [...prev, createPriceDraft()])}
                    className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[12px] font-semibold text-[#3f4653]"
                  >
                    + Add Price Rule
                  </button>
                </div>
              </article>
            )}

            {activeTab === "Availability" && (
              <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                <h2 className="text-[18px] font-bold text-[#1a212c]">Availability</h2>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === "always"}
                        onChange={() => setAvailability("always")}
                        className="rounded-full"
                      />
                      <span className="text-[14px]">Always Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="availability"
                        checked={availability === "scheduled"}
                        onChange={() => setAvailability("scheduled")}
                        className="rounded-full"
                      />
                      <span className="text-[14px]">Scheduled Availability</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Day-of-week</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {AVAILABILITY_DAYS.map((day, i) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setAvailabilityDays((prev) =>
                              prev.includes(i)
                                ? prev.filter((x) => x !== i)
                                : [...prev, i].sort((a, b) => a - b),
                            )
                          }
                          className={`h-9 rounded-lg px-3 text-[13px] font-semibold ${
                            availabilityDays.includes(i)
                              ? "bg-[#d4ff00] text-[#1d2512]"
                              : "border border-[#e4e6ea] bg-white text-[#6b7280] hover:bg-[#e5e7eb]"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Time range</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="time"
                        className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none disabled:opacity-50"
                        value={availabilityStart}
                        onChange={(e) => setAvailabilityStart(e.target.value)}
                        disabled={availability === "always"}
                      />
                      <span className="text-[#6b7280]">–</span>
                      <input
                        type="time"
                        className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none disabled:opacity-50"
                        value={availabilityEnd}
                        onChange={(e) => setAvailabilityEnd(e.target.value)}
                        disabled={availability === "always"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Location restriction</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {locations
                        .filter((l) => Boolean(l.id))
                        .map((l) => {
                          const lid = l.id ?? "";
                          const checked = availabilityLocationIds.includes(lid);
                          return (
                            <label
                              key={lid}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] cursor-pointer ${
                                checked ? "border-[#d4ff00] bg-[#f0f4e8]" : "border-[#e5e7eb] bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setAvailabilityLocationIds((prev) =>
                                    e.target.checked ? [...prev, lid] : prev.filter((x) => x !== lid),
                                  )
                                }
                                disabled={availability === "always"}
                              />
                              {toDisplayValue(l.name, EMPTY_VALUE)}
                            </label>
                          );
                        })}
                    </div>
                    <p className="mt-1 text-[12px] text-[#7d8694]">
                      Leave empty for all locations. When set, product is only available at selected locations.
                    </p>
                  </div>
                </div>
              </article>
            )}

            {activeTab === "Modifiers" && (
              <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                <h2 className="text-[18px] font-bold text-[#1a212c]">Modifiers (Extra Groups)</h2>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {extraGroups
                    .filter((g) => Boolean(g.id))
                    .map((g) => {
                      const id = g.id ?? "";
                      const checked = selectedExtraGroupIds.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedExtraGroupIds((prev) =>
                                e.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
                              )
                            }
                          />
                          {toDisplayValue(g.name, EMPTY_VALUE)}
                        </label>
                      );
                    })}
                </div>
              </article>
            )}

            {activeTab === "Advanced" && (
              <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
                <h2 className="text-[18px] font-bold text-[#1a212c]">Advanced</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Barcode</label>
                    <input
                      type="text"
                      className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 7612345678901"
                    />
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Allergens</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allergens.map((a, i) => (
                        <span
                          key={`${a}-${i}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f0f4e8] px-2.5 py-1 text-[12px] font-medium text-[#1d2512]"
                        >
                          {a}
                          <button
                            type="button"
                            onClick={() => setAllergens((prev) => prev.filter((_, j) => j !== i))}
                            className="p-0.5 hover:bg-[#d4ff00]/30 rounded"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px] w-32"
                          value={allergenInput}
                          onChange={(e) => setAllergenInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && allergenInput.trim()) {
                              e.preventDefault();
                              setAllergens((prev) => [...prev, allergenInput.trim()]);
                              setAllergenInput("");
                            }
                          }}
                          placeholder="Add allergen"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (allergenInput.trim()) {
                              setAllergens((prev) => [...prev, allergenInput.trim()]);
                              setAllergenInput("");
                            }
                          }}
                          className="h-9 rounded-lg border border-[#dfe3e8] bg-white px-3 text-[13px] font-semibold text-[#414855]"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Nutritional info (per serving)</label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[12px] text-[#6b7280]">Calories</label>
                        <input
                          type="number"
                          min={0}
                          className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={nutritional.calories}
                          onChange={(e) => setNutritional((p) => ({ ...p, calories: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] text-[#6b7280]">Protein (g)</label>
                        <input
                          type="number"
                          min={0}
                          className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={nutritional.protein}
                          onChange={(e) => setNutritional((p) => ({ ...p, protein: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] text-[#6b7280]">Fat (g)</label>
                        <input
                          type="number"
                          min={0}
                          className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={nutritional.fat}
                          onChange={(e) => setNutritional((p) => ({ ...p, fat: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] text-[#6b7280]">Carbs (g)</label>
                        <input
                          type="number"
                          min={0}
                          className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                          value={nutritional.carbs}
                          onChange={(e) => setNutritional((p) => ({ ...p, carbs: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )}
          </div>

          <aside className="xl:w-[320px] shrink-0">
            <div className="rounded-xl border border-[#e4e6ea] bg-white p-4 shadow-sm sticky top-4">
              <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-3">
                Product Preview
              </p>
              <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
                <div className="aspect-square bg-[#f6f8fa]">
                  {(imagePreviewUrl || imageUrl) ? (
                    <img
                      src={
                        imagePreviewUrl ||
                        (imageUrl?.startsWith("http") ? imageUrl : `/api/proxy${imageUrl}`)
                      }
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#4f3320] to-[#b56c2f]" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-[18px] font-bold text-[#1a212c]">{displayName}</h3>
                  <p className="mt-1 text-[20px] font-bold text-[#1a212c]">${displayPrice}</p>
                  <button
                    type="button"
                    className="mt-3 w-full h-10 rounded-lg bg-[#d4ff00] text-[14px] font-semibold text-[#1d2512]"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
