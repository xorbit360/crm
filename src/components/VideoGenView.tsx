// Generación de Video Xorbit 360 — crear clips y videos largos con IA.
// Todo en español, colores de marca (oscuro + dorado).
import { useEffect, useRef, useState } from 'react';
import { Clapperboard, Film, Clock, Sparkles, Upload, Download, Wallet, Tag, ListVideo, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';

const card = 'bg-[#161208] border border-[#f5b94233] rounded-2xl p-4';
const inputCls = 'w-full bg-[#0e0c07] border border-white/15 rounded-xl px-3 py-2.5 text-[15px] text-[#f5efe2] placeholder:text-gray-600 focus:border-[#f5b942] focus:outline-none';
const btnGold = 'bg-gradient-to-br from-[#f5b942] to-[#b97f16] text-[#1a1206] font-bold rounded-xl px-4 py-2.5 text-[15px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed';
const btnGhost = 'border border-[#f5b94255] text-[#f5b942] rounded-xl px-4 py-2.5 text-[15px] hover:bg-[#f5b94214] disabled:opacity-50';
const gold = 'text-[#f5b942]';

async function api(path: string, method = 'GET', body?: any) {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

interface VgModel {
  id: string; name: string; vendor: string; badge?: string | null; description: string;
  audio: boolean; hasAudioOption: boolean; resolutions: string[]; defaultResolution: string;
  minClipSec: number; maxClipSec: number; aspects: string[]; imageToVideo: boolean;
  costPerSec: Record<string, number>; salePerSec: Record<string, number>; salePerSecAudio?: Record<string, number> | null;
}
interface Estimate {
  model: string; modelName: string; resolution: string; aspectRatio: string;
  mode: 'clip' | 'long'; totalSec: number;
  clips: { index: number; durationSec: number; prompt: string }[];
  costUsd: number; priceUsd: number; costPerSec: number; pricePerSec: number;
}
interface VgJob {
  id: string; prompt: string; model: string; modelName: string; mode: string; totalSec: number;
  resolution: string; aspectRatio: string; status: string; progress: number; progressMsg: string;
  outputUrl?: string | null; costUsd?: number | null; priceUsd?: number | null; error?: string | null;
  created_at: string;
}

const fmtUsd = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (s: string) => { try { return new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };

export default function VideoGenView({ currentUser }: { currentUser?: { name: string; email: string; role: string } | null }) {
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const [tab, setTab] = useState<'crear' | 'videos' | 'precios'>('crear');
  const [models, setModels] = useState<VgModel[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [engine, setEngine] = useState<any>(null);
  const [toast, setToast] = useState('');
  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 4000); };

  // Form
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState('');
  const [longMode, setLongMode] = useState(false);
  const [totalSec, setTotalSec] = useState(60);
  const [clipSec, setClipSec] = useState(8);
  const [aspect, setAspect] = useState('9:16');
  const [resolution, setResolution] = useState('');
  const [withAudio, setWithAudio] = useState(false);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Jobs
  const [jobs, setJobs] = useState<VgJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const pollRef = useRef<any>(null);

  // Precios (superadmin)
  const [pricing, setPricing] = useState<any>(null);
  const [markup, setMarkup] = useState(100);
  const [ledger, setLedger] = useState<any[]>([]);
  const [topupTenant, setTopupTenant] = useState('default');
  const [topupAmount, setTopupAmount] = useState('20');

  const model = models.find((m) => m.id === modelId) || null;

  const loadBase = async () => {
    try {
      const m = await api('/api/video-gen/models');
      setModels(m.models || []);
      if (!modelId && m.models?.length) {
        const rec = m.models.find((x: VgModel) => x.badge === 'Recomendado') || m.models[0];
        setModelId(rec.id); setResolution(rec.defaultResolution);
      }
    } catch (e: any) { showToast(e.message); }
    try { const w = await api('/api/video-gen/wallet'); setWallet(w.balanceUsd ?? 0); } catch { /* noop */ }
    try { const e = await api('/api/video-gen/engine'); setEngine(e); } catch { /* noop */ }
  };
  const loadJobs = async () => {
    setJobsLoading(true);
    try { const j = await api('/api/video-gen/jobs'); setJobs(j.jobs || []); } catch (e: any) { showToast(e.message); }
    setJobsLoading(false);
  };
  const loadPricing = async () => {
    if (!isSuperAdmin) return;
    try {
      const p = await api('/api/video-gen/pricing');
      setPricing(p); setMarkup(p.markupPct ?? 100);
      const l = await api('/api/video-gen/ledger?all=1');
      setLedger(l.ledger || []);
    } catch (e: any) { showToast(e.message); }
  };

  useEffect(() => { loadBase(); loadJobs(); }, []);
  useEffect(() => { if (tab === 'precios') loadPricing(); }, [tab]);
  // Poll de trabajos activos
  useEffect(() => {
    const active = jobs.some((j) => j.status === 'queued' || j.status === 'working');
    if (pollRef.current) clearInterval(pollRef.current);
    if (active) pollRef.current = setInterval(loadJobs, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobs]);

  // Estimación en vivo (debounce)
  useEffect(() => {
    if (!modelId || !prompt.trim()) { setEstimate(null); return; }
    setEstimating(true);
    const t = setTimeout(async () => {
      try {
        const e = await api('/api/video-gen/estimate', 'POST', {
          modelId, prompt, totalSec: longMode ? totalSec : clipSec,
          resolution, aspectRatio: aspect, withAudio,
        });
        setEstimate(e.estimate || null);
      } catch { setEstimate(null); }
      setEstimating(false);
    }, 600);
    return () => clearTimeout(t);
  }, [prompt, modelId, longMode, totalSec, clipSec, aspect, resolution, withAudio]);

  useEffect(() => {
    if (model) {
      if (!model.resolutions.includes(resolution)) setResolution(model.defaultResolution);
      if (!model.aspects.includes(aspect)) setAspect(model.aspects.includes('9:16') ? '9:16' : model.aspects[0]);
      if (!model.audio && !model.hasAudioOption) setWithAudio(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const onImage = (f: File | undefined) => {
    if (!f) { setImageB64(null); return; }
    const rd = new FileReader();
    rd.onload = () => setImageB64(String(rd.result || ''));
    rd.readAsDataURL(f);
  };

  const doGenerate = async () => {
    if (!estimate) return;
    setGenerating(true);
    try {
      const r = await api('/api/video-gen/jobs', 'POST', {
        modelId, prompt, totalSec: longMode ? totalSec : clipSec,
        resolution, aspectRatio: aspect, withAudio,
        imageBase64: imageB64, confirmed: true,
      });
      showToast('Video en cola. Te avisamos cuando esté listo.');
      setShowPlan(false);
      setTab('videos');
      loadJobs(); loadBase();
    } catch (e: any) { showToast(e.message); }
    setGenerating(false);
  };

  const cancelJob = async (id: string) => {
    try { await api(`/api/video-gen/jobs/${id}/cancel`, 'POST'); loadJobs(); }
    catch (e: any) { showToast(e.message); }
  };

  const savePricing = async () => {
    try {
      await api('/api/video-gen/pricing', 'PUT', { markupPct: markup });
      showToast('Precios actualizados'); loadPricing(); loadBase();
    } catch (e: any) { showToast(e.message); }
  };
  const doTopup = async () => {
    try {
      const r = await api('/api/video-gen/wallet/topup', 'POST', { tenantId: topupTenant, amountUsd: Number(topupAmount) });
      showToast(`Saldo recargado: $${r.balanceUsd} USD`); loadPricing();
    } catch (e: any) { showToast(e.message); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      queued: 'bg-yellow-500/15 text-yellow-300', working: 'bg-blue-500/15 text-blue-300',
      done: 'bg-green-500/15 text-green-300', failed: 'bg-red-500/15 text-red-300',
      cancelled: 'bg-gray-500/15 text-gray-300',
    };
    const label: Record<string, string> = { queued: 'En cola', working: 'Generando', done: 'Listo', failed: 'Falló', cancelled: 'Cancelado' };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[s] || map.queued}`}>{label[s] || s}</span>;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto text-[#f5efe2]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f5b942] to-[#b97f16] flex items-center justify-center">
          <Clapperboard size={22} className="text-[#1a1206]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Generación de Video <span className={gold}>con IA</span></h1>
          <p className="text-sm text-gray-400">Clips y videos largos para Reels, TikTok y anuncios</p>
        </div>
      </div>

      {/* Saldo + estado */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className={`${card} flex items-center gap-3 !py-3`}>
          <Wallet size={18} className={gold} />
          <div>
            <div className="text-xs text-gray-400">Saldo de video</div>
            <div className="font-bold text-lg">{fmtUsd(wallet)} <span className="text-xs font-normal text-gray-400">USD</span></div>
          </div>
        </div>
        {engine && (
          <div className={`${card} flex items-center gap-3 !py-3 text-sm`}>
            {!engine.openRouterKey && <span className="flex items-center gap-1.5 text-red-300"><AlertTriangle size={15} /> Sin clave de IA</span>}
            {engine.openRouterKey && !engine.ffmpeg && <span className="flex items-center gap-1.5 text-yellow-300"><AlertTriangle size={15} /> Sin ffmpeg (videos largos limitados)</span>}
            {engine.openRouterKey && engine.ffmpeg && <span className="flex items-center gap-1.5 text-green-300"><CheckCircle2 size={15} /> Motor listo</span>}
            {(engine.queued > 0 || engine.working > 0) && <span className="text-gray-400">{engine.working} generando · {engine.queued} en cola</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[
          { id: 'crear', label: 'Crear video', icon: <Sparkles size={16} /> },
          { id: 'videos', label: 'Mis videos', icon: <ListVideo size={16} /> },
          ...(isSuperAdmin ? [{ id: 'precios', label: 'Precios y saldo', icon: <Tag size={16} /> }] : []),
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-semibold whitespace-nowrap ${tab === t.id ? 'bg-gradient-to-br from-[#f5b942] to-[#b97f16] text-[#1a1206]' : 'border border-[#f5b94255] text-[#f5b942]'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'crear' && (
        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-3 space-y-4">
            {/* Prompt */}
            <div className={card}>
              <label className="font-semibold mb-2 block">Describe la escena 🎬</label>
              <textarea className={inputCls} rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: Un barista sonriente preparando un café con arte latte en una cafetería acogedora, luz cálida de mañana, cámara lenta, estilo cinematográfico…" />
              <p className="text-xs text-gray-500 mt-2">Sé específico: personaje, acción, ambiente, estilo de cámara. Para videos largos, describe la historia completa.</p>
            </div>

            {/* Modo */}
            <div className={card}>
              <label className="font-semibold mb-2 block">Duración</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setLongMode(false)} className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold border ${!longMode ? 'bg-[#f5b94222] border-[#f5b942] text-[#f5b942]' : 'border-white/15 text-gray-300'}`}>
                  <Film size={15} className="inline mr-1.5" />Clip único
                </button>
                <button onClick={() => setLongMode(true)} className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold border ${longMode ? 'bg-[#f5b94222] border-[#f5b942] text-[#f5b942]' : 'border-white/15 text-gray-300'}`}>
                  <Clock size={15} className="inline mr-1.5" />Video largo (1 min+)
                </button>
              </div>
              {!longMode ? (
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Duración del clip</span><span className={`font-bold ${gold}`}>{clipSec}s</span></div>
                  <input type="range" min={model?.minClipSec || 3} max={model?.maxClipSec || 15} value={clipSec} onChange={(e) => setClipSec(Number(e.target.value))} className="w-full accent-[#f5b942]" />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Duración total</span><span className={`font-bold ${gold}`}>{totalSec}s ({Math.floor(totalSec / 60)}:{String(totalSec % 60).padStart(2, '0')})</span></div>
                  <input type="range" min={20} max={180} step={5} value={totalSec} onChange={(e) => setTotalSec(Number(e.target.value))} className="w-full accent-[#f5b942]" />
                  <p className="text-xs text-gray-500 mt-1">Se divide en clips de {model?.maxClipSec || 8}s con continuidad de personaje y escena, y se unen automáticamente.</p>
                </div>
              )}
            </div>

            {/* Modelos */}
            <div className={card}>
              <label className="font-semibold mb-2 block">Modelo</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {models.map((m) => {
                  const active = m.id === modelId;
                  const pps = m.salePerSec[m.defaultResolution] ?? 0;
                  return (
                    <button key={m.id} onClick={() => { setModelId(m.id); setResolution(m.defaultResolution); }}
                      className={`text-left p-3 rounded-xl border transition ${active ? 'border-[#f5b942] bg-[#f5b94214]' : 'border-white/10 hover:border-white/25'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[15px]">{m.name}</span>
                        {m.badge && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f5b942] text-[#1a1206]">{m.badge}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mb-1.5">{m.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{m.vendor} · {m.minClipSec}-{m.maxClipSec}s{m.audio ? ' · 🔊 audio' : ''}</span>
                        <span className={`font-bold ${gold}`}>${pps.toFixed(3)}/s</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formato */}
            {model && (
              <div className={card}>
                <label className="font-semibold mb-2 block">Formato y calidad</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {model.aspects.map((a) => (
                    <button key={a} onClick={() => setAspect(a)} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${aspect === a ? 'bg-[#f5b94222] border-[#f5b942] text-[#f5b942]' : 'border-white/15 text-gray-300'}`}>
                      {a === '9:16' ? '📱 Vertical 9:16' : a === '16:9' ? '🖥️ Horizontal 16:9' : '⬛ Cuadrado 1:1'}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {model.resolutions.map((r) => {
                    const pps = model.salePerSec[r] ?? 0;
                    return (
                      <button key={r} onClick={() => setResolution(r)} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${resolution === r ? 'bg-[#f5b94222] border-[#f5b942] text-[#f5b942]' : 'border-white/15 text-gray-300'}`}>
                        {r} <span className="text-xs opacity-70">${pps.toFixed(3)}/s</span>
                      </button>
                    );
                  })}
                </div>
                {model.hasAudioOption && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} className="accent-[#f5b942] w-4 h-4" />
                    Con audio generado <span className="text-gray-500">(+${((model.salePerSecAudio?.[resolution] ?? 0) - (model.salePerSec[resolution] ?? 0)).toFixed(3)}/s)</span>
                  </label>
                )}
                {model.audio && <p className="text-xs text-gray-500 mt-1">🔊 Este modelo genera audio automáticamente.</p>}
              </div>
            )}

            {/* Imagen de referencia */}
            {model?.imageToVideo && (
              <div className={card}>
                <label className="font-semibold mb-2 block">Imagen de referencia <span className="text-xs font-normal text-gray-500">(opcional — el video parte de esta imagen)</span></label>
                <label className={`${btnGhost} inline-flex items-center gap-2 cursor-pointer`}>
                  <Upload size={16} /> {imageB64 ? 'Cambiar imagen' : 'Subir imagen'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
                </label>
                {imageB64 && (
                  <div className="mt-3 flex items-start gap-3">
                    <img src={imageB64} alt="referencia" className="w-24 h-24 object-cover rounded-xl border border-white/15" />
                    <button onClick={() => setImageB64(null)} className="text-sm text-red-300 hover:underline">Quitar</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna: precio + generar */}
          <div className="md:col-span-2">
            <div className={`${card} sticky top-4`}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><Tag size={16} className={gold} /> Precio estimado</h3>
              {estimating && <p className="text-sm text-gray-400">Calculando…</p>}
              {!estimating && estimate && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Modelo</span><span className="font-semibold">{estimate.modelName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Duración</span><span className="font-semibold">{estimate.totalSec}s {estimate.mode === 'long' ? `(${estimate.clips.length} clips)` : ''}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Formato</span><span className="font-semibold">{estimate.aspectRatio} · {estimate.resolution}</span></div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className={`font-bold ${gold}`}>{fmtUsd(estimate.priceUsd)} USD</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500"><span>Saldo disponible</span><span>{fmtUsd(wallet)} USD</span></div>
                  {estimate.mode === 'long' && (
                    <button onClick={() => setShowPlan(!showPlan)} className="w-full text-xs text-[#f5b942] flex items-center justify-center gap-1 py-1.5 hover:underline">
                      Ver plan de {estimate.clips.length} clips <ChevronDown size={14} className={showPlan ? 'rotate-180' : ''} />
                    </button>
                  )}
                  {showPlan && estimate.mode === 'long' && (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs bg-black/30 rounded-xl p-2.5">
                      {estimate.clips.map((c) => (
                        <div key={c.index} className="flex justify-between gap-2"><span className="text-gray-400">Clip {c.index + 1}</span><span className="font-semibold">{c.durationSec}s</span></div>
                      ))}
                      <p className="text-gray-500 pt-1">Cada clip continúa la escena anterior con el mismo personaje y estilo.</p>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 bg-black/30 rounded-xl p-2.5">
                    💡 Ejemplos: clip 8s Seedance Fast 720p ≈ {fmtUsd(8 * 0.10)} · video 60s (8 clips) ≈ {fmtUsd(60 * 0.10)} · video 60s Veo 1080p ≈ {fmtUsd(60 * 0.30)}
                  </div>
                </div>
              )}
              {!estimating && !estimate && (
                <p className="text-sm text-gray-500">Describe la escena para ver el precio.</p>
              )}
              <button onClick={doGenerate} disabled={!estimate || generating || !prompt.trim()} className={`${btnGold} w-full mt-4 flex items-center justify-center gap-2`}>
                {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? 'Creando…' : estimate ? `Generar por ${fmtUsd(estimate.priceUsd)}` : 'Generar video'}
              </button>
              <p className="text-[11px] text-gray-500 mt-2 text-center">El cobro se descuenta de tu saldo al terminar. Si falla, no se cobra.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'videos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Mis videos</h2>
            <button onClick={loadJobs} className={btnGhost + ' !py-2 flex items-center gap-2'}><RefreshCw size={15} className={jobsLoading ? 'animate-spin' : ''} /> Actualizar</button>
          </div>
          {jobs.length === 0 && !jobsLoading && (
            <div className={`${card} text-center py-10 text-gray-400`}>
              <Film size={36} className="mx-auto mb-3 opacity-40" />
              <p>Aún no has generado videos.</p>
              <button onClick={() => setTab('crear')} className={`${btnGold} mt-4`}>Crear mi primer video</button>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {jobs.map((j) => (
              <div key={j.id} className={card}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold line-clamp-2">{j.prompt}</p>
                  {statusBadge(j.status)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
                  <span>{j.modelName}</span><span>{j.totalSec}s</span><span>{j.aspectRatio}</span><span>{j.resolution}</span><span>{fmtDate(j.created_at)}</span>
                </div>
                {(j.status === 'queued' || j.status === 'working') && (
                  <div className="mb-2">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#f5b942] to-[#b97f16] transition-all" style={{ width: `${j.progress || 0}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{j.progressMsg}</span>
                      <button onClick={() => cancelJob(j.id)} className="text-red-300 hover:underline">Cancelar</button>
                    </div>
                  </div>
                )}
                {j.status === 'failed' && <p className="text-xs text-red-300 mb-2">⚠️ {j.error}</p>}
                {j.status === 'done' && j.outputUrl && (
                  <div className="space-y-2">
                    <video src={j.outputUrl} controls playsInline className="w-full rounded-xl border border-white/10 max-h-64 bg-black" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Costo {fmtUsd(j.priceUsd || 0)}</span>
                      <a href={`/api/video-gen/jobs/${j.id}/download`} className={btnGhost + ' !py-1.5 !px-3 text-sm inline-flex items-center gap-1.5'}><Download size={14} /> Descargar MP4</a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'precios' && isSuperAdmin && (
        <div className="space-y-4">
          <div className={card}>
            <h2 className="font-bold text-lg mb-1">Precio de venta</h2>
            <p className="text-sm text-gray-400 mb-4">Define cuánto pagas tú (costo) y cuánto cobras al usuario por segundo de video.</p>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Margen sobre el costo</span><span className={`font-bold ${gold}`}>{markup}%</span></div>
              <input type="range" min={0} max={500} step={10} value={markup} onChange={(e) => setMarkup(Number(e.target.value))} className="w-full accent-[#f5b942]" />
              <p className="text-xs text-gray-500 mt-1">Ej: 100% = cobras el doble del costo. 0% = cobras al costo.</p>
            </div>
            {pricing && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-400 text-xs"><th className="py-2 pr-3">Modelo</th><th className="py-2 pr-3">Resolución</th><th className="py-2 pr-3">Costo/s</th><th className="py-2">Venta/s</th></tr></thead>
                  <tbody>
                    {pricing.table.map((row: any) => (
                      Object.keys(row.cost).map((r) => (
                        <tr key={row.id + r} className="border-t border-white/5">
                          <td className="py-2 pr-3 font-semibold">{row.name}</td>
                          <td className="py-2 pr-3 text-gray-400">{r}</td>
                          <td className="py-2 pr-3 text-gray-400">${Number(row.cost[r]).toFixed(3)}</td>
                          <td className={`py-2 font-bold ${gold}`}>${Number(row.sale[r]).toFixed(3)}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={savePricing} className={`${btnGold} mt-4`}>Guardar precios</button>
          </div>

          <div className={card}>
            <h2 className="font-bold text-lg mb-1">Recargar saldo</h2>
            <p className="text-sm text-gray-400 mb-3">Agrega USD al wallet de video de un tenant.</p>
            <div className="flex flex-wrap gap-2">
              <input className={inputCls + ' !w-40'} value={topupTenant} onChange={(e) => setTopupTenant(e.target.value)} placeholder="tenant (default)" />
              <input className={inputCls + ' !w-32'} type="number" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="USD" />
              <button onClick={doTopup} className={btnGold}>Recargar</button>
            </div>
          </div>

          <div className={card}>
            <h2 className="font-bold text-lg mb-3">Movimientos (ledger)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 text-xs"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Detalle</th><th className="py-2 pr-3">Seg</th><th className="py-2 pr-3">Costo</th><th className="py-2 pr-3">Cobrado</th><th className="py-2">Margen</th></tr></thead>
                <tbody>
                  {ledger.map((l: any) => (
                    <tr key={l.id} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(l.created_at)}</td>
                      <td className="py-2 pr-3">{l.modelName || l.kind} <span className="text-xs text-gray-500">({l.tenant_id})</span></td>
                      <td className="py-2 pr-3">{l.totalSec || '—'}</td>
                      <td className="py-2 pr-3 text-gray-400">{fmtUsd(l.costUsd)}</td>
                      <td className={`py-2 pr-3 font-semibold ${gold}`}>{fmtUsd(l.priceUsd)}</td>
                      <td className="py-2 text-green-300">{fmtUsd(l.marginUsd)}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-500">Sin movimientos aún.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-4 right-4 md:left-auto md:right-6 bottom-6 z-50 bg-[#1a1206] border border-[#f5b94266] text-[#f5efe2] rounded-2xl px-4 py-3 shadow-2xl text-sm max-w-md flex items-start gap-2">
          <AlertTriangle size={16} className="text-[#f5b942] shrink-0 mt-0.5" />{toast}
        </div>
      )}
    </div>
  );
}
