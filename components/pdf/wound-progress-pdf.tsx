import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Define types for wound progress data
type WoundProgressData = {
  wound: {
    id: string;
    location: string;
    woundType: string;
    onsetDate: Date;
    status: string;
    patient: {
      firstName: string;
      lastName: string;
      mrn: string;
      dateOfBirth: Date;
    };
  };
  assessments: Array<{
    id: string;
    createdAt: Date;
    length: number | null;
    width: number | null;
    depth: number | null;
    area: number | null;
    undermining: string | null;
    tunneling: string | null;
    exudate: string | null;
    odor: string | null;
    painLevel: number | null;
    healingStatus: string | null;
    treatmentplan: string | null;
    photos: Array<{
      url: string;
      caption: string | null;
    }>;
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
  measurementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: "1pt solid #e2e8f0",
  },
  measurementItem: {
    flex: 1,
    alignItems: "center",
  },
  measurementLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
  },
  measurementValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
  },
  photoContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  photo: {
    width: "48%",
    height: 150,
    objectFit: "cover",
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  summary: {
    backgroundColor: "#fef3c7",
    border: "1pt solid #fbbf24",
    borderRadius: 4,
    padding: 10,
    marginTop: 15,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 9,
    color: "#78350f",
    lineHeight: 1.4,
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
});

type WoundProgressPDFProps = {
  data: WoundProgressData;
};

export default function WoundProgressPDF({ data }: WoundProgressPDFProps) {
  const { wound, assessments } = data;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = () => {
    const onset = new Date(wound.onsetDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - onset.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return `${weeks} week${weeks !== 1 ? "s" : ""}, ${days} day${days !== 1 ? "s" : ""}`;
  };

  const calculateProgress = () => {
    if (assessments.length < 2) return null;

    const sortedAssessments = [...assessments].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const first = sortedAssessments[0];
    const last = sortedAssessments[sortedAssessments.length - 1];

    if (!first.area || !last.area) return null;

    const reduction = ((first.area - last.area) / first.area) * 100;
    return reduction.toFixed(1);
  };

  const progress = calculateProgress();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wound Progress Report</Text>
          <Text style={styles.subtitle}>
            Generated on {formatDate(new Date())}
          </Text>
        </View>

        {/* Patient & Wound Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient & Wound Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>
              {wound.patient.firstName} {wound.patient.lastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MRN:</Text>
            <Text style={styles.value}>{wound.patient.mrn}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Wound Location:</Text>
            <Text style={styles.value}>{wound.location}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Wound Type:</Text>
            <Text style={styles.value}>{wound.woundType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Onset Date:</Text>
            <Text style={styles.value}>{formatDate(wound.onsetDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{calculateDuration()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Current Status:</Text>
            <Text style={styles.value}>{wound.status}</Text>
          </View>
        </View>

        {/* Progress Summary */}
        {progress !== null && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Healing Progress Summary</Text>
            <Text style={styles.summaryText}>
              Based on {assessments.length} assessments over{" "}
              {calculateDuration()}, this wound has shown a{" "}
              {Math.abs(parseFloat(progress)).toFixed(1)}%
              {parseFloat(progress) > 0 ? " reduction" : " increase"} in surface
              area.
              {parseFloat(progress) > 0
                ? " The wound is showing positive healing progress."
                : " The wound requires continued monitoring and possible treatment adjustment."}
            </Text>
          </View>
        )}

        {/* Assessment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Assessment History ({assessments.length})
          </Text>
          {assessments
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((assessment, index) => (
              <View
                key={assessment.id}
                style={styles.assessmentCard}
                wrap={false}
              >
                <Text style={styles.assessmentHeader}>
                  {formatDate(assessment.createdAt)}
                  {index === 0 && " (Most Recent)"}
                </Text>

                {/* Measurements */}
                <View style={styles.measurementRow}>
                  {assessment.length !== null && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>LENGTH</Text>
                      <Text style={styles.measurementValue}>
                        {assessment.length} cm
                      </Text>
                    </View>
                  )}
                  {assessment.width !== null && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>WIDTH</Text>
                      <Text style={styles.measurementValue}>
                        {assessment.width} cm
                      </Text>
                    </View>
                  )}
                  {assessment.depth !== null && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>DEPTH</Text>
                      <Text style={styles.measurementValue}>
                        {assessment.depth} cm
                      </Text>
                    </View>
                  )}
                  {assessment.area !== null && (
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>AREA</Text>
                      <Text style={styles.measurementValue}>
                        {assessment.area} cm²
                      </Text>
                    </View>
                  )}
                </View>

                {/* Clinical Details */}
                {assessment.healingStatus && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Healing Status:</Text>
                    <Text style={styles.value}>{assessment.healingStatus}</Text>
                  </View>
                )}
                {assessment.exudate && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Exudate:</Text>
                    <Text style={styles.value}>{assessment.exudate}</Text>
                  </View>
                )}
                {assessment.painLevel !== null && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Pain Level:</Text>
                    <Text style={styles.value}>{assessment.painLevel}/10</Text>
                  </View>
                )}

                {/* Photos */}
                {assessment.photos.length > 0 && (
                  <View style={styles.photoContainer}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        fontSize: 9,
                        marginBottom: 6,
                      }}
                    >
                      Photos ({assessment.photos.length}):
                    </Text>
                    <View style={styles.photoRow}>
                      {assessment.photos
                        .slice(0, 2)
                        .map((photo, photoIndex) => (
                          <View key={photoIndex} style={{ width: "48%" }}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text */}
                            <Image src={photo.url} style={styles.photo} />
                            {photo.caption && (
                              <Text style={styles.photoCaption}>
                                {photo.caption}
                              </Text>
                            )}
                          </View>
                        ))}
                    </View>
                  </View>
                )}

                {/* Treatment Plan */}
                {assessment.treatmentplan && (
                  <View style={{ marginTop: 8, fontSize: 9 }}>
                    <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                      Treatment Plan:
                    </Text>
                    <Text style={{ color: "#475569" }}>
                      {assessment.treatmentplan}
                    </Text>
                  </View>
                )}
              </View>
            ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This document is confidential and contains protected health
            information (PHI)
          </Text>
          <Text>Wound ID: {wound.id}</Text>
        </View>
      </Page>
    </Document>
  );
}
