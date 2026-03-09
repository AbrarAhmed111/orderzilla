"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";

export default function CreateCategoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSortOrder(0);
    setImageFile(null);
    setImagePreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const nameError = validateField(name, [
    { type: "required", message: "Category name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const isFormValid = !nameError;

  const handleSave = async () => {
    if (!isFormValid) return;
    const trimmedName = name.trim();
    try {
      setIsSaving(true);
      const created = await orderzillaApi.dashboard.categories.create({
        body: {
          name: trimmedName,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          translations: description
            ? {
                de: { name: trimmedName, description: description || undefined },
                en: { name: trimmedName, description: description || undefined },
              }
            : undefined,
        } as never,
      });

      if (imageFile && created?.id) {
        const formData = new FormData();
        formData.append("image", imageFile);
        await orderzillaApi.dashboard.categories.uploadImage(created.id, {
          body: formData as never,
        });
      }

      toast.success("Category created successfully.");
      router.push("/dashboard/categories");
    } catch {
      toast.error("Failed to create category.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link href="/dashboard/categories" className="text-[13px] text-[#67707d]">
              ← Back to Categories
            </Link>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] leading-none font-extrabold text-[#1a2029] mt-1">
              Create Category
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/categories")}
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

        <div className="mt-4">
          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[30px] font-bold text-[#1a212c]">Basic Information</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
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
                  <label className="text-[14px] font-semibold text-[#363f4c]">Display Order</label>
                  <input
                    type="number"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value || 0))}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[14px] font-semibold text-[#363f4c]">Description</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the category..."
                />
              </div>

              <div className="mt-3">
                <label className="text-[14px] font-semibold text-[#363f4c]">Category Image</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 h-28 w-full rounded-lg border border-dashed border-[#dfe3e8] bg-[#fafbfc] flex flex-col items-center justify-center text-[#7a8392]"
                >
                  <UploadCloud size={22} />
                  <p className="text-[14px] mt-1">
                    Drag and drop an image here, or click to browse.
                  </p>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                {imageFile ? (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-14 w-14 overflow-hidden rounded-lg bg-gradient-to-br from-[#4f3320] to-[#b56c2f]">
                      {imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="Category preview"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
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
              </div>
            </article>
          </div>

        </div>
      </section>
    </div>
  );
}

