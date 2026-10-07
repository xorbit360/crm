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
    // If it's a DOM manipulation error caused by Google Translate or extensions, auto-recover
    const msg = error?.message || '';
    if (msg.includes('insertBefore') || msg.includes('removeChild') || msg.includes('Node')) {
      setTimeout(() => {
        (this as any).setState({ hasError: false, error: null });
      }, 500);
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
            <button
              onClick={() => {
                (this as any).setState({ hasError: false, error: null });
                window.location.reload();
              }}
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
