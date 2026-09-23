import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import { TOOLS_CATALOG } from '../../data/toolsCatalog';
import { useFavorites } from '../../hooks/useFavorites';
import { useRecentTools } from '../../hooks/useRecentTools';

// Tool Components
import { PdfMergeTool } from './pdf/PdfMergeTool';
import { PdfSplitTool } from './pdf/PdfSplitTool';
import { PdfCompressTool } from './pdf/PdfCompressTool';
import { PdfToImageTool } from './pdf/PdfToImageTool';
import { ImageToPdfTool } from './pdf/ImageToPdfTool';
import { PdfPageExtractorTool } from './pdf/PdfPageExtractorTool';
import { PdfPageDeleterTool } from './pdf/PdfPageDeleterTool';
import { PdfRotateTool } from './pdf/PdfRotateTool';
import { PdfWatermarkTool } from './pdf/PdfWatermarkTool';
import { PdfPageNumberTool } from './pdf/PdfPageNumberTool';
import { PdfMetadataTool } from './pdf/PdfMetadataTool';

import { ImageCompressTool } from './image/ImageCompressTool';
import { ImageResizeTool } from './image/ImageResizeTool';
import { ImageCropTool } from './image/ImageCropTool';
import { ImageConvertTool } from './image/ImageConvertTool';
import { ImageRotateTool } from './image/ImageRotateTool';
import { ImageDimensionTool } from './image/ImageDimensionTool';
import { ImageBackgroundTool } from './image/ImageBackgroundTool';
import { ImageMetadataTool } from './image/ImageMetadataTool';

import { ReduceFileSizeTool } from './unified/ReduceFileSizeTool';

interface ToolDispatcherProps {
  toolId: string;
  onBack: () => void;
  onNavigate: (route: string) => void;
}

export const ToolDispatcher: React.FC<ToolDispatcherProps> = ({
  toolId,
  onBack,
  onNavigate,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addRecent } = useRecentTools();

  const tool = TOOLS_CATALOG.find((t) => t.id === toolId);

  useEffect(() => {
    if (toolId) {
      addRecent(toolId);
    }
  }, [toolId, addRecent]);

  if (!tool) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tool Not Found</h2>
        <p className="text-sm text-slate-500">The requested tool does not exist.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
        >
          Back to Tools
        </button>
      </div>
    );
  }

  const renderToolComponent = () => {
    switch (tool.id) {
      case 'pdf-merge':
        return <PdfMergeTool />;
      case 'pdf-split':
        return <PdfSplitTool />;
      case 'pdf-compress':
        return <PdfCompressTool />;
      case 'pdf-to-jpg':
        return <PdfToImageTool defaultFormat="image/jpeg" />;
      case 'pdf-to-png':
        return <PdfToImageTool defaultFormat="image/png" />;
      case 'jpg-to-pdf':
      case 'png-to-pdf':
      case 'images-to-pdf':
        return <ImageToPdfTool />;
      case 'pdf-extract':
        return <PdfPageExtractorTool />;
      case 'pdf-delete-pages':
        return <PdfPageDeleterTool />;
      case 'pdf-rotate':
        return <PdfRotateTool />;
      case 'pdf-watermark':
        return <PdfWatermarkTool />;
      case 'pdf-page-number':
        return <PdfPageNumberTool />;
      case 'pdf-metadata':
        return <PdfMetadataTool />;

      case 'image-compress':
      case 'image-quality':
        return <ImageCompressTool />;
      case 'image-resize':
        return <ImageResizeTool />;
      case 'image-crop':
        return <ImageCropTool />;
      case 'image-convert':
        return <ImageConvertTool />;
      case 'image-rotate':
        return <ImageRotateTool />;
      case 'image-dimension':
        return <ImageDimensionTool />;
      case 'image-background':
        return <ImageBackgroundTool />;
      case 'image-metadata':
        return <ImageMetadataTool />;

      case 'reduce-file-size':
        return <ReduceFileSizeTool />;

      default:
        return <div>Tool coming soon</div>;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() =>
              onNavigate(
                tool.category === 'pdf' ? 'pdf-tools' : tool.category === 'image' ? 'image-tools' : 'all-tools',
              )
            }
            className="capitalize hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            {tool.category === 'pdf' ? 'PDF Tools' : tool.category === 'image' ? 'Image Tools' : 'Tools'}
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {tool.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => toggleFavorite(tool.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite(tool.id) ? 'fill-amber-400 text-amber-500' : ''
              }`}
            />
            <span>{isFavorite(tool.id) ? 'Favorited' : 'Add to Favorites'}</span>
          </button>

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Tools</span>
          </button>
        </div>
      </div>

      {/* Tool Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 text-xs font-medium mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Browser Engine • Private & Instant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {tool.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* The Active Tool Component */}
      <div className="pt-2">{renderToolComponent()}</div>

      {/* Trust & Privacy Card below tool */}
      <div className="max-w-2xl mx-auto mt-12 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>No files leave your computer. 100% processed on-device.</span>
        </div>
        <button
          onClick={() => onNavigate('privacy')}
          className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
        >
          Privacy details
        </button>
      </div>
    </div>
  );
};
