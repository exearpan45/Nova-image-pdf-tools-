import React, { useState } from 'react';
import { Minimize2, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { compressPdf, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, calculateSavings } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfCompressTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFileSelected = (files: File[]) => {
    if (files[0]) {
      setFile(files[0]);
      setError(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(15);

      const buffer = await file.arrayBuffer();
      const compressedBytes = await compressPdf(buffer, level, (p) => {
        setProgress(15 + Math.round(p * 0.8));
      });

      const blob = createPdfBlob(compressedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `compressed_${file.name}`,
        fileSize: blob.size,
        originalSize: file.size,
        blob,
        downloadUrl,
        format: 'PDF',
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('PDF compress error:', err);
      setError('Failed to compress this PDF document. The file structure may not support stream compression.');
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
        {/* Main Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {!file ? (
            <Dropzone
              accept={['.pdf']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Upload PDF to compress"
              subtitle="Drop your PDF here or click to browse"
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-xs">
                      {file.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Original size: {formatBytes(file.size)}
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

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p>Selected level: <strong className="capitalize">{level} compression</strong></p>
                <p className="text-slate-400">
                  Stream re-encoding and internal dictionary optimization without destroying text readability.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Compression Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Minimize2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Compression Level
            </h4>

            <div className="space-y-2">
              {[
                { id: 'low', label: 'Low Compression', desc: 'Mild optimization, maximum quality' },
                { id: 'medium', label: 'Medium Compression', desc: 'Balanced file size & clarity (Recommended)' },
                { id: 'high', label: 'High Compression', desc: 'Aggressive optimization, smallest size' },
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
                    name="compressionLevel"
                    value={item.id}
                    checked={level === item.id}
                    onChange={() => setLevel(item.id as 'low' | 'medium' | 'high')}
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
              onClick={handleCompress}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Compress PDF</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Compressing PDF..." />
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
