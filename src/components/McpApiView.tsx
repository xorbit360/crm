import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Code2,
  Webhook,
  Key,
  Copy,
  Check,
  Play,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  Globe,
  Cpu,
  BookOpen,
  Layers,
  Activity,
  Trash2,
  Plus,
  ArrowRight,
  Database,
  Smartphone
} from 'lucide-react';
import { getEffectiveDomain, getCachedWhiteLabel } from '../lib/whitelabel';

export default function McpApiView() {
  const [activeTab, setActiveTab] = useState<'mcp' | 'api' | 'webhooks'>('mcp');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // White-label & domain context
  const [currentDomain, setCurrentDomain] = useState<string>('https://crm.xorbit360.com');

  useEffect(() => {
    const domain = getEffectiveDomain();
    setCurrentDomain(domain);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- MCP STATES & TOOLS ---
  const [selectedMcpTool, setSelectedMcpTool] = useState('orders_list');
  const [mcpArguments, setMcpArguments] = useState('{\n  "status": "ALL"\n}');
  const [mcpResponse, setMcpResponse] = useState<any>(null);
  const [isExecutingMcp, setIsExecutingMcp] = useState(false);
  const [mcpLatency, setMcpLatency] = useState<number | null>(null);

  const mcpTools = [
    {
      name: 'orders_list',
      description: 'Consultar lista de pedidos en tiempo real con filtro por estado (CONFIRMANDO, EN COCINA, DESPACHADO, ENTREGADO).',
      sampleArgs: '{\n  "status": "ALL"\n}',
      category: 'Ventas & Pedidos'
    },
    {
      name: 'order_create',
      description: 'Crear un pedido nuevo con cliente, teléfono, dirección, items y método de pago.',
      sampleArgs: '{\n  "customerName": "Carlos Mendoza",\n  "phone": "+57 315 888 9999",\n  "address": "Calle 10 # 4-50, Barrio Centro",\n  "items": ["1x Almuerzo Ejecutivo", "1x Jugo de Lulo"],\n  "amount": 28000,\n  "paymentMethod": "Efectivo"\n}',
      category: 'Ventas & Pedidos'
    },
    {
      name: 'order_update_status',
      description: 'Actualizar el estado de un pedido (ej: EN COCINA, DESPACHADO, ENTREGADO).',
      sampleArgs: '{\n  "orderId": "ORD-092",\n  "status": "EN COCINA"\n}',
      category: 'Ventas & Pedidos'
    },
    {
      name: 'whatsapp_send',
      description: 'Enviar un mensaje real de WhatsApp o nota de voz a un número telefónico.',
      sampleArgs: '{\n  "phone": "573123456789",\n  "message": "¡Hola! Tu pedido ha sido confirmado y está en preparación 🚀."\n}',
      category: 'WhatsApp & CRM'
    },
    {
      name: 'customers_list',
      description: 'Consultar cartera de clientes, recurrencia y datos de contacto.',
      sampleArgs: '{\n  "limit": 10\n}',
      category: 'Clientes'
    },
    {
      name: 'products_catalog',
      description: 'Consultar catálogo de productos, precios y disponibilidad.',
      sampleArgs: '{\n  "category": "all"\n}',
      category: 'Inventario'
    },
    {
      name: 'analytics_summary',
      description: 'Obtener KPIs clave de ventas, pedidos, clientes y tasa de conversión.',
      sampleArgs: '{}',
      category: 'Analítica'
    }
  ];

  const handleMcpToolSelect = (toolName: string) => {
    setSelectedMcpTool(toolName);
    const tool = mcpTools.find(t => t.name === toolName);
    if (tool) {
      setMcpArguments(tool.sampleArgs);
    }
  };

  const executeMcpTool = async () => {
    setIsExecutingMcp(true);
    setMcpResponse(null);
    const start = performance.now();
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(mcpArguments);
      } catch (e) {
        setMcpResponse({ error: 'JSON de argumentos inválido. Revisa la sintaxis.' });
        setIsExecutingMcp(false);
        return;
      }

      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedMcpTool,
          arguments: parsedArgs
        })
      });

      const data = await res.json();
      const end = performance.now();
      setMcpLatency(Math.round(end - start));
      setMcpResponse(data);
    } catch (err: any) {
      setMcpResponse({ error: err.message || 'Error de conexión con el servidor MCP' });
    } finally {
      setIsExecutingMcp(false);
    }
  };

  // --- API KEYS STATES ---
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('Clave Producción');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/v1/api-keys');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.keys)) {
          setApiKeys(data.keys);
        }
      }
    } catch (e) {
      console.error('Error fetching API keys:', e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();
      if (data.success && data.apiKey) {
        setGeneratedKey(data.apiKey.key);
        setNewKeyName('');
        fetchApiKeys();
      }
    } catch (e) {
      console.error('Error creating API key:', e);
    }
  };

  const handleRevokeApiKey = async (keyToRevoke: string) => {
    if (!confirm('¿Estás seguro de revocar esta API Key? Las integraciones que la usen dejarán de funcionar.')) return;
    try {
      const res = await fetch(`/api/v1/api-keys/${encodeURIComponent(keyToRevoke)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchApiKeys();
      }
    } catch (e) {
      console.error('Error revoking API key:', e);
    }
  };

  // --- REST API TESTER STATES ---
  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState('GET /api/v1/orders');
  const [apiTestResponse, setApiTestResponse] = useState<any>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  const testRestEndpoint = async (endpointStr: string) => {
    setIsTestingApi(true);
    setApiTestResponse(null);
    try {
      const [method, path] = endpointStr.split(' ');
      let res;
      if (method === 'GET') {
        res = await fetch(path);
      } else if (method === 'POST') {
        res = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: 'Cliente API Test',
            phone: '+57 300 123 4567',
            address: 'Calle 100 # 15-20',
            items: ['1x Pedido de Prueba'],
            amount: 25000,
            paymentMethod: 'Transferencia'
          })
        });
      }
      if (res) {
        const data = await res.json();
        setApiTestResponse(data);
      }
    } catch (e: any) {
      setApiTestResponse({ error: e.message || 'Error al conectar con el endpoint' });
    } finally {
      setIsTestingApi(false);
    }
  };

  // --- WEBHOOKS STATES ---
  const [webhookUrl, setWebhookUrl] = useState('https://webhook.site/demo-endpoint');
  const [webhookSecret, setWebhookSecret] = useState('whsec_exp360_' + Math.random().toString(36).substring(2, 10));
  const [subscribedEvents, setSubscribedEvents] = useState<string[]>([
    'order.created',
    'order.updated',
    'customer.new',
    'whatsapp.message_received'
  ]);
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<any>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchWebhookConfig();
    fetchWebhookLogs();
  }, []);

  const fetchWebhookConfig = async () => {
    try {
      const res = await fetch('/api/webhooks/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          if (data.config.targetUrl) setWebhookUrl(data.config.targetUrl);
          if (data.config.secret) setWebhookSecret(data.config.secret);
          if (Array.isArray(data.config.events) && data.config.events.length > 0) {
            setSubscribedEvents(data.config.events);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch webhook config:', e);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      const res = await fetch('/api/webhooks/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setWebhookLogs(data.logs);
        }
      }
    } catch (e) {
      console.warn('Could not fetch webhook logs:', e);
    }
  };

  const handleSaveWebhookConfig = async () => {
    try {
      const res = await fetch('/api/webhooks/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: webhookUrl,
          secret: webhookSecret,
          events: subscribedEvents
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Configuración de Webhook guardada exitosamente.');
      }
    } catch (e) {
      console.error('Error saving webhook config:', e);
    }
  };

  const handleSendTestWebhook = async () => {
    if (!webhookUrl) return;
    setIsDispatchingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch('/api/webhooks/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: webhookUrl,
          secret: webhookSecret,
          event: 'order.created',
          payload: {
            event: 'order.created',
            timestamp: new Date().toISOString(),
            order: {
              id: 'ORD-TEST-' + Math.floor(1000 + Math.random() * 9000),
              customerName: 'Cliente Prueba Webhook',
              phone: '+57 312 345 6789',
              amount: 35000,
              items: ['1x Bandeja Paisa Mona', '1x Jugo de Lulo'],
              status: 'CONFIRMANDO'
            }
          }
        })
      });
      const data = await res.json();
      setWebhookTestResult(data);
      fetchWebhookLogs();
    } catch (e: any) {
      setWebhookTestResult({ success: false, error: e.message });
    } finally {
      setIsDispatchingWebhook(false);
    }
  };

  const toggleEvent = (eventKey: string) => {
    if (subscribedEvents.includes(eventKey)) {
      setSubscribedEvents(subscribedEvents.filter(e => e !== eventKey));
    } else {
      setSubscribedEvents([...subscribedEvents, eventKey]);
    }
  };

  // Cursor / Claude config sample
  const claudeConfigSnippet = JSON.stringify({
    mcpServers: {
      xorbit360: {
        url: `${currentDomain}/api/mcp/superadmin`,
        headers: {
          Authorization: `Bearer ${apiKeys[0]?.key || 'exp_live_TU_API_KEY'}`
        }
      }
    }
  }, null, 2);

  const cursorConfigSnippet = JSON.stringify({
    mcpServers: {
      xorbit360: {
        type: "streamable-http",
        url: `${currentDomain}/api/mcp/superadmin`,
        headers: {
          Authorization: `Bearer ${apiKeys[0]?.key || 'exp_live_TU_API_KEY'}`
        }
      }
    }
  }, null, 2);

  return (
    <div className="space-y-8 w-full pb-16 animate-fade-in text-gray-100">

      {/* Header Banner */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900/95 to-blue-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5 shrink-0">
              <Terminal size={32} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Model Context Protocol & API v1
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Servidor MCP Activo
                </span>
                <span className="text-xs text-gray-400 font-mono">Protocolo 2024-11-05</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-white mt-1">
                MCP, API REST & Webhooks de la Plataforma
              </h1>
              <p className="text-gray-400 text-sm mt-1 max-w-2xl">
                Conecta agentes de Inteligencia Artificial (Claude Desktop, Cursor, Antigravity), automatizaciones de Make / Zapier y aplicaciones externas en tiempo real con tu plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <a
              href="/api/mcp/manifest"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Cpu size={14} className="text-blue-400" />
              <span>Ver Manifest MCP</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('mcp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'mcp'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
              : 'text-blue-400 hover:text-white hover:bg-blue-950/30 border border-blue-500/20'
          }`}
        >
          <Cpu size={16} />
          Servidor MCP (Model Context Protocol)
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'api'
              ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
              : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-gray-800'
          }`}
        >
          <Code2 size={16} />
          Documentación REST API v1
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'webhooks'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 font-bold'
              : 'text-emerald-400 hover:text-white hover:bg-emerald-950/30 border border-emerald-500/20'
          }`}
        >
          <Webhook size={16} />
          Webhooks de la Plataforma
        </button>
      </div>

      {/* TAB 1: MODEL CONTEXT PROTOCOL (MCP) */}
      {activeTab === 'mcp' && (
        <div className="space-y-8 animate-fade-in">

          {/* Quick MCP Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Super Admin MCP</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">POST</span>
              </div>
              <p className="font-mono text-xs text-white break-all bg-gray-950 p-2 rounded-lg border border-gray-800">
                {currentDomain}/api/mcp/superadmin
              </p>
              <button
                onClick={() => copyToClipboard(`${currentDomain}/api/mcp/superadmin`, 'superadmin_url')}
                className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] font-semibold text-gray-300 transition flex items-center justify-center gap-1.5"
              >
                {copiedId === 'superadmin_url' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedId === 'superadmin_url' ? 'Copiado' : 'Copiar URL Super Admin'}</span>
              </button>
            </div>

            <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Usuario MCP</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">POST</span>
              </div>
              <p className="font-mono text-xs text-white break-all bg-gray-950 p-2 rounded-lg border border-gray-800">
                {currentDomain}/api/mcp/user
              </p>
              <button
                onClick={() => copyToClipboard(`${currentDomain}/api/mcp/user`, 'user_url')}
                className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] font-semibold text-gray-300 transition flex items-center justify-center gap-1.5"
              >
                {copiedId === 'user_url' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedId === 'user_url' ? 'Copiado' : 'Copiar URL Usuario'}</span>
              </button>
            </div>

            <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Herramientas Activas</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">7 TOOLS</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pedidos, WhatsApp real, Clientes, Catálogo de productos y Analítica conectados directamente al modelo de lenguaje.
              </p>
              <div className="text-[11px] text-emerald-400 font-medium">
                Listo para Claude Desktop, Cursor y agentes IA.
              </div>
            </div>
          </div>

          {/* Connect MCP Client Section */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <Terminal size={20} className="text-blue-400" />
                  Conexión con Claude Desktop & Cursor
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Agrega este bloque de configuración en tu archivo <code className="text-blue-300">claude_desktop_config.json</code> o en los ajustes de MCP de Cursor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(claudeConfigSnippet, 'claude_cfg')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  {copiedId === 'claude_cfg' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId === 'claude_cfg' ? 'Copiado' : 'Copiar Config Claude'}</span>
                </button>

                <button
                  onClick={() => copyToClipboard(cursorConfigSnippet, 'cursor_cfg')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  {copiedId === 'cursor_cfg' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId === 'cursor_cfg' ? 'Copiado' : 'Copiar Config Cursor'}</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-xs text-gray-300 overflow-x-auto">
              <pre>{claudeConfigSnippet}</pre>
            </div>
          </div>

          {/* Interactive MCP Tools Catalog & Real Runner */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div>
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Play size={20} className="text-blue-400" />
                Ejecutor y Probador de Herramientas MCP en Vivo
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Selecciona cualquier herramienta expuesta por el servidor MCP para probar la llamada con datos reales.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Tool list */}
              <div className="lg:col-span-4 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Herramientas Disponibles
                </label>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {mcpTools.map(tool => (
                    <button
                      key={tool.name}
                      onClick={() => handleMcpToolSelect(tool.name)}
                      className={`w-full text-left p-3 rounded-xl transition border cursor-pointer ${
                        selectedMcpTool === tool.name
                          ? 'bg-blue-600/20 border-blue-500/40 text-white shadow-sm'
                          : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-300">{tool.name}</span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                          {tool.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Execution panel */}
              <div className="lg:col-span-8 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Argumentos JSON para <span className="font-mono text-blue-400">{selectedMcpTool}</span>:
                    </label>
                    <span className="text-[11px] text-gray-500">Parámetros del schema</span>
                  </div>

                  <textarea
                    rows={6}
                    value={mcpArguments}
                    onChange={(e) => setMcpArguments(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-gray-400">
                      {mcpLatency !== null && (
                        <span className="text-emerald-400 font-mono">
                          ⚡ Latencia: {mcpLatency} ms
                        </span>
                      )}
                    </div>

                    <button
                      onClick={executeMcpTool}
                      disabled={isExecutingMcp}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isExecutingMcp ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Ejecutando herramienta...</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          <span>Ejecutar Herramienta MCP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Response area */}
                {mcpResponse && (
                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Respuesta del Servidor MCP:
                      </span>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(mcpResponse, null, 2), 'mcp_resp')}
                        className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedId === 'mcp_resp' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>Copiar JSON</span>
                      </button>
                    </div>

                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-xs text-emerald-300 max-h-64 overflow-y-auto">
                      <pre>{JSON.stringify(mcpResponse, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DOCUMENTACIÓN REST API v1 */}
      {activeTab === 'api' && (
        <div className="space-y-8 animate-fade-in">

          {/* API Keys Management Box */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <Key size={20} className="text-gold" />
                  Gestión de Claves de API (API Keys)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Usa estas credenciales para autenticar llamadas HTTP seguras con el header <code className="text-gold">Authorization: Bearer exp_live_...</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nombre de la clave (ej: Make.com)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
                />
                <button
                  onClick={handleCreateApiKey}
                  className="px-4 py-2 rounded-xl bg-gold text-black font-bold text-xs transition hover:bg-amber-400 flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={14} />
                  <span>Generar API Key</span>
                </button>
              </div>
            </div>

            {/* If a new key was just generated */}
            {generatedKey && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    ¡Nueva Clave Generada con Éxito!
                  </span>
                  <span className="text-[10px] text-gray-400">Guárdala en un lugar seguro</span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-gray-950 p-2.5 rounded-lg border border-gray-800 font-mono text-xs text-emerald-400">
                  <span className="truncate">{generatedKey}</span>
                  <button
                    onClick={() => copyToClipboard(generatedKey, 'gen_key')}
                    className="px-2 py-1 rounded bg-gray-800 text-gray-200 hover:text-white shrink-0 flex items-center gap-1 text-[11px]"
                  >
                    {copiedId === 'gen_key' ? <Check size={12} /> : <Copy size={12} />}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Keys */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Claves Activas
              </label>

              {apiKeys.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 text-center text-xs text-gray-500">
                  No hay claves de API creadas todavía. Crea una para acceder a la API externa.
                </div>
              ) : (
                <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
                  {apiKeys.map((keyItem) => (
                    <div key={keyItem.key} className="p-3.5 flex items-center justify-between gap-4 text-xs font-mono">
                      <div>
                        <div className="font-bold text-white font-sans">{keyItem.name || 'API Key'}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">
                          {keyItem.key.substring(0, 16)}••••••••••••••••
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500">
                          {new Date(keyItem.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => copyToClipboard(keyItem.key, keyItem.key)}
                          className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                          title="Copiar API Key"
                        >
                          {copiedId === keyItem.key ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => handleRevokeApiKey(keyItem.key)}
                          className="p-1.5 rounded bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/40 transition"
                          title="Revocar Clave"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interactive REST Endpoints Explorer */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div>
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <Code2 size={20} className="text-gold" />
                Explorador Interactivo de Endpoints REST
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Consulta los recursos de la plataforma en formato JSON estándar.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  method: 'GET',
                  endpoint: '/api/v1/orders',
                  label: 'Listar todos los pedidos',
                  description: 'Retorna la lista de pedidos en curso, clientes, productos y montos totales.'
                },
                {
                  method: 'POST',
                  endpoint: '/api/v1/orders',
                  label: 'Crear un pedido',
                  description: 'Registra una nueva orden con cliente, teléfono, dirección e items.'
                },
                {
                  method: 'GET',
                  endpoint: '/api/v1/customers',
                  label: 'Listar clientes y leads',
                  description: 'Retorna la cartera de clientes, recurrencia y número de pedidos.'
                },
                {
                  method: 'GET',
                  endpoint: '/api/v1/products',
                  label: 'Catálogo de productos',
                  description: 'Retorna los platos o productos activos y precios unitarios.'
                },
                {
                  method: 'GET',
                  endpoint: '/api/v1/analytics',
                  label: 'Métricas y KPIs',
                  description: 'Retorna total de ventas, ingresos brutos y conteo de órdenes activas.'
                }
              ].map((ep) => (
                <div key={ep.endpoint} className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                        ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-bold text-white">{ep.endpoint}</span>
                      <span className="text-xs text-gray-400 font-semibold">{ep.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(`${currentDomain}${ep.endpoint}`, ep.endpoint)}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 flex items-center gap-1.5 transition"
                      >
                        {copiedId === ep.endpoint ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>Copiar URL</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedApiEndpoint(`${ep.method} ${ep.endpoint}`);
                          testRestEndpoint(`${ep.method} ${ep.endpoint}`);
                        }}
                        disabled={isTestingApi}
                        className="px-3 py-1.5 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Play size={12} />
                        <span>Probar en Vivo</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    {ep.description}
                  </p>
                </div>
              ))}
            </div>

            {/* REST API Test Output */}
            {apiTestResponse && (
              <div className="space-y-2 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Resultado de <span className="font-mono text-gold">{selectedApiEndpoint}</span>:
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(apiTestResponse, null, 2), 'api_test_resp')}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedId === 'api_test_resp' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>Copiar Respuesta</span>
                  </button>
                </div>

                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-xs text-gold max-h-72 overflow-y-auto">
                  <pre>{JSON.stringify(apiTestResponse, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: WEBHOOKS DE LA PLATAFORMA */}
      {activeTab === 'webhooks' && (
        <div className="space-y-8 animate-fade-in">

          {/* Outbound Webhooks Config */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                  <Webhook size={20} className="text-emerald-400" />
                  Webhooks Salientes (Eventos en Tiempo Real)
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Cuando ocurra una acción en la plataforma, enviaremos un HTTP POST automático a tu servidor o flujo de Make / Zapier.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveWebhookConfig}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition border border-gray-700"
                >
                  Guardar Configuración
                </button>

                <button
                  onClick={handleSendTestWebhook}
                  disabled={isDispatchingWebhook || !webhookUrl}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDispatchingWebhook ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Disparar Webhook de Prueba</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  URL de Destino del Webhook (Payload URL)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hook.eu1.make.com/tu-webhook-secreto"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Secreto HMAC SHA-256 (Signature Secret)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookSecret, 'wh_sec')}
                    className="px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 flex items-center gap-1.5 transition shrink-0"
                  >
                    {copiedId === 'wh_sec' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              {/* Event selection checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Eventos Suscritos
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'order.created', label: 'order.created (Pedido Creado)' },
                    { id: 'order.updated', label: 'order.updated (Estado de Pedido)' },
                    { id: 'customer.new', label: 'customer.new (Nuevo Lead / Cliente)' },
                    { id: 'whatsapp.message_received', label: 'whatsapp.message_received (Mensaje WhatsApp)' },
                    { id: 'appointment.created', label: 'appointment.created (Cita Agendada)' },
                    { id: 'payment.confirmed', label: 'payment.confirmed (Pago Verificado)' }
                  ].map(evt => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => toggleEvent(evt.id)}
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                        subscribedEvents.includes(evt.id)
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="font-mono">{evt.label}</span>
                      {subscribedEvents.includes(evt.id) && (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Test result box */}
            {webhookTestResult && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                webhookTestResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>
                    {webhookTestResult.success ? '✓ Webhook entregado con éxito' : '✗ Falló la entrega del webhook'}
                  </span>
                  <span className="font-mono">
                    HTTP Status: {webhookTestResult.statusCode || 500} • {webhookTestResult.latencyMs || 0} ms
                  </span>
                </div>
                <div className="font-mono text-xs bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-gray-300">
                  {JSON.stringify(webhookTestResult, null, 2)}
                </div>
              </div>
            )}
          </div>

          {/* Inbound Webhooks (Receiving data into Xorbit 360) */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database size={18} className="text-blue-400" />
                  Webhooks Entrantes (Inbound - Para recibir datos externos)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Usa esta URL para que pasarelas de pago (Stripe, Mercado Pago, Wompi), formularios (Typeform) o tiendas (Shopify) envíen pedidos a Xorbit 360.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                POST
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-gray-950 p-3 rounded-xl border border-gray-800 font-mono text-xs text-white">
              <span className="truncate">{currentDomain}/api/webhooks/incoming</span>
              <button
                onClick={() => copyToClipboard(`${currentDomain}/api/webhooks/incoming`, 'inbound_url')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 flex items-center gap-1.5 shrink-0"
              >
                {copiedId === 'inbound_url' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>Copiar Endpoint</span>
              </button>
            </div>
          </div>

          {/* Recent Webhook Delivery Logs */}
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                Historial de Entregas de Webhooks
              </h3>
              <button
                onClick={fetchWebhookLogs}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>Actualizar Logs</span>
              </button>
            </div>

            {webhookLogs.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Aún no hay registros de envíos de webhooks. Haz clic en "Disparar Webhook de Prueba" arriba para ver la primera entrega.
              </p>
            ) : (
              <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-950 overflow-hidden text-xs">
                {webhookLogs.slice(0, 5).map((log, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-4 font-mono">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.statusCode >= 200 && log.statusCode < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {log.statusCode || 'ERR'}
                      </span>
                      <span className="text-white font-sans font-semibold">{log.event}</span>
                    </div>
                    <div className="text-gray-500 text-[11px]">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Hace un momento'} • {log.latencyMs || 0} ms
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
