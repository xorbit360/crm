import React, { useState, useEffect } from 'react';
import {
  Zap,
  CreditCard,
  Check,
  History,
  Sparkles,
  Bot,
  Volume2,
  ShieldCheck,
  MessageSquare,
  X,
  ArrowRight,
  Clock,
  Download,
  AlertCircle,
  TrendingUp,
  Cpu,
  CheckCircle2, ExternalLink
} from 'lucide-react';

interface PackageOption {
  id: string;
  name: string;
  type: 'conversations' | 'audio';
  tag: 'Texto' | 'Audio';
  price: number;
  conversations?: number;
  aiMessagesPerConv?: number;
  audioMinutes?: number;
  popular?: boolean;
}

const CONVERSATION_PACKAGES: PackageOption[] = [
  {
    id: 'starter',
    name: 'Paquete Starter',
    type: 'conversations',
    tag: 'Texto',
    price: 19.00,
    conversations: 500,
    aiMessagesPerConv: 25,
  },
  {
    id: 'standard',
    name: 'Paquete Standard',
    type: 'conversations',
    tag: 'Texto',
    price: 33.00,
    conversations: 1000,
    aiMessagesPerConv: 40,
  },
  {
    id: 'pro',
    name: 'Paquete Pro',
    type: 'conversations',
    tag: 'Texto',
    price: 69.00,
    conversations: 3000,
    aiMessagesPerConv: 50,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Paquete Enterprise',
    type: 'conversations',
    tag: 'Texto',
    price: 319.00,
    conversations: 20000,
    aiMessagesPerConv: 65,
  }
];

const AUDIO_PACKAGES: PackageOption[] = [
  {
    id: 'audio_standard',
    name: 'Paquete Standard',
    type: 'audio',
    tag: 'Audio',
    price: 10.00,
    audioMinutes: 30,
    conversations: 30,
  },
  {
    id: 'audio_pro',
    name: 'Paquete Pro Audio',
    type: 'audio',
    tag: 'Audio',
    price: 25.00,
    audioMinutes: 90,
    conversations: 90,
  }
];

interface RechargeTransaction {
  id: string;
  date: string;
  packageName: string;
  type: string;
  amount: number;
  creditsAdded: string;
  status: 'Completado' | 'Procesando';
}

