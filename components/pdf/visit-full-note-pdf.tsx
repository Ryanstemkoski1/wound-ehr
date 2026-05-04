import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Extended data shape — superset of VisitSummaryData
type ExtendedAssessment = {
  id: string;
  wound: { location: string; woundType: string };
  length: number | null;
  width: number | null;
  depth: number | null;
  undermining: string | null;
  tunneling: string | null;
  exudate: string | null;
  exudateType: string | null;
  odor: string | null;
  painLevel: number | null;
  healingStatus: string | null;
  treatmentplan: string | null;
  granulationPercent: number | null;
  sloughPercent: number | null;
  epithelialPercent: number | null;
  periwoundCondition: string | null;
  pressureStage: string | null;
  infectionSigns: string[] | null;
  atRiskReopening: boolean | null;
  assessmentNotes: string | null;
  woundType: string | null;
};

type FullNoteData = {
  visit: {
    id: string;
    visitDate: Date;
    visitType: string;
    status: string;
    location: string | null;
    notes: string | null;
  };
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    mrn: string;
    facility: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
    } | null;
  };
  assessments: ExtendedAssessment[];
  treatments?: Array<Record<string, unknown>>;
  billing: {
    cptCodes: string[];
    icd10Codes: string[];
    timeSpent: number | null;
    modifiers: string[];
  } | null;
  signatures?: {
    provider?: {
      signerName: string;
      signerRole: string;
      signatureData: string;
      signedAt: Date;
      credentials?: string | null;
    };
    patient?: {
      signerName: string;
      signatureData: string;
      signedAt: Date;
    };
  };
  addendums?: Array<{
    id: string;
    note: string;
    createdAt: Date;
    author: { name: string; credentials: string | null };
  }>;
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    marginBottom: 16,
    borderBottom: "2pt solid #0d9488",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 4,
  },
  subtitle: { fontSize: 9, color: "#64748b" },
  section: { marginTop: 14, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
    borderBottom: "1pt solid #e2e8f0",
    paddingBottom: 3,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: "35%", fontWeight: "bold", color: "#475569" },
  value: { width: "65%", color: "#0f172a" },
  card: {
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#f8fafc",
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 6,
  },
  halfRow: { flexDirection: "row", marginBottom: 3 },
  halfLabel: { width: "40%", color: "#475569" },
  halfValue: { width: "60%" },
  tissue: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: "#ffffff",
    padding: 6,
    border: "1pt solid #e2e8f0",
    borderRadius: 3,
  },
  tissueBox: { flex: 1, alignItems: "center" },
  tissueLabel: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  tissueValue: { fontSize: 12, fontWeight: "bold", color: "#0f172a" },
  notes: {
    marginTop: 6,
    padding: 7,
    backgroundColor: "#ffffff",
    border: "1pt solid #e2e8f0",
    borderRadius: 3,
    fontSize: 9,
    lineHeight: 1.4,
  },
  badge: {
    backgroundColor: "#e0f2fe",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 9,
    color: "#0369a1",
    marginRight: 4,
    marginBottom: 3,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
    borderTop: "1pt solid #e2e8f0",
    paddingTop: 8,
  },
  sigBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f8fafc",
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
  },
  sigLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 4,
  },
  sigLine: {
    height: 40,
    border: "1pt solid #cbd5e1",
    backgroundColor: "#ffffff",
    marginVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  sigMeta: { fontSize: 8, color: "#475569", marginTop: 2 },
});

