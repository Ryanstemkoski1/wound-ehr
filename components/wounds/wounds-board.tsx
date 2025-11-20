"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Minus,
  Search,
  ExternalLink,
  MapPin,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Wound = {
  id: string;
  wound_number: string;
  location: string;
  wound_type: string;
  status: string;
  created_at: string;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    facility: {
      id: string;
      name: string;
    };
  };
  latestAssessment: {
    created_at: string;
    healing_status: string;
    length: string;
    width: string;
  } | null;
};

type WoundsBoardProps = {
  wounds: Wound[];
};

export function WoundsBoard({ wounds }: WoundsBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [healingFilter, setHealingFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string>("all"); // all, active, healing, critical
  const [sortBy, setSortBy] = useState<string>("recent");

  // Get unique locations and healing statuses for filters
  const uniqueLocations = useMemo(() => {
    const locations = new Set(wounds.map((w) => w.location));
    return Array.from(locations).sort();
  }, [wounds]);

  // Filter and sort wounds
  const filteredWounds = useMemo(() => {
    let filtered = wounds;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.patient.first_name.toLowerCase().includes(query) ||
          w.patient.last_name.toLowerCase().includes(query) ||
          w.location.toLowerCase().includes(query) ||
          w.wound_type.toLowerCase().includes(query) ||
          w.wound_number.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter((w) => w.location === locationFilter);
    }

    // Healing status filter
    if (healingFilter !== "all") {
      filtered = filtered.filter(
        (w) => w.latestAssessment?.healing_status === healingFilter
      );
    }

    // Quick filter (from stat cards)
    if (quickFilter === "healing") {
      filtered = filtered.filter(
        (w) =>
          w.latestAssessment?.healing_status === "Improving" ||
          w.latestAssessment?.healing_status === "Healing"
      );
    } else if (quickFilter === "critical") {
      filtered = filtered.filter(
        (w) =>
          w.latestAssessment?.healing_status === "Deteriorating" ||
          w.latestAssessment?.healing_status === "Worsening"
      );
    } else if (quickFilter === "active") {
      filtered = filtered.filter((w) => w.status === "active");
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "patient":
          return `${a.patient.last_name} ${a.patient.first_name}`.localeCompare(
            `${b.patient.last_name} ${b.patient.first_name}`
          );
        case "location":
          return a.location.localeCompare(b.location);
        case "assessment":
          if (!a.latestAssessment && !b.latestAssessment) return 0;
          if (!a.latestAssessment) return 1;
          if (!b.latestAssessment) return -1;
          return (
            new Date(b.latestAssessment.created_at).getTime() -
            new Date(a.latestAssessment.created_at).getTime()
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    wounds,
    searchQuery,
    statusFilter,
    locationFilter,
    healingFilter,
    quickFilter,
    sortBy,
  ]);

  // Stats
  const stats = {
    total: wounds.length,
    active: wounds.filter((w) => w.status === "active").length,
    healing: wounds.filter(
      (w) =>
        w.latestAssessment?.healing_status === "Improving" ||
        w.latestAssessment?.healing_status === "Healing"
    ).length,
    critical: wounds.filter(
      (w) =>
        w.latestAssessment?.healing_status === "Deteriorating" ||
        w.latestAssessment?.healing_status === "Worsening"
    ).length,
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-teal-500/10 text-teal-700 dark:text-teal-400";
      case "healing":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "healed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "closed":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getHealingStatusBadge = (status: string) => {
    const isImproving =
      status === "Improving" || status === "Healing" || status === "Initial";
    const isDeteriorating =
      status === "Deteriorating" || status === "Worsening";

    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1",
          isImproving && "border-green-500 text-green-700 dark:text-green-400",
          isDeteriorating && "border-red-500 text-red-700 dark:text-red-400",
          !isImproving &&
            !isDeteriorating &&
            "border-amber-500 text-amber-700 dark:text-amber-400"
        )}
      >
        {isImproving && <TrendingUp className="h-3 w-3" />}
        {isDeteriorating && <TrendingDown className="h-3 w-3" />}
        {!isImproving && !isDeteriorating && <Minus className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  const formatLocation = (location: string) => {
    return location
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer transition-all hover:border-teal-500 hover:shadow-md"
          onClick={() => {
            setQuickFilter("all");
            setStatusFilter("all");
            setHealingFilter("all");
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-teal-500 hover:shadow-md"
          onClick={() => {
            setQuickFilter("active");
            setStatusFilter("all");
            setHealingFilter("all");
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-green-500 hover:shadow-md"
          onClick={() => {
            setQuickFilter("healing");
            setStatusFilter("all");
            setHealingFilter("all");
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Healing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.healing}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-red-500 hover:shadow-md"
          onClick={() => {
            setQuickFilter("critical");
            setStatusFilter("all");
            setHealingFilter("all");
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.critical}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter wounds across all patients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient, location, or wound type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Wound Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="healing">Healing</SelectItem>
                <SelectItem value="healed">Healed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {formatLocation(loc)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="patient">Patient Name</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="assessment">Last Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredWounds.length} of {wounds.length} wounds
            </span>
            {(searchQuery ||
              statusFilter !== "all" ||
              locationFilter !== "all" ||
              quickFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setLocationFilter("all");
                  setQuickFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wounds List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWounds.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No wounds found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "No wounds to display"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredWounds.map((wound) => {
            const patient = Array.isArray(wound.patient)
              ? wound.patient[0]
              : wound.patient;
            const facility = Array.isArray(patient.facility)
              ? patient.facility[0]
              : patient.facility;

            return (
              <Card
                key={wound.id}
                className="group hover:border-teal-500 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        Wound {wound.wound_number}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatLocation(wound.location)}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(wound.status)}>
                      {wound.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Patient Info */}
                  <div>
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="font-medium hover:text-teal-600 transition-colors"
                    >
                      {patient.first_name} {patient.last_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {facility.name}
                    </p>
                  </div>

                  {/* Wound Type */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{wound.wound_type}</Badge>
                  </div>

                  {/* Latest Assessment */}
                  {wound.latestAssessment ? (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Latest Assessment
                        </span>
                        {getHealingStatusBadge(
                          wound.latestAssessment.healing_status
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Size:</span>{" "}
                          {wound.latestAssessment.length} ×{" "}
                          {wound.latestAssessment.width} cm
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(wound.latestAssessment.created_at),
                            { addSuffix: true }
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                      No assessments yet
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link href={`/dashboard/patients/${patient.id}`}>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View Patient
                      </Link>
                    </Button>
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(wound.created_at))}{" "}
                    ago
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
