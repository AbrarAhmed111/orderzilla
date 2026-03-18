"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import CategoryForm, { type CategoryFormValues } from "@/components/dashboard/CategoryForm";
import { orderzillaApi } from "@/lib/api";

export default function CreateCategoryPage() {
  const router = useRouter();

  const handleSave = async (values: CategoryFormValues, imageFile: File | null) => {
    try {
      const created = await orderzillaApi.dashboard.categories.create({
        body: {
          name: values.name,
          slug: values.slug.trim() || undefined,
          sort_order: Number.isFinite(values.sortOrder) ? values.sortOrder : 0,
          translations: values.description
            ? {
                de: { name: values.name, description: values.description },
                en: { name: values.name, description: values.description },
              }
            : undefined,
          show_in_pos: values.showInPos,
          show_in_kiosk: values.showInKiosk,
          highlighted: values.highlighted,
          availability: values.availability,
          availability_days: values.availability === "scheduled" ? values.days : undefined,
          availability_start: values.availability === "scheduled" && values.timeStart ? values.timeStart : undefined,
          availability_end: values.availability === "scheduled" && values.timeEnd ? values.timeEnd : undefined,
          location_ids: values.locationIds.length > 0 ? values.locationIds : undefined,
          meta_title: values.metaTitle.trim() || undefined,
          meta_description: values.metaDescription.trim() || undefined,
        },
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
    }
  };

  return (
    <CategoryForm
      mode="create"
      onSave={handleSave}
      onCancel={() => router.push("/dashboard/categories")}
    />
  );
}
