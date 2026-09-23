import React, { useState } from 'react';
import { Zap, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { compressPdf, createPdfBlob } from '../../../utils/pdfOps';
import { compressImage } from '../../../utils/imageOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const ReduceFileSizeTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFileSelected = (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setFile(sel);
    const isDocPdf = sel.type === 'application/pdf' || sel.name.toLowerCase().endsWith('.pdf');
    setIsPdf(isDocPdf);
  };

  const handleReduce = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(20);

      let compressedBlob: Blob;
      let format = 'PDF';

      if (isPdf) {
        const buffer = await file.arrayBuffer();
        const compressedBytes = await compressPdf(buffer, level, (p) => {
          setProgress(20 + Math.round(p * 0.75));
        });
        compressedBlob = createPdfBlob(compressedBytes);
        format = 'PDF';
      } else {
        // Image compression
        const qualityMap = { low: 0.85, medium: 0.72, high: 0.5 };
        const quality = qualityMap[level];
        const targetFormat = file.type === 'image/png' ? 'image/jpeg' : (file.type as 'image/jpeg' | 'image/webp' | 'image/png');
        compressedBlob = await compressImage(file, quality, targetFormat);
        format = targetFormat === 'image/jpeg' ? 'JPG' : targetFormat === 'image/webp' ? 'WEBP' : 'PNG';
      }

      setProgress(95);
      const ext = format.toLowerCase();
      const downloadUrl = URL.createObjectURL(compressedBlob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_reduced.${ext}`,
        fileSize: compressedBlob.size,
        originalSize: file.size,
        blob: compressedBlob,
        downloadUrl,
        format,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Reduce file size error:', err);
      setError('Failed to reduce file size. Please try another compression level.');
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
              accept={['.pdf', '.jpg', '.jpeg', '.png', '.webp']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Universal File Reducer"
              subtitle="Drop any PDF or Image file to automatically shrink its size"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-xs">
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Original: {formatBytes(file.size)} • Type: {isPdf ? 'PDF Document' : 'Image File'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-slate-500 hover:text-red-500 transition"
                >
                  Change File
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                File engine automatically configured for <strong>{isPdf ? 'PDF optimization' : 'Image raster compression'}</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Optimization Intensity
            </h4>

            <div className="space-y-2">
              {[
                { id: 'low', label: 'Low', desc: 'Mild reduction, supreme quality' },
                { id: 'medium', label: 'Medium', desc: 'Balanced compression (Recommended)' },
                { id: 'high', label: 'High', desc: 'Maximum file size reduction' },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                    level === item.id
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reduceLevel"
                    value={item.id}
                    checked={level === item.id}
                    onChange={() => setLevel(item.id as typeof level)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleReduce}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Zap className="w-4 h-4" />
              <span>Reduce File Size</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Optimizing file..." />
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
