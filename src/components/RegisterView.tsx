import React, { useState, useEffect } from 'react';
import { Bot, User, Mail, ShieldCheck, ArrowRight, CheckCircle, Wallet, Phone, Send, Check } from 'lucide-react';
import { getCachedWhiteLabel } from '../lib/whitelabel';

interface RegisterViewProps {
  initialReferral?: string;
  onRegisterSuccess: (user: { name: string; role: string; email: string; plan?: string; username?: string; phone?: string }) => void;
  onGoToLogin: () => void;
}

export default function RegisterView({ initialReferral = '', onRegisterSuccess, onGoToLogin }: RegisterViewProps) {
  const whiteLabel = getCachedWhiteLabel();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [telegramWallet, setTelegramWallet] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [isRegistering, setIsRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [packages, setPackages] = useState<any[]>([]);
  const [superAdminWallet, setSuperAdminWallet] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  useEffect(() => {
    if (initialReferral) {
      setReferralCode(initialReferral);
    }
    
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => setPackages(data))
      .catch(err => console.error(err));

    fetch('/api/telegram-pay/config')
      .then(res => res.json())
      .then(data => {
        if (data.masterWallet) setSuperAdminWallet(data.masterWallet);
      })
      .catch(err => console.error(err));
  }, [initialReferral]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !whatsapp || !password) return;
    setStep(2);
  };

  const handleConfirmPayment = () => {
    setIsRegistering(true);
    
    // Guardar el wallet del patrocinador asociado al correo del usuario registrado
    if (referralCode) {
      localStorage.setItem(`sponsor_wallet_${email.toLowerCase().trim()}`, referralCode.trim());
    }

    // Simulate smart contract interaction and registration
    setTimeout(() => {
      setIsRegistering(false);
      setSuccess(true);
      
      // After success message, auto login
      setTimeout(() => {
        onRegisterSuccess({
          name,
          email,
          role: 'droshipper', // New users are droshippers by default
          plan: selectedPlan?.title || 'Gratuito',
          username: username.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '') || name.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, ''),
          phone: whatsapp.replace(/\D/g, '') || '573192392853'
        });
      }, 2000);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md panel p-8 rounded-2xl relative overflow-hidden group text-center space-y-4">
           <CheckCircle className="mx-auto text-green-500 w-16 h-16 mb-4 animate-bounce" />
           <h2 className="text-3xl font-display text-white">¡Registro Exitoso!</h2>
           <p className="text-gray-400">Contrato inteligente vinculado a tu wallet de Telegram con éxito. Redirigiendo a tu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-12 overflow-y-auto">
      <div className="w-full max-w-xl panel p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          
          {step === 1 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                {whiteLabel.logoUrl ? (
                  <img 
                    src={whiteLabel.logoUrl} 
                    alt="Logo" 
                    className="w-10 h-10 rounded-lg object-contain bg-black/50 border border-gold/30 p-1 shadow-md shadow-gold/10" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center font-bold text-black font-display shadow-md shadow-gold/20 text-lg">
                    {whiteLabel.brandName ? whiteLabel.brandName.charAt(0).toUpperCase() : 'E'}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-display text-white leading-tight">
                    {whiteLabel.brandName || 'Expert 360°'}
                  </h2>
                  <p className="text-[11px] text-gold uppercase tracking-wider">Unirse a la Red de Afiliados</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6">Regístrate y comienza a activar tus herramientas y comisiones automáticas.</p>

              <form onSubmit={handleNextStep} className="space-y-4">
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block flex justify-between">
                    <span>Código de Referido (Patrocinador)</span>
                    {initialReferral && (
                      <span className="text-[10px] text-yellow-400 font-mono normal-case font-bold animate-pulse">
                        ¡ENLAZADO EN AUTOMÁTICO!
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <ShieldCheck className={`absolute left-3 top-1/2 -translate-y-1/2 ${initialReferral ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`} size={18} />
                    <input 
                      type="text" 
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      disabled={!!initialReferral}
                      className={`w-full bg-black border rounded-lg pl-10 pr-4 py-3 text-sm font-mono transition-all ${initialReferral ? 'border-yellow-500/40 text-gold bg-yellow-950/5 cursor-not-allowed' : 'border-gray-800 text-gold focus:border-gold focus:outline-none'}`}
                      placeholder="Ej. UQCL7H-UGIwxtwON..."
                    />
                  </div>
                  {initialReferral && (
                    <p className="text-[10px] text-yellow-400/80 leading-tight">
                      Has sido invitado en automático mediante el enlace de patrocinio de la plataforma. Tu cuenta se registrará bajo el patrocinador indicado y las compras de tu licencia se repartirán en automático on-chain en el Smart Contract.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                      placeholder="Tu nombre"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre de Usuario (Único)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                      placeholder="tu_usuario_unico"
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Número de WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="tel" 
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                      placeholder="+573000000000"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Crea una contraseña</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gold text-black hover:bg-yellow-400 font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-4 transition-all"
                >
                  Continuar a Selección de Plan <ArrowRight size={18} />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-800 text-center">
                <p className="text-sm text-gray-500">
                  ¿Ya tienes una cuenta? <br/>
                  <button onClick={onGoToLogin} className="text-gray-400 hover:text-white font-semibold mt-2 underline transition-colors">
                    Inicia Sesión
                  </button>
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white transition">
                  Volver
                </button>
                <h2 className="text-2xl font-display text-white">Selecciona tu Plan</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedPlan(pkg)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPlan?.title === pkg.title ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10' : 'border-gray-800 bg-[#0d0d0d] hover:border-gray-600'}`}
                  >
                    <h3 className="text-lg font-bold text-white mb-1">{pkg.title}</h3>
                    <p className="text-2xl font-display text-gold mb-3">${pkg.price} <span className="text-sm text-gray-500">USD</span></p>
                    <ul className="space-y-2 text-xs text-gray-400">
                      {pkg.features.map((f: string, j: number) => (
                        <li key={j} className="flex items-start gap-1">
                          <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {selectedPlan && (
                <div className="mt-6 p-6 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-4 animate-fade-in text-center">
                  <h4 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    <ShieldCheck className="text-blue-400" /> Pago de Activación
                  </h4>
                  <p className="text-sm text-gray-400">
                    Para activar la cuenta con el plan <strong>{selectedPlan.title}</strong>, transfiere <strong>${selectedPlan.price} USDT (Red TON)</strong> a la siguiente wallet maestra (SuperAdmin):
                  </p>
                  <div className="bg-black border border-gray-800 p-3 rounded-lg flex items-center justify-center break-all">
                    <code className="text-gold font-mono text-sm select-all">{superAdminWallet || 'Cargando...'}</code>
                  </div>
                  <button 
                    onClick={handleConfirmPayment}
                    disabled={isRegistering}
                    className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${isRegistering ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isRegistering ? 'Procesando...' : <>Confirmar Pago y Activar <Send size={18} /></>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

