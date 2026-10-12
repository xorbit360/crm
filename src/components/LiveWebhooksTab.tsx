import React, { useEffect, useState } from 'react';
import { Webhook, Plus, Pencil, Trash2, Send, X, Check, AlertTriangle, ChevronDown } from 'lucide-react';

const inputCls = 'w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-gold/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';
const btnGold = 'inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50 cursor-pointer';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800 disabled:opacity-50 cursor-pointer';

const EVENT_LABELS: Record<string, string> = {
  live_started: 'Live iniciado',
  live_ended: 'Live finalizado',
  viewer_joined: 'Espectador nuevo',
  comment_received: 'Comentario recibido',
  lead_captured: 'Lead capturado',
  order_created: 'Pedido creado',
  whatsapp_click: 'Clic en WhatsApp',
  checkout_started: 'Checkout iniciado',
};

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  hasSecret: boolean;
  secretMasked: string | null;
  lastDelivery: { ok: boolean; at: string; status?: number; detail?: string } | null;
}

interface FormState {
  id: string;
  url: string;
  all: boolean;
  events: string[];
  secret: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { id: '', url: '', all: true, events: [], secret: '', active: true };

async function api(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Error de red');
  return json;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

const EXAMPLE_PAYLOAD = `{
  "event": "order_created",
  "occurred_at": "2026-10-12T18:30:00.000Z",
  "live_id": "9f3a…",
  "live_slug": "live-oferta",
  "live_title": "Live de oferta",
  "data": {
    "order": {
      "id": "…", "order_ref": "LIVE-XXXX",
      "product_name": "…", "quantity": 1,
      "total": 89900, "payment_method": "cod",
      "customer_name": "…", "phone": "57300…",
      "city": "…"
    }
  }
}`;

export default function LiveWebhooksTab({ landingId }: { landingId: string }) {
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [events, setEvents] = useState<string[]>(Object.keys(EVENT_LABELS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const j = await api(`/api/live-selling/landings/${landingId}/webhooks`);
      setHooks(j.webhooks || []);
      if (Array.isArray(j.events) && j.events.length) setEvents(j.events);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar los webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [landingId]);

  const persist = async (list: WebhookRow[]) => {
    setSaving(true);
    setError('');
    try {
      const payload = list.map((h) => ({ id: h.id, url: h.url, events: h.events, active: h.active, secret: (form?.id === h.id ? form.secret : '') , all: h.events.includes('all') }));
      // Nota: el secreto solo se reenvía cuando se está editando ese webhook.
      const j = await api(`/api/live-selling/landings/${landingId}/webhooks`, { method: 'PUT', body: JSON.stringify({ webhooks: payload }) });
      setHooks(j.webhooks || []);
      setForm(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const startAdd = () => setForm({ ...EMPTY_FORM });
  const startEdit = (h: WebhookRow) => setForm({ id: h.id, url: h.url, all: h.events.includes('all'), events: h.events.filter((e) => e !== 'all'), secret: '', active: h.active });

  const saveForm = async () => {
    if (!form || !form.url.trim()) { setError('La URL es obligatoria'); return; }
    let url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!/^https:\/\//i.test(url)) { setError('La URL debe ser https'); return; }
    const entry: WebhookRow = {
      id: form.id || `nuevo-${Date.now()}`,
      url,
      events: form.all ? ['all'] : form.events,
      active: form.active,
      hasSecret: !!form.secret || (hooks.find((h) => h.id === form.id)?.hasSecret ?? false),
      secretMasked: null,
      lastDelivery: hooks.find((h) => h.id === form.id)?.lastDelivery || null,
    };
    const list = form.id ? hooks.map((h) => (h.id === form.id ? entry : h)) : [...hooks, entry];
    await persist(list);
  };

  const removeHook = async (id: string) => {
    if (!window.confirm('¿Eliminar este webhook?')) return;
    await persist(hooks.filter((h) => h.id !== id));
  };

  const toggleActive = async (h: WebhookRow) => {
    const list = hooks.map((x) => (x.id === h.id ? { ...x, active: !x.active } : x));
    setHooks(list);
    try {
      await api(`/api/live-selling/landings/${landingId}/webhooks`, {
        method: 'PUT',
        body: JSON.stringify({ webhooks: list.map((w) => ({ id: w.id, url: w.url, events: w.events, active: w.active, secret: '', all: w.events.includes('all') })) }),
      });
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar');
      load();
    }
  };

  const sendTest = async (h: WebhookRow) => {
    setTestingId(h.id);
    setTestMsg(null);
    try {
      const secret = form?.id === h.id ? form.secret : '';
      const j = await api(`/api/live-selling/landings/${landingId}/webhooks/test`, {
        method: 'POST',
        body: JSON.stringify({ url: h.url, secret }),
      });
      setTestMsg({ ok: !!j.success, text: j.detail || (j.success ? 'Prueba entregada' : 'Falló la prueba') });
    } catch (e: any) {
      setTestMsg({ ok: false, text: e.message || 'Error al enviar la prueba' });
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (ev: string) => {
    if (!form) return;
    const has = form.events.includes(ev);
    setForm({ ...form, all: false, events: has ? form.events.filter((e) => e !== ev) : [...form.events, ev] });
  };

  return (
    <div className="space-y-5 pt-5">
      <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
        <div className="flex items-center gap-2">
          <Webhook size={16} className="text-gold" />
          <h3 className="text-sm font-bold text-white">Webhooks salientes</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          Cada evento del live (pedidos, leads, comentarios, clics…) se envía como JSON por POST a las URLs que configures.
          Cualquier aplicación externa puede conectarse: solo necesita recibir el POST y, si configuras un secreto, verificar la firma HMAC.
        </p>
        <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline" onClick={() => setShowHelp(!showHelp)}>
          <ChevronDown size={13} className={showHelp ? 'rotate-180' : ''} /> {showHelp ? 'Ocultar' : 'Ver'} formato del payload y firma
        </button>
        {showHelp && (
          <div className="mt-3 space-y-3">
            <div>
              <p className={labelCls}>Ejemplo de payload (JSON)</p>
              <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">{EXAMPLE_PAYLOAD}</pre>
            </div>
            <div className="text-xs leading-relaxed text-gray-400">
              <p><span className="font-bold text-gray-200">Eventos disponibles:</span> {events.map((e) => <code key={e} className="mx-0.5 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">{e}</code>)}</p>
              <p className="mt-2"><span className="font-bold text-gray-200">Firma HMAC:</span> si defines un secreto, cada envío incluye el header <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">X-Webhook-Signature</code> con el HMAC-SHA256 hexadecimal del cuerpo, calculado con tu secreto. Verifica en tu servidor antes de procesar.</p>
              <p className="mt-1"><span className="font-bold text-gray-200">Notas:</span> solo URLs https · timeout de 10 segundos · sin reintentos automáticos · los envíos no bloquean el live.</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-300">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      {testMsg && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${testMsg.ok ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300' : 'border-red-900/60 bg-red-950/40 text-red-300'}`}>
          {testMsg.ok ? <Check size={14} /> : <AlertTriangle size={14} />} {testMsg.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">URLs configuradas ({hooks.length})</h4>
        <button className={btnGold} onClick={startAdd} disabled={saving}><Plus size={13} /> Agregar webhook</button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Cargando…</p>
      ) : hooks.length === 0 && !form ? (
        <div className="rounded-xl border border-dashed border-gray-800 p-6 text-center text-xs text-gray-500">
          Sin webhooks todavía. Agrega una URL para empezar a recibir los eventos del live en tu sistema externo.
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map((h) => (
            <div key={h.id} className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-white">{h.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {h.events.includes('all') ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">todos los eventos</span>
                    ) : h.events.map((e) => (
                      <span key={e} className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-300">{EVENT_LABELS[e] || e}</span>
                    ))}
                    {h.hasSecret && <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-400">firmado {h.secretMasked || ''}</span>}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Última entrega: {h.lastDelivery ? (
                      <span className={h.lastDelivery.ok ? 'text-emerald-400' : 'text-red-400'}>
                        {h.lastDelivery.ok ? '✓' : '✗'} {fmtDate(h.lastDelivery.at)}{h.lastDelivery.detail ? ` · ${h.lastDelivery.detail}` : ''}
                      </span>
                    ) : 'sin envíos aún'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(h)}
                    title={h.active ? 'Pausar' : 'Activar'}
                    className={`relative h-6 w-11 rounded-full transition ${h.active ? 'bg-gold' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${h.active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <button className={btnGhost} onClick={() => sendTest(h)} disabled={testingId === h.id} title="Enviar prueba">
                    <Send size={13} /> {testingId === h.id ? '…' : 'Probar'}
                  </button>
                  <button className={btnGhost} onClick={() => startEdit(h)} title="Editar"><Pencil size={13} /></button>
                  <button className={btnGhost} onClick={() => removeHook(h.id)} title="Eliminar"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="rounded-xl border border-gold/30 bg-gray-950/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">{form.id ? 'Editar webhook' : 'Nuevo webhook'}</h4>
            <button className={btnGhost} onClick={() => setForm(null)}><X size={13} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>URL destino (https)</label>
              <input className={inputCls} placeholder="https://tu-servidor.com/webhook/live" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Eventos</label>
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" checked={form.all} onChange={(e) => setForm({ ...form, all: e.target.checked, events: e.target.checked ? [] : form.events })} className="h-4 w-4 accent-amber-500" />
                Todos los eventos
              </label>
              {!form.all && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {events.map((ev) => (
                    <label key={ev} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-800 bg-black/30 px-2 py-1.5 text-[11px] text-gray-300">
                      <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="h-3.5 w-3.5 accent-amber-500" />
                      {EVENT_LABELS[ev] || ev}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Secreto de firma (opcional)</label>
              <input type="password" className={inputCls} placeholder={form.id && hooks.find((h) => h.id === form.id)?.hasSecret ? '•••••• (vacío = conservar el actual)' : 'Clave para firmar con HMAC-SHA256'} value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} autoComplete="new-password" />
              <p className="mt-1 text-[11px] text-gray-500">Se envía como header <span className="font-mono">X-Webhook-Signature</span>. Se guarda cifrada.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-amber-500" />
              Webhook activo
            </label>
            <div className="flex gap-2">
              <button className={btnGold} onClick={saveForm} disabled={saving}><Check size={13} /> {saving ? 'Guardando…' : 'Guardar'}</button>
              <button className={btnGhost} onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
