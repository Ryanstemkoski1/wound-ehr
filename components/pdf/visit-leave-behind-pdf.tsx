import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  renderPositiveBullets,
  renderPositiveProcedurePayload,
} from "@/lib/pdf-positives";

// Procedure-type enum mirrors the discriminator used by procedure payloads.
type ProcedureType =
  | "sharp_debridement"
  | "biologic_graft"
  | "arobella"
  | "feeding_tube_change"
  | "urinary_catheter_replacement";

// Human-readable labels for procedure pages.
const PROCEDURE_LABEL: Record<ProcedureType, string> = {
  sharp_debridement: "Sharp Debridement",
  biologic_graft: "Biologic Graft Application",
  arobella: "Arobella Ultrasonic Debridement",
  feeding_tube_change: "Feeding Tube (G-Tube) Change",
  urinary_catheter_replacement: "Urinary Catheter Replacement",
};

// Data shape for the leave-behind PDF. One page per wound + one per procedure.
export type LeaveBehindData = {
  visit: { id: string; date: string; status: string };
  patient: {
    firstName: string;
    lastName: string;
    dob?: string | null;
    mrn?: string | null;
  };
  facility: { name: string };
  provider: { name: string; credentials?: string | null };
  assessments: Array<{
    id: string;
    woundLocation: string;
    woundType?: string | null;
    length?: number | null;
    width?: number | null;
    depth?: number | null;
    painLevel?: number | null;
    infectionSigns?: string[] | null;
    exudateAmount?: string | null;
    exudateType?: string | null;
    periwoundCondition?: string | null;
    granulationPercent?: number | null;
    sloughPercent?: number | null;
    epithelialPercent?: number | null;
    healingStatus?: string | null;
    treatmentOrderSentence?: string | null;
    treatmentplan?: string | null;
  }>;
  procedures: Array<{
    assessmentId: string;
    procedureType: ProcedureType;
    payload: Record<string, unknown>;
    woundLocation?: string | null;
  }>;
};

