"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Trash2, UploadCloud } from "lucide-react";

function Toggle({ checked }: { checked: boolean }) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        checked ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function CreateCategoryPage() {
  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/categories" className="text-[13px] text-[#67707d]">
              ← Back to Categories
            </Link>
            <h1 className="text-[42px] leading-none font-extrabold text-[#1a2029] mt-1">
              Create Category
            </h1>
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
              className="h-10 rounded-lg bg-[#d4ff00] px-4 text-[14px] font-semibold text-[#1d2512]"
            >
              Save Category
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#cf4a4a]"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[2fr_1.1fr] gap-3">
          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[30px] font-bold text-[#1a212c]">Basic Information</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Category Name</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#8ac791] px-3 text-[14px] outline-none"
                    defaultValue="b.g., Burgers"
                  />
                  <p className="mt-1 text-[12px] text-[#7d8694]">Enter e-input&apos;s category name.</p>
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">
                    Slug / Internal ID <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    defaultValue="burgers"
                  />
                  <p className="mt-1 text-[12px] text-[#7d8694]">Describe the category method.</p>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[14px] font-semibold text-[#363f4c]">Description</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none"
                  rows={3}
                  placeholder="Describe the category..."
                />
              </div>

              <div className="mt-3">
                <label className="text-[14px] font-semibold text-[#363f4c]">Category Image</label>
                <div className="mt-1 h-28 rounded-lg border border-dashed border-[#dfe3e8] bg-[#fafbfc] flex flex-col items-center justify-center text-[#7a8392]">
                  <UploadCloud size={22} />
                  <p className="text-[14px] mt-1">
                    Drag and drop an image here, or click to browse.
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-[#4f3320] to-[#b56c2f]" />
                  <button
                    type="button"
                    className="h-10 rounded-lg border border-[#dfe3e8] bg-white px-4 text-[14px] font-semibold text-[#414855]"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 text-[14px] font-semibold text-[#cf4a4a]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[30px] font-bold text-[#1a212c]">Display & Ordering</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Display Order</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    defaultValue="0"
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Parent Category</label>
                  <button
                    type="button"
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 inline-flex items-center justify-between text-[14px] text-[#8b93a1]"
                  >
                    <span>Select parent...</span>
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2f3743]">Show in POS</span>
                  <Toggle checked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2f3743]">Show in Kiosk</span>
                  <Toggle checked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2f3743]">Highlighted Category</span>
                  <Toggle checked={false} />
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-3">
            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[30px] font-bold text-[#1a212c]">Availability Rules</h2>
              <div className="mt-3 space-y-2 text-[15px]">
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability" defaultChecked />
                  <span>Always Available</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="availability" />
                  <span>Scheduled Availability</span>
                </label>
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#4d5563]">Day-of-week</p>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <span
                    key={day}
                    className="h-8 rounded-md bg-[#d8ff43] text-[13px] font-semibold text-[#253016] flex items-center justify-center"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#4d5563]">Time range picker</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="Start time"
                />
                <span className="text-[#9aa3ae]">-</span>
                <input
                  className="h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]"
                  placeholder="End time"
                />
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <h2 className="text-[30px] font-bold text-[#1a212c]">Location Assignment</h2>
              <p className="mt-3 text-[14px] font-semibold text-[#4d5563]">Locations</p>
              <button
                type="button"
                className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 inline-flex items-center justify-between text-[14px] text-[#2f3743]"
              >
                <span>All Locations</span>
                <ChevronDown size={14} />
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Downtown", "Westside", "Cormury"].map((loc) => (
                  <span
                    key={loc}
                    className="rounded-md border border-[#dfe3e8] bg-[#f6f8fa] px-2 py-1 text-[13px] text-[#3f4653]"
                  >
                    {loc} ×
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[#e4e6ea] bg-white p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[30px] font-bold text-[#1a212c]">SEO / Metadata</h2>
                <ChevronUp size={16} className="text-[#7f8896]" />
              </div>
              <p className="mt-2 text-[14px] font-semibold text-[#4d5563]">Preview snippet</p>
              <div className="mt-1 rounded-lg border border-[#dfe3e8] p-3 bg-[#fbfcfd]">
                <p className="text-[18px] font-semibold text-[#355caa]">
                  Search result for inners - Orderzilla
                </p>
                <p className="text-[13px] text-[#6e7785]">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                  eiusmod Tempor incididunt ut labore et dolore
                </p>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[14px] font-semibold text-[#4d5563]">Meta Title</label>
                  <input className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px]" />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#4d5563]">Meta Description</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px]"
                    rows={3}
                  />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

