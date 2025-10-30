import { Skeleton } from "@/components/ui/skeleton";

export function FormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Skeleton className="h-10 w-full sm:w-24" />
        <Skeleton className="h-10 w-full sm:w-24" />
      </div>
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-muted hidden gap-4 rounded-lg p-4 sm:flex">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:gap-4"
        >
          {[...Array(5)].map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-full max-w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function ChartLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-full max-w-48" />
        <Skeleton className="h-4 w-full max-w-64" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  );
}
