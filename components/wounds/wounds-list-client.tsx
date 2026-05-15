"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import WoundCard from "@/components/wounds/wound-card";
import CSVDownloadButton from "@/components/pdf/csv-download-button";

type Wound = {
  id: string;
  woundNumber: string;
  location: string;
  woundType: string;
  onsetDate: Date;
  status: string;
  latestMeasurements?: {
    length: number | null;
    width: number | null;
    depth: number | null;
    area: number | null;
    healing_status: string | null;
  };
  latestPhoto?: string;
  recentVisits?: {
    id: string;
    visit_date: string;
    healing_status: string | null;
  }[];
  woundNotes?: {
    id: string;
    note: string;
    created_at: string;
  }[];
};

type WoundsListClientProps = {
  wounds: Wound[];
  patientId: string;
};

export function WoundsListClient({ wounds, patientId }: WoundsListClientProps) {
  const [sortBy, setSortBy] = useState<
    "recent" | "oldest" | "location" | "status"
  >("recent");
  const [filterBy, setFilterBy] = useState<"all" | "active" | "healed">("all");

  // Filter wounds
  const filteredWounds = useMemo(() => {
    if (filterBy === "all") return wounds;
    if (filterBy === "active")
      return wounds.filter((w) => w.status === "active");
    if (filterBy === "healed")
      return wounds.filter((w) => w.status === "healed");
    return wounds;
  }, [wounds, filterBy]);

  // Sort wounds
  const sortedWounds = useMemo(() => {
    const sorted = [...filteredWounds];

    switch (sortBy) {
      case "recent":
        // Sort by most recent activity (last visit or last note)
        return sorted.sort((a, b) => {
          const aLastActivity =
            a.recentVisits?.[0]?.visit_date ||
            a.woundNotes?.[0]?.created_at ||
            a.onsetDate.toString();
          const bLastActivity =
            b.recentVisits?.[0]?.visit_date ||
            b.woundNotes?.[0]?.created_at ||
            b.onsetDate.toString();
          return (
            new Date(bLastActivity).getTime() -
            new Date(aLastActivity).getTime()
          );
        });

      case "oldest":
        // Sort by onset date (oldest first)
        return sorted.sort(
          (a, b) =>
            new Date(a.onsetDate).getTime() - new Date(b.onsetDate).getTime()
        );

      case "location":
        // Sort alphabetically by location
        return sorted.sort((a, b) => a.location.localeCompare(b.location));

      case "status":
        // Sort by status (active first, then healed)
        return sorted.sort((a, b) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (a.status !== "active" && b.status === "active") return 1;
          return 0;
        });

      default:
        return sorted;
    }
  }, [filteredWounds, sortBy]);

  const activeCount = wounds.filter((w) => w.status === "active").length;
  const healedCount = wounds.filter((w) => w.status === "healed").length;

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {activeCount} Active
          </Badge>
          {healedCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {healedCount} Healed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <Select
            value={filterBy}
            onValueChange={(value) =>
              setFilterBy(value as "all" | "active" | "healed")
            }
          >
            <SelectTrigger className="w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wounds</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="healed">Healed Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select
            value={sortBy}
            onValueChange={(value) =>
              setSortBy(value as "recent" | "oldest" | "location" | "status")
            }
          >
            <SelectTrigger className="w-[140px] text-xs">
              <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent Activity</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="location">By Location</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </SelectContent>
          </Select>

          {wounds.length > 0 && (
            <CSVDownloadButton
              type="wounds"
              patientId={patientId}
              variant="ghost"
              size="sm"
            />
          )}

          <Link href={`/dashboard/patients/${patientId}/wounds/new`}>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </Link>
        </div>
      </div>

      {/* Wounds List */}
      {sortedWounds.length > 0 ? (
        <div className="space-y-3">
          {sortedWounds.map((wound) => (
            <WoundCard
              key={wound.id}
              wound={wound}
              patientId={patientId}
              latestMeasurements={wound.latestMeasurements}
              latestPhoto={wound.latestPhoto}
              recentVisits={wound.recentVisits}
              notes={wound.woundNotes}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {filterBy === "all"
              ? "No wounds recorded"
              : filterBy === "active"
                ? "No active wounds"
                : "No healed wounds"}
          </p>
          {filterBy !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterBy("all")}
            >
              View All Wounds
            </Button>
          )}
          {filterBy === "all" && (
            <Link href={`/dashboard/patients/${patientId}/wounds/new`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add First Wound
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
