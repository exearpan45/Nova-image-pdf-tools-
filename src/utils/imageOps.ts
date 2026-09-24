export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  mimeType: string;
  lastModified: string;
}

export function loadImage(fileOrUrl: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image file.'));
    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      img.src = URL.createObjectURL(fileOrUrl);
    }
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.9,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      type,
      quality,
    );
  });
}

export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

export async function getImageMetadata(file: File): Promise<ImageMetadata> {
  const dims = await getImageDimensions(file);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const w = dims.width;
  const h = dims.height;
  const divisor = gcd(w, h);
  const aspect = `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;

  return {
    fileName: file.name,
    fileSize: file.size,
    width: w,
    height: h,
    aspectRatio: aspect,
    format: file.name.split('.').pop()?.toUpperCase() || 'IMAGE',
    mimeType: file.type || 'image/jpeg',
    lastModified: new Date(file.lastModified).toLocaleString(),
  };
}

export async function compressImage(
  file: File,
  quality: number, // 0.1 to 1.0
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<Blob> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format =
    outputFormat ||
    (file.type as 'image/jpeg' | 'image/png' | 'image/webp') ||
    'image/jpeg';

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  return await canvasToBlob(canvas, format, quality);
}

export function crc32(buf: Uint8Array): number {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export function padJpegToExactSize(jpegBytes: Uint8Array, targetSizeBytes: number): Uint8Array {
  if (jpegBytes.length >= targetSizeBytes) return jpegBytes;
  let delta = targetSizeBytes - jpegBytes.length;
  if (delta < 4) return jpegBytes;

  const chunks: Uint8Array[] = [];
  chunks.push(jpegBytes.subarray(0, 2)); // SOI: 0xFF, 0xD8

  while (delta >= 4) {
    const chunkSize = Math.min(delta, 65535);
    const lenField = chunkSize - 2;
    const header = new Uint8Array([0xff, 0xfe, (lenField >> 8) & 0xff, lenField & 0xff]);
    const payload = new Uint8Array(chunkSize - 4);
    payload.fill(0x20); // ASCII space padding
    chunks.push(header);
    chunks.push(payload);
    delta -= chunkSize;
  }

  chunks.push(jpegBytes.subarray(2));

  // Combine chunks into single typed array
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export function padWebpToExactSize(webpBytes: Uint8Array, targetSizeBytes: number): Uint8Array {
  if (webpBytes.length >= targetSizeBytes) return webpBytes;
  const delta = targetSizeBytes - webpBytes.length;
  if (delta < 12) return webpBytes;

  let payloadLen: number;
  let padByte = 0;
  if (delta % 2 === 0) {
    payloadLen = delta - 8;
    padByte = 0;
  } else {
    payloadLen = delta - 9;
    padByte = 1;
  }

  const chunkHeader = new Uint8Array(8);
  // 'JUNK'
  chunkHeader[0] = 0x4a;
  chunkHeader[1] = 0x55;
  chunkHeader[2] = 0x4e;
  chunkHeader[3] = 0x4b;
  // little-endian uint32 payloadLen
  chunkHeader[4] = payloadLen & 0xff;
  chunkHeader[5] = (payloadLen >> 8) & 0xff;
  chunkHeader[6] = (payloadLen >> 16) & 0xff;
  chunkHeader[7] = (payloadLen >> 24) & 0xff;

  const payload = new Uint8Array(payloadLen);
  const pad = padByte ? new Uint8Array([0x00]) : new Uint8Array(0);

  const totalLen = webpBytes.length + chunkHeader.length + payload.length + pad.length;
  const out = new Uint8Array(totalLen);
  out.set(webpBytes, 0);
  out.set(chunkHeader, webpBytes.length);
  out.set(payload, webpBytes.length + 8);
  if (padByte) {
    out.set(pad, webpBytes.length + 8 + payloadLen);
  }

  // Update RIFF total length at offset 4..7 (fileSize - 8)
  const riffLen = totalLen - 8;
  out[4] = riffLen & 0xff;
  out[5] = (riffLen >> 8) & 0xff;
  out[6] = (riffLen >> 16) & 0xff;
  out[7] = (riffLen >> 24) & 0xff;

  return out;
}

export function padPngToExactSize(pngBytes: Uint8Array, targetSizeBytes: number): Uint8Array {
  if (pngBytes.length >= targetSizeBytes) return pngBytes;
  const delta = targetSizeBytes - pngBytes.length;
  if (delta < 12) return pngBytes;

  const payloadLen = delta - 12;
  const payload = new Uint8Array(payloadLen);
  payload.fill(0x20);

  const type = new Uint8Array([0x63, 0x6f, 0x4d, 0x6d]); // 'coMm' (safe ancillary private chunk)
  const typeAndPayload = new Uint8Array(4 + payloadLen);
  typeAndPayload.set(type, 0);
  typeAndPayload.set(payload, 4);
  const crcVal = crc32(typeAndPayload);

  const chunkHeader = new Uint8Array(4);
  chunkHeader[0] = (payloadLen >> 24) & 0xff;
  chunkHeader[1] = (payloadLen >> 16) & 0xff;
  chunkHeader[2] = (payloadLen >> 8) & 0xff;
  chunkHeader[3] = payloadLen & 0xff;

  const crcBuf = new Uint8Array(4);
  crcBuf[0] = (crcVal >> 24) & 0xff;
  crcBuf[1] = (crcVal >> 16) & 0xff;
  crcBuf[2] = (crcVal >> 8) & 0xff;
  crcBuf[3] = crcVal & 0xff;

  const iendPos = Math.max(0, pngBytes.length - 12);
  const pre = pngBytes.subarray(0, iendPos);
  const post = pngBytes.subarray(iendPos);

  const out = new Uint8Array(pngBytes.length + delta);
  let cur = 0;
  out.set(pre, cur);
  cur += pre.length;
  out.set(chunkHeader, cur);
  cur += 4;
  out.set(typeAndPayload, cur);
  cur += typeAndPayload.length;
  out.set(crcBuf, cur);
  cur += 4;
  out.set(post, cur);

  return out;
}

export async function padImageBlobToExactSize(
  blob: Blob,
  targetSizeBytes: number,
  mimeType: string,
): Promise<Blob> {
  if (blob.size >= targetSizeBytes) return blob;
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (mimeType === 'image/jpeg' || mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    const padded = padJpegToExactSize(bytes, targetSizeBytes);
    return new Blob([padded as unknown as BlobPart], { type: 'image/jpeg' });
  } else if (mimeType === 'image/webp' || mimeType.includes('webp')) {
    const padded = padWebpToExactSize(bytes, targetSizeBytes);
    return new Blob([padded as unknown as BlobPart], { type: 'image/webp' });
  } else if (mimeType === 'image/png' || mimeType.includes('png')) {
    const padded = padPngToExactSize(bytes, targetSizeBytes);
    return new Blob([padded as unknown as BlobPart], { type: 'image/png' });
  }

  return blob;
}

export interface CompressTargetOptions {
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  exactMatch?: boolean; // Default true: pads image to hit exact byte size requested
  onProgress?: (percent: number) => void;
}

export async function compressImageToTargetSize(
  file: File,
  targetSizeBytes: number,
  outputFormatOrOptions?: 'image/jpeg' | 'image/png' | 'image/webp' | CompressTargetOptions,
  onProgressParam?: (percent: number) => void,
): Promise<Blob> {
  let format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
  let exactMatch = true;
  let onProgress = onProgressParam;

  if (typeof outputFormatOrOptions === 'string') {
    format = outputFormatOrOptions;
  } else if (typeof outputFormatOrOptions === 'object' && outputFormatOrOptions !== null) {
    if (outputFormatOrOptions.outputFormat) format = outputFormatOrOptions.outputFormat;
    if (outputFormatOrOptions.exactMatch !== undefined) exactMatch = outputFormatOrOptions.exactMatch;
    if (outputFormatOrOptions.onProgress) onProgress = outputFormatOrOptions.onProgress;
  } else {
    // If input file is PNG and user is targeting a small file size, JPEG yields true target match
    if (file.type === 'image/webp') format = 'image/webp';
    else format = 'image/jpeg';
  }

  if (onProgress) onProgress(15);

  const img = await loadImage(file);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  // Render helper at specific scale and quality
  const renderAt = async (scale: number, q: number): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(naturalW * scale));
    canvas.height = Math.max(1, Math.round(naturalH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await canvasToBlob(canvas, format, q);
  };

  // Safe ceiling: when exactMatch is true, leave at least 32 bytes for the harmless padding marker
  const safeTargetCeiling = exactMatch ? Math.max(100, targetSizeBytes - 32) : targetSizeBytes;

  if (onProgress) onProgress(25);

  // If source file is already smaller than targetSizeBytes
  if (file.size <= safeTargetCeiling) {
    // Re-encode at high quality to check
    const highQBlob = await renderAt(1.0, 0.95);
    if (highQBlob.size <= safeTargetCeiling) {
      if (onProgress) onProgress(100);
      if (exactMatch) {
        return await padImageBlobToExactSize(highQBlob, targetSizeBytes, format);
      }
      return highQBlob;
    }
  }

  let bestBlob: Blob | null = null;

  // Pass 1: Try full resolution with binary quality search
  let lowQ = 0.08;
  let highQ = 0.95;
  const testLowest = await renderAt(1.0, lowQ);

  if (onProgress) onProgress(40);

  if (testLowest.size <= safeTargetCeiling) {
    // Full resolution CAN achieve target size! Binary search quality up to 6 iterations
    bestBlob = testLowest;
    for (let iter = 0; iter < 6; iter++) {
      const midQ = (lowQ + highQ) / 2;
      const blob = await renderAt(1.0, midQ);
      if (onProgress) onProgress(40 + Math.round((iter / 6) * 45));

      if (blob.size <= safeTargetCeiling) {
        bestBlob = blob;
        lowQ = midQ; // try higher quality
      } else {
        highQ = midQ; // try lower quality
      }
    }
  } else {
    // Full resolution even at low quality exceeds target size. We must scale resolution!
    if (onProgress) onProgress(50);

    let curScale = Math.max(0.05, Math.min(0.95, Math.sqrt(safeTargetCeiling / testLowest.size) * 0.96));
    let curQuality = 0.75;

    // Iterative convergence loop (up to 6 iterations)
    for (let iter = 0; iter < 6; iter++) {
      const blob = await renderAt(curScale, curQuality);
      if (onProgress) onProgress(50 + Math.round((iter / 6) * 40));

      if (blob.size <= safeTargetCeiling) {
        bestBlob = blob;
        // If within 90% of target, excellent!
        if (blob.size >= safeTargetCeiling * 0.88) {
          break;
        }
        // Slightly increase scale or quality to get closer to target
        curScale = Math.min(0.98, curScale * 1.05);
        curQuality = Math.min(0.92, curQuality + 0.05);
      } else {
        // Exceeds target, scale down
        const ratio = safeTargetCeiling / blob.size;
        curScale = Math.max(0.05, curScale * Math.sqrt(ratio) * 0.96);
        if (curQuality > 0.45) curQuality -= 0.1;
      }
    }
  }

  // Fallback if no candidate fell strictly under ceiling
  if (!bestBlob) {
    bestBlob = await renderAt(0.3, 0.4);
  }

  if (onProgress) onProgress(95);

  // Precision exact padding if enabled
  if (exactMatch && bestBlob.size < targetSizeBytes) {
    const finalPadded = await padImageBlobToExactSize(bestBlob, targetSizeBytes, format);
    if (onProgress) onProgress(100);
    return finalPadded;
  }

  if (onProgress) onProgress(100);
  return bestBlob;
}

export async function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  outputFormat?: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetWidth));
  canvas.height = Math.max(1, Math.round(targetHeight));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format = outputFormat || file.type || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await canvasToBlob(canvas, format, quality);
}

export async function cropImage(
  file: File,
  x: number,
  y: number,
  width: number,
  height: number,
  outputFormat?: string,
  quality = 0.95,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format = outputFormat || file.type || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height);

  return await canvasToBlob(canvas, format, quality);
}

export async function convertImageFormat(
  file: File,
  targetFormat: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);
  return await canvasToBlob(canvas, targetFormat, quality);
}

export async function rotateAndFlipImage(
  file: File,
  angleDeg: number,
  flipH: boolean,
  flipV: boolean,
  outputFormat?: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const isRotated90 = angleDeg % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = isRotated90 ? h : w;
  canvas.height = isRotated90 ? w : h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const format = outputFormat || file.type || 'image/jpeg';
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();

  return await canvasToBlob(canvas, format, quality);
}

export async function scaleImagePercentage(
  file: File,
  percent: number,
  outputFormat?: string,
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImage(file);
  const targetW = Math.max(1, Math.round((img.naturalWidth * percent) / 100));
  const targetH = Math.max(1, Math.round((img.naturalHeight * percent) / 100));

  return await resizeImage(file, targetW, targetH, outputFormat, quality);
}

const hexToRgb = (hex: string) => {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16) || 255,
    g: parseInt(c.substring(2, 4), 16) || 255,
    b: parseInt(c.substring(4, 6), 16) || 255,
  };
};

export async function removeSolidBackground(
  file: File,
  targetHexColor: string,
  tolerance = 30,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const targetColor = hexToRgb(targetHexColor);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - targetColor.r, 2) +
        Math.pow(g - targetColor.g, 2) +
        Math.pow(b - targetColor.b, 2),
    );

    if (dist <= tolerance) {
      data[i + 3] = 0; // alpha = 0 (transparent)
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return await canvasToBlob(canvas, 'image/png', 1.0);
}

export async function replaceBackgroundColor(
  file: File,
  newBgHexColor: string,
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.fillStyle = newBgHexColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  return await canvasToBlob(canvas, 'image/png', 1.0);
}
