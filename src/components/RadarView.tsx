import React, { useState, useEffect } from 'react';
import { Radar, Search, TrendingUp, Star, Rocket, ExternalLink, Flame, Clock, ChevronDown, Sparkles, BarChart3 } from 'lucide-react';

type TabId = 'spy' | 'trends' | 'favorites';

interface AdResult {
  id: string;
  pageName: string;
  body: string;
  image: string;
  startDate: string;
  activeDays: number | null;
  platforms: string[];
  url: string;
}

const COUNTRIES = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'AR', name: 'Argentina' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
];

const CATEGORY_CHIPS = ['Belleza', 'Hogar', 'Mascotas', 'Fitness', 'Cocina', 'Tecnología', 'Ropa', 'Juguetes'];

async function api(path: string, opts: any = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(j.error || 'Error de red');
  return j;
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
        <span className={growth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% en 12 meses
        </span>
        <span>{last.t}</span>
      </div>
    </div>
  );
}

export default function RadarView({ onLaunchTraffiker }: { onLaunchTraffiker?: (brief: { text: string; imageUrl?: string; keyword?: string }) => void }) {
  const [tab, setTab] = useState<TabId>('spy');

  // Espía
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('CO');
  const [platform, setPlatform] = useState('all');
  const [sort, setSort] = useState('oldest');
  const [ads, setAds] = useState<AdResult[]>([]);
  const [spying, setSpying] = useState(false);
  const [spyError, setSpyError] = useState('');
  const [spyCached, setSpyCached] = useState(false);
  const [sourceNote, setSourceNote] = useState('');

  // Tendencias
  const [tKeyword, setTKeyword] = useState('');
  const [tCountry, setTCountry] = useState('CO');
  const [points, setPoints] = useState<{ t: string; v: number }[]>([]);
  const [rising, setRising] = useState<{ query: string; value: number; label: string }[]>([]);
  const [trending, setTrending] = useState(false);
  const [trendError, setTrendError] = useState('');

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

  const doSpy = async (kw?: string) => {
    const k = (kw ?? keyword).trim();
    if (!k) { setSpyError('Escribe una palabra clave para espiar.'); return; }
    setSpying(true); setSpyError(''); setAds([]);
    try {
      const j = await api('/api/radar/ads/search', {
        method: 'POST',
        body: JSON.stringify({ keyword: k, country, platform, sort, limit: 24 }),
      });
      setAds(j.ads || []);
      setSpyCached(!!j.cached);
      setSourceNote(j.sourceNote || '');
      if (!(j.ads || []).length) setSpyError('No se encontraron anuncios activos para esa búsqueda. Prueba con otra palabra.');
    } catch (e: any) {
      setSpyError(e.message);
    } finally {
      setSpying(false);
    }
  };

  const doTrend = async (kw?: string) => {
    const k = (kw ?? tKeyword).trim();
    if (!k) { setTrendError('Escribe una palabra o categoría.'); return; }
    setTrending(true); setTrendError(''); setPoints([]); setRising([]);
    try {
      const [i, r] = await Promise.all([
        api(`/api/radar/trends/interest?keyword=${encodeURIComponent(k)}&country=${tCountry}`),
        api(`/api/radar/trends/related?keyword=${encodeURIComponent(k)}&country=${tCountry}`),
      ]);
      setPoints(i.points || []);
      setRising(r.rising || []);
    } catch (e: any) {
      setTrendError(e.message);
    } finally {
      setTrending(false);
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
    launch(
      `Quiero lanzar una campaña ganadora inspirada en este anuncio que espié en el Radar:\n\nAnunciante: ${ad.pageName}\nPaís: ${country}\nLleva ${ad.activeDays ?? '?'} días activo\nTexto del anuncio: ${(ad.body || '').slice(0, 400)}\n\nAdáptalo a mi negocio y dime la estructura lista para lanzar.`,
      ad.image,
      keyword
    );
  };

  const inputCls = 'bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/60 w-full';
  const btnGold = 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50';

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Radar size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Radar</h1>
          <p className="text-xs text-gray-400">Espía anuncios ganadores y detecta productos en tendencia · LATAM</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4 mb-5 border-b border-white/10 pb-1">
        {([
          { id: 'spy', label: 'Espía de anuncios', icon: <Search size={15} /> },
          { id: 'trends', label: 'Productos en tendencia', icon: <TrendingUp size={15} /> },
          { id: 'favorites', label: `Favoritos${favorites.length ? ` (${favorites.length})` : ''}`, icon: <Star size={15} /> },
        ] as { id: TabId; label: string; icon: any }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition ${tab === t.id ? 'text-amber-400 border-b-2 border-amber-400 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'spy' && (
        <div>
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSpy()}
                placeholder="Palabra clave: ej. freidora de aire, serum, faja…" className={inputCls} />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300">
                <option value="all">Todas las plataformas</option>
                <option value="facebook">Solo Facebook</option>
                <option value="instagram">Solo Instagram</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300">
                <option value="oldest">Más antiguos primero (probados)</option>
                <option value="newest">Más recientes primero</option>
              </select>
              <button onClick={() => doSpy()} disabled={spying} className={btnGold}>
                {spying ? 'Espiando…' : '🔍 Espiar anuncios'}
              </button>
              {spyCached && <span className="text-[11px] text-gray-500">resultado en caché</span>}
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Fuente: Meta Ad Library pública. <span className="text-amber-400/90">Los anuncios con más días activos suelen ser los ganadores.</span></p>
          </div>

          {spyError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{spyError}</div>}
          {spying && <div className="text-center text-gray-400 text-sm py-10">Abriendo la Ad Library y leyendo los anuncios… esto toma ~30 segundos.</div>}

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
                  <div className="flex gap-1.5 mt-3">
                    <button onClick={() => launchFromAd(ad)} className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg px-2 py-2 flex items-center justify-center gap-1">
                      <Rocket size={13} /> Lanzar en Traffiker IA
                    </button>
                    <button onClick={() => toggleFav('ad', ad)} title="Guardar en favoritos"
                      className={`p-2 rounded-lg border ${favIds.has(ad.id) ? 'border-amber-500/60 text-amber-400 bg-amber-500/10' : 'border-white/10 text-gray-500 hover:text-amber-400'}`}>
                      <Star size={14} fill={favIds.has(ad.id) ? 'currentColor' : 'none'} />
                    </button>
                    <a href={ad.url} target="_blank" rel="noreferrer" title="Ver en Ad Library"
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
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2">
              <input value={tKeyword} onChange={(e) => setTKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doTrend()}
                placeholder="Producto o categoría: ej. freidora de aire…" className={inputCls} />
              <select value={tCountry} onChange={(e) => setTCountry(e.target.value)} className={inputCls}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <button onClick={() => doTrend()} disabled={trending} className={btnGold}>
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
                    <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-sm text-white flex-1 truncate">{r.query}</span>
                    {r.label && <span className="text-[11px] text-emerald-400 font-semibold">{r.label}</span>}
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
                      <TrendingUp size={15} className="text-emerald-400" />
                      <span className="text-sm font-semibold text-white flex-1 truncate">{f.data.query}</span>
                    </div>
                    {f.data.label && <div className="text-[11px] text-emerald-400 mt-1">{f.data.label} en aumento</div>}
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
        El Radar lee datos públicos (Meta Ad Library y Google Trends). Úsalo como inspiración: adapta el ángulo a tu marca, no copies piezas tal cual.
      </div>
    </div>
  );
}
