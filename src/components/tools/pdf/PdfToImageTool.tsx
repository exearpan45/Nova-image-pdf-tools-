import React, { useRef, useState } from 'react';
import { Image, FileArchive, AlertCircle, FileText } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import {
  loadPdfDocument,
  renderPdfPageToBlob,
} from '../../../utils/pdfRenderer';
import {
  parsePageRange,
  formatBytes,
  getFilenameWithoutExt,
} from '../../../utils/formatters';
import { downloadBlob, downloadFilesAsZip } from '../../../utils/download';
import { validateImageOutput, sanitizeSafeFilename } from '../../../utils/fileValidation';
import { ProcessedResult } from '../../../types/tools';

interface PdfToImageToolProps {
  defaultFormat?: 'image/jpeg' | 'image/png';
}

export const PdfToImageTool: React.FC<PdfToImageToolProps> = ({
  defaultFormat = 'image/jpeg',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>(defaultFormat);
  const [quality, setQuality] = useState<number>(0.92);
  const [scale, setScale] = useState<number>(1.5);
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [pageSelection, setPageSelection] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedResult[] | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const handleFileSelected = async (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setFile(sel);

    try {
      const buffer = await sel.arrayBuffer();
      const doc = await loadPdfDocument(buffer);
      setTotalPages(doc.numPages);
      setCustomRange(`1-${Math.min(3, doc.numPages)}`);
    } catch (err: unknown) {
      console.error('Failed to load PDF in renderer:', err);
      const errMsg = String(err).toLowerCase();
      if (errMsg.includes('password') || errMsg.includes('encrypted')) {
        setError("Password-protected PDFs aren't supported by this tool yet.");
      } else {
        setError('Could not load PDF. It may be corrupt or encrypted.');
      }
      setFile(null);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setProgress(0);
    setError('Operation cancelled by user.');
  };

  const handleConvert = async () => {
    if (!file) return;

    try {
      isCancelledRef.current = false;
      setIsProcessing(true);
      setError(null);
      setProgress(5);

      const buffer = await file.arrayBuffer();
      const doc = await loadPdfDocument(buffer);
      const total = doc.numPages;

      let targetPages: number[] = [];
      if (pageSelection === 'all') {
        targetPages = Array.from({ length: total }, (_, i) => i + 1);
      } else {
        const indices = parsePageRange(customRange, total);
        targetPages = indices.map((idx) => idx + 1);
      }

      if (targetPages.length === 0) {
        setError(`Please select valid page numbers between 1 and ${total}.`);
        setIsProcessing(false);
        return;
      }

      const ext = format === 'image/jpeg' ? 'jpg' : 'png';
      const baseName = sanitizeSafeFilename(getFilenameWithoutExt(file.name), 'page');
      const createdResults: ProcessedResult[] = [];

      for (let i = 0; i < targetPages.length; i++) {
        if (isCancelledRef.current) return;

        const pageNum = targetPages[i];
        const blob = await renderPdfPageToBlob(
          doc,
          pageNum,
          format,
          quality,
          scale,
          format === 'image/png' ? !transparentBg : true,
        );

        if (isCancelledRef.current) return;

        // Output validation (Requirement 63)
        const validation = await validateImageOutput(blob);
        if (!validation.valid) {
          setError(validation.error || "We couldn't create a valid output file. Please try again.");
          setIsProcessing(false);
          return;
        }

        createdResults.push({
          fileName: `${baseName}_page_${String(pageNum).padStart(2, '0')}.${ext}`,
          fileSize: blob.size,
          blob,
          downloadUrl: URL.createObjectURL(blob),
          format: ext.toUpperCase(),
          width: validation.width,
          height: validation.height,
        });

        setProgress(Math.round(5 + ((i + 1) / targetPages.length) * 90));
      }

      if (isCancelledRef.current) return;

      setResults(createdResults);
      setProgress(100);
    } catch (err: unknown) {
      console.error('PDF to image conversion error:', err);
      setError('An error occurred during page conversion. Please try a lower resolution scale or smaller page range.');
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
            `${getFilenameWithoutExt(file?.name || 'converted')}_images.zip`,
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
              title={`Upload PDF to convert to ${format === 'image/jpeg' ? 'JPG' : 'PNG'}`}
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
                      {formatBytes(file.size)} • {totalPages} pages available
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

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                Ready to render pages into crisp {format === 'image/jpeg' ? 'JPG' : 'PNG'} images locally using browser Canvas.
              </div>
            </div>
          )}
        </div>

        {/* Conversion Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Image className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Image Options
            </h4>

            {/* Format choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('image/jpeg')}
                  className={`py-2 text-xs rounded-xl font-medium border transition ${
                    format === 'image/jpeg'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  JPG
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('image/png')}
                  className={`py-2 text-xs rounded-xl font-medium border transition ${
                    format === 'image/png'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  PNG
                </button>
              </div>
            </div>

            {/* Resolution Scale */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Resolution Scale
                </label>
                <span className="font-mono text-slate-500">{scale}x</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Normal (1x)', val: 1.0 },
                  { label: 'High (1.5x)', val: 1.5 },
                  { label: 'Ultra (2x)', val: 2.0 },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setScale(s.val)}
                    className={`py-1.5 text-[11px] rounded-lg border font-medium transition ${
                      scale === s.val
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality for JPG */}
            {format === 'image/jpeg' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    JPG Quality
                  </label>
                  <span className="font-mono text-slate-500">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* Transparent toggle for PNG */}
            {format === 'image/png' && (
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={transparentBg}
                  onChange={(e) => setTransparentBg(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Preserve transparent background</span>
              </label>
            )}

            {/* Page selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Pages to Convert
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPageSelection('all')}
                  className={`py-2 rounded-xl font-medium border transition ${
                    pageSelection === 'all'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All Pages ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => setPageSelection('custom')}
                  className={`py-2 rounded-xl font-medium border transition ${
                    pageSelection === 'custom'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Custom Pages
                </button>
              </div>

              {pageSelection === 'custom' && (
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              )}
            </div>

            <button
              onClick={handleConvert}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Image className="w-4 h-4" />
              <span>Convert to Images</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar
          progress={progress}
          operationText="Rendering PDF pages to images..."
          onCancel={handleCancel}
        />
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
