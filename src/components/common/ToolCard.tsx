import React from 'react';
import * as Icons from 'lucide-react';
import { Star } from 'lucide-react';
import { ToolDefinition } from '../../types/tools';

interface ToolCardProps {
  tool: ToolDefinition;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectTool: (id: string) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  onToggleFavorite,
  onSelectTool,
}) => {
  // Dynamically resolve icon from lucide-react with fallback
  const IconComponent = (Icons as unknown as Record<string, React.FC<{ className?: string }>>)[
    tool.iconName
  ] || Icons.File;

  return (
    <div
      onClick={() => onSelectTool(tool.id)}
      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/60 hover:border-indigo-400/80 dark:hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/5 transition cursor-pointer select-none"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                {tool.badge}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(tool.id);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
            >
              <Star
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-amber-400 text-amber-500' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
          {tool.name}
        </h3>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {tool.supportedFormats.slice(0, 3).map((fmt) => (
            <span
              key={fmt}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              {fmt.replace('.', '').toUpperCase()}
            </span>
          ))}
          {tool.supportedFormats.length > 3 && (
            <span className="text-[10px] text-slate-400">
              +{tool.supportedFormats.length - 3}
            </span>
          )}
        </div>

        <span className="font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition inline-flex items-center gap-0.5 text-xs">
          Open Tool →
        </span>
      </div>
    </div>
  );
};
