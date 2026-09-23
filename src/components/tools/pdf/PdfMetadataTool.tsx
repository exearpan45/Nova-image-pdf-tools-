import React, { useState } from 'react';
import { Info, ShieldAlert, CheckCircle2, FileText, Trash2, Download } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { ProgressBar } from '../../common/ProgressBar';
import { ResultScreen } from '../../common/ResultScreen';
import { getPdfMetadata, stripPdfMetadata, PdfMetadata, createPdfBlob } from '../../../utils/pdfOps';
import { formatBytes, formatDate, getFilenameWithoutExt } from '../../../utils/formatters';
import { downloadBlob } from '../../../utils/download';
import { ProcessedResult } from '../../../types/tools';

export const PdfMetadataTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<PdfMetadata | null>(null);

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
      const metadata = await getPdfMetadata(buffer);
      setMeta(metadata);
    } catch (err) {
      console.error('Metadata reading error:', err);
      setError('Unable to read PDF metadata. The file may be protected or corrupted.');
      setFile(null);
    }
  };

  const handleStrip = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(30);

      const buffer = await file.arrayBuffer();
      setProgress(60);
      const strippedBytes = await stripPdfMetadata(buffer);
      setProgress(90);

      const blob = createPdfBlob(strippedBytes);
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        fileName: `${getFilenameWithoutExt(file.name)}_clean_no_metadata.pdf`,
        fileSize: blob.size,
        blob,
        downloadUrl,
        format: 'PDF',
      });
      setProgress(100);
    } catch (err: unknown) {
      console.error('Strip metadata error:', err);
      setError('Failed to strip metadata.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (result?.downloadUrl) {
      URL.revokeObjectURL(result.downloadUrl);
    }
    setFile(null);
    setMeta(null);
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
              title="Upload PDF to inspect & clean metadata"
              subtitle="Drop your document here or click to browse"
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
                      {formatBytes(file.size)} • {meta?.pageCount} pages
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

              {/* Metadata List */}
              {meta && (
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                    Document Properties
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Title</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {meta.title || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Author</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {meta.author || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Subject</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {meta.subject || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Keywords</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {meta.keywords && meta.keywords.length > 0
                          ? meta.keywords.join(', ')
                          : 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Application / Creator</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {meta.creator || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">PDF Producer</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {meta.producer || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Creation Date</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {meta.creationDate ? formatDate(meta.creationDate) : 'Unknown'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-slate-400 text-[11px]">Modification Date</div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {meta.modificationDate ? formatDate(meta.modificationDate) : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings / Privacy Action */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Privacy Hardening
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              PDF documents often store hidden metadata such as author names, software versions, and internal file paths.
            </p>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300">
              Strip all identifying metadata to safely share your document anonymously.
            </div>

            <button
              onClick={handleStrip}
              disabled={!file || isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Strip Metadata & Save</span>
            </button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <ProgressBar progress={progress} operationText="Scrubbing document metadata..." />
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
