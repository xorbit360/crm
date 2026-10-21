import React, { StrictMode, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Detecta errores de chunks viejos tras un deploy (nombres con hash que ya no existen).
function isChunkLoadError(msg: string): boolean {
  return msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to load module script') ||
    msg.includes('Expected a JavaScript module script') ||
    msg.includes('Unable to preload CSS') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk');
}

// Limpieza profunda para cuando hay una versión nueva: desregistra el service
// worker, vacía sus cachés y recarga. Sin esto, el SW puede seguir sirviendo el
// index.html viejo y el error se repite en cada recarga.
async function hardRefreshForUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (_) { /* recargar de todos modos */ }
  window.location.reload();
}

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
    if (isChunkLoadError(msg)) {
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
      const errMsg: string = state.error?.message || '';
      const isDomError = errMsg.includes('insertBefore') || errMsg.includes('removeChild');

      // Pantalla amigable de actualización: no parece un error, es una versión nueva.
      // Solo para errores de chunks; los demás errores conservan el flujo actual.
      if (!isDomError && isChunkLoadError(errMsg)) {
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
              maxWidth: '480px',
              backgroundColor: '#1e293b',
              border: '1px solid #b45309',
              borderRadius: '16px',
              padding: '36px 32px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>\u2728</div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: '#fbbf24' }}>
                Hay una nueva actualizaci\u00f3n
              </h2>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '28px', lineHeight: '1.6' }}>
                Publicamos una versi\u00f3n nueva de la aplicaci\u00f3n. Actualiza para continuar con lo \u00faltimo, sin perder tu informaci\u00f3n.
              </p>
              <button
                onClick={() => { hardRefreshForUpdate(); }}
                style={{
                  backgroundColor: '#d97706',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '13px 28px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Actualizar ahora
              </button>
            </div>
          </div>
        );
      }

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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' }}>
              {isDomError ? 'Conflicto de Traducción Automática' : 'Nueva actualización disponible'}
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', lineHeight: '1.6' }}>
              {isDomError
                ? 'El traductor automático de tu navegador modificó la estructura visual de la página. Te recomendamos desactivar la traducción automática en este sitio.'
                : 'Hay una nueva versión de la aplicación. Actualiza la página para continuar con las últimas mejoras.'}
            </p>
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
              🔄 Actualizar página
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
