import React, { useState } from 'react';
import { RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { convertImageFormat, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const ImageConvertTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetMime, setTargetMime] = useState<string>('image/webp');
  const [quality, setQuality] = useState<number>(0.9);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

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

    // Choose opposite format by default
    if (sel.type === 'image/webp') setTargetMime('image/png');
    else if (sel.type === 'image/png') setTargetMime('image/webp');
    else setTargetMime('image/png');

    try {
      const dims = await getImageDimensions(sel);
      setDimensions(dims);
    } catch {
      // Non-fatal
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const convertedBlob = await convertImageFormat(file, targetMime, quality);
      setProgress(85);

      const ext = targetMime === 'image/jpeg' ? 'jpg' : targetMime === 'image/webp' ? 'webp' : 'png';
      const downloadUrl = URL.createObjectURL(convertedBlob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}.${ext}`,
        fileSize: convertedBlob.size,
        originalSize: file.size,
        blob: convertedBlob,
        downloadUrl,
        format: ext.toUpperCase(),
        width: dimensions?.width,
        height: dimensions?.height,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Convert error:', err);
      setError('Failed to convert image format.');
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
              title="Upload image to convert"
              subtitle="Convert between JPG, PNG, and modern WEBP"
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
                      Format: {file.type || 'image'} • {formatBytes(file.size)}
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
              <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Target Format
            </h4>

            {/* Format choice */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Convert To
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { mime: 'image/jpeg', label: 'JPG' },
                  { mime: 'image/png', label: 'PNG' },
                  { mime: 'image/webp', label: 'WEBP' },
                ].map((item) => (
                  <button
                    key={item.mime}
                    type="button"
                    onClick={() => setTargetMime(item.mime)}
                    className={`py-2 rounded-xl font-medium border transition ${
                      targetMime === item.mime
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality for JPG / WEBP */}
            {targetMime !== 'image/png' && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Output Quality
                  </label>
                  <span className="font-mono text-slate-500">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Convert Image</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Converting image format..." />
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
