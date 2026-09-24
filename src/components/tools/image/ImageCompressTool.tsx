import React, { useRef, useState } from 'react';
import { Minimize, AlertCircle, Image as ImageIcon, Sliders, Target } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { compressImage, compressImageToTargetSize, getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, calculateSavings, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { validateImageOutput, sanitizeSafeFilename } from '../../../utils/fileValidation';
import { ProcessedResult } from '../../../types/tools';

export const ImageCompressTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

  const [mode, setMode] = useState<'quality' | 'target'>('quality');
  const [quality, setQuality] = useState<number>(0.75);
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');

  // Target size with written MB and KB options
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB');
  const [targetValue, setTargetValue] = useState<string>('200');
  const [exactMatch, setExactMatch] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const handleFileSelected = async (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setInfoNotice(null);
    setFile(sel);
    const url = URL.createObjectURL(sel);
    setPreviewUrl(url);

    // Set default format matching source if possible
    if (sel.type === 'image/png') setFormat('image/jpeg'); // Default to jpeg for real compression savings
    else if (sel.type === 'image/webp') setFormat('image/webp');
    else setFormat('image/jpeg');

    // Smart default target
    if (sel.size > 2 * 1024 * 1024) {
      setTargetUnit('MB');
      setTargetValue(Math.max(1, Math.round((sel.size / (1024 * 1024)) * 0.5)).toString());
    } else {
      setTargetUnit('KB');
      setTargetValue(Math.max(50, Math.round((sel.size / 1024) * 0.5)).toString());
    }

    try {
      const dims = await getImageDimensions(sel);
      setOriginalDimensions(dims);
    } catch {
      // Non-fatal
    }
  };

  const calculateTargetBytes = (): number => {
    const num = parseFloat(targetValue) || 100;
    if (targetUnit === 'MB') {
      return Math.round(num * 1024 * 1024);
    }
    return Math.round(num * 1024);
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setProgress(0);
    setError('Operation cancelled by user.');
  };

  const handleCompress = async () => {
    if (!file) return;

    try {
      isCancelledRef.current = false;
      setIsProcessing(true);
      setError(null);
      setInfoNotice(null);
      setProgress(25);

      let compressedBlob: Blob;
      const targetBytes = calculateTargetBytes();

      if (mode === 'target') {
        compressedBlob = await compressImageToTargetSize(file, targetBytes, {
          outputFormat: format,
          exactMatch,
          onProgress: (p) => {
            if (!isCancelledRef.current) {
              setProgress(25 + Math.round(p * 0.7));
            }
          },
        });
      } else {
        compressedBlob = await compressImage(file, quality, format);
      }

      if (isCancelledRef.current) return;

      // Output Validation (Requirement 63)
      const validation = await validateImageOutput(compressedBlob);
      if (!validation.valid) {
        setError(validation.error || "We couldn't create a valid output file. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Requirement 56: If output is larger than original in quality mode, inform user
      if (mode === 'quality' && compressedBlob.size >= file.size) {
        setInfoNotice(
          'Note: The compressed output size is larger than or equal to the original. Consider lowering the quality setting or choosing JPG/WEBP format.',
        );
      }

      setProgress(95);

      const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
      const downloadUrl = URL.createObjectURL(compressedBlob);
      const safeBase = sanitizeSafeFilename(getFilenameWithoutExt(file.name), 'photo');

      setResult({
        fileName: `compressed-${safeBase}.${ext}`,
        fileSize: compressedBlob.size,
        originalSize: file.size,
        targetSize: mode === 'target' ? targetBytes : undefined,
        exactMatched: mode === 'target' ? exactMatch : undefined,
        blob: compressedBlob,
        downloadUrl,
        format: ext.toUpperCase(),
        width: validation.width || originalDimensions?.width,
        height: validation.height || originalDimensions?.height,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Image compression error:', err);
      setError('Failed to compress image. Please verify file integrity.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.downloadUrl) URL.revokeObjectURL(result.downloadUrl);
    setFile(null);
    setPreviewUrl(null);
    setOriginalDimensions(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const quickTargetPresets = [
    { label: '50 KB', value: '50', unit: 'KB' as const },
    { label: '100 KB', value: '100', unit: 'KB' as const },
    { label: '200 KB', value: '200', unit: 'KB' as const },
    { label: '500 KB', value: '500', unit: 'KB' as const },
    { label: '1 MB', value: '1', unit: 'MB' as const },
    { label: '2 MB', value: '2', unit: 'MB' as const },
  ];

  if (result) {
    return (
      <ResultScreen
        results={[result]}
        onDownloadSingle={(res) => downloadBlob(res.blob, res.fileName)}
        onReset={handleReset}
      />
    );
  }

  const targetBytes = calculateTargetBytes();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {!file ? (
            <Dropzone
              accept={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Upload image to compress"
              subtitle="JPG, PNG, or WEBP • Drag & drop supported"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-xs">
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Original: <strong className="text-slate-700 dark:text-slate-200">{formatBytes(file.size)}</strong>
                      {originalDimensions && ` • ${originalDimensions.width}×${originalDimensions.height}px`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 text-slate-500 transition"
                >
                  Change File
                </button>
              </div>

              {previewUrl && (
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 max-h-96 overflow-hidden border border-slate-200/60 dark:border-slate-800/60">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-72 object-contain rounded-xl shadow-xs"
                  />
                  <span className="mt-2 text-[10px] text-slate-400">Original Image Preview</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-5">
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Minimize className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Compress Options
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Compress by quality slider or choose the exact target size in MB / KB.
              </p>
            </div>

            {/* Target format */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Output Format
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'image/jpeg', label: 'JPG (Smallest)' },
                  { id: 'image/webp', label: 'WEBP (Modern)' },
                  { id: 'image/png', label: 'PNG' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id as typeof format)}
                    className={`py-2 px-1 rounded-xl font-medium border transition text-center ${
                      format === f.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('quality')}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  mode === 'quality'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Quality Slider</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('target')}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  mode === 'target'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Target Size (MB / KB)</span>
              </button>
            </div>

            {mode === 'quality' ? (
              /* Quality Slider */
              format !== 'image/png' ? (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                  <div className="flex justify-between text-xs">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Compression Quality
                    </label>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {Math.round(quality * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.95"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Smallest Size</span>
                    <span>Balanced</span>
                    <span>Maximum Clarity</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500">
                  PNG is lossless. To reduce file size significantly, pick <strong>JPG</strong> or <strong>WEBP</strong> above, or use <strong>Target Size (MB/KB)</strong>.
                </div>
              )
            ) : (
              /* Target Size with written MB and KB options */
              <div className="space-y-4 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Desired File Size (Select MB or KB):
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="e.g. 200"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
                    />

                    {/* Written MB and KB Buttons */}
                    <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setTargetUnit('KB')}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          targetUnit === 'KB'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        KB
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetUnit('MB')}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          targetUnit === 'MB'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        MB
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Target Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                    Quick Written Options:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {quickTargetPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTargetValue(preset.value);
                          setTargetUnit(preset.unit);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition text-center ${
                          targetValue === preset.value && targetUnit === preset.unit
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Precision Mode Toggle */}
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                    Precision Mode:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExactMatch(true)}
                      className={`p-2 rounded-xl text-left border text-[11px] transition ${
                        exactMatch
                          ? 'bg-white dark:bg-slate-900 border-indigo-600 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600 font-semibold shadow-2xs'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <span>🎯 Exact Size Match</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Matches exactly {targetValue} {targetUnit}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExactMatch(false)}
                      className={`p-2 rounded-xl text-left border text-[11px] transition ${
                        !exactMatch
                          ? 'bg-white dark:bg-slate-900 border-indigo-600 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600 font-semibold shadow-2xs'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <span>📉 Maximum Limit</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Under {targetValue} {targetUnit} limit
                      </div>
                    </button>
                  </div>
                </div>

                {file && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                    <span>Original: {formatBytes(file.size)}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Target: {exactMatch ? 'Exact ' : 'Under '} {targetValue} {targetUnit}
                    </span>
                  </div>
                )}
              </div>
            )}

            {infoNotice && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{infoNotice}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCompress}
              disabled={!file || isProcessing}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Minimize className="w-4 h-4" />
              <span>
                {mode === 'target'
                  ? `Compress Image to ~${targetValue} ${targetUnit}`
                  : 'Compress Image Now'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar
          progress={progress}
          operationText={mode === 'target' ? `Adjusting image to target ~${targetValue} ${targetUnit}...` : 'Optimizing image bytes...'}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
