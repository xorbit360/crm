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
  CheckCircle2, ExternalLink, Link as LinkIcon,
  Settings,
  Plus
} from 'lucide-react';

interface PackageOption {
  id: string;
  name: string;
  type: 'conversations' | 'audio';
  tag: 'Texto' | 'Audio';
  price: number;
  conversations?: number;
  aiMessagesPerConv?: number;
  channelsIncluded?: number;
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
    channelsIncluded: 1,
  },
  {
    id: 'standard',
    name: 'Paquete Standard',
    type: 'conversations',
    tag: 'Texto',
    price: 33.00,
    conversations: 1000,
    aiMessagesPerConv: 40,
    channelsIncluded: 2,
  },
  {
    id: 'pro',
    name: 'Paquete Pro',
    type: 'conversations',
    tag: 'Texto',
    price: 69.00,
    conversations: 3000,
    aiMessagesPerConv: 50,
    channelsIncluded: 3,
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
    channelsIncluded: 5,
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

export function RecargasView() {
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
  const [additionalChannels, setAdditionalChannels] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'bold'>('bold');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [purchaseSuccessToast, setPurchaseSuccessToast] = useState<string | null>(null);

  // Sync to localStorage and notify other views
  const updateBalanceAndNotify = (newBalance: typeof balance) => {
    setBalance(newBalance);
    localStorage.setItem('app_ai_balance', JSON.stringify(newBalance));
    window.dispatchEvent(new Event('credits_updated'));
  };

  // El servidor es la fuente de verdad para recargas aprobadas y consumo real.
  useEffect(() => {
    let mounted = true;
    const loadBalance = async () => {
      try {
        const response = await fetch('/api/credits/balance', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (mounted && data?.balance) updateBalanceAndNotify(data.balance);
      } catch (_) {
        // Mantener el ultimo balance local si hay una interrupcion temporal.
      }
    };
    loadBalance();
    const timer = window.setInterval(loadBalance, 30000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

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

  const DEFAULT_BOLD_API_KEY = 'l_5Wz-8KQmld8Vb_iyy05KWBQ0A3zz5LOtagMmCjfbk';
  const DEFAULT_BOLD_SECRET_KEY = '53nBWst7REiVw9So1Zf5aQ';

  const boldGw = gatewayConfig?.gateways?.find((g: any) => g.id === 'bold');
  const boldMerchantId = (boldGw?.keys?.find((k: any) => k.keyName === 'merchant_id')?.value || '').replace('FFVSR3C7Y1', '').replace('sss', '').trim();
  const boldApiKey = (boldGw?.keys?.find((k: any) => k.keyName === 'bold_api_key')?.value || '').trim() || DEFAULT_BOLD_API_KEY;
  const boldSecretKey = (boldGw?.keys?.find((k: any) => k.keyName === 'bold_secret_key')?.value || '').trim() || DEFAULT_BOLD_SECRET_KEY;
  const rawUrl = (boldGw?.keys?.find((k: any) => k.keyName === 'bold_checkout_url')?.value || '').trim();
  // Filter out dummy/test inputs like 'sss' or 'FFVSR3C7Y1'
  const boldCheckoutUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) && !rawUrl.includes('FFVSR3C7Y1') ? rawUrl : '';

  // Real Payment Checkout state
  const [isGeneratingBoldCheckout, setIsGeneratingBoldCheckout] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');

  // Generates the official signed Bold checkout URL (returns HTTP 200, never 404)
  const generateBoldBtnUrl = (config: Record<string, string>): string => {
    const y = 'BoldPaymentButton';
    const E = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~=&';
    const f = (t: string, e: number) => {
      const n = E.indexOf(t);
      if (-1 === n) return t;
      return E[(n + e + 68) % 68];
    };
    const serialized = Object.keys(config)
      .map((e) => `${e.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}=${config[e]}`)
      .join('<bold>');
    let enc = '';
    for (let n = 0; n < serialized.length; n++) {
      const o = y.charCodeAt(n % 17);
      enc += f(serialized[n], o);
    }
    return `https://checkout.bold.co/btn?${encodeURIComponent(enc)}`;
  };

  // Ensure Bold Checkout script from checkout.bold.co is dynamically loaded if needed
  const ensureBoldCheckoutScript = (): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).BoldCheckout) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src*="boldPaymentButton.js"]');
      if (existing) {
        if ((window as any).BoldCheckout) return resolve(true);
        const onLoad = () => resolve(Boolean((window as any).BoldCheckout));
        existing.addEventListener('load', onLoad, { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        setTimeout(() => resolve(Boolean((window as any).BoldCheckout)), 8000);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
      script.async = true;
      script.onload = () => {
        // Algunas versiones del SDK exponen BoldCheckout unos milisegundos
        // después de cargar el script.
        const started = Date.now();
        const waitForSdk = () => {
          if ((window as any).BoldCheckout) return resolve(true);
          if (Date.now() - started > 8000) return resolve(false);
          window.setTimeout(waitForSdk, 100);
        };
        waitForSdk();
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const generateBoldSha256 = async (orderId: string, amount: string, currency: string, secretKey: string): Promise<string> => {
    // Official Bold Integrity Signature: orderId + amount + currency + secretKey
    const raw = `${orderId.trim()}${amount.trim()}${currency.trim()}${secretKey.trim()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSelectPackage = (pkg: PackageOption) => {
    setSelectedPackage(pkg);
  };

  // Automated Bold Approval Listener (URL redirect back from Bold)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const boldTxStatus = params.get('bold-tx-status') || params.get('status') || params.get('tx-status');
      const boldOrderId = params.get('bold-order-id') || params.get('order-id') || params.get('orderId');

      if (boldTxStatus && (boldTxStatus.toLowerCase() === 'approved' || boldTxStatus.toLowerCase() === 'successful')) {
        let pkg = selectedPackage;
        const pendingRaw = localStorage.getItem('XORBIT 360_PENDING_BOLD_ORDER');
        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            if (pending.pkg) pkg = pending.pkg;
          } catch (e) {}
        }

        if (pkg) {
          const newBal = {
            conversations: balance.conversations + (pkg.conversations || 0),
            aiMessagesPerConv: Math.max(balance.aiMessagesPerConv, pkg.aiMessagesPerConv || balance.aiMessagesPerConv),
            audioMinutes: balance.audioMinutes + (pkg.audioMinutes || 0),
            packagesBought: balance.packagesBought + 1,
          };
          updateBalanceAndNotify(newBal);

          const newTx: RechargeTransaction = {
            id: boldOrderId || `REC-BOLD-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            packageName: `${pkg.name} (Bold Oficial)`,
            type: pkg.type === 'conversations' ? 'Conversaciones Texto + IA' : 'Audio Voz IA',
            amount: pkg.price,
            creditsAdded: pkg.conversations ? `+${pkg.conversations.toLocaleString()} conversaciones` : `+${pkg.audioMinutes} mins audio`,
            status: 'Completado',
          };
          setTransactions(prev => [newTx, ...prev]);
          localStorage.removeItem('XORBIT 360_PENDING_BOLD_ORDER');

          setPurchaseSuccessToast(`¡Pago Aprobado por Bold! Se acreditaron tus créditos de ${pkg.name}.`);
          setTimeout(() => setPurchaseSuccessToast(null), 7000);

          // Clean URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      console.error("Error procesando retorno de Bold:", err);
    }
  }, []);

  // Automated Bold Approval Listener (postMessage from Bold embedded SDK)
  useEffect(() => {
    const handleBoldMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'BOLD_CHECKOUT_EVENT' && (data?.status === 'APPROVED' || data?.status === 'approved')) {
        let pkg = selectedPackage;
        const pendingRaw = localStorage.getItem('XORBIT 360_PENDING_BOLD_ORDER');
        if (pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            if (pending.pkg) pkg = pending.pkg;
          } catch (e) {}
        }

        if (pkg) {
          const newBal = {
            conversations: balance.conversations + (pkg.conversations || 0),
            aiMessagesPerConv: Math.max(balance.aiMessagesPerConv, pkg.aiMessagesPerConv || balance.aiMessagesPerConv),
            audioMinutes: balance.audioMinutes + (pkg.audioMinutes || 0),
            packagesBought: balance.packagesBought + 1,
          };
          updateBalanceAndNotify(newBal);

          const newTx: RechargeTransaction = {
            id: data.orderId || `REC-BOLD-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            packageName: `${pkg.name} (Bold Oficial)`,
            type: pkg.type === 'conversations' ? 'Conversaciones Texto + IA' : 'Audio Voz IA',
            amount: pkg.price,
            creditsAdded: pkg.conversations ? `+${pkg.conversations.toLocaleString()} conversaciones` : `+${pkg.audioMinutes} mins audio`,
            status: 'Completado',
          };
          setTransactions(prev => [newTx, ...prev]);
          localStorage.removeItem('XORBIT 360_PENDING_BOLD_ORDER');

          setPurchaseSuccessToast(`¡Pago Aprobado por Bold! Se acreditaron tus créditos.`);
          setTimeout(() => setPurchaseSuccessToast(null), 7000);
        }
      }
    };

    window.addEventListener('message', handleBoldMessage);
    return () => window.removeEventListener('message', handleBoldMessage);
  }, [selectedPackage, balance]);

  // Launch official Bold payment without modals or simulations
  const handleOpenRealBoldCheckout = async (pkgToUse?: PackageOption) => {
    const pkg = pkgToUse || selectedPackage;
    if (!pkg) return;

    const orderId = `REC-BOLD-${Date.now()}`;
    const totalUsd = pkg.price + additionalChannels * 3;
    setCurrentOrderId(orderId);
    setSelectedPackage(pkg);

    // Save pending order for automatic approval detection
    try {
      localStorage.setItem('XORBIT 360_PENDING_BOLD_ORDER', JSON.stringify({
        orderId,
        pkg,
        timestamp: Date.now()
      }));
    } catch (e) {}

    // 1. If custom Bold payment link is configured in settings, open directly
    if (boldCheckoutUrl && (boldCheckoutUrl.startsWith('http://') || boldCheckoutUrl.startsWith('https://'))) {
      window.open(boldCheckoutUrl, '_blank');
      setPurchaseSuccessToast(`Abriendo pasarela oficial de Bold para ${pkg.name}...`);
      setTimeout(() => setPurchaseSuccessToast(null), 4000);
      return;
    }

    // 2. Open official Bold Payments Gateway
    setIsGeneratingBoldCheckout(true);
    try {
      await ensureBoldCheckoutScript();

      const amountInCop = Math.round(totalUsd * 4000);
      const res = await fetch('/api/integrations/bold/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCop: amountInCop,
          amount: amountInCop,
          amountUsd: totalUsd,
          packageName: pkg.name,
          conversations: pkg.conversations,
          msgsPerConv: pkg.aiMessagesPerConv,
          description: `Recarga Xorbit 360 AI - ${pkg.name}`,
          currency: 'COP',
          orderId,
          packageId: pkg.id,
          originUrl: window.location.origin
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Bold no pudo generar el enlace de pago');
      }

      if (typeof (window as any).BoldCheckout === 'function' && data.apiKey && (data.integritySignature || data.signature)) {
        try {
          const boldCheckout = new (window as any).BoldCheckout({
            orderId: data.orderId || orderId,
            currency: data.currency || 'COP',
            amount: String(data.amount || amountInCop),
            apiKey: data.apiKey,
            integritySignature: data.integritySignature || data.signature,
            description: data.description || `Recarga Xorbit 360 AI - ${pkg.name}`,
            renderMode: 'embedded',
            redirectionUrl: `${window.location.origin}/#/recargas?payment_status=completed&order=${data.orderId || orderId}`
          });
          boldCheckout.open();
          return;
        } catch (e) {
          console.warn("BoldCheckout instantiation fallback:", e);
        }
      }

      // Si el SDK no está disponible, usar exactamente el enlace firmado que
      // generó el servidor. Esto evita reconstruirlo en el navegador con una
      // clave distinta o con parámetros incompletos.
      if (typeof data.checkoutUrl === 'string' && /^https:\/\/checkout\.bold\.co\//.test(data.checkoutUrl)) {
        // La URL /payment/{merchant} no es un checkout público de Bold
        // (devuelve BTN-000). Solo se utiliza el SDK oficial arriba.
        throw new Error('No se pudo cargar el checkout oficial de Bold. Recarga la página e inténtalo nuevamente.');
      }

      // Fallback local para versiones antiguas de la API.
      const btnUrl = generateBoldBtnUrl({
        orderId: data.orderId || orderId,
        currency: 'COP',
        amount: String(data.amount || amountInCop),
        apiKey: data.apiKey || 'l_5Wz-8KQmld8Vb_iyy05KWBQ0A3zz5LOtagMmCjfbk',
        integritySignature: data.integritySignature || data.signature,
        description: data.description || `Recarga Xorbit 360 AI - ${pkg.name}`,
        redirectionUrl: `${window.location.origin}/#/recargas?payment_status=completed&order=${data.orderId || orderId}`
      });
      window.location.href = btnUrl;
    } catch (err: any) {
      console.error("Error abriendo pasarela Bold:", err);
      alert("Error al conectar con la pasarela Bold: " + (err?.message || err));
    } finally {
      setIsGeneratingBoldCheckout(false);
    }
  };

  const isLowBalance = alertsEnabled && balance.conversations <= alertThreshold;

  return (
    <div className="space-y-6 w-full pb-16 animate-fade-in text-gray-100">

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

      {/* Current Balance Panel - Styled Emerald Card */}
      <div className="panel p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 text-black shadow-xl shadow-emerald-900/20 relative overflow-hidden border border-emerald-400/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-black text-black/70">Tu balance actual de recargas</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-black">
                  {balance.conversations.toLocaleString()}
                </span>
                <span className="text-base font-bold text-black/80">conversaciones disponibles</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2.5 rounded-xl bg-black/80 hover:bg-black text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <History size={15} className="text-gold" />
                Historial de Pagos
              </button>
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
                    <li className="flex items-center gap-2 text-cyan-300 font-medium">
                      <MessageSquare size={14} className="shrink-0 text-cyan-400" />
                      <span>{pkg.channelsIncluded} canal{pkg.channelsIncluded === 1 ? '' : 'es'} incluido{pkg.channelsIncluded === 1 ? '' : 's'}</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-400">
                      <Plus size={14} className="shrink-0 text-gray-500" />
                      <span>Canal adicional: $3 USD/mes</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPackage(pkg);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPackage(pkg);
                    }}
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
              {selectedPackage.channelsIncluded && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Canales incluidos:</span>
                  <span className="font-bold text-cyan-300">{selectedPackage.channelsIncluded}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-gray-400">Canales adicionales ($3 USD c/u):</span>
                <input type="number" min="0" max="50" value={additionalChannels} onChange={(e) => setAdditionalChannels(Math.max(0, Math.min(50, Number(e.target.value) || 0)))} className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-right text-white" />
              </div>
              {selectedPackage.audioMinutes && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Minutos de Audio:</span>
                  <span className="font-bold text-emerald-400">{selectedPackage.audioMinutes} min</span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-800/80 flex justify-between items-center text-sm">
                <span className="text-gray-400">Precio:</span>
                <span className="font-semibold text-gray-200">${(selectedPackage.price + additionalChannels * 3).toFixed(2)}</span>
              </div>

              <div className="pt-2 flex justify-between items-center text-lg font-black">
                <span className="text-white">TOTAL:</span>
                <span className="text-emerald-400 font-display text-2xl">${(selectedPackage.price + additionalChannels * 3).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Método de Pago
              </label>

              {/* Bold Payments Card */}
              <div
                className="p-4 rounded-2xl border border-red-500 bg-gradient-to-r from-red-950/40 via-gray-900 to-black shadow-xl shadow-red-500/10 ring-1 ring-red-500/30 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 text-lg shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Bold Payments Colombia</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PSE, Nequi, Tarjetas Visa, Mastercard, American Express
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-500 text-white flex items-center justify-center">
                    <Check size={12} className="stroke-[3]" />
                  </span>
                </div>
              </div>
            </div>

            {/* Action Checkout Button */}
            <button
              onClick={() => handleOpenRealBoldCheckout(selectedPackage)}
              disabled={isGeneratingBoldCheckout}
              className="w-full py-4 rounded-xl font-black text-base transition-all shadow-xl bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingBoldCheckout ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando Bold Payments...</span>
                </>
              ) : (
                <>
                  <span>PAGAR CON BOLD PAYMENTS (${selectedPackage.price.toFixed(2)} USD)</span>
                  <Zap size={18} />
                </>
              )}
            </button>

            <div className="pt-2 flex items-center justify-center text-xs text-gray-400">
              <span className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                <ShieldCheck size={14} className="text-emerald-500" />
                Pagos procesados y protegidos con la pasarela oficial de Bold (bold.co)
              </span>
            </div>
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

    </div>
  );
}

export default RecargasView;
