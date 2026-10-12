import React, { useEffect, useState } from 'react';
import { Layout, Plus, Pencil, Trash2, Eye, Rocket, Copy, Check, X, ChevronUp, ChevronDown, Gauge, Globe, ShoppingBag, Loader2, AlertTriangle, CheckCircle2, Link2, Sparkles, Clock, MessageCircle, Star, HelpCircle, Image as ImageIcon, Type, Timer, PlaySquare, Minus } from 'lucide-react';

// ============================================================================
// Constructor de Páginas Xorbit 360 — editor por bloques con chequeo de
// conversión en vivo, clonador, publicación en Shopify y checkout sincronizado
// con Pedidos del CRM. Marca: oscuro + dorado, español, sin pasteles.
// ============================================================================

type BlockType = 'hero' | 'beneficios' | 'producto' | 'testimonios' | 'garantia' | 'faq' | 'cta' | 'checkout' | 'countdown' | 'video' | 'imagen_texto' | 'footer';
interface PageBlock { id: string; type: BlockType; props: Record<string, any>; }
interface BuilderSettings { whatsappNumber?: string; metaDescription?: string; checkoutType?: string; currency?: string; metaPixelId?: string; accentColor?: string; socials?: any; announcement?: string; }
interface BuilderPage { id: string; slug: string; name: string; page_type: string; status: string; conversion_score?: number; rawHtml?: string; blocks?: PageBlock[]; settings?: BuilderSettings; created_at?: string; updated_at?: string; }
interface Finding { id: string; title: string; severity: string; category: string; evidence: string; impact: string; }
interface CheckResult { score: number; grade: string; gradeLabel: string; blocks: { key: string; label: string; score: number; weight: number }[]; findings: Finding[]; stats: { problems: number; critical: number }; }

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Portada', beneficios: 'Beneficios', producto: 'Producto / Oferta', testimonios: 'Testimonios',
  garantia: 'Garantía', faq: 'Preguntas frecuentes', cta: 'Llamado a la acción', checkout: 'Formulario de pedido',
  countdown: 'Cuenta regresiva', video: 'Video', imagen_texto: 'Imagen + texto', footer: 'Pie de página',
};
const BLOCK_ICONS: Record<BlockType, any> = {
  hero: Star, beneficios: CheckCircle2, producto: ShoppingBag, testimonios: MessageCircle, garantia: CheckCircle2,
  faq: HelpCircle, cta: Rocket, checkout: Type, countdown: Timer, video: PlaySquare, imagen_texto: ImageIcon, footer: Minus,
};
const TEMPLATES = [
  { id: 'oferta', name: 'Oferta Directa', desc: 'Hero, cuenta regresiva, beneficios, garantía y pedido. La clásica que vende.' },
  { id: 'premium', name: 'Producto Premium', desc: 'Prueba social fuerte y garantía incondicional.' },
  { id: 'whatsapp', name: 'Captación WhatsApp', desc: 'Sin formulario: todo el tráfico va a tu WhatsApp.' },
  { id: 'producto', name: 'Página de Producto', desc: 'Estilo ficha de producto con precio y pedido.' },
  { id: 'ecommerce', name: 'E-commerce Contraentrega', desc: 'Tienda con pago al recibir: hero, oferta, testimonios y pedido.' },
  { id: 'servicios', name: 'Servicios / Agencia', desc: 'Para agencias y profesionales: servicios, proceso, casos y contacto.' },
  { id: 'restaurante', name: 'Restaurante / Comida', desc: 'Menú destacado, platos, ubicación y pedidos por WhatsApp.' },
  { id: 'clinica', name: 'Clínica / Estética', desc: 'Tratamientos, resultados, testimonios y agenda por WhatsApp.' },
  { id: 'inmobiliaria', name: 'Inmobiliaria', desc: 'Propiedad destacada, galería, características y agenda tu visita.' },
  { id: 'webinar', name: 'Lanzamiento / Webinar', desc: 'Cuenta regresiva, beneficios, ponente y registro gratis.' },
  { id: 'ecommerce_clon', name: 'E-commerce (clon)', desc: 'Estructura probada de tienda: comparativa, beneficios y prueba social.' },
  { id: 'producto_clon', name: 'Landing Producto (clon)', desc: 'Página de producto larga: beneficios, detalles, reseñas y pedido.' },
  { id: 'corporativa_clon', name: 'Corporativa (clon)', desc: 'Web de marca: planes, confianza, equipo y contacto.' },
];

const card = 'bg-[#161208] border border-[#f5b94233] rounded-2xl p-4';
const inputCls = 'w-full bg-[#0e0c07] border border-white/15 rounded-xl px-3 py-2.5 text-[15px] text-[#f5efe2] placeholder:text-gray-600 focus:border-[#f5b942] focus:outline-none';
const btnGold = 'bg-gradient-to-br from-[#f5b942] to-[#b97f16] text-[#1a1206] font-bold rounded-xl px-4 py-2.5 text-[15px] hover:opacity-90 disabled:opacity-50';
const btnGhost = 'border border-[#f5b94255] text-[#f5b942] rounded-xl px-4 py-2.5 text-[15px] hover:bg-[#f5b94214] disabled:opacity-50';

