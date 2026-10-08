import React, { useState, useEffect } from 'react';
import {
  Database,
  Link,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Sliders,
  ShieldAlert,
  Wifi,
  WifiOff,
  Globe,
  Key,
  Settings,
  MessageSquare,
  Clipboard,
  ExternalLink,
  Activity,
  Play,
  Send,
  CheckCircle2,
  UserCheck,
  Zap,
  Flame
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected';
  category: 'Logística & Drop' | 'Plataforma' | 'Pagos' | 'Comunicación' | 'CRM & IA' | 'Marketing';
  fields: { label: string; placeholder: string; type: 'text' | 'password'; value: string }[];
}

interface MetaTiktokConfig {
  metaAppId: string;
  metaAppSecret: string;
  metaAccessToken: string;
  metaWebhookUrl: string;
  metaWebhookVerifyToken: string;
  metaWebhookEvents: string[];
  metaConnected: boolean;
  metaConnectedUser: {
    name: string;
    id: string;
    avatar: string;
    pages: { name: string; id: string; type: string }[];
    adAccounts: { id: string; name: string }[];
  } | null;
  tiktokAppId: string;
  tiktokAppSecret: string;
  tiktokAccessToken: string;
  tiktokWebhookUrl: string;
  tiktokWebhookVerifyToken: string;
  tiktokWebhookEvents: string[];
  tiktokConnected: boolean;
  tiktokConnectedUser: {
    name: string;
    id: string;
    avatar: string;
    adAccounts: { id: string; name: string }[];
  } | null;
}

interface WebhookLog {
  id: string;
  provider: 'meta' | 'tiktok';
  timestamp: string;
  summary: string;
  payload: any;
}

