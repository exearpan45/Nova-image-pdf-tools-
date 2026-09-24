import React, { useRef, useState } from 'react';
import { Maximize2, AlertCircle, Lock, Unlock, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { resizeImage, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { validateImageOutput, sanitizeSafeFilename } from '../../../utils/fileValidation';
import { ProcessedResult } from '../../../types/tools';

export const ImageResizeTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [origW, setOrigW] = useState<number>(0);
  const [origH, setOrigH] = useState<number>(0);

  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const handleFileSelected = async (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setFile(sel);
    setPreviewUrl(URL.createObjectURL(sel));

    try {
      const dims = await getImageDimensions(sel);
      setOrigW(dims.width);
      setOrigH(dims.height);
      setWidth(dims.width);
      setHeight(dims.height);
    } catch {
      setError('Could not read image dimensions.');
    }
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (keepAspect && origW > 0) {
      setHeight(Math.round((val / origW) * origH));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (keepAspect && origH > 0) {
      setWidth(Math.round((val / origH) * origW));
    }
  };

  const applyPreset = (pw: number, ph: number) => {
    setWidth(pw);
    setHeight(ph);
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setProgress(0);
    setError('Operation cancelled by user.');
  };

  const handleResize = async () => {
    if (!file || width <= 0 || height <= 0) {
      setError('Please provide valid dimensions (width and height must be greater than 0).');
      return;
    }

    // Requirement 57: Prevent enormous canvases that crash the browser
    if (width > 8000 || height > 8000 || width * height > 40_000_000) {
      setError('The requested dimensions exceed safe browser limits. Please choose dimensions under 8,000px.');
      return;
    }

    try {
      isCancelledRef.current = false;
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const resizedBlob = await resizeImage(file, width, height, file.type, 0.92);
      if (isCancelledRef.current) return;

      setProgress(85);

      // Output validation (Requirement 63)
      const validation = await validateImageOutput(resizedBlob);
      if (!validation.valid) {
        setError(validation.error || "We couldn't create a valid output file. Please try again.");
        setIsProcessing(false);
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const downloadUrl = URL.createObjectURL(resizedBlob);
      const safeBase = sanitizeSafeFilename(getFilenameWithoutExt(file.name), 'resized');

      setResult({
        fileName: `resized-${safeBase}_${width}x${height}.${ext}`,
        fileSize: resizedBlob.size,
        originalSize: file.size,
        blob: resizedBlob,
        downloadUrl,
        format: ext.toUpperCase(),
        width: validation.width || width,
        height: validation.height || height,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Resize error:', err);
      setError('Failed to resize image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setPreviewUrl(null);
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
              accept={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Upload image to resize"
              subtitle="JPG, PNG, or WEBP • Drag & drop supported"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-xs">
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Original: {origW} × {origH} px ({formatBytes(file.size)})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-xs text-slate-500 hover:text-red-500 transition"
                >
                  Change File
                </button>
              </div>

              {previewUrl && (
                <div className="flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-950/60 max-h-72 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 object-contain rounded-lg shadow-2xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Dimensions
            </h4>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { label: 'Full HD (1920×1080)', w: 1920, h: 1080 },
                  { label: 'HD 720p (1280×720)', w: 1280, h: 720 },
                  { label: 'Square (1080×1080)', w: 1080, h: 1080 },
                  { label: 'Social Share (1200×630)', w: 1200, h: 630 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.w, p.h)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300 text-left text-[11px] truncate transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Dimensions Input */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={width || ''}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={height || ''}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setKeepAspect(!keepAspect)}
                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                {keepAspect ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Lock aspect ratio (linked)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Aspect ratio unlocked</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleResize}
              disabled={!file || width <= 0 || height <= 0 || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Resize Image</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar
          progress={progress}
          operationText="Resizing image dimensions..."
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
