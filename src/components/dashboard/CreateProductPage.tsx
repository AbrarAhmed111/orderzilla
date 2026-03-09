"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";
import type { components } from "@/types/orderzilla-openapi";

type ApiCategory = components["schemas"]["Category"];
type ApiLocation = components["schemas"]["Location"];
type ApiTerminal = components["schemas"]["Terminal"];
type ApiExtraGroup = components["schemas"]["ExtraGroup"];

type PriceDraft = {
  id: string;
  mode: "INDOOR" | "TAKEAWAY" | "BOTH";
  price: string;
  currency: string;
  location_id: string;
  terminal_id: string;
  valid_from: string;
  valid_until: string;
};

const createPriceDraft = (): PriceDraft => ({
  id: crypto.randomUUID(),
  mode: "BOTH",
  price: "",
  currency: "CHF",
  location_id: "",
  terminal_id: "",
  valid_from: "",
  valid_until: "",
});

export default function CreateProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxRate, setTaxRate] = useState<number | "">(8.1);
  const [sortOrder, setSortOrder] = useState<number | "">(0);
  const [prices, setPrices] = useState<PriceDraft[]>([createPriceDraft()]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [terminals, setTerminals] = useState<ApiTerminal[]>([]);
  const [extraGroups, setExtraGroups] = useState<ApiExtraGroup[]>([]);
  const [selectedExtraGroupIds, setSelectedExtraGroupIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [categoriesRes, locationsRes, terminalsRes, extrasRes] = await Promise.all([
          orderzillaApi.dashboard.categories.list(),
          orderzillaApi.dashboard.locations.list(),
          orderzillaApi.dashboard.terminals.list(),
          orderzillaApi.dashboard.extras.list(),
        ]);
        setCategories((categoriesRes?.categories ?? []) as ApiCategory[]);
        setLocations((locationsRes?.locations ?? []) as ApiLocation[]);
        setTerminals((terminalsRes?.terminals ?? []) as ApiTerminal[]);
        setExtraGroups((extrasRes?.extra_groups ?? []) as ApiExtraGroup[]);
      } catch {
        setCategories([]);
        setLocations([]);
        setTerminals([]);
        setExtraGroups([]);
      }
    };
    fetchMeta();
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setSku("");
    setCategoryId("");
    setTaxRate(8.1);
    setSortOrder(0);
    setPrices([createPriceDraft()]);
    setSelectedExtraGroupIds([]);
    setImageFile(null);
    setImagePreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updatePrice = <K extends keyof PriceDraft>(id: string, key: K, value: PriceDraft[K]) => {
    setPrices((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const nameError = validateField(name, [
    { type: "required", message: "Product name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const hasValidPrice = prices.some((p) => p.price.trim().length > 0);
  const isFormValid = !nameError && hasValidPrice;

  const saveProduct = async () => {
    if (!isFormValid) return;
    const validPrices = prices.filter((price) => price.price.trim().length > 0);

    try {
      setIsSaving(true);
      const created = await orderzillaApi.dashboard.products.create({
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          sku: sku.trim() || undefined,
          category_id: categoryId || undefined,
          tax_rate: taxRate === "" ? undefined : Number(taxRate),
          sort_order: sortOrder === "" ? undefined : Number(sortOrder),
          translations: description.trim()
            ? {
                de: { name: name.trim(), description: description.trim() },
                en: { name: name.trim(), description: description.trim() },
              }
            : undefined,
          prices: validPrices.map((price) => ({
            mode: price.mode,
            price: price.price.trim(),
            currency: price.currency.trim() || "CHF",
            location_id: price.location_id || null,
            terminal_id: price.terminal_id || null,
            valid_from: price.valid_from || null,
            valid_until: price.valid_until || null,
          })),
        } as never,
      });

      if (created?.id && selectedExtraGroupIds.length > 0) {
        await Promise.all(
          selectedExtraGroupIds.map((groupId, index) =>
            orderzillaApi.dashboard.products.extras.attach(created.id!, {
              body: {
                extra_group_id: groupId,
                sort_order: index,
              },
            }),
          ),
        );
      }

      if (imageFile && created?.id) {
        const formData = new FormData();
        formData.append("image", imageFile);
        await orderzillaApi.dashboard.products.uploadImage(created.id, {
          body: formData as never,
        });
      }

      toast.success("Product created successfully.");
      router.push("/dashboard/products");
    } catch {
      toast.error("Failed to create product.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/products" className="text-[13px] text-[#67707d]">
              ← Back to Products
            </Link>
            <h1 className="mt-1 text-[28px] sm:text-[36px] lg:text-[42px] leading-none font-extrabold text-[#1a2029]">Create Product</h1>
          </div>
          <div className="flex items-center gap-2">
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
              disabled={isSaving || !isFormValid}
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Product"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#cf4a4a]"
            >
              <Trash2 size={14} />
              Reset Form
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[30px] font-bold text-[#1a212c]">Basic Information</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ValidatedInput
                value={name}
                onChange={setName}
                rules={[
                  { type: "required", message: "Product name is required." },
                  { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                ]}
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                placeholder="Product name"
              />
              <input
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU"
              />
              <SelectMenu
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { label: "No Category", value: "" },
                  ...categories
                    .filter((category) => Boolean(category.id))
                    .map((category) => ({
                      label: category.name ?? "Unnamed category",
                      value: category.id ?? "",
                    })),
                ]}
              />
              <input
                type="number"
                step="0.1"
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Tax rate %"
              />
              <input
                type="number"
                className="h-10 rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Sort order"
              />
            </div>
            <textarea
              className="mt-3 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[30px] font-bold text-[#1a212c]">Extra Groups</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {extraGroups
                .filter((group) => Boolean(group.id))
                .map((group) => {
                  const id = group.id ?? "";
                  const checked = selectedExtraGroupIds.includes(id);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-2 text-[13px]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setSelectedExtraGroupIds((prev) =>
                            event.target.checked
                              ? [...prev, id]
                              : prev.filter((value) => value !== id),
                          )
                        }
                      />
                      <span>{group.name ?? "Unnamed group"}</span>
                    </label>
                  );
                })}
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[30px] font-bold text-[#1a212c]">Prices</h2>
            <div className="mt-3 space-y-2">
              {prices.map((price, index) => (
                <div key={price.id} className="rounded-lg border border-[#e5e7eb] p-2">
                  <div className="grid grid-cols-4 gap-2">
                    <SelectMenu
                      value={price.mode}
                      onChange={(value) =>
                        updatePrice(
                          price.id,
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
                      onChange={(e) => updatePrice(price.id, "price", e.target.value)}
                      placeholder="Price (e.g. 9.90)"
                    />
                    <input
                      className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                      value={price.currency}
                      onChange={(e) => updatePrice(price.id, "currency", e.target.value)}
                      placeholder="Currency"
                    />
                    <SelectMenu
                      value={price.location_id}
                      onChange={(value) => updatePrice(price.id, "location_id", value)}
                      options={[
                        { label: "All Locations", value: "" },
                        ...locations
                          .filter((location) => Boolean(location.id))
                          .map((location) => ({
                            label: location.name ?? "Unnamed location",
                            value: location.id ?? "",
                          })),
                      ]}
                    />
                    <SelectMenu
                      value={price.terminal_id}
                      onChange={(value) => updatePrice(price.id, "terminal_id", value)}
                      options={[
                        { label: "All Terminals", value: "" },
                        ...terminals
                          .filter((terminal) => {
                            if (!terminal.id) return false;
                            if (!price.location_id) return true;
                            return terminal.location_id === price.location_id;
                          })
                          .map((terminal) => ({
                            label: `${terminal.name ?? "Unnamed"} (${terminal.terminal_code ?? "N/A"})`,
                            value: terminal.id ?? "",
                          })),
                      ]}
                    />
                    <input
                      type="date"
                      className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                      value={price.valid_from}
                      onChange={(e) => updatePrice(price.id, "valid_from", e.target.value)}
                    />
                    <input
                      type="date"
                      className="h-9 rounded-lg border border-[#dfe3e8] px-3 text-[13px]"
                      value={price.valid_until}
                      onChange={(e) => updatePrice(price.id, "valid_until", e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={prices.length <= 1}
                      onClick={() => setPrices((prev) => prev.filter((row) => row.id !== price.id))}
                      className="h-9 rounded-lg border border-[#efc3c3] bg-white px-3 text-[12px] font-semibold text-[#cf4a4a] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1 text-[12px] text-[#7a8291]">Price rule #{index + 1}</p>
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

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[30px] font-bold text-[#1a212c]">Product Image</h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 h-28 w-full rounded-lg border border-dashed border-[#dfe3e8] bg-[#fafbfc] flex flex-col items-center justify-center text-[#7a8392]"
            >
              <UploadCloud size={22} />
              <p className="text-[14px] mt-1">Drag and drop an image here, or click to browse.</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {imagePreviewUrl ? (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-14 w-14 overflow-hidden rounded-lg border border-[#dfe3e8]">
                  <img src={imagePreviewUrl} alt="Product preview" className="h-full w-full object-cover" />
                </div>
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
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 text-[14px] font-semibold text-[#cf4a4a]"
                >
                  Remove
                </button>
              </div>
            ) : null}
            {imageFile ? (
              <p className="mt-2 text-[12px] text-[#6e7785]">Selected image: {imageFile.name}</p>
            ) : null}
          </article>
        </div>
      </section>
    </div>
  );
}

