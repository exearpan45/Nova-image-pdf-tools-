import React from 'react';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Lock,
  Cpu,
  Star,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { ToolCard } from '../components/common/ToolCard';
import { TOOLS_CATALOG } from '../data/toolsCatalog';
import { useFavorites } from '../hooks/useFavorites';
import { useRecentTools } from '../hooks/useRecentTools';

interface HomePageProps {
  onSelectTool: (id: string) => void;
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectTool,
  onNavigate,
}) => {
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();
  const { recentIds, clearRecent } = useRecentTools();

  const popularTools = TOOLS_CATALOG.filter((t) => t.popular);
  const favoriteTools = TOOLS_CATALOG.filter((t) => favoriteIds.includes(t.id));
  const recentTools = recentIds
    .map((id) => TOOLS_CATALOG.find((t) => t.id === id))
    .filter(Boolean) as typeof TOOLS_CATALOG;

  return (
    <div className="w-full space-y-16 pb-12 animate-fade-in">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-8 sm:pb-12 text-center max-w-4xl mx-auto px-4">
        {/* Privacy Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-medium mb-6 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Your files are processed locally in your browser whenever possible.</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
          PDF & Image Tools, <br />
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
            All in One Place
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Convert, compress, resize, merge, split and manage your files quickly and securely.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => {
              const el = document.getElementById('popular-tools');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <span>Explore Tools</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('all-tools')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-xs transition"
          >
            All Tools (24)
          </button>
        </div>

        {/* High performance micro indicators */}
        <div className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Instant Client Processing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Zero Data Uploaded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span>Low RAM & CPU Engine</span>
          </div>
        </div>
      </section>

      {/* Favorites Section (if any exist) */}
      {favoriteTools.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Your Favorited Tools
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favoriteTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isFavorite={isFavorite(tool.id)}
                onToggleFavorite={toggleFavorite}
                onSelectTool={onSelectTool}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Tools Section (if any exist) */}
      {recentTools.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Recently Used
              </h3>
            </div>
            <button
              onClick={clearRecent}
              className="text-xs text-slate-400 hover:text-red-500 transition"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {recentTools.slice(0, 6).map((tool) => (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-xs font-medium text-slate-700 dark:text-slate-300 transition"
              >
                <span>{tool.name}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular Tools Section */}
      <section id="popular-tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Popular Utilities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              The most commonly used document & picture conversion tools.
            </p>
          </div>
          <button
            onClick={() => onNavigate('all-tools')}
            className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View all 24 tools</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {popularTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isFavorite={isFavorite(tool.id)}
              onToggleFavorite={toggleFavorite}
              onSelectTool={onSelectTool}
            />
          ))}
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900/60 dark:to-slate-900/20 border border-slate-200 dark:border-slate-800/80 p-8 sm:p-12">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Why Choose NOVA Tools?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Built from the ground up for speed, simplicity, and complete user security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                100% Privacy by Design
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your private documents and photos never leave your device. All calculations, parsing, and exports happen locally inside your browser runtime.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                Instant Execution
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No server queueing, no file upload wait times, and zero bandwidth waste. Experience instant compression and conversions at native speed.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                Offline Capable (PWA)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Install NOVA to your desktop or mobile home screen. It works seamlessly even when you are disconnected from the internet.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
