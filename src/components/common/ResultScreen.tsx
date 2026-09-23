import React from 'react';
import {
  CheckCircle2,
  Download,
  RotateCcw,
  ArrowLeft,
  FileArchive,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { formatBytes, calculateSavings } from '../../utils/formatters';
import { ProcessedResult } from '../../types/tools';

interface ResultScreenProps {
  results: ProcessedResult[];
  onDownloadSingle?: (result: ProcessedResult) => void;
  onDownloadAllAsZip?: () => void;
  onReset: () => void;
  onBackToTool?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  results,
  onDownloadSingle,
  onDownloadAllAsZip,
  onReset,
  onBackToTool,
}) => {
  const isMultiple = results.length > 1;
  const single = results[0];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Success
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isMultiple ? `${results.length} files are ready.` : 'Your file is ready.'}
        </p>
      </div>

      {/* Savings Metric Box if compressed */}
      {single && single.originalSize && single.originalSize > single.fileSize && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/20 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Original</div>
            <div className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
              {formatBytes(single.originalSize)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Compressed</div>
            <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatBytes(single.fileSize)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Saved</div>
            <div className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-0.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {calculateSavings(single.originalSize, single.fileSize).percentage}%
            </div>
          </div>
        </div>
      )}

      {/* File(s) List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {results.map((res, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs sm:text-sm"
          >
            <div className="min-w-0 pr-3">
              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {res.fileName}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                <span>{formatBytes(res.fileSize)}</span>
                <span>•</span>
                <span className="uppercase font-mono text-[10px]">{res.format}</span>
                {res.pagesCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{res.pagesCount} pages</span>
                  </>
                )}
                {res.width && res.height && (
                  <>
                    <span>•</span>
                    <span>{res.width}×{res.height}px</span>
                  </>
                )}
              </div>
            </div>

            {onDownloadSingle && (
              <button
                onClick={() => onDownloadSingle(res)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-3 pt-2">
        {isMultiple && onDownloadAllAsZip ? (
          <button
            onClick={onDownloadAllAsZip}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <FileArchive className="w-4 h-4" />
            <span>Download All as ZIP</span>
          </button>
        ) : (
          single && onDownloadSingle && (
            <button
              onClick={() => onDownloadSingle(single)}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          )
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Process Another</span>
          </button>

          {onBackToTool && (
            <button
              onClick={onBackToTool}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Tool</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
