import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { loadPdfDocument, renderPdfPageToCanvas } from '../../utils/pdfRenderer';

// Configure the worker for react-pdf
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfPreviewProps {
  file: File | Blob | ArrayBuffer | Uint8Array | string | null;
  className?: string;
  width?: number;
  thumbnailOnly?: boolean;
  showControls?: boolean;
  onNumPagesLoaded?: (numPages: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  file,
  className = '',
  width = 280,
  thumbnailOnly = false,
  showControls = true,
  onNumPagesLoaded,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfSource, setPdfSource] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalScale, setModalScale] = useState(1.2);
  const [hasError, setHasError] = useState(false);
  const [canvasFallbackUrl, setCanvasFallbackUrl] = useState<string | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    setPageNumber(1);
    setHasError(false);
    setCanvasFallbackUrl(null);

    if (!file) {
      setPdfSource(null);
      return;
    }

    // Convert file to suitable format for react-pdf Document
    if (file instanceof File || file instanceof Blob) {
      const url = URL.createObjectURL(file);
      setPdfSource(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
      const copy = file instanceof Uint8Array ? file : new Uint8Array(file);
      setPdfSource({ data: copy });
    } else {
      setPdfSource(file);
    }
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setHasError(false);
    if (onNumPagesLoaded) {
      onNumPagesLoaded(numPages);
    }
  };

  const onDocumentLoadError = async (error: Error) => {
    console.warn('react-pdf Document error, switching to canvas fallback:', error);
    setHasError(true);

    if (!file) return;

    try {
      setFallbackLoading(true);
      let buffer: ArrayBuffer;
      if (file instanceof File || file instanceof Blob) {
        buffer = await file.arrayBuffer();
      } else if (file instanceof Uint8Array) {
        buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
      } else if (file instanceof ArrayBuffer) {
        buffer = file;
      } else {
        return;
      }

      const doc = await loadPdfDocument(buffer);
      setNumPages(doc.numPages);
      if (onNumPagesLoaded) onNumPagesLoaded(doc.numPages);

      const canvas = await renderPdfPageToCanvas(doc, 1, 1.2);
      const url = canvas.toDataURL('image/png');
      setCanvasFallbackUrl(url);
    } catch (fallbackErr) {
      console.error('Canvas fallback rendering also failed:', fallbackErr);
    } finally {
      setFallbackLoading(false);
    }
  };

  if (!file || !pdfSource) {
    return null;
  }

  return (
    <div
      className={`relative flex flex-col items-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 select-none overflow-hidden ${className}`}
    >
      {/* Header Preview Bar */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span>{thumbnailOnly ? 'First Page Preview' : `Page ${pageNumber} of ${numPages || '...'}`}</span>
        </div>

        <div className="flex items-center gap-1">
          {!thumbnailOnly && showControls && numPages && numPages > 1 && (
            <div className="flex items-center gap-0.5 mr-2">
              <button
                type="button"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-300"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] px-1 text-slate-600 dark:text-slate-300">
                {pageNumber}/{numPages}
              </span>
              <button
                type="button"
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-300"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Expand Fullscreen Preview"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PDF View Container */}
      <div className="w-full flex items-center justify-center overflow-auto max-h-[420px] rounded-xl bg-white dark:bg-slate-950 p-2 shadow-inner border border-slate-200/60 dark:border-slate-800/60">
        {hasError ? (
          canvasFallbackUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={canvasFallbackUrl}
                alt="PDF Thumbnail Preview"
                className="rounded shadow-xs max-w-full object-contain"
                style={{ width }}
              />
              <span className="mt-2 text-[10px] text-slate-400 font-mono">
                First Page Preview
              </span>
            </div>
          ) : fallbackLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Generating thumbnail...</span>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center p-4 text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Preview rendering unavailable
              </p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
                Document is ready for processing.
              </p>
            </div>
          )
        ) : (
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">Loading PDF preview...</span>
              </div>
            }
          >
            <Page
              pageNumber={thumbnailOnly ? 1 : pageNumber}
              width={width}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="rounded shadow-xs max-w-full overflow-hidden"
              loading={
                <div className="w-[200px] h-[260px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded flex items-center justify-center">
                  <span className="text-[11px] text-slate-400">Rendering page...</span>
                </div>
              }
            />
          </Document>
        )}
      </div>

      {/* Fullscreen Interactive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Document Preview — Page {pageNumber} of {numPages || 1}</span>
              </div>

              <div className="flex items-center gap-3">
                {numPages && numPages > 1 && (
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono px-2 text-slate-700 dark:text-slate-300">
                      {pageNumber} / {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setModalScale((s) => Math.max(0.6, s - 0.2))}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="font-mono px-1.5 text-slate-700 dark:text-slate-300">
                    {Math.round(modalScale * 100)}%
                  </span>
                  <button
                    onClick={() => setModalScale((s) => Math.min(2.5, s + 0.2))}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              <Document
                file={pdfSource}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="py-20 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-xs text-slate-400">Loading document...</span>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={modalScale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="rounded-lg shadow-xl overflow-hidden"
                />
              </Document>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
