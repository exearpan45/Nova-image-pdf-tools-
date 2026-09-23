import React from 'react';
import { ShieldCheck, Zap, Heart, Terminal, Code2, Award, Cpu } from 'lucide-react';

interface AboutPageProps {
  onNavigate: (route: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          About NOVA Tools
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          “Everything You Need for PDF & Image Processing — Fast, Simple & Secure.”
        </p>
      </div>

      {/* Creator Spotlight */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-xl shadow-md shadow-indigo-500/20">
            AG
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Arpan Goswami
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Creator & Lead Engineer • Aspiring Web Developer
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          NOVA was engineered by <strong>Arpan Goswami</strong> to solve a fundamental frustration with modern web tools: excessive ads, mandatory cloud uploads of sensitive documents, sluggish load times, and paywalled basic utilities. NOVA provides an uncompromisingly fast, completely private suite running directly in your web browser.
        </p>
      </div>

      {/* Core Architectural Tenets */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Our Architecture & Guarantees
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Local Browser Execution
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When you compress a document or convert a photo, your machine's processor handles the binary data via HTML5 Canvas, WebAssembly, and native memory buffers. Zero files are uploaded to any external server.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Zero Artificial Latency
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Without the bottleneck of slow network upload queues, operations finish in milliseconds. Work is saved straight back to your hard drive or mobile files.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Memory & Battery Efficiency
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Engineered with strict garbage collection hygiene: object URLs are revoked immediately after use to prevent memory leaks on lower-spec mobile devices.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              PWA Offline Resilience
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              NOVA is a fully compliant Progressive Web App. Install it once, and you can process documents in airplane mode or in remote areas with zero internet connectivity.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <button
          onClick={() => onNavigate('all-tools')}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm"
        >
          Explore All 24 Tools
        </button>
      </div>
    </div>
  );
};
