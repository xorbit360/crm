import React, { StrictMode, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    const msg = error?.message || '';
    // Send the real exception to the server; the generic screen alone hides
    // whether this was a stale chunk, a browser DOM conflict or a code bug.
    try {
      fetch('/api/client-errors', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          name: error?.name || 'Error',
          message: msg,
          stack: error?.stack || '',
          componentStack: errorInfo?.componentStack || '',
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => undefined);
    } catch (_) {}
    // If it's a DOM manipulation error caused by Google Translate or extensions, auto-recover
    if (msg.includes('insertBefore') || msg.includes('removeChild') || msg.includes('Node')) {
      setTimeout(() => {
        (this as any).setState({ hasError: false, error: null });
      }, 500);
    }
    // After a deploy, a phone may still hold an old lazy chunk name. Reload
    // once instead of leaving the operator on this screen.
    const isChunkError = msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Failed to load module script') ||
      msg.includes('Expected a JavaScript module script') ||
      msg.includes('Unable to preload CSS') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Loading chunk');
    if (isChunkError) {
      try {
        const key = 'xorbit-chunk-reload-at';
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
        }
      } catch (_) {
        window.location.reload();
      }
    }
  }

  render() {
    const state = (this as any).state || {};
    if (state.hasError) {
      const isDomError = state.error?.message?.includes('insertBefore') || state.error?.message?.includes('removeChild');

      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' }}>
              {isDomError ? 'Conflicto de Traducción Automática' : 'Ocurrió un inconveniente temporal'}
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', lineHeight: '1.6' }}>
              {isDomError
                ? 'El traductor automático de tu navegador modificó la estructura visual de la página. Te recomendamos desactivar la traducción automática en este sitio.'
                : 'La aplicación ha detectado un evento inesperado. Puedes recargar para continuar sin perder tu información.'}
            </p>
            {state.error?.message && !isDomError && (
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5', overflowWrap: 'anywhere' }}>
                {String(state.error.message).slice(0, 240)}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🔄 Reintentar / Cargar aplicación
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
