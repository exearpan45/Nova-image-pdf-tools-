import React, { useState } from 'react';
import { Stamp, AlertCircle, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { PdfPreview } from '../../common/PdfPreview';
import { watermarkPdf, WatermarkOptions, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfWatermarkTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState<number>(42);
  const [opacity, setOpacity] = useState<number>(0.35);
  const [rotation, setRotation] = useState<number>(-45);
  const [color, setColor] = useState<string>('#94a3b8');
  const [position, setPosition] = useState<'center' | 'diagonal' | 'top' | 'bottom'>('diagonal');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const handleFileSelected = async (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setError(null);
    setFile(sel);

    try {
      const buffer = await sel.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      setPageCount(doc.getPageCount());
    } catch (err) {
      console.error('Failed to parse PDF:', err);
      setError('Failed to inspect PDF. It may be protected or corrupted.');
      setFile(null);
    }
  };

  const handleWatermark = async () => {
    if (!file) return;
    if (!text.trim()) {
      setError('Please enter a watermark text.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const buffer = await file.arrayBuffer();
      const options: WatermarkOptions = {
        text: text.trim(),
        fontSize,
        opacity,
        rotation,
        color,
        position,
      };

      setProgress(60);
      const watermarkedBytes = await watermarkPdf(buffer, options);
      setProgress(90);

      const blob = createPdfBlob(watermarkedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_watermarked.pdf`,
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
        pagesCount: pageCount,
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Watermark error:', err);
      setError('Failed to apply watermark to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setPageCount(0);
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
              accept={['.pdf']}
              multiple={false}
              onFilesSelected={handleFileSelected}
              title="Upload PDF to watermark"
              subtitle="Drop a single PDF here or click to browse"
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
                      {formatBytes(file.size)} • {pageCount} pages
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

              {/* Document First Page Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Document Page Preview</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    Interactive PDF Viewer
                  </span>
                </div>
                <PdfPreview
                  file={file}
                  width={300}
                  thumbnailOnly={false}
                  showControls={true}
                  className="shadow-inner"
                />
              </div>

              {/* Watermark Live Visual Simulator */}
              <div className="relative w-full h-56 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-center overflow-hidden">
                <div
                  style={{
                    transform: `rotate(${position === 'diagonal' ? -45 : position === 'center' ? 0 : 0}deg)`,
                    opacity: opacity,
                    color: color,
                    fontSize: `${Math.min(36, fontSize)}px`,
                  }}
                  className="font-bold tracking-widest text-center select-none uppercase pointer-events-none"
                >
                  {text || 'PREVIEW'}
                </div>
                <div className="absolute bottom-2 right-3 text-[10px] text-slate-400">
                  Live Style Preview
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Stamp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Watermark Settings
            </h4>

            {/* Watermark text */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Watermark Text
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. DRAFT, CONFIDENTIAL"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
              />
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Position
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(['diagonal', 'center', 'top', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      setPosition(pos);
                      if (pos === 'diagonal') setRotation(-45);
                      else setRotation(0);
                    }}
                    className={`py-1.5 rounded-lg border capitalize font-medium transition ${
                      position === pos
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">Opacity</label>
                <span className="font-mono text-slate-500">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Font Size slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">Font Size</label>
                <span className="font-mono text-slate-500">{fontSize}pt</span>
              </div>
              <input
                type="range"
                min="18"
                max="72"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Color selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Watermark Color
              </label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Slate', hex: '#94a3b8' },
                  { name: 'Red', hex: '#ef4444' },
                  { name: 'Blue', hex: '#3b82f6' },
                  { name: 'Dark', hex: '#334155' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      color === c.hex ? 'border-indigo-600 scale-110' : 'border-transparent'
                    }`}
                    title={c.name}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5"
                  title="Custom color"
                />
              </div>
            </div>

            <button
              onClick={handleWatermark}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Stamp className="w-4 h-4" />
              <span>Apply Watermark</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Applying watermark to document..." />
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
