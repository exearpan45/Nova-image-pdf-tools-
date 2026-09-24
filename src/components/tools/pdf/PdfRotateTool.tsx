import React, { useState } from 'react';
import { RotateCw, AlertCircle, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { PdfPreview } from '../../common/PdfPreview';
import { rotatePdfPages, createPdfBlob } from '../../../utils/pdfOps';
import {
  parsePageRange,
  formatBytes,
  getFilenameWithoutExt,
} from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfRotateTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [angle, setAngle] = useState<number>(90);
  const [applyTo, setApplyTo] = useState<'all' | 'custom'>('all');
  const [rangeInput, setRangeInput] = useState<string>('1');

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
      setRangeInput(`1-${doc.getPageCount()}`);
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      setError('Failed to inspect PDF. It may be protected or corrupted.');
      setFile(null);
    }
  };

  const handleRotate = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(25);

      const buffer = await file.arrayBuffer();
      let targetIndices: number[] | undefined;

      if (applyTo === 'custom') {
        targetIndices = parsePageRange(rangeInput, pageCount);
        if (targetIndices.length === 0) {
          setError(`Invalid page range. Please select pages between 1 and ${pageCount}.`);
          setIsProcessing(false);
          return;
        }
      }

      setProgress(60);
      const rotatedBytes = await rotatePdfPages(buffer, angle, targetIndices);
      setProgress(90);

      const blob = createPdfBlob(rotatedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_rotated.pdf`,
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
        pagesCount: pageCount,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Rotate error:', err);
      setError('An error occurred while rotating the PDF.');
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
              title="Upload PDF to rotate"
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

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Document Live Preview</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    {pageCount} pages • Interactive Preview
                  </span>
                </div>
                <PdfPreview
                  file={file}
                  width={300}
                  thumbnailOnly={false}
                  showControls={true}
                  className="shadow-inner"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                Rotation angle selected: <strong>{angle}° Clockwise</strong>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Rotation Settings
            </h4>

            {/* Angle Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Rotation Angle
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { deg: 90, label: '90° CW' },
                  { deg: 180, label: '180°' },
                  { deg: 270, label: '270° CCW' },
                ].map((item) => (
                  <button
                    key={item.deg}
                    type="button"
                    onClick={() => setAngle(item.deg)}
                    className={`py-2 text-xs rounded-xl font-medium border transition ${
                      angle === item.deg
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Target Pages
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setApplyTo('all')}
                  className={`py-2 rounded-xl font-medium border transition ${
                    applyTo === 'all'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All Pages ({pageCount})
                </button>
                <button
                  type="button"
                  onClick={() => setApplyTo('custom')}
                  className={`py-2 rounded-xl font-medium border transition ${
                    applyTo === 'custom'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {applyTo === 'custom' && (
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder={`e.g. 1, 3-${pageCount}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              )}
            </div>

            <button
              onClick={handleRotate}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <RotateCw className="w-4 h-4" />
              <span>Rotate PDF</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Rotating pages..." />
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
