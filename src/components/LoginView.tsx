import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldAlert, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { getCachedWhiteLabel } from '../lib/whitelabel';

interface LoginViewProps {
  onLogin: (user: { name: string; role: string; email: string; username?: string; phone?: string; plan?: string }) => void;
  onGoToRegister: () => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const whiteLabel = getCachedWhiteLabel();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requirePayment, setRequirePayment] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRequirePayment(false);

    const normUser = username.trim();
    const pass = password.trim();

    if (!normUser || !pass) {
      setError('Por favor ingresa tu usuario/correo y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normUser, password: pass })
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        localStorage.setItem('xorbit_user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error || 'Acceso denegado. Credenciales inválidas o cuenta no activa.');
        if (data.requirePayment || res.status === 403) {
          setRequirePayment(true);
        }
      }
    } catch (err: any) {
      // Fallback local check for master account
      const lower = normUser.toLowerCase();
      if ((lower === 'admin' || lower === 'oscar@expert360.ai') && pass === 'Colombia1') {
        const adminUser = {
          name: 'Oscar Molina',
          email: 'oscar@expert360.ai',
          role: 'superadmin',
          username: 'admin',
          phone: '573192392853',
          plan: 'SuperAdmin Master'
        };
        localStorage.setItem('xorbit_user', JSON.stringify(adminUser));
        onLogin(adminUser);
      } else {
        setError('Error al verificar credenciales con el servidor. Si aún no tienes acceso activo, ingresa a xorbit360.com');
        setRequirePayment(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setRequirePayment(false);

    const googleEmail = window.prompt('Ingresa el correo electrónico de tu cuenta de Google para verificar tu acceso activo:');
    if (!googleEmail || !googleEmail.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        localStorage.setItem('xorbit_user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error || `La cuenta de Google (${googleEmail}) no tiene un paquete activo. Debes adquirir tu plan en xorbit360.com para ingresar.`);
        setRequirePayment(true);
      }
    } catch (err: any) {
      setError(`No se pudo verificar la cuenta (${googleEmail}). Debes adquirir tu plan en xorbit360.com.`);
      setRequirePayment(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md panel p-8 rounded-2xl relative overflow-hidden group border border-zinc-800 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center font-bold text-white font-display shadow-lg shadow-red-600/30 text-3xl">
              X
            </div>
          </div>
          
          <h2 className="text-2xl font-bold font-display text-white text-center mb-1 tracking-tight">Acceso Privado CRM</h2>
          <p className="text-gray-400 text-center mb-6 text-xs">
            Exclusivo para clientes con suscripción activa en <strong className="text-white">xorbit360.com</strong>
          </p>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-3 mb-5 text-xs shadow-md cursor-pointer disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Ingresar con Google (Verificación de Pago)
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">O con credenciales</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-950/60 border border-red-500/50 text-red-300 text-xs p-3.5 rounded-xl text-left space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
                
                {requirePayment && (
                  <div className="pt-2 border-t border-red-500/30">
                    <a
                      href="https://xorbit360.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all text-center no-underline"
                    >
                      <ShoppingBag size={14} /> Adquirir Plan en xorbit360.com
                    </a>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Correo o Usuario</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contraseña de Acceso</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 text-xs tracking-wide uppercase"
            >
              {isLoading ? (
                <span>Verificando Acceso...</span>
              ) : (
                <>
                  <span>Ingresar al CRM</span> <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center space-y-2">
            <p className="text-[11px] text-zinc-400">¿Aún no tienes acceso a la plataforma?</p>
            <a 
              href="https://xorbit360.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <CheckCircle2 size={13} /> Activar paquete de IA en xorbit360.com
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
