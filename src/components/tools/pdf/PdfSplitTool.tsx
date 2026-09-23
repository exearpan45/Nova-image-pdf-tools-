import React, { useState } from 'react';
import { Scissors, AlertCircle, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import {
  extractPagesFromPdf,
  splitPdfIntoSinglePages,
  createPdfBlob,
} from '../../../utils/pdfOps';
import {
  parsePageRange,
  formatBytes,
  getFilenameWithoutExt,
} from '../../../utils/formatters';
import { downloadBlob, downloadFilesAsZip } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfSplitTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'every' | 'range'>('range');
  const [rangeInput, setRangeInput] = useState('1-3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedResult[] | null>(null);

  const handleFileSelected = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setError(null);
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();
      setTotalPages(count);
      setRangeInput(`1-${Math.min(3, count)}`);
    } catch (err) {
      console.error('Failed to read PDF pages:', err);
      setError('Failed to inspect PDF. The file may be damaged or password-protected.');
      setFile(null);
    }
  };

  const handleSplit = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(10);

      const buffer = await file.arrayBuffer();
      const baseName = getFilenameWithoutExt(file.name);
      const createdResults: ProcessedResult[] = [];

      if (splitMode === 'every') {
        const pages = await splitPdfIntoSinglePages(buffer, (p) => {
          setProgress(10 + Math.round(p * 0.85));
        });

        pages.forEach((p) => {
          const blob = createPdfBlob(p.bytes);
          createdResults.push({
            fileName: `${baseName}_page_${p.pageNumber}.pdf`,
            fileSize: blob.size,
            blob,
            downloadUrl: URL.createObjectURL(blob),
            format: 'PDF',
            pagesCount: 1,
          });
        });
      } else {
        // Range mode e.g. 1-3, 5
        const pageIndices = parsePageRange(rangeInput, totalPages);
        if (pageIndices.length === 0) {
          setError(`Invalid page range. Please choose pages between 1 and ${totalPages}.`);
          setIsProcessing(false);
          return;
        }

        setProgress(40);
        const splitBytes = await extractPagesFromPdf(buffer, pageIndices);
        setProgress(90);

        const blob = createPdfBlob(splitBytes);
        createdResults.push({
          fileName: `${baseName}_extracted.pdf`,
          fileSize: blob.size,
          blob,
          downloadUrl: URL.createObjectURL(blob),
          format: 'PDF',
          pagesCount: pageIndices.length,
        });
      }

      setResults(createdResults);
      setProgress(100);
    } catch (err: unknown) {
      console.error('Split error:', err);
      setError(
        'Failed to split PDF. Please check the page range and ensure file is valid.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (results) {
      results.forEach((r) => URL.revokeObjectURL(r.downloadUrl));
    }
    setFile(null);
    setTotalPages(0);
    setResults(null);
    setError(null);
    setProgress(0);
  };

  if (results) {
    return (
      <ResultScreen
        results={results}
        onDownloadSingle={(res) => downloadBlob(res.blob, res.fileName)}
        onDownloadAllAsZip={() =>
          downloadFilesAsZip(
            results.map((r) => ({ name: r.fileName, blob: r.blob })),
            `${getFilenameWithoutExt(file?.name || 'split')}_pages.zip`,
          )
        }
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
              title="Upload PDF to split"
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
                      {formatBytes(file.size)} • {totalPages} total {totalPages === 1 ? 'page' : 'pages'}
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

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-medium text-slate-900 dark:text-white">Document Details:</span>
                <p>Total pages available for extraction: <strong>{totalPages}</strong></p>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Split Mode
            </h4>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="splitMode"
                  value="range"
                  checked={splitMode === 'range'}
                  onChange={() => setSplitMode('range')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Extract page range</div>
                  <div className="text-slate-400 text-[11px]">Select custom pages (e.g. 1-3, 5)</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="splitMode"
                  value="every"
                  checked={splitMode === 'every'}
                  onChange={() => setSplitMode('every')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Split every page</div>
                  <div className="text-slate-400 text-[11px]">Creates separate 1-page PDF for each</div>
                </div>
              </label>
            </div>

            {splitMode === 'range' && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Pages to Extract
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder={`e.g. 1-2, ${totalPages}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400">
                  Example: 1-3, 5, 8-10 (Valid: 1 to {totalPages || 'N'})
                </p>
              </div>
            )}

            <button
              onClick={handleSplit}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Scissors className="w-4 h-4" />
              <span>Split PDF</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Splitting PDF..." />
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