export default function RecargasView() {
  // Load initial state from localStorage or default
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('app_ai_balance');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      conversations: 2500,
      aiMessagesPerConv: 40,
      audioMinutes: 15,
      packagesBought: 3,
    };
  });

  const [alertThreshold, setAlertThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('app_ai_alert_threshold');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_ai_alert_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(CONVERSATION_PACKAGES[2]); // Default to Pro
  const [paymentMethod, setPaymentMethod] = useState<'bold' | 'card' | 'link' | 'crypto' | 'pse'>('bold');
  const [showBoldCheckoutModal, setShowBoldCheckoutModal] = useState(false);
  const [boldSelectedType, setBoldSelectedType] = useState<'card' | 'pse' | 'nequi'>('pse');
  const [boldPseBank, setBoldPseBank] = useState('Bancolombia');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccessToast, setPurchaseSuccessToast] = useState<string | null>(null);

  // Sync to localStorage and notify other views
  const updateBalanceAndNotify = (newBalance: typeof balance) => {
    setBalance(newBalance);
    localStorage.setItem('app_ai_balance', JSON.stringify(newBalance));
    window.dispatchEvent(new Event('credits_updated'));
  };

  const updateThresholdAndNotify = (val: number) => {
    setAlertThreshold(val);
    localStorage.setItem('app_ai_alert_threshold', val.toString());
    window.dispatchEvent(new Event('credits_updated'));
  };

  const updateAlertsEnabledAndNotify = (enabled: boolean) => {
    setAlertsEnabled(enabled);
    localStorage.setItem('app_ai_alert_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('credits_updated'));
  };

  const [transactions, setTransactions] = useState<RechargeTransaction[]>([
    {
      id: 'REC-98231',
      date: '2026-07-20 14:32',
      packageName: 'Paquete Pro',
      type: 'Conversaciones Texto + IA',
      amount: 69.00,
      creditsAdded: '+3,000 conversaciones',
      status: 'Completado',
    },
    {
      id: 'REC-77120',
      date: '2026-06-15 09:15',
      packageName: 'Paquete Starter',
      type: 'Conversaciones Texto + IA',
      amount: 19.00,
      creditsAdded: '+500 conversaciones',
      status: 'Completado',
    },
    {
      id: 'REC-55410',
      date: '2026-05-02 18:40',
      packageName: 'Paquete Standard Audio',
      type: 'Audio Voz IA',
      amount: 10.00,
      creditsAdded: '+30 minutos de audio',
      status: 'Completado',
    }
  ]);

  // Load Company Payment Gateway Credentials from localStorage
  const [gatewayConfig, setGatewayConfig] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('XORBIT 360_PAYMENT_CONFIG');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    const reloadConfig = () => {
      try {
        const saved = localStorage.getItem('XORBIT 360_PAYMENT_CONFIG');
        if (saved) setGatewayConfig(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('payment-config-updated', reloadConfig);
    return () => window.removeEventListener('payment-config-updated', reloadConfig);
  }, []);

  const boldGw = gatewayConfig?.gateways?.find((g: any) => g.id === 'bold');
  const boldApiKey = boldGw?.keys?.find((k: any) => k.keyName === 'bold_api_key')?.value || 'x_live_bold_89210928412';
  const boldCheckoutUrl = boldGw?.keys?.find((k: any) => k.keyName === 'bold_checkout_url')?.value || 'https://checkout.bold.co/payment/LNK_XORBIT 360';

  const handleSelectPackage = (pkg: PackageOption) => {
    setSelectedPackage(pkg);
  };

  const handleProcessPayment = () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    setShowBoldCheckoutModal(false);

    setTimeout(() => {
      try {
        const newBal = {
          conversations: balance.conversations + (selectedPackage.conversations || 0),
          aiMessagesPerConv: Math.max(balance.aiMessagesPerConv, selectedPackage.aiMessagesPerConv || balance.aiMessagesPerConv),
          audioMinutes: balance.audioMinutes + (selectedPackage.audioMinutes || 0),
          packagesBought: balance.packagesBought + 1,
        };

        updateBalanceAndNotify(newBal);

        // Add to transactions
        const newTx: RechargeTransaction = {
          id: `REC-${Math.floor(10000 + Math.random() * 90000)}`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          packageName: selectedPackage.name,
          type: selectedPackage.type === 'conversations' ? 'Conversaciones Texto + IA' : 'Audio Voz IA',
          amount: selectedPackage.price,
          creditsAdded: selectedPackage.conversations ? `+${selectedPackage.conversations.toLocaleString()} conversaciones` : `+${selectedPackage.audioMinutes} mins audio`,
          status: 'Completado',
        };

        setTransactions(prev => [newTx, ...prev]);

        setPurchaseSuccessToast(`¡Recarga exitosa! Se han acreditado ${newTx.creditsAdded} a tu cuenta.`);
        setTimeout(() => setPurchaseSuccessToast(null), 5000);
      } catch (err) {
        console.error("Error procesando pago:", err);
      } finally {
        setIsProcessing(false);
      }
    }, 800);
  };

  const isLowBalance = alertsEnabled && balance.conversations <= alertThreshold;

  return (
    <div className="space-y-8 w-full pb-16 animate-fade-in text-gray-100">

      {/* Toast Notification */}
      {purchaseSuccessToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-black font-bold p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-emerald-300">
          <CheckCircle2 size={24} className="text-black" />
          <div>
            <p className="text-sm font-extrabold">{purchaseSuccessToast}</p>
            <p className="text-xs text-black/80 font-normal">Tus créditos de IA ya están listos para usarse.</p>
          </div>
        </div>
      )}

      {/* Main Header & IA Advantage Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap size={28} />
            </span>
            Recargar Créditos IA
          </h1>
          <p className="text-gray-400 text-sm mt-1.5 max-w-3xl">
            Tu saldo de mensajes e IA. Recarga créditos para que tu bot responda en automático sin necesidad de abrir cuentas ni conectar claves API externas (OpenAI, Gemini, Grok, Claude).
          </p>
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700/80 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <History size={16} className="text-gold" />
          Historial de Pagos
        </button>
      </div>

      {/* AI Zero-API Advantage Banner */}
      <div className="panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-gray-900/80 to-gray-900/90 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Cpu size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                IA Automatizada e Incluida
              </span>
              <span className="text-xs text-gray-400">Sin APIs externas</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              ¿No quieres lidiar con configuraciones de API externas?
            </h3>
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
              Con este sistema de créditos no necesitas ingresar tarjetas en OpenAI, Google, Anthropic ni xAI (Grok). La plataforma gestiona en automático las respuestas de la IA con la más alta velocidad y prioridad.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-[11px] font-semibold text-gray-300 border border-gray-800">
              GPT-4o
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-[11px] font-semibold text-gray-300 border border-gray-800">
              Gemini 1.5
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-[11px] font-semibold text-gray-300 border border-gray-800">
              Claude 3.5
            </span>
          </div>
        </div>
      </div>

      {/* Low Balance Warning Banner */}
      {isLowBalance && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-200 shadow-xl shadow-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
              <AlertCircle size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-black px-2 py-0.5 rounded bg-amber-500 text-black">
                  ¡Alerta de Saldo Bajo!
                </span>
                <span className="text-xs text-amber-300 font-semibold">
                  Límite configurado: {alertThreshold} conversaciones
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                Te quedan solo <span className="text-amber-400 text-base underline decoration-amber-500 font-extrabold">{balance.conversations} conversaciones</span> disponibles.
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Para evitar que tus bots de WhatsApp e IA interrumpan sus respuestas a clientes, recarga un paquete de conversaciones.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const el = document.getElementById('paquetes-seccion');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Zap size={16} />
            Recargar Ahora
          </button>
        </div>
      )}

      {/* Alert System Configuration & Simulation Panel */}
      <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sistema de Alertas de Saldo Bajo
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alertsEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}>
                  {alertsEnabled ? 'ALERTAS ACTIVAS' : 'ALERTAS DESACTIVADAS'}
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Notificación visual automática en el Dashboard cuando tus créditos estén por agotarse.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <label className="text-xs font-semibold text-gray-300">Alertas en Dashboard:</label>
            <button
              onClick={() => updateAlertsEnabledAndNotify(!alertsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alertsEnabled ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  alertsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Threshold selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
              Umbral Mínimo de Notificación ({alertThreshold} conversaciones)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={alertThreshold}
                onChange={(e) => updateThresholdAndNotify(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-800 text-emerald-400 border border-gray-700 shrink-0">
                {alertThreshold} conv.
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Se activará la alerta en el Dashboard si tu saldo es igual o menor a esta cantidad.
            </p>
          </div>

              {/* Quick Simulation controls for testing */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Probar Alerta en Tiempo Real
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateBalanceAndNotify({
                        ...balance,
                        conversations: 30, // Trigger low balance < threshold
                      });
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertCircle size={14} />
                    Ajustar Saldo Crítico (30 conv.)
                  </button>

              <button
                type="button"
                onClick={() => {
                  updateBalanceAndNotify({
                    ...balance,
                    conversations: 2500, // Reset to high balance
                  });
                }}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                Restablecer Saldo Normal (2,500)
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              Usa estos botones para verificar al instante cómo cambia el indicador en el Dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Current Balance Panel - Styled Emerald Card */}
      <div className="panel p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 text-black shadow-xl shadow-emerald-900/20 relative overflow-hidden border border-emerald-400/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-black text-black/70">Tu balance actual</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-black">
                  {balance.conversations.toLocaleString()}
                </span>
                <span className="text-base font-bold text-black/80">conversaciones disponibles</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-black/70 font-semibold">Último pago:</p>
              <p className="text-sm font-black text-black">
                {transactions.length > 0 ? `${transactions[0].packageName} ($${transactions[0].amount.toFixed(2)})` : 'Sin pagos recientes'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-black/10 backdrop-blur-sm border border-black/10">
              <p className="text-xs font-semibold text-black/70 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-black" />
                Mensajes IA por conversación:
              </p>
              <p className="text-xl font-extrabold text-black mt-1">{balance.aiMessagesPerConv}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/10 backdrop-blur-sm border border-black/10">
              <p className="text-xs font-semibold text-black/70 flex items-center gap-1.5">
                <Volume2 size={14} className="text-black" />
                Minutos de audio:
              </p>
              <p className="text-xl font-extrabold text-black mt-1">{balance.audioMinutes} min</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/10 backdrop-blur-sm border border-black/10">
              <p className="text-xs font-semibold text-black/70 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-black" />
                Total paquetes comprados:
              </p>
              <p className="text-xl font-extrabold text-black mt-1">{balance.packagesBought}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Paquetes de conversaciones */}
      <div id="paquetes-seccion" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-400" />
            Paquetes de conversaciónes
          </h2>
          <p className="text-sm text-gray-400">
            Selecciona un paquete para recargar tus mensajes de texto para WhatsApp y Chatbots IA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONVERSATION_PACKAGES.map((pkg) => {
            const isSelected = selectedPackage?.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className={`panel p-5 rounded-2xl transition-all cursor-pointer relative border flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-950/20 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/50'
                    : 'border-gray-800 hover:border-gray-700 bg-gray-900/60 hover:bg-gray-900'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black tracking-wider uppercase shadow-md">
                    Más Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-white text-base">{pkg.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                      {pkg.tag}
                    </span>
                  </div>

                  <div className="my-4">
                    <span className="text-3xl font-black text-white font-display">${pkg.price.toFixed(2)}</span>
                  </div>

                  <p className="text-xs font-semibold text-gray-300 mb-4 pb-3 border-b border-gray-800">
                    {pkg.conversations?.toLocaleString()} Conversaciones
                  </p>

                  <ul className="space-y-2.5 text-xs text-gray-300">
                    <li className="flex items-center gap-2 text-emerald-400 font-medium">
                      <Check size={14} className="shrink-0" />
                      <span>{pkg.conversations?.toLocaleString()} conversaciones</span>
                    </li>
                    <li className="flex items-center gap-2 text-emerald-300 font-medium">
                      <Zap size={14} className="shrink-0 text-emerald-400" />
                      <span>{pkg.aiMessagesPerConv} mensajes IA por conversación</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-400">
                      <Cpu size={14} className="shrink-0 text-gray-500" />
                      <span>Modelos OpenAI & Gemini incl.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-3">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Seleccionado' : 'Elegir Paquete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Paquetes de minutos de audio */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Volume2 size={20} className="text-emerald-400" />
            Paquetes de minutos de audio
          </h2>
          <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5 mt-1">
            <AlertCircle size={14} />
            Debes tener conversaciones disponibles antes de comprar paquetes de audio
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {AUDIO_PACKAGES.map((pkg) => {
            const isSelected = selectedPackage?.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className={`panel p-5 rounded-2xl transition-all cursor-pointer border flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-950/20 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/50'
                    : 'border-gray-800 hover:border-gray-700 bg-gray-900/60 hover:bg-gray-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-white text-base">{pkg.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-gray-800 text-gray-400 text-[11px] font-bold border border-gray-700">
                      {pkg.tag}
                    </span>
                  </div>

                  <div className="my-4">
                    <span className="text-3xl font-black text-white font-display">${pkg.price.toFixed(2)}</span>
                  </div>

                  <p className="text-xs font-semibold text-gray-300 mb-4 pb-3 border-b border-gray-800">
                    {pkg.audioMinutes} Minutos de Audios para tu Asistente
                  </p>

                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2 text-emerald-400 font-medium">
                      <Check size={14} />
                      <span>{pkg.conversations} conversaciones vinculadas</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-400">
                      <Volume2 size={14} className="text-gray-500" />
                      <span>Clonación de Voz & Síntesis Whisper</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-3">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Seleccionado' : 'Elegir Paquete Audio'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Resumen de compra & Payment */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
        <h2 className="text-xl font-bold font-display text-white border-b border-gray-800 pb-4 flex items-center gap-2">
          <CreditCard size={22} className="text-emerald-400" />
          Resumen de compra
        </h2>

        {selectedPackage ? (
          <div className="space-y-6">
            <div className="bg-gray-950/60 p-5 rounded-xl border border-gray-800 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Paquete:</span>
                <span className="font-bold text-white">{selectedPackage.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Tipo:</span>
                <span className="font-bold text-white">
                  {selectedPackage.type === 'conversations' ? 'Conversaciones' : 'Audio de Voz'}
                </span>
              </div>
              {selectedPackage.conversations && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Conversaciones:</span>
                  <span className="font-bold text-emerald-400">{selectedPackage.conversations.toLocaleString()}</span>
                </div>
              )}
              {selectedPackage.aiMessagesPerConv && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Mensajes IA por conversación:</span>
                  <span className="font-bold text-white">{selectedPackage.aiMessagesPerConv}</span>
                </div>
              )}
              {selectedPackage.audioMinutes && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Minutos de Audio:</span>
                  <span className="font-bold text-emerald-400">{selectedPackage.audioMinutes} min</span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-800/80 flex justify-between items-center text-sm">
                <span className="text-gray-400">Precio:</span>
                <span className="font-semibold text-gray-200">${selectedPackage.price.toFixed(2)}</span>
              </div>

              <div className="pt-2 flex justify-between items-center text-lg font-black">
                <span className="text-white">TOTAL:</span>
                <span className="text-emerald-400 font-display text-2xl">${selectedPackage.price.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                  Método de pago
                </label>
                <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                  ⚡ Pasarela Bold Activa
                </span>
              </div>

              {/* Bold Payments Highlight Banner */}
              <div
                onClick={() => setPaymentMethod('bold')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  paymentMethod === 'bold'
                    ? 'border-red-500 bg-gradient-to-r from-red-950/50 via-gray-900 to-black shadow-xl shadow-red-500/10 ring-2 ring-red-500/50'
                    : 'border-gray-800 bg-gray-900/60 hover:bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 text-lg shrink-0">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">Pasarela de Pago Bold</h4>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500 text-black">
                        OFICIAL & RECOMENDADO
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PSE, Tarjetas Crédito/Débito Visa, Mastercard, American Express & Nequi
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'bold' ? 'border-red-500 bg-red-500 text-black' : 'border-gray-600'
                  }`}>
                    {paymentMethod === 'bold' && <Check size={12} className="stroke-[3]" />}
                  </span>
                </div>
              </div>

              {/* Other Secondary Payment Method Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bold')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'bold'
                      ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                      : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  ⚡ Bold Payments
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5'
                      : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <CreditCard size={16} />
                  Otras Tarjetas
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('crypto')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'crypto'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5'
                      : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Sparkles size={16} />
                  Crypto / Binance
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('link')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'link'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5'
                      : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Zap size={16} />
                  Link Directo
                </button>
              </div>
            </div>

            {/* Action Checkout Button */}
            <button
              onClick={() => {
                if (paymentMethod === 'bold') {
                  setShowBoldCheckoutModal(true);
                } else {
                  handleProcessPayment();
                }
              }}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl font-black text-base transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                paymentMethod === 'bold'
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando recarga segura...</span>
                </>
              ) : paymentMethod === 'bold' ? (
                <>
                  <span>PAGAR CON BOLD PAYMENTS (${selectedPackage.price.toFixed(2)})</span>
                  <Zap size={18} />
                </>
              ) : (
                <>
                  <span>Proceder al pago</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-10 space-y-2">
            <CreditCard size={40} className="mx-auto text-gray-600" />
            <h3 className="font-bold text-gray-300 text-base">Selecciona un paquete</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              El resumen de tu compra aparecerá aquí cuando selecciones un paquete de conversaciones o minutos de audio.
            </p>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={20} className="text-emerald-400" />
                <h3 className="font-bold text-white text-lg">Historial de Recargas y Pagos</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">No tienes recargas registradas aún.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{tx.packageName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{tx.type} • {tx.date}</p>
                        <p className="text-xs font-semibold text-emerald-400 mt-1">{tx.creditsAdded}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-white font-display">${tx.amount.toFixed(2)}</span>
                        <button
                          onClick={() => alert(`Descargando factura para la transacción ${tx.id}`)}
                          className="block text-[10px] text-gray-400 hover:text-emerald-400 mt-1 flex items-center gap-1 justify-end ml-auto cursor-pointer"
                        >
                          <Download size={12} /> Factura
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT PASARELA BOLD PAYMENTS */}
      {showBoldCheckoutModal && selectedPackage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-gray-950 border-2 border-red-500/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            <div className="overflow-y-auto custom-scrollbar">

            {/* BOLD BRANDING HEADER */}
            <div className="bg-gradient-to-r from-red-950 via-gray-900 to-black p-5 border-b border-red-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-base tracking-tight">Bold Payments</h3>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      SSL 256-Bit
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Pasarela Oficial de Cobros & Recargas</p>
                </div>
              </div>

              <button
                onClick={() => setShowBoldCheckoutModal(false)}
                className="p-2 rounded-full bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* ORDER SUMMARY BANNER */}
            <div className="p-5 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block font-semibold">Producto a Recargar:</span>
                <span className="text-sm font-bold text-white">{selectedPackage.name}</span>
                <span className="text-xs text-emerald-400 block mt-0.5">
                  {selectedPackage.conversations ? `+${selectedPackage.conversations.toLocaleString()} Conversaciones` : `+${selectedPackage.audioMinutes} Mins Audio`}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-gray-400 block">Total a Pagar:</span>
                <span className="text-2xl font-black font-display text-red-400">
                  ${selectedPackage.price.toFixed(2)} USD
                </span>
                <span className="text-[10px] text-gray-500 block font-mono">
                  ~ ${(selectedPackage.price * 4000).toLocaleString()} COP
                </span>
              </div>
            </div>

            {/* PAYMENT METHOD TYPE TABS */}
            <div className="p-5 space-y-4">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Selecciona tu Método de Pago en Bold:
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBoldSelectedType('pse')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    boldSelectedType === 'pse'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                  }`}
                >
                  <ShieldCheck size={16} />
                  <span>PSE / Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoldSelectedType('card')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    boldSelectedType === 'card'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>Tarjetas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBoldSelectedType('nequi')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    boldSelectedType === 'nequi'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                  }`}
                >
                  <Zap size={16} />
                  <span>Nequi / QR</span>
                </button>
              </div>

              {/* DYNAMIC FORM PER TYPE */}
              {boldSelectedType === 'pse' && (
                <div className="space-y-3 bg-gray-900/60 p-4 rounded-2xl border border-gray-800 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Selecciona tu Banco (PSE Colombia):
                    </label>
                    <select
                      value={boldPseBank}
                      onChange={(e) => setBoldPseBank(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-red-500"
                    >
                      <option value="Bancolombia">Bancolombia</option>
                      <option value="Nequi">Nequi Directo</option>
                      <option value="Davivienda">Davivienda / Daviplata</option>
                      <option value="Banco de Bogotá">Banco de Bogotá</option>
                      <option value="BBVA Colombia">BBVA Colombia</option>
                      <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                      <option value="Lulo Bank">Lulo Bank</option>
                      <option value="Banco Itaú">Banco Itaú</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1">Tipo Documento:</label>
                      <select className="w-full bg-black border border-gray-800 rounded-xl px-2.5 py-2 text-white text-xs">
                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                        <option value="NIT">NIT Empresa</option>
                        <option value="CE">Cédula Extranjería (CE)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1">Número Documento:</label>
                      <input
                        type="text"
                        placeholder="Número de Cédula o NIT"
                        className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {boldSelectedType === 'card' && (
                <div className="space-y-3 bg-gray-900/60 p-4 rounded-2xl border border-gray-800 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">Número de Tarjeta:</label>
                    <input
                      type="text"
                      placeholder="4532 •••• •••• 8812"
                      className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">Fecha Expira:</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-300 mb-1">CVC / CVV:</label>
                      <input
                        type="password"
                        placeholder="•••"
                        className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {boldSelectedType === 'nequi' && (
                <div className="space-y-3 bg-gray-900/60 p-4 rounded-2xl border border-gray-800 animate-fade-in text-center">
                  <p className="text-xs text-gray-300">Ingresa tu número de celular Nequi para autorizar la notificación:</p>
                  <input
                    type="text"
                    placeholder="Número de celular Nequi (ej: 300 000 0000)"
                    className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono font-bold text-center focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-gray-500 block">Recibirás un push de notificación en la app de Nequi.</span>
                </div>
              )}

              {/* CREDENTIALS BADGE */}
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <div>
                    <span className="text-gray-300 font-bold block">Pasarela Bold Conectada:</span>
                    <span className="text-[10px] text-gray-400 font-mono">API Key: {boldApiKey ? `${boldApiKey.substring(0, 14)}...` : 'No configurada'}</span>
                  </div>
                </div>
                <span className="text-[10px] text-red-400 font-extrabold uppercase px-2 py-1 bg-black rounded-lg border border-red-500/20">
                  Modo Producción
                </span>
              </div>

              {/* ACTION CONFIRMATION BUTTONS */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    setShowBoldCheckoutModal(false);
                    handleProcessPayment();
                  }}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-black text-xs transition-all shadow-xl shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap size={16} />
                  <span>PROCESAR PAGO REAL (${selectedPackage.price.toFixed(2)} USD)</span>
                </button>

                {boldCheckoutUrl && (
                  <button
                    onClick={() => {
                      const urlWithParams = boldCheckoutUrl.includes('?')
                        ? `${boldCheckoutUrl}&amount=${selectedPackage.price}&reference=REC-${Date.now()}`
                        : `${boldCheckoutUrl}?amount=${selectedPackage.price}&reference=REC-${Date.now()}`;
                      window.open(urlWithParams, '_blank');
                    }}
                    className="w-full py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-gray-200 font-bold text-xs border border-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink size={14} className="text-red-400" />
                    <span>Abrir Checkout Oficial en Bold.co (Nueva Pestaña)</span>
                  </button>
                )}
              </div>

              <p className="text-[10px] text-center text-gray-500 flex items-center justify-center gap-1 pt-1">
                <ShieldCheck size={12} className="text-red-400" /> Transacción encriptada y procesada directamente con las credenciales de tu empresa en Bold Co.
              </p>
            </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
