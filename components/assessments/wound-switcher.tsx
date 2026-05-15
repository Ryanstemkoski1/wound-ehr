"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Wound = {
  id: string;
  woundNumber: string;
  location: string;
  woundType: string;
};

type WoundSwitcherProps = {
  wounds: Wound[];
  activeWoundId: string;
  completedWoundIds: Set<string>;
  onWoundChange: (woundId: string) => void;
  className?: string;
};

export function WoundSwitcher({
  wounds,
  activeWoundId,
  completedWoundIds,
  onWoundChange,
  className,
}: WoundSwitcherProps) {
  const useTabs = wounds.length <= 5;
  const activeIndex = wounds.findIndex((w) => w.id === activeWoundId);
  const progress = {
    completed: completedWoundIds.size,
    total: wounds.length,
    percentage: Math.round((completedWoundIds.size / wounds.length) * 100),
  };

  if (useTabs) {
    // Tabs layout for 2-5 wounds
    return (
      <div className={cn("space-y-4", className)}>
        {/* Progress indicator */}
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              Wound {activeIndex + 1} of {wounds.length}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {progress.completed} / {progress.total} completed (
              {progress.percentage}%)
            </span>
          </div>
          <div className="bg-secondary flex h-2 w-32 overflow-hidden rounded-full">
            <div
              className="bg-teal-600 transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeWoundId} onValueChange={onWoundChange}>
          <TabsList
            className="grid h-auto w-full"
            style={{ gridTemplateColumns: `repeat(${wounds.length}, 1fr)` }}
          >
            {wounds.map((wound) => {
              const isCompleted = completedWoundIds.has(wound.id);
              return (
                <TabsTrigger
                  key={wound.id}
                  value={wound.id}
                  className="relative flex items-center justify-center gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                >
                  {isCompleted && (
                    <Check className="h-4 w-4 text-teal-600 data-[state=active]:text-white" />
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">
                      Wound {wound.woundNumber}
                    </span>
                    <span className="text-xs opacity-80">{wound.location}</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    );
  }

  // Sidebar layout for 6+ wounds
  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress indicator */}
      <div className="bg-muted/50 rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Assessment Progress</span>
          <Badge variant="secondary">
            {progress.completed} / {progress.total}
          </Badge>
        </div>
        <div className="bg-secondary flex h-2 overflow-hidden rounded-full">
          <div
            className="bg-teal-600 transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {progress.percentage}% complete
        </p>
      </div>

      {/* Sidebar wound list */}
      <div className="h-[400px] overflow-y-auto rounded-lg border">
        <div className="space-y-1 p-2">
          {wounds.map((wound, index) => {
            const isActive = wound.id === activeWoundId;
            const isCompleted = completedWoundIds.has(wound.id);

            return (
              <Button
                key={wound.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 text-left",
                  isActive && "bg-teal-600 hover:bg-teal-700"
                )}
                onClick={() => onWoundChange(wound.id)}
              >
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="bg-background flex h-6 w-6 items-center justify-center rounded-full border-2">
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      Wound {wound.woundNumber}
                    </span>
                    <span className="text-xs opacity-80">{wound.location}</span>
                    <span className="text-xs opacity-60">
                      {wound.woundType}
                    </span>
                  </div>
                </div>
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
