import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, CheckCircle, Lock, Loader2, AlertCircle, KeyRound, Eye } from 'lucide-react';
import { getCachedWhiteLabel } from '../lib/whitelabel';

interface RegisterViewProps {
  initialReferral?: string;
  onRegisterSuccess: (user: { name: string; role: string; email: string; plan?: string; username?: string; phone?: string }) => void;
  onGoToLogin: () => void;
}

type Step = 'datos' | 'exito' | 'forgot' | 'reset';

const inputCls = "w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-amber-500 focus:outline-none transition-colors";
const labelCls = "text-xs font-bold text-gray-500 uppercase tracking-widest";

/**
 * Registro 100% GRATUITO (modelo freemium).
 * El usuario crea su cuenta y entra directo en modo vista (plan Gratuito).
 * El pago solo aparece después, vía "Activar plan" dentro de la plataforma.
 */
export default function RegisterView({ initialReferral = '', onRegisterSuccess, onGoToLogin }: RegisterViewProps) {
  const whiteLabel = getCachedWhiteLabel();
  const [step, setStep] = useState<Step>('datos');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Manejar reset de contraseña por URL ---
  useEffect(() => {
    if (initialReferral) setReferralCode(initialReferral);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Registro gratuito ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Ingresa un correo válido.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password, referralCode: referralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'No se pudo crear tu cuenta.');
      setStep('exito');
      setTimeout(() => {
        onRegisterSuccess({
          name: data.user.name, email: data.user.email, role: data.user.role || 'user',
          plan: data.user.plan, username: data.user.username, phone: data.user.phone || '',
        });
      }, 2200);
    } catch (err: any) {
      setError(err.message || 'Error al registrar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
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
                {step === 'forgot' ? 'Recuperar contraseña' : step === 'reset' ? 'Nueva contraseña' : 'Crea tu cuenta gratis'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          {/* PASO: DATOS */}
          {step === 'datos' && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-200 flex items-center gap-2">
                <Eye size={16} className="shrink-0" />
                <span>Cuenta <b>gratuita</b>: explora todas las herramientas en modo vista. Sin tarjeta, sin compromiso.</span>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="tu@email.com" />
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

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-50">
                {loading ? <><Loader2 className="animate-spin" size={16} /> Creando tu cuenta...</> : <>Crear cuenta gratis <ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-gray-500">
                ¿Ya tienes cuenta? <button type="button" onClick={onGoToLogin} className="text-amber-500 font-bold hover:underline">Inicia sesión</button>
                {' · '}<button type="button" onClick={() => setStep('forgot')} className="text-gray-400 hover:underline">Olvidé mi contraseña</button>
              </p>
            </form>
          )}

          {/* ÉXITO */}
          {step === 'exito' && (
            <div className="mt-8 text-center space-y-4">
              <CheckCircle className="mx-auto text-green-500 w-16 h-16 animate-bounce" />
              <h2 className="text-2xl font-bold text-white">¡Cuenta creada!</h2>
              <p className="text-gray-400 text-sm">Bienvenido a <b className="text-amber-500">{brandName}</b>. Ya puedes explorar todas las herramientas en modo vista.</p>
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
