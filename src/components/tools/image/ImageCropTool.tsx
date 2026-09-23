import React, { useState } from 'react';
import { Crop, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { cropImage, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const ImageCropTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [origW, setOrigW] = useState<number>(0);
  const [origH, setOrigH] = useState<number>(0);

  // Aspect ratio presets or free
  const [aspect, setAspect] = useState<'free' | '1:1' | '16:9' | '4:3' | '3:2'>('free');

  // Normalized crop bounds (0 to 100%)
  const [cropXPercent, setCropXPercent] = useState<number>(10);
  const [cropYPercent, setCropYPercent] = useState<number>(10);
  const [cropWPercent, setCropWPercent] = useState<number>(80);
  const [cropHPercent, setCropHPercent] = useState<number>(80);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

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
      setCropXPercent(10);
      setCropYPercent(10);
      setCropWPercent(80);
      setCropHPercent(80);
    } catch {
      setError('Could not read image dimensions.');
    }
  };

  const applyAspect = (ratio: 'free' | '1:1' | '16:9' | '4:3' | '3:2') => {
    setAspect(ratio);
    if (ratio === 'free' || origW === 0 || origH === 0) return;

    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    if (ratio === '16:9') targetRatio = 16 / 9;
    if (ratio === '4:3') targetRatio = 4 / 3;
    if (ratio === '3:2') targetRatio = 3 / 2;

    // Calculate maximum box that fits inside original image
    const imageAspect = origW / origH;
    let newWPercent = 80;
    let newHPercent = 80;

    if (targetRatio > imageAspect) {
      newWPercent = 80;
      newHPercent = Math.round((80 * imageAspect) / targetRatio);
    } else {
      newHPercent = 80;
      newWPercent = Math.round((80 * targetRatio) / imageAspect);
    }

    setCropWPercent(Math.min(95, Math.max(10, newWPercent)));
    setCropHPercent(Math.min(95, Math.max(10, newHPercent)));
    setCropXPercent(Math.round((100 - newWPercent) / 2));
    setCropYPercent(Math.round((100 - newHPercent) / 2));
  };

  const handleCrop = async () => {
    if (!file || origW === 0 || origH === 0) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const x = Math.round((cropXPercent / 100) * origW);
      const y = Math.round((cropYPercent / 100) * origH);
      const width = Math.round((cropWPercent / 100) * origW);
      const height = Math.round((cropHPercent / 100) * origH);

      const croppedBlob = await cropImage(file, x, y, width, height, file.type, 0.92);
      setProgress(85);

      const ext = file.name.split('.').pop() || 'png';
      const downloadUrl = URL.createObjectURL(croppedBlob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_cropped.${ext}`,
        fileSize: croppedBlob.size,
        originalSize: file.size,
        blob: croppedBlob,
        downloadUrl,
        format: ext.toUpperCase(),
        width,
        height,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Crop error:', err);
      setError('Failed to crop image.');
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
              title="Upload image to crop"
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

              {/* Crop Visual Overlay */}
              {previewUrl && (
                <div className="relative flex items-center justify-center p-2 rounded-xl bg-slate-950/80 max-h-80 overflow-hidden select-none">
                  <div className="relative inline-block max-h-72">
                    <img
                      src={previewUrl}
                      alt="Crop View"
                      className="max-h-72 object-contain rounded opacity-80"
                    />
                    {/* Visual Crop Box overlay */}
                    <div
                      style={{
                        left: `${cropXPercent}%`,
                        top: `${cropYPercent}%`,
                        width: `${cropWPercent}%`,
                        height: `${cropHPercent}%`,
                      }}
                      className="absolute border-2 border-white shadow-2xl bg-indigo-500/10 pointer-events-none ring-1 ring-indigo-500"
                    >
                      <div className="absolute top-1 left-1.5 text-[10px] font-mono bg-black/70 text-white px-1 rounded">
                        Crop Area
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Crop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Crop Box
            </h4>

            {/* Aspect presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['free', '1:1', '16:9', '4:3', '3:2'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => applyAspect(r)}
                    className={`py-1.5 rounded-lg border font-medium uppercase transition ${
                      aspect === r
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Position and Size Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-slate-600 dark:text-slate-400">Width Size</label>
                  <span className="font-mono">{cropWPercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={cropWPercent}
                  onChange={(e) => setCropWPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-slate-600 dark:text-slate-400">Height Size</label>
                  <span className="font-mono">{cropHPercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={cropHPercent}
                  onChange={(e) => setCropHPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-slate-600 dark:text-slate-400">Horizontal Position (X)</label>
                  <span className="font-mono">{cropXPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, 100 - cropWPercent)}
                  value={cropXPercent}
                  onChange={(e) => setCropXPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-slate-600 dark:text-slate-400">Vertical Position (Y)</label>
                  <span className="font-mono">{cropYPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, 100 - cropHPercent)}
                  value={cropYPercent}
                  onChange={(e) => setCropYPercent(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <button
              onClick={handleCrop}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Crop className="w-4 h-4" />
              <span>Crop Image</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Cropping image..." />
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
