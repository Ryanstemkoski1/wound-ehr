import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-8 w-full max-w-xs sm:h-9" />
          <Skeleton className="h-4 w-full max-w-sm sm:h-5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 sm:w-32" />
          <Skeleton className="h-10 w-24 sm:w-32" />
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-full sm:w-[250px]" />
          </div>
        </CardContent>
      </Card>

      {/* Patient List - Responsive Grid */}
      <div>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-full max-w-[200px]" />
                      <Skeleton className="h-4 w-full max-w-[150px]" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full max-w-[180px]" />
                    <Skeleton className="h-3 w-full max-w-40" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
