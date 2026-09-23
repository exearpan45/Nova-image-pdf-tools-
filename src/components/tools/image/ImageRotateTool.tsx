import React, { useState } from 'react';
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { rotateAndFlipImage, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const ImageRotateTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const [angle, setAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

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
    setAngle(0);
    setFlipH(false);
    setFlipV(false);

    try {
      const dims = await getImageDimensions(sel);
      setDimensions(dims);
    } catch {
      // Non-fatal
    }
  };

  const rotateBy = (deg: number) => {
    setAngle((prev) => (prev + deg) % 360);
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const processedBlob = await rotateAndFlipImage(
        file,
        angle,
        flipH,
        flipV,
        file.type,
        0.95,
      );
      setProgress(85);

      const ext = file.name.split('.').pop() || 'png';
      const downloadUrl = URL.createObjectURL(processedBlob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_rotated.${ext}`,
        fileSize: processedBlob.size,
        originalSize: file.size,
        blob: processedBlob,
        downloadUrl,
        format: ext.toUpperCase(),
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Rotate & flip error:', err);
      setError('Failed to process image rotation.');
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
              title="Upload image to rotate & flip"
              subtitle="Rotate 90°, 180°, 270° or mirror horizontally / vertically"
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
                      {formatBytes(file.size)}
                      {dimensions && ` • ${dimensions.width}×${dimensions.height}px`}
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
                <div className="flex items-center justify-center p-6 rounded-xl bg-slate-100 dark:bg-slate-950/60 max-h-80 overflow-hidden">
                  <div
                    style={{
                      transform: `rotate(${angle}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                      transition: 'transform 0.25s ease',
                    }}
                    className="inline-block max-h-64"
                  >
                    <img
                      src={previewUrl}
                      alt="Rotation preview"
                      className="max-h-64 object-contain rounded-lg shadow-2xs"
                    />
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
              <RotateCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Orientation Controls
            </h4>

            {/* Rotation actions */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Rotate (Current: {angle}°)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => rotateBy(90)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                  <span>+90° CW</span>
                </button>
                <button
                  type="button"
                  onClick={() => rotateBy(270)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-500 transform -scale-x-100" />
                  <span>-90° CCW</span>
                </button>
              </div>
            </div>

            {/* Flip actions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mirror & Invert
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition ${
                    flipH
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip Horiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV(!flipV)}
                  className={`py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition ${
                    flipV
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip Vert</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <RotateCw className="w-4 h-4" />
              <span>Apply Changes & Download</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Applying transformations..." />
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
