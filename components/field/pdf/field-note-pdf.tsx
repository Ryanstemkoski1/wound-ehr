// =====================================================
// FieldNotePDF — @react-pdf/renderer template mirroring the
// client's paper "Wound Care Field Visit Note".
// =====================================================
// Rendered CLIENT-SIDE (dynamic import in pdf-button.tsx).
// Driven by the same paper model (./field-map) as PaperView,
// so the preview and the PDF can never diverge. Built-in
// Helvetica only — no font registration.

import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { NOTE_TYPE_LABELS } from "@/lib/field-note/registry";
import type { FieldNotePdfData } from "@/app/actions/field-notes";
import {
  PAPER_TITLE,
  buildPaperHeader,
  buildPaperSections,
  chunk,
  formatPaperDate,
  formatPaperDateTime,
  type PaperRow,
  type PaperSection,
  type PaperWoundBlock,
} from "./field-map";

// ─── Palette (matches the paper form's teal bands) ───

const TEAL = "#0F766E";
const BAND_BG = "#E7EFEE";
const BAND_INK = "#0E4F49";
const INK = "#1C2B2E";
const MUTED = "#5C6F6D";
const LINE = "#C9D6D4";
const BOX_INK = "#333333";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 36,
    paddingBottom: 52,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: INK,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    textAlign: "center",
    color: INK,
  },
  subtitle: {
    fontSize: 8,
    textAlign: "center",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  headerTable: {
    marginTop: 12,
    border: `1 solid ${BOX_INK}`,
  },
  headerRow: {
    flexDirection: "row",
  },
  headerRowBorder: {
    borderBottom: `0.75 solid ${LINE}`,
  },
  headerCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  headerCellBorder: {
    borderRight: `0.75 solid ${LINE}`,
  },
  headerLabel: {
    fontSize: 5.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerValue: {
    fontSize: 9,
    marginTop: 1,
    minHeight: 10,
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BAND_BG,
    borderLeft: `3 solid ${TEAL}`,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginTop: 10,
    marginBottom: 4,
  },
  bandNumber: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: BAND_INK,
    opacity: 0.75,
    marginRight: 6,
  },
  bandTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: BAND_INK,
  },
  stubText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 8.5,
    color: MUTED,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  attestedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  attestedText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: INK,
    marginLeft: 4,
  },
  fieldRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingVertical: 2,
  },
  fieldLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: INK,
    marginRight: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginVertical: 1,
  },
  optionLabel: {
    fontSize: 8,
    color: MUTED,
    marginLeft: 3,
  },
  optionLabelChecked: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: INK,
    marginLeft: 3,
  },
  checkbox: {
    width: 9,
    height: 9,
    border: `1 solid ${BOX_INK}`,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxFill: {
    width: 5,
    height: 5,
    backgroundColor: TEAL,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    marginTop: 1,
    marginBottom: 1,
  },
  detailLabel: {
    fontSize: 7.5,
    color: MUTED,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 8,
    color: INK,
  },
  blankLine: {
    borderBottom: "0.75 solid #999999",
    width: 110,
    height: 8,
  },
  lineValue: {
    fontSize: 8.5,
    color: INK,
  },
  blockBox: {
    border: `0.75 solid ${LINE}`,
    borderRadius: 2,
    paddingVertical: 3,
    paddingHorizontal: 4,
    minHeight: 22,
    marginTop: 2,
  },
  blockText: {
    fontSize: 8.5,
    color: INK,
  },
  woundPair: {
    flexDirection: "row",
  },
  woundBlock: {
    flex: 1,
    border: `0.75 solid ${LINE}`,
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  woundTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  signatureArea: {
    marginTop: 16,
    paddingTop: 8,
    borderTop: `1 solid ${BOX_INK}`,
  },
  signatureEyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  signatureImage: {
    width: 150,
    height: 45,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
  signatureName: {
    fontSize: 9,
    marginTop: 3,
  },
  signatureMeta: {
    fontSize: 8,
    color: MUTED,
    marginTop: 1,
  },
  signatureBlankRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 18,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: `0.5 solid ${LINE}`,
    paddingTop: 4,
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
  },
});

// ─── Atoms ───

function Check({ checked }: { checked: boolean }) {
  return <View style={styles.checkbox}>{checked ? <View style={styles.checkboxFill} /> : null}</View>;
}

function BlankLine({ width }: { width?: number }) {
  return <View style={[styles.blankLine, width !== undefined ? { width } : {}]} />;
}

function Band({ number, title }: { number: number; title: string }) {
  return (
    <View style={styles.band} minPresenceAhead={40}>
      <Text style={styles.bandNumber}>{number}</Text>
      <Text style={styles.bandTitle}>{title}</Text>
    </View>
  );
}

