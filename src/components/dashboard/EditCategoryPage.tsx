"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import CategoryForm, { type CategoryFormValues } from "@/components/dashboard/CategoryForm";
import { orderzillaApi } from "@/lib/api";

type EditCategoryPageProps = {
  id: string;
};

export default function EditCategoryPage({ id }: EditCategoryPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialData, setInitialData] = useState<{
    name: string;
    description: string;
    sortOrder: number;
    imageUrl: string;
    slug?: string;
    parentId?: string;
    showInPos?: boolean;
    showInKiosk?: boolean;
    highlighted?: boolean;
    availability?: "always" | "scheduled";
    days?: number[];
    timeStart?: string;
    timeEnd?: string;
    locationIds?: string[];
    metaTitle?: string;
    metaDescription?: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const category = await orderzillaApi.dashboard.categories.byId(id);
      const trans = category?.translations as Record<
        string,
        { description?: string; name?: string }
      > | undefined;
      const cat = category as {
        name?: string | null;
        sort_order?: number | null;
        image_url?: string | null;
        slug?: string | null;
        parent_id?: string | null;
        show_in_pos?: boolean | null;
        show_in_kiosk?: boolean | null;
        highlighted?: boolean | null;
        availability?: string | null;
        availability_days?: (string | number)[] | null;
        availability_start?: string | null;
        availability_end?: string | null;
        location_ids?: string[] | null;
        meta_title?: string | null;
        meta_description?: string | null;
      };
      const rawDays = Array.isArray(cat?.availability_days) ? cat.availability_days : [];
      const days = rawDays.length > 0
        ? rawDays.map((d) => {
            if (typeof d === "number" && d >= 0 && d <= 6) {
              return d === 0 ? 6 : d - 1;
            }
            const map: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
            const key = typeof d === "string" ? d.toLowerCase().slice(0, 3) : "";
            return map[key] ?? -1;
          }).filter((i) => i >= 0)
        : [0, 1, 2, 3, 4, 5, 6];
      const toTimeInput = (hms: string | null | undefined, defaultVal: string) => {
        if (!hms || typeof hms !== "string") return defaultVal;
        const parts = hms.trim().split(":");
        const h = parts[0] ?? "0";
        const m = parts[1] ?? "0";
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      };
      setInitialData({
        name: typeof cat?.name === "string" ? cat.name : "",
        description: trans?.de?.description ?? trans?.en?.description ?? "",
        sortOrder: typeof cat?.sort_order === "number" ? cat.sort_order : 0,
        imageUrl: typeof cat?.image_url === "string" ? cat.image_url : "",
        slug: typeof cat?.slug === "string" ? cat.slug : undefined,
        parentId: typeof cat?.parent_id === "string" ? cat.parent_id : undefined,
        showInPos: cat?.show_in_pos ?? true,
        showInKiosk: cat?.show_in_kiosk ?? true,
        highlighted: cat?.highlighted ?? false,
        availability: cat?.availability === "scheduled" ? "scheduled" : "always",
        days: days.length > 0 ? [...new Set(days)].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6],
        timeStart: toTimeInput(cat?.availability_start, "00:00"),
        timeEnd: toTimeInput(cat?.availability_end, "23:59"),
        locationIds: Array.isArray(cat?.location_ids) ? cat.location_ids : [],
        metaTitle: typeof cat?.meta_title === "string" ? cat.meta_title : "",
        metaDescription: typeof cat?.meta_description === "string" ? cat.meta_description : "",
      });
    } catch {
      setError("Failed to load category.");
      setInitialData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSave = async (values: CategoryFormValues, imageFile: File | null) => {
    try {
      await orderzillaApi.dashboard.categories.update(id, {
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
          availability_days:
            values.availability === "scheduled"
              ? values.days.map((d) => (d === 6 ? 0 : d + 1))
              : undefined,
          availability_start:
            values.availability === "scheduled" && values.timeStart
              ? `${values.timeStart}:00`
              : undefined,
          availability_end:
            values.availability === "scheduled" && values.timeEnd
              ? `${values.timeEnd}:00`
              : undefined,
          location_ids: values.locationIds.length > 0 ? values.locationIds : undefined,
          meta_title: values.metaTitle.trim() || undefined,
          meta_description: values.metaDescription.trim() || undefined,
        },
      });

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        await orderzillaApi.dashboard.categories.uploadImage(id, {
          body: formData as never,
        });
      }

      toast.success("Category updated successfully.");
      router.push("/dashboard/categories");
    } catch {
      toast.error("Failed to update category.");
    }
  };

  const handleDelete = async () => {
    try {
      await orderzillaApi.dashboard.categories.remove(id);
      toast.success("Category deleted.");
      router.push("/dashboard/categories");
    } catch {
      toast.error("Failed to delete category.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }

  if (error && !initialData) {
    return (
      <div className="p-3 sm:p-4">
        <section className="rounded-2xl border border-[#e5e7eb] bg-white px-3 sm:px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/dashboard/categories"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#616a78] hover:text-[#2f3743]"
          >
            <ArrowLeft size={16} />
            Back to Categories
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

  if (!initialData) {
    return (
      <div className="p-3 sm:p-4">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
          <TableSkeleton rows={6} columns={3} />
        </div>
      </div>
    );
  }

  return (
    <CategoryForm
      mode="edit"
      id={id}
      initialName={initialData.name}
      initialDescription={initialData.description}
      initialSortOrder={initialData.sortOrder}
      initialImageUrl={initialData.imageUrl}
      initialSlug={initialData.slug}
      initialParentId={initialData.parentId}
      initialShowInPos={initialData.showInPos}
      initialShowInKiosk={initialData.showInKiosk}
      initialHighlighted={initialData.highlighted}
      initialAvailability={initialData.availability}
      initialDays={initialData.days}
      initialTimeStart={initialData.timeStart}
      initialTimeEnd={initialData.timeEnd}
      initialLocationIds={initialData.locationIds}
      initialMetaTitle={initialData.metaTitle}
      initialMetaDescription={initialData.metaDescription}
      onSave={handleSave}
      onDelete={handleDelete}
      onCancel={() => router.push("/dashboard/categories")}
    />
  );
}
