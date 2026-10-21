import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Loader2, AlertCircle, Lock, ArrowLeft, CheckCircle } from 'lucide-react';

interface Plan {
  id: string; name: string; priceUsd: number; priceCop: number;
  conversations: number; aiMessages: number; tagline: string; featured?: boolean;
}

interface ActivatePlanViewProps {
  onClose: () => void;
  onActivated: () => void;
}

/**
 * Activar plan (freemium): el usuario gratuito elige un plan pago y lo paga con Bold.
 * El descuento EFFIX2026 (20% OFF primer mes) se aplica AUTOMÁTICAMENTE solo a
 * usuarios de Feria Effix (referralCode === 'EFFIX2026'). No hay campo de cupón visible.
 * El canal ($10 USD/mes) se compra APARTE después de activar el plan.
 */
export default function ActivatePlanView({ onClose, onActivated }: ActivatePlanViewProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState<'planes' | 'pago' | 'exito'>('planes');
  const [orderId, setOrderId] = useState('');
  const [boldData, setBoldData] = useState<any>(null);
  const [couponInfo, setCouponInfo] = useState<{ code: string; discountPct: number; finalAmount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/auth/plans').then(r => r.json()).then(d => {
      if (d?.success && Array.isArray(d.plans)) setPlans(d.plans);
    }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Plan elegido en la web pública (botón del paquete): queda preseleccionado.
  useEffect(() => {
    if (!plans.length || selectedPlan) return;
    let intended = '';
    try { intended = sessionStorage.getItem('xorbit:intendedPlan') || ''; } catch (_) {}
    if (!intended) return;
    const match = plans.find((p) => p.id === intended);
    if (match) setSelectedPlan(match);
  }, [plans, selectedPlan]);

  const fmtCop = (v: number) => '$' + v.toLocaleString('es-CO');

  const ensureBoldScript = (): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).BoldCheckout) return Promise.resolve(true);
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="boldPaymentButton.js"]');
      if (existing) {
        const onL = () => resolve(Boolean((window as any).BoldCheckout));
        existing.addEventListener('load', onL, { once: true });
        setTimeout(() => resolve(Boolean((window as any).BoldCheckout)), 8000);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
      s.async = true;
      s.onload = () => {
        const t0 = Date.now();
        const wait = () => {
          if ((window as any).BoldCheckout) return resolve(true);
          if (Date.now() - t0 > 8000) return resolve(false);
          setTimeout(wait, 100);
        };
        wait();
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  };

  const checkOrderStatus = async (oid: string) => {
    try {
      const res = await fetch(`/api/billing/order-status?orderId=${encodeURIComponent(oid)}`);
      const data = await res.json();
      if (data?.success && data.approved) {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep('exito');
        setTimeout(onActivated, 2500);
        return true;
      }
    } catch {}
    return false;
  };

  const startPolling = (oid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const done = await checkOrderStatus(oid);
      if (done && pollRef.current) clearInterval(pollRef.current);
    }, 5000);
    setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current); }, 600000);
  };

  const handleCreateOrder = async () => {
    setError('');
    if (!selectedPlan) { setError('Selecciona un plan.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/billing/activate-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudo crear la orden.');
      setOrderId(data.orderId);
      setBoldData(data.bold);
      setCouponInfo(data.coupon);
      setStep('pago');
    } catch (err: any) {
      setError(err.message || 'Error al crear la orden.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setError('');
    if (!boldData) { setError('Falta la información del pago.'); return; }
    setPaying(true);
    try {
      const ok = await ensureBoldScript();
      if (!ok || typeof (window as any).BoldCheckout !== 'function') {
        throw new Error('No se pudo cargar el checkout de Bold. Revisa tu conexión.');
      }
      const bc = new (window as any).BoldCheckout({
        orderId: boldData.orderId,
        currency: boldData.currency || 'COP',
        amount: String(boldData.amount),
        apiKey: boldData.apiKey,
        integritySignature: boldData.integritySignature,
        description: boldData.description,
        renderMode: 'embedded',
        redirectionUrl: boldData.redirectionUrl,
      });
      bc.open();
      startPolling(boldData.orderId);
    } catch (err: any) {
      setError(err.message || 'Error al abrir el pago.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-amber-500/30 rounded-2xl p-6 sm:p-8 relative my-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white">Activa tu plan</h2>
          <p className="text-sm text-gray-400 mt-1">Desbloquea la conexión de canales, llamadas con IA y creación de videos.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          {step === 'planes' && (
            <div className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    className={`text-left rounded-xl border p-4 transition-all ${selectedPlan?.id === p.id ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{p.name}</span>
                      {p.featured && <span className="text-[10px] bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>}
                    </div>
                    <div className="mt-1 text-amber-500 font-extrabold text-xl">USD {p.priceUsd}<span className="text-xs text-gray-400 font-normal"> /mes</span></div>
                    <div className="text-xs text-gray-500">{fmtCop(p.priceCop)} COP aprox.</div>
                    <div className="mt-2 text-xs text-gray-400">{p.conversations.toLocaleString()} conversaciones · {p.aiMessages} msgs IA</div>
                    <div className="text-[11px] text-gray-500">{p.tagline}</div>
                  </button>
                ))}
              </div>
              {plans.length === 0 && <p className="text-gray-500 text-sm mt-4 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando planes...</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={onClose} className="px-4 py-3.5 rounded-xl border border-zinc-700 text-gray-300 text-sm font-bold hover:border-zinc-500 flex items-center gap-1">
                  <ArrowLeft size={16} />
                </button>
                <button onClick={handleCreateOrder} disabled={loading || !selectedPlan} className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-50">
                  {loading ? <><Loader2 className="animate-spin" size={16} /> Creando orden...</> : <>Continuar al pago</>}
                </button>
              </div>
              <p className="mt-3 text-[11px] text-gray-600 text-center">El canal de WhatsApp se compra aparte ($10 USD/mes) después de activar tu plan.</p>
            </div>
          )}

          {step === 'pago' && (
            <div className="mt-6 text-center space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Plan</span><b className="text-white">{selectedPlan?.name}</b></div>
                {couponInfo && (
                  <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">Descuento Feria Effix</span><b className="text-green-500">-{couponInfo.discountPct}%</b></div>
                )}
                <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">Total a pagar</span><b className="text-amber-500">{fmtCop(couponInfo?.finalAmount ?? selectedPlan?.priceCop ?? 0)} COP</b></div>
                <div className="flex justify-between text-xs mt-1"><span className="text-gray-500">Orden</span><span className="text-gray-500 font-mono">{orderId}</span></div>
              </div>
              <CreditCard className="mx-auto text-amber-500" size={40} />
              <p className="text-gray-400 text-sm">Paga con tarjeta, PSE o Nequi sin salir de aquí.<br />Al aprobarse el pago tu plan se activa automáticamente.</p>
              <button onClick={handlePay} disabled={paying} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-50">
                {paying ? <><Loader2 className="animate-spin" size={16} /> Abriendo pago seguro...</> : <><Lock size={16} /> Pagar {fmtCop(couponInfo?.finalAmount ?? selectedPlan?.priceCop ?? 0)}</>}
              </button>
              <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('planes'); }} className="text-xs text-gray-500 hover:underline">Volver atrás</button>
              <p className="text-[11px] text-gray-600">Pago procesado de forma segura por Bold · No guardamos datos de tu tarjeta</p>
            </div>
          )}

          {step === 'exito' && (
            <div className="mt-8 text-center space-y-4">
              <CheckCircle className="mx-auto text-green-500 w-16 h-16 animate-bounce" />
              <h2 className="text-2xl font-bold text-white">¡Plan activado!</h2>
              <p className="text-gray-400 text-sm">Ya puedes conectar tu primer canal de WhatsApp desde la sección <b className="text-amber-500">WhatsApp</b>.</p>
              <p className="text-gray-500 text-xs">Actualizando tu panel...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
