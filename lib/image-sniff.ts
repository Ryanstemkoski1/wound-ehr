// Server-side image MIME sniffing
//
// Server Actions and API routes must NEVER trust the client-supplied
// `File.type` for security decisions (MIME spoofing is trivial). We
// inspect the first few bytes of the upload and verify it matches the
// claimed type.
//
// Returns the canonical MIME type when recognised, or null when the
// bytes do not match any allowed image format.

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type SniffResult = {
  mime: string | null;
  /** Whether the sniffed MIME matches the client claim */
  matchesClaim: boolean;
  /** Whether the sniffed MIME is in the allow-list */
  allowed: boolean;
};

/**
 * Sniff the magic bytes of a buffer and decide whether it is a
 * supported image format. Compares against the caller's claimed
 * `Content-Type`.
 */
export function sniffImage(
  bytes: Uint8Array,
  claimedMime: string
): SniffResult {
  const claim = claimedMime.split(";")[0].trim().toLowerCase();

  let detected: string | null = null;

  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    detected = "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    detected = "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  else if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    detected = "image/webp";
  }
  // HEIC / HEIF: bytes 4-11 contain "ftyp" + brand (heic/heix/hevc/mif1/msf1)
  else if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (
      ["heic", "heix", "hevc", "mif1", "msf1", "heim", "heis"].includes(brand)
    ) {
      detected = "image/heic";
    }
  }

  const allowed = detected !== null && ALLOWED.has(detected);
  // Treat jpeg/jpg as equivalent
  const normalisedClaim = claim === "image/jpg" ? "image/jpeg" : claim;
  const matchesClaim = detected !== null && detected === normalisedClaim;

  return { mime: detected, matchesClaim, allowed };
}
