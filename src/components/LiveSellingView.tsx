import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive, BarChart3, Check, Copy, ExternalLink, Eye, Globe, Layers, MessageSquare,
  Pause, Play, Plus, Radio, RefreshCw, Rocket, Save, ShoppingBag, Trash2, Video, X,
} from 'lucide-react';

// ============================================================================
// Live Selling real: landings ilimitadas por usuario, video por URL
// (YouTube/Vimeo), comentarios simulados con tiempos, comentarios y pedidos
// reales guardados, checkout COD y dominio propio por landing.
// ============================================================================

interface LandingCounts { fakeComments: number; visitorComments: number; leads: number; orders: number; whatsappClicks: number }
interface Landing {
  id: string; slug: string; customDomain: string; status: string; title: string;
  liveLabel: string; disclosureText: string; titleBackground: string; buttonText: string; buttonColor: string;
  productName: string; productImageUrl: string; productPrice: number; productComparePrice: number | null;
  shippingPrice: number; shippingText: string; couponCode: string; couponDiscountPercent: number;
  videoProvider: string; videoId: string; videoUrl: string; allowLoop: boolean;
  whatsappNumber: string; whatsappText: string; whatsappLink: string; checkoutMode: string; shopifyUrl: string;
  commentMode: string; viewersMin: number; viewersMax: number;
  domainVerified: boolean; domainStatus: string; counts?: LandingCounts;
}
interface FakeComment { id?: string; author: string; content: string; avatarUrl: string; second: number | null; sortOrder: number }
interface VisitorComment { id: string; content: string; phone: string; visitorId: string; createdAt: string }
interface LiveOrder {
  id: string; orderRef: string; status: string; productName: string; quantity: number;
  total: number; customerName: string; phone: string; city: string; department: string; createdAt: string;
}

type PanelTab = 'config' | 'comments' | 'inbox' | 'metrics' | 'domain';

interface MetricsTotals {
  pageviews: number; whatsappClicks: number; checkoutClicks: number;
  visitorComments: number; leads: number; orders: number;
  leadConversion: number; orderConversion: number;
}
interface MetricsLanding extends MetricsTotals { landingId: string; slug: string; title: string; status: string }
interface MetricsData { days: number; totals: MetricsTotals; landings: MetricsLanding[] }

interface WizardState {
  title: string; slug: string; customDomain: string; videoUrl: string;
  commentsText: string; commentMode: string;
  whatsappLink: string; whatsappNumber: string; whatsappText: string;
  checkoutMode: string; shopifyUrl: string;
  productName: string; productImageUrl: string; productPrice: number;
  productComparePrice: string; shippingPrice: number; shippingText: string;
  buttonText: string; liveLabel: string; allowLoop: boolean; publish: boolean;
}

const inputCls = 'w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-gold/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';
const btnGold = 'inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50 cursor-pointer';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800 disabled:opacity-50 cursor-pointer';

async function api(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

function money(n: number): string {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString('es-CO'); } catch { return iso; }
}

// Detección local (solo para mostrar retroalimentación inmediata en el panel;
// el servidor vuelve a extraer proveedor e ID al guardar).
function detectVideo(raw: string): { provider: string; id: string } | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const yt = value.match(/[?&]v=([A-Za-z0-9_-]{11})/) || value.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) || value.match(/youtube\.com\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/);
  if (yt) return { provider: 'YouTube', id: yt[1] };
  const vm = value.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (vm) return { provider: 'Vimeo', id: vm[1] };
  if (/^\d{6,}$/.test(value)) return { provider: 'Vimeo', id: value };
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return { provider: 'YouTube', id: value };
  return null;
}

// Mismo parseo que el servidor: de un link completo de WhatsApp
// (wa.me/<numero>?text=... o api.whatsapp.com/send?phone=...) se extraen
// numero y mensaje. Los acortadores (wa.link) no se pueden descomponer: el
// link se guarda tal cual y la pagina publica lo abre completo.
function parseWaLink(raw: string): { number: string; text: string } | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();
    let number = '';
    let text = '';
    if (host === 'wa.me' || host.endsWith('.wa.me')) {
      number = url.pathname.replace(/\D/g, '');
      text = url.searchParams.get('text') || '';
    } else if (host.endsWith('whatsapp.com')) {
      number = String(url.searchParams.get('phone') || '').replace(/\D/g, '');
      text = url.searchParams.get('text') || '';
    } else {
      return null;
    }
    if (!number) return null;
    return { number, text };
  } catch { return null; }
}

