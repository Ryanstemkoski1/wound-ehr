import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// Define types for the visit data
type VisitSummaryData = {
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
  assessments: Array<{
    id: string;
    wound: {
      location: string;
      woundType: string;
    };
    length: number | null;
    width: number | null;
    depth: number | null;
    undermining: string | null;
    tunneling: string | null;
    exudate: string | null;
    odor: string | null;
    painLevel: number | null;
    healingStatus: string | null;
    treatmentplan: string | null;
  }>;
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
    author: {
      name: string;
      credentials: string | null;
    };
  }>;
};

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
  logo: {
    width: 150,
    height: 45,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
    borderBottom: "1pt solid #e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "35%",
    fontWeight: "bold",
    color: "#475569",
  },
  value: {
    width: "65%",
    color: "#0f172a",
  },
  assessmentCard: {
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#f8fafc",
  },
  assessmentHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "48%",
    marginBottom: 5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
    borderTop: "1pt solid #e2e8f0",
    paddingTop: 10,
  },
  notes: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#ffffff",
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
    fontSize: 9,
    lineHeight: 1.4,
  },
  signatureSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: "2pt solid #e2e8f0",
  },
  signatureContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f8fafc",
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0d9488",
    marginBottom: 5,
  },
  signatureImage: {
    width: 200,
    height: 60,
    marginVertical: 5,
    border: "1pt solid #cbd5e1",
    backgroundColor: "#ffffff",
  },
  signatureInfo: {
    fontSize: 9,
    color: "#475569",
    marginTop: 3,
  },
});

type VisitSummaryPDFProps = {
  data: VisitSummaryData;
};

