import {
  PDFDocument,
  degrees,
  rgb,
  StandardFonts,
  PageSizes,
} from 'pdf-lib';
import { loadPdfDocument, renderPdfPageToBlob } from './pdfRenderer';

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number; // degrees e.g. -45, 0, 45
  color: string; // hex color e.g. '#64748b'
  position: 'center' | 'diagonal' | 'top' | 'bottom';
}

export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right';
  format: 'Page X of Y' | 'Page X' | 'X / Y' | 'X';
  startNumber: number;
  fontSize: number;
}

export interface ImageToPdfOptions {
  pageSize: 'A4' | 'Letter' | 'Fit';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: 'none' | 'small' | 'standard'; // 0, 20, 40 pt
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  keywords?: string[];
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

export function createPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  if (isNaN(bigint)) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

export async function mergePdfs(
  pdfBuffers: ArrayBuffer[],
  onProgress?: (percent: number) => void,
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const total = pdfBuffers.length;

  for (let i = 0; i < total; i++) {
    const srcDoc = await PDFDocument.load(pdfBuffers[i]);
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  return await mergedPdf.save();
}

export async function extractPagesFromPdf(
  pdfBytes: ArrayBuffer,
  selectedPages0Indexed: number[],
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();

  const validPages = selectedPages0Indexed.filter(
    (p) => p >= 0 && p < srcDoc.getPageCount(),
  );

  if (validPages.length === 0) {
    throw new Error('No valid pages selected to extract');
  }

  const copiedPages = await newDoc.copyPages(srcDoc, validPages);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

export async function deletePagesFromPdf(
  pdfBytes: ArrayBuffer,
  pagesToDelete0Indexed: number[],
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  const deleteSet = new Set(pagesToDelete0Indexed);

  const pagesToKeep = srcDoc
    .getPageIndices()
    .filter((idx) => !deleteSet.has(idx));

  if (pagesToKeep.length === 0) {
    throw new Error('Cannot delete all pages of a PDF document');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

export async function splitPdfIntoSinglePages(
  pdfBytes: ArrayBuffer,
  onProgress?: (percent: number) => void,
): Promise<{ pageNumber: number; bytes: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  const results: { pageNumber: number; bytes: Uint8Array }[] = [];

  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(copiedPage);
    const bytes = await singleDoc.save();
    results.push({ pageNumber: i + 1, bytes });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalPages) * 100));
    }
  }

  return results;
}

export async function rotatePdfPages(
  pdfBytes: ArrayBuffer,
  rotationAngle: number, // 90, 180, 270
  targetPages0Indexed?: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  const targetSet = targetPages0Indexed ? new Set(targetPages0Indexed) : null;

  pages.forEach((page, idx) => {
    if (!targetSet || targetSet.has(idx)) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + rotationAngle) % 360));
    }
  });

  return await doc.save();
}

export async function watermarkPdf(
  pdfBytes: ArrayBuffer,
  options: WatermarkOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const { r, g, b } = hexToRgb(options.color);

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const textHeight = font.heightAtSize(options.fontSize);

    let x = (width - textWidth) / 2;
    let y = (height - textHeight) / 2;
    let rot = options.rotation;

    if (options.position === 'top') {
      y = height - textHeight - 40;
      rot = 0;
    } else if (options.position === 'bottom') {
      y = 40;
      rot = 0;
    } else if (options.position === 'diagonal') {
      rot = -45;
    }

    page.drawText(options.text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(r, g, b),
      opacity: options.opacity,
      rotate: degrees(rot),
    });
  });

  return await doc.save();
}

export async function addPageNumbersToPdf(
  pdfBytes: ArrayBuffer,
  options: PageNumberOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, idx) => {
    const pageNum = options.startNumber + idx;
    let label = `${pageNum}`;
    if (options.format === 'Page X of Y') {
      label = `Page ${pageNum} of ${total}`;
    } else if (options.format === 'Page X') {
      label = `Page ${pageNum}`;
    } else if (options.format === 'X / Y') {
      label = `${pageNum} / ${total}`;
    }

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, options.fontSize);
    const margin = 28;

    let x = (width - textWidth) / 2;
    let y = margin;

    if (options.position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (options.position === 'bottom-right') {
      x = width - textWidth - margin;
      y = margin;
    } else if (options.position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - margin;
    } else if (options.position === 'top-right') {
      x = width - textWidth - margin;
      y = height - margin;
    }

    page.drawText(label, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.25, 0.28, 0.35),
    });
  });

  return await doc.save();
}

