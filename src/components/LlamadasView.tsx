import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall, Volume2, Play, Settings, Bot, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Plus, Search, Clock, FileText, Save, X, Trash2, Pencil, Check, Phone
} from 'lucide-react';

/* ============ Tipos (contrato /api/voice-calls) ============ */
type CallStatus = 'programada' | 'en_curso' | 'confirmada' | 'no_contesto' | 'cancelada' | 'fallida';
type CallOutcome = 'confirmada' | 'cancelada' | 'novedad' | 'reenvio' | 'cambio' | 'reembolso' | 'sin_acuerdo';

interface Campaign {
  id: string;
  name: string;
  purpose?: 'confirmacion' | 'devolucion';
  active: boolean;
  delayMin: number;
  scheduleStart: string;
  scheduleEnd: string;
  maxAttempts: number;
  whatsappFirst: boolean;
  systemPrompt: string;
  voice: string;
}

interface CallSummary {
  id: string;
  customerName: string;
  phone: string;
  campaignName: string;
  status: CallStatus;
  outcome?: CallOutcome | null;
  purpose?: 'confirmacion' | 'devolucion';
  paymentType?: 'cod' | 'anticipado' | 'otro';
  durationSec: number;
  costUsd: number;
  createdAt: string;
}

interface TranscriptLine { role: 'agente' | 'cliente'; text: string; at: string; }

interface CallDetail extends CallSummary {
  transcript: TranscriptLine[];
  recordingUrl: string | null;
  orderId: string | null;
}

interface VoiceInfo { id: string; label: string; }
interface VoiceCfg {
  provider: string;
  voice: string;
  voices: VoiceInfo[];
  googleKeySet: boolean;
  googleKeyMasked: string | null;
}

interface TelConfig {
  platform?: { active: boolean; masterConfigured: boolean };
  googleKeySet: boolean;
  delayDefaultMin: number;
}

/* ============ Telefonía integrada (plataforma) ============ */
interface TenantNumberInfo {
  id: string; phone: string; label: string; verified: boolean; isPrimary: boolean; createdAt: string;
}
interface VoicePackageInfo { id: string; minutes: number; priceCop: number; label: string; }
interface WalletInfo { balanceUsd: number; minutesApprox: number; pricePerMinUsd: number; currency: string; }
interface LedgerEntryInfo {
  id: string; kind: string; amountUsd: number; costUsd: number; marginUsd: number;
  minutes: number | null; reference: string; detail: string; createdAt: string;
}
interface MasterInfo { accountSidMasked: string | null; configured: boolean; enabled: boolean; }
interface PricingInfo { costPerMinUsd: number; markupPct: number; packages: VoicePackageInfo[]; pricePerMinUsd: number; }

/* ============ Utilidades ============ */
const STATUS_LABEL: Record<string, string> = {
  programada: 'Programada',
  en_curso: 'En curso',
  confirmada: 'Confirmada',
  no_contesto: 'No contestó',
  cancelada: 'Cancelada',
  fallida: 'Fallida',
  novedad: 'Con novedad',
  reenvio: 'Reenvío acordado',
  cambio: 'Cambio acordado',
  reembolso: 'Reembolso acordado',
  sin_acuerdo: 'Sin acuerdo',
};

const STATUS_BADGE: Record<string, string> = {
  programada: 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30',
  en_curso: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  confirmada: 'bg-amber-500 text-black border border-amber-400',
  no_contesto: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  cancelada: 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/40',
  fallida: 'bg-red-500/20 text-red-300 border border-red-500/30',
  novedad: 'bg-amber-500/20 text-amber-200 border border-amber-400/50',
  reenvio: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  cambio: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  reembolso: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  sin_acuerdo: 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/40',
};

/** Clave visible de una llamada: manda el resultado fino; si no hay, el estado. */
function displayKey(c: CallSummary): string {
  return c.outcome || c.status;
}

