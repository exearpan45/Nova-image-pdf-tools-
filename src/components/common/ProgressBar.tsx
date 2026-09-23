import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  operationText?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  operationText = 'Processing...',
}) => {
  const safeProgress = Math.min(100, Math.max(0, Math.round(progress)));

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

      <p className="text-[11px] text-slate-500 text-center">
        Processing locally in your browser. Main thread remains responsive.
      </p>
    </div>
  );
};