async function api(path: string, method = 'GET', body?: any) {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

export default function ConstructorView() {
  const [view, setView] = useState<'list' | 'editor' | 'clone' | 'shopify'>('list');
  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BuilderPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3500); };
  const load = async () => {
    setLoading(true);
    try { const j = await api('/api/page-builder/pages'); setPages(j.pages || []); }
    catch (e: any) { showToast(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = async (template: string, pageType: string, name: string) => {
    try {
      const j = await api('/api/page-builder/pages', 'POST', { name, pageType, template });
      await load();
      const full = await api(`/api/page-builder/pages/${j.page.id}`);
      setEditing(full.page); setView('editor');
    } catch (e: any) { showToast(e.message); }
  };
  const openEdit = async (id: string) => {
    try { const j = await api(`/api/page-builder/pages/${id}`); setEditing(j.page); setView('editor'); }
    catch (e: any) { showToast(e.message); }
  };
  const save = async (silent = false) => {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/api/page-builder/pages/${editing.id}`, 'PUT', { name: editing.name, pageType: editing.page_type, blocks: editing.blocks, settings: editing.settings });
      if (!silent) showToast('Guardado ✓');
      load();
    } catch (e: any) { showToast(e.message); }
    setSaving(false);
  };
  const publish = async (id: string, force = false) => {
    try {
      const j = await api(`/api/page-builder/pages/${id}/publish`, 'POST', { force });
      if (j.needsConfirm) {
        if (!window.confirm(`${j.message}\n\n¿Publicar de todos modos?`)) return;
        return publish(id, true);
      }
      showToast(`Publicada ✓ Puntaje: ${j.score}/100`);
      load();
      if (editing?.id === id) { const f = await api(`/api/page-builder/pages/${id}`); setEditing(f.page); }
    } catch (e: any) { showToast(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Layout size={20} className="text-[#f5b942]" />
        <h2 className="text-lg font-extrabold text-[#f5efe2]">Constructor de Páginas</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([['list', 'Mis páginas'], ['editor', 'Editor'], ['clone', 'Clonar web'], ['shopify', 'Shopify']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} disabled={v === 'editor' && !editing}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${view === v ? 'bg-[#f5b942] text-[#1a1206]' : 'border border-[#f5b94244] text-[#f5b942]'} disabled:opacity-40`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && <PageList pages={pages} loading={loading} onNew={openNew} onEdit={openEdit} onPublish={publish} onDelete={async (id) => { if (!window.confirm('¿Eliminar esta página?')) return; await api(`/api/page-builder/pages/${id}`, 'DELETE'); load(); }} onShopify={() => setView('shopify')} />}
      {view === 'editor' && editing && (editing.rawHtml
        ? <VisualEditor page={editing} setPage={setEditing} onPublish={publish} showToast={showToast} />
        : <Editor page={editing} setPage={setEditing} onSave={save} saving={saving} onPublish={() => publish(editing.id)} showToast={showToast} />)}
      {view === 'clone' && <Cloner onUse={async (data, meta) => {
        const name = (meta.title || 'Página clonada').slice(0, 60);
        const isVisual = typeof data === 'string';
        const body: any = { name, pageType: 'landing', settings: { whatsappNumber: meta.whatsapp || '', accentColor: meta.accent || '#f5b942' } };
        if (isVisual) body.rawHtml = data; else body.blocks = data;
        const j = await api('/api/page-builder/pages', 'POST', body);
        await load(); const full = await api(`/api/page-builder/pages/${j.page.id}`);
        setEditing(full.page); setView('editor'); showToast('Clon visual cargado ✓ Toca elementos para editarlos');
      }} showToast={showToast} />}
      {view === 'shopify' && <ShopifyPanel pages={pages} showToast={showToast} />}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#f5b942] text-[#1a1206] font-bold px-5 py-3 rounded-2xl shadow-2xl z-50 text-sm">{toast}</div>}
    </div>
  );
}

function PageList({ pages, loading, onNew, onEdit, onPublish, onDelete, onShopify }: any) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [pageType, setPageType] = useState('landing');
  const [template, setTemplate] = useState('oferta');
  const scoreColor = (s?: number) => s == null ? 'bg-white/10 text-gray-400' : s >= 70 ? 'bg-green-500/20 text-green-300' : s >= 55 ? 'bg-[#f5b94233] text-[#f5b942]' : 'bg-red-500/20 text-red-300';

  return (
    <div className="space-y-4">
      <button onClick={() => setShowNew(true)} className={btnGold + ' flex items-center gap-2'}><Plus size={18} /> Nueva página</button>
      {showNew && (
        <div className={card + ' space-y-3'}>
          <div className="font-bold text-[#f5efe2]">Crear página</div>
          <input className={inputCls} placeholder="Nombre de la página (ej: Oferta Reloj X9)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={pageType} onChange={(e) => setPageType(e.target.value)}>
              <option value="landing">Landing</option><option value="website">Sitio web</option><option value="product">Product Page</option>
            </select>
            <select className={inputCls} value={template} onChange={(e) => setTemplate(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-400">{TEMPLATES.find((t) => t.id === template)?.desc}</div>
          <div className="flex gap-2">
            <button className={btnGold} disabled={!name.trim()} onClick={() => { onNew(template, pageType, name.trim()); setShowNew(false); setName(''); }}>Crear con esta plantilla</button>
            <button className={btnGhost} onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {loading ? <div className="text-gray-400 text-sm">Cargando…</div> : pages.length === 0 ? (
        <div className={card + ' text-center text-gray-400 text-sm py-10'}>
          <Sparkles className="mx-auto mb-2 text-[#f5b942]" size={28} />
          Aún no tienes páginas. Crea la primera con una plantilla de alta conversión o clona una web existente.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pages.map((p: BuilderPage) => (
            <div key={p.id} className={card}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-[#f5efe2]">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-1">/{p.slug} · {p.page_type === 'landing' ? 'Landing' : p.page_type === 'website' ? 'Sitio web' : 'Product Page'}</div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === 'published' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-gray-400'}`}>
                  {p.status === 'published' ? 'Publicada' : 'Borrador'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor(p.conversion_score)}`}>
                  <Gauge size={12} className="inline mr-1" />{p.conversion_score != null ? `${p.conversion_score}/100` : 'Sin chequeo'}
                </span>
                {p.status === 'published' && (
                  <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-[#f5b942] flex items-center gap-1"><Eye size={12} /> Ver</a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className={btnGhost + ' !py-1.5 !px-3 !text-[13px] flex items-center gap-1'} onClick={() => onEdit(p.id)}><Pencil size={14} /> Editar</button>
                {p.status === 'published'
                  ? <button className={btnGhost + ' !py-1.5 !px-3 !text-[13px]'} onClick={() => onPublish(p.id)}>Actualizar</button>
                  : <button className={btnGold + ' !py-1.5 !px-3 !text-[13px] flex items-center gap-1'} onClick={() => onPublish(p.id)}><Rocket size={14} /> Publicar</button>}
                <button className={btnGhost + ' !py-1.5 !px-3 !text-[13px]'} onClick={onShopify}>Shopify</button>
                <button className="!py-1.5 !px-3 !text-[13px] border border-red-500/40 text-red-300 rounded-xl flex items-center gap-1" onClick={() => onDelete(p.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Esquemas de campos por bloque ------------------------------------------------
type Field = { key: string; label: string; type: 'text' | 'textarea' | 'image' | 'number'; ph?: string };
const BLOCK_SCHEMAS: Record<BlockType, Field[]> = {
  hero: [
    { key: 'badge', label: 'Etiqueta superior', type: 'text', ph: 'Oferta por tiempo limitado' },
    { key: 'title', label: 'Título principal', type: 'textarea', ph: 'El titular con el beneficio' },
    { key: 'subtitle', label: 'Subtítulo', type: 'textarea' },
    { key: 'image', label: 'Imagen (URL)', type: 'image' },
    { key: 'ctaText', label: 'Texto del botón', type: 'text', ph: 'Pedir ahora' },
    { key: 'ctaUrl', label: 'Destino del botón (opcional)', type: 'text', ph: 'https://… (vacío = WhatsApp)' },
  ],
  beneficios: [{ key: 'title', label: 'Título', type: 'text' }],
  producto: [
    { key: 'name', label: 'Nombre del producto', type: 'text' },
    { key: 'description', label: 'Descripción', type: 'textarea' },
    { key: 'price', label: 'Precio', type: 'text', ph: '$99.900' },
    { key: 'comparePrice', label: 'Precio tachado (opcional)', type: 'text', ph: '$149.900' },
    { key: 'image', label: 'Imagen (URL)', type: 'image' },
    { key: 'includes', label: 'Qué incluye (una línea por ítem)', type: 'textarea' },
    { key: 'ctaText', label: 'Texto del botón', type: 'text' },
  ],
  testimonios: [{ key: 'title', label: 'Título', type: 'text' }],
  garantia: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'text', label: 'Texto de garantía', type: 'textarea' },
  ],
  faq: [{ key: 'title', label: 'Título', type: 'text' }],
  cta: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'subtitle', label: 'Subtítulo', type: 'text' },
    { key: 'text', label: 'Texto del botón', type: 'text', ph: 'Pedir por WhatsApp' },
    { key: 'url', label: 'Destino (opcional)', type: 'text' },
  ],
  checkout: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'subtitle', label: 'Subtítulo', type: 'text' },
    { key: 'ctaText', label: 'Texto del botón', type: 'text', ph: 'Confirmar mi pedido' },
  ],
  countdown: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'minutes', label: 'Minutos', type: 'number' },
    { key: 'ctaText', label: 'Texto del botón', type: 'text' },
  ],
  video: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'url', label: 'URL de YouTube/Vimeo', type: 'text' },
  ],
  imagen_texto: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'text', label: 'Texto', type: 'textarea' },
    { key: 'image', label: 'Imagen (URL)', type: 'image' },
    { key: 'ctaText', label: 'Botón (opcional)', type: 'text' },
    { key: 'ctaUrl', label: 'Destino del botón', type: 'text' },
  ],
  footer: [{ key: 'text', label: 'Texto del pie', type: 'text' }],
};

function ListEditor({ items, onChange, renderItem, addLabel, empty }: any) {
  return (
    <div className="space-y-2 mt-2">
      {(items || []).map((it: any, i: number) => (
        <div key={i} className="bg-[#0e0c07] border border-white/10 rounded-xl p-2.5 space-y-2">
          {renderItem(it, (patch: any) => { const n = [...items]; n[i] = { ...n[i], ...patch }; onChange(n); })}
          <button className="text-red-300 text-xs" onClick={() => onChange(items.filter((_: any, j: number) => j !== i))}>Quitar</button>
        </div>
      ))}
      <button className={btnGhost + ' !py-1.5 !text-[13px]'} onClick={() => onChange([...(items || []), empty])}>+ {addLabel}</button>
    </div>
  );
}

function BlockPropsEditor({ block, onChange }: { block: PageBlock; onChange: (p: any) => void }) {
  const schema = BLOCK_SCHEMAS[block.type] || [];
  const set = (k: string, v: any) => onChange({ ...block.props, [k]: v });
  return (
    <div className="space-y-2.5 mt-2">
      {schema.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-gray-400">{f.label}</label>
          {f.type === 'textarea'
            ? <textarea className={inputCls + ' min-h-[70px]'} placeholder={f.ph} value={block.props[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
            : f.type === 'number'
              ? <input type="number" className={inputCls} value={block.props[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
              : <input className={inputCls} placeholder={f.ph} value={block.props[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />}
        </div>
      ))}
      {block.type === 'beneficios' && (
        <ListEditor items={block.props.items} empty="" addLabel="Beneficio"
          onChange={(v: any) => set('items', v)}
          renderItem={(it: string, setIt: any) => <input className={inputCls} placeholder="**Negrita** y texto del beneficio" value={it} onChange={(e) => setIt(e.target.value)} />} />
      )}
      {block.type === 'testimonios' && (
        <ListEditor items={block.props.items} empty={{ text: '', name: '', stars: 5 }} addLabel="Testimonio"
          onChange={(v: any) => set('items', v)}
          renderItem={(it: any, setIt: any) => (<>
            <textarea className={inputCls + ' min-h-[56px]'} placeholder="Lo que dijo el cliente" value={it.text || ''} onChange={(e) => setIt({ text: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Nombre" value={it.name || ''} onChange={(e) => setIt({ name: e.target.value })} />
              <select className={inputCls} value={it.stars || 5} onChange={(e) => setIt({ stars: Number(e.target.value) })}>
                {[5, 4, 3].map((s) => <option key={s} value={s}>{s} estrellas</option>)}
              </select>
            </div>
          </>)} />
      )}
      {block.type === 'faq' && (
        <ListEditor items={block.props.items} empty={{ q: '', a: '' }} addLabel="Pregunta"
          onChange={(v: any) => set('items', v)}
          renderItem={(it: any, setIt: any) => (<>
            <input className={inputCls} placeholder="Pregunta" value={it.q || ''} onChange={(e) => setIt({ q: e.target.value })} />
            <textarea className={inputCls + ' min-h-[56px]'} placeholder="Respuesta" value={it.a || ''} onChange={(e) => setIt({ a: e.target.value })} />
          </>)} />
      )}
    </div>
  );
}


function DomainPanel({ page, setPage, showToast }: any) {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState(page.custom_domain || '');
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [msg, setMsg] = useState('');

  const save = async () => {
    setBusy(true); setMsg(''); setInstructions('');
    try {
      const j = await api(`/api/page-builder/pages/${page.id}/domain`, 'POST', { domain });
      setPage({ ...page, custom_domain: j.domain, domain_verified: false, domain_status: 'pending' });
      setInstructions(j.instructions || '');
      setMsg('Dominio guardado. Sigue los pasos y verifícalo.');
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true); setMsg('');
    try {
      const j = await api(`/api/page-builder/pages/${page.id}/verify-domain`, 'POST', {});
      setPage({ ...page, domain_verified: j.verified, domain_status: j.verified ? 'verified' : 'failed' });
      setMsg(j.message);
      if (j.verified) showToast('Dominio verificado ✓');
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  const remove = async () => {
    if (!window.confirm('¿Quitar el dominio propio de esta página?')) return;
    setBusy(true);
    try {
      await api(`/api/page-builder/pages/${page.id}/domain`, 'DELETE');
      setPage({ ...page, custom_domain: '', domain_verified: false, domain_status: 'not_configured' });
      setDomain(''); setInstructions(''); setMsg('Dominio eliminado.');
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };

  const statusBadge = !page.custom_domain ? null : page.domain_verified
    ? <span className="text-xs font-bold text-green-300 bg-green-500/15 rounded-full px-2.5 py-1">✓ Verificado</span>
    : <span className="text-xs font-bold text-[#f5b942] bg-[#f5b94222] rounded-full px-2.5 py-1">Pendiente de verificación</span>;

  return (
    <div className={card}>
      <button className="w-full flex items-center gap-2 font-bold text-[#f5efe2]" onClick={() => setOpen(!open)}>
        <Globe size={16} className="text-[#f5b942]" /> Dominio propio
        <span className="ml-auto text-gray-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {page.custom_domain && <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">{page.custom_domain} {statusBadge}</div>}
      {open && (
        <div className="mt-3 space-y-3">
          <div className="text-xs text-gray-400">Usa tu propio dominio (ej: tienda.tudominio.com) en vez de crm.xorbit360.com/p/....</div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="tienda.tudominio.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <button className={btnGold + ' whitespace-nowrap'} disabled={busy || !domain.trim()} onClick={save}>Guardar</button>
          </div>
          {instructions && <pre className="text-xs text-gray-300 bg-[#0e0c07] rounded-xl p-3 whitespace-pre-wrap">{instructions}</pre>}
          <div className="flex flex-wrap gap-2">
            {page.custom_domain && !page.domain_verified && <button className={btnGold} disabled={busy} onClick={verify}>{busy ? 'Verificando…' : 'Verificar dominio'}</button>}
            {page.custom_domain && <button className={btnGhost} disabled={busy} onClick={remove}>Quitar</button>}
          </div>
          {page.domain_verified && <div className="text-xs text-green-300">Tu página ya abre en <b>https://{page.custom_domain}</b> con HTTPS automático.</div>}
          {msg && <div className="text-xs text-gray-300">{msg}</div>}
        </div>
      )}
    </div>
  );
}


function Editor({ page, setPage, onSave, saving, onPublish, showToast }: any) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const blocks: PageBlock[] = page.blocks || [];
  const settings: BuilderSettings = page.settings || {};
  const setSettings = (patch: any) => setPage({ ...page, settings: { ...settings, ...patch } });
  const updBlock = (id: string, patch: any) => setPage({ ...page, blocks: blocks.map((b) => b.id === id ? { ...b, props: patch } : b) });
  const move = (i: number, dir: number) => {
    const n = [...blocks]; const j = i + dir;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    setPage({ ...page, blocks: n });
  };
  const delBlock = (id: string) => { if (!window.confirm('¿Quitar este bloque?')) return; setPage({ ...page, blocks: blocks.filter((b) => b.id !== id) }); };
  const addBlock = (type: BlockType) => {
    setPage({ ...page, blocks: [...blocks, { id: `b-${Date.now().toString(36)}`, type, props: {} }] });
    setAddOpen(false);
  };

  const refreshPreview = async () => {
    try {
      const r = await fetch('/api/page-builder/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: page.name, blocks, settings }) });
      setPreviewHtml(await r.text());
    } catch { /* silencioso */ }
  };
  useEffect(() => { const t = setTimeout(refreshPreview, 800); return () => clearTimeout(t); }, [JSON.stringify(blocks), JSON.stringify(settings), page.name]);

  const runCheck = async () => {
    setChecking(true); setCheck(null);
    try {
      const j = await api('/api/page-builder/check', 'POST', { name: page.name, blocks, settings, pageType: page.page_type });
      setCheck(j);
      showToast(j.score >= 70 ? `Puntaje ${j.score}/100 — va muy bien ✓` : `Puntaje ${j.score}/100 — revisa las fugas`);
    } catch (e: any) { showToast(e.message); }
    setChecking(false);
  };

  const gradeColor = (g: string) => g === 'A' ? 'text-green-300' : g === 'B' ? 'text-[#f5b942]' : g === 'C' ? 'text-orange-300' : 'text-red-300';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className={inputCls + ' !w-auto flex-1 min-w-[180px] font-bold'} value={page.name} onChange={(e) => setPage({ ...page, name: e.target.value })} />
        <select className={inputCls + ' !w-auto'} value={page.page_type} onChange={(e) => setPage({ ...page, page_type: e.target.value })}>
          <option value="landing">Landing</option><option value="website">Sitio web</option><option value="product">Product Page</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btnGold} disabled={saving} onClick={() => onSave()}>{saving ? 'Guardando…' : 'Guardar'}</button>
        <button className={btnGhost} onClick={() => setShowSettings(!showSettings)}>Ajustes</button>
        <button className={btnGhost} onClick={runCheck} disabled={checking}>{checking ? 'Analizando…' : 'Chequeo de conversión'}</button>
        <button className={btnGold} onClick={onPublish}><Rocket size={16} className="inline mr-1" />Publicar</button>
        {page.status === 'published' && <a className={btnGhost} href={`/p/${page.slug}`} target="_blank" rel="noreferrer"><Eye size={16} className="inline mr-1" />Ver página</a>}
      </div>

      {showSettings && (
        <div className={card + ' space-y-3'}>
          <div className="font-bold text-[#f5efe2]">Ajustes de la página</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400">WhatsApp (solo números, ej: 573001234567)</label>
              <input className={inputCls} value={settings.whatsappNumber || ''} onChange={(e) => setSettings({ whatsappNumber: e.target.value })} /></div>
            <div><label className="text-xs text-gray-400">Checkout</label>
              <select className={inputCls} value={settings.checkoutType || 'both'} onChange={(e) => setSettings({ checkoutType: e.target.value })}>
                <option value="both">Contra entrega + anticipado</option><option value="cod">Solo contra entrega</option>
                <option value="prepaid">Solo pago anticipado</option><option value="whatsapp">Solo WhatsApp (sin formulario)</option>
              </select></div>
            <div><label className="text-xs text-gray-400">Píxel de Meta (opcional)</label>
              <input className={inputCls} placeholder="1234567890" value={settings.metaPixelId || ''} onChange={(e) => setSettings({ metaPixelId: e.target.value })} /></div>
            <div><label className="text-xs text-gray-400">Color de acento</label>
              <input type="color" className="w-full h-11 rounded-xl bg-[#0e0c07] border border-white/15" value={settings.accentColor || '#f5b942'} onChange={(e) => setSettings({ accentColor: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="text-xs text-gray-400">Barra de anuncio superior (opcional)</label>
              <input className={inputCls} placeholder="ENVÍO GRATIS HOY" value={settings.announcement || ''} onChange={(e) => setSettings({ announcement: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="text-xs text-gray-400">Descripción para buscadores</label>
              <input className={inputCls} value={settings.metaDescription || ''} onChange={(e) => setSettings({ metaDescription: e.target.value })} /></div>
            {(['instagram', 'facebook', 'tiktok'] as const).map((sn) => (
              <div key={sn}><label className="text-xs text-gray-400 capitalize">{sn} (URL)</label>
                <input className={inputCls} value={settings.socials?.[sn] || ''} onChange={(e) => setSettings({ socials: { ...settings.socials, [sn]: e.target.value } })} /></div>
            ))}
          </div>
          {settings.checkoutType === 'whatsapp' && <div className="text-xs text-amber-300">Sin formulario: los botones llevan al WhatsApp y el bloque de pedido se oculta.</div>}
        </div>
      )}

      <DomainPanel page={page} setPage={setPage} showToast={showToast} />

      {check && (
        <div className={card + ' space-y-3'}>
          <div className="flex items-center gap-3">
            <div className={`text-4xl font-black ${gradeColor(check.grade)}`}>{check.score}<span className="text-lg text-gray-500">/100</span></div>
            <div>
              <div className={`font-bold ${gradeColor(check.grade)}`}>Calificación {check.grade}</div>
              <div className="text-xs text-gray-400">{check.gradeLabel}</div>
            </div>
            <div className="ml-auto text-xs text-gray-400">{check.stats.critical} críticas · {check.stats.problems} fugas</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {check.blocks.map((b) => (
              <div key={b.key} className="bg-[#0e0c07] rounded-xl p-2.5">
                <div className="text-xs text-gray-400">{b.label}</div>
                <div className="h-2 bg-white/10 rounded-full mt-1.5"><div className="h-2 rounded-full bg-gradient-to-r from-[#f5b942] to-[#b97f16]" style={{ width: `${b.score}%` }} /></div>
                <div className="text-xs font-bold mt-1 text-[#f5efe2]">{b.score}%</div>
              </div>
            ))}
          </div>
          {check.findings.length > 0 && (
            <div className="space-y-2">
              {check.findings.map((f) => (
                <div key={f.id} className="bg-[#0e0c07] border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className={f.severity === 'critico' ? 'text-red-400' : 'text-[#f5b942]'} />
                    <span className="font-bold text-sm text-[#f5efe2]">{f.title}</span>
                    <span className="text-[11px] text-gray-500 ml-auto">{f.category}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1"><b className="text-gray-300">Lo que vemos:</b> {f.evidence}</div>
                  <div className="text-xs text-gray-400"><b className="text-gray-300">Por qué te cuesta ventas:</b> {f.impact}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-[#f5efe2]">Bloques ({blocks.length})</div>
            <div className="relative">
              <button className={btnGold + ' !py-2 !text-sm flex items-center gap-1'} onClick={() => setAddOpen(!addOpen)}><Plus size={16} /> Agregar</button>
              {addOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1b160b] border border-[#f5b94244] rounded-2xl p-2 z-20 max-h-80 overflow-y-auto">
                  {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                    <button key={t} className="w-full text-left px-3 py-2 rounded-xl text-sm text-[#f5efe2] hover:bg-[#f5b94222]" onClick={() => addBlock(t)}>
                      {BLOCK_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {blocks.map((b, i) => {
            const Icon = BLOCK_ICONS[b.type] || Type;
            return (
              <div key={b.id} className={card}>
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-[#f5b942]" />
                  <span className="font-bold text-sm text-[#f5efe2]">{BLOCK_LABELS[b.type]}</span>
                  <div className="ml-auto flex gap-1">
                    <button className="p-1.5 text-gray-400 hover:text-[#f5b942]" onClick={() => move(i, -1)}><ChevronUp size={16} /></button>
                    <button className="p-1.5 text-gray-400 hover:text-[#f5b942]" onClick={() => move(i, 1)}><ChevronDown size={16} /></button>
                    <button className="p-1.5 text-gray-400 hover:text-red-300" onClick={() => delBlock(b.id)}><X size={16} /></button>
                  </div>
                </div>
                <BlockPropsEditor block={b} onChange={(p) => updBlock(b.id, p)} />
              </div>
            );
          })}
        </div>
        <div>
          <div className="font-bold text-[#f5efe2] mb-2">Vista previa</div>
          <div className="border border-[#f5b94233] rounded-2xl overflow-hidden bg-black" style={{ height: 640 }}>
            {previewHtml
              ? <iframe title="vista-previa" className="w-full h-full bg-white" srcDoc={previewHtml} sandbox="allow-scripts allow-forms" />
              : <div className="flex items-center justify-center h-full text-gray-500 text-sm"><Loader2 className="animate-spin mr-2" size={18} /> Generando vista previa…</div>}
          </div>
          <div className="text-xs text-gray-500 mt-1">La vista previa muestra tu página tal como la verán tus clientes.</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Editor visual in-situ para páginas clonadas (rawHtml) — 2026-10-11.
// Iframe con el HTML clonado + panel lateral: clic en un elemento para
// editar su texto, imagen, enlace o colores. Sin convertir a bloques.
// ============================================================================
function VisualEditor({ page, setPage, onPublish, showToast }: any) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [sel, setSel] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [draft, setDraft] = useState({ text: '', src: '', href: '', color: '', bg: '', fontSize: '' });
  const [ready, setReady] = useState(false);

  const frameUrl = `/api/page-builder/pages/${page.id}/edit-frame`;
  const publicUrl = `https://crm.xorbit360.com/p/${page.slug}`;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data || {};
      if (d.type === 'xorbit-editor-ready') setReady(true);
      if (d.type === 'xorbit-select' && d.el) {
        setSel(d.el);
        setDraft({ text: d.el.text || '', src: d.el.src || '', href: d.el.href || '', color: '', bg: '', fontSize: '' });
      }
      if (d.type === 'xorbit-html' && typeof d.html === 'string') {
        finishSave(d.html);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const post = (msg: any) => {
    try { iframeRef.current?.contentWindow?.postMessage(msg, '*'); } catch {}
  };

  useEffect(() => {
    if (ready) post({ type: 'xorbit-edit-on' });
  }, [ready]);

  const apply = () => {
    if (!sel) return;
    const changes: any = {};
    if (sel.canText) changes.text = draft.text;
    if (sel.tag === 'IMG' && draft.src) changes.src = draft.src;
    if (sel.tag === 'A' && draft.href) changes.href = draft.href;
    if (draft.color) changes.color = draft.color;
    if (draft.bg) changes.bg = draft.bg;
    if (draft.fontSize) changes.fontSize = draft.fontSize;
    post({ type: 'xorbit-apply', changes });
    showToast('Aplicado ✓ (guarda para conservarlo)');
  };

  const requestSave = () => {
    setSaving(true);
    post({ type: 'xorbit-get-html' });
    setTimeout(() => setSaving((s) => { if (s) { showToast('El editor no respondió. Intenta de nuevo.'); return false; } return s; }), 8000);
  };

  const finishSave = async (html: string) => {
    try {
      await api(`/api/page-builder/pages/${page.id}`, 'PUT', { rawHtml: html });
      const full = await api(`/api/page-builder/pages/${page.id}`);
      setPage(full.page);
      showToast('Guardado ✓');
    } catch (e: any) { showToast(e.message); }
    setSaving(false);
  };

  const runCheck = async () => {
    setChecking(true); setCheck(null);
    post({ type: 'xorbit-get-html' });
    const onHtml = async (e: MessageEvent) => {
      if (e.data?.type !== 'xorbit-html') return;
      window.removeEventListener('message', onHtml);
      try {
        const j = await api('/api/page-builder/check', 'POST', { rawHtml: e.data.html, pageType: page.page_type, name: page.name });
        setCheck(j);
      } catch (err: any) { showToast(err.message); }
      setChecking(false);
    };
    window.addEventListener('message', onHtml);
    setTimeout(() => { window.removeEventListener('message', onHtml); setChecking((c) => { if (c) showToast('El editor no respondió.'); return false; }); }, 10000);
  };

  return (
    <div className="space-y-3">
      <div className={card + ' flex flex-wrap items-center gap-2'}>
        <div className="font-bold text-[#f5efe2] flex items-center gap-2 mr-auto">
          <Pencil size={18} className="text-[#f5b942]" /> Editor visual — {page.name}
        </div>
        <span className="text-xs bg-[#f5b94222] text-[#f5b942] px-2.5 py-1 rounded-full">Clon de alta fidelidad</span>
        <button className={btnGhost} onClick={runCheck} disabled={checking}>{checking ? 'Revisando…' : 'Chequeo de conversión'}</button>
        <button className={btnGold} onClick={requestSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        <button className={btnGhost} onClick={() => onPublish(page.id)}><Rocket size={15} /> Publicar</button>
        <a className={btnGhost} href={publicUrl} target="_blank" rel="noopener"><Eye size={15} /> Ver</a>
      </div>

      {check && (
        <div className={card + ' space-y-2'}>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-[#f5b942]">{check.score}<span className="text-base text-gray-400">/100</span></div>
            <div className="text-sm font-bold text-[#f5efe2]">Calificación {check.grade}</div>
            <div className="text-xs text-gray-400 ml-auto">{check.stats.problems} fugas · {check.stats.critical} críticas</div>
          </div>
          {check.findings.slice(0, 5).map((f: Finding) => (
            <div key={f.id} className="text-xs bg-white/5 rounded-xl p-2.5">
              <span className={`font-bold ${f.severity === 'Crítico' ? 'text-red-400' : 'text-amber-300'}`}>{f.title}</span>
              <span className="text-gray-400"> — {f.evidence}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <div className={card + ' p-2'}>
          <div className="text-xs text-gray-400 px-2 pb-2">Toca cualquier elemento de la página para editarlo {ready ? '' : '(cargando editor…)'}</div>
          <iframe ref={iframeRef} src={frameUrl} title="Editor visual"
            className="w-full rounded-xl bg-white" style={{ height: '70vh', border: '1px solid #f5b94233' }} />
        </div>
        <div className={card + ' space-y-3 h-fit'}>
          <div className="font-bold text-[#f5efe2] text-sm">Elemento seleccionado</div>
          {!sel && <p className="text-xs text-gray-400">Toca un texto, imagen, botón o enlace dentro de la página.</p>}
          {sel && (
            <div className="space-y-2.5">
              <div className="text-xs text-gray-400">Tipo: <span className="text-[#f5b942] font-bold">{sel.tag}</span></div>
              {sel.canText && (
                <div>
                  <label className="text-xs text-gray-400">Texto</label>
                  <textarea className={inputCls} rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
                </div>
              )}
              {sel.tag === 'IMG' && (
                <div>
                  <label className="text-xs text-gray-400">URL de la imagen</label>
                  <input className={inputCls} value={draft.src} onChange={(e) => setDraft({ ...draft, src: e.target.value })} placeholder="https://…" />
                </div>
              )}
              {sel.tag === 'A' && (
                <div>
                  <label className="text-xs text-gray-400">Enlace destino</label>
                  <input className={inputCls} value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} placeholder="https://…" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Color texto</label>
                  <input type="color" className="w-full h-10 rounded-xl bg-[#0e0c07] border border-white/15 cursor-pointer" value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#000000'} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Color fondo</label>
                  <input type="color" className="w-full h-10 rounded-xl bg-[#0e0c07] border border-white/15 cursor-pointer" value={/^#[0-9a-fA-F]{6}$/.test(draft.bg) ? draft.bg : '#000000'} onChange={(e) => setDraft({ ...draft, bg: e.target.value })} />
                </div>
              </div>
              <button className={btnGold + ' w-full'} onClick={apply}>Aplicar cambios</button>
              <p className="text-[11px] text-gray-500">Los cambios se aplican en la vista previa. Pulsa <b>Guardar</b> para conservarlos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Cloner({ onUse, showToast }: any) {
  const [url, setUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const clone = async () => {
    setCloning(true); setResult(null);
    try {
      const j = await api('/api/page-builder/clone', 'POST', { url });
      setResult(j);
    } catch (e: any) { showToast(e.message); }
    setCloning(false);
  };
  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <div className="font-bold text-[#f5efe2] flex items-center gap-2"><Copy size={18} className="text-[#f5b942]" /> Clonar una página existente</div>
        <p className="text-sm text-gray-400">Pega la dirección de cualquier landing o web y la clonamos con su diseño original, lista para editar.</p>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="https://tutienda.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && clone()} />
          <button className={btnGold} disabled={cloning || !url.trim()} onClick={clone}>{cloning ? 'Clonando…' : 'Clonar'}</button>
        </div>
      </div>
      {result && (
        <div className={card + ' space-y-3'}>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-[#f5efe2] font-bold">Clon visual listo{result.meta?.title ? ` de "${result.meta.title}"` : ''}</span>
          </div>
          {result.stats && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-[#f5b94222] text-[#f5b942] px-2.5 py-1 rounded-full">{result.stats.cssFiles || 0} hojas de estilo</span>
              <span className="bg-[#f5b94222] text-[#f5b942] px-2.5 py-1 rounded-full">{result.stats.ctasRewired || 0} botones al checkout</span>
              <span className="bg-[#f5b94222] text-[#f5b942] px-2.5 py-1 rounded-full">{Math.round((result.stats.finalBytes || 0) / 1024)} KB</span>
            </div>
          )}
          <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">{result.limits}</div>
          <button className={btnGold} onClick={() => onUse(result.rawHtml, result.meta || {})}>Usar en el editor visual</button>
        </div>
      )}
    </div>
  );
}

function ShopifyPanel({ pages, showToast }: any) {
  const [status, setStatus] = useState<any>(null);
  const [store, setStore] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState('');
  const load = async () => { try { setStatus(await api('/api/page-builder/shopify/status')); } catch { /* noop */ } };
  useEffect(() => { load(); }, []);
  const connect = async () => {
    setBusy(true);
    try {
      const j = await api('/api/page-builder/shopify/connect', 'POST', { store, apiKey });
      showToast(`Tienda conectada ✓ ${j.shopName || ''}`);
      setApiKey(''); load();
    } catch (e: any) { showToast(e.message); }
    setBusy(false);
  };
  const publish = async (id: string) => {
    setPublishing(id);
    try {
      const j = await api(`/api/page-builder/pages/${id}/shopify-publish`, 'POST', {});
      showToast('Publicada en Shopify ✓');
    } catch (e: any) { showToast(e.message); }
    setPublishing('');
  };
  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <div className="font-bold text-[#f5efe2] flex items-center gap-2"><Globe size={18} className="text-[#f5b942]" /> Publicar en Shopify</div>
        {status?.connected ? (
          <div className="space-y-2">
            <div className="text-sm text-green-300 flex items-center gap-2"><CheckCircle2 size={16} /> Conectada: <b>{status.store}</b></div>
            <div className="text-xs text-gray-500">Token: {status.maskedKey}</div>
            <button className={btnGhost + ' !text-[13px] !py-2'} onClick={async () => { await api('/api/page-builder/shopify/disconnect', 'POST', {}); load(); }}>Desconectar</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Conecta tu tienda para subir páginas como páginas de Shopify. En Shopify: Apps → Crear app → token del Admin API con permiso <b>write_content</b>.</p>
            <input className={inputCls} placeholder="mitienda.myshopify.com" value={store} onChange={(e) => setStore(e.target.value)} />
            <input className={inputCls} type="password" placeholder="Token del Admin API (shpat_…)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <button className={btnGold} disabled={busy || !store.trim() || apiKey.length < 10} onClick={connect}>{busy ? 'Verificando…' : 'Conectar tienda'}</button>
            <div className="text-xs text-gray-500">El token se guarda cifrado y nunca se muestra completo.</div>
          </div>
        )}
      </div>
      {status?.connected && (
        <div className={card + ' space-y-2'}>
          <div className="font-bold text-[#f5efe2] text-sm">Subir página a Shopify</div>
          {pages.length === 0 && <div className="text-sm text-gray-500">Crea primero una página en "Mis páginas".</div>}
          {pages.map((p: BuilderPage) => (
            <div key={p.id} className="flex items-center gap-2 bg-[#0e0c07] border border-white/10 rounded-xl p-2.5">
              <span className="text-sm text-[#f5efe2] font-bold flex-1">{p.name}</span>
              <button className={btnGold + ' !py-1.5 !text-[13px]'} disabled={publishing === p.id} onClick={() => publish(p.id)}>
                {publishing === p.id ? 'Subiendo…' : 'Subir a Shopify'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
