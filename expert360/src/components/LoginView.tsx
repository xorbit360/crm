import React, { useState } from 'react';
import { Bot, Lock, User, ArrowRight } from 'lucide-react';
import { getCachedWhiteLabel } from '../lib/whitelabel';

interface LoginViewProps {
  onLogin: (user: { name: string; role: string; email: string; username?: string; phone?: string }) => void;
  onGoToRegister: () => void;
}

export default function LoginView({ onLogin, onGoToRegister }: LoginViewProps) {
  const whiteLabel = getCachedWhiteLabel();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normUser = username.trim().toLowerCase();

    // Hardcoded superadmin login
    if (false) {
      onLogin({
        name: 'Oscar Molina',
        email: 'admin@xorbit360.com',
        role: 'superadmin',
        username: 'admin',
        phone: '573192392853'
      });
    } else if (false) {
      onLogin({
        name: 'Jose',
        email: 'jose@email.com',
        role: 'droshipper',
        username: 'jose',
        phone: '573001234567'
      });
    } else if (normUser === 'jose' || normUser === 'jose@email.com') {
      setError('Contraseña incorrecta para el usuario jose.');
    } else if (username && password) {
      // Simulate normal user login for demo purposes
      onLogin({
        name: username,
        email: `${username}@email.com`,
        role: 'droshipper',
        username: username.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, ''),
        phone: '573192392853'
      });
    } else {
      setError('Por favor ingresa usuario y contraseña.');
    }
  };

  const handleGoogleLogin = () => {
    // Simulate Google Login
    onLogin({
      name: 'Usuario Google',
      email: 'usuario@gmail.com',
      role: 'droshipper',
      username: 'usuario',
      phone: '573192392853'
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md panel p-8 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-600 via-gold to-gold-400"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            {whiteLabel.logoUrl ? (
              <img
                src={whiteLabel.logoUrl}
                alt="Logo"
                className="w-16 h-16 rounded-xl object-contain bg-black/60 border border-gold/30 p-1 shadow-lg shadow-gold/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gold flex items-center justify-center font-bold text-black font-display shadow-lg shadow-gold/20 text-3xl">
                {whiteLabel.brandName ? whiteLabel.brandName.charAt(0).toUpperCase() : 'E'}
              </div>
            )}
          </div>

          <h2 className="text-3xl font-display text-white text-center mb-2">Bienvenido</h2>
          <p className="text-gray-400 text-center mb-8 text-sm">
            Ingresa a tu plataforma {whiteLabel.brandName || 'Xorbit 360'}
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-3 mb-6"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">O ingresa con tus datos</span>
            <div className="h-px bg-gray-800 flex-1"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-900/50 text-red-500 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                  placeholder="Tu usuario"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2 mt-4"
            >
              Ingresar al Dashboard <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
