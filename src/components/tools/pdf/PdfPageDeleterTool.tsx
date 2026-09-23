import React, { useState } from 'react';
import { Trash2, AlertCircle, FileText, XCircle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { deletePagesFromPdf, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfPageDeleterTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pagesToDelete, setPagesToDelete] = useState<Set<number>>(new Set());
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
      setPagesToDelete(new Set());
    } catch (err) {
      console.error('Failed to read PDF:', err);
      setError('Unable to parse PDF. File may be encrypted or corrupted.');
      setFile(null);
    }
  };

  const toggleDeletePage = (pageIdx: number) => {
    setPagesToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!file || pagesToDelete.size === 0) {
      setError('Please click on at least one page to mark for deletion.');
      return;
    }

    if (pagesToDelete.size >= pageCount) {
      setError('Cannot delete all pages. A PDF must have at least 1 page remaining.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(25);

      const buffer = await file.arrayBuffer();
      const pagesArray = Array.from(pagesToDelete);
      setProgress(50);

      const cleanedBytes = await deletePagesFromPdf(buffer, pagesArray);
      setProgress(90);

      const blob = createPdfBlob(cleanedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_cleaned.pdf`,
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
        pagesCount: pageCount - pagesToDelete.size,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Delete pages error:', err);
      setError('Failed to delete pages from PDF.');
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
    setPagesToDelete(new Set());
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
              title="Upload PDF to delete pages"
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
                    onClick={() => setPagesToDelete(new Set())}
                    className="text-slate-500 hover:text-indigo-600 transition"
                  >
                    Reset Selection
                  </button>
                </div>
              </div>

              {/* Grid of Pages */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
                {Array.from({ length: pageCount }, (_, idx) => {
                  const isMarkedForDelete = pagesToDelete.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleDeletePage(idx)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition select-none ${
                        isMarkedForDelete
                          ? 'border-red-500 bg-red-50/70 dark:bg-red-950/50 ring-2 ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className={`w-12 h-16 rounded-md bg-white dark:bg-slate-900 border flex items-center justify-center shadow-2xs mb-2 ${
                        isMarkedForDelete ? 'border-red-300 dark:border-red-900' : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        <FileText className={`w-6 h-6 ${isMarkedForDelete ? 'text-red-500' : 'text-slate-400'}`} />
                      </div>
                      <span className={`text-xs font-semibold ${isMarkedForDelete ? 'text-red-600 dark:text-red-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                        Page {idx + 1}
                      </span>
                      <div className="absolute top-2 right-2">
                        {isMarkedForDelete && (
                          <XCircle className="w-4 h-4 text-red-500" />
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
              <Trash2 className="w-4 h-4 text-red-500" />
              Delete Pages
            </h4>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div>Total pages: <strong>{pageCount}</strong></div>
              <div>Marked to delete: <strong className="text-red-600 dark:text-red-400">{pagesToDelete.size}</strong></div>
              <div>Remaining pages: <strong>{Math.max(0, pageCount - pagesToDelete.size)}</strong></div>
            </div>

            <p className="text-xs text-slate-400">
              Click on any page tile on the left to mark/unmark it for removal.
            </p>

            <button
              onClick={handleDelete}
              disabled={!file || pagesToDelete.size === 0 || pagesToDelete.size >= pageCount || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove {pagesToDelete.size} {pagesToDelete.size === 1 ? 'Page' : 'Pages'}</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Removing pages from PDF..." />
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