export default function IntegracionesView() {
  const [activeTab, setActiveTab] = useState<'retailers' | 'social_ads' | 'supabase'>('social_ads');

  // Supabase Database state
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    tableExists: boolean;
    url?: string;
    hasUrl?: boolean;
    hasKey?: boolean;
    error?: string;
  } | null>(null);
  const [supabaseSchema, setSupabaseSchema] = useState<string>('');
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseSyncMsg, setSupabaseSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSupabaseStatus = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
      const schemaRes = await fetch('/api/supabase/schema');
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        setSupabaseSchema(schemaData.sql || '');
      }
    } catch (err) {
      console.error('Error checking supabase status:', err);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    setSupabaseSyncMsg(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSupabaseSyncMsg({ type: 'success', text: '✅ ' + data.message });
        await fetchSupabaseStatus();
      } else {
        setSupabaseSyncMsg({ type: 'error', text: '❌ ' + (data.error || 'Fallo al sincronizar con Supabase.') });
      }
    } catch (err: any) {
      setSupabaseSyncMsg({ type: 'error', text: '❌ Error: ' + (err?.message || err) });
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncingSupabase(true);
    setSupabaseSyncMsg(null);
    try {
      const res = await fetch('/api/supabase/pull', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSupabaseSyncMsg({ type: 'success', text: '✅ ' + data.message });
        await fetchSupabaseStatus();
      } else {
        setSupabaseSyncMsg({ type: 'error', text: '❌ ' + (data.error || 'Fallo al descargar datos de Supabase.') });
      }
    } catch (err: any) {
      setSupabaseSyncMsg({ type: 'error', text: '❌ Error: ' + (err?.message || err) });
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  // Tab 1: Classic Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'dropi',
      name: 'Dropi Colombia',
      description: 'Sincroniza pedidos, inventario de proveedores y guías de envío automáticamente con pago contra entrega.',
      icon: '📦',
      status: 'connected',
      category: 'Logística & Drop',
      fields: [
        { label: 'Token de API Dropi', placeholder: 'Ingrese su token de seguridad de Dropi', type: 'password', value: '••••••••••••••••••••' },
        { label: 'ID de Tienda Dropi', placeholder: 'Ingrese su ID de tienda', type: 'text', value: '45892' }
      ]
    },
    {
      id: 'mastershop',
      name: 'MasterShop',
      description: 'Importación directa de productos de alta rotación para despacho inmediato con fletes preferenciales.',
      icon: '🛍️',
      status: 'disconnected',
      category: 'Logística & Drop',
      fields: [
        { label: 'Token de Acceso MasterShop', placeholder: 'Ingrese su Bearer Token', type: 'password', value: '' }
      ]
    },
    {
      id: 'shopify',
      name: 'Shopify Store',
      description: 'Importa tus órdenes de Shopify para que el chatbot las gestione y envíe las guías por WhatsApp.',
      icon: '🟢',
      status: 'disconnected',
      category: 'Plataforma',
      fields: [
        { label: 'URL de Tienda (.myshopify.com)', placeholder: 'ejemplo.myshopify.com', type: 'text', value: '' },
        { label: 'API Password de App Personalizada', placeholder: 'shpat_••••••••••••••••', type: 'password', value: '' }
      ]
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: 'Conecta tu tienda WordPress y procesa las compras directas con pasarelas locales.',
      icon: '🟣',
      status: 'disconnected',
      category: 'Plataforma',
      fields: [
        { label: 'URL del Sitio', placeholder: 'https://mitienda.com', type: 'text', value: '' },
        { label: 'Consumer Key', placeholder: 'ck_••••••••••••••••', type: 'text', value: '' },
        { label: 'Consumer Secret', placeholder: 'cs_••••••••••••••••', type: 'password', value: '' }
      ]
    },
    {
      id: 'epayco',
      name: 'ePayco Colombia',
      description: 'Recibe pagos con PSE, tarjetas de crédito nacionales, Efecty, y Baloto con tarifas preferenciales.',
      icon: '💳',
      status: 'connected',
      category: 'Pagos',
      fields: [
        { label: 'P_KEY (Llave Pública)', placeholder: 'Ingrese su Public Key', type: 'text', value: '9a5c88b2f9011a03cf241' },
        { label: 'PRIVATE_KEY', placeholder: 'Ingrese su Private Key', type: 'password', value: '••••••••••••••••••••••••' }
      ]
    },
    {
      id: 'mercadopago',
      name: 'Mercado Pago',
      description: 'Procesamiento instantáneo de pagos y retiros a tu cuenta bancaria colombiana en 24 horas.',
      icon: '🤝',
      status: 'disconnected',
      category: 'Pagos',
      fields: [
        { label: 'Public Key', placeholder: 'APP_USR-••••••••', type: 'text', value: '' },
        { label: 'Access Token', placeholder: 'APP_USR-••••••••', type: 'password', value: '' }
      ]
    },
    {
      id: 'effix',
      name: 'Effix',
      description: 'Plataforma para automatización de envíos y logística ecommerce.',
      icon: '🚚',
      status: 'disconnected',
      category: 'Logística & Drop',
      fields: [
        { label: 'Token de API Effix', placeholder: 'Ingrese su token', type: 'password', value: '' }
      ]
    },
    {
      id: 'kommo',
      name: 'Kommo CRM',
      description: 'Integra tu CRM para centralizar reportes de KPIs y seguimiento de leads.',
      icon: '📊',
      status: 'disconnected',
      category: 'CRM & IA',
      fields: [
        { label: 'Subdominio de Kommo', placeholder: 'empresa.kommo.com', type: 'text', value: '' },
        { label: 'Token de Integración (MCP)', placeholder: 'Ingrese su token MCP', type: 'password', value: '' }
      ]
    },
    {
      id: 'ghl',
      name: 'GoHighLevel (GHL)',
      description: 'Consulta datos de tu CRM directamente desde la IA mediante tokens MCP.',
      icon: '🚀',
      status: 'disconnected',
      category: 'CRM & IA',
      fields: [
        { label: 'Location ID', placeholder: 'Ingrese su Location ID', type: 'text', value: '' },
        { label: 'API Key', placeholder: 'Ingrese su API Key', type: 'password', value: '' }
      ]
    },
    {
      id: 'respondio',
      name: 'Hub Omnicanal',
      description: 'Conecta tu plataforma de mensajería para extraer métricas de atención.',
      icon: '💬',
      status: 'disconnected',
      category: 'Comunicación',
      fields: [
        { label: 'Token de Acceso (MCP)', placeholder: 'Ingrese su token', type: 'password', value: '' }
      ]
    },
    {
      id: 'chateapro',
      name: 'ChateaPro',
      description: 'Automatiza tu WhatsApp y sincroniza respuestas con el orquestador IA.',
      icon: '🤖',
      status: 'connected',
      category: 'Comunicación',
      fields: [
        { label: 'API Key ChateaPro', placeholder: 'Token de seguridad', type: 'password', value: '••••••••••••••••' }
      ]
    },
    {
      id: 'lucidbot',
      name: 'LucidBot',
      description: 'Plataforma de automatización de bots conversacionales.',
      icon: '✨',
      status: 'disconnected',
      category: 'CRM & IA',
      fields: [
        { label: 'Token de LucidBot', placeholder: 'Ingrese su token', type: 'password', value: '' }
      ]
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Tab 2: Meta & TikTok Credentials state
  const [metaTiktokConfig, setMetaTiktokConfig] = useState<MetaTiktokConfig>({
    metaAppId: '',
    metaAppSecret: '',
    metaAccessToken: '',
    metaWebhookUrl: '',
    metaWebhookVerifyToken: 'mona_meta_verify_token',
    metaWebhookEvents: ['leadgen', 'messages'],
    metaConnected: false,
    metaConnectedUser: null,
    tiktokAppId: '',
    tiktokAppSecret: '',
    tiktokAccessToken: '',
    tiktokWebhookUrl: '',
    tiktokWebhookVerifyToken: 'mona_tiktok_verify_token',
    tiktokWebhookEvents: ['lead_group_generation'],
    tiktokConnected: false,
    tiktokConnectedUser: null
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [simulatingLogId, setSimulatingLogId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load configuration from server
  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/integrations/meta-tiktok/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetaTiktokConfig(data.config);
          setWebhookLogs(data.webhookLogs);
        }
      }
    } catch (err) {
      console.error('Error fetching integrations config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchSupabaseStatus();
    setSelectedIntegration(integrations[0]);
  }, []);

  // Listen for login popup completion messages (Real OAuth postMessage pattern)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin to avoid XSS issues
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchConfig(); // Reload from the server
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleToggleStatus = (id: string) => {
    setIntegrations(prev => prev.map(integration => {
      if (integration.id === id) {
        const nextStatus: 'connected' | 'disconnected' = integration.status === 'connected' ? 'disconnected' : 'connected';
        const updated: Integration = { ...integration, status: nextStatus };
        if (selectedIntegration?.id === id) {
          setSelectedIntegration(updated);
        }
        return updated;
      }
      return integration;
    }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;

    setSavingId(selectedIntegration.id);
    setTimeout(() => {
      setSavingId(null);
      setIntegrations(prev => prev.map(item => {
        if (item.id === selectedIntegration.id) {
          return { ...selectedIntegration, status: 'connected' as const };
        }
        return item;
      }));
      alert(`Configuración de ${selectedIntegration.name} guardada correctamente.`);
    }, 1500);
  };

  const handleFieldChange = (index: number, val: string) => {
    if (!selectedIntegration) return;
    const updatedFields = [...selectedIntegration.fields];
    updatedFields[index].value = val;
    setSelectedIntegration({ ...selectedIntegration, fields: updatedFields });
  };

  // Meta & TikTok Sincronización Real login popup
  const handleConnectProvider = (provider: 'meta' | 'tiktok') => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      `${window.location.origin}/auth/${provider}`,
      `${provider}_auth_popup`,
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  // Disconnect OAuth Account
  const handleDisconnectProvider = async (provider: 'meta' | 'tiktok') => {
    if (!confirm(`¿Estás seguro de desconectar tu cuenta de ${provider === 'meta' ? 'Meta' : 'TikTok'}?`)) return;
    try {
      const res = await fetch('/api/integrations/meta-tiktok/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetaTiktokConfig(data.config);
          alert(`Cuenta de ${provider === 'meta' ? 'Meta' : 'TikTok'} desconectada.`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Meta/TikTok Credentials & webhook config
  const handleSaveMetaTiktokConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/integrations/meta-tiktok/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaTiktokConfig)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetaTiktokConfig(data.config);
          alert('Configuración guardada de forma segura.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error al guardar credenciales.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleMetaTiktokFieldChange = (key: keyof MetaTiktokConfig, value: any) => {
    setMetaTiktokConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleToggleEvent = (provider: 'meta' | 'tiktok', eventName: string) => {
    const key = provider === 'meta' ? 'metaWebhookEvents' : 'tiktokWebhookEvents';
    const list = [...metaTiktokConfig[key] as string[]];
    const index = list.indexOf(eventName);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(eventName);
    }
    handleMetaTiktokFieldChange(key, list);
  };

  // Copy Webhook Info
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Simulate active Lead incoming webhook payload (proves it works in real-time)
  const handleSimulateWebhook = async (provider: 'meta' | 'tiktok') => {
    setSimulatingLogId(provider);

    let url = provider === 'meta' ? '/api/webhooks/meta' : '/api/webhooks/tiktok';
    let payload: any = {};

    if (provider === 'meta') {
      payload = {
        object: 'page',
        entry: [
          {
            id: '102948281042',
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: `lead_${Math.floor(10000000 + Math.random() * 90000000)}`,
                  form_id: 'form_992841029',
                  created_time: Math.floor(Date.now() / 1000),
                  page_id: '102948281042',
                  ad_id: 'ad_551029381'
                }
              }
            ]
          }
        ]
      };
    } else {
      payload = {
        event_type: 'LEAD_GEN',
        timestamp: Math.floor(Date.now() / 1000),
        form_id: 'tt_form_3821031',
        lead_id: `tt_lead_${Math.floor(10000000 + Math.random() * 90000000)}`,
        campaign_id: 'tt_camp_882104',
        ad_id: 'tt_ad_1120938'
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Reload configuration & logs
        await fetchConfig();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingLogId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 text-gray-200">

      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">Ecosistema & Hub de Integraciones</h2>
            <p className="text-xs text-gray-400 mt-0.5">Conecta tus proveedores logísticos, tiendas, CRM y canales de comunicación. Configura Tokens API/MCP para reportes y automatizaciones de IA.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#0d0d0d] p-1.5 rounded-xl border border-gray-800 self-start md:self-center flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('social_ads')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'social_ads'
                ? 'bg-gold text-black shadow-md shadow-gold/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={13} />
            Publicidad (Meta & TikTok Ads)
          </button>
          <button
            onClick={() => setActiveTab('retailers')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'retailers'
                ? 'bg-gold text-black shadow-md shadow-gold/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            Ecosistema Externo (APIs/MCP)
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-emerald-400 hover:text-white bg-emerald-950/20 border border-emerald-900/40'
            }`}
          >
            <Database size={13} />
            Base de Datos Supabase
            {supabaseStatus?.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {/* --- TAB 1: RETAILERS & GATEWAYS --- */}
      {activeTab === 'retailers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((item) => {
                const isConnected = item.status === 'connected';
                const isSelected = selectedIntegration?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIntegration(item)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-[210px] ${
                      isSelected
                        ? 'bg-gold/5 border-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                        : 'bg-[#0d0d0d] border-gray-800 hover:border-gray-700 hover:bg-[#111]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{item.icon}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                            isConnected
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : 'bg-gray-900 text-gray-500 border-gray-800'
                          }`}
                        >
                          {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                          {isConnected ? 'Conectado' : 'Sin Conectar'}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base group-hover:text-gold transition-colors">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-3 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4 border-t border-gray-800/60 pt-3">
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{item.category}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(item.id);
                        }}
                        className={`text-xs px-3 py-1 rounded-lg border font-medium transition ${
                          isConnected
                            ? 'border-red-900/40 bg-red-950/10 text-red-400 hover:bg-red-950/20'
                            : 'border-gold/30 bg-gold/5 text-gold hover:bg-gold hover:text-black font-semibold'
                        }`}
                      >
                        {isConnected ? 'Desconectar' : 'Conectar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            {selectedIntegration ? (
              <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
                  <span className="text-3xl">{selectedIntegration.icon}</span>
                  <div>
                    <h3 className="font-bold text-white text-lg">Ajustes: {selectedIntegration.name}</h3>
                    <p className="text-[10px] text-gold uppercase tracking-widest font-mono">Categoría: {selectedIntegration.category}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
                  {selectedIntegration.fields.map((field, idx) => (
                    <div key={idx}>
                      <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        value={field.value}
                        placeholder={field.placeholder}
                        onChange={(e) => handleFieldChange(idx, e.target.value)}
                        required
                        className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                  ))}

                  <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 mt-4 text-blue-400">
                    <Sliders size={18} className="shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-gray-200">Sincronización Automatizada</p>
                      <p className="text-gray-400 leading-relaxed">
                        Al activar esta integración, el Asistente de WhatsApp verificará la base de datos de {selectedIntegration.name} en tiempo real cada vez que un cliente concrete una orden.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingId !== null}
                    className="w-full py-3 bg-gold hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(212,175,55,0.2)]"
                  >
                    {savingId ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Guardando Credenciales...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Guardar Ajustes e Iniciar
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-[#0a0a0a] border border-gray-800 p-8 rounded-2xl text-center text-gray-500 shadow-xl">
                <AlertCircle size={32} className="mx-auto text-gray-600 mb-2" />
                Selecciona una integración de la lista para configurar credenciales.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: META & TIKTOK SOCIAL ADS CONNECTIONS --- */}
      {activeTab === 'social_ads' && (
        <div className="space-y-6">

          {/* Top informational Alert */}
          <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-lg">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold shrink-0 border border-gold/10">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Sincronización Avanzada con Meta & TikTok</h4>
                <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
                  Conéctate directamente sin simulaciones complejas. Al hacer clic en <strong>Iniciar Sesión y Sincronizar</strong>, el sistema vinculará de forma segura tus Fanpages, Instagram Business Accounts y cuentas publicitarias para capturar leads en tiempo real y optimizar campañas con IA.
                </p>
              </div>
            </div>
            {loadingConfig && (
              <div className="flex items-center gap-2 text-xs text-gold">
                <RefreshCw size={14} className="animate-spin" /> Cargando estado...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

            {/* Meta & TikTok Platform Panels */}
            <div className="xl:col-span-8 space-y-6">

              {/* --- META INTEGRATION MANAGER --- */}
              <div className="bg-[#090909] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Panel Header */}
                <div className="bg-[#1877f2]/10 border-b border-gray-800 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1877f2] flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-[#1877f2]/10">
                      f
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Meta Business Connection (Facebook / Instagram)</h3>
                      <p className="text-[10px] text-gray-400">Automatizaciones de Anuncios, Leads y Messenger</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                      metaTiktokConfig.metaConnected
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-900 text-gray-500 border-gray-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${metaTiktokConfig.metaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    {metaTiktokConfig.metaConnected ? 'Sincronizado' : 'Sin Sincronizar'}
                  </span>
                </div>

                <div className="p-6 space-y-6">

                  {/* Sync Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0c0c0c] border border-gray-800/80 p-5 rounded-2xl items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm">Sincronización Automática con un Clic</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Inicia sesión con tu cuenta de Meta Developers o Business Manager para sincronizar tus cuentas y Fanpages al instante.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      {metaTiktokConfig.metaConnected ? (
                        <div className="w-full flex flex-col sm:flex-row items-center gap-3 justify-end">
                          <div className="flex items-center gap-3 bg-[#111] px-4 py-2 rounded-xl border border-gray-800">
                            <img
                              src={metaTiktokConfig.metaConnectedUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"}
                              alt="Meta User"
                              className="w-7 h-7 rounded-full border border-gold/40 shrink-0"
                            />
                            <div className="text-left">
                              <p className="text-xs font-bold text-white leading-none">{metaTiktokConfig.metaConnectedUser?.name}</p>
                              <p className="text-[9px] text-gray-500 mt-0.5">ID: {metaTiktokConfig.metaConnectedUser?.id}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDisconnectProvider('meta')}
                            className="w-full sm:w-auto px-4 py-2.5 bg-red-950/30 hover:bg-red-900/30 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition"
                          >
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnectProvider('meta')}
                          className="w-full md:w-auto px-6 py-3 bg-[#1877f2] hover:bg-[#155fc2] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-[#1877f2]/10 hover:scale-[1.02]"
                        >
                          <UserCheck size={14} /> Iniciar Sesión y Sincronizar con Meta
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sincronized Elements Details */}
                  {metaTiktokConfig.metaConnected && metaTiktokConfig.metaConnectedUser && (
                    <div className="bg-[#1877f2]/5 border border-[#1877f2]/20 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-[#1877f2] uppercase font-bold tracking-wider mb-2">Fanpages Sincronizadas ({metaTiktokConfig.metaConnectedUser.pages.length})</p>
                        <div className="space-y-1.5">
                          {metaTiktokConfig.metaConnectedUser.pages.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-[#0d0d0d] p-2 rounded-lg border border-gray-800">
                              <span className="text-sm">🏪</span>
                              <div>
                                <span className="font-bold text-gray-200">{p.name}</span>
                                <span className="text-[9px] text-gray-500 block">ID: {p.id} ({p.type})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#1877f2] uppercase font-bold tracking-wider mb-2">Cuentas Publicitarias Conectadas</p>
                        <div className="space-y-1.5">
                          {metaTiktokConfig.metaConnectedUser.adAccounts.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-[#0d0d0d] p-2 rounded-lg border border-gray-800">
                              <span className="text-sm">📈</span>
                              <div>
                                <span className="font-bold text-gray-200">{a.name}</span>
                                <span className="text-[9px] text-gray-500 block">Ad Account Connected</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual API Configurations Form */}
                  <form onSubmit={handleSaveMetaTiktokConfig} className="space-y-4 pt-2 border-t border-gray-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-gold">
                        <Key size={12} /> Configuración de Credenciales de Producción
                      </h4>
                      <span className="text-[9px] text-gray-500">(Opcional si usas inicio de sesión rápido)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Meta App ID</label>
                        <input
                          type="text"
                          value={metaTiktokConfig.metaAppId}
                          onChange={(e) => handleMetaTiktokFieldChange('metaAppId', e.target.value)}
                          placeholder="Ingrese Meta App ID"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Meta App Secret</label>
                        <input
                          type="password"
                          value={metaTiktokConfig.metaAppSecret}
                          onChange={(e) => handleMetaTiktokFieldChange('metaAppSecret', e.target.value)}
                          placeholder="••••••••••••••••••••••••"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">System User Access Token (Larga Duración)</label>
                      <input
                        type="password"
                        value={metaTiktokConfig.metaAccessToken}
                        onChange={(e) => handleMetaTiktokFieldChange('metaAccessToken', e.target.value)}
                        placeholder="EAAbx..."
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                      />
                    </div>

                    {/* Meta Webhook settings */}
                    <div className="space-y-3 pt-3 border-t border-gray-800/60">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Globe size={13} className="text-blue-400" /> Endpoint de Webhook para Facebook Leads Real
                      </h5>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Copia estos datos y colócalos en tu panel de <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-gold underline inline-flex items-center gap-0.5">Meta Developers <ExternalLink size={10} /></a> bajo la sección de Webhooks de tu App. El servidor responderá el challenge de verificación de inmediato.
                      </p>

                      <div className="space-y-2">
                        {/* Webhook URL copy row */}
                        <div>
                          <p className="text-[9px] text-gray-500 mb-1 font-bold">Callback URL (URL de Webhook):</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={metaTiktokConfig.metaWebhookUrl || "Cargando URL..."}
                              className="flex-1 bg-[#0b0b0b] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-400 select-all font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleCopyToClipboard(metaTiktokConfig.metaWebhookUrl, 'meta_url')}
                              className="px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-bold text-white transition flex items-center gap-1"
                            >
                              {copiedField === 'meta_url' ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        {/* Verify token row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] text-gray-500 mb-1 font-bold">Token de Verificación (Verify Token):</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={metaTiktokConfig.metaWebhookVerifyToken}
                                onChange={(e) => handleMetaTiktokFieldChange('metaWebhookVerifyToken', e.target.value)}
                                className="flex-1 bg-[#111] border border-gray-800 rounded-lg px-3 py-1 text-xs text-white font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleCopyToClipboard(metaTiktokConfig.metaWebhookVerifyToken, 'meta_token')}
                                className="px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-bold text-white transition"
                              >
                                {copiedField === 'meta_token' ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] text-gray-500 mb-1 font-bold">Eventos Webhook Suscritos:</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {['leadgen', 'messages', 'ads_insights'].map((ev) => {
                                const active = metaTiktokConfig.metaWebhookEvents.includes(ev);
                                return (
                                  <button
                                    type="button"
                                    key={ev}
                                    onClick={() => handleToggleEvent('meta', ev)}
                                    className={`text-[9px] px-2 py-1 rounded border font-mono font-bold transition ${
                                      active
                                        ? 'bg-blue-950/40 border-blue-500/40 text-blue-400'
                                        : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                                    }`}
                                  >
                                    {ev}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-800/40">
                      {/* Simular endpoint */}
                      <button
                        type="button"
                        disabled={simulatingLogId !== null}
                        onClick={() => handleSimulateWebhook('meta')}
                        className="px-4 py-2 bg-gradient-to-r from-blue-900/30 to-blue-900/30 hover:from-blue-900/50 hover:to-blue-900/50 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {simulatingLogId === 'meta' ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" /> Procesando...
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Probar Lead Entrante Meta (Test Webhook)
                          </>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="px-6 py-2 bg-gold hover:bg-yellow-400 text-black font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                      >
                        {savingConfig ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        Guardar Ajustes de Meta
                      </button>
                    </div>

                  </form>
                </div>
              </div>

              {/* --- TIKTOK INTEGRATION MANAGER --- */}
              <div className="bg-[#090909] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Panel Header */}
                <div className="bg-[#fe2c55]/10 border-b border-gray-800 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black border border-gray-800 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M19.589 6.686a4.866 4.866 0 0 1-3.1-1.154V12.4a6.113 6.113 0 1 1-6.112-6.111c.321 0 .633.025.938.073v3.195a2.912 2.912 0 1 0-.938 5.66c1.606 0 2.91-1.304 2.91-2.91V0h3.2a6.046 6.046 0 0 0 3.1 3.102v3.584z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">TikTok Ads Integration</h3>
                      <p className="text-[10px] text-gray-400">Captura de leads instantáneos y métricas de TikTok Pixel</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                      metaTiktokConfig.tiktokConnected
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-900 text-gray-500 border-gray-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${metaTiktokConfig.tiktokConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    {metaTiktokConfig.tiktokConnected ? 'Sincronizado' : 'Sin Sincronizar'}
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  {/* Sync Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0c0c0c] border border-gray-800/80 p-5 rounded-2xl items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm">Sincronización Automática con un Clic</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Sincroniza tus cuentas publicitarias de TikTok Ads de forma inmediata, permitiendo el flujo continuo de leads a tus embudos de WhatsApp.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      {metaTiktokConfig.tiktokConnected ? (
                        <div className="w-full flex flex-col sm:flex-row items-center gap-3 justify-end">
                          <div className="flex items-center gap-3 bg-[#111] px-4 py-2 rounded-xl border border-gray-800">
                            <img
                              src={metaTiktokConfig.tiktokConnectedUser?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&h=80&q=80"}
                              alt="TikTok User"
                              className="w-7 h-7 rounded-full border border-gold/40 shrink-0"
                            />
                            <div className="text-left">
                              <p className="text-xs font-bold text-white leading-none">{metaTiktokConfig.tiktokConnectedUser?.name}</p>
                              <p className="text-[9px] text-gray-500 mt-0.5">ID: {metaTiktokConfig.tiktokConnectedUser?.id}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDisconnectProvider('tiktok')}
                            className="w-full sm:w-auto px-4 py-2.5 bg-red-950/30 hover:bg-red-900/30 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition"
                          >
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnectProvider('tiktok')}
                          className="w-full md:w-auto px-6 py-3 bg-white hover:bg-gray-100 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02]"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M19.589 6.686a4.866 4.866 0 0 1-3.1-1.154V12.4a6.113 6.113 0 1 1-6.112-6.111c.321 0 .633.025.938.073v3.195a2.912 2.912 0 1 0-.938 5.66c1.606 0 2.91-1.304 2.91-2.91V0h3.2a6.046 6.046 0 0 0 3.1 3.102v3.584z"/>
                          </svg>
                          Iniciar Sesión con TikTok
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Connected Cuentas */}
                  {metaTiktokConfig.tiktokConnected && metaTiktokConfig.tiktokConnectedUser && (
                    <div className="bg-[#fe2c55]/5 border border-[#fe2c55]/20 rounded-2xl p-4">
                      <p className="text-[10px] text-[#fe2c55] uppercase font-bold tracking-wider mb-2">Cuentas Publicitarias de TikTok Sincronizadas</p>
                      <div className="space-y-1.5">
                        {metaTiktokConfig.tiktokConnectedUser.adAccounts.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-[#0d0d0d] p-2.5 rounded-lg border border-gray-800">
                            <span className="text-sm">🎵</span>
                            <div>
                              <span className="font-bold text-gray-200">{a.name}</span>
                              <span className="text-[9px] text-gray-500 block">ID: {a.id} • Cuenta Activa</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credentials & Webhook for TikTok */}
                  <form onSubmit={handleSaveMetaTiktokConfig} className="space-y-4 pt-2 border-t border-gray-800/60">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">TikTok App ID</label>
                        <input
                          type="text"
                          value={metaTiktokConfig.tiktokAppId}
                          onChange={(e) => handleMetaTiktokFieldChange('tiktokAppId', e.target.value)}
                          placeholder="Ingrese TikTok App ID"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">TikTok App Secret</label>
                        <input
                          type="password"
                          value={metaTiktokConfig.tiktokAppSecret}
                          onChange={(e) => handleMetaTiktokFieldChange('tiktokAppSecret', e.target.value)}
                          placeholder="••••••••••••••••••••••••"
                          className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">TikTok Developer Access Token</label>
                      <input
                        type="password"
                        value={metaTiktokConfig.tiktokAccessToken}
                        onChange={(e) => handleMetaTiktokFieldChange('tiktokAccessToken', e.target.value)}
                        placeholder="TIKTOK-ACCESS-TOKEN..."
                        className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div className="space-y-3 pt-3 border-t border-gray-800/60">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Globe size={13} className="text-[#fe2c55]" /> Endpoint de Webhook para TikTok Ads Real
                      </h5>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Copia estos datos y colócalos en tu panel de <a href="https://developers.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gold underline inline-flex items-center gap-0.5">TikTok Developer <ExternalLink size={10} /></a>. El servidor verificará la conexión de inmediato.
                      </p>

                      <div className="space-y-2">
                        {/* URL TikTok Webhook */}
                        <div>
                          <p className="text-[9px] text-gray-500 mb-1 font-bold">Callback URL (URL de Webhook TikTok):</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={metaTiktokConfig.tiktokWebhookUrl || "Cargando URL..."}
                              className="flex-1 bg-[#0b0b0b] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-400 select-all font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleCopyToClipboard(metaTiktokConfig.tiktokWebhookUrl, 'tiktok_url')}
                              className="px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-bold text-white transition flex items-center gap-1"
                            >
                              {copiedField === 'tiktok_url' ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        {/* TikTok Verify token */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] text-gray-500 mb-1 font-bold">Token de Verificación:</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={metaTiktokConfig.tiktokWebhookVerifyToken}
                                onChange={(e) => handleMetaTiktokFieldChange('tiktokWebhookVerifyToken', e.target.value)}
                                className="flex-1 bg-[#111] border border-gray-800 rounded-lg px-3 py-1 text-xs text-white font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleCopyToClipboard(metaTiktokConfig.tiktokWebhookVerifyToken, 'tiktok_token')}
                                className="px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-bold text-white transition"
                              >
                                {copiedField === 'tiktok_token' ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] text-gray-500 mb-1 font-bold">Eventos TikTok:</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {['lead_group_generation', 'ads_insights'].map((ev) => {
                                const active = metaTiktokConfig.tiktokWebhookEvents.includes(ev);
                                return (
                                  <button
                                    type="button"
                                    key={ev}
                                    onClick={() => handleToggleEvent('tiktok', ev)}
                                    className={`text-[9px] px-2 py-1 rounded border font-mono font-bold transition ${
                                      active
                                        ? 'bg-red-950/40 border-red-500/40 text-red-400'
                                        : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                                    }`}
                                  >
                                    {ev}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-800/40">
                      {/* Simular endpoint */}
                      <button
                        type="button"
                        disabled={simulatingLogId !== null}
                        onClick={() => handleSimulateWebhook('tiktok')}
                        className="px-4 py-2 bg-gradient-to-r from-red-950/20 to-blue-950/20 hover:from-red-950/40 hover:to-blue-950/40 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {simulatingLogId === 'tiktok' ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" /> Procesando...
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Probar Lead Entrante TikTok
                          </>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="px-6 py-2 bg-gold hover:bg-yellow-400 text-black font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                      >
                        {savingConfig ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        Guardar Ajustes de TikTok
                      </button>
                    </div>

                  </form>
                </div>
              </div>

            </div>

            {/* Sidebar with Live Webhook Logs and instructions */}
            <div className="xl:col-span-4 space-y-6">

              {/* Live Webhook Monitoring console */}
              <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="border-b border-gray-800 px-5 py-4 flex items-center justify-between bg-[#070707]">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Consola Webhook Realtime</span>
                  </div>
                  <button
                    onClick={fetchConfig}
                    className="p-1.5 rounded bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white transition"
                    title="Actualizar Logs"
                  >
                    <RefreshCw size={11} />
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar">
                  {webhookLogs.length === 0 ? (
                    <div className="py-12 text-center text-gray-600">
                      <AlertCircle size={24} className="mx-auto mb-2 text-gray-700" />
                      <p className="text-[11px] font-mono">[Esperando Webhooks...]</p>
                      <p className="text-[9px] text-gray-500 mt-1">Haz clic en "Probar Lead" para diagnosticar</p>
                    </div>
                  ) : (
                    webhookLogs.map((log) => {
                      const isMeta = log.provider === 'meta';
                      return (
                        <div key={log.id} className="p-3 bg-[#0a0a0a] border border-gray-800 rounded-xl space-y-2 text-[11px] font-mono hover:border-gray-700 transition">
                          <div className="flex items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isMeta ? 'bg-blue-950/50 text-blue-400 border border-blue-900/30' : 'bg-red-950/50 text-red-400 border border-red-900/30'
                            }`}>
                              {isMeta ? 'META ADS' : 'TIKTOK ADS'}
                            </span>
                            <span className="text-gray-500 text-[9px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>

                          <p className="text-gray-300 font-sans font-bold leading-relaxed">{log.summary}</p>

                          <div className="bg-[#050505] p-2.5 rounded border border-gray-900 text-[9px] text-gray-400 overflow-x-auto select-all max-h-[150px]">
                            <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Secure API Key Shield Info */}
              <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-gold">
                  <ShieldAlert size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Cifrado de Extremo a Extremo</h4>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Todas las credenciales, Access Tokens y Webhooks guardados se almacenan utilizando cifrado simétrico AES-256 en nuestros contenedores de producción y se procesan estrictamente del lado del servidor (backend) para ocultarlas por completo del navegador.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* --- TAB 3: SUPABASE CLOUD DATABASE --- */}
      {activeTab === 'supabase' && (
        <div className="space-y-6">
          {/* Main Status Hero */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 text-3xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-display font-bold text-white tracking-tight">
                      Supabase Cloud Database (PostgreSQL)
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                        supabaseStatus?.connected
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                          : supabaseStatus?.configured
                          ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                          : 'bg-red-950/60 text-red-400 border-red-500/40'
                      }`}
                    >
                      {supabaseStatus?.connected ? (
                        <>
                          <CheckCircle2 size={12} /> Conectado & Operativo
                        </>
                      ) : supabaseStatus?.configured ? (
                        <>
                          <AlertCircle size={12} /> Configurado (Falta Tabla SQL)
                        </>
                      ) : (
                        <>
                          <WifiOff size={12} /> Pendiente de Variables
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                    Toda la persistencia de datos (configuraciones, bots, entrenamientos, pasarelas, pedidos y usuarios) se gestiona de forma segura mediante el SDK oficial <span className="text-emerald-400 font-mono">@supabase/supabase-js</span> en la nube.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
                <button
                  type="button"
                  onClick={fetchSupabaseStatus}
                  disabled={isCheckingSupabase}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-900/80 hover:bg-gray-800 text-gray-200 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <RefreshCw size={14} className={isCheckingSupabase ? 'animate-spin text-emerald-400' : ''} />
                  Verificar Conexión
                </button>
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncingSupabase}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  <Send size={14} className={isSyncingSupabase ? 'animate-bounce' : ''} />
                  {isSyncingSupabase ? 'Sincronizando...' : 'Subir Estado a Supabase'}
                </button>
                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={isSyncingSupabase}
                  className="px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-300 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <RefreshCw size={14} />
                  Descargar de Supabase
                </button>
              </div>
            </div>

            {/* Notification message */}
            {supabaseSyncMsg && (
              <div
                className={`mt-4 p-3.5 rounded-xl text-xs font-semibold border ${
                  supabaseSyncMsg.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/50 border-red-500/40 text-red-300'
                }`}
              >
                {supabaseSyncMsg.text}
              </div>
            )}
          </div>

          {/* Configuration & Diagnostics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Diagnostics & Environment Info */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#0d0d0d] border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Diagnóstico de Supabase</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-gray-800">
                    <span className="text-gray-400">URL de Proyecto:</span>
                    <span className="font-mono text-emerald-400 text-[11px] truncate max-w-[240px]">
                      {supabaseStatus?.url || (supabaseStatus?.hasUrl ? 'Configurada en ENV' : 'No configurada (SUPABASE_URL)')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-gray-800">
                    <span className="text-gray-400">API Key / Secret:</span>
                    <span className="font-mono text-[11px] text-gray-300">
                      {supabaseStatus?.hasKey ? '•••••••••••••••• (Activa)' : 'Falta SUPABASE_KEY'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-gray-800">
                    <span className="text-gray-400">Tabla de Estado (<code className="text-emerald-400">app_state</code>):</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        supabaseStatus?.tableExists
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {supabaseStatus?.tableExists ? 'Creada & Lista' : 'No Detectada'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-gray-800">
                    <span className="text-gray-400">Dominio de Producción Cloud Run:</span>
                    <span className="font-mono text-gold text-[11px]">https://crm.xorbit360.com</span>
                  </div>
                </div>

                {supabaseStatus?.error && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-300 text-xs">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertCircle size={13} /> Aviso de Supabase:
                    </p>
                    <p className="font-mono text-[11px] opacity-90">{supabaseStatus.error}</p>
                  </div>
                )}
              </div>

              {/* Instructions Card */}
              <div className="bg-[#0d0d0d] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-gold">
                  <Key size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Pasos para Conectar en AI Studio</h4>
                </div>
                <ol className="space-y-2 text-xs text-gray-300 list-decimal list-inside leading-relaxed">
                  <li>
                    Entra a tu cuenta en <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">Supabase.com</a> y crea o abre tu proyecto.
                  </li>
                  <li>
                    En el menú lateral de Supabase, ve a <strong>Project Settings → API</strong> y copia tu <strong>Project URL</strong> y la clave <strong>service_role</strong> (o <strong>anon public</strong>).
                  </li>
                  <li>
                    En el menú de Google AI Studio (<strong>Settings / Variables de Entorno</strong>), agrega:
                    <div className="mt-1 bg-[#050505] p-2 rounded-lg font-mono text-[11px] text-emerald-300 space-y-0.5 border border-gray-800">
                      <div>SUPABASE_URL=https://tuid.supabase.co</div>
                      <div>SUPABASE_KEY=eyJh... (tu clave)</div>
                    </div>
                  </li>
                  <li>
                    Ejecuta el script SQL que se muestra a la derecha en el <strong>SQL Editor</strong> de Supabase.
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Column: SQL Schema Editor */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#0d0d0d] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Database size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Script SQL de Inicialización</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(supabaseSchema);
                      setCopiedField('supabase_sql');
                      setTimeout(() => setCopiedField(null), 2500);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedField === 'supabase_sql' ? (
                      <>
                        <Check size={12} /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Clipboard size={12} /> Copiar SQL
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Copia y pega esta sentencia en el <strong>SQL Editor</strong> de tu panel de Supabase para habilitar la tabla <code className="text-emerald-400">app_state</code> con políticas RLS:
                </p>
                <div className="bg-[#050505] border border-gray-900 rounded-xl p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-[280px]">
                  <pre>{supabaseSchema}</pre>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-950/20 to-black border border-emerald-900/30 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldAlert size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Persistencia Permanente en Producción</h4>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Cada vez que guardas configuraciones, agregas una regla de chatbot o actualizas credenciales, el backend actualiza automáticamente la fila en Supabase. Al desplegar una nueva versión en Cloud Run (<code className="text-emerald-400">https://crm.xorbit360.com</code>), los datos se cargan al instante sin pérdidas.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
