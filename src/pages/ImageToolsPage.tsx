import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { TOOLS_CATALOG } from '../data/toolsCatalog';
import { ToolCard } from '../components/common/ToolCard';
import { useFavorites } from '../hooks/useFavorites';

interface ImageToolsPageProps {
  onSelectTool: (id: string) => void;
}

export const ImageToolsPage: React.FC<ImageToolsPageProps> = ({ onSelectTool }) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  const imageTools = TOOLS_CATALOG.filter(
    (t) =>
      t.category === 'image' ||
      t.category === 'conversion' ||
      t.id === 'image-compress' ||
      t.id === 'image-metadata',
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 text-xs font-medium mb-1">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>High Performance Image Suite</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Image Processing Tools
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Compress photos, resize dimensions, crop, transcode formats, rotate, and clean backdrops without loss of clarity.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {imageTools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            isFavorite={isFavorite(tool.id)}
            onToggleFavorite={toggleFavorite}
            onSelectTool={onSelectTool}
          />
        ))}
      </div>
    </div>
  );
};