function slugifyLocal(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseWizardComments(text: string): FakeComment[] {
  return String(text || '').split('\n').map((line, i) => {
    const [author, content, second] = line.split('|').map((p) => (p ?? '').trim());
    return { author: author || '', content: content || '', avatarUrl: '', second: second ? Number(second) : null, sortOrder: i };
  }).filter((r) => r.author && r.content);
}

function toForm(landing: Landing): Landing {
  return { ...landing, videoUrl: landing.videoUrl || landing.videoId || '' };
}

export default function LiveSellingView() {
  const [landings, setLandings] = useState<Landing[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [form, setForm] = useState<Landing | null>(null);
  const [fakeComments, setFakeComments] = useState<FakeComment[]>([]);
  const [visitorComments, setVisitorComments] = useState<VisitorComment[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [tab, setTab] = useState<PanelTab>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [importText, setImportText] = useState('');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsDays, setMetricsDays] = useState(30);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wStep, setWStep] = useState(0);
  const [wBusy, setWBusy] = useState(false);
  const [wiz, setWiz] = useState<WizardState>({
    title: '', slug: '', customDomain: '', videoUrl: '',
    commentsText: '', commentMode: 'countdown',
    whatsappLink: '', whatsappNumber: '', whatsappText: '',
    checkoutMode: 'crm', shopifyUrl: '',
    productName: '', productImageUrl: '', productPrice: 0,
    productComparePrice: '', shippingPrice: 0, shippingText: '',
    buttonText: '¡COMPRAR!', liveLabel: '', allowLoop: true, publish: true,
  });

  const selected = useMemo(() => landings.find((l) => l.id === selectedId) || null, [landings, selectedId]);
  const revenue = useMemo(
    () => orders.filter((o) => o.status !== 'lead').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders],
  );
  const detected = useMemo(() => detectVideo(form?.videoUrl || ''), [form?.videoUrl]);
  const waDetected = useMemo(() => parseWaLink(form?.whatsappLink || ''), [form?.whatsappLink]);
  const wizVideo = useMemo(() => detectVideo(wiz.videoUrl), [wiz.videoUrl]);
  const wizWa = useMemo(() => parseWaLink(wiz.whatsappLink), [wiz.whatsappLink]);
  const publicUrl = form ? `${window.location.origin}/live/${form.slug}` : '';

  async function loadList(preferId?: string) {
    const json = await api('/api/live-selling/landings');
    setLandings(json.landings || []);
    const target = preferId || selectedId || (json.landings?.[0]?.id ?? '');
    if (target && target !== selectedId) setSelectedId(target);
    if (!json.landings?.length) { setForm(null); setSelectedId(''); }
  }

  async function loadDetail(id: string) {
    const json = await api(`/api/live-selling/landings/${id}`);
    setForm(toForm(json.landing));
    setFakeComments(json.fakeComments || []);
    setVisitorComments(json.visitorComments || []);
    setOrders(json.orders || []);
  }

  useEffect(() => {
    (async () => {
      try { await loadList(); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId).catch((e: any) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (tab === 'metrics') loadMetrics(metricsDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, metricsDays]);

  function handleWaLink(value: string) {
    set('whatsappLink', value);
    const parsed = parseWaLink(value);
    if (parsed) {
      set('whatsappNumber', parsed.number);
      if (parsed.text) set('whatsappText', parsed.text);
    }
  }

  function setw<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setWiz((prev) => ({ ...prev, [key]: value }));
  }

  function handleWizWaLink(value: string) {
    setw('whatsappLink', value);
    const parsed = parseWaLink(value);
    if (parsed) {
      setw('whatsappNumber', parsed.number);
      if (parsed.text) setw('whatsappText', parsed.text);
    }
  }

  async function handleWizardFinish() {
    setWBusy(true);
    try {
      const comments = parseWizardComments(wiz.commentsText);
      const payload: Record<string, unknown> = {
        title: wiz.title || 'Nuevo live',
        slug: slugifyLocal(wiz.slug || wiz.title) || `live-${Date.now().toString(36)}`,
        status: 'draft',
        customDomain: wiz.customDomain || undefined,
        videoUrl: wiz.videoUrl,
        allowLoop: wiz.allowLoop,
        liveLabel: wiz.liveLabel || undefined,
        disclosureText: 'Transmisión pregrabada',
        buttonText: wiz.buttonText || '¡COMPRAR!',
        whatsappLink: wiz.whatsappLink,
        whatsappNumber: wizWa?.number || wiz.whatsappNumber,
        whatsappText: wizWa?.text || wiz.whatsappText,
        checkoutMode: wiz.checkoutMode,
        shopifyUrl: wiz.shopifyUrl,
        productName: wiz.productName,
        productImageUrl: wiz.productImageUrl,
        productPrice: Number(wiz.productPrice) || 0,
        productComparePrice: wiz.productComparePrice === '' ? null : Number(wiz.productComparePrice),
        shippingPrice: Number(wiz.shippingPrice) || 0,
        shippingText: wiz.shippingText,
        commentMode: wiz.commentMode,
        fakeComments: comments,
      };
      const json = await api('/api/live-selling/landings', { method: 'POST', body: JSON.stringify(payload) });
      const newId = json.landing.id as string;
      if (wiz.publish) {
        await api(`/api/live-selling/landings/${newId}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
      }
      setWizardOpen(false);
      setWStep(0);
      await loadList(newId);
      setSelectedId(newId);
      flash(wiz.publish ? 'Embudo Live publicado: ya esta en vivo.' : 'Embudo Live creado en borrador. Activalo cuando quieras.');
    } catch (e: any) { fail(e); } finally { setWBusy(false); }
  }

  async function loadMetrics(days: number) {
    setMetricsLoading(true);
    try {
      const json = await api(`/api/live-selling/metrics?days=${days}`);
      setMetrics(json);
    } catch (e: any) { fail(e); } finally { setMetricsLoading(false); }
  }

  function flash(ok: string) { setError(''); setMessage(ok); setTimeout(() => setMessage(''), 3500); }
  function fail(e: any) { setMessage(''); setError(e?.message || 'Ocurrió un error'); }

  async function handleCreate() {
    setSaving(true);
    try {
      const slug = `live-${Date.now().toString(36)}`;
      const json = await api('/api/live-selling/landings', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nuevo live', slug, status: 'draft', videoUrl: '', disclosureText: 'Transmisión pregrabada' }),
      });
      await loadList(json.landing.id);
      setSelectedId(json.landing.id);
      flash('Landing creada. Configúrala y actívala cuando esté lista.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  function landingPayload(source: Landing) {
    return {
      title: source.title, slug: source.slug, status: source.status,
      liveLabel: source.liveLabel, disclosureText: source.disclosureText,
      titleBackground: source.titleBackground, buttonText: source.buttonText, buttonColor: source.buttonColor,
      productName: source.productName, productImageUrl: source.productImageUrl,
      productPrice: Number(source.productPrice) || 0,
      productComparePrice: source.productComparePrice === null || (source.productComparePrice as any) === '' ? null : Number(source.productComparePrice),
      shippingPrice: Number(source.shippingPrice) || 0, shippingText: source.shippingText,
      couponCode: source.couponCode, couponDiscountPercent: Number(source.couponDiscountPercent) || 0,
      videoUrl: source.videoUrl, // Un solo campo: el servidor extrae proveedor + ID.
      allowLoop: source.allowLoop, whatsappNumber: source.whatsappNumber, whatsappText: source.whatsappText,
      whatsappLink: source.whatsappLink, checkoutMode: source.checkoutMode || 'crm', shopifyUrl: source.shopifyUrl,
      commentMode: source.commentMode, viewersMin: Number(source.viewersMin) || 40, viewersMax: Number(source.viewersMax) || 60,
      customDomain: source.customDomain,
    };
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const json = await api(`/api/live-selling/landings/${form.id}`, {
        method: 'PATCH',
        body: JSON.stringify(landingPayload(form)),
      });
      setForm(toForm(json.landing));
      await loadList(form.id);
      flash('Cambios guardados.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  async function handleDuplicate() {
    if (!form) return;
    setSaving(true);
    try {
      const json = await api(`/api/live-selling/landings/${form.id}/duplicate`, { method: 'POST', body: '{}' });
      await loadList(json.landing.id);
      setSelectedId(json.landing.id);
      flash('Landing duplicada (queda en borrador y sin dominio).');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  async function handleToggleStatus() {
    if (!form) return;
    const next = form.status === 'active' ? 'paused' : 'active';
    setSaving(true);
    try {
      const json = await api(`/api/live-selling/landings/${form.id}`, {
        method: 'PATCH', body: JSON.stringify({ status: next }),
      });
      setForm(toForm(json.landing));
      await loadList(form.id);
      flash(next === 'active' ? 'Live activado: ya es público.' : 'Live pausado: dejó de ser público.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  async function handleArchive() {
    if (!form) return;
    if (!window.confirm(`¿Archivar la landing "${form.title}"? Dejará de mostrarse en tu lista (los datos quedan guardados).`)) return;
    setSaving(true);
    try {
      await api(`/api/live-selling/landings/${form.id}`, { method: 'DELETE' });
      setSelectedId('');
      setForm(null);
      await loadList();
      flash('Landing archivada.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  async function handleSaveComments() {
    if (!form) return;
    setSaving(true);
    try {
      const json = await api(`/api/live-selling/landings/${form.id}/fake-comments`, {
        method: 'PUT', body: JSON.stringify({ comments: fakeComments }),
      });
      setFakeComments(json.fakeComments || []);
      await loadList(form.id);
      flash('Comentarios simulados guardados.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  function importComments() {
    const rows: FakeComment[] = importText.split('\n').map((line, i) => {
      const [author, content, second] = line.split('|').map((p) => (p ?? '').trim());
      return { author: author || '', content: content || '', avatarUrl: '', second: second ? Number(second) : null, sortOrder: fakeComments.length + i };
    }).filter((r) => r.author && r.content);
    if (!rows.length) { setError('Pega líneas con formato: Autor | comentario | segundo (el segundo es opcional)'); return; }
    setFakeComments([...fakeComments, ...rows]);
    setImportText('');
    flash(`${rows.length} comentario(s) agregados. No olvides guardar.`);
  }

  async function handleVerifyDomain() {
    if (!form) return;
    setSaving(true);
    setVerifyResult(null);
    try {
      await api(`/api/live-selling/landings/${form.id}`, {
        method: 'PATCH', body: JSON.stringify({ customDomain: form.customDomain }),
      });
      const json = await api(`/api/live-selling/landings/${form.id}/verify-domain`, {
        method: 'POST', body: JSON.stringify({ domain: form.customDomain }),
      });
      setVerifyResult(json);
      if (json.landing) setForm(toForm(json.landing));
      await loadList(form.id);
      flash(json.verified ? 'Dominio verificado.' : 'Dominio aún no verificado: revisa el DNS.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  async function handleOrderStatus(order: LiveOrder, status: string) {
    try {
      await api(`/api/live-selling/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(orders.map((o) => (o.id === order.id ? { ...o, status } : o)));
    } catch (e: any) { fail(e); }
  }

  function copyPublicLink() {
    if (!publicUrl) return;
    navigator.clipboard?.writeText(publicUrl).catch(() => {});
    flash('Enlace público copiado.');
  }

  function set<K extends keyof Landing>(key: K, value: Landing[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-800 bg-gray-950/40 p-6 text-gray-400">
        <RefreshCw className="mr-2 animate-spin" size={16} /> Cargando Live Selling…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-gray-100 animate-fade-in">
      {/* Encabezado */}
      <div className="panel relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900/90 to-red-950/30 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl border border-red-500/25 bg-red-500/10 p-3.5 text-red-400">
              <Radio size={22} />
            </div>
            <div>
              <span className="rounded-md border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-300">
                Live Selling · Pregrabado tipo live
              </span>
              <h1 className="mt-2 font-display text-2xl font-bold text-white">Tus landings de vivo</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-400">
                Crea todas las landings que quieras: pega la URL del video, configura producto, comentarios y checkout contraentrega.
                Cada landing puede tener su propio dominio. La página pública siempre muestra el rótulo “Transmisión pregrabada”.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnGold} onClick={() => { setWizardOpen(true); setWStep(0); }} disabled={saving}>
              <Rocket size={14} /> Nuevo embudo Live
            </button>
            <button className={btnGhost} onClick={handleCreate} disabled={saving}>
              <Plus size={14} /> Landing vacia
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Landings', value: landings.length },
            { label: 'Activas', value: landings.filter((l) => l.status === 'active').length },
            { label: 'Comentarios visitantes', value: landings.reduce((s, l) => s + (l.counts?.visitorComments || 0), 0) },
            { label: 'Leads', value: landings.reduce((s, l) => s + (l.counts?.leads || 0), 0) },
            { label: 'Pedidos', value: landings.reduce((s, l) => s + (l.counts?.orders || 0), 0) },
            { label: 'Clics WhatsApp', value: landings.reduce((s, l) => s + (l.counts?.whatsappClicks || 0), 0) },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3">
              <div className="text-xl font-black text-white">{card.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Lista de landings */}
        <div className="panel h-fit rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Layers size={15} className="text-gold" /> Mis landings</h2>
          {!landings.length && <p className="text-sm text-gray-500">Aún no tienes landings. Crea la primera con el botón de arriba.</p>}
          <div className="space-y-2">
            {landings.map((landing) => (
              <button
                key={landing.id}
                onClick={() => setSelectedId(landing.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${landing.id === selectedId ? 'border-gold/50 bg-gold/10' : 'border-gray-800 bg-gray-950/60 hover:bg-gray-900'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-white">{landing.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${landing.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : landing.status === 'paused' ? 'bg-amber-500/15 text-amber-300' : 'bg-gray-700/40 text-gray-300'}`}>
                    {landing.status === 'active' ? 'ACTIVA' : landing.status === 'paused' ? 'PAUSADA' : 'BORRADOR'}
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-gray-500">/live/{landing.slug}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {landing.counts?.orders || 0} pedidos · {landing.counts?.leads || 0} leads · {landing.counts?.visitorComments || 0} comentarios
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="panel rounded-2xl border border-gray-800 bg-gray-900/80 p-5 sm:p-6">
          {!form ? (
            <p className="text-sm text-gray-500">Selecciona o crea una landing para configurarla.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'config', label: 'Configuración', icon: <Video size={14} /> },
                    { id: 'comments', label: `Comentarios simulados (${selected?.counts?.fakeComments ?? fakeComments.length})`, icon: <MessageSquare size={14} /> },
                    { id: 'inbox', label: `Visitantes y pedidos (${orders.length})`, icon: <ShoppingBag size={14} /> },
                    { id: 'metrics', label: 'Metricas', icon: <BarChart3 size={14} /> },
                    { id: 'domain', label: 'Dominio propio', icon: <Globe size={14} /> },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${tab === t.id ? 'bg-gold text-black' : 'border border-gray-800 bg-gray-950 text-gray-300 hover:bg-gray-800'}`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btnGhost} onClick={handleDuplicate} disabled={saving}><Copy size={13} /> Duplicar</button>
                  <button className={btnGhost} onClick={handleToggleStatus} disabled={saving}>
                    {form.status === 'active' ? <><Pause size={13} /> Pausar</> : <><Play size={13} /> Activar</>}
                  </button>
                  <button className={btnGhost} onClick={handleArchive} disabled={saving}><Archive size={13} /> Archivar</button>
                </div>
              </div>

              {tab === 'config' && (
                <div className="space-y-6 pt-5">
                  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                    <label className={labelCls}>Enlace público de esta landing</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-emerald-300">{publicUrl}</code>
                      <button className={btnGhost} onClick={copyPublicLink}><Copy size={13} /> Copiar</button>
                      <a className={btnGhost} href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Abrir</a>
                    </div>
                    {form.status !== 'active' && <p className="mt-2 text-xs text-amber-300">Esta landing no es pública hasta que la actives.</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><label className={labelCls}>Título del live</label><input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
                    <div><label className={labelCls}>Slug (ruta pública)</label><input className={inputCls} value={form.slug} onChange={(e) => set('slug', e.target.value)} /></div>
                    <div><label className={labelCls}>Texto de la pastilla del live</label><input className={inputCls} value={form.liveLabel} onChange={(e) => set('liveLabel', e.target.value)} placeholder="PRECIO DE LANZAMIENTO ✨" /></div>
                    <div><label className={labelCls}>Rótulo visible</label><input className={inputCls} value={form.disclosureText} onChange={(e) => set('disclosureText', e.target.value)} /></div>
                  </div>

                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
                    <label className={labelCls}><span className="inline-flex items-center gap-2"><Video size={13} /> URL del video (YouTube o Vimeo)</span></label>
                    <input
                      className={inputCls}
                      value={form.videoUrl}
                      onChange={(e) => set('videoUrl', e.target.value)}
                      placeholder="Pega el link: youtube.com/watch, youtu.be, shorts, live o vimeo.com"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      {detected
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300"><Check size={12} /> Detectado: {detected.provider} · ID {detected.id}</span>
                        : <span>No necesitas separar proveedor ni ID: el sistema los extrae del link al guardar.</span>}
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={form.allowLoop} onChange={(e) => set('allowLoop', e.target.checked)} /> Repetir video (loop)
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">El video intenta arrancar solo y con sonido; si el navegador lo bloquea sin interacción, la página pide un toque para activar el audio.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><label className={labelCls}>Producto</label><input className={inputCls} value={form.productName} onChange={(e) => set('productName', e.target.value)} /></div>
                    <div><label className={labelCls}>Imagen del producto (URL)</label><input className={inputCls} value={form.productImageUrl} onChange={(e) => set('productImageUrl', e.target.value)} /></div>
                    <div><label className={labelCls}>Precio (COP)</label><input className={inputCls} type="number" min={0} value={form.productPrice} onChange={(e) => set('productPrice', Number(e.target.value))} /></div>
                    <div><label className={labelCls}>Precio anterior (opcional)</label><input className={inputCls} type="number" min={0} value={form.productComparePrice ?? ''} onChange={(e) => set('productComparePrice', e.target.value === '' ? null : Number(e.target.value))} /></div>
                    <div><label className={labelCls}>Costo de envío (COP, 0 = gratis)</label><input className={inputCls} type="number" min={0} value={form.shippingPrice} onChange={(e) => set('shippingPrice', Number(e.target.value))} /></div>
                    <div><label className={labelCls}>Texto de envío</label><input className={inputCls} value={form.shippingText} onChange={(e) => set('shippingText', e.target.value)} placeholder="Envío gratis 2-4 días" /></div>
                    <div><label className={labelCls}>Cupón válido (opcional)</label><input className={inputCls} value={form.couponCode} onChange={(e) => set('couponCode', e.target.value.toUpperCase())} /></div>
                    <div><label className={labelCls}>Descuento del cupón (%)</label><input className={inputCls} type="number" min={0} max={90} value={form.couponDiscountPercent} onChange={(e) => set('couponDiscountPercent', Number(e.target.value))} /></div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 space-y-4">
                    <div>
                      <label className={labelCls}>Checkout de esta landing</label>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { id: 'crm', label: 'Checkout del CRM (contraentrega)' },
                          { id: 'shopify', label: 'Shopify' },
                          { id: 'whatsapp', label: 'Solo WhatsApp' },
                        ] as const).map((opt) => (
                          <button key={opt.id} type="button" onClick={() => set('checkoutMode', opt.id)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${form.checkoutMode === opt.id ? 'bg-gold text-black' : 'border border-gray-800 bg-gray-950 text-gray-300 hover:bg-gray-800'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {form.checkoutMode === 'shopify' && 'El boton COMPRAR abre tu pagina de Shopify; los pedidos se gestionan alla y el clic queda medido.'}
                        {form.checkoutMode === 'whatsapp' && 'Sin formulario: el boton principal del live lleva directo a tu WhatsApp.'}
                        {form.checkoutMode !== 'shopify' && form.checkoutMode !== 'whatsapp' && 'Formulario de compra dentro del live; el pedido y el lead parcial quedan guardados en el CRM.'}
                      </p>
                    </div>
                    {form.checkoutMode === 'shopify' && (
                      <div>
                        <label className={labelCls}>URL de Shopify (producto o checkout)</label>
                        <input className={inputCls} value={form.shopifyUrl} onChange={(e) => set('shopifyUrl', e.target.value)} placeholder="https://tutienda.myshopify.com/products/mi-producto" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3 md:col-span-2">
                      <div>
                        <label className={labelCls}>Link de WhatsApp (pega el enlace completo)</label>
                        <input className={inputCls} value={form.whatsappLink} onChange={(e) => handleWaLink(e.target.value)} placeholder="https://wa.me/573001234567?text=Hola, quiero el producto" />
                        <p className="mt-1.5 text-xs text-gray-500">Acepta wa.me, api.whatsapp.com y enlaces cortos tipo wa.link. Si es wa.me, el numero y el mensaje se detectan solos; los enlaces cortos se abren tal cual en la pagina publica.</p>
                        {waDetected && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">
                            <Check size={12} /> Detectado: {waDetected.number}{waDetected.text ? ` · "${waDetected.text}"` : ''}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div><label className={labelCls}>O numero directo (con indicativo)</label><input className={inputCls} value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="573001234567" /></div>
                        <div><label className={labelCls}>Mensaje prellenado</label><input className={inputCls} value={form.whatsappText} onChange={(e) => set('whatsappText', e.target.value)} /></div>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Modo de comentarios simulados</label>
                      <select className={inputCls} value={form.commentMode} onChange={(e) => set('commentMode', e.target.value)}>
                        <option value="sequence">Secuencia (4 iniciales, luego 1 cada 2-5 s en bucle)</option>
                        <option value="countdown">Por segundo del video (cada comentario en su segundo)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Espectadores mín.</label><input className={inputCls} type="number" value={form.viewersMin} onChange={(e) => set('viewersMin', Number(e.target.value))} /></div>
                      <div><label className={labelCls}>Espectadores máx.</label><input className={inputCls} type="number" value={form.viewersMax} onChange={(e) => set('viewersMax', Number(e.target.value))} /></div>
                    </div>
                    <div><label className={labelCls}>Texto del botón de compra</label><input className={inputCls} value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Color del botón</label><input className={inputCls} value={form.buttonColor} onChange={(e) => set('buttonColor', e.target.value)} /></div>
                      <div><label className={labelCls}>Color de la pastilla</label><input className={inputCls} value={form.titleBackground} onChange={(e) => set('titleBackground', e.target.value)} /></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className={btnGold} onClick={handleSave} disabled={saving}><Save size={14} /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Eye size={13} /> Los cambios se aplican a la página pública al guardar.</span>
                  </div>
                </div>
              )}

              {tab === 'comments' && (
                <div className="space-y-5 pt-5">
                  <p className="text-sm text-gray-400">
                    Estos comentarios se sirven desde tu propio servidor (sin hojas externas ni llaves expuestas).
                    En modo <strong className="text-gray-200">secuencia</strong> salen 4 al inicio y luego uno cada 2–5 segundos en bucle.
                    En modo <strong className="text-gray-200">por segundo</strong>, cada comentario aparece cuando el video llega a su segundo.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead className="bg-gray-950 text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-bold uppercase">Autor</th>
                          <th className="px-3 py-2 font-bold uppercase">Comentario</th>
                          <th className="px-3 py-2 font-bold uppercase">Avatar (URL)</th>
                          <th className="px-3 py-2 font-bold uppercase">Segundo</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {fakeComments.map((c, idx) => (
                          <tr key={c.id || `new-${idx}`}>
                            <td className="px-2 py-1.5"><input className={inputCls} value={c.author} onChange={(e) => setFakeComments(fakeComments.map((x, i) => i === idx ? { ...x, author: e.target.value } : x))} /></td>
                            <td className="px-2 py-1.5"><input className={inputCls} value={c.content} onChange={(e) => setFakeComments(fakeComments.map((x, i) => i === idx ? { ...x, content: e.target.value } : x))} /></td>
                            <td className="px-2 py-1.5"><input className={inputCls} value={c.avatarUrl} onChange={(e) => setFakeComments(fakeComments.map((x, i) => i === idx ? { ...x, avatarUrl: e.target.value } : x))} placeholder="Opcional" /></td>
                            <td className="px-2 py-1.5 w-24"><input className={inputCls} type="number" min={0} value={c.second ?? ''} onChange={(e) => setFakeComments(fakeComments.map((x, i) => i === idx ? { ...x, second: e.target.value === '' ? null : Number(e.target.value) } : x))} placeholder="—" /></td>
                            <td className="px-2 py-1.5"><button className={btnGhost} onClick={() => setFakeComments(fakeComments.filter((_, i) => i !== idx))}><Trash2 size={13} /></button></td>
                          </tr>
                        ))}
                        {!fakeComments.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Sin comentarios simulados todavía.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnGhost} onClick={() => setFakeComments([...fakeComments, { author: '', content: '', avatarUrl: '', second: null, sortOrder: fakeComments.length }])}><Plus size={13} /> Agregar comentario</button>
                    <button className={btnGold} onClick={handleSaveComments} disabled={saving}><Save size={14} /> Guardar comentarios</button>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                    <label className={labelCls}>Importar en bloque (una línea por comentario: Autor | texto | segundo)</label>
                    <textarea className={`${inputCls} min-h-[96px]`} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'María | ¿Precio por favor? | 12\nCarlos | Quiero uno | 40'} />
                    <button className={`${btnGhost} mt-2`} onClick={importComments}><Plus size={13} /> Agregar desde texto</button>
                  </div>
                </div>
              )}

              {tab === 'inbox' && (
                <div className="space-y-6 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">Comentarios que dejan los visitantes y pedidos/leads de esta landing, en tiempo real desde la base de datos.</p>
                    <button className={btnGhost} onClick={() => selectedId && loadDetail(selectedId).catch((e: any) => fail(e))}><RefreshCw size={13} /> Actualizar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Comentarios visitantes', value: visitorComments.length },
                      { label: 'Leads (solo teléfono)', value: orders.filter((o) => o.status === 'lead').length },
                      { label: 'Pedidos', value: orders.filter((o) => o.status !== 'lead').length },
                      { label: 'Ventas (COP)', value: money(revenue) },
                    ].map((c) => (
                      <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3">
                        <div className="text-lg font-black text-white">{c.value}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-white">Pedidos y leads de esta landing</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-800">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="bg-gray-950 text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-bold uppercase">Ref / Fecha</th>
                            <th className="px-3 py-2 font-bold uppercase">Cliente</th>
                            <th className="px-3 py-2 font-bold uppercase">Producto</th>
                            <th className="px-3 py-2 font-bold uppercase">Total</th>
                            <th className="px-3 py-2 font-bold uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {orders.map((o) => (
                            <tr key={o.id}>
                              <td className="px-3 py-2"><div className="font-mono text-emerald-300">{o.orderRef}</div><div className="text-gray-500">{formatDate(o.createdAt)}</div></td>
                              <td className="px-3 py-2"><div className="font-semibold text-white">{o.customerName || 'Lead sin nombre'}</div><div className="text-gray-500">{o.phone} · {o.city} {o.department}</div></td>
                              <td className="px-3 py-2 text-gray-300">{o.productName} × {o.quantity}</td>
                              <td className="px-3 py-2 font-bold text-white">{money(o.total)}</td>
                              <td className="px-3 py-2">
                                <select className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-white" value={o.status} onChange={(e) => handleOrderStatus(o, e.target.value)}>
                                  <option value="lead">Lead</option>
                                  <option value="order">Pedido</option>
                                  <option value="confirmed">Confirmado</option>
                                  <option value="ready">Listo</option>
                                  <option value="delivered">Entregado</option>
                                  <option value="cancelled">Cancelado</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                          {!orders.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Todavía no hay pedidos ni leads. Comparte el enlace público para empezar.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-white">Comentarios de visitantes</h3>
                    <div className="overflow-x-auto rounded-xl border border-gray-800">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-gray-950 text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-bold uppercase">Fecha</th>
                            <th className="px-3 py-2 font-bold uppercase">Comentario</th>
                            <th className="px-3 py-2 font-bold uppercase">Teléfono</th>
                            <th className="px-3 py-2 font-bold uppercase">Visitante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {visitorComments.map((c) => (
                            <tr key={c.id}>
                              <td className="px-3 py-2 text-gray-400">{formatDate(c.createdAt)}</td>
                              <td className="px-3 py-2 text-white">{c.content}</td>
                              <td className="px-3 py-2 text-gray-400">{c.phone || '—'}</td>
                              <td className="px-3 py-2 font-mono text-gray-500">{c.visitorId || '—'}</td>
                            </tr>
                          ))}
                          {!visitorComments.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Sin comentarios de visitantes todavía.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'metrics' && (
                <div className="space-y-6 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">Metricas reales de todas tus landings: visitas a la pagina, clics de WhatsApp y de checkout, comentarios de visitantes, leads y pedidos.</p>
                    <div className="flex flex-wrap gap-2">
                      {[{ d: 7, label: '7 dias' }, { d: 30, label: '30 dias' }, { d: 90, label: '90 dias' }, { d: 0, label: 'Todo' }].map((o) => (
                        <button key={o.d} className={metricsDays === o.d ? btnGold : btnGhost} onClick={() => setMetricsDays(o.d)} disabled={metricsLoading}>{o.label}</button>
                      ))}
                      <button className={btnGhost} onClick={() => loadMetrics(metricsDays)} disabled={metricsLoading}><RefreshCw size={13} className={metricsLoading ? 'animate-spin' : ''} /> Actualizar</button>
                    </div>
                  </div>
                  {metricsLoading && !metrics && <p className="text-sm text-gray-500">Cargando metricas...</p>}
                  {metrics && (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                          { label: 'Visitas', value: metrics.totals.pageviews },
                          { label: 'Clics WhatsApp', value: metrics.totals.whatsappClicks },
                          { label: 'Clics checkout', value: metrics.totals.checkoutClicks },
                          { label: 'Comentarios visitantes', value: metrics.totals.visitorComments },
                          { label: 'Leads', value: metrics.totals.leads },
                          { label: 'Pedidos', value: metrics.totals.orders },
                        ].map((c) => (
                          <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3">
                            <div className="text-xl font-black text-white">{c.value}</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Conversion visita a lead: <strong className="text-gray-200">{metrics.totals.leadConversion}%</strong>
                        {' · '}visita a pedido: <strong className="text-gray-200">{metrics.totals.orderConversion}%</strong>
                        {' · '}periodo: {metrics.days > 0 ? `ultimos ${metrics.days} dias` : 'todo el historial'}
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full min-w-[880px] text-left text-xs">
                          <thead className="bg-gray-950 text-gray-500">
                            <tr>
                              <th className="px-3 py-2 font-bold uppercase">Landing</th>
                              <th className="px-3 py-2 font-bold uppercase">Visitas</th>
                              <th className="px-3 py-2 font-bold uppercase">Clics WA</th>
                              <th className="px-3 py-2 font-bold uppercase">Clics checkout</th>
                              <th className="px-3 py-2 font-bold uppercase">Comentarios</th>
                              <th className="px-3 py-2 font-bold uppercase">Leads</th>
                              <th className="px-3 py-2 font-bold uppercase">Pedidos</th>
                              <th className="px-3 py-2 font-bold uppercase">Conv. pedido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {metrics.landings.map((m) => (
                              <tr key={m.landingId}>
                                <td className="px-3 py-2"><div className="font-semibold text-white">{m.title}</div><div className="font-mono text-gray-500">/live/{m.slug}</div></td>
                                <td className="px-3 py-2 text-gray-200">{m.pageviews}</td>
                                <td className="px-3 py-2 text-gray-200">{m.whatsappClicks}</td>
                                <td className="px-3 py-2 text-gray-200">{m.checkoutClicks}</td>
                                <td className="px-3 py-2 text-gray-200">{m.visitorComments}</td>
                                <td className="px-3 py-2 text-gray-200">{m.leads}</td>
                                <td className="px-3 py-2 font-bold text-white">{m.orders}</td>
                                <td className="px-3 py-2 text-emerald-300">{m.orderConversion}%</td>
                              </tr>
                            ))}
                            {!metrics.landings.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Sin landings todavia.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-gray-500">El detalle por landing (comentarios y pedidos uno a uno) esta en la pestana "Visitantes y pedidos" de cada landing.</p>
                    </>
                  )}
                </div>
              )}

              {tab === 'domain' && (
                <div className="space-y-5 pt-5">
                  <div>
                    <label className={labelCls}>Dominio propio para esta landing</label>
                    <input className={inputCls} value={form.customDomain} onChange={(e) => set('customDomain', e.target.value)} placeholder="live.tutienda.com" />
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-1 font-bold ${form.domainVerified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                        {form.domainVerified ? 'Dominio verificado' : `Estado: ${form.domainStatus || 'sin configurar'}`}
                      </span>
                      {form.customDomain && <code className="font-mono text-gray-400">https://{form.customDomain}/</code>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400 space-y-2">
                    <p className="font-bold text-white">Cómo conectarlo</p>
                    <p>1. En tu proveedor de dominio crea un registro <strong className="text-gray-200">CNAME</strong> desde tu subdominio (ej. <code className="font-mono">live</code>) hacia <code className="font-mono text-emerald-300">crm.xorbit360.com</code>.</p>
                    <p>2. Escribe ese dominio aquí y pulsa “Guardar y verificar”. El sistema comprueba el DNS en vivo y, si apunta correctamente, la landing empieza a resolverse por ese dominio en la raíz.</p>
                    <p>3. Nota: el dominio raíz (sin subdominio) no admite CNAME en todos los proveedores; usa un subdominio o un registro ALIAS/ANAME si tu proveedor lo ofrece.</p>
                    <p>4. El certificado TLS (candado HTTPS) lo emite el proxy del VPS; si tu dominio es nuevo puede tardar unos minutos tras propagar el DNS.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnGold} onClick={handleVerifyDomain} disabled={saving || !form.customDomain}><Globe size={14} /> Guardar y verificar DNS</button>
                    <button className={btnGhost} onClick={handleSave} disabled={saving}><Save size={13} /> Solo guardar</button>
                  </div>
                  {verifyResult && (
                    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-xs text-gray-300 space-y-2">
                      <p><strong className="text-white">Resultado:</strong> {verifyResult.verified ? '✅ Verificado' : '⏳ Aún no apunta correctamente'}</p>
                      <p>{verifyResult.instructions}</p>
                      <p className="text-gray-500">{verifyResult.tls}</p>
                      <pre className="overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] text-gray-400">{JSON.stringify(verifyResult.records || {}, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-auto rounded-t-2xl border border-gray-800 bg-gray-900 p-6 sm:rounded-2xl">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Nuevo embudo Live</h2>
                <p className="text-xs text-gray-500">Paso {wStep + 1} de 6 · {['Dominio o subdominio', 'URL del video', 'Comentarios y tiempos', 'WhatsApp', 'Checkout y producto', 'Revisar y publicar'][wStep]}</p>
              </div>
              <button className={btnGhost} onClick={() => !wBusy && setWizardOpen(false)} disabled={wBusy}><X size={14} /></button>
            </div>
            <div className="mb-5 mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div className="h-full bg-gold transition-all" style={{ width: `${((wStep + 1) / 6) * 100}%` }} />
            </div>

            {wStep === 0 && (
              <div className="space-y-4">
                <div><label className={labelCls}>Titulo del live</label><input className={inputCls} value={wiz.title} onChange={(e) => setw('title', e.target.value)} placeholder="Ej: Lanzamiento crema facial" /></div>
                <div>
                  <label className={labelCls}>Subdominio / ruta (slug)</label>
                  <input className={inputCls} value={wiz.slug} onChange={(e) => setw('slug', e.target.value)} placeholder="mi-producto" />
                  <p className="mt-1.5 text-xs text-gray-500">Tu live quedara en <code className="font-mono text-emerald-300">{window.location.origin}/live/{slugifyLocal(wiz.slug || wiz.title) || 'mi-live'}</code>. Si dejas todo vacio se genera uno automatico.</p>
                </div>
                <div>
                  <label className={labelCls}>Dominio propio (opcional)</label>
                  <input className={inputCls} value={wiz.customDomain} onChange={(e) => setw('customDomain', e.target.value)} placeholder="live.tutienda.com" />
                  <p className="mt-1.5 text-xs text-gray-500">Apunta un CNAME de ese subdominio hacia <code className="font-mono text-emerald-300">crm.xorbit360.com</code> y verificalo luego en la pestana Dominio propio.</p>
                </div>
                <div><label className={labelCls}>Texto de la pastilla del live (opcional)</label><input className={inputCls} value={wiz.liveLabel} onChange={(e) => setw('liveLabel', e.target.value)} placeholder="PRECIO DE LANZAMIENTO" /></div>
              </div>
            )}

            {wStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>URL del video (YouTube o Vimeo)</label>
                  <input className={inputCls} value={wiz.videoUrl} onChange={(e) => setw('videoUrl', e.target.value)} placeholder="Pega el link: youtube.com/watch, youtu.be, shorts, live o vimeo.com" />
                  <div className="mt-2 text-xs text-gray-400">
                    {wizVideo
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300"><Check size={12} /> Detectado: {wizVideo.provider} · ID {wizVideo.id}</span>
                      : <span>Pega el link completo; el sistema extrae proveedor e ID solo.</span>}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={wiz.allowLoop} onChange={(e) => setw('allowLoop', e.target.checked)} /> Repetir el video en bucle (loop)
                </label>
                <p className="text-xs text-gray-500">El video intenta arrancar solo y con sonido; si el navegador del visitante bloquea el audio automatico, la pagina le pide un toque para activarlo.</p>
              </div>
            )}

            {wStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Modo de comentarios simulados</label>
                  <select className={inputCls} value={wiz.commentMode} onChange={(e) => setw('commentMode', e.target.value)}>
                    <option value="countdown">Por segundo del video (cada comentario en su segundo)</option>
                    <option value="sequence">Secuencia (4 iniciales, luego 1 cada 2-5 s en bucle)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Comentarios (uno por linea: Autor | comentario | segundo)</label>
                  <textarea className={`${inputCls} min-h-[150px] font-mono`} value={wiz.commentsText} onChange={(e) => setw('commentsText', e.target.value)} placeholder={'Maria | Precio por favor? | 12\nCarlos | Quiero uno, como pago? | 40\nLuisa | Ya me llego el mio, recomendado | 75'} />
                  <p className="mt-1.5 text-xs text-gray-500">El segundo es en que segundo del video aparece (modo por segundo). Puedes editarlos despues en la pestana de comentarios con avatar por comentario.</p>
                </div>
              </div>
            )}

            {wStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Link de WhatsApp (pega el enlace completo)</label>
                  <input className={inputCls} value={wiz.whatsappLink} onChange={(e) => handleWizWaLink(e.target.value)} placeholder="https://wa.me/573001234567?text=Hola, quiero el producto" />
                  <p className="mt-1.5 text-xs text-gray-500">Acepta wa.me, api.whatsapp.com y enlaces cortos (wa.link). Cada clic en la pagina publica queda registrado en Metricas.</p>
                  {wizWa && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300"><Check size={12} /> Detectado: {wizWa.number}{wizWa.text ? ` · "${wizWa.text}"` : ''}</span>}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>O numero directo (con indicativo)</label><input className={inputCls} value={wiz.whatsappNumber} onChange={(e) => setw('whatsappNumber', e.target.value)} placeholder="573001234567" /></div>
                  <div><label className={labelCls}>Mensaje prellenado</label><input className={inputCls} value={wiz.whatsappText} onChange={(e) => setw('whatsappText', e.target.value)} placeholder="Hola, quiero el producto" /></div>
                </div>
              </div>
            )}

            {wStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Como se compra en este live</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: 'crm', label: 'Checkout del CRM (contraentrega)' },
                      { id: 'shopify', label: 'Shopify' },
                      { id: 'whatsapp', label: 'Solo WhatsApp' },
                    ] as const).map((opt) => (
                      <button key={opt.id} type="button" onClick={() => setw('checkoutMode', opt.id)}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${wiz.checkoutMode === opt.id ? 'bg-gold text-black' : 'border border-gray-800 bg-gray-950 text-gray-300 hover:bg-gray-800'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {wiz.checkoutMode === 'shopify' && (
                  <div><label className={labelCls}>URL de Shopify (producto o checkout)</label><input className={inputCls} value={wiz.shopifyUrl} onChange={(e) => setw('shopifyUrl', e.target.value)} placeholder="https://tutienda.myshopify.com/products/mi-producto" /></div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>Producto</label><input className={inputCls} value={wiz.productName} onChange={(e) => setw('productName', e.target.value)} /></div>
                  <div><label className={labelCls}>Imagen del producto (URL)</label><input className={inputCls} value={wiz.productImageUrl} onChange={(e) => setw('productImageUrl', e.target.value)} /></div>
                  <div><label className={labelCls}>Precio (COP)</label><input className={inputCls} type="number" min={0} value={wiz.productPrice} onChange={(e) => setw('productPrice', Number(e.target.value))} /></div>
                  <div><label className={labelCls}>Precio anterior (opcional)</label><input className={inputCls} type="number" min={0} value={wiz.productComparePrice} onChange={(e) => setw('productComparePrice', e.target.value)} placeholder="Opcional" /></div>
                  <div><label className={labelCls}>Costo de envio (COP, 0 = gratis)</label><input className={inputCls} type="number" min={0} value={wiz.shippingPrice} onChange={(e) => setw('shippingPrice', Number(e.target.value))} /></div>
                  <div><label className={labelCls}>Texto de envio</label><input className={inputCls} value={wiz.shippingText} onChange={(e) => setw('shippingText', e.target.value)} placeholder="Envio gratis 2-4 dias" /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Texto del boton de compra</label><input className={inputCls} value={wiz.buttonText} onChange={(e) => setw('buttonText', e.target.value)} /></div>
                </div>
              </div>
            )}

            {wStep === 5 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-300 space-y-1.5">
                  <p><strong className="text-white">Titulo:</strong> {wiz.title || 'Nuevo live'}</p>
                  <p><strong className="text-white">Enlace:</strong> <code className="font-mono text-emerald-300">{window.location.origin}/live/{slugifyLocal(wiz.slug || wiz.title) || 'mi-live'}</code>{wiz.customDomain ? <> · dominio propio: <code className="font-mono">{wiz.customDomain}</code></> : null}</p>
                  <p><strong className="text-white">Video:</strong> {wizVideo ? `${wizVideo.provider} · ${wizVideo.id}` : 'Sin detectar (revisa el paso 2)'}</p>
                  <p><strong className="text-white">Comentarios simulados:</strong> {parseWizardComments(wiz.commentsText).length} en modo {wiz.commentMode === 'countdown' ? 'por segundo' : 'secuencia'}</p>
                  <p><strong className="text-white">WhatsApp:</strong> {wizWa ? wizWa.number : (wiz.whatsappNumber || wiz.whatsappLink || 'Sin configurar')}</p>
                  <p><strong className="text-white">Checkout:</strong> {wiz.checkoutMode === 'shopify' ? `Shopify (${wiz.shopifyUrl || 'sin URL'})` : wiz.checkoutMode === 'whatsapp' ? 'Solo WhatsApp' : 'CRM contraentrega'}</p>
                  <p><strong className="text-white">Producto:</strong> {wiz.productName || 'Sin nombre'} · {money(Number(wiz.productPrice) || 0)}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={wiz.publish} onChange={(e) => setw('publish', e.target.checked)} /> Publicar de una vez (queda activo y visible para tus clientes)
                </label>
                <p className="text-xs text-gray-500">La landing mostrara el rotulo "Transmision pregrabada". En el CRM podras ver visitas, clics, comentarios de visitantes, leads y pedidos en Metricas y en Visitantes y pedidos.</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-800 pt-4">
              <button className={btnGhost} onClick={() => setWStep(Math.max(0, wStep - 1))} disabled={wBusy || wStep === 0}>Atras</button>
              <div className="text-xs text-gray-500">{['Dominio', 'Video', 'Comentarios', 'WhatsApp', 'Checkout', 'Publicar'][wStep]}</div>
              {wStep < 5 ? (
                <button className={btnGold} onClick={() => setWStep(wStep + 1)} disabled={wBusy || (wStep === 1 && !wizVideo)}>
                  Siguiente
                  {wStep === 1 && !wizVideo ? ' (pega una URL valida)' : ''}
                </button>
              ) : (
                <button className={btnGold} onClick={handleWizardFinish} disabled={wBusy || !wizVideo}>
                  <Rocket size={14} /> {wBusy ? 'Creando...' : (wiz.publish ? 'Crear y publicar' : 'Crear embudo')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
