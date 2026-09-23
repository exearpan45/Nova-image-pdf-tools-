import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { imagesToPdf, ImageToPdfOptions, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

interface ImageItem {
  file: File;
  previewUrl: string;
}

export const ImageToPdfTool: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [margin, setMargin] = useState<'none' | 'small' | 'standard'>('small');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFilesAdded = (files: File[]) => {
    setError(null);
    const newItems: ImageItem[] = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newItems]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setError('Please upload at least one image.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(10);

      // Convert images to standard array buffers (PNG or JPEG)
      const preparedImages: Array<{ bytes: ArrayBuffer; type: string }> = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        let bytes: ArrayBuffer;
        let type = item.file.type;

        // If WEBP, convert to JPEG/PNG canvas blob first since pdf-lib natively embeds JPG & PNG
        if (type === 'image/webp') {
          const img = new Image();
          img.src = item.previewUrl;
          await new Promise((res) => {
            img.onload = res;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const jpegBlob = await new Promise<Blob>((res) =>
            canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95),
          );
          bytes = await jpegBlob.arrayBuffer();
          type = 'image/jpeg';
        } else {
          bytes = await item.file.arrayBuffer();
        }

        preparedImages.push({ bytes, type });
        setProgress(Math.round(10 + ((i + 1) / images.length) * 40));
      }

      const options: ImageToPdfOptions = {
        pageSize,
        orientation,
        margin,
      };

      const pdfBytes = await imagesToPdf(preparedImages, options, (p) => {
        setProgress(50 + Math.round(p * 0.45));
      });

      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: 'nova-converted-images.pdf',
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
        pagesCount: images.length,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Image to PDF error:', err);
      setError('Failed to convert images to PDF. Please ensure images are valid files.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setImages([]);
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
          <Dropzone
            accept={['.jpg', '.jpeg', '.png', '.webp']}
            multiple={true}
            onFilesSelected={handleFilesAdded}
            title="Upload images to convert to PDF"
            subtitle="JPG, PNG, or WEBP photos • Drag & drop supported"
          />

          {images.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>{images.length} images added</span>
                <button
                  onClick={() => {
                    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
                    setImages([]);
                  }}
                  className="text-red-500 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {images.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={item.previewUrl}
                        alt="thumb"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatBytes(item.file.size)} • Page {idx + 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeImage(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 transition"
                        title="Remove image"
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

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileImage className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Document Layout
            </h4>

            {/* Page Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Page Size
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['A4', 'Letter', 'Fit'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPageSize(s)}
                    className={`py-2 rounded-xl font-medium border transition ${
                      pageSize === s
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Orientation
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['auto', 'portrait', 'landscape'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrientation(o)}
                    className={`py-2 rounded-xl font-medium border capitalize transition ${
                      orientation === o
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Page Margin
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['none', 'small', 'standard'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMargin(m)}
                    className={`py-2 rounded-xl font-medium border capitalize transition ${
                      margin === m
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConvert}
              disabled={images.length === 0 || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <FileText className="w-4 h-4" />
              <span>Convert to PDF</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Generating PDF document..." />
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
