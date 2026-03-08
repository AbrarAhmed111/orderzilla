"use client";

import Link from "next/link";
import { Ellipsis, GripVertical, Plus } from "lucide-react";

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        on ? "bg-[#d7ff3f] border-[#c9f339]" : "bg-[#eceef2] border-[#dde2ea]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </span>
  );
}

export default function CreateExtraGroupPage() {
  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/extra-groups" className="text-[13px] text-[#67707d]">
              ← Back to Extra Groups
            </Link>
            <h1 className="text-[44px] leading-none font-extrabold text-[#1a2029] mt-1">
              Create Extra Group
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
              className="h-10 rounded-lg bg-[#d4ff00] px-6 text-[14px] font-semibold text-[#1d2512]"
            >
              Save
            </button>
            <button
              type="button"
              className="h-10 rounded-lg border border-[#efc3c3] bg-white px-4 text-[14px] font-semibold text-[#cf4a4a]"
            >
              Delete
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
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#8ac791] px-3 text-[14px] outline-none"
                    defaultValue="e.g., Burger Modifiers"
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">
                    Description <span className="font-normal text-[#7a8291]">optional</span>
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#dfe3e8] px-3 py-2 text-[14px] outline-none"
                    rows={2}
                    placeholder="Describe the extra group..."
                  />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[14px] font-semibold text-[#363f4c]">Active</p>
                <div className="mt-1 flex items-center gap-2">
                  <Toggle on />
                  <span className="text-[16px] font-semibold text-[#2f3743]">On</span>
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
                      <input type="radio" name="type" defaultChecked />
                      <span>Optional</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="type" />
                      <span>Required</span>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#363f4c]">Selection Type</p>
                  <div className="mt-2 flex items-center gap-4 text-[15px] text-[#2f3743]">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="selection" />
                      <span>Single</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="selection" defaultChecked />
                      <span>Multi-select</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Min selection limit</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    defaultValue="0"
                  />
                </div>
                <div>
                  <label className="text-[14px] font-semibold text-[#363f4c]">Max selection limit</label>
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                    defaultValue="10"
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
                      <th className="px-2 py-2 font-semibold">Active</th>
                      <th className="px-3 py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Extra Cheese", price: "$1.50" },
                      { name: "Bacon", price: "$2.00" },
                      { name: "Avocado", price: "$2.50" },
                    ].map((row, index) => (
                      <tr key={row.name} className="border-b last:border-b-0 border-[#edf0f4]">
                        <td className="px-3 py-2 text-[#a0a7b2]">
                          <GripVertical size={16} />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className={`h-9 w-full rounded-lg border px-3 text-[14px] outline-none ${
                              index === 0 ? "border-[#8ac791]" : "border-[#dfe3e8]"
                            }`}
                            defaultValue={row.name}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className="h-9 w-full rounded-lg border border-[#dfe3e8] px-3 text-[14px] outline-none"
                            defaultValue={row.price}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Toggle on />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" className="text-[#808998]">
                            <Ellipsis size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
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
              Burger Modifiers (Optional)
            </h3>
            <div className="mt-2 space-y-1 text-[16px] text-[#2f3743]">
              <div className="flex items-center justify-between">
                <span>□ Extra Cheese</span>
                <span>(+ $1.50)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>□ Bacon</span>
                <span>(+ $2.00)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>□ Avocado</span>
                <span>(+ $2.50)</span>
              </div>
            </div>
            <p className="mt-2 text-[14px] text-[#7a8291]">Select up to 10 options.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

