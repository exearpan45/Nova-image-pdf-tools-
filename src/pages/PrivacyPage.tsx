import React from 'react';
import { ShieldCheck, Lock, EyeOff, ServerOff, CheckCircle } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-fade-in text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="text-center space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">
          Last Updated: 2026 • Creator: Arpan Goswami
        </p>
      </div>

      {/* Main Privacy Notice */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-4">
        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <h4 className="font-bold text-emerald-900 dark:text-emerald-200">
            Our Fundamental Privacy Promise
          </h4>
          <p className="mt-1 text-emerald-800 dark:text-emerald-300/90 leading-relaxed text-xs sm:text-sm">
            “Your files are processed locally in your browser whenever possible.” NOVA does not upload, copy, inspect, or log your confidential documents or images.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            1. Client-Side Browser Processing
          </h3>
          <p>
            Unlike traditional cloud conversion sites that transmit your files across the internet to remote servers, NOVA executes conversions and manipulations directly inside your local browser tab. The memory and computation belong entirely to your personal device.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            2. Zero File Storage & Retention
          </h3>
          <p>
            Because your files never leave your client environment, we do not store, retain, or backup your documents on any server or cloud database. Once you close or reload the browser tab, all temporary memory buffers (Blob and Object URLs) are immediately released and permanently wiped by your browser's garbage collector.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            3. Local Storage & Preferences
          </h3>
          <p>
            NOVA uses standard browser <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">localStorage</code> strictly for convenience features:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
            <li>Your chosen visual theme (Light, Dark, or System preference).</li>
            <li>Your list of favorited tool identifiers.</li>
            <li>Your list of recently opened tool identifiers.</li>
          </ul>
          <p className="text-xs text-slate-500">
            No document contents, names, or file sizes are ever recorded in persistent tracking storage.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            4. Analytics & Tracking
          </h3>
          <p>
            We do not sell, rent, or trade your personal data. NOVA operates without invasive behavioral trackers, third-party analytics pixels, or advertising beacons.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            5. Progressive Web App (PWA) Offline Security
          </h3>
          <p>
            When installed as a PWA, application code is cached securely by service workers so that tools function fully without an active internet connection, guaranteeing zero external network exposure for your documents.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            For questions or suggestions regarding our privacy guarantees, please feel free to get in touch via our Contact page.
          </p>
        </section>
      </div>
    </div>
  );
};