// Styles — visually aligned with visit-summary-pdf / visit-full-note-pdf.
// IMPORTANT: no fixed header, no footer pageNumber — each Page is one issue.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    marginBottom: 16,
    borderBottom: "2pt solid #0d9488",
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 4,
  },
  headerSub: { fontSize: 9, color: "#64748b" },
  patientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  patientCell: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 3,
  },
  patientLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    marginRight: 4,
  },
  patientValue: { fontSize: 9, color: "#0f172a" },
  section: { marginTop: 14, marginBottom: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
    borderBottom: "1pt solid #e2e8f0",
    paddingBottom: 4,
  },
  issueHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 4,
  },
  issueSub: { fontSize: 10, color: "#475569", marginBottom: 6 },
  bullet: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 10,
    color: "#0d9488",
    fontWeight: "bold",
  },
  bulletText: { flex: 1, color: "#0f172a", lineHeight: 1.4 },
  orderQuote: {
    marginTop: 6,
    padding: 10,
    backgroundColor: "#f8fafc",
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
    fontSize: 10,
    color: "#0f172a",
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  empty: {
    marginTop: 30,
    textAlign: "center",
    color: "#64748b",
    fontSize: 11,
  },
});

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PatientHeaderStrip({ data }: { data: LeaveBehindData }) {
  const { patient, facility, visit, provider } = data;
  const providerLine = provider.credentials
    ? `${provider.name}, ${provider.credentials}`
    : provider.name;
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        {patient.firstName} {patient.lastName}
      </Text>
      <Text style={styles.headerSub}>Leave-Behind Summary</Text>
      <View style={styles.patientGrid}>
        <View style={styles.patientCell}>
          <Text style={styles.patientLabel}>DOB:</Text>
          <Text style={styles.patientValue}>{fmtDate(patient.dob)}</Text>
        </View>
        <View style={styles.patientCell}>
          <Text style={styles.patientLabel}>MRN:</Text>
          <Text style={styles.patientValue}>{patient.mrn ?? "—"}</Text>
        </View>
        <View style={styles.patientCell}>
          <Text style={styles.patientLabel}>Facility:</Text>
          <Text style={styles.patientValue}>{facility.name}</Text>
        </View>
        <View style={styles.patientCell}>
          <Text style={styles.patientLabel}>Visit Date:</Text>
          <Text style={styles.patientValue}>{fmtDate(visit.date)}</Text>
        </View>
        <View style={styles.patientCell}>
          <Text style={styles.patientLabel}>Provider:</Text>
          <Text style={styles.patientValue}>{providerLine}</Text>
        </View>
      </View>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

type LeaveBehindAssessment = LeaveBehindData["assessments"][number];
type LeaveBehindProcedure = LeaveBehindData["procedures"][number];

function WoundPage({
  data,
  assessment,
}: {
  data: LeaveBehindData;
  assessment: LeaveBehindAssessment;
}) {
  const bullets = renderPositiveBullets(assessment);
  const orderText =
    assessment.treatmentOrderSentence?.trim() ||
    assessment.treatmentplan?.trim() ||
    null;

  return (
    <Page size="A4" style={styles.page}>
      <PatientHeaderStrip data={data} />

      <View style={styles.section}>
        <Text style={styles.issueHeader}>{assessment.woundLocation}</Text>
        {assessment.woundType && (
          <Text style={styles.issueSub}>{assessment.woundType}</Text>
        )}
        <Text style={styles.sectionTitle}>Findings</Text>
        {bullets.length > 0 ? (
          <Bullets items={bullets} />
        ) : (
          <Text style={styles.bulletText}>No positive findings documented.</Text>
        )}
      </View>

      {orderText && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treatment Orders</Text>
          <Text style={styles.orderQuote}>&ldquo;{orderText}&rdquo;</Text>
        </View>
      )}
    </Page>
  );
}

function ProcedurePage({
  data,
  procedure,
}: {
  data: LeaveBehindData;
  procedure: LeaveBehindProcedure;
}) {
  const label = PROCEDURE_LABEL[procedure.procedureType];
  const bullets = renderPositiveProcedurePayload(
    procedure.procedureType,
    procedure.payload,
  );

  return (
    <Page size="A4" style={styles.page}>
      <PatientHeaderStrip data={data} />

      <View style={styles.section}>
        <Text style={styles.issueHeader}>{label}</Text>
        {procedure.woundLocation && (
          <Text style={styles.issueSub}>Site: {procedure.woundLocation}</Text>
        )}
        <Text style={styles.sectionTitle}>Procedure Details</Text>
        {bullets.length > 0 ? (
          <Bullets items={bullets} />
        ) : (
          <Text style={styles.bulletText}>
            No additional procedure details documented.
          </Text>
        )}
      </View>
    </Page>
  );
}

function EmptyPage({ data }: { data: LeaveBehindData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PatientHeaderStrip data={data} />
      <Text style={styles.empty}>No documented issues for this visit.</Text>
    </Page>
  );
}

type Props = { data: LeaveBehindData };

export default function VisitLeaveBehindPDF({ data }: Props) {
  const hasIssues =
    data.assessments.length > 0 || data.procedures.length > 0;

  if (!hasIssues) {
    return (
      <Document>
        <EmptyPage data={data} />
      </Document>
    );
  }

  return (
    <Document>
      {data.assessments.map((assessment) => (
        <WoundPage
          key={`wound-${assessment.id}`}
          data={data}
          assessment={assessment}
        />
      ))}
      {data.procedures.map((procedure, idx) => (
        <ProcedurePage
          key={`proc-${procedure.assessmentId}-${procedure.procedureType}-${idx}`}
          data={data}
          procedure={procedure}
        />
      ))}
    </Document>
  );
}
