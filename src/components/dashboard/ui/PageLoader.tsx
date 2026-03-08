export default function PageLoader() {
  return (
    <div className="p-4">
      <div className="animate-pulse rounded-2xl border border-[#e5e7eb] bg-white p-4">
        <div className="h-8 w-56 rounded bg-[#eef1f5]" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="h-28 rounded-lg bg-[#eef1f5]" />
          <div className="h-28 rounded-lg bg-[#eef1f5]" />
          <div className="h-28 rounded-lg bg-[#eef1f5]" />
        </div>
        <div className="mt-4 h-64 rounded-lg bg-[#eef1f5]" />
      </div>
    </div>
  );
}

