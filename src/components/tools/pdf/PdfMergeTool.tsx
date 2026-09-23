import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { mergePdfs, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfMergeTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFilesAdded = (newFiles: File[]) => {
    setError(null);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please upload at least 2 PDF files to merge.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(5);
      setError(null);

      // Read arrayBuffers
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < files.length; i++) {
        buffers.push(await files[i].arrayBuffer());
        setProgress(Math.round(5 + ((i + 1) / files.length) * 35));
      }

      const mergedBytes = await mergePdfs(buffers, (p) => {
        setProgress(40 + Math.round(p * 0.55));
      });

      const blob = createPdfBlob(mergedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: 'nova-merged.pdf',
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Merge error:', err);
      setError(
        'Something went wrong while merging these PDFs. Please ensure none of the files are password-protected or corrupted.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFiles([]);
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
      {/* Workspace & Settings layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Workspace Area */}
        <div className="lg:col-span-2 space-y-4">
          <Dropzone
            accept={['.pdf']}
            multiple={true}
            onFilesSelected={handleFilesAdded}
            title="Upload PDF files to merge"
            subtitle="Drop multiple PDFs here or click to browse"
          />

          {files.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>{files.length} {files.length === 1 ? 'file' : 'files'} loaded</span>
                <button
                  onClick={() => setFiles([])}
                  className="text-red-500 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveFile(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveFile(idx, 'down')}
                        disabled={idx === files.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 transition"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Settings Area */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Merge Settings
            </h4>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p>Files will be merged from top to bottom in the exact order shown on the left.</p>
              <p>Reorder items using the up/down arrows.</p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleMerge}
                disabled={files.length < 2 || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
              >
                <Layers className="w-4 h-4" />
                <span>{files.length < 2 ? 'Add at least 2 files' : 'Merge PDFs'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Merging PDF files..." />
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