export default function VisitSummaryPDF({ data }: VisitSummaryPDFProps) {
  const { visit, patient, assessments, billing } = data;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateAge = (dateOfBirth: Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Visit Summary Report</Text>
          <Text style={styles.subtitle}>
            Generated on {formatDate(new Date())} at {formatTime(new Date())}
          </Text>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>
              {patient.firstName} {patient.lastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MRN:</Text>
            <Text style={styles.value}>{patient.mrn}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>
              {formatDate(patient.dateOfBirth)} (Age:{" "}
              {calculateAge(patient.dateOfBirth)})
            </Text>
          </View>
          {patient.facility && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Facility:</Text>
                <Text style={styles.value}>{patient.facility.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>
                  {patient.facility.address}, {patient.facility.city},{" "}
                  {patient.facility.state} {patient.facility.zipCode}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Visit Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Visit Date:</Text>
            <Text style={styles.value}>
              {formatDate(visit.visitDate)} at {formatTime(visit.visitDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Visit Type:</Text>
            <Text style={styles.value}>{visit.visitType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{visit.status}</Text>
          </View>
          {visit.location && (
            <View style={styles.row}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{visit.location}</Text>
            </View>
          )}
          {visit.notes && (
            <View style={styles.notes}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                Visit Notes:
              </Text>
              <Text>{visit.notes}</Text>
            </View>
          )}
        </View>

        {/* Wound Assessments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Wound Assessments ({assessments.length})
          </Text>
          {assessments.map((assessment, index) => (
            <View key={assessment.id} style={styles.assessmentCard}>
              <Text style={styles.assessmentHeader}>
                Assessment {index + 1}: {assessment.wound.location} -{" "}
                {assessment.wound.woundType}
              </Text>

              <View style={styles.grid}>
                {assessment.length && (
                  <View style={styles.gridItem}>
                    <View style={styles.row}>
                      <Text style={styles.label}>Length:</Text>
                      <Text style={styles.value}>{assessment.length} cm</Text>
                    </View>
                  </View>
                )}
                {assessment.width && (
                  <View style={styles.gridItem}>
                    <View style={styles.row}>
                      <Text style={styles.label}>Width:</Text>
                      <Text style={styles.value}>{assessment.width} cm</Text>
                    </View>
                  </View>
                )}
                {assessment.depth && (
                  <View style={styles.gridItem}>
                    <View style={styles.row}>
                      <Text style={styles.label}>Depth:</Text>
                      <Text style={styles.value}>{assessment.depth} cm</Text>
                    </View>
                  </View>
                )}
                {assessment.painLevel !== null && (
                  <View style={styles.gridItem}>
                    <View style={styles.row}>
                      <Text style={styles.label}>Pain Level:</Text>
                      <Text style={styles.value}>
                        {assessment.painLevel}/10
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {assessment.exudate && (
                <View style={styles.row}>
                  <Text style={styles.label}>Exudate:</Text>
                  <Text style={styles.value}>{assessment.exudate}</Text>
                </View>
              )}
              {assessment.odor && (
                <View style={styles.row}>
                  <Text style={styles.label}>Odor:</Text>
                  <Text style={styles.value}>{assessment.odor}</Text>
                </View>
              )}
              {assessment.undermining && (
                <View style={styles.row}>
                  <Text style={styles.label}>Undermining:</Text>
                  <Text style={styles.value}>{assessment.undermining}</Text>
                </View>
              )}
              {assessment.tunneling && (
                <View style={styles.row}>
                  <Text style={styles.label}>Tunneling:</Text>
                  <Text style={styles.value}>{assessment.tunneling}</Text>
                </View>
              )}
              {assessment.healingStatus && (
                <View style={styles.row}>
                  <Text style={styles.label}>Healing Status:</Text>
                  <Text style={styles.value}>{assessment.healingStatus}</Text>
                </View>
              )}

              {assessment.treatmentplan && (
                <View style={styles.notes}>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                    Treatment Plan:
                  </Text>
                  <Text>{assessment.treatmentplan}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Billing Information */}
        {billing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing Information</Text>
            {billing.cptCodes.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>CPT Codes:</Text>
                <Text style={styles.value}>{billing.cptCodes.join(", ")}</Text>
              </View>
            )}
            {billing.icd10Codes.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>ICD-10 Codes:</Text>
                <Text style={styles.value}>
                  {billing.icd10Codes.join(", ")}
                </Text>
              </View>
            )}
            {billing.timeSpent && (
              <View style={styles.row}>
                <Text style={styles.label}>Time Spent:</Text>
                <Text style={styles.value}>{billing.timeSpent} minutes</Text>
              </View>
            )}
            {billing.modifiers.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Modifiers:</Text>
                <Text style={styles.value}>{billing.modifiers.join(", ")}</Text>
              </View>
            )}
          </View>
        )}

        {/* Signatures */}
        {data.signatures && (data.signatures.provider || data.signatures.patient) && (
          <View style={styles.signatureSection}>
            <Text style={styles.sectionTitle}>Electronic Signatures</Text>

            {/* Provider Signature */}
            {data.signatures.provider && (
              <View style={styles.signatureContainer}>
                <Text style={styles.signatureLabel}>Provider Signature</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={data.signatures.provider.signatureData}
                  style={styles.signatureImage}
                />
                <Text style={styles.signatureInfo}>
                  Signed by: {data.signatures.provider.signerName} ({data.signatures.provider.signerRole})
                </Text>
                <Text style={styles.signatureInfo}>
                  Date: {data.signatures.provider.signedAt.toLocaleDateString()}{" "}
                  {data.signatures.provider.signedAt.toLocaleTimeString()}
                </Text>
              </View>
            )}

            {/* Patient Signature */}
            {data.signatures.patient && (
              <View style={styles.signatureContainer}>
                <Text style={styles.signatureLabel}>Patient Signature</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image
                  src={data.signatures.patient.signatureData}
                  style={styles.signatureImage}
                />
                <Text style={styles.signatureInfo}>
                  Signed by: {data.signatures.patient.signerName}
                </Text>
                <Text style={styles.signatureInfo}>
                  Date: {data.signatures.patient.signedAt.toLocaleDateString()}{" "}
                  {data.signatures.patient.signedAt.toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Addendums */}
        {data.addendums && data.addendums.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Addendums ({data.addendums.length})</Text>
            {data.addendums.map((addendum, index) => (
              <View key={addendum.id} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: "2pt solid #3b82f6" }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 3 }}>
                  Addendum #{index + 1}
                </Text>
                <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 5 }}>
                  {addendum.createdAt.toLocaleDateString()} at {addendum.createdAt.toLocaleTimeString()} by {addendum.author.name}
                  {addendum.author.credentials && ` (${addendum.author.credentials})`}
                </Text>
                <Text style={{ fontSize: 9, lineHeight: 1.4 }}>
                  {addendum.note}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This document is confidential and contains protected health
            information (PHI)
          </Text>
          <Text>Visit ID: {visit.id}</Text>
        </View>
      </Page>
    </Document>
  );
}