function fmtDuration(sec: number): string {
  if (!sec || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')} min`;
}

function fmtCost(usd: number): string {
  if (usd === undefined || usd === null) return '—';
  return `$${Number(usd).toFixed(4)} USD`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso || '—'; }
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

/* ============ Modal genérico ============ */
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className={`bg-[#121215] border border-gray-800 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-[#121215] rounded-t-2xl">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ============ Modal de detalle de llamada ============ */
function CallDetailModal({ callId, onClose }: { callId: string; onClose: () => void }) {
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const r = await fetch(`/api/voice-calls/calls/${encodeURIComponent(callId)}`);
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.success || !j.call) throw new Error(j?.error || 'No se pudo cargar el detalle de la llamada.');
        if (alive) setCall(j.call);
      } catch (e: any) { if (alive) setError(e?.message || 'Error al cargar.'); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [callId]);

  return (
    <Modal title="Detalle de llamada" onClose={onClose} wide>
      {loading && <p className="text-gray-500 text-sm text-center py-8">Cargando detalle…</p>}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {call && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="font-bold text-white">{call.customerName}</p>
              <p className="text-xs text-gray-400 font-mono">{call.phone}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[displayKey(call)] || STATUS_BADGE[call.status]}`}>
              {STATUS_LABEL[displayKey(call)] || STATUS_LABEL[call.status]}
            </span>
            {call.purpose === 'devolucion' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Devolución</span>
            )}
            {call.paymentType === 'anticipado' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">Pago anticipado</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#18181c] border border-gray-800 rounded-xl p-3">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Campaña</p>
              <p className="text-white font-semibold mt-1">{call.campaignName || '—'}</p>
            </div>
            <div className="bg-[#18181c] border border-gray-800 rounded-xl p-3">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Duración</p>
              <p className="text-white font-semibold mt-1">{fmtDuration(call.durationSec)}</p>
            </div>
            <div className="bg-[#18181c] border border-gray-800 rounded-xl p-3">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Costo</p>
              <p className="text-amber-300 font-semibold mt-1">{fmtCost(call.costUsd)}</p>
            </div>
            <div className="bg-[#18181c] border border-gray-800 rounded-xl p-3">
              <p className="text-gray-500 text-[10px] uppercase font-bold">Fecha</p>
              <p className="text-white font-semibold mt-1">{fmtDate(call.createdAt)}</p>
            </div>
          </div>

          {call.orderId && (
            <p className="text-xs text-gray-400">Pedido asociado: <span className="text-white font-mono font-semibold">{call.orderId}</span></p>
          )}

          {call.recordingUrl && (
            <div>
              <p className="text-xs font-bold text-gray-300 mb-2 uppercase">Grabación</p>
              <audio controls src={`/api/voice-calls/calls/${encodeURIComponent(call.id)}/recording`} className="w-full" />
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-gray-300 mb-2 uppercase">Transcripción</p>
            {call.transcript && call.transcript.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {call.transcript.filter((line) => !String(line.text || '').startsWith('META:')).map((line, i) => (
                  String(line.text || '').startsWith('RESULTADO:')
                    ? (
                      <p key={i} className="text-center text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5 mx-auto w-fit">
                        {String(line.text).replace('RESULTADO: ', 'Resultado: ')}
                      </p>
                    )
                    : (
                      <div key={i} className={`flex items-start gap-2.5 ${line.role === 'cliente' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${line.role === 'agente' ? 'bg-gold-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                          {line.role === 'agente' ? <Bot size={14} /> : <span className="text-[10px] font-bold">C</span>}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${line.role === 'agente' ? 'bg-[#18181d] text-gray-200 border border-gray-800' : 'bg-gold-600 text-white'}`}>
                          <p>{line.text}</p>
                          {line.at && <span className="text-[10px] opacity-60 block text-right mt-1 font-mono">{fmtTime(line.at)}</span>}
                        </div>
                      </div>
                    )
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Aún no hay transcripción para esta llamada.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============ Modal crear/editar campaña ============ */
function CampaignModal({
  campaign, voices, delayDefaultMin, onClose, onSaved,
}: {
  campaign: Campaign | null;
  voices: VoiceInfo[];
  delayDefaultMin: number;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}) {
  const [name, setName] = useState(campaign?.name || '');
  const [purpose, setPurpose] = useState<'confirmacion' | 'devolucion'>(campaign?.purpose === 'devolucion' ? 'devolucion' : 'confirmacion');
  const [active, setActive] = useState(campaign?.active ?? true);
  const [delayMin, setDelayMin] = useState<number>(campaign?.delayMin ?? delayDefaultMin ?? 15);
  const [scheduleStart, setScheduleStart] = useState(campaign?.scheduleStart || '09:00');
  const [scheduleEnd, setScheduleEnd] = useState(campaign?.scheduleEnd || '18:00');
  const [maxAttempts, setMaxAttempts] = useState<number>(campaign?.maxAttempts ?? 3);
  const [whatsappFirst, setWhatsappFirst] = useState(campaign?.whatsappFirst ?? true);
  const [systemPrompt, setSystemPrompt] = useState(campaign?.systemPrompt || '');
  const [voice, setVoice] = useState(campaign?.voice || (voices[0]?.id || ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('La campaña necesita un nombre.'); return; }
    setSaving(true); setError('');
    const payload = {
      name: name.trim(), purpose, active, delayMin: Number(delayMin) || 15,
      scheduleStart, scheduleEnd, maxAttempts: Number(maxAttempts) || 1,
      whatsappFirst, systemPrompt: systemPrompt.trim(), voice: voice.trim(),
    };
    try {
      const url = campaign ? `/api/voice-calls/campaigns/${encodeURIComponent(campaign.id)}` : '/api/voice-calls/campaigns';
      const r = await fetch(url, {
        method: campaign ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success || !j.campaign) throw new Error(j?.error || 'No se pudo guardar la campaña.');
      onSaved(j.campaign);
      onClose();
    } catch (e: any) { setError(e?.message || 'Error al guardar.'); }
    setSaving(false);
  };

  const inputCls = 'w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500';
  const labelCls = 'block text-xs font-bold text-gray-300 mb-1';

  return (
    <Modal title={campaign ? 'Editar campaña' : 'Nueva campaña'} onClose={onClose} wide>
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre de la campaña</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Confirmación COD inmediata" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Propósito de la campaña</label>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value as 'confirmacion' | 'devolucion')} className={inputCls}>
              <option value="confirmacion">Confirmación de pedidos (contraentrega y pago anticipado)</option>
              <option value="devolucion">Devoluciones (acordar reenvío, cambio o reembolso)</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              {purpose === 'devolucion'
                ? 'El agente llama para resolver una devolución y el acuerdo queda registrado en el pedido.'
                : 'El agente confirma el pedido y el resultado se aplica al pedido (confirmado / cancelado / novedad).'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Esperar antes de llamar (minutos)</label>
            <input type="number" min={1} value={delayMin} onChange={(e) => setDelayMin(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Intentos máximos</label>
            <input type="number" min={1} max={10} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Horario de llamadas — desde</label>
            <input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Horario de llamadas — hasta</label>
            <input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Voz del agente</label>
          {voices.length > 0 ? (
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className={inputCls}>
              {voices.map((v) => (<option key={v.id} value={v.id}>{v.label}</option>))}
            </select>
          ) : (
            <input value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="Nombre de la voz (ej: Kore)" className={inputCls} />
          )}
          <p className="text-[11px] text-gray-500 mt-1">La voz se configura en la pestaña Agentes (Proveedor de Voz).</p>
        </div>
        <div>
          <label className={labelCls}>Instrucciones del agente (prompt del sistema)</label>
          <textarea rows={5} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Ej: Eres un asistente amable que confirma pedidos contra entrega. Saluda al cliente por su nombre, confirma la dirección y el monto a pagar al recibir…"
            className={`${inputCls} font-mono text-xs leading-relaxed`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
          <input type="checkbox" checked={whatsappFirst} onChange={(e) => setWhatsappFirst(e.target.checked)} className="accent-amber-500 w-4 h-4" />
          Confirmar primero por WhatsApp
          <span className="text-[11px] text-gray-500">— si el cliente no responde en el tiempo configurado, se dispara la llamada</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-amber-500 w-4 h-4" />
          Campaña activa
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center gap-2">
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar campaña'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============ Modal: nueva llamada de devolución ============ */
function ReturnsCallModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/backoffice/orders', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        setOrders(Array.isArray(j.orders) ? j.orders : []);
      } catch { setOrders([]); }
      setLoading(false);
    })();
  }, []);

  const orderLabel = (o: any) => {
    const name = o.customerName || o.clientName || 'Cliente';
    const phone = o.phone || '';
    const desc = o.products || (Array.isArray(o.items) ? o.items.map((i: any) => `${i.qty || 1}x ${i.name || 'producto'}`).join(', ') : '') || 'pedido';
    const total = Number(o.total ?? o.amount ?? 0);
    return `${name} · ${phone} · ${desc}${total ? ` · $${Math.round(total).toLocaleString('es-CO')}` : ''}`;
  };

  const create = async () => {
    if (!orderId) { setMsg({ ok: false, text: 'Elige el pedido de la devolución.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/voice-calls/returns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo programar la llamada.');
      setMsg({ ok: true, text: 'Llamada de devolución programada: primero WhatsApp y luego la llamada del agente.' });
      onCreated();
      setTimeout(onClose, 1200);
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Error al programar.' }); }
    setBusy(false);
  };

  return (
    <Modal title="Nueva llamada de devolución" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          El agente llamará al cliente para resolver la devolución: acordar un <strong className="text-amber-300">reenvío</strong>, un <strong className="text-amber-300">cambio</strong> o un <strong className="text-amber-300">reembolso</strong>. El acuerdo queda registrado en el pedido.
        </p>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Cargando pedidos…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No hay pedidos del servidor para elegir. Los pedidos del bot y de la tienda aparecen aquí.</p>
        ) : (
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)}
            className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            <option value="">Elige el pedido…</option>
            {orders.map((o: any) => (<option key={String(o.id)} value={String(o.id)}>{orderLabel(o)}</option>))}
          </select>
        )}
        {msg && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${msg.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            <AlertCircle size={16} /> {msg.text}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold">Cancelar</button>
          <button onClick={create} disabled={busy || !orderId}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold">
            {busy ? 'Programando…' : 'Programar llamada'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============ Componente principal ============ */
type TabId = 'panel' | 'campanas' | 'agentes' | 'telefonia';

export default function LlamadasView() {
  const [activeTab, setActiveTab] = useState<TabId>('panel');

  /* --- Datos reales --- */
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [callsError, setCallsError] = useState('');
  const [telCfg, setTelCfg] = useState<TelConfig | null>(null);
  const [loadingTel, setLoadingTel] = useState(true);

  /* --- Filtros panel/historial --- */
  const [search, setSearch] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [detailCallId, setDetailCallId] = useState<string | null>(null);
  const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);
  const [audioErrorId, setAudioErrorId] = useState<string | null>(null);

  /* --- Modal de campaña --- */
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignBusy, setCampaignBusy] = useState(false);

  /* --- Llamada de prueba (telefonía de plataforma) --- */
  const [testTo, setTestTo] = useState('');
  const [testingCall, setTestingCall] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  /* --- Telefonía integrada: plataforma --- */
  const platformActive = Boolean(telCfg?.platform?.active);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myNumbers, setMyNumbers] = useState<TenantNumberInfo[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState('');
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyInfo, setVerifyInfo] = useState<{ phone: string; code: string; message: string } | null>(null);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [numbersMsg, setNumbersMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [packages, setPackages] = useState<VoicePackageInfo[]>([]);
  const [ledger, setLedger] = useState<LedgerEntryInfo[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [buyingPkg, setBuyingPkg] = useState('');
  const [walletMsg, setWalletMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [master, setMaster] = useState<MasterInfo | null>(null);
  const [mSid, setMSid] = useState('');
  const [mToken, setMToken] = useState('');
  const [savingMaster, setSavingMaster] = useState(false);
  const [masterMsg, setMasterMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [pMarkup, setPMarkup] = useState('');
  const [pCost, setPCost] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMsg, setPricingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manualTenant, setManualTenant] = useState('default');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  /* --- Proveedor de Voz (panel existente, sin cambios funcionales) --- */
  const [voiceCfg, setVoiceCfg] = useState<VoiceCfg>(
    { provider: 'google', voice: 'Kore', voices: [], googleKeySet: false, googleKeyMasked: null }
  );
  const [googleKeyInput, setGoogleKeyInput] = useState('');
  const [savingVoice, setSavingVoice] = useState(false);
  const [testText, setTestText] = useState('¡Hola! Soy el asistente de voz de tu tienda. ¿En qué te puedo ayudar hoy?');
  const [testingVoice, setTestingVoice] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState('');
  const [voiceError, setVoiceError] = useState('');

  /* ============ Cargas ============ */
  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true); setCampaignsError('');
    try {
      const r = await fetch('/api/voice-calls/campaigns');
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudieron cargar las campañas.');
      setCampaigns(j.campaigns || []);
    } catch (e: any) { setCampaignsError(e?.message || 'Error al cargar campañas.'); }
    setLoadingCampaigns(false);
  }, []);

  const loadCalls = useCallback(async () => {
    setLoadingCalls(true); setCallsError('');
    try {
      const r = await fetch('/api/voice-calls/calls?limit=50');
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudieron cargar las llamadas.');
      setCalls(j.calls || []);
    } catch (e: any) { setCallsError(e?.message || 'Error al cargar llamadas.'); }
    setLoadingCalls(false);
  }, []);

  const loadTelConfig = useCallback(async () => {
    setLoadingTel(true);
    try {
      const r = await fetch('/api/voice-calls/config');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success) setTelCfg(j);
    } catch { /* silencioso */ }
    setLoadingTel(false);
  }, []);

  /* ============ Telefonía integrada: cargas ============ */
  const loadSessionRole = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/session');
      const j = await r.json().catch(() => null);
      setIsSuperAdmin(Boolean(j?.authenticated && String(j?.user?.role || '').toLowerCase() === 'superadmin'));
    } catch { /* silencioso */ }
  }, []);

  const loadNumbers = useCallback(async () => {
    setLoadingNumbers(true);
    try {
      const r = await fetch('/api/voice-platform/numbers');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success) setMyNumbers(j.numbers || []);
    } catch { /* silencioso */ }
    setLoadingNumbers(false);
  }, []);

  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const r = await fetch('/api/voice-platform/wallet');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success) {
        setWallet(j.wallet || null);
        setPackages(j.packages || []);
      }
      const rl = await fetch('/api/voice-platform/wallet/ledger?limit=30');
      const jl = await rl.json().catch(() => null);
      if (rl.ok && jl?.success) setLedger(jl.ledger || []);
    } catch { /* silencioso */ }
    setLoadingWallet(false);
  }, []);

  const loadMaster = useCallback(async () => {
    try {
      const r = await fetch('/api/voice-platform/master');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success) setMaster(j.master || null);
    } catch { /* silencioso */ }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const r = await fetch('/api/voice-platform/pricing');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success) {
        setPricing(j.pricing || null);
        setPMarkup(String(j.pricing?.markupPct ?? ''));
        setPCost(String(j.pricing?.costPerMinUsd ?? ''));
      }
    } catch { /* silencioso */ }
  }, []);

  const loadPlatform = useCallback(() => {
    loadNumbers(); loadWallet(); loadMaster(); loadPricing();
  }, [loadNumbers, loadWallet, loadMaster, loadPricing]);

  const loadVoiceConfig = useCallback(async () => {
    try {
      const r = await fetch('/api/voice/config');
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success && j.config) setVoiceCfg(j.config);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadCalls();
    loadTelConfig();
    loadVoiceConfig();
    loadSessionRole();
  }, [loadCampaigns, loadCalls, loadTelConfig, loadVoiceConfig, loadSessionRole]);

  useEffect(() => {
    if (platformActive) loadPlatform();
  }, [platformActive, loadPlatform]);

  const refreshAll = () => { loadCalls(); loadCampaigns(); };

  /* ============ Acciones de campaña ============ */
  const toggleCampaign = async (c: Campaign) => {
    setCampaignBusy(true);
    try {
      const r = await fetch(`/api/voice-calls/campaigns/${encodeURIComponent(c.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success || !j.campaign) throw new Error(j?.error || 'No se pudo actualizar la campaña.');
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? j.campaign : x)));
    } catch (e: any) { setCampaignsError(e?.message || 'Error al actualizar.'); }
    setCampaignBusy(false);
  };

  const deleteCampaign = async (c: Campaign) => {
    if (!window.confirm(`¿Eliminar la campaña "${c.name}"? Las llamadas ya realizadas se conservan en el historial.`)) return;
    setCampaignBusy(true);
    try {
      const r = await fetch(`/api/voice-calls/campaigns/${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo eliminar la campaña.');
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e: any) { setCampaignsError(e?.message || 'Error al eliminar.'); }
    setCampaignBusy(false);
  };

  const onCampaignSaved = (c: Campaign) => {
    setCampaigns((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [...prev, c];
    });
  };

  /* ============ Telefonía: guardar + prueba ============ */
  const runTestCall = async () => {
    const to = testTo.trim();
    if (!to) { setTestResult({ ok: false, text: 'Ingresa el número de destino para la llamada de prueba.' }); return; }
    setTestingCall(true); setTestResult(null);
    try {
      const r = await fetch('/api/voice-calls/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo iniciar la llamada de prueba.');
      setTestResult({ ok: true, text: `Llamada de prueba iniciada${j.callId ? ` (id: ${j.callId})` : ''}.` });
      loadCalls();
    } catch (e: any) { setTestResult({ ok: false, text: e?.message || 'Error en la llamada de prueba.' }); }
    setTestingCall(false);
  };

  /* ============ Telefonía integrada: acciones ============ */
  const requestNumberVerification = async () => {
    const phone = newPhone.trim();
    if (!phone) { setNumbersMsg({ ok: false, text: 'Escribe tu número celular.' }); return; }
    setRequestingCode(true); setNumbersMsg(null); setVerifyInfo(null);
    try {
      const r = await fetch('/api/voice-platform/numbers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, label: newPhoneLabel.trim() || 'Mi número' }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo iniciar la verificación.');
      setVerifyInfo({ phone: phone, code: j.code, message: j.message });
      setNewPhone(''); setNewPhoneLabel('');
      loadNumbers();
    } catch (e: any) { setNumbersMsg({ ok: false, text: e?.message || 'Error al solicitar verificación.' }); }
    setRequestingCode(false);
  };

  const confirmNumberVerification = async () => {
    if (!verifyInfo) return;
    setConfirmingCode(true); setNumbersMsg(null);
    try {
      const r = await fetch('/api/voice-platform/numbers/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifyInfo.phone }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'Aún no aparece verificado.');
      setNumbersMsg({ ok: true, text: j.message || 'Número verificado.' });
      setVerifyInfo(null);
      loadNumbers();
    } catch (e: any) { setNumbersMsg({ ok: false, text: e?.message || 'Error al confirmar.' }); }
    setConfirmingCode(false);
  };

  const setPrimaryNumber = async (id: string) => {
    try {
      const r = await fetch(`/api/voice-platform/numbers/${encodeURIComponent(id)}/primary`, { method: 'PUT' });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo marcar como principal.');
      loadNumbers();
    } catch (e: any) { setNumbersMsg({ ok: false, text: e?.message || 'Error.' }); }
  };

  const deleteNumber = async (id: string, phone: string) => {
    if (!window.confirm(`¿Eliminar el número ${phone}?`)) return;
    try {
      const r = await fetch(`/api/voice-platform/numbers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo eliminar.');
      loadNumbers();
    } catch (e: any) { setNumbersMsg({ ok: false, text: e?.message || 'Error.' }); }
  };

  const ensureBoldCheckoutScript = (): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).BoldCheckout) return Promise.resolve(true);
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
      script.onload = () => resolve(Boolean((window as any).BoldCheckout));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
      setTimeout(() => resolve(Boolean((window as any).BoldCheckout)), 8000);
    });
  };

  const buyPackage = async (pkg: VoicePackageInfo) => {
    setBuyingPkg(pkg.id); setWalletMsg(null);
    try {
      const rt = await fetch('/api/voice-platform/wallet/topup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const jt = await rt.json().catch(() => null);
      if (!rt.ok || !jt?.success) throw new Error(jt?.error || 'No se pudo crear la orden.');
      const okScript = await ensureBoldCheckoutScript();
      if (!okScript) throw new Error('No se pudo cargar la pasarela de pago. Recarga la página e inténtalo nuevamente.');
      const rp = await fetch('/api/integrations/bold/create-payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCop: jt.amountCop, amount: jt.amountCop, currency: 'COP',
          description: jt.description, orderId: jt.orderId,
        }),
      });
      const dp = await rp.json().catch(() => null);
      if (!rp.ok || !dp?.success) throw new Error(dp?.error || 'La pasarela no pudo generar el pago.');
      const apiKey = dp.apiKey || dp.boldConfig?.apiKey;
      const signature = dp.integritySignature || dp.signature;
      if (typeof (window as any).BoldCheckout === 'function' && apiKey && signature) {
        const checkout = new (window as any).BoldCheckout({
          orderId: dp.orderId || jt.orderId,
          currency: 'COP',
          amount: String(jt.amountCop),
          apiKey,
          integritySignature: signature,
          description: jt.description,
          renderMode: 'embedded',
          redirectionUrl: `${window.location.origin}/#/llamadas?payment_status=completed&order=${dp.orderId || jt.orderId}`,
        });
        checkout.open();
        setWalletMsg({ ok: true, text: 'Completa el pago en la ventana de Bold. Tus minutos se acreditan automáticamente al aprobarse.' });
      } else {
        throw new Error('No se pudo abrir la pasarela de pago.');
      }
    } catch (e: any) { setWalletMsg({ ok: false, text: e?.message || 'Error al comprar.' }); }
    setBuyingPkg('');
  };

  const saveMaster = async () => {
    setSavingMaster(true); setMasterMsg(null);
    try {
      const payload: any = {};
      if (mSid.trim()) payload.accountSid = mSid.trim();
      if (mToken.trim()) payload.authToken = mToken.trim();
      if (Object.keys(payload).length === 0) throw new Error('Pega la cuenta y el token maestros.');
      const r = await fetch('/api/voice-platform/master', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo guardar.');
      setMaster(j.master); setMSid(''); setMToken('');
      setMasterMsg({ ok: true, text: 'Cuenta maestra guardada. La telefonía integrada quedó activa.' });
      loadTelConfig();
    } catch (e: any) { setMasterMsg({ ok: false, text: e?.message || 'Error al guardar.' }); }
    setSavingMaster(false);
  };

  const savePricing = async () => {
    setSavingPricing(true); setPricingMsg(null);
    try {
      const payload: any = {};
      if (pMarkup.trim() !== '') payload.markupPct = Number(pMarkup);
      if (pCost.trim() !== '') payload.costPerMinUsd = Number(pCost);
      const r = await fetch('/api/voice-platform/pricing', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo guardar.');
      setPricing(j.pricing);
      setPricingMsg({ ok: true, text: 'Precios actualizados.' });
      loadWallet();
    } catch (e: any) { setPricingMsg({ ok: false, text: e?.message || 'Error al guardar.' }); }
    setSavingPricing(false);
  };

  const manualTopup = async () => {
    const minutes = Math.round(Number(manualMinutes || 0));
    if (!minutes || minutes <= 0) { setPricingMsg({ ok: false, text: 'Indica los minutos a recargar.' }); return; }
    setManualBusy(true);
    try {
      const r = await fetch('/api/voice-platform/wallet/topup-manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: manualTenant.trim() || 'default', minutes }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) throw new Error(j?.error || 'No se pudo recargar.');
      setPricingMsg({ ok: true, text: `Recargados ${minutes} min al tenant ${j.tenantId}.` });
      setManualMinutes('');
    } catch (e: any) { setPricingMsg({ ok: false, text: e?.message || 'Error.' }); }
    setManualBusy(false);
  };

  /* ============ Proveedor de Voz (lógica existente, sin cambios) ============ */
  const saveVoiceConfig = async () => {
    setSavingVoice(true); setVoiceError('');
    try {
      const payload: any = { provider: voiceCfg.provider, voice: voiceCfg.voice };
      if (googleKeyInput.trim()) payload.googleKey = googleKeyInput.trim();
      const r = await fetch('/api/voice/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => null);
      if (!j || !j.success) throw new Error(j?.error || 'No se pudo guardar');
      setVoiceCfg((c: any) => ({ ...c, ...j.config, voices: c.voices.length ? c.voices : (j.config.voices || []) }));
      setGoogleKeyInput('');
    } catch (e: any) { setVoiceError(e?.message || 'Error al guardar'); }
    setSavingVoice(false);
  };

  const testVoice = async () => {
    setTestingVoice(true); setVoiceError(''); setTestAudioUrl('');
    try {
      const r = await fetch('/api/voice/test-tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: testText, voice: voiceCfg.voice }) });
      const j = await r.json().catch(() => null);
      if (!j || !j.success) throw new Error(j?.error || 'No se pudo generar el audio');
      setTestAudioUrl('data:' + (j.mimeType || 'audio/wav') + ';base64,' + j.audioBase64);
    } catch (e: any) { setVoiceError(e?.message || 'Error al generar audio'); }
    setTestingVoice(false);
  };

  /* ============ Filtrado ============ */
  const filteredCalls = calls.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || c.customerName.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
    const matchC = campaignFilter === 'all' || c.campaignName === campaignFilter;
    return matchQ && matchC;
  });

  const kanbanCols: Array<{ id: string; title: string; keys: string[]; accent: string }> = [
    { id: 'programada', title: 'Programadas', keys: ['programada'], accent: 'text-zinc-300' },
    { id: 'en_curso', title: 'En curso', keys: ['en_curso'], accent: 'text-amber-300' },
    { id: 'resueltas', title: 'Resueltas', keys: ['confirmada', 'reenvio', 'cambio', 'reembolso'], accent: 'text-amber-300' },
    { id: 'atencion', title: 'Novedad · Sin acuerdo · Cerradas', keys: ['novedad', 'sin_acuerdo', 'no_contesto', 'cancelada', 'fallida'], accent: 'text-zinc-400' },
  ];

  const campaignNames = Array.from(new Set(calls.map((c) => c.campaignName).filter(Boolean)));

  return (
    <div className="p-4 sm:p-6 bg-[#0c0c0e] text-white min-h-screen space-y-6">

      {/* Encabezado */}
      <div className="bg-gradient-to-r from-amber-950/60 via-[#121216] to-amber-950/60 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-xs font-bold uppercase tracking-wider">
            <PhoneCall size={14} className="text-amber-400" /> Agente telefónico de voz con IA
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Llamadas IA</h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl">
            Confirmación de pedidos contra entrega por llamada de voz automática. Si el cliente no confirma por WhatsApp en el tiempo configurado, el agente lo llama y registra el resultado aquí.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={refreshAll}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            onClick={() => setActiveTab('telefonia')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
          >
            <Settings size={14} /> Configurar telefonía
          </button>
        </div>
      </div>

      {/* Navegación de tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-1 overflow-x-auto no-scrollbar">
        {([
          { id: 'panel', label: 'Panel de llamadas', icon: PhoneCall },
          { id: 'campanas', label: 'Campañas', icon: Plus },
          { id: 'agentes', label: 'Agentes', icon: Bot },
          { id: 'telefonia', label: 'Telefonía', icon: Settings },
        ] as Array<{ id: TabId; label: string; icon: any }>).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#141418] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============ TAB 1: PANEL / EMBUDO ============ */}
      {activeTab === 'panel' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o teléfono…"
                className="w-full pl-9 pr-3 py-2 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-3 py-2 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas las campañas</option>
              {campaignNames.map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
            <button
              onClick={() => setShowReturnsModal(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
            >
              <PhoneCall size={14} /> Llamada de devolución
            </button>
          </div>

          {callsError && (
            <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <AlertCircle size={16} /> {callsError}
              <button onClick={loadCalls} className="ml-auto text-xs font-bold underline">Reintentar</button>
            </div>
          )}

          {loadingCalls ? (
            <p className="text-gray-500 text-sm text-center py-10">Cargando llamadas…</p>
          ) : filteredCalls.length === 0 ? (
            <div className="bg-[#121215] border border-gray-800 rounded-2xl p-10 text-center">
              <PhoneCall size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-300 font-bold">Aún no hay llamadas</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Cuando una campaña programe o realice llamadas, aparecerán aquí. Crea una campaña y configura la telefonía para empezar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {kanbanCols.map((col) => {
                const items = filteredCalls.filter((c) => col.keys.includes(displayKey(c)));
                return (
                  <div key={col.id} className="bg-[#121215] border border-gray-800 rounded-2xl p-3 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${col.accent}`}>{col.title}</h3>
                      <span className="text-[10px] bg-gray-800 text-gray-300 font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-[11px] text-gray-600 text-center py-4">Sin llamadas</p>
                    ) : (
                      items.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setDetailCallId(c.id)}
                          className="w-full text-left bg-[#18181c] hover:bg-[#1d1d22] border border-gray-800 hover:border-amber-500/40 rounded-xl p-3.5 space-y-1.5 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-white text-sm truncate">{c.customerName}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${STATUS_BADGE[displayKey(c)] || STATUS_BADGE[c.status]}`}>
                              {STATUS_LABEL[displayKey(c)] || STATUS_LABEL[c.status]}
                            </span>
                          </div>
                          {(c.purpose === 'devolucion' || c.paymentType === 'anticipado') && (
                            <div className="flex gap-1">
                              {c.purpose === 'devolucion' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">DEVOLUCIÓN</span>}
                              {c.paymentType === 'anticipado' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">PAGO ANTICIPADO</span>}
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400 font-mono">{c.phone}</p>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                            <span className="truncate text-amber-300/90">{c.campaignName || 'Sin campaña'}</span>
                            <span className="flex items-center gap-1 shrink-0"><Clock size={11} /> {fmtDate(c.createdAt)}</span>
                          </div>
                          {c.durationSec > 0 && (
                            <p className="text-[11px] text-gray-500">Duración: <span className="text-gray-300">{fmtDuration(c.durationSec)}</span></p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 2: CAMPAÑAS ============ */}
      {activeTab === 'campanas' && (
        <div className="space-y-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Campañas de llamadas automáticas</h3>
                <p className="text-xs text-gray-400">Cada campaña define cuándo llamar, qué decir y con qué voz. El disparo lo hace el backend según los pedidos.</p>
              </div>
              <button
                onClick={() => { setEditingCampaign(null); setShowCampaignModal(true); }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Plus size={16} /> Crear campaña
              </button>
            </div>

            {campaignsError && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-4">
                <AlertCircle size={16} /> {campaignsError}
              </div>
            )}

            {loadingCampaigns ? (
              <p className="text-gray-500 text-sm text-center py-8">Cargando campañas…</p>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Bot size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-sm text-gray-300 font-bold">Aún no hay campañas</p>
                <p className="text-xs text-gray-500 mt-1">Crea la primera para empezar a confirmar pedidos por voz.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((c) => (
                  <div key={c.id} className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border ${
                        c.active
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-gray-700/40 text-gray-400 border-gray-700'
                      }`}>
                        {c.active ? 'Activa' : 'Pausada'}
                      </span>
                      <button
                        onClick={() => toggleCampaign(c)}
                        disabled={campaignBusy}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${c.active ? 'bg-amber-500' : 'bg-gray-700'}`}
                        title={c.active ? 'Pausar campaña' : 'Activar campaña'}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${c.active ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-base">{c.name}</h4>
                      {c.purpose === 'devolucion'
                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">DEVOLUCIONES</span>
                        : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">CONFIRMACIÓN</span>}
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Espera <strong className="text-gray-200">{c.delayMin} min</strong> · Horario <strong className="text-gray-200">{c.scheduleStart}–{c.scheduleEnd}</strong></p>
                      <p>Máx. <strong className="text-gray-200">{c.maxAttempts}</strong> intentos · Voz <strong className="text-gray-200">{c.voice || '—'}</strong></p>
                      <p>{c.whatsappFirst ? <span className="text-amber-400">✓ Confirma primero por WhatsApp</span> : <span className="text-gray-500">Llama directo (sin WhatsApp previo)</span>}</p>
                    </div>
                    {c.systemPrompt && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 border-t border-gray-800 pt-2">{c.systemPrompt}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => { setEditingCampaign(c); setShowCampaignModal(true); }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={() => deleteCampaign(c)}
                        disabled={campaignBusy}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/40 text-gray-300 hover:text-red-300 rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TAB 3: AGENTES (Proveedor de Voz) ============ */}
      {activeTab === 'agentes' && (
        <div className="space-y-4">
          <div className="bg-[#121215] border border-amber-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Volume2 size={18} className="text-amber-400" /> Proveedor de Voz
              </h3>
              {voiceCfg.googleKeySet ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full">
                  <Check size={12} className="inline mr-1" />Clave guardada {voiceCfg.googleKeyMasked || ''}
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">Sin clave configurada</span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Las voces del proveedor de voz se usan en las llamadas de las campañas. Configúralas aquí y escucha cómo suenan antes de activarlas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-semibold">Proveedor</label>
                <select value={voiceCfg.provider} onChange={(e) => setVoiceCfg({ ...voiceCfg, provider: e.target.value })}
                  className="mt-1 w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="google">Proveedor de voz (en vivo, para llamadas)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-semibold">Voz</label>
                <select value={voiceCfg.voice} onChange={(e) => setVoiceCfg({ ...voiceCfg, voice: e.target.value })}
                  className="mt-1 w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
                  {voiceCfg.voices.map((v: any) => (<option key={v.id} value={v.id}>{v.label}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-semibold">Clave del proveedor de voz</label>
              <input type="password" value={googleKeyInput} onChange={(e) => setGoogleKeyInput(e.target.value)}
                placeholder={voiceCfg.googleKeySet ? 'Clave guardada: pega otra solo si la vas a reemplazar' : 'Pega tu clave del proveedor de voz'}
                className="mt-1 w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
              <p className="text-[11px] text-gray-500 mt-1">Se guarda cifrada. Sin clave, el agente no puede generar voz.</p>
            </div>
            <div>
              <button onClick={saveVoiceConfig} disabled={savingVoice}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold">
                {savingVoice ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <label className="text-xs text-gray-400 font-semibold">Probar voz</label>
              <div className="flex gap-2 mt-1 flex-col sm:flex-row">
                <input value={testText} onChange={(e) => setTestText(e.target.value)}
                  placeholder="Escribe algo en español para escuchar la voz..."
                  className="flex-1 bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
                <button onClick={testVoice} disabled={testingVoice}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                  <Play size={14} /> {testingVoice ? 'Generando...' : 'Escuchar'}
                </button>
              </div>
              {voiceError && <p className="text-xs text-red-400 mt-2">{voiceError}</p>}
              {testAudioUrl && <audio controls src={testAudioUrl} className="w-full mt-3" />}
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            El comportamiento de cada agente (qué dice, cuándo llama, con qué voz) se define en la pestaña <button onClick={() => setActiveTab('campanas')} className="text-amber-300 underline">Campañas</button>.
          </p>
        </div>
      )}

      {/* ============ Historial (fusionado en el Panel) ============ */}
      {activeTab === 'panel' && (
        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-bold text-white text-base">Historial de llamadas</h3>
            <span className="text-[11px] text-gray-500">{filteredCalls.length} llamada{filteredCalls.length === 1 ? '' : 's'} · duración, costo, transcripción y grabación</span>
          </div>

          {callsError && (
            <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <AlertCircle size={16} /> {callsError}
              <button onClick={loadCalls} className="ml-auto text-xs font-bold underline">Reintentar</button>
            </div>
          )}

          {loadingCalls ? (
            <p className="text-gray-500 text-sm text-center py-8">Cargando historial…</p>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-10">
              <FileText size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-300 font-bold">Aún no hay llamadas</p>
              <p className="text-xs text-gray-500 mt-1">Las llamadas realizadas aparecerán en esta tabla con su transcripción y grabación.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#18181c] text-gray-400 font-bold uppercase text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Cliente / Teléfono</th>
                    <th className="py-3 px-4">Campaña</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Duración</th>
                    <th className="py-3 px-4">Costo</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filteredCalls.map((c) => (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-[#18181c]/60">
                        <td className="py-3 px-4">
                          <strong className="text-white block">{c.customerName}</strong>
                          <span className="text-[11px] text-gray-500 font-mono">{c.phone}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-amber-300">{c.campaignName || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[displayKey(c)] || STATUS_BADGE[c.status]}`}>
                            {STATUS_LABEL[displayKey(c)] || STATUS_LABEL[c.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">{fmtDuration(c.durationSec)}</td>
                        <td className="py-3 px-4 font-mono text-gray-400">{fmtCost(c.costUsd)}</td>
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDetailCallId(c.id)}
                              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                            >
                              <FileText size={12} /> Transcripción
                            </button>
                            <button
                              onClick={() => { setExpandedAudioId(expandedAudioId === c.id ? null : c.id); setAudioErrorId(null); }}
                              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                              title="Reproducir grabación"
                            >
                              <Play size={12} /> Audio
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedAudioId === c.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-2 bg-[#0e0e11]">
                            {audioErrorId === c.id ? (
                              <p className="text-[11px] text-gray-500">No hay grabación disponible para esta llamada.</p>
                            ) : (
                              <audio
                                controls
                                src={`/api/voice-calls/calls/${encodeURIComponent(c.id)}/recording`}
                                className="w-full max-w-xl"
                                onError={() => setAudioErrorId(c.id)}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 5: TELEFONÍA ============ */}
      {activeTab === 'telefonia' && !platformActive && (
        <div className="space-y-4">
          {isSuperAdmin && (
            <div className="bg-[#121215] border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Settings size={18} className="text-amber-400" /> Proveedor maestro Xorbit
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Super Admin</span>
              </h3>
              <p className="text-xs text-gray-400">
                Activa la telefonía integrada: los usuarios conectan su propio número y compran minutos dentro del CRM, sin cuentas externas.
              </p>
              {masterMsg && (
                <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${masterMsg.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  {masterMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {masterMsg.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Cuenta maestra</label>
                  <input type="text" value={mSid} onChange={(e) => setMSid(e.target.value)}
                    placeholder="Identificador de la cuenta maestra"
                    className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Token maestro</label>
                  <input type="password" value={mToken} onChange={(e) => setMToken(e.target.value)}
                    placeholder="Token secreto de la cuenta maestra"
                    className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <button onClick={saveMaster} disabled={savingMaster}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center gap-2">
                <Save size={14} /> {savingMaster ? 'Guardando…' : 'Activar telefonía integrada'}
              </button>
            </div>
          )}
          {!isSuperAdmin && (
            <div className="bg-[#121215] border border-gray-800 rounded-2xl p-6 text-sm text-gray-400">
              La telefonía integrada aún no está activa. El Super Admin debe activarla con la cuenta maestra para que puedas conectar tu número y comprar minutos.
            </div>
          )}
        </div>
      )}

      {/* ============ Telefonía integrada (plataforma) ============ */}
      {activeTab === 'telefonia' && platformActive && (
        <div className="space-y-4">
          {/* Mis números */}
          <div className="bg-[#121215] border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Phone size={18} className="text-amber-400" /> Mis números
            </h3>
            <p className="text-xs text-gray-400">
              Conecta tu número celular como identificador de las llamadas. Te llamaremos para verificarlo con un código.
            </p>
            {numbersMsg && (
              <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${numbersMsg.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                {numbersMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {numbersMsg.text}
              </div>
            )}
            {loadingNumbers ? (
              <p className="text-xs text-gray-500">Cargando números…</p>
            ) : myNumbers.length === 0 ? (
              <p className="text-xs text-gray-500">Aún no tienes números conectados.</p>
            ) : (
              <div className="space-y-2">
                {myNumbers.map((n) => (
                  <div key={n.id} className="flex items-center justify-between bg-[#18181c] border border-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm text-white font-mono font-semibold flex items-center gap-2">
                        {n.phone}
                        {n.isPrimary && n.verified && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Principal</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {n.label} · {n.verified ? <span className="text-amber-400 font-bold">Verificado</span> : <span className="text-amber-300 font-bold">Pendiente de verificación</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {n.verified && !n.isPrimary && (
                        <button onClick={() => setPrimaryNumber(n.id)} className="text-[11px] font-bold text-amber-300 hover:text-amber-200 px-2 py-1">
                          Hacer principal
                        </button>
                      )}
                      <button onClick={() => deleteNumber(n.id, n.phone)} className="text-gray-500 hover:text-red-400 p-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {verifyInfo ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <p className="text-sm text-amber-200 font-bold">Te estamos llamando al {verifyInfo.phone}</p>
                <p className="text-xs text-gray-300">{verifyInfo.message}</p>
                <p className="text-2xl font-mono font-bold text-white tracking-widest text-center py-2">{verifyInfo.code}</p>
                <div className="flex gap-2">
                  <button onClick={confirmNumberVerification} disabled={confirmingCode}
                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold">
                    {confirmingCode ? 'Verificando…' : 'Ya ingresé el código'}
                  </button>
                  <button onClick={() => setVerifyInfo(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-col sm:flex-row">
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="flex-1 bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                <input type="text" value={newPhoneLabel} onChange={(e) => setNewPhoneLabel(e.target.value)}
                  placeholder="Etiqueta (ej: Mi celular)"
                  className="flex-1 bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                <button onClick={requestNumberVerification} disabled={requestingCode}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold">
                  {requestingCode ? 'Llamando…' : 'Verificar número'}
                </button>
              </div>
            )}
          </div>

          {/* Minutos */}
          <div className="bg-[#121215] border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Clock size={18} className="text-amber-400" /> Minutos
              </h3>
              <button onClick={loadWallet} className="text-gray-500 hover:text-white p-1"><RefreshCw size={15} /></button>
            </div>
            {walletMsg && (
              <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${walletMsg.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                {walletMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {walletMsg.text}
              </div>
            )}
            <div className="bg-[#18181c] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 uppercase font-bold">Saldo disponible</p>
                <p className="text-2xl font-bold text-white">
                  {loadingWallet ? '…' : `≈ ${wallet?.minutesApprox ?? 0} min`}
                </p>
                <p className="text-[11px] text-gray-500">${(wallet?.balanceUsd ?? 0).toFixed(2)} USD · ${(wallet?.pricePerMinUsd ?? 0).toFixed(3)} USD/min</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-[#18181c] border border-gray-800 rounded-xl p-4 space-y-2 text-center">
                  <p className="font-bold text-white text-lg">{pkg.label}</p>
                  <p className="text-amber-300 font-bold">${pkg.priceCop.toLocaleString('es-CO')} COP</p>
                  <button onClick={() => buyPackage(pkg)} disabled={buyingPkg !== ''}
                    className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold">
                    {buyingPkg === pkg.id ? 'Abriendo pago…' : 'Comprar'}
                  </button>
                </div>
              ))}
            </div>
            {ledger.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Movimientos recientes</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {ledger.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-xs bg-[#18181c] border border-gray-800/60 rounded-lg px-3 py-2">
                      <span className="text-gray-300 truncate flex-1">{l.detail || l.kind}</span>
                      <span className={`font-mono font-bold ml-2 ${l.amountUsd >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {l.amountUsd >= 0 ? '+' : ''}{l.amountUsd.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Llamada de prueba */}
          <div className="bg-[#121215] border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <PhoneCall size={18} className="text-amber-400" /> Llamada de prueba
            </h3>
            <p className="text-xs text-gray-400">El agente llamará a este número desde tu número principal verificado.</p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input type="tel" value={testTo} onChange={(e) => setTestTo(e.target.value)}
                placeholder="+57 300 123 4567"
                className="flex-1 bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
              <button onClick={runTestCall} disabled={testingCall || !myNumbers.some((n) => n.verified)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-1.5">
                <PhoneCall size={14} /> {testingCall ? 'Llamando…' : 'Hacer llamada de prueba'}
              </button>
            </div>
            {!myNumbers.some((n) => n.verified) && (
              <p className="text-[11px] text-gray-500">Primero verifica un número en “Mis números”.</p>
            )}
            {testResult && (
              <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${testResult.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {testResult.text}
              </div>
            )}
          </div>

          {/* Proveedor maestro + precios (solo Super Admin) */}
          {isSuperAdmin && (
            <>
              <div className="bg-[#121215] border border-amber-500/30 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Settings size={18} className="text-amber-400" /> Proveedor maestro Xorbit
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Super Admin</span>
                </h3>
                {masterMsg && (
                  <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${masterMsg.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {masterMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {masterMsg.text}
                  </div>
                )}
                <div className="text-sm space-y-1">
                  <p className="text-gray-400">Estado: {master?.configured
                    ? <span className="text-amber-400 font-bold">Configurado ({master.accountSidMasked})</span>
                    : <span className="text-amber-300 font-bold">Sin configurar — la telefonía integrada está inactiva</span>}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Cuenta maestra</label>
                    <input type="text" value={mSid} onChange={(e) => setMSid(e.target.value)}
                      placeholder="Identificador de la cuenta maestra"
                      className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Token maestro</label>
                    <input type="password" value={mToken} onChange={(e) => setMToken(e.target.value)}
                      placeholder="Token secreto de la cuenta maestra"
                      className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
                <button onClick={saveMaster} disabled={savingMaster}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center gap-2">
                  <Save size={14} /> {savingMaster ? 'Guardando…' : 'Guardar cuenta maestra'}
                </button>
              </div>

              <div className="bg-[#121215] border border-gray-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Bot size={18} className="text-amber-400" /> Precios y paquetes
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Super Admin</span>
                </h3>
                {pricingMsg && (
                  <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${pricingMsg.ok ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {pricingMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {pricingMsg.text}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Margen sobre costo (%)</label>
                    <input type="number" value={pMarkup} onChange={(e) => setPMarkup(e.target.value)}
                      placeholder="30"
                      className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Costo base por minuto (USD)</label>
                    <input type="number" step="0.001" value={pCost} onChange={(e) => setPCost(e.target.value)}
                      placeholder="0.073"
                      className="w-full bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Precio actual por minuto: <span className="text-white font-bold">${(pricing?.pricePerMinUsd ?? 0).toFixed(4)} USD</span>
                  {' '}· Paquetes: {pricing?.packages.map((p) => `${p.label} ($${p.priceCop.toLocaleString('es-CO')})`).join(' · ')}
                </p>
                <button onClick={savePricing} disabled={savingPricing}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center gap-2">
                  <Save size={14} /> {savingPricing ? 'Guardando…' : 'Guardar precios'}
                </button>
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs font-bold text-gray-300 mb-2">Recarga manual de minutos</p>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <input type="text" value={manualTenant} onChange={(e) => setManualTenant(e.target.value)}
                      placeholder="Tenant (default)"
                      className="flex-1 bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                    <input type="number" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)}
                      placeholder="Minutos"
                      className="w-32 bg-[#18181c] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500" />
                    <button onClick={manualTopup} disabled={manualBusy}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                      {manualBusy ? '…' : 'Recargar'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modales */}
      {detailCallId && <CallDetailModal callId={detailCallId} onClose={() => setDetailCallId(null)} />}
      {showReturnsModal && <ReturnsCallModal onClose={() => setShowReturnsModal(false)} onCreated={() => { loadCalls(); }} />}
      {showCampaignModal && (
        <CampaignModal
          campaign={editingCampaign}
          voices={voiceCfg.voices}
          delayDefaultMin={telCfg?.delayDefaultMin ?? 15}
          onClose={() => { setShowCampaignModal(false); setEditingCampaign(null); }}
          onSaved={onCampaignSaved}
        />
      )}
    </div>
  );
}
