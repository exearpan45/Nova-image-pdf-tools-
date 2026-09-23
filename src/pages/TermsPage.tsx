import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-fade-in text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="text-center space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
          <FileText className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400">
          Last Updated: 2026 • © 2026 Copyright Arpan Goswami. All rights reserved.
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            1. Agreement to Terms
          </h3>
          <p>
            By accessing or using NOVA PDF & IMAGE TOOLS ("NOVA"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            2. Permissible Usage & Content Ownership
          </h3>
          <p>
            You retain 100% ownership and intellectual property rights over all files, documents, and graphics that you process using NOVA. NOVA never claims any ownership, license, or right over your submitted content.
          </p>
          <p>
            You agree not to use the application to process illegal materials or engage in malicious activities.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            3. Disclaimer of Warranties
          </h3>
          <p>
            NOVA is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied. While our browser algorithms are thoroughly tested for data fidelity, we encourage you to keep backups of your original documents prior to performing destructive batch edits.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            4. Limitation of Liability
          </h3>
          <p>
            In no event shall NOVA or its creator, Arpan Goswami, be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the software.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            5. Intellectual Property & Copyright
          </h3>
          <p>
            The software, branding, user interface design, logos, and custom code of NOVA are protected under intellectual property laws. © 2026 Copyright Arpan Goswami. All rights reserved.
          </p>
        </section>
      </div>
    </div>
  );
};
