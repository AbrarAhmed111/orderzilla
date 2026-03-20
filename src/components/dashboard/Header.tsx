"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SelectMenu from "@/components/dashboard/ui/SelectMenu";
import { orderzillaApi } from "@/lib/api";

type TimelineFilter = "today" | "last7" | "last30" | "thisMonth" | "all";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locationOptions, setLocationOptions] = useState<Array<{ label: string; value: string }>>([
    { label: "All Locations", value: "all" },
  ]);

  const timelineParam = searchParams.get("timeline");
  const locationParam = searchParams.get("location");
  const selectedTimeline: TimelineFilter =
    timelineParam === "today" ||
    timelineParam === "last7" ||
    timelineParam === "last30" ||
    timelineParam === "thisMonth" ||
    timelineParam === "all"
      ? timelineParam
      : "all";
  const selectedLocation = locationParam ?? "all";

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await orderzillaApi.dashboard.locations.list();
        const locations = (response?.locations ?? []) as Array<{ id?: string; name?: string }>;
        setLocationOptions([
          { label: "All Locations", value: "all" },
          ...locations
            .filter((loc) => Boolean(loc.id))
            .map((loc) => ({
              label: loc.name ?? "Unnamed location",
              value: loc.id ?? "",
            })),
        ]);
      } catch {
        setLocationOptions([{ label: "All Locations", value: "all" }]);
      }
    };
    fetchLocations();
  }, []);

  const updateQuery = (next: { timeline?: string; location?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    const timeline = next.timeline ?? selectedTimeline;
    const location = next.location ?? selectedLocation;

    if (timeline === "all") params.delete("timeline");
    else params.set("timeline", timeline);

    if (location === "all") params.delete("location");
    else params.set("location", location);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <header className="sticky top-0 z-20 min-h-[56px] sm:h-[68px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-0 border-b border-[#e6e7ea] bg-[#f7f8fa]">
      <h2 className="text-[24px] sm:text-[34px] leading-none font-extrabold text-[#1a1f27]">
        Dashboard
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <SelectMenu
          value={selectedTimeline}
          onChange={(value) => updateQuery({ timeline: value })}
          options={[
            { label: "Today", value: "today" },
            { label: "Last 7 days", value: "last7" },
            { label: "Last 30 days", value: "last30" },
            { label: "This month", value: "thisMonth" },
            { label: "All time", value: "all" },
          ]}
          className="min-w-[120px] sm:min-w-[150px]"
        />
        <SelectMenu
          value={selectedLocation}
          onChange={(value) => updateQuery({ location: value })}
          options={locationOptions}
          className="min-w-[120px] sm:min-w-[170px]"
        />
      </div>
    </header>
  );
}

