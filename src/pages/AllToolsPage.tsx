import React, { useState, useMemo } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { TOOLS_CATALOG, CATEGORIES_CONFIG } from '../data/toolsCatalog';
import { ToolCard } from '../components/common/ToolCard';
import { useFavorites } from '../hooks/useFavorites';
import { ToolCategory } from '../types/tools';

interface AllToolsPageProps {
  onSelectTool: (id: string) => void;
  initialCategory?: string;
}

export const AllToolsPage: React.FC<AllToolsPageProps> = ({
  onSelectTool,
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { isFavorite, toggleFavorite } = useFavorites();

  const filteredTools = useMemo(() => {
    return TOOLS_CATALOG.filter((tool) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'pdf' && tool.category !== 'pdf') return false;
        if (selectedCategory === 'image' && tool.category !== 'image') return false;
        if (selectedCategory === 'pdf-image' && tool.category !== 'pdf-image') return false;
        if (selectedCategory === 'compression' && tool.category !== 'compression') return false;
        if (selectedCategory === 'conversion' && tool.category !== 'conversion') return false;
        if (selectedCategory === 'utility' && tool.category !== 'utility') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = tool.name.toLowerCase().includes(q);
        const matchesDesc = tool.description.toLowerCase().includes(q);
        const matchesKeywords = tool.keywords.some((k) => k.toLowerCase().includes(q));
        const matchesFormat = tool.supportedFormats.some((f) => f.toLowerCase().includes(q));
        return matchesName || matchesDesc || matchesKeywords || matchesFormat;
      }

      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          All Tools & Utilities
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Browse the complete catalog of {TOOLS_CATALOG.length} high-speed, client-side PDF and image tools.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative max-w-md mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools by name, action or format..."
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 pt-2">
          {CATEGORIES_CONFIG.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isFavorite={isFavorite(tool.id)}
              onToggleFavorite={toggleFavorite}
              onSelectTool={onSelectTool}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3">
          <p className="text-slate-500 text-sm">
            No tools found matching "{searchQuery}" in this category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};
