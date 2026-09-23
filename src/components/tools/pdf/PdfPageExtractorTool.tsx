import React, { useState } from 'react';
import { ExternalLink, AlertCircle, FileText, CheckSquare, Square } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { extractPagesFromPdf, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfPageExtractorTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFileSelected = async (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setFile(sel);

    try {
      const buffer = await sel.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();
      setPageCount(count);
      // Select first page by default
      setSelectedPages(new Set([0]));
    } catch (err) {
      console.error('Failed to read PDF:', err);
      setError('Unable to parse PDF. File may be encrypted or unsupported.');
      setFile(null);
    }
  };

  const togglePage = (pageIdx: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleExtract = async () => {
    if (!file || selectedPages.size === 0) {
      setError('Please select at least one page to extract.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(25);

      const buffer = await file.arrayBuffer();
      const pagesArray = Array.from(selectedPages).sort((a, b) => a - b);
      setProgress(50);

      const extractedBytes = await extractPagesFromPdf(buffer, pagesArray);
      setProgress(90);

      const blob = createPdfBlob(extractedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_extracted.pdf`,
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
        pagesCount: pagesArray.length,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Extract error:', err);
      setError('Failed to extract selected pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setPageCount(0);
    setSelectedPages(new Set());
    setResult(null);
    setError(null);
    setProgress(0);
  };

  if (result) {
    return (
      <ResultScreen
        results={[result]}
        onDownloadSingle={(res) => downloadBlob(res.blob, res.fileName)}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {!file ? (
            <Dropzone
              accept={['.pdf']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Upload PDF to extract pages"
              subtitle="Drop your document here or click to browse"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                  {file.name} ({formatBytes(file.size)})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    onClick={clearSelection}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Grid of Pages */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
                {Array.from({ length: pageCount }, (_, idx) => {
                  const isSelected = selectedPages.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => togglePage(idx)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition select-none ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="w-12 h-16 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs mb-2">
                        <FileText className={`w-6 h-6 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Page {idx + 1}
                      </span>
                      <div className="absolute top-2 right-2">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Extractor Settings
            </h4>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div>Total document pages: <strong>{pageCount}</strong></div>
              <div>Selected to extract: <strong className="text-indigo-600 dark:text-indigo-400">{selectedPages.size}</strong></div>
            </div>

            <p className="text-xs text-slate-400">
              Only the selected pages will be bundled into the new output PDF. Original order is preserved.
            </p>

            <button
              onClick={handleExtract}
              disabled={!file || selectedPages.size === 0 || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Extract {selectedPages.size} {selectedPages.size === 1 ? 'Page' : 'Pages'}</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Extracting selected pages..." />
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
