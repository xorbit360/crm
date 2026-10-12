import React, { useEffect, useState } from 'react';
import {
  MessageCircle, MessageSquare, Camera, AtSign, Link2, Filter,
  Send, Zap, Plus, Trash2, Calendar, BarChart3, RefreshCw,
  Check, X, Sparkles, ChevronLeft, Power,
} from 'lucide-react';

type TabId = 'automatizaciones' | 'contenido' | 'embudo';

const ORIGIN_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  dm: { label: 'DM', icon: <MessageCircle size={12} />, cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  comment: { label: 'Comentario', icon: <MessageSquare size={12} />, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  story_reply: { label: 'Historia', icon: <Camera size={12} />, cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  mention: { label: 'Mención', icon: <AtSign size={12} />, cls: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  referral: { label: 'Referido', icon: <Link2 size={12} />, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
};

function OriginBadge({ origin }: { origin: string }) {
  const m = ORIGIN_META[origin] || ORIGIN_META.dm;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  );
}

const inputCls = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold/60';
const btnGold = 'inline-flex items-center gap-2 bg-gold text-black text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50';

/* ================= AUTOMATIZACIONES ================= */
function Automatizaciones() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ type: 'comment_to_dm', name: '', keywords: '', dmMessage: '', commentReply: '', aiPrompt: '' });
  const [icePrompts, setIcePrompts] = useState<string[]>(['', '', '', '']);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const ra = await fetch('/api/social/accounts');
      const ja = await ra.json();
      if (ja.success && ja.accounts?.length) {
        setAccounts(ja.accounts);
        setAccountId((p) => p || String(ja.accounts[0].id || ja.accounts[0].accountId || ''));
      }
      const rb = await fetch('/api/social/automations');
      const jb = await rb.json();
      if (jb.success) setAutomations(jb.automations || []);
    } catch { /* noop */ }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!accountId) { alert('Elige cuenta'); return; }
    if ((form.type === 'comment_ai' || form.type === 'comment_sentiment') && !form.aiPrompt.trim()) { alert('Escribe el prompt para la IA'); return; }
    if (form.type !== 'comment_ai' && form.type !== 'comment_sentiment' && !form.dmMessage.trim()) { alert('Escribe el mensaje'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/social/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, accountId, keywords: form.keywords.split(',').map((s) => s.trim()).filter(Boolean) }),
      });
      const j = await r.json();
      if (j.success) { setShowNew(false); setForm({ type: 'comment_to_dm', name: '', keywords: '', dmMessage: '', commentReply: '', aiPrompt: '' }); await load(); }
      else alert(j.error || 'No se pudo crear');
    } catch { alert('Error de red'); }
    setSaving(false);
  };

  const toggle = async (a: any) => {
    try {
      const r = await fetch(`/api/social/automations/${encodeURIComponent(a.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      const j = await r.json();
      if (j.success) await load(); else alert(j.error || 'No se pudo cambiar');
    } catch { alert('Error de red'); }
  };

  const remove = async (a: any) => {
    if (!confirm('¿Eliminar esta automatización?')) return;
    await fetch(`/api/social/automations/${encodeURIComponent(a.id)}`, { method: 'DELETE' });
    await load();
  };

  const saveIce = async () => {
    if (!accountId) return;
    setSaving(true);
    try {
      const r = await fetch('/api/social/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ice_breakers', accountId, prompts: icePrompts.filter((p) => p.trim()) }),
      });
      const j = await r.json();
      if (j.success) { alert('Ice breakers guardados ✅'); await load(); }
      else alert(j.error || 'No se pudo guardar');
    } catch { alert('Error de red'); }
    setSaving(false);
  };

  const TYPE_LABEL: Record<string, string> = {
    comment_to_dm: 'Comment-to-DM', comment_ai: 'Respuesta IA a comentarios', comment_sentiment: 'Sentimiento automatico', story_mention: 'Mención en historia', story_reply: 'Respuesta a historia', ice_breakers: 'Ice breakers',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
          {accounts.map((a) => <option key={a.id || a.accountId} value={a.id || a.accountId}>@{a.username || a.name} ({a.platform})</option>)}
        </select>
        <button onClick={() => setShowNew(!showNew)} className={btnGold}><Plus size={15} /> Nueva automatización</button>
      </div>

      {showNew && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="comment_to_dm">💬 Comment-to-DM (palabra clave → DM)</option>
              <option value="comment_ai">🤖 Respuesta con IA a comentarios (prompt)</option>
              <option value="comment_sentiment">Sentimiento automatico (positivo/negativo/neutro)</option>
              <option value="story_mention">📸 Mención en historia → DM</option>
              <option value="story_reply">↩️ Respuesta a historia → DM</option>
            </select>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej. Promo zapatos)" className={inputCls} />
          </div>
          {form.type === 'comment_to_dm' && (
            <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="Palabras clave separadas por coma (ej. precio, info, quiero)" className={inputCls} />
          )}
          {(form.type === 'comment_ai' || form.type === 'comment_sentiment') && (
            <textarea value={form.aiPrompt} onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })} rows={3}
              placeholder="Prompt para la IA (ej. Responde amable, ofrece ayuda y si preguntan precio invítalos al DM)" className={inputCls} />
          )}
          {(form.type !== 'comment_ai' && form.type !== 'comment_sentiment') && (
          <textarea value={form.dmMessage} onChange={(e) => setForm({ ...form, dmMessage: e.target.value })} rows={2}
            placeholder="Mensaje del DM — puedes usar {{first_name}} (ej. ¡Hola {{first_name}}! Aquí va tu info 👇)" className={inputCls} />
          )}
          {form.type === 'comment_sentiment' && (
            <div className="text-xs text-gray-400 bg-gray-900/60 border border-gray-800 rounded-lg p-3 space-y-1">
              <p><b className="text-red-300">Negativo:</b> oculta el comentario y crea tarjeta en el embudo Comentarios.</p>
              <p><b className="text-green-300">Positivo:</b> like + respuesta publica con IA + DM (si escribes mensaje abajo).</p>
              <p><b className="text-gray-300">Neutro:</b> solo like.</p>
            </div>
          )}
          {form.type === 'comment_sentiment' && (
            <textarea value={form.dmMessage} onChange={(e) => setForm({ ...form, dmMessage: e.target.value })} rows={2}
              placeholder="DM para comentarios POSITIVOS (opcional)" className={inputCls} />
          )}
          {form.type === 'comment_to_dm' && (
            <input value={form.commentReply} onChange={(e) => setForm({ ...form, commentReply: e.target.value })}
              placeholder="Respuesta pública opcional (ej. ¡Revisa tus DMs! 📩)" className={inputCls} />
          )}
          <div className="flex gap-2">
            <button onClick={create} disabled={saving} className={btnGold}><Zap size={15} /> Activar</button>
            <button onClick={() => setShowNew(false)} className="text-sm text-gray-400 px-3">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-100 mb-1 flex items-center gap-2"><Sparkles size={15} className="text-gold" /> Ice breakers (saludo inicial de Instagram)</div>
        <p className="text-xs text-gray-500 mb-3">Hasta 4 preguntas que aparecen al abrir el chat. Máx 80 caracteres c/u.</p>
        <div className="space-y-2">
          {icePrompts.map((p, i) => (
            <input key={i} value={p} maxLength={80} onChange={(e) => { const c = [...icePrompts]; c[i] = e.target.value; setIcePrompts(c); }}
              placeholder={`Pregunta ${i + 1} (ej. ¿Qué producto buscas?)`} className={inputCls} />
          ))}
        </div>
        <button onClick={saveIce} disabled={saving} className={`${btnGold} mt-3`}><Check size={15} /> Guardar ice breakers</button>
      </div>

      <div className="space-y-2">
        {automations.map((a) => (
          <div key={a.id} className="bg-gray-950 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
            <button onClick={() => toggle(a)} title={a.isActive ? 'Pausar' : 'Activar'}
              className={`w-10 h-6 rounded-full relative transition-colors ${a.isActive ? 'bg-emerald-500' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${a.isActive ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-100">{a.name}</div>
              <div className="text-xs text-gray-500">{TYPE_LABEL[a.type] || a.type}{(a.type === 'comment_ai' || a.type === 'comment_sentiment') ? ' · 🤖' : (a.keywords?.length ? ` · "${a.keywords.join(', ')}"` : '')}</div>
            </div>
            <button onClick={() => remove(a)} className="text-gray-500 hover:text-red-400"><Trash2 size={15} /></button>
          </div>
        ))}
        {automations.length === 0 && <div className="text-sm text-gray-500 text-center py-6">Sin automatizaciones. Crea la primera arriba 👆</div>}
      </div>
    </div>
  );
}

