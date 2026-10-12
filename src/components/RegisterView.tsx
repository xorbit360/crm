import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle, Phone, Lock, CreditCard, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { getCachedWhiteLabel } from '../lib/whitelabel';

interface RegisterViewProps {
  initialReferral?: string;
  onRegisterSuccess: (user: { name: string; role: string; email: string; plan?: string; username?: string; phone?: string }) => void;
  onGoToLogin: () => void;
}

interface Plan {
  id: string; name: string; priceUsd: number; priceCop: number;
  conversations: number; aiMessages: number; tagline: string; featured?: boolean;
}

type Step = 'plan' | 'datos' | 'pago' | 'exito' | 'forgot' | 'reset';

const inputCls = "w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-amber-500 focus:outline-none transition-colors";
const labelCls = "text-xs font-bold text-gray-500 uppercase tracking-widest";

export default function RegisterView({ initialReferral = '', onRegisterSuccess, onGoToLogin }: RegisterViewProps) {
  const whiteLabel = getCachedWhiteLabel();
  const [step, setStep] = useState<Step>('plan');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral);

  const [orderId, setOrderId] = useState('');
  const [boldData, setBoldData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const pollRef = useRef<any>(null);

  // --- Cargar planes + manejar retornos de Bold y reset ---
  useEffect(() => {
    if (initialReferral) setReferralCode(initialReferral);
    fetch('/api/auth/plans').then(r => r.json()).then(d => {
      if (d?.success && Array.isArray(d.plans)) setPlans(d.plans);
    }).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token');
    const resetEmail = params.get('email');
    if (resetToken && resetEmail) {
      setEmail(resetEmail);
      sessionStorage.setItem('xorbit_reset_token', resetToken);
      setStep('reset');
      return;
    }
    if (params.get('mode') === 'forgot') {
      setStep('forgot');
      return;
    }
    const payStatus = params.get('payment_status');
    const order = params.get('order');
    if (payStatus === 'completed' && order) {
      setOrderId(order);
      checkOrderStatus(order);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Bold SDK ---
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
      const res = await fetch(`/api/auth/order-status?orderId=${encodeURIComponent(oid)}`);
      const data = await res.json();
      if (data?.success && data.approved) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (data.activated && data.user) {
          setStep('exito');
          setTimeout(() => {
            onRegisterSuccess({
              name: data.user.name, email: data.user.email, role: 'user',
              plan: data.user.plan, phone: '',
            });
          }, 2500);
        } else {
          setError('El pago fue aprobado. Si tu cuenta no se activa en un minuto, inicia sesión.');
        }
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

  // --- Registro ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedPlan) { setError('Selecciona un plan.'); return; }
    if (name.trim().length < 2) { setError('Ingresa tu nombre completo.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Ingresa un correo válido.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(),
          password, planId: selectedPlan.id, referralCode: referralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudo crear tu cuenta.');
      setOrderId(data.orderId);
      setBoldData(data.bold);
      setStep('pago');
    } catch (err: any) {
      setError(err.message || 'Error al registrar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // --- Pago Bold embebido ---
  const handlePay = async () => {
    setError('');
    if (!boldData) { setError('Falta la información del pago. Vuelve atrás e inténtalo de nuevo.'); return; }
    setPaying(true);
    try {
      const ok = await ensureBoldScript();
      if (!ok || typeof (window as any).BoldCheckout !== 'function') {
        throw new Error('No se pudo cargar el checkout de Bold. Revisa tu conexión e inténtalo de nuevo.');
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

  // --- Olvidé mi contraseña ---
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Ingresa un correo válido.'); return; }
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setError('');
      alert('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      onGoToLogin();
    } catch {
      setError('Error al solicitar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    const token = sessionStorage.getItem('xorbit_reset_token') || '';
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudo restablecer.');
      sessionStorage.removeItem('xorbit_reset_token');
      alert('Contraseña actualizada. Ya puedes iniciar sesión.');
      onGoToLogin();
    } catch (err: any) {
      setError(err.message || 'Error al restablecer.');
    } finally {
      setLoading(false);
    }
  };

  const brandName = whiteLabel.brandName || 'Xorbit 360';
  const fmtCop = (v: number) => '$' + v.toLocaleString('es-CO');

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-10 overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-amber-500/20 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            {whiteLabel.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-black/50 border border-amber-500/30 p-1" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-black text-lg">{brandName.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{brandName}</h2>
              <p className="text-[11px] text-amber-500 uppercase tracking-wider">
                {step === 'forgot' ? 'Recuperar contraseña' : step === 'reset' ? 'Nueva contraseña' : 'Crea tu cuenta y activa tu plan'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          {/* PASO 1: PLAN */}
          {step === 'plan' && (
            <div className="mt-6">
              <p className="text-gray-400 text-sm mb-4">Selecciona tu plan. El pago se hace aquí mismo, sin salir de la plataforma.</p>
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
              <button
                onClick={() => selectedPlan ? setStep('datos') : setError('Selecciona un plan para continuar.')}
                className="mt-6 w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
              >
                Continuar <ArrowRight size={16} />
              </button>
              <p className="mt-4 text-center text-xs text-gray-500">
                ¿Ya tienes cuenta? <button onClick={onGoToLogin} className="text-amber-500 font-bold hover:underline">Inicia sesión</button>
                {' · '}<button onClick={() => setStep('forgot')} className="text-gray-400 hover:underline">Olvidé mi contraseña</button>
              </p>
            </div>
          )}

          {/* PASO 2: DATOS */}
          {step === 'datos' && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-200 flex items-center justify-between">
                <span>Plan seleccionado: <b>{selectedPlan?.name}</b></span>
                <span className="font-extrabold">USD {selectedPlan?.priceUsd}</span>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Tu nombre" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tu@email.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} placeholder="+573000000000" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Código de referido <span className="normal-case font-normal">(opcional)</span></label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} disabled={!!initialReferral} className={inputCls} placeholder="Si alguien te invitó" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('plan')} className="px-4 py-3.5 rounded-xl border border-zinc-700 text-gray-300 text-sm font-bold hover:border-zinc-500 flex items-center gap-1">
                  <ArrowLeft size={16} />
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-50">
                  {loading ? <><Loader2 className="animate-spin" size={16} /> Creando cuenta...</> : <>Continuar al pago <ArrowRight size={16} /></>}
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: PAGO */}
          {step === 'pago' && (
            <div className="mt-6 text-center space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Plan</span><b className="text-white">{selectedPlan?.name}</b></div>
                <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">Total a pagar</span><b className="text-amber-500">{fmtCop(selectedPlan?.priceCop || 0)} COP</b></div>
                <div className="flex justify-between text-xs mt-1"><span className="text-gray-500">Orden</span><span className="text-gray-500 font-mono">{orderId}</span></div>
              </div>
              <CreditCard className="mx-auto text-amber-500" size={40} />
              <p className="text-gray-400 text-sm">Paga con tarjeta, PSE o Nequi sin salir de aquí.<br />Al aprobarse el pago tu cuenta se activa automáticamente.</p>
              <button onClick={handlePay} disabled={paying} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-50">
                {paying ? <><Loader2 className="animate-spin" size={16} /> Abriendo pago seguro...</> : <><Lock size={16} /> Pagar {fmtCop(selectedPlan?.priceCop || 0)}</>}
              </button>
              <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep('datos'); }} className="text-xs text-gray-500 hover:underline">Volver atrás</button>
              <p className="text-[11px] text-gray-600">Pago procesado de forma segura por Bold · No guardamos datos de tu tarjeta</p>
            </div>
          )}

          {/* ÉXITO */}
          {step === 'exito' && (
            <div className="mt-8 text-center space-y-4">
              <CheckCircle className="mx-auto text-green-500 w-16 h-16 animate-bounce" />
              <h2 className="text-2xl font-bold text-white">¡Pago aprobado!</h2>
              <p className="text-gray-400 text-sm">Tu cuenta está activa. Revisa tu correo: te enviamos la bienvenida desde <b className="text-amber-500">noreply@xorbit360.com</b>.</p>
              <p className="text-gray-500 text-xs">Entrando a tu panel...</p>
            </div>
          )}

          {/* OLVIDÉ CONTRASEÑA */}
          {step === 'forgot' && (
            <form onSubmit={handleForgot} className="mt-6 space-y-4">
              <p className="text-gray-400 text-sm">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña desde <b className="text-amber-500">noreply@xorbit360.com</b>.</p>
              <div className="space-y-2">
                <label className={labelCls}>Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tu@email.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} Enviar enlace
              </button>
              <p className="text-center"><button type="button" onClick={onGoToLogin} className="text-xs text-gray-500 hover:underline">Volver al inicio de sesión</button></p>
            </form>
          )}

          {/* NUEVA CONTRASEÑA */}
          {step === 'reset' && (
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <p className="text-gray-400 text-sm">Crea tu nueva contraseña para <b className="text-white">{email}</b>.</p>
              <div className="space-y-2">
                <label className={labelCls}>Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-black font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : null} Guardar nueva contraseña
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
