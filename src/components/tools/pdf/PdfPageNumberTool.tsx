import React, { useState } from 'react';
import { ListOrdered, AlertCircle, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { addPageNumbersToPdf, PageNumberOptions, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfPageNumberTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  const [position, setPosition] = useState<PageNumberOptions['position']>('bottom-center');
  const [format, setFormat] = useState<PageNumberOptions['format']>('Page X of Y');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(11);

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
      setPageCount(doc.getPageCount());
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      setError('Failed to inspect PDF. It may be encrypted or corrupted.');
      setFile(null);
    }
  };

  const handleAddPageNumbers = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const buffer = await file.arrayBuffer();
      const options: PageNumberOptions = {
        position,
        format,
        startNumber,
        fontSize,
      };

      setProgress(60);
      const numberedBytes = await addPageNumbersToPdf(buffer, options);
      setProgress(90);

      const blob = createPdfBlob(numberedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_numbered.pdf`,
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
        pagesCount: pageCount,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Page numbering error:', err);
      setError('Failed to add page numbers to PDF.');
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
              title="Upload PDF to add page numbers"
              subtitle="Drop a single PDF here or click to browse"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-xs">
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {formatBytes(file.size)} • {pageCount} pages
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-slate-500 hover:text-red-500 transition"
                >
                  Change File
                </button>
              </div>

              {/* Visual preview of page numbering */}
              <div className="relative w-full h-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-inner flex flex-col justify-between p-6">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span className={position === 'top-center' ? 'opacity-0' : position === 'top-right' ? 'opacity-0' : ''}>Page Title</span>
                  {position === 'top-center' && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {format === 'Page X of Y' ? `Page ${startNumber} of ${pageCount}` : format === 'Page X' ? `Page ${startNumber}` : format === 'X / Y' ? `${startNumber} / ${pageCount}` : `${startNumber}`}
                    </span>
                  )}
                  {position === 'top-right' && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {format === 'Page X of Y' ? `Page ${startNumber} of ${pageCount}` : format === 'Page X' ? `Page ${startNumber}` : format === 'X / Y' ? `${startNumber} / ${pageCount}` : `${startNumber}`}
                    </span>
                  )}
                </div>

                <div className="space-y-2 opacity-20">
                  <div className="w-3/4 h-2 bg-slate-400 rounded-sm" />
                  <div className="w-full h-2 bg-slate-400 rounded-sm" />
                  <div className="w-5/6 h-2 bg-slate-400 rounded-sm" />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  {position === 'bottom-left' && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {format === 'Page X of Y' ? `Page ${startNumber} of ${pageCount}` : format === 'Page X' ? `Page ${startNumber}` : format === 'X / Y' ? `${startNumber} / ${pageCount}` : `${startNumber}`}
                    </span>
                  )}
                  {position === 'bottom-center' && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mx-auto">
                      {format === 'Page X of Y' ? `Page ${startNumber} of ${pageCount}` : format === 'Page X' ? `Page ${startNumber}` : format === 'X / Y' ? `${startNumber} / ${pageCount}` : `${startNumber}`}
                    </span>
                  )}
                  {position === 'bottom-right' && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 ml-auto">
                      {format === 'Page X of Y' ? `Page ${startNumber} of ${pageCount}` : format === 'Page X' ? `Page ${startNumber}` : format === 'X / Y' ? `${startNumber} / ${pageCount}` : `${startNumber}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Numbering Position
            </h4>

            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Location on Page
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'top-center', label: 'Top Center' },
                  { id: 'top-right', label: 'Top Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id as PageNumberOptions['position'])}
                    className={`py-1.5 rounded-lg border font-medium transition ${
                      position === pos.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Format Style
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  'Page X of Y',
                  'Page X',
                  'X / Y',
                  'X',
                ].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt as PageNumberOptions['format'])}
                    className={`py-1.5 rounded-lg border font-mono transition ${
                      format === fmt
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting number */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Start Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Font Size
                </label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Math.max(8, parseInt(e.target.value, 10) || 11))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleAddPageNumbers}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <ListOrdered className="w-4 h-4" />
              <span>Add Page Numbers</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Adding page numbers..." />
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
