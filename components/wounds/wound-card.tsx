import Link from "next/link";
import { Calendar, MapPin, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WoundActions from "./wound-actions";

type WoundCardProps = {
  wound: {
    id: string;
    woundNumber: string;
    location: string;
    woundType: string;
    onsetDate: Date;
    status: string;
  };
  patientId: string;
};

const WOUND_TYPE_LABELS: Record<string, string> = {
  pressure_injury: "Pressure Injury",
  diabetic: "Diabetic",
  surgical: "Surgical",
  venous: "Venous",
  arterial: "Arterial",
  traumatic: "Traumatic",
  burn: "Burn",
  other: "Other",
};

const LOCATION_LABELS: Record<string, string> = {
  head: "Head",
  neck: "Neck",
  chest: "Chest",
  abdomen: "Abdomen",
  back: "Back",
  sacrum: "Sacrum",
  coccyx: "Coccyx",
  left_shoulder: "Left Shoulder",
  right_shoulder: "Right Shoulder",
  left_arm: "Left Arm",
  right_arm: "Right Arm",
  left_elbow: "Left Elbow",
  right_elbow: "Right Elbow",
  left_forearm: "Left Forearm",
  right_forearm: "Right Forearm",
  left_hand: "Left Hand",
  right_hand: "Right Hand",
  left_hip: "Left Hip",
  right_hip: "Right Hip",
  left_thigh: "Left Thigh",
  right_thigh: "Right Thigh",
  left_knee: "Left Knee",
  right_knee: "Right Knee",
  left_leg: "Left Leg",
  right_leg: "Right Leg",
  left_ankle: "Left Ankle",
  right_ankle: "Right Ankle",
  left_foot: "Left Foot",
  right_foot: "Right Foot",
  left_heel: "Left Heel",
  right_heel: "Right Heel",
  other: "Other",
};

export default function WoundCard({ wound, patientId }: WoundCardProps) {
  const statusVariant =
    wound.status === "active"
      ? "default"
      : wound.status === "healed"
        ? "secondary"
        : "outline";

  const statusColor =
    wound.status === "active"
      ? "border-l-amber-500"
      : wound.status === "healed"
        ? "border-l-green-500"
        : "border-l-zinc-400";

  const iconBg =
    wound.status === "active"
      ? "bg-linear-to-br from-amber-500/10 to-orange-500/10 ring-1 ring-amber-500/20"
      : wound.status === "healed"
        ? "bg-linear-to-br from-green-500/10 to-emerald-500/10 ring-1 ring-green-500/20"
        : "bg-zinc-100 dark:bg-zinc-800";

  const iconColor =
    wound.status === "active"
      ? "text-amber-600 dark:text-amber-400"
      : wound.status === "healed"
        ? "text-green-600 dark:text-green-400"
        : "text-zinc-500";

  const daysSinceOnset = Math.floor(
    (new Date().getTime() - new Date(wound.onsetDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className={`hover-lift group relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-md ${statusColor}`}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-zinc-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-zinc-900/50" />

      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
            >
              <Activity className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                <Link
                  href={`/dashboard/patients/${patientId}/wounds/${wound.id}`}
                  className="transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  {wound.woundNumber}
                </Link>
              </CardTitle>
              <CardDescription className="mt-1 font-medium">
                {WOUND_TYPE_LABELS[wound.woundType] || wound.woundType}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className="font-semibold">
              {wound.status}
            </Badge>
            <WoundActions wound={wound} patientId={patientId} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-2.5">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/50">
          <MapPin className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {LOCATION_LABELS[wound.location] || wound.location}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Calendar className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <span>Onset: {new Date(wound.onsetDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Activity className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <span className="font-semibold">{daysSinceOnset} days old</span>
        </div>
      </CardContent>
    </Card>
  );
}