function fmt(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function age(dob: Date) {
  const today = new Date();
  const d = new Date(dob);
  let a = today.getFullYear() - d.getFullYear();
  if (
    today.getMonth() < d.getMonth() ||
    (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  ) {
    a--;
  }
  return a;
}

function TissueBar({
  granulation,
  slough,
  epithelial,
}: {
  granulation: number | null;
  slough: number | null;
  epithelial: number | null;
}) {
  if (granulation === null && slough === null && epithelial === null)
    return null;
  return (
    <View style={s.tissue}>
      {granulation !== null && (
        <View style={s.tissueBox}>
          <Text style={s.tissueLabel}>Granulation</Text>
          <Text style={s.tissueValue}>{granulation}%</Text>
        </View>
      )}
      {slough !== null && (
        <View style={s.tissueBox}>
          <Text style={s.tissueLabel}>Slough</Text>
          <Text style={s.tissueValue}>{slough}%</Text>
        </View>
      )}
      {epithelial !== null && (
        <View style={s.tissueBox}>
          <Text style={s.tissueLabel}>Epithelial</Text>
          <Text style={s.tissueValue}>{epithelial}%</Text>
        </View>
      )}
    </View>
  );
}

type Props = { data: FullNoteData };

export default function VisitFullNotePDF({ data }: Props) {
  const { visit, patient, assessments, billing, signatures, addendums } = data;

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* Header */}
        <View style={s.header} fixed>
          <Text style={s.title}>Full Clinical Note</Text>
          <Text style={s.subtitle}>
            Generated {fmt(new Date())} · CONFIDENTIAL – Protected Health
            Information
          </Text>
        </View>

        {/* Patient */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Patient Information</Text>
          <View style={s.row}>
            <Text style={s.label}>Patient Name:</Text>
            <Text style={s.value}>
              {patient.firstName} {patient.lastName}
            </Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>MRN:</Text>
            <Text style={s.value}>{patient.mrn}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Date of Birth:</Text>
            <Text style={s.value}>
              {fmt(patient.dateOfBirth)} (Age {age(patient.dateOfBirth)})
            </Text>
          </View>
          {patient.facility && (
            <View style={s.row}>
              <Text style={s.label}>Facility:</Text>
              <Text style={s.value}>
                {patient.facility.name} · {patient.facility.address},{" "}
                {patient.facility.city}, {patient.facility.state}{" "}
                {patient.facility.zipCode}
              </Text>
            </View>
          )}
        </View>

        {/* Visit */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Encounter Details</Text>
          <View style={s.row}>
            <Text style={s.label}>Date of Service:</Text>
            <Text style={s.value}>{fmt(visit.visitDate)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Visit Type:</Text>
            <Text style={s.value}>{visit.visitType}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Status:</Text>
            <Text style={s.value}>{visit.status}</Text>
          </View>
          {visit.location && (
            <View style={s.row}>
              <Text style={s.label}>Location:</Text>
              <Text style={s.value}>{visit.location}</Text>
            </View>
          )}
          {visit.notes && (
            <View style={s.notes}>
              <Text style={{ fontWeight: "bold", marginBottom: 3 }}>
                Clinical Notes:
              </Text>
              <Text>{visit.notes}</Text>
            </View>
          )}
        </View>

        {/* Wound Assessments — full detail */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Wound Assessments ({assessments.length})
          </Text>
          {assessments.map((a, idx) => (
            <View key={a.id} style={s.card} wrap={false}>
              <Text style={s.cardHeader}>
                Wound {idx + 1}: {a.wound.location} — {a.wound.woundType}
                {a.pressureStage ? ` (Stage ${a.pressureStage})` : ""}
              </Text>

              {/* Dimensions */}
              <View style={{ flexDirection: "row", gap: 20, marginBottom: 4 }}>
                {a.length !== null && (
                  <Text style={{ color: "#475569" }}>
                    L: <Text style={{ color: "#0f172a" }}>{a.length} cm</Text>
                  </Text>
                )}
                {a.width !== null && (
                  <Text style={{ color: "#475569" }}>
                    W: <Text style={{ color: "#0f172a" }}>{a.width} cm</Text>
                  </Text>
                )}
                {a.depth !== null && (
                  <Text style={{ color: "#475569" }}>
                    D: <Text style={{ color: "#0f172a" }}>{a.depth} cm</Text>
                  </Text>
                )}
              </View>

              {/* Tissue Composition */}
              <TissueBar
                granulation={a.granulationPercent}
                slough={a.sloughPercent}
                epithelial={a.epithelialPercent}
              />

              {/* Wound characteristics */}
              {a.healingStatus && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Healing Status:</Text>
                  <Text style={s.halfValue}>{a.healingStatus}</Text>
                </View>
              )}
              {a.exudate && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Exudate Amount:</Text>
                  <Text style={s.halfValue}>{a.exudate}</Text>
                </View>
              )}
              {a.exudateType && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Exudate Type:</Text>
                  <Text style={s.halfValue}>{a.exudateType}</Text>
                </View>
              )}
              {a.odor && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Odor:</Text>
                  <Text style={s.halfValue}>{a.odor}</Text>
                </View>
              )}
              {a.periwoundCondition && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Periwound:</Text>
                  <Text style={s.halfValue}>{a.periwoundCondition}</Text>
                </View>
              )}
              {a.painLevel !== null && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Pain:</Text>
                  <Text style={s.halfValue}>{a.painLevel}/10</Text>
                </View>
              )}
              {a.undermining && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Undermining:</Text>
                  <Text style={s.halfValue}>{a.undermining}</Text>
                </View>
              )}
              {a.tunneling && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>Tunneling:</Text>
                  <Text style={s.halfValue}>{a.tunneling}</Text>
                </View>
              )}
              {a.atRiskReopening && (
                <View style={s.halfRow}>
                  <Text style={s.halfLabel}>At Risk of Reopening:</Text>
                  <Text style={s.halfValue}>Yes</Text>
                </View>
              )}

              {/* Infection Signs */}
              {a.infectionSigns && a.infectionSigns.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ color: "#475569", marginBottom: 2 }}>
                    Infection Signs:
                  </Text>
                  <View style={s.badgeRow}>
                    {a.infectionSigns.map((sign, i) => (
                      <Text key={i} style={s.badge}>
                        {sign}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Treatment Plan */}
              {a.treatmentplan && (
                <View style={s.notes}>
                  <Text style={{ fontWeight: "bold", marginBottom: 3 }}>
                    Treatment Plan:
                  </Text>
                  <Text>{a.treatmentplan}</Text>
                </View>
              )}
              {a.assessmentNotes && (
                <View style={[s.notes, { marginTop: 4 }]}>
                  <Text style={{ fontWeight: "bold", marginBottom: 3 }}>
                    Clinical Notes:
                  </Text>
                  <Text>{a.assessmentNotes}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Billing & Coding */}
        {billing && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Billing &amp; Coding</Text>
            {billing.cptCodes.length > 0 && (
              <View style={s.row}>
                <Text style={s.label}>CPT Codes:</Text>
                <Text style={s.value}>{billing.cptCodes.join(", ")}</Text>
              </View>
            )}
            {billing.icd10Codes.length > 0 && (
              <View style={s.row}>
                <Text style={s.label}>ICD-10 Codes:</Text>
                <Text style={s.value}>{billing.icd10Codes.join(", ")}</Text>
              </View>
            )}
            {billing.modifiers.length > 0 && (
              <View style={s.row}>
                <Text style={s.label}>Modifiers:</Text>
                <Text style={s.value}>{billing.modifiers.join(", ")}</Text>
              </View>
            )}
            {billing.timeSpent && (
              <View style={s.row}>
                <Text style={s.label}>Time Spent:</Text>
                <Text style={s.value}>{billing.timeSpent} min</Text>
              </View>
            )}
          </View>
        )}

        {/* Addendums */}
        {addendums && addendums.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Addendums ({addendums.length})</Text>
            {addendums.map((ad) => (
              <View key={ad.id} style={s.card} wrap={false}>
                <View style={s.row}>
                  <Text style={s.label}>Author:</Text>
                  <Text style={s.value}>
                    {ad.author.name}
                    {ad.author.credentials ? `, ${ad.author.credentials}` : ""}
                  </Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>Date:</Text>
                  <Text style={s.value}>{fmt(ad.createdAt)}</Text>
                </View>
                <View style={s.notes}>
                  <Text>{ad.note}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Signatures */}
        {signatures && (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Signatures</Text>
            {signatures.provider && (
              <View style={s.sigBox}>
                <Text style={s.sigLabel}>Provider Signature</Text>
                <View style={s.row}>
                  <Text style={s.label}>Signer:</Text>
                  <Text style={s.value}>
                    {signatures.provider.signerName}
                    {signatures.provider.credentials
                      ? `, ${signatures.provider.credentials}`
                      : ""}
                  </Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>Role:</Text>
                  <Text style={s.value}>{signatures.provider.signerRole}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>Signed At:</Text>
                  <Text style={s.value}>
                    {fmt(signatures.provider.signedAt)}
                  </Text>
                </View>
              </View>
            )}
            {signatures.patient && (
              <View style={s.sigBox}>
                <Text style={s.sigLabel}>Patient Signature</Text>
                <View style={s.row}>
                  <Text style={s.label}>Signed By:</Text>
                  <Text style={s.value}>{signatures.patient.signerName}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.label}>Date:</Text>
                  <Text style={s.value}>
                    {fmt(signatures.patient.signedAt)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages} · ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn}) · Confidential`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
