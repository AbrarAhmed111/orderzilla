"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import type { components } from "@/types/orderzilla-openapi";

function Toggle({ on, onToggle }: { on: boolean; onToggle?: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!on)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function EditProductPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");

  const [name, setName] = useState("New Product");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visible, setVisible] = useState(true);
  const [categories, setCategories] = useState<components["schemas"]["Category"][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      const categoryResponse = await orderzillaApi.dashboard.categories.list();
      const categoryItems = categoryResponse?.categories ?? [];
      setCategories(categoryItems);
      if (!productId) {
        setCategoryId(categoryItems[0]?.id ?? "");
        setIsLoading(false);
        return;
      }

      const product = await orderzillaApi.dashboard.products.byId(productId);
      setName(product?.name ?? "Product");
      setSku(product?.sku ?? "");
      setDescription(product?.description ?? "");
      setCategoryId(product?.category_id ?? categoryItems[0]?.id ?? "");
      setVisible(product?.is_active ?? true);
      setIsLoading(false);
    };
    run();
  }, [productId]);

  const onSave = async () => {
    if (!productId) return;
    try {
      setIsSaving(true);
      await orderzillaApi.dashboard.products.update(productId, {
        body: {
          name,
          sku: sku || undefined,
          description: description || undefined,
          category_id: categoryId || undefined,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-[#7a8291]">Products / Edit Product</p>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">{name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !productId}
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512]"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_0.8fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <h2 className="text-[31px] font-bold text-[#1a212c]">Basic Information</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[14px] font-semibold text-[#363f4c]">Product Name</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#363f4c]">SKU</label>
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#363f4c]">Category</label>
                <div className="mt-1">
                  <SelectMenu
                    value={categoryId}
                    onChange={setCategoryId}
                    options={categories.map((category) => ({
                      label: category.name ?? "Unnamed",
                      value: category.id ?? "",
                    }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#363f4c]">Visible in POS</label>
                <div className="mt-2 flex items-center gap-2">
                  <Toggle on={visible} onToggle={setVisible} />
                  <span className="text-[16px] font-semibold text-[#303844]">{visible ? "On" : "Off"}</span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[14px] font-semibold text-[#363f4c]">Description</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3 h-fit">
            <div className="h-[220px] rounded-lg bg-gradient-to-br from-[#1f2431] to-[#9a6a3c]" />
            <h3 className="text-[44px] leading-tight font-extrabold text-[#1a2029] mt-3">
              {name.split(" ").slice(0, 2).join(" ")}
            </h3>
            <p className="text-[14px] text-[#6e7785] mt-1">{sku || "No SKU"}</p>
          </article>
        </div>
      </section>
    </div>
  );
}

