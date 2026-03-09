// AI Usage Tracking
// Phase 11.1.5 - Monthly usage tracking per clinician for cost optimization

import { createClient } from "@/lib/supabase/server";

// =====================================================
// TYPES
// =====================================================

export type UsageSummary = {
  period: string; // YYYY-MM format
  totalTranscriptions: number;
  totalDurationMinutes: number;
  totalCostTranscription: number;
  totalCostLlm: number;
  totalCost: number;
  averageDurationMinutes: number;
  averageCostPerTranscription: number;
};

export type ClinicianUsage = {
  userId: string;
  userName?: string;
  email?: string;
  summary: UsageSummary;
};

export type UsageWarning = {
  type: "duration" | "cost" | "count";
  level: "info" | "warning" | "critical";
  message: string;
};

// =====================================================
// THRESHOLDS
// =====================================================

/** Monthly cost warning thresholds per clinician */
const COST_THRESHOLDS = {
  INFO: 25, // $25/month — informational
  WARNING: 50, // $50/month — warning
  CRITICAL: 100, // $100/month — critical
};

/** Monthly transcription count thresholds */
const COUNT_THRESHOLDS = {
  INFO: 50,
  WARNING: 100,
  CRITICAL: 200,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Get usage summary for a specific user and month
 */
export async function getUserMonthlyUsage(
  userId: string,
  month?: string // YYYY-MM format, defaults to current month
): Promise<UsageSummary> {
  const supabase = await createClient();
  const period = month || getCurrentMonth();
  const { startDate, endDate } = getMonthRange(period);

  const { data, error } = await supabase
    .from("visit_transcripts")
    .select(
      `
      id,
      audio_duration_seconds,
      cost_transcription,
      cost_llm,
      created_at,
      visit:visits!inner(clinician_id)
    `
    )
    .eq("visit.clinician_id", userId)
    .gte("created_at", startDate)
    .lt("created_at", endDate)
    .in("processing_status", ["completed", "processing", "pending"]);

  if (error) {
    console.error("Usage query error:", error);
    return emptyUsageSummary(period);
  }

  const records = data || [];
  const totalDurationSeconds = records.reduce(
    (sum, r) => sum + ((r.audio_duration_seconds as number) || 0),
    0
  );
  const totalCostTranscription = records.reduce(
    (sum, r) => sum + ((r.cost_transcription as number) || 0),
    0
  );
  const totalCostLlm = records.reduce(
    (sum, r) => sum + ((r.cost_llm as number) || 0),
    0
  );

  const totalTranscriptions = records.length;
  const totalDurationMinutes = totalDurationSeconds / 60;
  const totalCost = totalCostTranscription + totalCostLlm;

  return {
    period,
    totalTranscriptions,
    totalDurationMinutes: Math.round(totalDurationMinutes * 10) / 10,
    totalCostTranscription: Math.round(totalCostTranscription * 1000) / 1000,
    totalCostLlm: Math.round(totalCostLlm * 1000) / 1000,
    totalCost: Math.round(totalCost * 100) / 100,
    averageDurationMinutes:
      totalTranscriptions > 0
        ? Math.round((totalDurationMinutes / totalTranscriptions) * 10) / 10
        : 0,
    averageCostPerTranscription:
      totalTranscriptions > 0
        ? Math.round((totalCost / totalTranscriptions) * 100) / 100
        : 0,
  };
}

/**
 * Get usage for all clinicians in the current month (admin view)
 */
export async function getAllClinicianUsage(
  month?: string
): Promise<ClinicianUsage[]> {
  const supabase = await createClient();
  const period = month || getCurrentMonth();
  const { startDate, endDate } = getMonthRange(period);

  // Fetch all transcripts with clinician info for the period
  const { data, error } = await supabase
    .from("visit_transcripts")
    .select(
      `
      id,
      audio_duration_seconds,
      cost_transcription,
      cost_llm,
      created_at,
      visit:visits!inner(
        clinician_id,
        clinician:users!visits_clinician_id_fkey(id, first_name, last_name, email)
      )
    `
    )
    .gte("created_at", startDate)
    .lt("created_at", endDate)
    .in("processing_status", ["completed", "processing", "pending"]);

  if (error) {
    console.error("All clinician usage query error:", error);
    return [];
  }

  // Group by clinician
  const byClinicianMap = new Map<
    string,
    {
      userId: string;
      userName: string;
      email: string;
      records: typeof data;
    }
  >();

  for (const record of data || []) {
    const visit = record.visit as unknown as {
      clinician_id: string;
      clinician:
        | { id: string; first_name: string; last_name: string; email: string }[]
        | null;
    };
    const clinicianId = visit?.clinician_id;
    if (!clinicianId) continue;

    const clinician = Array.isArray(visit?.clinician)
      ? visit.clinician[0]
      : null;

    if (!byClinicianMap.has(clinicianId)) {
      byClinicianMap.set(clinicianId, {
        userId: clinicianId,
        userName: clinician
          ? `${clinician.first_name || ""} ${clinician.last_name || ""}`.trim()
          : "Unknown",
        email: clinician?.email || "",
        records: [],
      });
    }
    byClinicianMap.get(clinicianId)!.records.push(record);
  }

  // Build summaries
  return Array.from(byClinicianMap.values()).map(
    ({ userId, userName, email, records }) => {
      const totalDurationSeconds = records.reduce(
        (sum, r) => sum + ((r.audio_duration_seconds as number) || 0),
        0
      );
      const totalCostTranscription = records.reduce(
        (sum, r) => sum + ((r.cost_transcription as number) || 0),
        0
      );
      const totalCostLlm = records.reduce(
        (sum, r) => sum + ((r.cost_llm as number) || 0),
        0
      );
      const totalCost = totalCostTranscription + totalCostLlm;
      const totalDurationMinutes = totalDurationSeconds / 60;

      return {
        userId,
        userName,
        email,
        summary: {
          period,
          totalTranscriptions: records.length,
          totalDurationMinutes: Math.round(totalDurationMinutes * 10) / 10,
          totalCostTranscription:
            Math.round(totalCostTranscription * 1000) / 1000,
          totalCostLlm: Math.round(totalCostLlm * 1000) / 1000,
          totalCost: Math.round(totalCost * 100) / 100,
          averageDurationMinutes:
            records.length > 0
              ? Math.round((totalDurationMinutes / records.length) * 10) / 10
              : 0,
          averageCostPerTranscription:
            records.length > 0
              ? Math.round((totalCost / records.length) * 100) / 100
              : 0,
        },
      };
    }
  );
}

/**
 * Check if a user's usage exceeds warning thresholds
 */
export async function checkUsageWarnings(
  userId: string
): Promise<UsageWarning[]> {
  const usage = await getUserMonthlyUsage(userId);
  const warnings: UsageWarning[] = [];

  // Cost warnings
  if (usage.totalCost >= COST_THRESHOLDS.CRITICAL) {
    warnings.push({
      type: "cost",
      level: "critical",
      message: `Monthly AI cost is $${usage.totalCost.toFixed(2)}, exceeding $${COST_THRESHOLDS.CRITICAL} threshold`,
    });
  } else if (usage.totalCost >= COST_THRESHOLDS.WARNING) {
    warnings.push({
      type: "cost",
      level: "warning",
      message: `Monthly AI cost is $${usage.totalCost.toFixed(2)}, approaching $${COST_THRESHOLDS.CRITICAL} limit`,
    });
  } else if (usage.totalCost >= COST_THRESHOLDS.INFO) {
    warnings.push({
      type: "cost",
      level: "info",
      message: `Monthly AI cost is $${usage.totalCost.toFixed(2)}`,
    });
  }

  // Count warnings
  if (usage.totalTranscriptions >= COUNT_THRESHOLDS.CRITICAL) {
    warnings.push({
      type: "count",
      level: "critical",
      message: `${usage.totalTranscriptions} AI transcriptions this month, exceeding ${COUNT_THRESHOLDS.CRITICAL} threshold`,
    });
  } else if (usage.totalTranscriptions >= COUNT_THRESHOLDS.WARNING) {
    warnings.push({
      type: "count",
      level: "warning",
      message: `${usage.totalTranscriptions} AI transcriptions this month, approaching ${COUNT_THRESHOLDS.CRITICAL} limit`,
    });
  }

  return warnings;
}

// =====================================================
// HELPERS
// =====================================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(period: string): {
  startDate: string;
  endDate: string;
} {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1); // First day of next month

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function emptyUsageSummary(period: string): UsageSummary {
  return {
    period,
    totalTranscriptions: 0,
    totalDurationMinutes: 0,
    totalCostTranscription: 0,
    totalCostLlm: 0,
    totalCost: 0,
    averageDurationMinutes: 0,
    averageCostPerTranscription: 0,
  };
}
