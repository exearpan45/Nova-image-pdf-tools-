import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
try {
  import(/* @vite-ignore */ 'pdfjs-dist/build/pdf.worker.min.mjs?url').then((workerUrlModule) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default;
  }).catch(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  });
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export async function loadPdfDocument(source: ArrayBuffer | Uint8Array) {
  // Pass a copy or slice to prevent Detached ArrayBuffer issues
  const data = source instanceof Uint8Array ? source : new Uint8Array(source);
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.0/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.5,
  fillBackground = true,
  backgroundColor = '#ffffff',
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D rendering context for PDF page');
  }

  if (fillBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Cast context to any to satisfy pdfjs-dist CanvasContext type
  const renderContext = {
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
    canvas,
  };

  await page.render(renderContext).promise;
  return canvas;
}

export async function renderPdfPageToBlob(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92,
  scale = 1.5,
  fillBackground = true,
): Promise<Blob> {
  const canvas = await renderPdfPageToCanvas(
    pdfDoc,
    pageNumber,
    scale,
    fillBackground,
    format === 'image/jpeg' ? '#ffffff' : 'transparent',
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to render page ${pageNumber} to image`));
      },
      format,
      quality,
    );
  });
}

export async function getPdfPageThumbnail(
  source: ArrayBuffer | Uint8Array,
  pageNumber = 1,
  targetWidth = 200,
): Promise<string> {
  try {
    const doc = await loadPdfDocument(source);
    const page = await doc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / unscaledViewport.width;
    const canvas = await renderPdfPageToCanvas(doc, pageNumber, scale, true, '#ffffff');
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.error('Error rendering thumbnail:', err);
    return '';
  }
}
