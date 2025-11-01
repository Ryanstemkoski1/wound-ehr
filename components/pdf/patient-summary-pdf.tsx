import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2pt solid #0d9488",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 3,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 8,
    borderBottom: "1pt solid #e5e7eb",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: "35%",
    fontWeight: "bold",
    color: "#374151",
  },
  value: {
    width: "65%",
    color: "#6b7280",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "48%",
    marginBottom: 8,
  },
  card: {
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    marginBottom: 8,
    border: "1pt solid #e5e7eb",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  badge: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
    padding: "3 8",
    borderRadius: 12,
    fontSize: 8,
    fontWeight: "bold",
    marginRight: 5,
  },
  badgeInactive: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  list: {
    marginTop: 4,
    marginLeft: 10,
  },
  listItem: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#ecfdf5",
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  summaryItem: {
    textAlign: "center",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 8,
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 10,
  },
});

type PatientSummaryPDFProps = {
  data: {
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      mrn: string;
      dateOfBirth: string;
      gender: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zipCode: string | null;
      allergies: string[];
      medicalHistory: string[];
      insurancePrimary: Record<string, unknown> | null;
      insuranceSecondary: Record<string, unknown> | null;
      emergencyContact: Record<string, unknown> | null;
    };
    facility: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
    };
    wounds: Array<{
      id: string;
      location: string;
      woundType: string;
      onsetDate: string;
      status: string;
      woundNumber: string;
      assessmentCount: number;
      latestAssessment: {
        createdAt: string;
        length: number | null;
        width: number | null;
        depth: number | null;
        healingStatus: string | null;
      } | null;
    }>;
    recentVisits: Array<{
      id: string;
      visitDate: string;
      visitType: string;
      status: string;
      location: string | null;
    }>;
    summary: {
      totalWounds: number;
      activeWounds: number;
      totalVisits: number;
    };
  };
};

export default function PatientSummaryPDF({ data }: PatientSummaryPDFProps) {
  const { patient, facility, wounds, recentVisits, summary } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Patient Summary Report</Text>
          <Text style={styles.subtitle}>
            {patient.firstName} {patient.lastName} • MRN: {patient.mrn}
          </Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.activeWounds}</Text>
            <Text style={styles.summaryLabel}>Active Wounds</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.totalWounds}</Text>
            <Text style={styles.summaryLabel}>Total Wounds</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.totalVisits}</Text>
            <Text style={styles.summaryLabel}>Recent Visits</Text>
          </View>
        </View>

        {/* Patient Demographics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>
                  {new Date(patient.dateOfBirth).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>{patient.gender || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{patient.phone || "N/A"}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{patient.email || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>
                  {patient.address
                    ? `${patient.address}, ${patient.city}, ${patient.state} ${patient.zipCode}`
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Facility Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facility</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{facility.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {facility.address}, {facility.city}, {facility.state}{" "}
              {facility.zipCode}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>
              {facility.phone} • {facility.email}
            </Text>
          </View>
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical History</Text>
          {patient.allergies.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.cardTitle}>Allergies:</Text>
              <View style={styles.list}>
                {patient.allergies.map((allergy, idx) => (
                  <Text key={idx} style={styles.listItem}>
                    • {allergy}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {patient.medicalHistory.length > 0 && (
            <View>
              <Text style={styles.cardTitle}>Medical History:</Text>
              <View style={styles.list}>
                {patient.medicalHistory.map((condition, idx) => (
                  <Text key={idx} style={styles.listItem}>
                    • {condition}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Active Wounds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wounds ({wounds.length})</Text>
          {wounds.map((wound) => (
            <View key={wound.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {wound.woundNumber} - {wound.location.replace(/_/g, " ")}{" "}
                <Text
                  style={
                    wound.status === "active"
                      ? styles.badge
                      : [styles.badge, styles.badgeInactive]
                  }
                >
                  {wound.status.toUpperCase()}
                </Text>
              </Text>
              <Text style={styles.cardDetail}>
                Type: {wound.woundType.replace(/_/g, " ")} | Onset:{" "}
                {new Date(wound.onsetDate).toLocaleDateString()} | Assessments:{" "}
                {wound.assessmentCount}
              </Text>
              {wound.latestAssessment && (
                <Text style={styles.cardDetail}>
                  Latest Assessment:{" "}
                  {new Date(
                    wound.latestAssessment.createdAt
                  ).toLocaleDateString()}
                  {wound.latestAssessment.length && wound.latestAssessment.width
                    ? ` | Size: ${wound.latestAssessment.length}cm × ${wound.latestAssessment.width}cm`
                    : ""}
                  {wound.latestAssessment.healingStatus
                    ? ` | Status: ${wound.latestAssessment.healingStatus.replace(/_/g, " ")}`
                    : ""}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Recent Visits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Visits (Last {recentVisits.length})
          </Text>
          {recentVisits.map((visit) => (
            <View key={visit.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {new Date(visit.visitDate).toLocaleDateString()} -{" "}
                {visit.visitType.replace(/_/g, " ").toUpperCase()}
              </Text>
              <Text style={styles.cardDetail}>
                Status: {visit.status} {visit.location && `| ${visit.location}`}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This document is confidential and intended for medical professionals
            only. • Page 1 of 1
          </Text>
        </View>
      </Page>
    </Document>
  );
}
