import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { pushSupported, getPushState, subscribePush } from '../lib/pushClient';

const DISMISS_KEY = 'xorbit_push_prompt_dismissed';

// Aviso discreto para activar notificaciones push en la app instalada.
// Aparece una sola vez; si el usuario lo cierra, no vuelve a molestar.
export default function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) return;
      try {
        const forceTest = window.location.search.includes('push=test');
        if (forceTest) {
          try { localStorage.removeItem(DISMISS_KEY); } catch {}
        }
        if (localStorage.getItem(DISMISS_KEY) === '1' && !forceTest) return;
        const state = await getPushState();
        if (!cancelled && state === 'default') {
          // Pequeña espera para no interrumpir el arranque.
          setTimeout(() => { if (!cancelled) setVisible(true); }, 4000);
        }
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    const ok = await subscribePush();
    setBusy(false);
    if (ok) setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-gray-900 border border-gold-500/30 rounded-2xl p-4 shadow-2xl shadow-black/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <BellRing size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Activa las notificaciones</p>
            <p className="text-xs text-gray-400 mt-1">Recibe avisos de actualizaciones y novedades directamente en tu celular.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={enable}
                disabled={busy}
                className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {busy ? 'Activando…' : 'Activar'}
              </button>
              <button
                onClick={dismiss}
                className="text-gray-500 hover:text-gray-300 text-xs font-medium px-3 py-2 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-600 hover:text-gray-300 transition-colors" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
