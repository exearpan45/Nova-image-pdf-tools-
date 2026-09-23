import React from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { TOOLS_CATALOG } from '../data/toolsCatalog';
import { ToolCard } from '../components/common/ToolCard';
import { useFavorites } from '../hooks/useFavorites';

interface PdfToolsPageProps {
  onSelectTool: (id: string) => void;
}

export const PdfToolsPage: React.FC<PdfToolsPageProps> = ({ onSelectTool }) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  const pdfTools = TOOLS_CATALOG.filter(
    (t) => t.category === 'pdf' || t.category === 'pdf-image' || t.id === 'pdf-compress' || t.id === 'pdf-metadata',
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 text-xs font-medium mb-1">
          <FileText className="w-3.5 h-3.5" />
          <span>Complete PDF Suite</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          PDF Processing Tools
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Merge, split, compress, convert, watermark, rotate, and clean PDF documents with total privacy in your browser.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {pdfTools.map((tool) => (
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
