import React, { useState } from 'react';
import { Paintbrush, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { removeSolidBackground, replaceBackgroundColor, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const ImageBackgroundTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [mode, setMode] = useState<'remove' | 'replace'>('remove');
  const [colorToRemove, setColorToRemove] = useState<string>('#ffffff');
  const [tolerance, setTolerance] = useState<number>(35);
  const [newBgColor, setNewBgColor] = useState<string>('#4f46e5');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFileSelected = (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setFile(sel);
    setPreviewUrl(URL.createObjectURL(sel));
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      let processedBlob: Blob;
      let ext = 'png';

      if (mode === 'remove') {
        processedBlob = await removeSolidBackground(file, colorToRemove, tolerance);
        ext = 'png';
      } else {
        processedBlob = await replaceBackgroundColor(file, newBgColor);
        ext = 'png';
      }

      setProgress(85);
      const downloadUrl = URL.createObjectURL(processedBlob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_${mode === 'remove' ? 'transparent' : 'bg'}.${ext}`,
        fileSize: processedBlob.size,
        originalSize: file.size,
        blob: processedBlob,
        downloadUrl,
        format: 'PNG',
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Background processing error:', err);
      setError('Failed to process image background.');
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
              title="Upload image to modify background"
              subtitle="Remove solid background or replace backdrop color"
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
                <div className="flex items-center justify-center p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 max-h-72 overflow-hidden">
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
              <Paintbrush className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Background Mode
            </h4>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMode('remove')}
                className={`py-2 rounded-xl font-medium border transition ${
                  mode === 'remove'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Make Transparent
              </button>
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={`py-2 rounded-xl font-medium border transition ${
                  mode === 'replace'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Color Fill
              </button>
            </div>

            {mode === 'remove' ? (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Background Color to Remove
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorToRemove}
                      onChange={(e) => setColorToRemove(e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5"
                    />
                    <span className="font-mono text-slate-500 uppercase">{colorToRemove}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="font-medium text-slate-700 dark:text-slate-300">Tolerance</label>
                    <span className="font-mono text-slate-500">{tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    value={tolerance}
                    onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Higher tolerance removes slight color variations & shadows.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Replacement Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newBgColor}
                      onChange={(e) => setNewBgColor(e.target.value)}
                      className="w-10 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5"
                    />
                    <span className="font-mono text-slate-500 uppercase">{newBgColor}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Paintbrush className="w-4 h-4" />
              <span>Apply Background</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Processing canvas pixels..." />
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
