export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getFilenameWithoutExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.substring(0, lastDot);
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Parses user input page ranges e.g. "1-3, 5, 8-10" into 0-indexed page indices.
 * maxPages is the 1-based page count.
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i);
  }

  const result = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;

    if (clean.includes('-')) {
      const [startStr, endStr] = clean.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);

      if (isNaN(start) || isNaN(end)) continue;

      const min = Math.max(1, Math.min(start, end));
      const max = Math.min(maxPages, Math.max(start, end));

      for (let p = min; p <= max; p++) {
        result.add(p - 1); // 0-indexed
      }
    } else {
      const page = parseInt(clean, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        result.add(page - 1); // 0-indexed
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

export function calculateSavings(originalSize: number, newSize: number) {
  const savedBytes = Math.max(0, originalSize - newSize);
  const percentage =
    originalSize > 0
      ? Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))
      : 0;
  const isReduced = newSize < originalSize;

  return {
    savedBytes,
    percentage,
    isReduced,
  };
}
