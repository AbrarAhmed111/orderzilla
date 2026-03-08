"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GripVertical, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { orderzillaApi } from "@/lib/api";
import { ValidatedInput } from "@/components/dashboard/ui/ValidatedInput";
import { validateField } from "@/lib/validation";

type OptionRow = {
  localId: string;
  id?: string;
  name: string;
  priceAdd: string;
  sortOrder: number;
};

const makeOptionRow = (index = 0): OptionRow => ({
  localId: crypto.randomUUID(),
  name: "",
  priceAdd: "0.00",
  sortOrder: index,
});

export default function CreateExtraGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ?? "";

  const [groupId, setGroupId] = useState(initialId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectionType, setSelectionType] = useState<"SINGLE" | "MULTIPLE">("MULTIPLE");
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(10);
  const [sortOrder, setSortOrder] = useState(0);
  const [options, setOptions] = useState<OptionRow[]>([makeOptionRow(0)]);
  const [isLoading, setIsLoading] = useState(Boolean(initialId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditMode = Boolean(groupId);

  const fetchGroup = async (id: string) => {
    try {
      setIsLoading(true);
      const [group, optionsResp] = await Promise.all([
        orderzillaApi.dashboard.extras.byId(id),
        orderzillaApi.dashboard.extras.options.list(id),
      ]);
      setName(group?.name ?? "");
      setDescription(
        group?.translations?.de?.description ??
          group?.translations?.en?.description ??
          "",
      );
      setSelectionType(group?.selection_type ?? "MULTIPLE");
      setIsRequired(group?.is_required ?? false);
      setMinSelections(group?.min_selections ?? 0);
      setMaxSelections(group?.max_selections ?? 0);
      setSortOrder(group?.sort_order ?? 0);
      const mappedOptions = (optionsResp?.options ?? []).map((option, index) => ({
        localId: crypto.randomUUID(),
        id: option.id,
        name: option.name ?? "",
        priceAdd: option.price_add ?? "0.00",
        sortOrder: option.sort_order ?? index,
      }));
      setOptions(mappedOptions.length ? mappedOptions : [makeOptionRow(0)]);
    } catch {
      toast.error("Failed to load extra group.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialId) return;
    fetchGroup(initialId);
  }, [initialId]);

  const resetForm = () => {
    setGroupId("");
    setName("");
    setDescription("");
    setSelectionType("MULTIPLE");
    setIsRequired(false);
    setMinSelections(0);
    setMaxSelections(10);
    setSortOrder(0);
    setOptions([makeOptionRow(0)]);
  };

  const updateOption = <K extends keyof OptionRow>(localId: string, key: K, value: OptionRow[K]) => {
    setOptions((prev) => prev.map((opt) => (opt.localId === localId ? { ...opt, [key]: value } : opt)));
  };

  const syncOptions = async (id: string) => {
    const existingResp = await orderzillaApi.dashboard.extras.options.list(id);
    const existing = existingResp?.options ?? [];
    const existingIds = new Set(existing.map((opt) => opt.id).filter(Boolean) as string[]);

    const prepared = options
      .map((opt, index) => ({
        ...opt,
        name: opt.name.trim(),
        priceAdd: opt.priceAdd.trim(),
        sortOrder: index,
      }))
      .filter((opt) => opt.name.length > 0);

    await Promise.all(
      prepared
        .filter((opt) => !opt.id)
        .map((opt) =>
          orderzillaApi.dashboard.extras.options.create(id, {
            body: {
              name: opt.name,
              price_add: opt.priceAdd || "0.00",
              sort_order: opt.sortOrder,
              translations: description
                ? {
                    de: { name: opt.name, description },
                    en: { name: opt.name, description },
                  }
                : undefined,
            },
          }),
        ),
    );

    await Promise.all(
      prepared
        .filter((opt): opt is OptionRow & { id: string; name: string } => Boolean(opt.id && opt.name))
        .map((opt) =>
          orderzillaApi.dashboard.extras.options.update(id, opt.id, {
            body: {
              name: opt.name,
              price_add: opt.priceAdd || "0.00",
              sort_order: opt.sortOrder,
              translations: description
                ? {
                    de: { name: opt.name, description },
                    en: { name: opt.name, description },
                  }
                : undefined,
            },
          }),
        ),
    );

    const keptIds = new Set(prepared.map((opt) => opt.id).filter(Boolean) as string[]);
    const toDelete = [...existingIds].filter((existingId) => !keptIds.has(existingId));
    if (toDelete.length > 0) {
      await Promise.all(
        toDelete.map((optId) => orderzillaApi.dashboard.extras.options.remove(id, optId)),
      );
    }
  };

  const nameError = validateField(name, [
    { type: "required", message: "Group name is required." },
    { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
  ]);
  const isFormValid = !nameError;

  const handleSave = async () => {
    if (!isFormValid) return;
    try {
      setIsSaving(true);
      const body = {
        name: name.trim(),
        selection_type: selectionType,
        min_selections: Math.max(0, minSelections),
        max_selections: Math.max(0, maxSelections),
        is_required: isRequired,
        sort_order: Math.max(0, sortOrder),
        translations: description.trim()
          ? {
              de: { name: name.trim(), description: description.trim() },
              en: { name: name.trim(), description: description.trim() },
            }
          : undefined,
      };

      let id = groupId;
      if (!id) {
        const created = await orderzillaApi.dashboard.extras.create({ body });
        id = created?.id ?? "";
        if (!id) throw new Error("Failed to create group id");
        setGroupId(id);
      } else {
        await orderzillaApi.dashboard.extras.update(id, { body });
      }

      await syncOptions(id);
      toast.success(`Extra group ${isEditMode ? "updated" : "created"} successfully.`);
      router.push("/dashboard/extra-groups");
    } catch {
      toast.error("Failed to save extra group.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!groupId) {
      resetForm();
      return;
    }
    if (!window.confirm("Delete this extra group?")) return;
    try {
      setIsDeleting(true);
      await orderzillaApi.dashboard.extras.remove(groupId);
      toast.success("Extra group deleted.");
      router.push("/dashboard/extra-groups");
    } catch {
      toast.error("Failed to delete extra group.");
    } finally {
      setIsDeleting(false);
    }
  };

  const previewOptions = useMemo(
    () => options.filter((option) => option.name.trim().length > 0),
    [options],
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/extra-groups" className="text-[13px] text-[#67707d]">
              ← Back to Extra Groups
            </Link>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              {isEditMode ? "Edit Extra Group" : "Create Extra Group"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/extra-groups")}
              className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 text-[14px] font-semibold text-[#cf4a4a]"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_0.9fr] gap-3">
          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
            <section>
              <h2 className="text-[31px] font-bold text-[#1a212c]">Basic Information</h2>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Group Name</label>
                  <ValidatedInput
                    value={name}
                    onChange={setName}
                    rules={[
                      { type: "required", message: "Group name is required." },
                      { type: "minLength", value: 2, message: "Name must be at least 2 characters." },
                    ]}
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none focus:border-[#c0eb1a]"
                    placeholder="e.g., Burger Modifiers"
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">
                    Description <span className="font-normal text-[#7a8291]">optional</span>
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the extra group..."
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 border-t border-[#eceff3] pt-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Configuration</h2>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-[#363f4c]">Type</p>
                  <div className="mt-2 flex items-center gap-4 text-[15px] text-[#2f3743]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        checked={!isRequired}
                        onChange={() => setIsRequired(false)}
                      />
                      <span>Optional</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        checked={isRequired}
                        onChange={() => setIsRequired(true)}
                      />
                      <span>Required</span>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#363f4c]">Selection Type</p>
                  <div className="mt-2 flex items-center gap-4 text-[15px] text-[#2f3743]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selection"
                        checked={selectionType === "SINGLE"}
                        onChange={() => setSelectionType("SINGLE")}
                      />
                      <span>Single</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selection"
                        checked={selectionType === "MULTIPLE"}
                        onChange={() => setSelectionType("MULTIPLE")}
                      />
                      <span>Multi-select</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Min selection limit</label>
                  <input
                    type="number"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    value={minSelections}
                    onChange={(e) => setMinSelections(Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Max selection limit</label>
                  <input
                    type="number"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    value={maxSelections}
                    onChange={(e) => setMaxSelections(Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Sort order</label>
                  <input
                    type="number"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 border-t border-[#eceff3] pt-3">
              <h2 className="text-[31px] font-bold text-[#1a212c]">Options Table</h2>
              <div className="mt-2 rounded-lg border border-[#e4e6ea] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
                    <tr className="text-[13px] text-[#6e7785] text-left">
                      <th className="px-3 py-2 w-9" />
                      <th className="px-2 py-2 font-semibold">Option Name</th>
                      <th className="px-2 py-2 font-semibold">Price (optional)</th>
                      <th className="px-3 py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((row, index) => (
                      <tr key={row.localId} className="border-b last:border-b-0 border-[#edf0f4]">
                        <td className="px-3 py-2 text-[#a0a7b2]">
                          <GripVertical size={16} />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className={`h-9 w-full rounded-lg border px-3 text-[14px] outline-none ${
                              index === 0 ? "border-[#8ac791]" : "border-[#dfe3e8]"
                            }`}
                            value={row.name}
                            onChange={(e) => updateOption(row.localId, "name", e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                            value={row.priceAdd}
                            onChange={(e) => updateOption(row.localId, "priceAdd", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setOptions((prev) =>
                                prev.length <= 1 ? prev : prev.filter((opt) => opt.localId !== row.localId),
                              )
                            }
                            className="rounded border border-[#efc3c3] px-2 py-1 text-[12px] font-semibold text-[#cf4a4a]"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setOptions((prev) => [...prev, makeOptionRow(prev.length)])}
                className="mt-2 h-10 w-full rounded-lg border border-[#dfe3e8] bg-white inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-[#3f4653]"
              >
                <Plus size={15} />
                Add Option
              </button>
            </section>
          </article>

          <article className="rounded-xl border border-[#e4e6ea] bg-white p-3 h-fit">
            <div className="h-24 rounded-lg bg-[#f3f5f8] flex items-center justify-center text-[#8c95a3]">
              🍔
            </div>
            <h3 className="text-[36px] leading-tight font-extrabold text-[#1a2029] mt-3">
              {name || "Extra Group"} ({isRequired ? "Required" : "Optional"})
            </h3>
            <div className="mt-2 space-y-1 text-[16px] text-[#2f3743]">
              {previewOptions.length === 0 ? (
                <p className="text-[14px] text-[#7a8291]">No options added yet.</p>
              ) : (
                previewOptions.map((option) => (
                  <div key={option.localId} className="flex items-center justify-between">
                    <span>□ {option.name}</span>
                    <span>(+ {option.priceAdd || "0.00"})</span>
                  </div>
                ))
              )}
            </div>
            <p className="mt-2 text-[14px] text-[#7a8291]">
              Select {minSelections} to {maxSelections} option(s).
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

