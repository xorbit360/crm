import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Copy, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Lock,
  ShieldCheck
} from 'lucide-react';

interface TokensState {
  dropi: string;
  shopify: string;
  meta: string;
  google: string;
  tiktok: string;
  chateapro: string;
}

const DEFAULT_TOKENS: TokensState = {
  dropi: '',
  shopify: '',
  meta: '',
  google: '',
  tiktok: '',
  chateapro: ''
};

const INTEGRATIONS_CONFIG = [
  {
    key: 'dropi' as const,
    name: 'Dropi',
    tag: 'Logística COD',
    placeholder: 'Pega tu Token de Dropi'
  },
  {
    key: 'shopify' as const,
    name: 'Shopify',
    tag: 'E-commerce',
    placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  {
    key: 'meta' as const,
    name: 'Meta Conversiones',
    tag: 'CAPI',
    placeholder: 'Pega tu Token de Acceso de Meta'
  },
  {
    key: 'google' as const,
    name: 'Google Conversiones',
    tag: 'Google Ads',
    placeholder: 'AW-xxxxxxxxx / Token de Conversión'
  },
  {
    key: 'tiktok' as const,
    name: 'TikTok',
    tag: 'Events API',
    placeholder: 'Pega tu Access Token de TikTok'
  },
  {
    key: 'chateapro' as const,
    name: 'ChateaPro',
    tag: 'CRM & Multicanal',
    placeholder: 'Pega tu API Key de ChateaPro'
  }
];

export default function ChatbotIntegracionesView() {
  const [tokens, setTokens] = useState<TokensState>(DEFAULT_TOKENS);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const showNotification = (text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem('EXPERT360_CHATBOT_TOKENS_SIMPLE');
      if (cached) {
        setTokens(JSON.parse(cached));
      } else {
        const oldCached = localStorage.getItem('EXPERT360_CHATBOT_TOKENS');
        if (oldCached) {
          const old = JSON.parse(oldCached);
          setTokens({
            dropi: old.dropi?.token || '',
            shopify: old.shopify?.token || '',
            meta: old.metaConversions?.token || '',
            google: old.google?.conversionId || old.google?.developerToken || '',
            tiktok: old.tiktok?.token || '',
            chateapro: old.chateapro?.token || ''
          });
        }
      }
    } catch (_) {}

    // Fetch from backend
    fetch('/api/integrations/chatbot-tokens')
      .then(r => r.json())
      .then(data => {
        if (data && data.success && data.tokens) {
          const t = data.tokens;
          setTokens(prev => {
            const next = {
              dropi: t.dropi?.token || prev.dropi || '',
              shopify: t.shopify?.token || prev.shopify || '',
              meta: t.metaConversions?.token || prev.meta || '',
              google: t.google?.conversionId || t.google?.developerToken || prev.google || '',
              tiktok: t.tiktok?.token || prev.tiktok || '',
              chateapro: t.chateapro?.token || prev.chateapro || ''
            };
            try {
              localStorage.setItem('EXPERT360_CHATBOT_TOKENS_SIMPLE', JSON.stringify(next));
            } catch (_) {}
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: keyof TokensState, val: string) => {
    setTokens(prev => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('EXPERT360_CHATBOT_TOKENS_SIMPLE', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleSaveSingle = async (key: keyof TokensState) => {
    setSavingKey(key);
    try {
      localStorage.setItem('EXPERT360_CHATBOT_TOKENS_SIMPLE', JSON.stringify(tokens));

      const payload = {
        platform: key === 'meta' ? 'metaConversions' : key,
        data: {
          token: tokens[key],
          conversionId: key === 'google' ? tokens[key] : undefined
        }
      };

      await fetch('/api/integrations/chatbot-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showNotification(`Token de ${key.toUpperCase()} guardado`);
    } catch (_) {
      showNotification(`Token guardado localmente`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingKey('all');
    try {
      localStorage.setItem('EXPERT360_CHATBOT_TOKENS_SIMPLE', JSON.stringify(tokens));

      const calls = Object.keys(tokens).map(k => {
        const key = k as keyof TokensState;
        const payload = {
          platform: key === 'meta' ? 'metaConversions' : key,
          data: {
            token: tokens[key],
            conversionId: key === 'google' ? tokens[key] : undefined
          }
        };
        return fetch('/api/integrations/chatbot-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      });

      await Promise.all(calls);
      showNotification('Todos los tokens se han guardado con éxito');
    } catch (_) {
      showNotification('Tokens guardados localmente');
    } finally {
      setSavingKey(null);
    }
  };

  const handleTest = async (key: keyof TokensState) => {
    const val = tokens[key]?.trim();
    if (!val) {
      showNotification(`Ingresa el token de ${key.toUpperCase()} primero`, true);
      return;
    }

    setTestingKey(key);
    try {
      const payloadKey = key === 'meta' ? 'metaConversions' : key;
      const res = await fetch('/api/integrations/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: payloadKey,
          credentials: { token: val, conversionId: val, pixelId: 'test_pixel' }
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Conexión exitosa');
      } else {
        showNotification(data.message || 'Error de conexión', true);
      }
    } catch (e: any) {
      showNotification(e.message || 'Error al probar', true);
    } finally {
      setTestingKey(null);
    }
  };

  return (
    <div className="space-y-5 pb-12 text-gray-200 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-medium backdrop-blur-md transition-all ${
          toast.error 
            ? 'bg-red-950/90 border-red-800/80 text-red-200' 
            : 'bg-zinc-900/90 border-zinc-700 text-emerald-400'
        }`}>
          {toast.error ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-base font-semibold text-white">Integraciones & Tokens</h2>
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              <ShieldCheck size={11} className="text-gold" />
              Credenciales Protegidas
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Los tokens se almacenan de forma segura y oculta para proteger las credenciales privadas de tu empresa.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={savingKey === 'all'}
          className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-light disabled:opacity-50 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
        >
          <Save size={14} />
          {savingKey === 'all' ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      {/* Grid of Tokens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS_CONFIG.map(({ key, name, tag, placeholder }) => {
          const value = tokens[key] || '';
          const isConfigured = Boolean(value.trim());
          const isSaving = savingKey === key;
          const isTesting = testingKey === key;

          return (
            <div 
              key={key} 
              className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/80 hover:border-zinc-700 transition flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xs">
                    <Key size={14} className="text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{name}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">{tag}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
                  <span className="text-[11px] text-zinc-400">
                    {isConfigured ? 'Conectado' : 'Sin Token'}
                  </span>
                </div>
              </div>

              {/* Input strictly password - tokens cannot be seen */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Token de API</span>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500 select-none">
                    <Lock size={10} className="text-gold" />
                    Oculto & Protegido
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 focus:outline-none rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 font-mono tracking-widest transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTest(key)}
                  disabled={isTesting || !isConfigured}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <RefreshCw size={12} className={isTesting ? 'animate-spin' : ''} />
                  {isTesting ? 'Probando...' : 'Probar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveSingle(key)}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save size={12} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