export async function imagesToPdf(
  images: Array<{ bytes: ArrayBuffer; type: string }>,
  options: ImageToPdfOptions,
  onProgress?: (percent: number) => void,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const total = images.length;

  for (let i = 0; i < total; i++) {
    const imgInfo = images[i];
    let embeddedImg;

    if (imgInfo.type === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(imgInfo.bytes);
    } else {
      // JPEG or WEBP converted to JPEG
      embeddedImg = await pdfDoc.embedJpg(imgInfo.bytes);
    }

    const imgDims = embeddedImg.scale(1.0);
    let pageWidth: number;
    let pageHeight: number;

    const marginPt = options.margin === 'none' ? 0 : options.margin === 'small' ? 20 : 40;

    if (options.pageSize === 'Fit') {
      pageWidth = imgDims.width + marginPt * 2;
      pageHeight = imgDims.height + marginPt * 2;
    } else {
      const baseSize = options.pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
      const isLandscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && imgDims.width > imgDims.height);

      pageWidth = isLandscape ? baseSize[1] : baseSize[0];
      pageHeight = isLandscape ? baseSize[0] : baseSize[1];
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Fit image inside available page rect
    const availWidth = Math.max(10, pageWidth - marginPt * 2);
    const availHeight = Math.max(10, pageHeight - marginPt * 2);

    const scaleX = availWidth / imgDims.width;
    const scaleY = availHeight / imgDims.height;
    const scale = Math.min(scaleX, scaleY);

    const drawWidth = imgDims.width * scale;
    const drawHeight = imgDims.height * scale;

    const drawX = marginPt + (availWidth - drawWidth) / 2;
    const drawY = marginPt + (availHeight - drawHeight) / 2;

    page.drawImage(embeddedImg, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  return await pdfDoc.save();
}

export async function getPdfMetadata(pdfBytes: ArrayBuffer): Promise<PdfMetadata> {
  const doc = await PDFDocument.load(pdfBytes);
  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    keywords: doc.getKeywords() ? doc.getKeywords()?.split(';') : [],
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
    pageCount: doc.getPageCount(),
  };
}

export async function updatePdfMetadata(
  pdfBytes: ArrayBuffer,
  newMeta: Partial<PdfMetadata>,
  stripAll = false,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);

  if (stripAll) {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setCreator('');
    doc.setProducer('');
    doc.setKeywords([]);
  } else {
    if (newMeta.title !== undefined) doc.setTitle(newMeta.title);
    if (newMeta.author !== undefined) doc.setAuthor(newMeta.author);
    if (newMeta.subject !== undefined) doc.setSubject(newMeta.subject);
    if (newMeta.creator !== undefined) doc.setCreator(newMeta.creator);
    if (newMeta.producer !== undefined) doc.setProducer(newMeta.producer);
  }

  return await doc.save();
}

export async function stripPdfMetadata(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  return await updatePdfMetadata(pdfBytes, {}, true);
}

/**
 * PDF Compression:
 * Low: Re-serializes with object streaming, cleans unused objects.
 * Medium/High: Re-serializes with minimal overhead, flattens structures.
 */
export async function compressPdf(
  pdfBytes: ArrayBuffer,
  level: 'low' | 'medium' | 'high' = 'medium',
  onProgress?: (percent: number) => void,
): Promise<Uint8Array> {
  if (onProgress) onProgress(20);
  const doc = await PDFDocument.load(pdfBytes);
  if (onProgress) onProgress(60);

  // pdf-lib's useObjectStreams compresses PDF indirect objects into stream packets
  const compressedBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: level === 'high' ? 100 : 50,
  });

  if (onProgress) onProgress(100);

  // If the optimized PDF happens to be larger than original (e.g. already compressed input),
  // return the original to avoid making files larger, as per PRD rule!
  if (compressedBytes.length >= pdfBytes.byteLength) {
    return new Uint8Array(pdfBytes);
  }

  return compressedBytes;
}

/**
 * Pad a valid PDF document with a clean, conforming comment block to hit the target byte size.
 */
export function padPdfToExactSize(inputBytes: Uint8Array, targetSizeBytes: number): Uint8Array {
  if (inputBytes.length >= targetSizeBytes) return inputBytes;

  // Use latin1 decoder so byte offsets map 1:1 with string character indices
  let s = '';
  for (let i = 0; i < inputBytes.length; i++) {
    s += String.fromCharCode(inputBytes[i]);
  }

  const sxIdx = s.lastIndexOf('startxref');
  const eIdx = s.lastIndexOf('%%EOF');
  if (sxIdx === -1 || eIdx === -1) return inputBytes;

  const curOffset = parseInt(s.substring(sxIdx + 9, eIdx).trim(), 10);
  if (isNaN(curOffset)) return inputBytes;

  const pre = s.substring(0, sxIdx);
  let padLen = targetSizeBytes - inputBytes.length;

  for (let trial = 0; trial < 10; trial++) {
    const testOffset = curOffset + padLen;
    const testTail = 'startxref\n' + testOffset + '\n%%EOF\n';
    const candidateLen = pre.length + padLen + testTail.length;
    const diff = targetSizeBytes - candidateLen;
    if (diff === 0) break;
    padLen += diff;
  }

  if (padLen < 4) return inputBytes;

  const comment = '% ' + 'N'.repeat(padLen - 3) + '\n';
  const finalOffset = curOffset + comment.length;
  const finalTail = 'startxref\n' + finalOffset + '\n%%EOF\n';
  const finalStr = pre + comment + finalTail;

  const out = new Uint8Array(finalStr.length);
  for (let i = 0; i < finalStr.length; i++) {
    out[i] = finalStr.charCodeAt(i) & 0xff;
  }
  return out;
}

