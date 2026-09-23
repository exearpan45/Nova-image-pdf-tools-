/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { SearchModal } from './components/common/SearchModal';

import { HomePage } from './pages/HomePage';
import { AllToolsPage } from './pages/AllToolsPage';
import { PdfToolsPage } from './pages/PdfToolsPage';
import { ImageToolsPage } from './pages/ImageToolsPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ContactPage } from './pages/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { ToolDispatcher } from './components/tools/ToolDispatcher';
import { useFavorites } from './hooks/useFavorites';
import { useTheme } from './hooks/useTheme';

export default function App() {
  // Initialize theme
  useTheme();

  const { favoriteIds } = useFavorites();
  const [searchOpen, setSearchOpen] = useState(false);

  // Hash-based client routing to support refresh and browser back/forward buttons
  const getRouteFromHash = (): string => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return 'home';
    return hash;
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getRouteFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((route: string) => {
    window.location.hash = route === 'home' ? '' : `#${route}`;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectTool = useCallback(
    (toolId: string) => {
      navigate(`tool:${toolId}`);
    },
    [navigate],
  );

  // Keyboard shortcut listener for '/' to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !searchOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Render view
  const renderCurrentView = () => {
    if (currentRoute.startsWith('tool:')) {
      const toolId = currentRoute.replace('tool:', '');
      return (
        <ToolDispatcher
          toolId={toolId}
          onBack={() => navigate('all-tools')}
          onNavigate={navigate}
        />
      );
    }

    switch (currentRoute) {
      case 'home':
        return (
          <HomePage
            onSelectTool={handleSelectTool}
            onNavigate={navigate}
          />
        );
      case 'all-tools':
        return <AllToolsPage onSelectTool={handleSelectTool} />;
      case 'pdf-tools':
        return <PdfToolsPage onSelectTool={handleSelectTool} />;
      case 'image-tools':
        return <ImageToolsPage onSelectTool={handleSelectTool} />;
      case 'about':
        return <AboutPage onNavigate={navigate} />;
      case 'privacy':
        return <PrivacyPage />;
      case 'terms':
        return <TermsPage />;
      case 'contact':
        return <ContactPage />;
      default:
        return <NotFoundPage onNavigateHome={() => navigate('home')} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={navigate}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{renderCurrentView()}</main>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectTool={handleSelectTool}
        favorites={favoriteIds}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Footer */}
      <Footer onNavigate={navigate} />
    </div>
  );
}
