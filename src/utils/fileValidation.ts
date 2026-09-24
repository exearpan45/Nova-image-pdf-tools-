import { PDFDocument } from 'pdf-lib';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB MVP boundary

export type DetectedFormat = 'pdf' | 'jpeg' | 'png' | 'webp' | 'unknown';

/**
 * Sniffs the magic bytes (first 16 bytes) of an incoming file to determine real format.
 * Never trusts file extension alone (Requirement 46).
 */
export async function sniffFileFormat(file: File): Promise<DetectedFormat> {
  if (file.size < 4) return 'unknown';

  const slice = file.slice(0, 16);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'pdf';
  }

  // JPEG: 0xFF, 0xD8, 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return 'unknown';
}

/**
 * Validates incoming files against MVP boundaries (Requirement 46 & 47).
 */
export async function validateIncomingFile(
  file: File,
  acceptedExtensions: string[],
): Promise<{ valid: boolean; error?: string; warning?: string }> {
  // 1. Check size
  if (file.size === 0) {
    return {
      valid: false,
      error: 'This file is empty (0 bytes) and cannot be processed.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'This file is too large for this operation on your device/browser. Try a smaller file.',
    };
  }

  // 2. Extension check
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const extMatch = acceptedExtensions.some((a) => a.toLowerCase() === ext);

  if (!extMatch) {
    return {
      valid: false,
      error: `Unsupported file format (${ext.toUpperCase()}). Please select ${acceptedExtensions.join(', ').toUpperCase()}.`,
    };
  }

  // 3. Magic bytes / header format check
  const realFormat = await sniffFileFormat(file);

  const expectsPdf = acceptedExtensions.includes('.pdf');
  const expectsImage =
    acceptedExtensions.includes('.jpg') ||
    acceptedExtensions.includes('.jpeg') ||
    acceptedExtensions.includes('.png') ||
    acceptedExtensions.includes('.webp');

  if (expectsPdf && !expectsImage) {
    if (realFormat !== 'pdf') {
      return {
        valid: false,
        error: 'This file is not a valid PDF document (header mismatch or corrupted).',
      };
    }
  }

  if (expectsImage && !expectsPdf) {
    if (realFormat !== 'jpeg' && realFormat !== 'png' && realFormat !== 'webp') {
      return {
        valid: false,
        error: 'This file does not contain valid image data (JPG, PNG, or WEBP required).',
      };
    }
  }

  // 4. Memory warning for files > 30MB
  let warning: string | undefined;
  if (file.size > 30 * 1024 * 1024) {
    warning = 'This file is large and may require significant memory to process in your browser.';
  }

  return { valid: true, warning };
}

/**
 * Output Validation (Requirement 63).
 * Every processing operation must validate its output before presenting download.
 */
export async function validatePdfOutput(blob: Blob): Promise<{ valid: boolean; error?: string }> {
  if (!blob || blob.size === 0) {
    return { valid: false, error: "We couldn't create a valid output file. Please try again." };
  }

  try {
    const buffer = await blob.arrayBuffer();
    // Verify PDF header %PDF-
    const header = new Uint8Array(buffer.slice(0, 5));
    if (
      header[0] !== 0x25 ||
      header[1] !== 0x50 ||
      header[2] !== 0x44 ||
      header[3] !== 0x46 ||
      header[4] !== 0x2d
    ) {
      return { valid: false, error: "We couldn't create a valid output file. Please try again." };
    }

    // Try parsing document structure with pdf-lib
    const doc = await PDFDocument.load(buffer);
    if (doc.getPageCount() === 0) {
      return { valid: false, error: "We couldn't create a valid output file. Document has 0 pages." };
    }

    return { valid: true };
  } catch (err) {
    console.error('PDF output validation failed:', err);
    return { valid: false, error: "We couldn't create a valid output file. Please try again." };
  }
}

export async function validateImageOutput(
  blob: Blob,
): Promise<{ valid: boolean; width?: number; height?: number; error?: string }> {
  if (!blob || blob.size === 0) {
    return { valid: false, error: "We couldn't create a valid output file. Please try again." };
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      if (w > 0 && h > 0) {
        resolve({ valid: true, width: w, height: h });
      } else {
        resolve({ valid: false, error: "We couldn't create a valid output file. Please try again." });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: "We couldn't create a valid output file. Please try again." });
    };
    img.src = url;
  });
}

/**
 * Filename Sanitization (Requirement 64).
 * Strips HTML, script injections, and invalid filesystem characters.
 */
export function sanitizeSafeFilename(name: string, fallback = 'document'): string {
  if (!name) return fallback;
  // Strip control characters, quotes, tags, path separators
  let clean = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim();

  if (!clean || clean === '.') {
    clean = fallback;
  }
  return clean;
}

export function getFilenameWithoutExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}
