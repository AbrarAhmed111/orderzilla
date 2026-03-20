"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Trash2, UploadCloud, X } from "lucide-react";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import { orderzillaApi } from "@/lib/api";
import { displayImageSrc } from "@/lib/media-url";
import type { components } from "@/types/orderzilla-openapi";

const EMPTY_VALUE = "—";

type ApiCategory = components["schemas"]["Category"];
type ApiLocation = components["schemas"]["Location"];

function toDisplayValue(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

type CategoryFormProps = {
  mode: "create" | "edit";
  id?: string;
  initialName?: string;
  initialDescription?: string;
  initialSortOrder?: number;
  initialImageUrl?: string;
  initialSlug?: string;
  initialParentId?: string;
  initialShowInPos?: boolean;
  initialShowInKiosk?: boolean;
  initialHighlighted?: boolean;
  initialAvailability?: "always" | "scheduled";
  initialDays?: number[];
  initialTimeStart?: string;
  initialTimeEnd?: string;
  initialLocationIds?: string[];
  initialMetaTitle?: string;
  initialMetaDescription?: string;
  onSave: (values: CategoryFormValues, imageFile: File | null) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
};

export type CategoryFormValues = {
  name: string;
  description: string;
  sortOrder: number;
  slug: string;
  parentId: string;
  showInPos: boolean;
  showInKiosk: boolean;
  highlighted: boolean;
  availability: "always" | "scheduled";
  days: number[];
  timeStart: string;
  timeEnd: string;
  locationIds: string[];
  metaTitle: string;
  metaDescription: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CategoryForm({
  mode,
  id,
  initialName = "",
  initialDescription = "",
  initialSortOrder = 0,
  initialImageUrl = "",
  initialSlug = "",
  initialParentId = "",
  initialShowInPos = true,
  initialShowInKiosk = true,
  initialHighlighted = false,
  initialAvailability = "always",
  initialDays = [0, 1, 2, 3, 4, 5, 6],
  initialTimeStart = "",
  initialTimeEnd = "",
  initialLocationIds = [],
  initialMetaTitle = "",
  initialMetaDescription = "",
  onSave,
  onDelete,
  onCancel,
}: CategoryFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [slug, setSlug] = useState(initialSlug || initialName?.toLowerCase().replace(/\s+/g, "-") || "");
  const [parentId, setParentId] = useState(initialParentId ?? "");
  const [showInPos, setShowInPos] = useState(initialShowInPos);
  const [showInKiosk, setShowInKiosk] = useState(initialShowInKiosk);
  const [highlighted, setHighlighted] = useState(initialHighlighted);
  const [availability, setAvailability] = useState<"always" | "scheduled">(initialAvailability);
  const [days, setDays] = useState<number[]>(initialDays);
  const [timeStart, setTimeStart] = useState(initialTimeStart);
  const [timeEnd, setTimeEnd] = useState(initialTimeEnd);
  const [locationIds, setLocationIds] = useState<string[]>(initialLocationIds);
  const [metaTitle, setMetaTitle] = useState(initialMetaTitle);
  const [metaDescription, setMetaDescription] = useState(initialMetaDescription);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [locationOptionsOpen, setLocationOptionsOpen] = useState(false);
  const [seoExpanded, setSeoExpanded] = useState(true);

  const displayLocations = locations;
  const selectedLocationNames = locationIds
    .map((lid) => {
      const loc = displayLocations.find((l) => (l.id ?? "") === lid);
      return toDisplayValue(loc?.name, lid) || lid;
    })
    .filter(Boolean);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [catRes, locRes] = await Promise.all([
          orderzillaApi.dashboard.categories.list(),
          orderzillaApi.dashboard.locations.list(),
        ]);
        setCategories((catRes?.categories ?? []) as ApiCategory[]);
        setLocations((locRes?.locations ?? []) as ApiLocation[]);
      } catch {
        setCategories([]);
        setLocations([]);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (name && !initialSlug) {
      setSlug(name.toLowerCase().replace(/\s+/g, "-"));
    }
  }, [name, initialSlug]);

  const nameError = validateField(name, [
    { type: "required", message: "Category name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const isFormValid = !nameError;

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  };

  const toggleLocation = (locId: string) => {
    setLocationIds((prev) =>
      prev.includes(locId) ? prev.filter((x) => x !== locId) : [...prev, locId],
    );
  };

  const removeLocation = (locId: string) => {
    setLocationIds((prev) => prev.filter((x) => x !== locId));
  };

  const handleSave = async () => {
    if (!isFormValid) return;
    setIsSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          description,
          sortOrder,
          slug,
          parentId,
          showInPos,
          showInKiosk,
          highlighted,
          availability,
          days,
          timeStart,
          timeEnd,
          locationIds,
          metaTitle,
          metaDescription,
        },
        imageFile,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm("Delete this category?")) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const hasImage = !!(imageFile || imagePreviewUrl || imageUrl);

  return (
    <div className="p-3 sm:p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link
              href="/dashboard/categories"
              className="text-[13px] text-[#67707d] hover:text-[#2f3743]"
            >
              ← Back to Categories
            </Link>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] leading-none font-extrabold text-[#1a2029] mt-1">
              {mode === "create" ? "Create Category" : "Edit Category"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Category"}
            </button>
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#cf4a4a] disabled:opacity-50"
              >
                <Trash2 size={14} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Basic Information</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Category Name</label>
                  <ValidatedInput
                    value={name}
                    onChange={setName}
                    rules={[
                      { type: "required", message: "Category name is required." },
                      { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                    ]}
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                    placeholder="e.g., Burgers"
                  />
                  <p className="mt-1 text-[12px] text-[#7d8694]">Enter e-input&apos;s category name.</p>
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">
                    Slug / Internal ID (optional)
                  </label>
                  <input
                    type="text"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="burgers"
                  />
                  <p className="mt-1 text-[12px] text-[#7d8694]">Describe the category method.</p>
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Description</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none focus:border-[#c0eb1a]"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the category..."
                  />
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Category Image</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 h-32 w-full rounded-lg border-2 border-dashed border-[#dfe3e8] bg-[#fafbfc] flex flex-col items-center justify-center text-[#7a8392] hover:border-[#c0eb1a] transition-colors"
              >
                <UploadCloud size={28} />
                <p className="text-[14px] mt-2">Drag and drop an image here, or click to browse.</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {hasImage && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-[#e4e6ea] bg-[#f6f8fa]">
                    {(imagePreviewUrl || imageUrl) ? (
                      <img
                        src={displayImageSrc(imagePreviewUrl, imageUrl) ?? ""}
                        alt="Category"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#4f3320] to-[#b56c2f]" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl("");
                        setImageUrl("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 text-[14px] font-semibold text-[#cf4a4a]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Display & Ordering</h2>
              <div className="mt-3 space-y-4">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Display Order</label>
                  <input
                    type="number"
                    className="mt-1 h-10 w-24 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value || 0))}
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Parent Category</label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                    value={parentId ?? ""}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">Select parent...</option>
                    {categories
                      .filter((c) => c.id !== id)
                      .map((c) => (
                        <option key={c.id ?? c.name ?? crypto.randomUUID()} value={c.id ?? ""}>
                          {toDisplayValue(c.name, EMPTY_VALUE)}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-semibold text-[#363f4c]">Show in POS</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showInPos}
                    onClick={() => setShowInPos(!showInPos)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      showInPos ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        showInPos ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-semibold text-[#363f4c]">Show in Kiosk</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showInKiosk}
                    onClick={() => setShowInKiosk(!showInKiosk)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      showInKiosk ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        showInKiosk ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-semibold text-[#363f4c]">
                    Highlighted Category
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={highlighted}
                    onClick={() => setHighlighted(!highlighted)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      highlighted ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        highlighted ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Availability Rules</h2>
              <div className="mt-3 space-y-4">
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
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`h-9 rounded-lg px-3 text-[13px] font-semibold ${
                          days.includes(i)
                            ? "bg-[#d4ff00] text-[#1d2512]"
                            : "border border-[#e4e6ea] bg-white text-[#6b7280]"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">
                    Time range picker
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="time"
                      className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none disabled:opacity-50"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      disabled={availability === "always"}
                    />
                    <span className="text-[#6b7280]">–</span>
                    <input
                      type="time"
                      className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none disabled:opacity-50"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      disabled={availability === "always"}
                    />
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <h2 className="text-[18px] font-bold text-[#1a212c]">Location Assignment</h2>
              <div className="mt-3">
                <label className="text-[14px] font-semibold text-[#363f4c]">Locations</label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setLocationOptionsOpen(!locationOptionsOpen)}
                    className="h-10 w-full rounded-lg border border-[#dfe3e8] bg-white px-3 text-left text-[14px] flex items-center justify-between"
                  >
                    <span className="text-[#6b7280]">
                      {selectedLocationNames.length > 0
                        ? selectedLocationNames.join(", ")
                        : "All Locations (no restriction)"}
                    </span>
                    <ChevronDown size={16} className="text-[#9ca3af]" />
                  </button>
                  {locationOptionsOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border border-[#e4e6ea] bg-white py-2 shadow-lg max-h-48 overflow-y-auto">
                      {displayLocations.map((loc) => (
                        <button
                          key={loc.id ?? loc.name ?? crypto.randomUUID()}
                          type="button"
                          onClick={() => toggleLocation(loc.id ?? "")}
                          className="w-full px-3 py-2 text-left text-[14px] hover:bg-[#f6f8fb]"
                        >
                          {toDisplayValue(loc.name, EMPTY_VALUE)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedLocationNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {locationIds.map((lid) => {
                      const loc = displayLocations.find((l) => (l.id ?? "") === lid);
                      const locName = toDisplayValue(loc?.name, lid) || lid;
                      return (
                        <span
                          key={lid}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f0f4e8] px-2.5 py-1 text-[12px] font-semibold text-[#1d2512]"
                        >
                          {locName}{" "}
                          <button
                            type="button"
                            onClick={() => removeLocation(lid)}
                            className="hover:text-[#cf4a4a]"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-4">
              <button
                type="button"
                onClick={() => setSeoExpanded(!seoExpanded)}
                className="flex w-full items-center justify-between text-left"
              >
                <h2 className="text-[18px] font-bold text-[#1a212c]">SEO / Metadata</h2>
                {seoExpanded ? (
                  <ChevronUp size={18} className="text-[#6b7280]" />
                ) : (
                  <ChevronDown size={18} className="text-[#6b7280]" />
                )}
              </button>
              {seoExpanded && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">
                      Preview snippet
                    </label>
                    <div className="mt-1 rounded-lg border border-[#e4e6ea] bg-[#f9fafb] p-3 text-[13px]">
                      <p className="text-[#1d4ed8] font-medium">
                        Search result for {name || "inners"} - Orderzilla
                      </p>
                      <p className="mt-1 text-[#4b5563]">
                        {metaDescription ||
                          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">Meta Title</label>
                    <input
                      type="text"
                      className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="e.g. Burger Menu - Best Burgers in Town"
                    />
                  </div>
                  <div>
                    <label className="text-[14px] font-semibold text-[#363f4c]">
                      Meta Description
                    </label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none focus:border-[#c0eb1a]"
                      rows={3}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="e.g. Discover our delicious burger selection"
                    />
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