function FieldRow({ row }: { row: PaperRow }) {
  if (row.kind === "check") {
    return (
      <View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{row.label}:</Text>
          {row.options.map((o) => (
            <View key={o.value} style={styles.option}>
              <Check checked={o.checked} />
              <Text style={o.checked ? styles.optionLabelChecked : styles.optionLabel}>{o.label}</Text>
            </View>
          ))}
        </View>
        {row.detail ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{row.detail.label}:</Text>
            {row.detail.value ? <Text style={styles.detailValue}>{row.detail.value}</Text> : <BlankLine />}
          </View>
        ) : null}
      </View>
    );
  }

  if (row.kind === "line") {
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{row.label}:</Text>
        {row.value ? <Text style={styles.lineValue}>{row.value}</Text> : <BlankLine />}
      </View>
    );
  }

  // block (textarea)
  return (
    <View style={{ paddingVertical: 2 }}>
      <Text style={styles.fieldLabel}>{row.label}:</Text>
      <View style={styles.blockBox}>{row.value ? <Text style={styles.blockText}>{row.value}</Text> : null}</View>
    </View>
  );
}

function WoundBlock({ wound }: { wound: PaperWoundBlock }) {
  return (
    <View style={styles.woundBlock}>
      <Text style={styles.woundTitle}>{wound.title}</Text>
      {wound.rows.map((row) => (
        <FieldRow key={row.key} row={row} />
      ))}
    </View>
  );
}

function Section({ section }: { section: PaperSection }) {
  if (section.kind === "stub") {
    return (
      <View>
        <Band number={section.paperNumber} title={section.title} />
        {section.stub === "attested" ? (
          <View style={styles.attestedRow}>
            <Check checked />
            <Text style={styles.attestedText}>{section.text}</Text>
          </View>
        ) : (
          <Text style={styles.stubText}>{section.text}</Text>
        )}
      </View>
    );
  }

  if (section.kind === "wounds") {
    // Max two wound blocks per non-breaking group; later groups get a "(cont.)" band.
    const pairs = chunk(section.wounds, 2);
    return (
      <View>
        {pairs.map((pair, pairIndex) => (
          <View key={pairIndex} wrap={false}>
            <Band
              number={section.paperNumber}
              title={pairIndex === 0 ? section.title : `${section.title} (cont.)`}
            />
            <View style={styles.woundPair}>
              {pair.map((wound, i) => (
                <View key={wound.title} style={[{ flex: 1 }, i > 0 ? { marginLeft: 8 } : {}]}>
                  <WoundBlock wound={wound} />
                </View>
              ))}
              {pair.length === 1 ? <View style={{ flex: 1, marginLeft: 8 }} /> : null}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Band number={section.paperNumber} title={section.title} />
      {section.rows.map((row) => (
        <FieldRow key={row.key} row={row} />
      ))}
    </View>
  );
}

// ─── Document ───

export function FieldNotePDF({ data }: { data: FieldNotePdfData }) {
  const { note, signature } = data;
  const header = buildPaperHeader(note, {
    visitNumber: data.visitNumber,
    facilityName: data.facilityName,
  });
  const sections = buildPaperSections(note);
  const headerRows = chunk(header, 3);

  const footerLeft = [
    note.patient.name,
    note.patient.dob ? `DOB ${formatPaperDate(note.patient.dob)}` : null,
    `Visit ${formatPaperDate(note.visitDate)}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Document
      title={`${PAPER_TITLE} — ${note.patient.name}`}
      author={signature?.signerName ?? note.nurseName ?? "WoundNote"}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Title */}
        <Text style={styles.title}>{PAPER_TITLE}</Text>
        <Text style={styles.subtitle}>{NOTE_TYPE_LABELS[note.noteType]}</Text>

        {/* Header table (paper section 1) */}
        <View style={styles.headerTable}>
          {headerRows.map((cells, ri) => (
            <View
              key={ri}
              style={[styles.headerRow, ri < headerRows.length - 1 ? styles.headerRowBorder : {}]}
            >
              {cells.map((cell, ci) => (
                <View
                  key={cell.label}
                  style={[styles.headerCell, ci < cells.length - 1 ? styles.headerCellBorder : {}]}
                >
                  <Text style={styles.headerLabel}>{cell.label}</Text>
                  <Text style={styles.headerValue}>{cell.value || " "}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Sections 2–19 */}
        {sections.map((section) => (
          <Section key={section.key} section={section} />
        ))}

        {/* Signature area */}
        <View style={styles.signatureArea} wrap={false}>
          <Text style={styles.signatureEyebrow}>Nurse signature</Text>
          {signature ? (
            <View>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
              <Image src={signature.data} style={styles.signatureImage} />
              <Text style={styles.signatureName}>{signature.signerName}</Text>
              {signature.signedAt ? (
                <Text style={styles.signatureMeta}>Signed {formatPaperDateTime(signature.signedAt)}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.signatureBlankRow}>
              <Text style={styles.detailLabel}>Signature:</Text>
              <BlankLine width={160} />
              <Text style={[styles.detailLabel, { marginLeft: 24 }]}>Date:</Text>
              <BlankLine width={80} />
            </View>
          )}
        </View>

        {/* Fixed per-page footer */}
        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${footerLeft}  ·  Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export default FieldNotePDF;
