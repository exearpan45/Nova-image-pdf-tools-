import React, { useRef, useState } from 'react';
import { Minimize2, AlertCircle, FileText, CheckCircle, Sliders, Target, ChevronRight } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { PdfPreview } from '../../common/PdfPreview';
import { compressPdf, compressPdfToTargetSize, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, calculateSavings } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { validatePdfOutput, sanitizeSafeFilename } from '../../../utils/fileValidation';
import { ProcessedResult } from '../../../types/tools';

export const PdfCompressTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'preset' | 'target'>('preset');
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // Target size in KB or MB option
  const [targetUnit, setTargetUnit] = useState<'KB' | 'MB'>('KB');
  const [targetValue, setTargetValue] = useState<string>('500');
  const [exactMatch, setExactMatch] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const handleFileSelected = (files: File[]) => {
    if (files[0]) {
      const selected = files[0];
      setFile(selected);
      setError(null);
      setInfoNotice(null);

      // Smart default target size based on file size
      if (selected.size > 2 * 1024 * 1024) {
        setTargetUnit('MB');
        setTargetValue(Math.max(1, Math.round((selected.size / (1024 * 1024)) * 0.6)).toString());
      } else {
        setTargetUnit('KB');
        setTargetValue(Math.max(100, Math.round((selected.size / 1024) * 0.6)).toString());
      }
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
      setProgress(15);

      const buffer = await file.arrayBuffer();
      let compressedBytes: Uint8Array;

      const targetBytes = calculateTargetBytes();

      if (mode === 'target') {
        compressedBytes = await compressPdfToTargetSize(buffer, targetBytes, {
          exactMatch,
          onProgress: (p) => {
            if (!isCancelledRef.current) {
              setProgress(15 + Math.round(p * 0.8));
            }
          },
        });
      } else {
        compressedBytes = await compressPdf(buffer, level, (p) => {
          if (!isCancelledRef.current) {
            setProgress(15 + Math.round(p * 0.8));
          }
        });
      }

      if (isCancelledRef.current) return;

      const blob = createPdfBlob(compressedBytes);

      // Output Validation (Requirement 63)
      const validation = await validatePdfOutput(blob);
      if (!validation.valid) {
        setError(validation.error || "We couldn't create a valid output file. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Requirement 53: If output is larger in preset mode, notify user
      if (mode === 'preset' && blob.size >= file.size) {
        setInfoNotice(
          'This PDF could not be reduced further. The processed file was larger, so the original file is available instead.',
        );
      }

      const downloadUrl = URL.createObjectURL(blob);
      const safeName = `compressed-${sanitizeSafeFilename(file.name, 'document.pdf')}`;

      setResult({
        fileName: safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`,
        fileSize: blob.size,
        originalSize: file.size,
        targetSize: mode === 'target' ? targetBytes : undefined,
        exactMatched: mode === 'target' ? exactMatch : undefined,
        blob,
        downloadUrl,
        format: 'PDF',
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('PDF compress error:', err);
      const errMsg = String(err).toLowerCase();
      if (errMsg.includes('password') || errMsg.includes('encrypted')) {
        setError("Password-protected PDFs aren't supported by this tool yet.");
      } else if (errMsg.includes('corrupt') || errMsg.includes('damaged')) {
        setError('This file appears to be damaged or incomplete. Please try another copy.');
      } else {
        setError('Failed to compress this PDF document. Please try a different compression target or preset.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const quickTargetPresets = [
    { label: '100 KB', value: '100', unit: 'KB' as const },
    { label: '200 KB', value: '200', unit: 'KB' as const },
    { label: '500 KB', value: '500', unit: 'KB' as const },
    { label: '1 MB', value: '1', unit: 'MB' as const },
    { label: '2 MB', value: '2', unit: 'MB' as const },
    { label: '5 MB', value: '5', unit: 'MB' as const },
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
  const savingsEstimate = file ? Math.max(0, Math.round(((file.size - targetBytes) / file.size) * 100)) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Details & PDF Preview */}
        <div className="lg:col-span-7 space-y-4">
          {!file ? (
            <Dropzone
              accept={['.pdf']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Upload PDF to compress"
              subtitle="Drop your PDF here or click to browse"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xs">
              {/* File Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Original size: <strong className="text-slate-700 dark:text-slate-200">{formatBytes(file.size)}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFile(null)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 text-slate-500 transition"
                >
                  Change File
                </button>
              </div>

              {/* PDF Preview Thumbnail */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Document Live Preview (First Page)</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    Interactive • Zoom & Fullscreen available
                  </span>
                </div>
                <PdfPreview
                  file={file}
                  width={320}
                  thumbnailOnly={false}
                  showControls={true}
                  className="shadow-inner"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                {mode === 'target' ? (
                  <p>
                    Targeting: <strong>{targetValue} {targetUnit}</strong> (~{formatBytes(targetBytes)})
                    {file.size > targetBytes ? ` — ~${savingsEstimate}% reduction requested.` : ' (Target is larger than or equal to current file).'}
                  </p>
                ) : (
                  <p>
                    Using <strong>{level} compression</strong> preset with lossless internal stream optimization.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Compression Options (MB / KB & Presets) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-5">
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Minimize2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Compression Controls
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose a preset level or specify your desired file size in MB or KB.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('preset')}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  mode === 'preset'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Quality Presets</span>
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

            {mode === 'preset' ? (
              /* Preset Radio Options */
              <div className="space-y-2.5">
                {[
                  { id: 'low', label: 'Low Compression', desc: 'Mild optimization, highest quality' },
                  { id: 'medium', label: 'Medium (Recommended)', desc: 'Optimal balance of size & sharpness' },
                  { id: 'high', label: 'High Compression', desc: 'Aggressive optimization, smallest output' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-xs cursor-pointer transition ${
                      level === item.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pdfCompressionPreset"
                      value={item.id}
                      checked={level === item.id}
                      onChange={() => setLevel(item.id as 'low' | 'medium' | 'high')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              /* Target Size (MB and KB written option) */
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
                      placeholder="e.g. 500"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
                    />

                    {/* Written MB and KB Selector Buttons */}
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
                    Quick Written Size Options:
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

                {/* Target Precision Mode */}
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
              <Minimize2 className="w-4 h-4" />
              <span>
                {mode === 'target'
                  ? `Compress PDF to ~${targetValue} ${targetUnit}`
                  : 'Compress PDF Now'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar
          progress={progress}
          operationText={mode === 'target' ? `Optimizing document to target ${targetValue} ${targetUnit}...` : 'Compressing PDF...'}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};
