import React, { useState } from 'react';
import { Scaling, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { scaleImagePercentage, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const ImageDimensionTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  const [scalePercent, setScalePercent] = useState<number>(50);

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
      const d = await getImageDimensions(sel);
      setDims(d);
    } catch {
      setError('Could not inspect image dimensions.');
    }
  };

  const handleScale = async () => {
    if (!file || !dims) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const targetW = Math.round((dims.width * scalePercent) / 100);
      const targetH = Math.round((dims.height * scalePercent) / 100);

      const scaledBlob = await scaleImagePercentage(file, scalePercent, file.type, 0.92);
      setProgress(85);

      const ext = file.name.split('.').pop() || 'png';
      const downloadUrl = URL.createObjectURL(scaledBlob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_${scalePercent}pct.${ext}`,
        fileSize: scaledBlob.size,
        originalSize: file.size,
        blob: scaledBlob,
        downloadUrl,
        format: ext.toUpperCase(),
        width: targetW,
        height: targetH,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Scale error:', err);
      setError('Failed to scale image dimensions.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setPreviewUrl(null);
    setDims(null);
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

  const newW = dims ? Math.round((dims.width * scalePercent) / 100) : 0;
  const newH = dims ? Math.round((dims.height * scalePercent) / 100) : 0;

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
              title="Upload image to downscale dimensions"
              subtitle="Quickly downscale large resolution photos by 75%, 50%, or 25%"
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
                      Original: {dims?.width} × {dims?.height} px ({formatBytes(file.size)})
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
              <Scaling className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Scale Factor
            </h4>

            {/* Scale buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Quick Scale Percent
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[75, 50, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setScalePercent(pct)}
                    className={`py-2 rounded-xl font-medium border transition ${
                      scalePercent === pct
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Custom Scale Slider
                </label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {scalePercent}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={scalePercent}
                onChange={(e) => setScalePercent(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600"
              />
            </div>

            {dims && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Output Dimensions:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {newW} × {newH} px
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Total pixels reduced by:</span>
                  <span>{100 - Math.round((newW * newH) / (dims.width * dims.height) * 100)}%</span>
                </div>
              </div>
            )}

            <button
              onClick={handleScale}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Scaling className="w-4 h-4" />
              <span>Downscale Image</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Rescaling resolution..." />
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
