import React, { useState } from 'react';
import { Eye, Info, Image as ImageIcon } from 'lucide-react';
import { Dropzone } from '../../common/Dropzone';
import { getImageDimensions } from '../../../utils/imageOps';
import { formatBytes, formatDate } from '../../../utils/formatters';

export const ImageMetadataTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    width: number;
    height: number;
    megapixels: string;
    aspectRatio: string;
  } | null>(null);

  const getAspectRatioString = (w: number, h: number) => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(w, h);
    const rw = w / divisor;
    const rh = h / divisor;
    if (rw < 30 && rh < 30) return `${rw}:${rh}`;
    return `${(w / h).toFixed(2)}:1`;
  };

  const handleFileSelected = async (files: File[]) => {
    const sel = files[0];
    if (!sel) return;

    setFile(sel);
    setPreviewUrl(URL.createObjectURL(sel));

    try {
      const dims = await getImageDimensions(sel);
      const mp = ((dims.width * dims.height) / 1000000).toFixed(2);
      const aspect = getAspectRatioString(dims.width, dims.height);
      setMeta({
        width: dims.width,
        height: dims.height,
        megapixels: `${mp} MP`,
        aspectRatio: aspect,
      });
    } catch {
      // Non-fatal
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMeta(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file ? (
        <Dropzone
          accept={['.jpg', '.jpeg', '.png', '.webp']}
          multiple={false}
          onFilesSelected={handleFileSelected}
          title="Upload image to view technical details"
          subtitle="Inspect resolution, megapixel count, aspect ratio, and file attributes"
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-base truncate max-w-md">
                  {file.name}
                </h4>
                <p className="text-xs text-slate-400">{file.type || 'image/jpeg'}</p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-red-500 transition"
            >
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Visual thumbnail */}
            {previewUrl && (
              <div className="flex items-center justify-center p-3 rounded-xl bg-slate-100 dark:bg-slate-950/70 max-h-80 overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Inspection Preview"
                  className="max-h-72 object-contain rounded-lg shadow-xs"
                />
              </div>
            )}

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-400 text-[11px]">Dimensions</div>
                <div className="font-bold text-slate-900 dark:text-white font-mono text-sm mt-0.5">
                  {meta?.width} × {meta?.height} px
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-400 text-[11px]">File Size</div>
                <div className="font-bold text-slate-900 dark:text-white font-mono text-sm mt-0.5">
                  {formatBytes(file.size)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-400 text-[11px]">Megapixels</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm mt-0.5">
                  {meta?.megapixels}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-400 text-[11px]">Aspect Ratio</div>
                <div className="font-bold text-slate-900 dark:text-white font-mono text-sm mt-0.5">
                  {meta?.aspectRatio}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-400 text-[11px]">MIME Type</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {file.type || 'Unknown'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-slate-400 text-[11px]">Last Modified</div>
                <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatDate(new Date(file.lastModified))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
