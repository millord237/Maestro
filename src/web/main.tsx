/**
 * Maestro Web Interface Entry Point
 *
 * This is the main entry point for the web interface.
 * It detects the device type and renders the appropriate interface.
 */

import React, { StrictMode, lazy, Suspense, useEffect, useState, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './components/ThemeProvider';
import { registerServiceWorker, isOffline } from './utils/serviceWorker';
import './index.css';

/**
 * Context for offline status
 * Provides offline state to all components in the app
 */
interface OfflineContextValue {
  isOffline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({ isOffline: false });

/**
 * Hook to access offline status
 */
export function useOfflineStatus(): boolean {
  return useContext(OfflineContext).isOffline;
}

// Lazy load mobile and desktop apps for code splitting
// Using webpackChunkName magic comments for Vite compatibility
// This creates separate bundles that are only loaded based on device type
const MobileApp = lazy(() =>
  import(/* webpackChunkName: "mobile" */ './mobile').catch(() => ({
    default: () => <PlaceholderApp type="mobile" />,
  }))
);

const DesktopApp = lazy(() =>
  import(/* webpackChunkName: "desktop" */ './desktop/App').catch(() => ({
    default: () => <PlaceholderApp type="desktop" />,
  }))
);

/**
 * Detect if the device is mobile based on screen size and touch capability
 */
function isMobileDevice(): boolean {
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check screen width (768px is a common breakpoint)
  const isSmallScreen = window.innerWidth < 768;

  // Check user agent for mobile indicators
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Consider mobile if small screen OR (has touch AND mobile user agent)
  return isSmallScreen || (hasTouch && mobileUserAgent);
}

/**
 * Placeholder component shown while the actual app loads
 * or if the app module hasn't been created yet
 */
function PlaceholderApp({ type }: { type: 'mobile' | 'desktop' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        color: 'var(--color-text-main)',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>Maestro Web</h1>
      <p style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }}>
        {type === 'mobile' ? 'Mobile' : 'Desktop'} interface coming soon
      </p>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
        Connect to your Maestro desktop app to get started
      </p>
    </div>
  );
}

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
    </div>
  );
}

/**
 * Main App component that routes to mobile or desktop
 */
function App() {
  const [isMobile, setIsMobile] = useState(isMobileDevice);
  const [offline, setOffline] = useState(isOffline());

  // Re-check on resize (for responsive design testing)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Register service worker for offline capability
  useEffect(() => {
    registerServiceWorker({
      onSuccess: (registration) => {
        console.log('[App] Service worker ready:', registration.scope);
      },
      onUpdate: (registration) => {
        console.log('[App] New content available, refresh recommended');
        // Could show a toast/notification here prompting user to refresh
      },
      onOfflineChange: (newOfflineStatus) => {
        console.log('[App] Offline status changed:', newOfflineStatus);
        setOffline(newOfflineStatus);
      },
    });
  }, []);

  return (
    <OfflineContext.Provider value={{ isOffline: offline }}>
      <ThemeProvider>
        <Suspense fallback={<LoadingFallback />}>
          {isMobile ? <MobileApp /> : <DesktopApp />}
        </Suspense>
      </ThemeProvider>
    </OfflineContext.Provider>
  );
}

// Mount the application
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  console.error('Root element not found');
}
