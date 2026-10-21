import React, { useState, useEffect } from 'react';
import { Lock, Zap } from 'lucide-react';
import ActivatePlanView from './ActivatePlanView';

interface PaywallGateProps {
  /** Contenido que requiere plan pago. Si el usuario es free, se muestra bloqueado. */
  children: React.ReactNode;
  /** Texto del botón/llamado a la acción */
  ctaLabel?: string;
  /** Descripción de por qué se requiere el plan */
  reason?: string;
  /** Si es true, intercepta el clic y abre el modal en vez de ejecutar la acción */
  intercept?: boolean;
  className?: string;
}

/**
 * <PaywallGate> — Envuelve acciones que requieren plan pago.
 *
 * Uso 1 (bloqueo visual):
 *   <PaywallGate reason="Conectar un canal requiere un plan activo.">
 *     <button>Conectar WhatsApp</button>
 *   </PaywallGate>
 *
 * Uso 2 (interceptar acción existente):
 *   const gate = usePaywall();
 *   <button onClick={(e) => gate.guard(e, () => doConnect())}>Conectar</button>
 *
 * El estado free se consulta una vez a /api/billing/me y se cachea en memoria.
 */
let cachedFree: boolean | null = null;
export function resetPaywallCache() { cachedFree = null; }

export async function fetchIsFreeUser(): Promise<boolean> {
  if (cachedFree !== null) return cachedFree;
  try {
    const res = await fetch('/api/billing/me');
    const data = await res.json();
    cachedFree = Boolean(data?.free);
  } catch {
    cachedFree = false;
  }
  return cachedFree;
}

/** Hook para interceptar acciones: abre el modal "Activa tu plan" si el usuario es free. */
export function usePaywall() {
  const [showActivate, setShowActivate] = useState(false);
  const [isFree, setIsFree] = useState<boolean | null>(null);

  useEffect(() => {
    fetchIsFreeUser().then(setIsFree);
  }, []);

  /** Envuelve una acción: si es free, abre el modal y NO ejecuta; si no, ejecuta. */
  const guard = (e: React.SyntheticEvent | null, action: () => void) => {
    if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault();
    fetchIsFreeUser().then((free) => {
      if (free) setShowActivate(true);
      else action();
    });
  };

  const modal = showActivate ? (
    <ActivatePlanView onClose={() => setShowActivate(false)} onActivated={() => { resetPaywallCache(); window.location.reload(); }} />
  ) : null;

  return { guard, modal, isFree, openActivate: () => setShowActivate(true) };
}

export default function PaywallGate({ children, ctaLabel = 'Activa tu plan', reason, className = '' }: PaywallGateProps) {
  const { guard, modal, isFree } = usePaywall();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchIsFreeUser().finally(() => setChecking(false));
  }, []);

  if (checking || isFree === false) {
    return <>{children}{modal}</>;
  }

  // Usuario free: muestra el contenido bloqueado con overlay dorado
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none select-none opacity-40 blur-[1px]" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
          <Lock size={22} className="text-amber-500" />
        </div>
        <p className="text-sm text-gray-300 max-w-xs">
          {reason || 'Esta función requiere un plan activo.'}
        </p>
        <button
          onClick={(e) => guard(e, () => {})}
          className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold px-6 py-3 rounded-xl text-sm uppercase tracking-wide flex items-center gap-2 transition-all"
        >
          <Zap size={16} /> {ctaLabel}
        </button>
      </div>
      {modal}
    </div>
  );
}
