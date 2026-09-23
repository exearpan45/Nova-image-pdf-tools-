import React, { useRef, useState } from 'react';
import { UploadCloud, FileWarning, AlertCircle } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

interface DropzoneProps {
  accept: string[]; // e.g. ['.pdf'] or ['.jpg', '.png', '.webp']
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  maxSizeBytes?: number; // default ~100MB
}

export const Dropzone: React.FC<DropzoneProps> = ({
  accept,
  multiple = false,
  onFilesSelected,
  title,
  subtitle,
  maxSizeBytes = 120 * 1024 * 1024,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (incomingFiles: FileList | File[]): File[] => {
    setErrorMessage(null);
    setWarningMessage(null);

    const validFiles: File[] = [];
    const filesArray = Array.from(incomingFiles);

    if (filesArray.length === 0) return [];

    for (const file of filesArray) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAccepted = accept.some((a) => {
        if (a.startsWith('.')) return ext === a.toLowerCase();
        return file.type.includes(a);
      });

      if (!isAccepted) {
        setErrorMessage(
          `This file type isn't supported. Please choose ${accept.join(', ').toUpperCase()}.`,
        );
        return [];
      }

      if (file.size > maxSizeBytes) {
        setErrorMessage(
          `File "${file.name}" exceeds the maximum limit of ${formatBytes(maxSizeBytes)}.`,
        );
        return [];
      }

      if (file.size > 35 * 1024 * 1024) {
        setWarningMessage(
          'This file is large and may require additional memory to process in your browser.',
        );
      }

      validFiles.push(file);
      if (!multiple) break;
    }

    return validFiles;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const valid = validateFiles(e.dataTransfer.files);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = validateFiles(e.target.files);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.008]'
            : 'border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 hover:border-indigo-400 dark:hover:border-indigo-500/70 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
          {title || (multiple ? 'Drop your files here' : 'Drop your file here')}
        </h3>

        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {subtitle || 'Drop your files here or click to browse.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {accept.map((fmt) => (
            <span
              key={fmt}
              className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {fmt.replace('.', '').toUpperCase()}
            </span>
          ))}
          {multiple && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              Multiple files supported
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
          <FileWarning className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {warningMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}
    </div>
  );
};
