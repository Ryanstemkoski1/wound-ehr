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

  const daysSinceOnset = Math.floor(
    (new Date().getTime() - new Date(wound.onsetDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              <Link
                href={`/dashboard/patients/${patientId}/wounds/${wound.id}`}
                className="hover:underline"
              >
                {wound.woundNumber}
              </Link>
            </CardTitle>
            <CardDescription>
              {WOUND_TYPE_LABELS[wound.woundType] || wound.woundType}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{wound.status}</Badge>
            <WoundActions wound={wound} patientId={patientId} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          <span>{LOCATION_LABELS[wound.location] || wound.location}</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>Onset: {new Date(wound.onsetDate).toLocaleDateString()}</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          <span>{daysSinceOnset} days old</span>
        </div>
      </CardContent>
    </Card>
  );
}
