import { describe, expect, it } from "vitest";
import { sniffImage } from "@/lib/image-sniff";

/** Build a 16-byte upload header (what the photo action reads) from a prefix. */
function header(...prefix: Array<number | string>): Uint8Array {
  const bytes: number[] = [];
  for (const part of prefix) {
    if (typeof part === "number") bytes.push(part);
    else for (const ch of part) bytes.push(ch.charCodeAt(0));
  }
  while (bytes.length < 16) bytes.push(0x00);
  return Uint8Array.from(bytes);
}

const JPEG = header(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, "JFIF");
const PNG = header(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = header("RIFF", 0x24, 0x00, 0x00, 0x00, "WEBPVP8 ");
const isoBmff = (brand: string) =>
  header(0x00, 0x00, 0x00, 0x18, "ftyp", brand);

const NOT_AN_IMAGE = { mime: null, matchesClaim: false, allowed: false };

describe("sniffImage — format detection", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg"],
    ["PNG", PNG, "image/png"],
    ["WEBP", WEBP, "image/webp"],
  ])("recognises a %s signature", (_name, bytes, mime) => {
    expect(sniffImage(bytes, mime)).toEqual({
      mime,
      matchesClaim: true,
      allowed: true,
    });
  });

  it("recognises every supported HEIF brand in the 'ftyp' box as HEIC", () => {
    for (const brand of ["heic", "heix", "hevc", "mif1", "msf1", "heim"]) {
      expect(sniffImage(isoBmff(brand), "image/heic")).toEqual({
        mime: "image/heic",
        matchesClaim: true,
        allowed: true,
      });
    }
  });

  it.each([
    ["an MP4 video (ftyp isom)", isoBmff("isom")],
    ["an AVIF image (ftyp avif)", isoBmff("avif")],
    ["a WAV file (RIFF....WAVE)", header("RIFF", 0x24, 0, 0, 0, "WAVEfmt ")],
    ["a PDF", header("%PDF-1.7")],
    ["an HTML/script payload", header("<script>alert")],
  ])("rejects %s", (_name, bytes) => {
    expect(sniffImage(bytes, "image/png")).toEqual(NOT_AN_IMAGE);
  });

  it("requires all eight PNG signature bytes, not just the 'PNG' text", () => {
    const corrupted = header(0x89, "PNG", 0x0d, 0x0a, 0x00, 0x00);
    expect(sniffImage(corrupted, "image/png")).toEqual(NOT_AN_IMAGE);
  });

  it("requires the WEBP form type, not just a RIFF container", () => {
    const avi = header("RIFF", 0x24, 0x00, 0x00, 0x00, "AVI ");
    expect(sniffImage(avi, "image/webp")).toEqual(NOT_AN_IMAGE);
  });

  it("does not detect a format from a buffer shorter than its signature", () => {
    expect(sniffImage(new Uint8Array(0), "image/jpeg")).toEqual(NOT_AN_IMAGE);
    expect(sniffImage(Uint8Array.from([0xff, 0xd8]), "image/jpeg")).toEqual(
      NOT_AN_IMAGE
    );
    expect(
      sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]), "image/png")
    ).toEqual(NOT_AN_IMAGE);
  });
});

describe("sniffImage — claimed type", () => {
  it("flags a real image whose declared type is spoofed", () => {
    expect(sniffImage(PNG, "image/jpeg")).toEqual({
      mime: "image/png",
      matchesClaim: false,
      allowed: true,
    });
  });

  it("treats image/jpg as equivalent to image/jpeg", () => {
    expect(sniffImage(JPEG, "image/jpg").matchesClaim).toBe(true);
  });

  it("ignores case, whitespace and parameters in the declared type", () => {
    expect(sniffImage(JPEG, "  IMAGE/JPEG ; charset=binary").matchesClaim).toBe(
      true
    );
  });

  it("does not match when the client sent no type at all", () => {
    expect(sniffImage(WEBP, "")).toEqual({
      mime: "image/webp",
      matchesClaim: false,
      allowed: true,
    });
  });
});
