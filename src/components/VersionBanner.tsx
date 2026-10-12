import { useEffect, useState } from 'react';

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

// Banner discreto (no bloqueante) cuando el backend publica una versión nueva.
// Consulta /api/version cada 5 minutos y compara con la versión del arranque.
export default function VersionBanner() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let initial: string | null = null;
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const v = String(data?.version || '');
        if (!v) return;
        if (initial === null) { initial = v; return; }
        if (v !== initial && alive) setAvailable(true);
      } catch (_) { /* sin red: reintentar en el próximo ciclo */ }
    };
    check();
    const timer = window.setInterval(check, 5 * 60 * 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  if (!available || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-2 bg-amber-950/95 border-b border-amber-700 text-amber-100 text-sm shadow-lg">
      <span>\u2728 Nueva versi\u00f3n disponible</span>
      <button
        onClick={() => hardRefreshForUpdate()}
        className="px-3 py-1 rounded-md bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
      >
        Actualizar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-300/70 hover:text-amber-100 text-xs px-1"
        aria-label="Cerrar aviso"
      >
        \u2715
      </button>
    </div>
  );
}
