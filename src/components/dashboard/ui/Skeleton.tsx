"use client";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-[#eef1f5] ${className ?? ""}`} />;
}

export function TableSkeleton({ rows = 6, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#e4e6ea]">
      <table className="w-full min-w-[900px]">
        <thead className="bg-[#f8f9fb] border-b border-[#e9ebef]">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={`head-${index}`} className="px-3 py-2">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-b border-[#edf0f4] last:border-b-0">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={`cell-${rowIndex}-${colIndex}`} className="px-3 py-3">
                  <Skeleton className="h-4 w-full max-w-[140px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

