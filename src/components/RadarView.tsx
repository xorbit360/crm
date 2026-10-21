import React, { useState, useEffect, useRef } from 'react';
import {
  Radar, Search, TrendingUp, Star, Rocket, ExternalLink, Flame, Clock,
  ChevronDown, Sparkles, BarChart3, Store, Bell, Trash2, X, Loader2,
  CheckCircle, Lock, CreditCard, ShieldCheck, Zap, Target,
} from 'lucide-react';

type TabId = 'virales' | 'spy' | 'trends' | 'stores' | 'alerts' | 'favorites';
type SourceId = 'all' | 'meta' | 'tiktok' | 'google';

interface AdResult {
  id: string;
  pageName: string;
  body: string;
  image: string;
  startDate: string;
  activeDays: number | null;
  platforms: string[];
  url: string;
  destination?: string;
  destinationType?: string;
}

// Clave para detectar versiones del mismo anuncio/producto dentro de un
// resultado: mismo anunciante y mismo destino (o mismo inicio de texto).
function versionKey(ad: AdResult): string {
  const dest = (ad.destination || '').replace(/\/$/, '');
  const bodyKey = (ad.body || '').slice(0, 60).toLowerCase();
  return `${(ad.pageName || '').toLowerCase()}|${dest || bodyKey}`;
}

interface AnalysisResult {
  score: number;
  hooks: string[];
  angles: string[];
  whySells: string[];
  risks: string[];
}

interface RadarTier {
  id: string;
  name: string;
  priceUsd: number;
  searchesPerDay: string;
  deepAnalysis: boolean;
  maxAlerts: number | string;
  featured?: boolean;
}

interface AlertItem {
  id: string;
  keyword: string;
  country: string;
  whatsapp: string;
  createdAt?: string;
}

const FALLBACK_COUNTRIES = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'AR', name: 'Argentina' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'PA', name: 'Panamá' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
];

const FALLBACK_TIERS: RadarTier[] = [
  { id: 'basico', name: 'Básico', priceUsd: 19, searchesPerDay: '100 búsquedas/día', deepAnalysis: false, maxAlerts: 3 },
  { id: 'pro', name: 'Pro', priceUsd: 49, searchesPerDay: '500 búsquedas/día', deepAnalysis: true, maxAlerts: 15, featured: true },
  { id: 'elite', name: 'Élite', priceUsd: 119, searchesPerDay: 'Ilimitadas', deepAnalysis: true, maxAlerts: 'Ilimitadas' },
];

const CATEGORY_CHIPS = ['Belleza', 'Hogar', 'Mascotas', 'Fitness', 'Cocina', 'Tecnología', 'Ropa', 'Juguetes'];

const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'meta', label: 'Meta' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'google', label: 'Google' },
];

interface ApiError extends Error {
  status?: number;
  product?: string;
}

async function api(path: string, opts: any = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(j.error || 'Error de red');
  return j;
}

// Versión que captura el 402 de freemium (upsell radar) con el producto bloqueado.
async function radarApi(path: string, opts: any = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 402 || j.product === 'radar') {
    const e = new Error(j.error || 'Esta función requiere la suscripción a Radar de Anuncios.') as ApiError;
    e.status = r.status;
    e.product = j.product || 'radar';
    throw e;
  }
  if (!r.ok || j.success === false) throw new Error(j.error || 'Error de red');
  return j;
}

function isRadarBlocked(e: any) {
  return e && (e as ApiError).product === 'radar';
}

