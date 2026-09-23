import React from 'react';
import { ShieldCheck, Heart, Sparkles, Lock, Cpu } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs transition-colors">
      {/* Privacy Callout Banner */}
      <div className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40 py-3.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Privacy Guarantee: Your files are processed locally in your browser whenever possible.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Zero Server Uploads
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              High Speed Engine
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white font-mono font-bold text-sm">
                N
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-base">
                NOVA PDF & IMAGE TOOLS
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed text-xs">
              Everything You Need for PDF & Image Processing — Fast, Simple & Secure.
              Engineered with modern Web APIs for high performance and total privacy.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500">
              Created by <span className="font-medium text-slate-700 dark:text-slate-300">Arpan Goswami</span> • <a href="mailto:exe.arpan45@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">exe.arpan45@gmail.com</a>
            </div>
          </div>

          {/* Tools Navigation */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Tools Directory
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('pdf-tools')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  PDF Utilities
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('image-tools')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  Image Tools
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('tool:reduce-file-size')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  Reduce File Size
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('all-tools')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  All 24 Tools
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Company */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Information
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  About NOVA
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                >
                  Contact & Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>© 2026 Copyright Arpan Goswami. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span>Client-side WebApp</span>
            <span>•</span>
            <span>Zero Tracking</span>
            <span>•</span>
            <span>PWA Enabled</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
