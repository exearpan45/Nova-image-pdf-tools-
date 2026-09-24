import React, { useEffect, useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  operationText?: string;
  onCancel?: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  operationText = 'Processing...',
  onCancel,
}) => {
  const safeProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    // Detect operations taking longer than expected (Requirement 50)
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, 6500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
        <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          {operationText}
        </span>
        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
          {safeProgress}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-sky-500 rounded-full transition-all duration-200 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      {isSlow && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 animate-fade-in">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            Processing is taking longer than expected.
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold text-[11px] hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span>Processing locally in your browser. Main thread remains responsive.</span>
        {onCancel && !isSlow && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-red-500 transition underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