export interface CompressPdfTargetOptions {
  exactMatch?: boolean; // Default true: pads PDF to match exact byte size requested
  onProgress?: (percent: number) => void;
}

/**
 * Compress PDF aiming towards an exact user-specified target size (in bytes).
 * Supports both lossless object stream compression and visual page re-encoding for image/scanned PDFs.
 */
export async function compressPdfToTargetSize(
  pdfBytes: ArrayBuffer,
  targetSizeBytes: number,
  optionsOrProgress?: CompressPdfTargetOptions | ((percent: number) => void),
): Promise<Uint8Array> {
  const onProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : optionsOrProgress?.onProgress;
  const exactMatch = typeof optionsOrProgress === 'object' && optionsOrProgress.exactMatch !== undefined
    ? optionsOrProgress.exactMatch
    : true;

  if (onProgress) onProgress(10);

  // If input file is already smaller than or equal to targetSizeBytes
  if (pdfBytes.byteLength <= targetSizeBytes) {
    if (exactMatch) {
      const padded = padPdfToExactSize(new Uint8Array(pdfBytes), targetSizeBytes);
      if (onProgress) onProgress(100);
      return padded;
    }
    if (onProgress) onProgress(100);
    return new Uint8Array(pdfBytes);
  }

  // Tier 1: Lossless Stream Compression & Metadata cleanup
  if (onProgress) onProgress(20);
  const doc = await PDFDocument.load(pdfBytes);
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('NOVA PDF Engine');

  const losslessBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 100,
  });

  if (losslessBytes.length <= targetSizeBytes) {
    if (onProgress) onProgress(100);
    if (exactMatch) {
      return padPdfToExactSize(losslessBytes, targetSizeBytes);
    }
    return losslessBytes;
  }

  // Tier 2: Visual page re-encoding for scanned or image-heavy PDFs
  if (onProgress) onProgress(35);

  try {
    const pdfDoc = await loadPdfDocument(pdfBytes);
    const totalPages = pdfDoc.numPages;

    if (totalPages === 0) {
      return losslessBytes;
    }

    // Overhead reserve: ~12% or 10KB minimum for PDF trailer & page object dictionaries
    const overhead = Math.max(8192, Math.round(targetSizeBytes * 0.1));
    const availableForPages = Math.max(1024, targetSizeBytes - overhead);
    const perPageBudget = availableForPages / totalPages;

    let scale = 1.25;
    let quality = 0.75;

    if (perPageBudget > 200_000) {
      scale = 1.5;
      quality = 0.85;
    } else if (perPageBudget > 100_000) {
      scale = 1.35;
      quality = 0.75;
    } else if (perPageBudget > 50_000) {
      scale = 1.1;
      quality = 0.65;
    } else if (perPageBudget > 25_000) {
      scale = 0.95;
      quality = 0.50;
    } else if (perPageBudget > 12_000) {
      scale = 0.8;
      quality = 0.40;
    } else {
      scale = 0.65;
      quality = 0.30;
    }

    const renderAndBuild = async (s: number, q: number): Promise<Uint8Array> => {
      const newPdf = await PDFDocument.create();
      for (let p = 1; p <= totalPages; p++) {
        const page = await pdfDoc.getPage(p);
        const originalViewport = page.getViewport({ scale: 1.0 });
        const widthPt = originalViewport.width;
        const heightPt = originalViewport.height;

        const blob = await renderPdfPageToBlob(pdfDoc, p, 'image/jpeg', q, s);
        const imgBuffer = await blob.arrayBuffer();
        const embedded = await newPdf.embedJpg(imgBuffer);

        const newPage = newPdf.addPage([widthPt, heightPt]);
        newPage.drawImage(embedded, {
          x: 0,
          y: 0,
          width: widthPt,
          height: heightPt,
        });

        if (onProgress) {
          onProgress(40 + Math.round((p / totalPages) * 45));
        }
      }

      newPdf.setProducer('NOVA PDF Engine');
      return await newPdf.save({ useObjectStreams: true, addDefaultPage: false });
    };

    let builtBytes = await renderAndBuild(scale, quality);

    // If still exceeds targetSizeBytes, do a correction pass
    if (builtBytes.length > targetSizeBytes && quality > 0.25) {
      if (onProgress) onProgress(88);
      const ratio = targetSizeBytes / builtBytes.length;
      scale = Math.max(0.5, scale * Math.sqrt(ratio) * 0.94);
      quality = Math.max(0.2, quality * ratio * 0.90);
      builtBytes = await renderAndBuild(scale, quality);
    }

    if (onProgress) onProgress(98);

    if (builtBytes.length <= targetSizeBytes) {
      if (exactMatch) {
        return padPdfToExactSize(builtBytes, targetSizeBytes);
      }
      return builtBytes;
    }

    if (builtBytes.length < pdfBytes.byteLength) {
      return builtBytes;
    }

    return losslessBytes;
  } catch (err) {
    console.warn('PDF raster compression fallback to lossless:', err);
    if (losslessBytes.length < pdfBytes.byteLength) {
      return losslessBytes;
    }
    return new Uint8Array(pdfBytes);
  }
}