/* ================= CONTENIDO ================= */
function Contenido() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [publishing, setPublishing] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [refMsg, setRefMsg] = useState('');
  const [refUrl, setRefUrl] = useState('');

  const load = async () => {
    try {
      const ra = await fetch('/api/social/accounts');
      const ja = await ra.json();
      if (ja.success) setAccounts(ja.accounts || []);
      const rs = await fetch('/api/social/scheduled');
      const js = await rs.json();
      if (js.success) setScheduled(js.data?.posts || js.data || []);
    } catch { /* noop */ }
  };
  useEffect(() => { load(); }, []);

  const toggleSel = (id: string) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const publish = async () => {
    if (!content.trim() || !sel.length) { alert('Escribe el contenido y elige al menos una cuenta'); return; }
    setPublishing(true);
    try {
      const platforms = sel.map((id) => accounts.find((a) => String(a.id || a.accountId) === id)?.platform || 'instagram');
      const r = await fetch('/api/social/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content, accountIds: sel, platforms,
          publishNow: !scheduledFor, scheduledFor: scheduledFor || undefined,
          timezone: 'America/Bogota',
        }),
      });
      const j = await r.json();
      if (j.success) { setContent(''); setScheduledFor(''); alert(scheduledFor ? 'Programado ✅' : 'Publicado ✅'); await load(); }
      else alert(j.error || 'No se pudo publicar');
    } catch { alert('Error de red'); }
    setPublishing(false);
  };

  const loadAnalytics = async () => {
    try {
      const r = await fetch(`/api/social/analytics?period=30d${sel[0] ? `&accountId=${sel[0]}` : ''}`);
      const j = await r.json();
      if (j.success) setAnalytics(j.data);
      else alert(j.error || 'No se pudo cargar analítica');
    } catch { alert('Error de red'); }
  };

  const createRef = async () => {
    if (!sel[0] || !refCode.trim()) { alert('Elige una cuenta y escribe el código'); return; }
    try {
      const r = await fetch('/api/social/reflinks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: sel[0], ref: refCode, message: refMsg || undefined }),
      });
      const j = await r.json();
      if (j.success) setRefUrl(j.url);
      else alert(j.error || 'No se pudo crear');
    } catch { alert('Error de red'); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-gray-100 flex items-center gap-2"><Calendar size={15} className="text-gold" /> Publicar / programar</div>
        <div className="flex gap-2 flex-wrap">
          {accounts.map((a) => {
            const id = String(a.id || a.accountId);
            const on = sel.includes(id);
            return (
              <button key={id} onClick={() => toggleSel(id)}
                className={`text-xs px-2.5 py-1.5 rounded-full border flex items-center gap-1 ${on ? 'bg-gold/15 text-gold border-gold/40' : 'text-gray-400 border-gray-700'}`}>
                {on && <Check size={12} />}@{a.username || a.name} <span className="opacity-60">({a.platform})</span>
              </button>
            );
          })}
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="¿Qué quieres publicar hoy? ✍️" className={inputCls} />
        <div className="flex gap-2 flex-wrap items-center">
          <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
          <button onClick={publish} disabled={publishing} className={btnGold}><Send size={15} /> {scheduledFor ? 'Programar' : 'Publicar ahora'}</button>
        </div>
      </div>

      {scheduled.length > 0 && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-100 mb-2">Programados ({scheduled.length})</div>
          <div className="space-y-1.5">
            {scheduled.slice(0, 10).map((p: any, i: number) => (
              <div key={i} className="text-xs text-gray-400 flex justify-between gap-2">
                <span className="truncate">{p.content || p.text || '(sin texto)'}</span>
                <span className="shrink-0 text-gold">{p.scheduledFor || p.scheduled_for || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-100 mb-2 flex items-center gap-2"><BarChart3 size={15} className="text-gold" /> Analítica social</div>
        <button onClick={loadAnalytics} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg">Cargar últimos 30 días</button>
        {analytics && <pre className="mt-2 text-[11px] text-gray-400 bg-black/40 rounded-lg p-3 overflow-x-auto max-h-48">{JSON.stringify(analytics, null, 1).slice(0, 1500)}</pre>}
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-gray-100 flex items-center gap-2"><Link2 size={15} className="text-gold" /> Enlace ig.me de referido</div>
        <div className="grid grid-cols-2 gap-2">
          <input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="Código (ej. promo-navidad)" className={inputCls} />
          <input value={refMsg} onChange={(e) => setRefMsg(e.target.value)} placeholder="Mensaje de bienvenida (opcional)" className={inputCls} />
        </div>
        <button onClick={createRef} className={btnGold}><Plus size={15} /> Crear enlace</button>
        {refUrl && (
          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-2.5">
            <code className="text-xs text-emerald-300 flex-1 break-all">{refUrl}</code>
            <button onClick={() => navigator.clipboard?.writeText(refUrl)} className="text-xs text-gold hover:underline shrink-0">Copiar</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= EMBUDO COMENTARIOS (kanban) ================= */
function EmbudoComentarios() {
  const [funnel, setFunnel] = useState<{ columns: { id: string; label: string }[]; cards: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/social/comment-funnel');
      const j = await r.json();
      if (j.success) setFunnel(j.funnel);
    } catch { /* noop */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const move = async (cardId: string, columnId: string) => {
    try {
      const r = await fetch('/api/social/comment-funnel/move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, columnId }),
      });
      const j = await r.json();
      if (j.success) await load();
    } catch { /* noop */ }
  };
  if (loading) return <div className="text-gray-400 text-sm p-4">Cargando embudo...</div>;
  if (!funnel) return <div className="text-gray-400 text-sm p-4">No se pudo cargar el embudo.</div>;
  const cols = funnel.columns || [];
  const cards = funnel.cards || [];
  const sentColor = (s: string) => s === 'negativo' ? 'bg-red-500/15 text-red-300 border-red-500/30' : s === 'positivo' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-gray-500/15 text-gray-300 border-gray-500/30';
  const sentIcon = (s: string) => s === 'negativo' ? '😡' : s === 'positivo' ? '😍' : '😐';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Embudo Comentarios <span className="text-gray-500 font-normal">({cards.length})</span></h3>
        <button onClick={load} className="text-xs text-gold hover:underline flex items-center gap-1"><RefreshCw size={12} /> Actualizar</button>
      </div>
      {cards.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-8 bg-gray-950 border border-gray-800 rounded-xl">
          Sin tarjetas. Los comentarios negativos detectados por el modo "Sentimiento automático" aparecerán aquí.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {cols.map((col, ci) => {
          const colCards = cards.filter((c: any) => c.columnId === col.id);
          return (
            <div key={col.id} className="bg-gray-950 border border-gray-800 rounded-xl p-3">
              <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">{col.label} ({colCards.length})</div>
              <div className="space-y-2">
                {colCards.map((c: any) => (
                  <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sentColor(c.sentiment)}`}>{sentIcon(c.sentiment)} {c.sentiment}</span>
                      <span className="text-[10px] text-gray-500">{c.platform || ''}</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-snug">"{String(c.text || '').slice(0, 160)}"</p>
                    <div className="text-[10px] text-gray-500">👤 {c.author || '—'} · {c.at ? new Date(c.at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    <div className="flex gap-1 pt-1">
                      {ci > 0 && (
                        <button onClick={() => move(c.id, cols[ci - 1].id)} className="text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700">◀ {cols[ci - 1].label}</button>
                      )}
                      {ci < cols.length - 1 && (
                        <button onClick={() => move(c.id, cols[ci + 1].id)} className="text-[10px] px-2 py-1 rounded bg-gold/15 text-gold hover:bg-gold/25">{cols[ci + 1].label} ▶</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= VISTA PRINCIPAL ================= */
export default function SocialView() {
  const [tab, setTab] = useState<TabId>('automatizaciones');
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'automatizaciones', label: 'Automatizaciones', icon: <Zap size={15} /> },
    { id: 'contenido', label: 'Contenido', icon: <Calendar size={15} /> },
    { id: 'embudo', label: 'Embudo Comentarios', icon: <Filter size={15} /> },
  ];
  return (
    <div>
      <div className="flex gap-1 mb-4 bg-gray-950 border border-gray-800 rounded-xl p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${tab === t.id ? 'bg-gold/15 text-gold' : 'text-gray-400 hover:text-gray-200'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === 'automatizaciones' && <Automatizaciones />}
      {tab === 'contenido' && <Contenido />}
      {tab === 'embudo' && <EmbudoComentarios />}
    </div>
  );
}
