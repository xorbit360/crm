import React, { useCallback, useEffect, useState } from 'react';
import { Webhook, Copy, Check, Plus, Trash2, Save, Send, RefreshCw, X, Radio, Inbox } from 'lucide-react';

interface IncomingEndpoint { method: string; path: string; label: string; }
interface OutgoingHook {
  id: string; url: string; events: string[]; active: boolean;
  secretSet: boolean; secretMasked: string | null; lastDelivery: any | null;
}
interface PlatformEvent { id: string; label: string; }

/**
 * Webhooks de la Plataforma (solo super admin):
 * - URLs ENTRANTES: endpoints que la plataforma expone para recibir eventos.
 * - URLs SALIENTES: webhooks globales que la plataforma dispara ante eventos.
 * Todo genérico: cualquier aplicación externa se puede conectar.
 */
export default function PlatformWebhooksTab() {
  const [incoming, setIncoming] = useState<IncomingEndpoint[]>([]);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [hooks, setHooks] = useState<OutgoingHook[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform-webhooks');
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setIncoming(data.incoming || []);
        setEvents(data.events || []);
        setHooks(data.outgoing || []);
        setLogs(data.logs || []);
      }
    } catch { /* silencioso */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyToClipboard = (text: string, id: string) => {
    try { navigator.clipboard.writeText(text); } catch { /* noop */ }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const fullUrl = (path: string) => `${window.location.origin}${path}`;

  const toggleFormEvent = (id: string) => {
    setFormEvents((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const openAdd = () => {
    setEditingId(null); setFormUrl(''); setFormEvents([]); setFormSecret(''); setFormActive(true); setShowForm(true);
  };

  const openEdit = (h: OutgoingHook) => {
    setEditingId(h.id); setFormUrl(h.url); setFormEvents(h.events || []); setFormSecret(''); setFormActive(h.active !== false); setShowForm(true);
  };

  const handleSave = async () => {
    const url = formUrl.trim();
    if (!url || !/^https?:\/\//i.test(url)) { setMessage('Ingresa una URL válida (https://…).'); return; }
    setBusy(true); setMessage(null);
    try {
      const next = hooks.map((h) => h.id === editingId
        ? { id: h.id, url, events: formEvents, active: formActive, ...(formSecret.trim() ? { secret: formSecret.trim() } : {}) }
        : { id: h.id, url: h.url, events: h.events, active: h.active });
      if (!editingId) next.push({ id: `wh_${Date.now()}`, url, events: formEvents, active: formActive, secret: formSecret.trim() } as any);
      const res = await fetch('/api/platform-webhooks', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outgoing: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data?.error || 'No se pudo guardar.');
      setHooks(data.outgoing || []);
      setShowForm(false);
      setMessage('Webhook guardado.');
    } catch (e: any) { setMessage(e?.message || 'Error al guardar.'); }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este webhook?')) return;
    setBusy(true);
    try {
      const next = hooks.filter((h) => h.id !== id).map((h) => ({ id: h.id, url: h.url, events: h.events, active: h.active }));
      const res = await fetch('/api/platform-webhooks', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outgoing: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data?.error || 'No se pudo eliminar.');
      setHooks(data.outgoing || []);
    } catch (e: any) { setMessage(e?.message || 'Error al eliminar.'); }
    setBusy(false);
  };

  const handleTest = async (id: string) => {
    setTestingId(id); setTestResult(null);
    try {
      const res = await fetch('/api/platform-webhooks/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({ id, ...data });
      load();
    } catch (e: any) { setTestResult({ id, success: false, detail: e?.message }); }
    setTestingId(null);
  };

  if (loading) return <div className="text-gray-500 text-sm py-8 text-center">Cargando webhooks…</div>;

  return (
    <div className="space-y-6">
      {/* ===== A. URLs para recibir ===== */}
      <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Inbox size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">URLs para recibir eventos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Endpoints entrantes de la plataforma. Configúralos en el proveedor externo correspondiente.</p>
          </div>
        </div>
        <div className="space-y-2">
          {incoming.map((ep) => (
            <div key={ep.path} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-gray-950 p-3 rounded-xl border border-gray-800">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold shrink-0 w-fit">{ep.method}</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-white truncate">{fullUrl(ep.path)}</div>
                <div className="text-[11px] text-gray-500">{ep.label}</div>
              </div>
              <button
                onClick={() => copyToClipboard(fullUrl(ep.path), ep.path)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 flex items-center gap-1.5 shrink-0"
              >
                {copiedId === ep.path ? <Check size={12} className="text-amber-400" /> : <Copy size={12} />}
                <span>Copiar</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ===== B. Enviar eventos ===== */}
      <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Radio size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Enviar eventos (salientes)</h2>
              <p className="text-xs text-gray-400 mt-0.5">La plataforma envía un POST automático a estas URLs cuando ocurre cada evento.</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center gap-2"
          >
            <Plus size={14} /> Agregar webhook
          </button>
        </div>

        {message && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">{message}</div>}

        {hooks.length === 0 && !showForm && (
          <p className="text-xs text-gray-500 py-4 text-center">Sin webhooks salientes. Agrega el primero para empezar a recibir eventos.</p>
        )}

        <div className="space-y-2">
          {hooks.map((h) => (
            <div key={h.id} className="bg-gray-950 p-3 rounded-xl border border-gray-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs text-white truncate flex-1">{h.url}</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${h.active !== false ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700/40 text-gray-400'}`}>
                  {h.active !== false ? 'Activo' : 'Pausado'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {h.events.map((e) => (
                  <span key={e} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px] font-mono">{e}</span>
                ))}
                {h.secretSet && <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px]">firma HMAC {h.secretMasked || ''}</span>}
              </div>
              {h.lastDelivery && (
                <div className="text-[11px] text-gray-500">
                  Última entrega: <span className={h.lastDelivery.ok ? 'text-amber-300' : 'text-red-400'}>{h.lastDelivery.ok ? '✓' : '✗'} {h.lastDelivery.detail || ''}</span>
                  {' '}· {h.lastDelivery.at ? new Date(h.lastDelivery.at).toLocaleString() : ''}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => handleTest(h.id)} disabled={testingId === h.id}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 flex items-center gap-1.5 disabled:opacity-50">
                  {testingId === h.id ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>Probar</span>
                </button>
                <button onClick={() => openEdit(h)} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300">Editar</button>
                <button onClick={() => handleDelete(h.id)} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-red-900/40 text-xs text-gray-300 hover:text-red-300 flex items-center gap-1">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
              {testResult?.id === h.id && (
                <div className={`text-[11px] rounded-lg px-3 py-2 border ${testResult.success ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  {testResult.success ? '✓ Prueba entregada' : '✗ Falló la prueba'} {testResult.statusCode ? `· HTTP ${testResult.statusCode}` : ''} {testResult.detail ? `· ${testResult.detail}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>

        {showForm && (
          <div className="bg-gray-950 p-4 rounded-xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{editingId ? 'Editar webhook' : 'Nuevo webhook'}</span>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">URL de destino</label>
              <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://tu-servidor.com/webhook"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Eventos</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {events.map((e) => (
                  <button key={e.id} type="button" onClick={() => toggleFormEvent(e.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${formEvents.includes(e.id) ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}>
                    <span className="font-mono">{e.id}</span>
                    {formEvents.includes(e.id) && <Check size={14} className="text-amber-400 shrink-0" />}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Sin eventos seleccionados = no se envía nada.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Secreto HMAC (opcional)</label>
              <input type="text" value={formSecret} onChange={(e) => setFormSecret(e.target.value)}
                placeholder={editingId ? 'Vacío = conservar el actual' : 'Para firmar con X-Webhook-Signature'}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-amber-500" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="accent-amber-500" />
              Webhook activo
            </label>
            <button onClick={handleSave} disabled={busy}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center gap-2 disabled:opacity-50">
              <Save size={14} /> {busy ? 'Guardando…' : 'Guardar webhook'}
            </button>
          </div>
        )}

        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Últimas entregas</span>
              <button onClick={load} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><RefreshCw size={12} /> Actualizar</button>
            </div>
            <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-950 overflow-hidden text-xs">
              {logs.slice(0, 8).map((l, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between gap-3 font-mono">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${l.ok ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-400'}`}>{l.status || 'ERR'}</span>
                    <span className="text-white truncate">{l.event}</span>
                  </div>
                  <span className="text-gray-500 text-[10px] shrink-0">{l.at ? new Date(l.at).toLocaleTimeString() : ''} · {l.ms || 0}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray-500">
          <Webhook size={11} className="inline mr-1" />
          Cada evento se envía como POST JSON <span className="font-mono">{'{event, occurred_at, data}'}</span>. Si defines un secreto, el cuerpo va firmado en el header <span className="font-mono">X-Webhook-Signature</span> (HMAC-SHA256).
        </p>
      </div>
    </div>
  );
}
