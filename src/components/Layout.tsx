import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import LocaleSync from './LocaleSync';
import { useCompressorStore } from '../store/useCompressorStore';

export default function Layout() {
  const theme = useCompressorStore((s) => s.theme);
  // The Toaster reads window.getComputedStyle during render, so it must
  // not render in the build-time prerender (Node has no real DOM). Gate it
  // on mount: the first client render matches the server HTML (no toaster),
  // then it appears. No toast exists before a user action anyway.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
      <LocaleSync />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1"><Outlet /></main>
      <Footer />
      {/* Toasts own TRANSIENT SUCCESS only (ZIP downloaded). Errors stay
          in-flow role="alert" banners — a toast that auto-dismisses would
          hide the reason a user needs to act on. Styled on the app's
          tokens; theme follows the store (sonner's own dark/light). */}
      {mounted && (
        <Toaster
          theme={theme}
          position="bottom-right"
          toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' } }}
          icons={{ success: <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" /> }}
        />
      )}
    </div>
  );
}