function Sparkline({ points }: { points: { t: string; v: number }[] }) {
  if (!points.length) return null;
  const w = 560, h = 120, pad = 8;
  const max = Math.max(1, ...points.map((p) => p.v));
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)},${(h - pad - (p.v / max) * (h - pad * 2)).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const growth = first.v > 0 ? Math.round(((last.v - first.v) / first.v) * 100) : 0;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${w - pad},${h - pad} L${pad},${h - pad} Z`} fill="url(#rg)" />
        <path d={d} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      </svg>
      <div className="flex justify-between text-[11px] text-gray-500 mt-1">
        <span>{first.t}</span>
        <span className={growth >= 0 ? 'text-amber-400' : 'text-zinc-500'}>
          {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% en 12 meses
        </span>
        <span>{last.t}</span>
      </div>
    </div>
  );
}

const ensureBoldScript = (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).BoldCheckout) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="boldPaymentButton.js"]');
    if (existing) {
      const onL = () => resolve(Boolean((window as any).BoldCheckout));
      existing.addEventListener('load', onL, { once: true });
      setTimeout(() => resolve(Boolean((window as any).BoldCheckout)), 8000);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    s.async = true;
    s.onload = () => {
      const t0 = Date.now();
      const wait = () => {
        if ((window as any).BoldCheckout) return resolve(true);
        if (Date.now() - t0 > 8000) return resolve(false);
        setTimeout(wait, 100);
      };
      wait();
    };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
};

function BoldPayModal({ tier, bold, orderId, onClose, onSuccess }: {
  tier: RadarTier; bold: any; orderId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pollRef = useRef<any>(null);
  const fmtCop = (v: number) => '$' + v.toLocaleString('es-CO');

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const checkOrderStatus = async (oid: string) => {
    try {
      const res = await fetch(`/api/billing/order-status?orderId=${encodeURIComponent(oid)}`);
      const data = await res.json();
      if (data?.success && data.approved) {
        if (pollRef.current) clearInterval(pollRef.current);
        setDone(true);
        setTimeout(onSuccess, 2200);
        return true;
      }
    } catch {}
    return false;
  };

  const handlePay = async () => {
    setError('');
    if (!bold) { setError('Falta la información del pago.'); return; }
    setPaying(true);
    try {
      const ok = await ensureBoldScript();
      if (!ok || typeof (window as any).BoldCheckout !== 'function') {
        throw new Error('No se pudo cargar el checkout de Bold. Revisa tu conexión.');
      }
      const bc = new (window as any).BoldCheckout({
        orderId: bold.orderId,
        currency: bold.currency || 'COP',
        amount: String(bold.amount),
        apiKey: bold.apiKey,
        integritySignature: bold.integritySignature,
        description: bold.description,
        renderMode: 'embedded',
        redirectionUrl: bold.redirectionUrl,
      });
      bc.open();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const okk = await checkOrderStatus(bold.orderId);
        if (okk && pollRef.current) clearInterval(pollRef.current);
      }, 5000);
      setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current); }, 600000);
    } catch (err: any) {
      setError(err.message || 'Error al abrir el pago.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-zinc-950 border border-amber-500/30 rounded-2xl p-6 relative my-8">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white p-1">
          <X size={18} />
        </button>
        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto text-amber-400 w-16 h-16 animate-bounce" />
            <h3 className="text-xl font-bold text-white mt-4">¡Radar desbloqueado!</h3>
            <p className="text-sm text-gray-400 mt-1">Tu suscripción a Radar de Anuncios está activa.</p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-white">Suscribirme · {tier.name}</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-4 text-left">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Plan</span><b className="text-white">Radar {tier.name}</b></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">Precio</span><b className="text-amber-500">USD {tier.priceUsd}/mes</b></div>
              {bold?.amount && (
                <div className="flex justify-between text-sm mt-1"><span className="text-gray-400">Total a pagar</span><b className="text-amber-500">{fmtCop(Number(bold.amount))} COP</b></div>
              )}
              <div className="flex justify-between text-xs mt-1"><span className="text-gray-500">Orden</span><span className="text-gray-500 font-mono">{orderId}</span></div>
            </div>
            {error && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mt-3">{error}</p>}
            <CreditCard className="mx-auto text-amber-500 mt-5" size={36} />
            <p className="text-gray-400 text-sm text-center mt-2">Paga con tarjeta, PSE o Nequi sin salir de aquí.</p>
            <button onClick={handlePay} disabled={paying} className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50">
              {paying ? <><Loader2 className="animate-spin" size={16} /> Abriendo pago seguro…</> : <><Lock size={16} /> Pagar y activar</>}
            </button>
            <p className="text-[11px] text-gray-600 text-center mt-3">Pago procesado de forma segura por Bold · No guardamos datos de tu tarjeta</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RadarView({ onLaunchTraffiker }: { onLaunchTraffiker?: (brief: { text: string; imageUrl?: string; keyword?: string }) => void }) {
  const [tab, setTab] = useState<TabId>('virales');

  // Global
  const [countries, setCountries] = useState<{ code: string; name: string }[]>(FALLBACK_COUNTRIES);
  const [blocked, setBlocked] = useState(false);
  const [tiers, setTiers] = useState<RadarTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [payModal, setPayModal] = useState<{ tier: RadarTier; bold: any; orderId: string } | null>(null);
  const [subscribeError, setSubscribeError] = useState('');

  useEffect(() => {
    fetch('/api/radar/countries')
      .then((r) => r.json())
      .then((j) => {
        if (j && Array.isArray(j.countries) && j.countries.length) setCountries(j.countries);
      })
      .catch(() => {});
  }, []);

  const loadTiers = async () => {
    setTiersLoading(true);
    try {
      const j = await api('/api/billing/radar-tiers');
      if (Array.isArray(j.tiers) && j.tiers.length) setTiers(j.tiers);
      else setTiers(FALLBACK_TIERS);
    } catch {
      setTiers(FALLBACK_TIERS);
    } finally {
      setTiersLoading(false);
    }
  };

  const handleBlocked = (e: any) => {
    setBlocked(true);
    if (!tiers.length && !tiersLoading) loadTiers();
  };

  const subscribe = async (tier: RadarTier) => {
    setSubscribeError('');
    try {
      const j = await radarApi('/api/billing/subscribe-radar', {
        method: 'POST',
        body: JSON.stringify({ tierId: tier.id }),
      });
      if (j.bold || j.orderId) {
        setPayModal({ tier, bold: j.bold, orderId: j.orderId || j.bold?.orderId || '' });
      } else if (j.active) {
        setBlocked(false);
      } else {
        throw new Error(j.error || 'No se pudo crear la suscripción.');
      }
    } catch (e: any) {
      if (isRadarBlocked(e)) setBlocked(true);
      else setSubscribeError(e.message || 'Error al suscribir.');
    }
  };

  const onPaid = () => {
    setPayModal(null);
    setBlocked(false);
  };

  // Espía
  // --- Virales por país (vista inicial) ---
  const [vCountry, setVCountry] = useState('CO');
  const [virales, setVirales] = useState<any[] | null>(null);
  const [viralesLoading, setViralesLoading] = useState(false);
  const [viralesError, setViralesError] = useState('');
  const [tik, setTik] = useState<Record<string, { count: number; examples: string[] }> | null>(null);
  const [tikLoading, setTikLoading] = useState(false);

  const loadVirales = async (c: string) => {
    setViralesLoading(true); setViralesError(''); setTik(null);
    try {
      const j = await radarApi(`/api/radar/virales?country=${c}`);
      setVirales(j.categories || []);
    } catch (e: any) {
      if (isRadarBlocked(e)) handleBlocked(e);
      else setViralesError(e.message);
    } finally { setViralesLoading(false); }
    // TikTok llega en segundo plano: es la señal más lenta de capturar.
    setTikLoading(true);
    try {
      const t = await radarApi(`/api/radar/virales/tiktok?country=${c}`);
      setTik(t.categories || {});
    } catch { /* señal secundaria: si falla, el tablero sigue con Trends */ }
    finally { setTikLoading(false); }
  };
  useEffect(() => { loadVirales(vCountry); }, [vCountry]);

  const verAnuncios = (kw: string) => {
    setKeyword(kw); setCountry(vCountry); setTab('spy');
    setTimeout(() => doSpy(kw), 60);
  };

  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('CO');
  const [source, setSource] = useState<SourceId>('all');
  const [sort, setSort] = useState('oldest');
  const [ads, setAds] = useState<AdResult[]>([]);
  const [spying, setSpying] = useState(false);
  const [spyError, setSpyError] = useState('');
  const [spyCached, setSpyCached] = useState(false);
  const [sourceNote, setSourceNote] = useState('');

  // Análisis IA
  const [analyzingAd, setAnalyzingAd] = useState<AdResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // Tendencias
  const [tKeyword, setTKeyword] = useState('');
  const [tCountry, setTCountry] = useState('CO');
  const [points, setPoints] = useState<{ t: string; v: number }[]>([]);
  const [rising, setRising] = useState<{ query: string; value: number; label: string }[]>([]);
  const [trending, setTrending] = useState(false);
  const [trendError, setTrendError] = useState('');

  // Tiendas
  const [storeUrl, setStoreUrl] = useState('');
  const [storeData, setStoreData] = useState<{
    platform: string; title: string; currency: string; products: { image?: string; name: string; price?: string }[];
  } | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState('');

  // Alertas
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertLimit, setAlertLimit] = useState<number | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');
  const [aKeyword, setAKeyword] = useState('');
  const [aCountry, setACountry] = useState('CO');
  const [aWhatsapp, setAWhatsapp] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);

  // Favoritos
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const loadFavorites = async () => {
    try {
      const j = await api('/api/radar/favorites');
      setFavorites(j.favorites || []);
      setFavIds(new Set((j.favorites || []).map((f: any) => f.data?.id).filter(Boolean)));
    } catch { /* noop */ }
  };
  useEffect(() => { loadFavorites(); }, []);

  const loadAlerts = async () => {
    setAlertsLoading(true); setAlertsError('');
    try {
      const j = await radarApi('/api/radar/alerts');
      setAlerts(j.alerts || []);
      setAlertLimit(typeof j.maxAlerts === 'number' ? j.maxAlerts : typeof j.limit === 'number' ? j.limit : null);
    } catch (e: any) {
      if (isRadarBlocked(e)) handleBlocked(e);
      else setAlertsError(e.message);
    } finally {
      setAlertsLoading(false);
    }
  };
  useEffect(() => { if (tab === 'alerts') loadAlerts(); }, [tab]);

  const doSpy = async (kw?: string) => {
    const k = (kw ?? keyword).trim();
    if (!k) { setSpyError('Escribe una palabra clave para espiar.'); return; }
    setSpying(true); setSpyError(''); setAds([]);
    try {
      const j = await radarApi('/api/radar/ads/search', {
        method: 'POST',
        body: JSON.stringify({ keyword: k, country, source, sort, limit: 24 }),
      });
      setAds(j.ads || []);
      setSpyCached(!!j.cached);
      setSourceNote(j.sourceNote || '');
      if (!(j.ads || []).length) setSpyError('No se encontraron anuncios activos para esa búsqueda. Prueba con otra palabra.');
    } catch (e: any) {
      if (isRadarBlocked(e)) handleBlocked(e);
      else setSpyError(e.message);
    } finally {
      setSpying(false);
    }
  };

  const doAnalyze = async (ad: AdResult) => {
    setAnalyzingAd(ad);
    setAnalysis(null);
    setAnalysisError('');
    setAnalyzing(true);
    try {
      const j = await radarApi('/api/radar/analyze', {
        method: 'POST',
        body: JSON.stringify({ ads: [ad] }),
      });
      const a = j.analysis || j.result || j;
      setAnalysis({
        score: Number(a.score ?? a.puntuacion ?? 0),
        hooks: a.hooks || a.ganchos || [],
        angles: a.angles || a.angulos || [],
        whySells: a.whySells || a.porQueVende || a.whyItSells || [],
        risks: a.risks || a.riesgos || [],
      });
    } catch (e: any) {
      if (isRadarBlocked(e)) { handleBlocked(e); setAnalyzingAd(null); }
      else setAnalysisError(e.message || 'No se pudo analizar el anuncio.');
    } finally {
      setAnalyzing(false);
    }
  };

  const doTrend = async (kw?: string) => {
    const k = (kw ?? tKeyword).trim();
    if (!k) { setTrendError('Escribe una palabra o categoría.'); return; }
    setTrending(true); setTrendError(''); setPoints([]); setRising([]);
    try {
      const [i, r] = await Promise.all([
        radarApi(`/api/radar/trends/interest?keyword=${encodeURIComponent(k)}&country=${tCountry}`),
        radarApi(`/api/radar/trends/related?keyword=${encodeURIComponent(k)}&country=${tCountry}`),
      ]);
      setPoints(i.points || []);
      setRising(r.rising || []);
    } catch (e: any) {
      if (isRadarBlocked(e)) handleBlocked(e);
      else setTrendError(e.message);
    } finally {
      setTrending(false);
    }
  };

  const doStoreAnalyze = async () => {
    const u = storeUrl.trim();
    if (!u) { setStoreError('Pega la URL de la tienda que quieres analizar.'); return; }
    setStoreLoading(true); setStoreError(''); setStoreData(null);
    try {
      const j = await radarApi('/api/radar/store/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: u }),
      });
      const s = j.store || j;
      setStoreData({
        platform: s.platform || 'Desconocida',
        title: s.title || u,
        currency: s.currency || '',
        products: s.products || [],
      });
      if (!(s.products || []).length) setStoreError('No se detectaron productos en esa tienda. Verifica la URL.');
    } catch (e: any) {
      if (isRadarBlocked(e)) handleBlocked(e);
      else setStoreError(e.message);
    } finally {
      setStoreLoading(false);
    }
  };

  const saveAlert = async () => {
    const k = aKeyword.trim();
    if (!k) { setAlertsError('Escribe la palabra clave de la alerta.'); return; }
    if (!aWhatsapp.trim()) { setAlertsError('Escribe el número de WhatsApp donde quieres recibir la alerta.'); return; }
    setSavingAlert(true); setAlertsError('');
    try {
      await radarApi('/api/radar/alerts', {
        method: 'POST',
        body: JSON.stringify({ keyword: k, country: aCountry, whatsapp: aWhatsapp.trim() }),
      });
      setAKeyword(''); setAWhatsapp('');
      loadAlerts();
    } catch (e: any) {
      if (isRadarBlocked(e)) handleBlocked(e);
      else setAlertsError(e.message);
    } finally {
      setSavingAlert(false);
    }
  };

  const deleteAlert = async (id: string) => {
    if (!window.confirm('¿Eliminar esta alerta?')) return;
    try {
      await api(`/api/radar/alerts/${id}`, { method: 'DELETE' });
      loadAlerts();
    } catch (e: any) {
      setAlertsError(e.message);
    }
  };

  const toggleFav = async (type: 'ad' | 'trend', data: any) => {
    const key = data.id || data.query;
    if (favIds.has(key)) {
      const f = favorites.find((x) => (x.data?.id || x.data?.query) === key);
      if (f) {
        await api(`/api/radar/favorites/${f.id}`, { method: 'DELETE' }).catch(() => {});
        loadFavorites();
      }
      return;
    }
    await api('/api/radar/favorites', { method: 'POST', body: JSON.stringify({ type, data }) }).catch(() => {});
    loadFavorites();
  };

  const launch = (text: string, imageUrl?: string, kw?: string) => {
    if (onLaunchTraffiker) onLaunchTraffiker({ text, imageUrl, keyword: kw });
  };

  const launchFromAd = (ad: AdResult) => {
    const srcLabel = SOURCES.find((s) => s.id === source)?.label || 'Meta';
    launch(
      `Quiero lanzar una campaña ganadora inspirada en este anuncio que espié en el Radar de Anuncios:\n\nAnunciante: ${ad.pageName}\nFuente: ${srcLabel} · País: ${country}\nLleva ${ad.activeDays ?? '?'} días activo\nTexto del anuncio: ${(ad.body || '').slice(0, 400)}\n\nAdáptalo a mi negocio y dime la estructura lista para lanzar.`,
      ad.image,
      keyword
    );
  };

  const inputCls = 'bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/60 w-full';

  const upsellCard = blocked && (
    <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/50 rounded-2xl p-5 mb-4 shadow-lg shadow-amber-500/10">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-amber-400" />
        <h3 className="text-base font-bold text-white">Radar de Anuncios es una herramienta aparte</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Desbloquea búsquedas ilimitadas en Meta, TikTok y Google, análisis con IA, espionaje de tiendas y alertas por WhatsApp.
      </p>
      {tiersLoading ? (
        <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando planes…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(tiers.length ? tiers : FALLBACK_TIERS).map((t) => (
            <div key={t.id} className={`rounded-xl border p-4 flex flex-col ${t.featured ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-zinc-900/60'}`}>
              {t.featured && <span className="text-[10px] bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full uppercase self-start mb-2">Más popular</span>}
              <span className="font-bold text-white">{t.name}</span>
              <div className="mt-1 text-amber-400 font-extrabold text-xl">USD {t.priceUsd}<span className="text-xs text-gray-400 font-normal">/mes</span></div>
              <ul className="text-[11px] text-gray-400 mt-2 space-y-1 flex-1">
                <li>· {t.searchesPerDay}</li>
                <li>· {t.deepAnalysis ? 'Análisis profundo con IA' : 'Búsquedas de anuncios'}</li>
                <li>· {t.maxAlerts} alertas WhatsApp</li>
              </ul>
              <button onClick={() => subscribe(t)} className="mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl px-3 py-2.5 transition">
                Suscribirme
              </button>
            </div>
          ))}
        </div>
      )}
      {subscribeError && <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mt-3">{subscribeError}</p>}
    </div>
  );

  const scoreColor = (s: number) => (s >= 75 ? 'text-amber-300' : s >= 50 ? 'text-amber-500' : 'text-zinc-500');
  const scoreBg = (s: number) => (s >= 75 ? 'from-amber-500 to-amber-300' : s >= 50 ? 'from-amber-600 to-amber-500' : 'from-zinc-600 to-zinc-500');

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Radar size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Radar de Anuncios</h1>
          <p className="text-xs text-gray-400">Espía anuncios ganadores en Meta, TikTok y Google · mundial</p>
        </div>
      </div>

      <div className="flex gap-1 mt-4 mb-5 border-b border-white/10 pb-1 overflow-x-auto">
        {([
          { id: 'virales', label: 'Virales por país', icon: <Flame size={15} /> },
          { id: 'spy', label: 'Espía de anuncios', icon: <Search size={15} /> },
          { id: 'trends', label: 'Tendencias', icon: <TrendingUp size={15} /> },
          { id: 'stores', label: 'Tiendas', icon: <Store size={15} /> },
          { id: 'alerts', label: 'Alertas', icon: <Bell size={15} /> },
          { id: 'favorites', label: `Favoritos${favorites.length ? ` (${favorites.length})` : ''}`, icon: <Star size={15} /> },
        ] as { id: TabId; label: string; icon: any }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition whitespace-nowrap ${tab === t.id ? 'text-amber-400 border-b-2 border-amber-400 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'virales' && (
        <div>
          {upsellCard}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2"><Flame size={17} className="text-amber-400" /> Lo que más se está moviendo</h3>
            <select value={vCountry} onChange={(e) => setVCountry(e.target.value)} className={inputCls + ' ml-auto w-auto'}>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <button onClick={() => loadVirales(vCountry)} disabled={viralesLoading} className="text-xs font-semibold bg-zinc-800 border border-amber-500/40 text-amber-300 rounded-xl px-3 py-2 hover:bg-zinc-700 disabled:opacity-50">
              {viralesLoading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">Señales reales de movimiento por país: búsquedas de Google (lo más buscado y lo que va en aumento) y anuncios top de TikTok por categoría. No son las ventas internas de la competencia —nadie puede verlas—: es donde hay demanda y publicidad activa ahora mismo.</p>
          {viralesError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{viralesError}</div>}
          {viralesLoading && !virales && <div className="text-sm text-gray-400 py-8 text-center">Cargando los productos virales del país…</div>}
          {virales && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {virales.map((cat: any) => (
                <div key={cat.id} className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                    <span className="text-[10px] font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-full px-2 py-0.5 whitespace-nowrap">{cat.keyword}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-2">
                    {tikLoading && !tik ? 'Consultando anuncios de TikTok…' : tik && tik[cat.id] ? (
                      <>🎵 <span className="text-zinc-200 font-semibold">{tik[cat.id].count}</span> anuncios top en TikTok{tik[cat.id].examples?.length ? <> · {tik[cat.id].examples.join(', ')}</> : null}</>
                    ) : 'Sin actividad de TikTok detectada'}
                  </div>
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide mb-1.5">Lo más buscado</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(cat.top || []).length ? cat.top.map((t: any, i: number) => (
                        <span key={i} className="text-[11px] bg-zinc-800 border border-white/10 text-zinc-200 rounded-full px-2 py-0.5">{t.query} <span className="text-amber-400 font-semibold">{t.value}</span></span>
                      )) : <span className="text-[11px] text-gray-500">Sin datos por ahora</span>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide mb-1.5">En aumento</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(cat.rising || []).length ? cat.rising.map((t: any, i: number) => (
                        <span key={i} className="text-[11px] bg-zinc-800/80 border border-amber-500/30 text-zinc-200 rounded-full px-2 py-0.5">{t.query}{t.change != null && t.change !== '' ? <span className="text-amber-400 font-semibold"> +{t.change}%</span> : <span className="text-amber-400 font-semibold"> ↑</span>}</span>
                      )) : <span className="text-[11px] text-gray-500">Sin datos por ahora</span>}
                    </div>
                  </div>
                  <button onClick={() => verAnuncios(cat.keyword)} className="mt-4 w-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl px-3 py-2 transition">
                    Ver anuncios de esta categoría
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'spy' && (
        <div>
          {upsellCard}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSpy()}
                placeholder="Palabra clave: ej. freidora de aire, serum, faja…" className={inputCls} />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <div className="flex bg-zinc-950 border border-white/10 rounded-xl p-1 gap-1" role="tablist" aria-label="Fuente de anuncios">
                {SOURCES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${source === s.id ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300">
                <option value="oldest">Más antiguos primero (probados)</option>
                <option value="newest">Más recientes primero</option>
              </select>
              <button onClick={() => doSpy()} disabled={spying} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50">
                {spying ? 'Espiando…' : '🔍 Espiar anuncios'}
              </button>
              {spyCached && <span className="text-[11px] text-gray-500">resultado en caché</span>}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Fuente: bibliotecas públicas de anuncios. <span className="text-amber-400/90">Los anuncios con más días activos suelen ser los ganadores.</span></p>
          </div>

          {spyError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{spyError}</div>}
          {spying && <div className="text-center text-gray-400 text-sm py-10">Abriendo la biblioteca de anuncios y leyendo los resultados… esto toma ~30 segundos.</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                {ad.image ? (
                  <img src={ad.image} alt="" className="w-full h-44 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-24 bg-zinc-800 flex items-center justify-center text-gray-600 text-xs">sin imagen</div>
                )}
                <div className="p-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-white truncate">{ad.pageName}</span>
                    {ad.activeDays != null && ad.activeDays > 0 && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${ad.activeDays >= 60 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-400'}`}>
                        <Flame size={11} className="inline -mt-0.5" /> {ad.activeDays} días
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-3 flex-1">{ad.body || '—'}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(ad.platforms || []).map((p) => <span key={p} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">{p}</span>)}
                    {ad.startDate && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} />{ad.startDate}</span>}
                  </div>
                  {ad.destinationType === 'whatsapp' && (
                    ad.destination
                      ? <a href={ad.destination} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 border border-amber-400/60 text-amber-200 rounded-full px-2 py-0.5 w-fit">Destino: WhatsApp <ExternalLink size={10} /></a>
                      : <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 border border-amber-400/60 text-amber-200 rounded-full px-2 py-0.5 w-fit">Destino: WhatsApp</span>
                  )}
                  {ad.destinationType === 'landing' && ad.destination && (
                    <a href={ad.destination} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-zinc-800/80 border border-amber-500/30 text-zinc-200 rounded-full px-2 py-0.5 w-fit max-w-full truncate">Destino: Landing <ExternalLink size={10} /></a>
                  )}
                  {ad.activeDays != null && ad.activeDays >= 30 && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 border border-amber-400/60 text-amber-300 rounded-full px-2 py-0.5 w-fit">🔥 Posible ganador · {ad.activeDays} días activo</span>
                  )}
                  {(() => { const v = ads.filter((x) => versionKey(x) === versionKey(ad)).length; return v >= 3 ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-zinc-800/80 border border-amber-500/40 text-amber-300 rounded-full px-2 py-0.5 w-fit">📈 Escalando · {v} versiones</span>
                  ) : null; })()}
                  <div className="flex gap-1.5 mt-3">
                    <button onClick={() => launchFromAd(ad)} className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg px-2 py-2 flex items-center justify-center gap-1">
                      <Rocket size={13} /> Lanzar en Traffiker IA
                    </button>
                    <button onClick={() => doAnalyze(ad)} title="Analizar con IA"
                      className="p-2 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/15">
                      <Sparkles size={14} />
                    </button>
                    <button onClick={() => toggleFav('ad', ad)} title="Guardar en favoritos"
                      className={`p-2 rounded-lg border ${favIds.has(ad.id) ? 'border-amber-500/60 text-amber-400 bg-amber-500/10' : 'border-white/10 text-gray-500 hover:text-amber-400'}`}>
                      <Star size={14} fill={favIds.has(ad.id) ? 'currentColor' : 'none'} />
                    </button>
                    <a href={ad.url} target="_blank" rel="noreferrer" title="Ver en biblioteca de anuncios"
                      className="p-2 rounded-lg border border-white/10 text-gray-500 hover:text-white">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {sourceNote && ads.length > 0 && <p className="text-[11px] text-gray-600 mt-4">{sourceNote}</p>}
        </div>
      )}

      {tab === 'trends' && (
        <div>
          {upsellCard}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2">
              <input value={tKeyword} onChange={(e) => setTKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doTrend()}
                placeholder="Producto o categoría: ej. freidora de aire…" className={inputCls} />
              <select value={tCountry} onChange={(e) => setTCountry(e.target.value)} className={inputCls}>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <button onClick={() => doTrend()} disabled={trending} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50">
                {trending ? 'Analizando…' : '📈 Ver tendencia'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {CATEGORY_CHIPS.map((c) => (
                <button key={c} onClick={() => { setTKeyword(c); doTrend(c); }}
                  className="text-[11px] bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 text-gray-300 hover:text-amber-300 rounded-full px-3 py-1 transition">
                  {c}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Fuente: Google Trends · interés de búsqueda últimos 12 meses.</p>
          </div>

          {trendError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{trendError}</div>}

          {points.length > 0 && (
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={15} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">Interés: {tKeyword}</span>
              </div>
              <Sparkline points={points} />
            </div>
          )}

          {rising.length > 0 && (
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">Búsquedas en aumento <span className="text-gray-500 font-normal">— posibles productos ganadores</span></span>
              </div>
              <div className="space-y-2">
                {rising.map((r) => (
                  <div key={r.query} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                    <TrendingUp size={14} className="text-amber-400 shrink-0" />
                    <span className="text-sm text-white flex-1 truncate">{r.query}</span>
                    {r.label && <span className="text-[11px] text-amber-400 font-semibold">{r.label}</span>}
                    <button onClick={() => { setKeyword(r.query); setTab('spy'); doSpy(r.query); }}
                      className="text-[11px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                      Buscar anuncios
                    </button>
                    <button onClick={() => toggleFav('trend', r)} title="Guardar"
                      className={`${favIds.has(r.query) ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}>
                      <Star size={14} fill={favIds.has(r.query) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'stores' && (
        <div>
          {upsellCard}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Store size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white">Espía la tienda de tu competencia</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doStoreAnalyze()}
                placeholder="Pega la URL: https://tienda-competencia.com" className={inputCls} />
              <button onClick={doStoreAnalyze} disabled={storeLoading} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50 whitespace-nowrap">
                {storeLoading ? 'Analizando…' : 'Analizar tienda'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Detectamos la plataforma (Shopify, WooCommerce u otra) y listamos su catálogo de productos.</p>
          </div>

          {storeError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{storeError}</div>}
          {storeLoading && <div className="text-center text-gray-400 text-sm py-10">Leyendo la tienda y su catálogo…</div>}

          {storeData && (
            <div>
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">{storeData.platform}</span>
                  <span className="text-sm font-semibold text-white flex-1 truncate">{storeData.title}</span>
                  {storeData.currency && <span className="text-xs text-gray-400">{storeData.currency}</span>}
                </div>
                <p className="text-[11px] text-gray-500 mt-2">{storeData.products.length} productos detectados</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {storeData.products.map((p, i) => (
                  <div key={i} className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-32 object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-20 bg-zinc-800 flex items-center justify-center text-gray-600 text-xs">sin imagen</div>
                    )}
                    <div className="p-2.5">
                      <p className="text-xs text-white line-clamp-2 font-medium">{p.name}</p>
                      {p.price && <p className="text-sm font-bold text-amber-400 mt-1">{p.price}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          {upsellCard}
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white">Nueva alerta</h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Te avisamos por WhatsApp cuando detectemos anuncios nuevos sobre tu palabra clave.
              {alertLimit != null && <span className="text-amber-400/90 font-semibold"> {alerts.length}/{alertLimit} alertas usadas.</span>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_150px_auto] gap-2">
              <input value={aKeyword} onChange={(e) => setAKeyword(e.target.value)}
                placeholder="Palabra clave: ej. serum vitamina C" className={inputCls} />
              <select value={aCountry} onChange={(e) => setACountry(e.target.value)} className={inputCls}>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <input value={aWhatsapp} onChange={(e) => setAWhatsapp(e.target.value)}
                placeholder="WhatsApp: +57 300…" className={inputCls} />
              <button onClick={saveAlert} disabled={savingAlert} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50 whitespace-nowrap">
                {savingAlert ? 'Guardando…' : 'Crear alerta'}
              </button>
            </div>
          </div>

          {alertsError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{alertsError}</div>}
          {alertsLoading && <div className="text-center text-gray-400 text-sm py-10 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando alertas…</div>}

          {!alertsLoading && alerts.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-12">
              <Bell size={28} className="mx-auto mb-2 text-gray-700" />
              Aún no tienes alertas.<br />Crea la primera y entérate antes que tu competencia.
            </div>
          )}

          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2.5">
                <Zap size={14} className="text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{a.keyword}</div>
                  <div className="text-[11px] text-gray-500">{countries.find((c) => c.code === a.country)?.name || a.country} · {a.whatsapp}</div>
                </div>
                <button onClick={() => deleteAlert(a.id)} title="Eliminar alerta" className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'favorites' && (
        <div>
          {favorites.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-12">
              <Star size={28} className="mx-auto mb-2 text-gray-700" />
              Aún no tienes favoritos.<br />Espía anuncios o explora tendencias y guarda los que te gusten con la ★.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favorites.map((f) => (
              <div key={f.id} className="bg-zinc-900/60 border border-white/10 rounded-2xl p-3">
                {f.type === 'ad' ? (
                  <div>
                    {f.data.image && <img src={f.data.image} alt="" className="w-full h-32 object-cover rounded-xl mb-2" loading="lazy" />}
                    <div className="text-sm font-semibold text-white truncate">{f.data.pageName}</div>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{f.data.body}</p>
                    <div className="flex gap-1.5 mt-3">
                      <button onClick={() => launchFromAd(f.data)} className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg px-2 py-2 flex items-center justify-center gap-1">
                        <Rocket size={13} /> Lanzar en Traffiker IA
                      </button>
                      <button onClick={() => toggleFav('ad', f.data)} className="p-2 rounded-lg border border-white/10 text-amber-400"><Star size={14} fill="currentColor" /></button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={15} className="text-amber-400" />
                      <span className="text-sm font-semibold text-white flex-1 truncate">{f.data.query}</span>
                    </div>
                    {f.data.label && <div className="text-[11px] text-amber-400 mt-1">{f.data.label} en aumento</div>}
                    <div className="flex gap-1.5 mt-3">
                      <button onClick={() => { setKeyword(f.data.query); setTab('spy'); doSpy(f.data.query); }}
                        className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg px-2 py-2">
                        Buscar anuncios
                      </button>
                      <button onClick={() => toggleFav('trend', f.data)} className="p-2 rounded-lg border border-white/10 text-amber-400"><Star size={14} fill="currentColor" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-1 text-[11px] text-gray-600">
        <ChevronDown size={12} />
        El Radar lee datos públicos (bibliotecas de anuncios y Google Trends). Úsalo como inspiración: adapta el ángulo a tu marca, no copies piezas tal cual.
      </div>

      {analyzingAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => { if (!analyzing) setAnalyzingAd(null); }}>
          <div className="w-full max-w-lg bg-zinc-950 border border-amber-500/30 rounded-2xl p-5 sm:p-6 relative my-8" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAnalyzingAd(null)} className="absolute top-3 right-3 text-gray-500 hover:text-white p-1">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="text-lg font-bold text-white">Análisis con IA</h3>
            </div>
            <p className="text-xs text-gray-500 truncate mb-4">{analyzingAd.pageName}</p>

            {analyzing && (
              <div className="text-center py-10">
                <Loader2 className="animate-spin mx-auto text-amber-400" size={32} />
                <p className="text-sm text-gray-400 mt-3">La IA está diseccionando este anuncio: ganchos, ángulos y por qué vende…</p>
              </div>
            )}

            {analysisError && !analyzing && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">{analysisError}</div>
            )}

            {analysis && !analyzing && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-400">Puntaje de anuncio ganador</span>
                    <span className={`text-2xl font-extrabold ${scoreColor(analysis.score)}`}>{analysis.score}/100</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${scoreBg(analysis.score)} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, analysis.score))}%` }} />
                  </div>
                </div>
                {([
                  { title: 'Ganchos', items: analysis.hooks, icon: <Flame size={14} /> },
                  { title: 'Ángulos', items: analysis.angles, icon: <Target size={14} /> },
                ] as { title: string; items: string[]; icon: any }[]).map((s) => s.items.length > 0 && (
                  <div key={s.title}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wide mb-1.5">{s.icon}{s.title}</div>
                    <ul className="space-y-1">
                      {s.items.map((it, i) => <li key={i} className="text-xs text-gray-300 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">· {it}</li>)}
                    </ul>
                  </div>
                ))}
                {analysis.whySells.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-1.5">Por qué vende</div>
                    <ul className="space-y-1">
                      {analysis.whySells.map((it, i) => <li key={i} className="text-xs text-gray-300">✓ {it}</li>)}
                    </ul>
                  </div>
                )}
                {analysis.risks.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-red-300 uppercase tracking-wide mb-1.5">Riesgos</div>
                    <ul className="space-y-1">
                      {analysis.risks.map((it, i) => <li key={i} className="text-xs text-gray-400">⚠ {it}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {payModal && (
        <BoldPayModal
          tier={payModal.tier}
          bold={payModal.bold}
          orderId={payModal.orderId}
          onClose={() => setPayModal(null)}
          onSuccess={onPaid}
        />
      )}
    </div>
  );
}
