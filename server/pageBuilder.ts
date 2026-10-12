// ============================================================================
// Constructor de Páginas Xorbit 360 — backend.
// Editor por bloques para Landings, Sitios web y Product Pages, con:
//  - chequeo de conversión en vivo (reutiliza el motor server/diagnosticCore.ts)
//  - clonador de páginas existentes (fetch server-side con protección SSRF)
//  - publicación en Shopify (token cifrado con secretBox)
//  - páginas públicas /p/:slug con checkout que alimenta public.orders
//    (contraentrega y pago anticipado) con atribución a la página.
// Las páginas viven en currentDB.pageBuilder (mismo patrón que el piloto
// automático y los pedidos de Live Selling: persiste con el guardado del
// estado). Supabase se usa para app_settings (conexión Shopify cifrada) y
// public.orders (pedidos del checkout: contraentrega y pago anticipado).
// Hay una migración SQL lista en supabase/migrations/20261011230000_page_builder.sql
// para mover el almacenamiento a tabla dedicada cuando haya vía DDL.
// Sin menciones a terceros en la UI: todo es marca Xorbit 360.
// ============================================================================

import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import { decryptSecret, encryptSecret, isSecretEncryptionEnabled, maskSecret } from './secretBox.ts';
import { analyzeHtmlSnapshot, normalizeStoreUrl } from './diagnosticCore.ts';

const DEFAULT_TENANT = 'default';
const SHOPIFY_SETTINGS_KEY = 'pagebuilder.shopify';
const FETCH_TIMEOUT_MS = 14_000;
const MAX_HTML_BYTES = 3_000_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Xorbit360-PageBuilder/1.0';

export type BlockType =
  | 'hero' | 'beneficios' | 'producto' | 'testimonios' | 'garantia'
  | 'faq' | 'cta' | 'checkout' | 'countdown' | 'video' | 'imagen_texto' | 'footer';

export interface PageBlock { id: string; type: BlockType; props: Record<string, any>; }

export interface BuilderSettings {
  whatsappNumber?: string;
  metaDescription?: string;
  checkoutType?: 'cod' | 'prepaid' | 'both' | 'whatsapp';
  currency?: string;
  metaPixelId?: string;
  accentColor?: string;
  socials?: { instagram?: string; facebook?: string; tiktok?: string };
  announcement?: string;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Portada (Hero)', beneficios: 'Beneficios', producto: 'Producto / Oferta',
  testimonios: 'Testimonios', garantia: 'Garantía', faq: 'Preguntas frecuentes',
  cta: 'Llamado a la acción', checkout: 'Formulario de pedido', countdown: 'Cuenta regresiva',
  video: 'Video', imagen_texto: 'Imagen + texto', footer: 'Pie de página',
};

type AnyRow = Record<string, any>;

function db(): any {
  const client = getSupabase();
  if (!client) { const err: any = new Error('Supabase no está configurado en el servidor'); err.status = 503; throw err; }
  return client;
}
// Almacenamiento de páginas: currentDB.pageBuilder (mismo patrón que el piloto
// automático y los pedidos de Live Selling). Supabase se usa para app_settings
// (Shopify) y public.orders (pedidos del checkout).
function getMemDB(): any { return (globalThis as any).currentDB || {}; }
function saveMemDB(): void {
  try {
    const fn = (globalThis as any).saveDB || (globalThis as any).persistDB || (globalThis as any).saveDBData;
    if (typeof fn === 'function') fn((globalThis as any).currentDB);
  } catch { /* noop */ }
}
function pbStore(): { pages: AnyRow[] } {
  const mdb = getMemDB();
  if (!mdb.pageBuilder || typeof mdb.pageBuilder !== 'object') mdb.pageBuilder = {};
  if (!Array.isArray(mdb.pageBuilder.pages)) mdb.pageBuilder.pages = [];
  return mdb.pageBuilder;
}
function pageSummary(p: AnyRow): AnyRow {
  return { id: p.id, slug: p.slug, name: p.name, page_type: p.page_type, status: p.status, conversion_score: p.conversion_score ?? null, created_at: p.created_at, updated_at: p.updated_at };
}
function tenantId(req: Request): string {
  const user: any = (req as any).authUser || {};
  return String(user.workspaceId || user.tenantId || DEFAULT_TENANT).slice(0, 80);
}
function cleanText(v: unknown, max = 2000): string { return String(v ?? '').trim().slice(0, max); }
function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function normPhone(v: unknown): string {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('3')) d = `57${d}`;
  return d;
}

// --- Rate-limit en memoria (mismo patrón que otros módulos) -----------------
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function requestIp(req: Request): string {
  const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return f || req.ip || (req.socket as any)?.remoteAddress || 'unknown';
}
function checkRate(req: Request, res: Response, bucket: string, maxPerMinute: number): boolean {
  const key = `${bucket}:${requestIp(req)}`;
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now > b.resetAt) { rateBuckets.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  b.count += 1;
  if (b.count > maxPerMinute) { res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera un minuto.' }); return false; }
  return true;
}

// --- HTML ------------------------------------------------------------------
function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function mdLine(s: string): string {
  // Mini-formato: **negrita** y saltos de línea. Sin dependencias.
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}
const BRAND_CSS = (accent: string) => `
:root{--acc:${accent};--bg:#0e0c07;--bg2:#161208;--card:#1b160b;--txt:#f5efe2;--mut:#c9bfa8}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--txt);line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
section{padding:56px 0}
h1{font-size:clamp(30px,5vw,52px);line-height:1.15;margin-bottom:16px}
h2{font-size:clamp(24px,3.6vw,36px);margin-bottom:14px}
.sub{font-size:clamp(16px,2.2vw,20px);color:var(--mut);margin-bottom:24px}
.btn{display:inline-block;background:linear-gradient(135deg,var(--acc),#b97f16);color:#1a1206;font-weight:800;font-size:19px;padding:16px 38px;border-radius:14px;text-decoration:none;border:0;cursor:pointer;box-shadow:0 8px 28px rgba(245,185,66,.35);transition:transform .15s}
.btn:hover{transform:translateY(-2px)}
.btn-block{width:100%;text-align:center}
.hero{background:radial-gradient(900px 480px at 50% -10%,rgba(245,185,66,.22),transparent),var(--bg2);text-align:center;padding:72px 0}
.hero img{max-width:420px;width:100%;border-radius:18px;margin:26px auto;display:block;box-shadow:0 18px 60px rgba(0,0,0,.5)}
.badge{display:inline-block;background:rgba(245,185,66,.14);border:1px solid var(--acc);color:var(--acc);font-weight:700;font-size:13px;padding:6px 16px;border-radius:999px;margin-bottom:18px;letter-spacing:.4px}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:26px}
.card{background:var(--card);border:1px solid rgba(245,185,66,.18);border-radius:16px;padding:24px}
.card .ic{font-size:30px;margin-bottom:10px}
.price{font-size:clamp(28px,4vw,44px);font-weight:900;color:var(--acc);margin:10px 0}
.oldprice{color:var(--mut);text-decoration:line-through;font-size:18px;margin-left:10px}
.trust{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:22px;font-size:14px;color:var(--mut)}
.trust span{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:999px}
.testi{font-style:italic;font-size:17px}
.testi b{display:block;margin-top:10px;font-style:normal;color:var(--acc)}
.faq-item{background:var(--card);border:1px solid rgba(245,185,66,.18);border-radius:12px;padding:18px 20px;margin-bottom:12px}
.faq-item b{color:var(--acc)}
.guar{background:linear-gradient(135deg,rgba(245,185,66,.12),rgba(245,185,66,.03));border:2px dashed var(--acc);border-radius:18px;padding:34px;text-align:center}
.count{text-align:center;background:var(--bg2)}
.count .t{font-size:clamp(34px,6vw,58px);font-weight:900;color:var(--acc);letter-spacing:2px}
.video-wrap{position:relative;padding-bottom:56.25%;height:0;border-radius:18px;overflow:hidden;margin-top:20px}
.video-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
.split{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center}
.split img{width:100%;border-radius:16px}
@media(max-width:720px){.split{grid-template-columns:1fr}}
.form{background:var(--card);border:1px solid rgba(245,185,66,.25);border-radius:18px;padding:30px;max-width:520px;margin:0 auto}
.form label{display:block;font-size:14px;color:var(--mut);margin:12px 0 4px}
.form input,.form select{width:100%;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#0e0c07;color:var(--txt);font-size:16px}
.payopts{display:flex;gap:10px;margin-top:6px}
.payopts label{flex:1;background:#0e0c07;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;text-align:center;cursor:pointer;font-size:15px;color:var(--txt);margin:0}
.payopts input{width:auto;margin-right:6px}
.wa-float{position:fixed;right:18px;bottom:18px;z-index:50;background:#25d366;color:#fff;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.45);text-decoration:none}
.announce{background:var(--acc);color:#1a1206;text-align:center;font-weight:700;font-size:14px;padding:10px 16px}
footer{padding:34px 0;text-align:center;color:var(--mut);font-size:13px;border-top:1px solid rgba(255,255,255,.08)}
.okbox{background:#0d2b16;border:1px solid #25d366;color:#bff0cd;border-radius:14px;padding:22px;text-align:center;font-size:17px}
`;

// --- Render de bloques -------------------------------------------------------
function blockHtml(b: PageBlock, s: BuilderSettings, pageId: string): string {
  const p = b.props || {};
  switch (b.type) {
    case 'hero': {
      const wa = s.whatsappNumber ? `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(p.ctaText || 'Hola, me interesa')}` : '#pedido';
      return `<section class="hero"><div class="wrap">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
<h1>${mdLine(p.title || 'Título de tu oferta')}</h1>
<p class="sub">${mdLine(p.subtitle || '')}</p>
${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title || 'Producto')}">` : ''}
<div><a class="btn" href="${p.ctaUrl || wa}">${esc(p.ctaText || 'Pedir ahora')}</a></div>
<div class="trust">${trustChips(s)}</div></div></section>`;
    }
    case 'beneficios': {
      const items: string[] = Array.isArray(p.items) ? p.items : [];
      return `<section><div class="wrap"><h2 style="text-align:center">${esc(p.title || '¿Por qué te va a encantar?')}</h2>
<div class="grid3">${items.map((it) => `<div class="card"><div class="ic">✓</div><div>${mdLine(it)}</div></div>`).join('')}</div></div></section>`;
    }
    case 'producto': {
      return `<section id="pedido"><div class="wrap"><div class="split">
<div>${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name || 'Producto')}">` : ''}</div>
<div><h2>${esc(p.name || 'Nombre del producto')}</h2><p class="sub">${mdLine(p.description || '')}</p>
<div><span class="price">${esc(p.price || '')}</span>${p.comparePrice ? `<span class="oldprice">${esc(p.comparePrice)}</span>` : ''}</div>
${p.includes ? `<div class="card" style="margin:18px 0"><b style="color:var(--acc)">Incluye:</b><br>${mdLine(p.includes)}</div>` : ''}
<div><a class="btn" href="#checkout">${esc(p.ctaText || 'Lo quiero — pedir ahora')}</a></div>
<div class="trust" style="justify-content:flex-start">${trustChips(s)}</div></div></div></div></section>`;
    }
    case 'testimonios': {
      const items: { text: string; name: string; stars?: number }[] = Array.isArray(p.items) ? p.items : [];
      return `<section><div class="wrap"><h2 style="text-align:center">${esc(p.title || 'Lo que dicen nuestros clientes')}</h2>
<div class="grid3">${items.map((t) => `<div class="card"><div style="color:var(--acc)">${'★'.repeat(Math.min(5, Number(t.stars) || 5))}</div><p class="testi">"${esc(t.text)}"<b>— ${esc(t.name)}</b></p></div>`).join('')}</div></div></section>`;
    }
    case 'garantia': {
      return `<section><div class="wrap"><div class="guar"><div style="font-size:44px">🛡️</div>
<h2>${esc(p.title || 'Garantía total de satisfacción')}</h2><p class="sub">${mdLine(p.text || 'Si el producto no cumple lo prometido, te devolvemos tu dinero. Compra sin riesgo.')}</p></div></div></section>`;
    }
    case 'faq': {
      const items: { q: string; a: string }[] = Array.isArray(p.items) ? p.items : [];
      return `<section><div class="wrap" style="max-width:760px"><h2 style="text-align:center">${esc(p.title || 'Preguntas frecuentes')}</h2>
${items.map((f) => `<div class="faq-item"><b>${esc(f.q)}</b><p style="margin-top:8px;color:var(--mut)">${esc(f.a)}</p></div>`).join('')}</div></section>`;
    }
    case 'cta': {
      const wa = s.whatsappNumber ? `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(p.text || 'Hola, me interesa')}` : '#pedido';
      return `<section class="count"><div class="wrap"><h2>${esc(p.title || '¿Listo para pedir el tuyo?')}</h2>
<p class="sub">${esc(p.subtitle || 'Toca el botón y asegura el tuyo hoy mismo.')}</p>
<a class="btn" href="${p.url || wa}">${esc(p.text || 'Pedir por WhatsApp')}</a></div></section>`;
    }
    case 'checkout': return checkoutHtml(p, s, pageId);
    case 'countdown': {
      return `<section class="count"><div class="wrap"><h2>${esc(p.title || 'La oferta termina en:')}</h2>
<div class="t" data-countdown="${esc(p.minutes || 60)}">--:--:--</div>
<div style="margin-top:18px"><a class="btn" href="#checkout">${esc(p.ctaText || 'Asegurar mi descuento')}</a></div></div></section>
<script>(function(){var el=document.querySelector('[data-countdown]');if(!el)return;var end=Date.now()+(parseInt(el.dataset.countdown||'60',10)*60000);setInterval(function(){var d=Math.max(0,end-Date.now());var h=Math.floor(d/3600000),m=Math.floor(d%3600000/60000),s=Math.floor(d%60000/1000);el.textContent=(h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;},1000);})();</script>`;
    }
    case 'video': {
      const url = String(p.url || '');
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
      const emb = m ? `https://www.youtube.com/embed/${m[1]}` : (url.includes('vimeo.com') ? url.replace('vimeo.com', 'player.vimeo.com/video') : '');
      return `<section><div class="wrap"><h2 style="text-align:center">${esc(p.title || 'Míralo en acción')}</h2>
${emb ? `<div class="video-wrap"><iframe src="${esc(emb)}" allowfullscreen></iframe></div>` : '<p class="sub" style="text-align:center">Pega el enlace del video en el editor.</p>'}</div></section>`;
    }
    case 'imagen_texto': {
      return `<section><div class="wrap"><div class="split">
<div>${p.image ? `<img src="${esc(p.image)}" alt="">` : ''}</div>
<div><h2>${esc(p.title || 'Título')}</h2><p class="sub">${mdLine(p.text || '')}</p>
${p.ctaText ? `<a class="btn" href="${esc(p.ctaUrl || '#pedido')}">${esc(p.ctaText)}</a>` : ''}</div></div></div></section>`;
    }
    case 'footer': {
      const soc = s.socials || {};
      const links = [
        soc.instagram ? `<a style="color:var(--acc)" href="${esc(soc.instagram)}">Instagram</a>` : '',
        soc.facebook ? `<a style="color:var(--acc)" href="${esc(soc.facebook)}">Facebook</a>` : '',
        soc.tiktok ? `<a style="color:var(--acc)" href="${esc(soc.tiktok)}">TikTok</a>` : '',
      ].filter(Boolean).join(' · ');
      return `<footer><div class="wrap">${links ? `<div style="margin-bottom:10px">${links}</div>` : ''}
<div>${esc(p.text || '© ' + new Date().getFullYear() + ' Todos los derechos reservados.')}</div></div></footer>`;
    }
    default: return '';
  }
}

function trustChips(s: BuilderSettings): string {
  const chips = ['🚚 Envío a todo el país', '🛡️ Garantía incluida'];
  if (s.checkoutType === 'cod' || s.checkoutType === 'both' || !s.checkoutType) chips.push('💵 Pago contra entrega');
  if (s.checkoutType === 'prepaid' || s.checkoutType === 'both') chips.push('💳 Pago anticipado seguro');
  return chips.map((c) => `<span>${c}</span>`).join('');
}

function checkoutHtml(p: Record<string, any>, s: BuilderSettings, pageId: string): string {
  const mode = s.checkoutType || 'both';
  const payRadios = mode === 'both'
    ? `<label>Método de pago</label><div class="payopts">
<label><input type="radio" name="pay" value="cod" checked> 💵 Contra entrega</label>
<label><input type="radio" name="pay" value="prepaid"> 💳 Anticipado</label></div>`
    : mode === 'cod'
      ? `<input type="hidden" name="pay" value="cod"><p style="color:var(--mut);font-size:14px;margin-top:10px">💵 Pagas al recibir tu pedido</p>`
      : `<input type="hidden" name="pay" value="prepaid"><p style="color:var(--mut);font-size:14px;margin-top:10px">💳 Pago anticipado seguro (te contactamos para coordinar)</p>`;
  return `<section id="checkout"><div class="wrap"><h2 style="text-align:center">${esc(p.title || 'Completa tu pedido')}</h2>
<p class="sub" style="text-align:center">${esc(p.subtitle || 'Déjanos tus datos y te contactamos para confirmar.')}</p>
<form class="form" id="pb-order-form">
<label>Nombre completo *</label><input name="name" required maxlength="80">
<label>WhatsApp / Teléfono *</label><input name="phone" required inputmode="tel" maxlength="20" placeholder="300 123 4567">
<label>Ciudad *</label><input name="city" required maxlength="60">
<label>Dirección *</label><input name="address" required maxlength="160">
<label>Cantidad</label><select name="qty"><option value="1">1 unidad</option><option value="2">2 unidades</option><option value="3">3 unidades</option></select>
${payRadios}
<div style="margin-top:20px"><button class="btn btn-block" type="submit">${esc(p.ctaText || 'Confirmar mi pedido')}</button></div>
<p style="text-align:center;color:var(--mut);font-size:13px;margin-top:12px">🔒 Tus datos están protegidos.</p>
</form><div id="pb-order-ok" style="display:none;max-width:520px;margin:0 auto"><div class="okbox">✅ <b>¡Pedido recibido!</b><br>Te vamos a contactar por WhatsApp para confirmar.</div></div>
</div></section>
<script>(function(){var f=document.getElementById('pb-order-form');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f);var pay=(f.querySelector('input[name=pay]:checked')||{value:'cod'}).value;fetch('/api/public/pages/${esc(pageId)}/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:d.get('name'),phone:d.get('phone'),city:d.get('city'),address:d.get('address'),qty:d.get('qty'),payment_method:pay})}).then(function(r){return r.json()}).then(function(j){if(j.ok){f.style.display='none';document.getElementById('pb-order-ok').style.display='block';}else{alert(j.error||'No se pudo enviar el pedido. Intenta de nuevo.');}}).catch(function(){alert('Error de conexión. Intenta de nuevo.');});});})();</script>`;
}

// --- Documento completo ------------------------------------------------------
export function renderPageHtml(page: AnyRow): string {
  const blocks: PageBlock[] = Array.isArray(page.blocks) ? page.blocks : [];
  const s: BuilderSettings = page.settings || {};
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(s.accentColor || '')) ? String(s.accentColor) : '#f5b942';
  const title = cleanText(page.name || 'Página', 80);
  const desc = cleanText(s.metaDescription || '', 200);
  const wa = s.whatsappNumber ? normPhone(s.whatsappNumber) : '';
  const pixel = cleanText(s.metaPixelId || '', 32).replace(/\D/g, '');
  const body = blocks.map((b) => blockHtml(b, s, String(page.id))).join('\n');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ''}
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
<style>${BRAND_CSS(accent)}</style>
${pixel ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');</script>` : ''}
</head><body>
${s.announcement ? `<div class="announce">${esc(s.announcement)}</div>` : ''}
${body}
${wa ? `<a class="wa-float" href="https://wa.me/${wa}?text=${encodeURIComponent('Hola, vengo de la página ' + title)}" aria-label="WhatsApp"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.5 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.3z"/></svg></a>` : ''}
<script>fetch('/api/public/pages/${esc(String(page.id))}/pageview',{method:'POST'}).catch(function(){});</script>
</body></html>`;
}

// --- Plantillas --------------------------------------------------------------
function blk(type: BlockType, props: Record<string, any> = {}): PageBlock {
  return { id: uid('b'), type, props };
}
export function templateBlocks(kind: 'oferta' | 'premium' | 'whatsapp' | 'producto'): PageBlock[] {
  const demo = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
  const base = {
    title: 'El producto que estabas buscando, con envío a todo el país',
    subtitle: 'Miles de clientes ya lo recibieron. Pide el tuyo hoy con pago contra entrega o pago anticipado.',
    ctaText: 'Pedir ahora',
    price: '$99.900',
    comparePrice: '$149.900',
  };
  if (kind === 'whatsapp') return [
    blk('hero', { badge: 'Respuesta inmediata', title: base.title, subtitle: base.subtitle, ctaText: 'Hablar por WhatsApp', image: demo }),
    blk('beneficios', { title: '¿Por qué comprar con nosotros?', items: ['**Envío rápido** a todo el país', '**Garantía real** de satisfacción', '**Pago contra entrega** o anticipado'] }),
    blk('cta', { title: '¿Tienes preguntas?', subtitle: 'Escríbenos y te asesoramos sin compromiso.', text: 'Chatear por WhatsApp' }),
    blk('faq', { items: [{ q: '¿Cuánto tarda el envío?', a: 'Entre 2 y 5 días hábiles según tu ciudad.' }, { q: '¿Puedo pagar al recibir?', a: 'Sí, ofrecemos pago contra entrega y pago anticipado.' }] }),
    blk('footer', {}),
  ];
  if (kind === 'producto') return [
    blk('producto', { name: 'Producto destacado', description: base.subtitle, price: base.price, comparePrice: base.comparePrice, image: demo, includes: 'Producto original\nManual de uso\nGarantía de 12 meses' }),
    blk('beneficios', { items: ['**Calidad premium** verificada', '**Garantía de 12 meses** incluida', '**Devolución** si no te encanta'] }),
    blk('testimonios', { items: [{ text: 'Llegó rapidísimo y tal cual la foto.', name: 'Carolina M.', stars: 5 }, { text: 'El pago contra entrega me dio confianza.', name: 'Andrés R.', stars: 5 }] }),
    blk('garantia', {}),
    blk('checkout', {}),
    blk('footer', {}),
  ];
  if (kind === 'premium') return [
    blk('hero', { badge: 'Edición premium', title: base.title, subtitle: base.subtitle, ctaText: base.ctaText, image: demo }),
    blk('testimonios', { title: 'Más de 2.000 clientes felices', items: [{ text: 'La calidad superó mis expectativas.', name: 'Marcela T.', stars: 5 }, { text: 'Volvería a comprar sin dudarlo.', name: 'Julián P.', stars: 5 }, { text: 'Atención por WhatsApp excelente.', name: 'Diana L.', stars: 5 }] }),
    blk('producto', { name: 'Producto destacado', description: base.subtitle, price: base.price, comparePrice: base.comparePrice, image: demo }),
    blk('garantia', { title: 'Garantía incondicional de 30 días', text: 'Si no te enamora, te devolvemos el 100% de tu dinero. Sin preguntas incómodas.' }),
    blk('faq', { items: [{ q: '¿Es original?', a: 'Sí, 100% original con garantía.' }, { q: '¿Métodos de pago?', a: 'Contra entrega, transferencia y tarjeta (pago anticipado).' }] }),
    blk('checkout', {}),
    blk('footer', {}),
  ];
  return [ // oferta
    blk('hero', { badge: 'Oferta por tiempo limitado', title: base.title, subtitle: base.subtitle, ctaText: base.ctaText, image: demo }),
    blk('countdown', { minutes: 60 }),
    blk('beneficios', { items: ['**Envío gratis** por hoy', '**Pagas al recibir** tu pedido', '**Garantía** de satisfacción'] }),
    blk('producto', { name: 'Producto destacado', description: base.subtitle, price: base.price, comparePrice: base.comparePrice, image: demo }),
    blk('garantia', {}),
    blk('faq', { items: [{ q: '¿Cuánto tarda el envío?', a: 'Entre 2 y 5 días hábiles.' }, { q: '¿Qué pasa si no me gusta?', a: 'Tienes garantía de devolución.' }] }),
    blk('checkout', {}),
    blk('footer', {}),
  ];
}
export const TEMPLATES = [
  { id: 'oferta', name: 'Oferta Directa', desc: 'La clásica que vende: hero, cuenta regresiva, beneficios, garantía y pedido.', },
  { id: 'premium', name: 'Producto Premium', desc: 'Con prueba social fuerte y garantía incondicional.', },
  { id: 'whatsapp', name: 'Captación WhatsApp', desc: 'Sin formulario: todo el tráfico va al WhatsApp.', },
  { id: 'producto', name: 'Página de Producto', desc: 'Estilo ficha de producto con fotos, precio y pedido.', },
];

// --- Rutas admin -------------------------------------------------------------
function slugify(name: string): string {
  return String(name || 'pagina').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'pagina';
}
async function uniqueSlug(base: string): Promise<string> {
  const pages = pbStore().pages;
  let slug = slugify(base); let n = 0;
  for (;;) {
    const cand = n === 0 ? slug : `${slug}-${n}`;
    if (!pages.some((p) => p.slug === cand)) return cand;
    n += 1;
  }
}
function findPage(idOrSlug: string, tenant: string | null, onlyPublished = false): AnyRow | null {
  const pages = pbStore().pages;
  return pages.find((p) =>
    (p.id === idOrSlug || p.slug === idOrSlug) &&
    (tenant === null || p.tenant_id === tenant) &&
    (!onlyPublished || p.status === 'published')) || null;
}
function sanitizeBlocks(raw: unknown): PageBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 60).map((b: any) => ({
    id: cleanText(b?.id, 40) || uid('b'),
    type: (Object.keys(BLOCK_LABELS) as BlockType[]).includes(b?.type) ? b.type : 'imagen_texto',
    props: (b?.props && typeof b.props === 'object') ? b.props : {},
  }));
}
function sanitizeSettings(raw: unknown): BuilderSettings {
  const r: any = raw || {};
  return {
    whatsappNumber: cleanText(r.whatsappNumber, 20),
    metaDescription: cleanText(r.metaDescription, 220),
    checkoutType: ['cod', 'prepaid', 'both', 'whatsapp'].includes(r.checkoutType) ? r.checkoutType : 'both',
    currency: cleanText(r.currency, 8) || 'COP',
    metaPixelId: cleanText(r.metaPixelId, 32).replace(/\D/g, ''),
    accentColor: /^#[0-9a-fA-F]{6}$/.test(String(r.accentColor || '')) ? String(r.accentColor) : '#f5b942',
    socials: { instagram: cleanText(r.socials?.instagram, 160), facebook: cleanText(r.socials?.facebook, 160), tiktok: cleanText(r.socials?.tiktok, 160) },
    announcement: cleanText(r.announcement, 140),
  };
}

export function setupPageBuilderAdminRoutes(app: Express) {
  // Listar
  app.get('/api/page-builder/pages', async (req: Request, res: Response) => {
    try {
      const tenant = tenantId(req);
      const pages = pbStore().pages.filter((p) => p.tenant_id === tenant)
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).slice(0, 100);
      res.json({ ok: true, pages: pages.map(pageSummary) });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error listando páginas' }); }
  });

  // Crear (plantilla | en blanco | bloques clonados)
  app.post('/api/page-builder/pages', async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const name = cleanText(b.name, 120) || 'Nueva página';
      const pageType = ['landing', 'website', 'product'].includes(b.pageType) ? b.pageType : 'landing';
      const blocks = b.blocks ? sanitizeBlocks(b.blocks) : templateBlocks(['oferta', 'premium', 'whatsapp', 'producto'].includes(b.template) ? b.template : 'oferta');
      const settings = sanitizeSettings(b.settings);
      const slug = await uniqueSlug(b.slug || name);
      const now = new Date().toISOString();
      const page: AnyRow = {
        id: uid('pg'), tenant_id: tenantId(req), slug, name, page_type: pageType,
        status: 'draft', blocks, settings, conversion_score: null, created_at: now, updated_at: now,
      };
      pbStore().pages.unshift(page);
      saveMemDB();
      res.json({ ok: true, page: pageSummary(page) });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error creando la página' }); }
  });

  // Obtener una
  app.get('/api/page-builder/pages/:id', async (req: Request, res: Response) => {
    try {
      const page = findPage(req.params.id, tenantId(req));
      if (!page) { res.status(404).json({ ok: false, error: 'Página no encontrada' }); return; }
      res.json({ ok: true, page });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Guardar
  app.put('/api/page-builder/pages/:id', async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const patch: AnyRow = { updated_at: new Date().toISOString() };
      if (b.name !== undefined) patch.name = cleanText(b.name, 120);
      if (b.pageType !== undefined && ['landing', 'website', 'product'].includes(b.pageType)) patch.page_type = b.pageType;
      if (b.blocks !== undefined) patch.blocks = sanitizeBlocks(b.blocks);
      if (b.settings !== undefined) patch.settings = sanitizeSettings(b.settings);
      const page = findPage(req.params.id, tenantId(req));
      if (!page) { res.status(404).json({ ok: false, error: 'Página no encontrada' }); return; }
      Object.assign(page, patch);
      saveMemDB();
      res.json({ ok: true, page: pageSummary(page) });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error guardando' }); }
  });

  // Eliminar
  app.delete('/api/page-builder/pages/:id', async (req: Request, res: Response) => {
    try {
      const store = pbStore();
      const tenant = tenantId(req);
      const before = store.pages.length;
      store.pages = store.pages.filter((p) => !(p.id === req.params.id && p.tenant_id === tenant));
      if (store.pages.length === before) { res.status(404).json({ ok: false, error: 'Página no encontrada' }); return; }
      saveMemDB();
      res.json({ ok: true });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error eliminando' }); }
  });

  // Chequeo de conversión en vivo: renderiza el HTML real y corre el motor
  app.post('/api/page-builder/check', async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const blocks = sanitizeBlocks(b.blocks);
      const settings = sanitizeSettings(b.settings);
      const pageType = b.pageType === 'product' ? 'product' : 'home';
      const html = renderPageHtml({ id: 'preview', name: b.name || 'Vista previa', blocks, settings });
      const result = analyzeHtmlSnapshot(html, 'https://crm.xorbit360.com/p/vista-previa', pageType);
      res.json({ ok: true, ...result });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error en el chequeo' }); }
  });

  // Publicar (con advertencia si el puntaje es bajo)
  app.post('/api/page-builder/pages/:id/publish', async (req: Request, res: Response) => {
    try {
      const page = findPage(req.params.id, tenantId(req));
      if (!page) { res.status(404).json({ ok: false, error: 'Página no encontrada' }); return; }
      const html = renderPageHtml(page);
      const check = analyzeHtmlSnapshot(html, `https://crm.xorbit360.com/p/${page.slug}`, page.page_type === 'product' ? 'product' : 'home');
      if (check.score < 60 && !req.body?.force) {
        res.json({ ok: false, needsConfirm: true, score: check.score, grade: check.grade, findings: check.findings.slice(0, 5),
          message: `Tu página tiene puntaje ${check.score}/100. Te recomendamos corregir las fugas antes de publicar.` });
        return;
      }
      page.status = 'published'; page.conversion_score = check.score; page.updated_at = new Date().toISOString();
      saveMemDB();
      res.json({ ok: true, score: check.score, url: `https://crm.xorbit360.com/p/${page.slug}` });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error publicando' }); }
  });

  // Despublicar
  app.post('/api/page-builder/pages/:id/unpublish', async (req: Request, res: Response) => {
    try {
      const page = findPage(req.params.id, tenantId(req));
      if (!page) { res.status(404).json({ ok: false, error: 'Página no encontrada' }); return; }
      page.status = 'draft'; page.updated_at = new Date().toISOString();
      saveMemDB();
      res.json({ ok: true });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error' }); }
  });

  // Vista previa HTML (para el iframe del editor)
  app.post('/api/page-builder/preview', async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const html = renderPageHtml({ id: 'preview', name: b.name || 'Vista previa', blocks: sanitizeBlocks(b.blocks), settings: sanitizeSettings(b.settings) });
      res.type('html').send(html);
    } catch (e: any) { res.status(500).send('Error en la vista previa'); }
  });

  // --- Clonador ------------------------------------------------------------
  app.post('/api/page-builder/clone', async (req: Request, res: Response) => {
    try {
      if (!checkRate(req, res, 'pb-clone', 5)) return;
      const url = normalizeStoreUrl(req.body?.url || '');
      if (!url) { res.status(400).json({ ok: false, error: 'Pega una URL válida, por ejemplo https://tutienda.com' }); return; }
      const html = await fetchHtmlSafe(url);
      if (!html) { res.status(422).json({ ok: false, error: 'No pudimos abrir esa página. Revisa que la dirección esté bien.' }); return; }
      const { blocks, meta } = extractBlocks(html, url);
      res.json({ ok: true, blocks, meta, limits: 'Clonamos textos, imágenes y estructura. Animaciones, menús complejos y funciones con JavaScript no se clonan: revísalos en el editor.' });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error clonando' }); }
  });

  // --- Shopify ---------------------------------------------------------------
  app.get('/api/page-builder/shopify/status', async (req: Request, res: Response) => {
    try {
      const cfg = await getShopifyConfig(tenantId(req));
      res.json({ ok: true, connected: Boolean(cfg?.store && cfg?.apiKey), store: cfg?.store || '', maskedKey: cfg?.apiKey ? maskSecret(cfg.apiKey) : '' });
    } catch (e: any) { res.status(500).json({ ok: false, error: 'Error' }); }
  });
  app.post('/api/page-builder/shopify/connect', async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      let store = cleanText(b.store, 120).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!store.includes('.')) { res.status(400).json({ ok: false, error: 'Escribe el dominio de tu tienda, ej: mitienda.myshopify.com' }); return; }
      if (!store.includes('myshopify.com')) store = `${store.split('.')[0]}.myshopify.com`;
      const apiKey = cleanText(b.apiKey, 200);
      if (apiKey.length < 10) { res.status(400).json({ ok: false, error: 'Pega el token de acceso de la app (Admin API).' }); return; }
      // Verificación real contra Shopify antes de guardar
      const probe = await fetch(`https://${store}/admin/api/2024-07/shop.json`, { headers: { 'X-Shopify-Access-Token': apiKey }, signal: AbortSignal.timeout(12000) });
      if (!probe.ok) { res.status(400).json({ ok: false, error: 'Shopify rechazó la conexión. Revisa el dominio y que el token tenga permiso de contenido (write_content).' }); return; }
      const shop = await probe.json().catch(() => ({}));
      const enc = isSecretEncryptionEnabled() ? await encryptSecret(apiKey) : apiKey;
      await db().from('app_settings').upsert({ workspace_id: tenantId(req), key: SHOPIFY_SETTINGS_KEY,
        value: { store, apiKey: enc, shopName: shop?.shop?.name || '', connectedAt: new Date().toISOString() }, updated_at: new Date().toISOString() });
      res.json({ ok: true, store, shopName: shop?.shop?.name || '' });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error conectando Shopify' }); }
  });
  app.post('/api/page-builder/shopify/disconnect', async (req: Request, res: Response) => {
    try {
      await db().from('app_settings').delete().eq('workspace_id', tenantId(req)).eq('key', SHOPIFY_SETTINGS_KEY);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ ok: false, error: 'Error' }); }
  });
  app.post('/api/page-builder/pages/:id/shopify-publish', async (req: Request, res: Response) => {
    try {
      const cfg = await getShopifyConfig(tenantId(req));
      if (!cfg?.store || !cfg?.apiKey) { res.status(400).json({ ok: false, error: 'Conecta tu tienda Shopify primero.' }); return; }
      const page = findPage(req.params.id, tenantId(req));
      if (!page) { res.status(404).json({ ok: false, error: 'Página no encontrada' }); return; }
      const apiKey = await decryptSecret(cfg.apiKey);
      const bodyHtml = shopifyBodyHtml(page);
      const r = await fetch(`https://${cfg.store}/admin/api/2024-07/pages.json`, {
        method: 'POST', headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ page: { title: cleanText(page.name, 120), handle: page.slug, body_html: bodyHtml, published: true } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { res.status(400).json({ ok: false, error: `Shopify respondió ${r.status}: ${(j as any)?.errors ? JSON.stringify((j as any).errors).slice(0, 300) : 'revisa los permisos del token (write_content).'}` }); return; }
      res.json({ ok: true, shopifyPageId: (j as any)?.page?.id, handle: (j as any)?.page?.handle });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: e.message || 'Error publicando en Shopify' }); }
  });
}

async function getShopifyConfig(tenant: string): Promise<{ store?: string; apiKey?: string } | null> {
  const { data } = await db().from('app_settings').select('value').eq('workspace_id', tenant).eq('key', SHOPIFY_SETTINGS_KEY).single();
  return (data?.value as any) || null;
}

// Versión del HTML adaptada a página de Shopify (sin <html>, con estilos inline mínimos)
function shopifyBodyHtml(page: AnyRow): string {
  const blocks: PageBlock[] = Array.isArray(page.blocks) ? page.blocks : [];
  const s: BuilderSettings = page.settings || {};
  // Reutiliza el render y extrae solo el <body> para incrustarlo en la plantilla de Shopify
  const full = renderPageHtml(page);
  const m = full.match(/<body>([\s\S]*)<\/body>/i);
  const body = m ? m[1] : full;
  return `<div class="xorbit-page" style="font-family:system-ui,sans-serif;background:#0e0c07;color:#f5efe2">
<style>.xorbit-page .wrap{max-width:1080px;margin:0 auto;padding:0 20px}.xorbit-page section{padding:44px 0}.xorbit-page .btn{display:inline-block;background:#f5b942;color:#1a1206;font-weight:800;font-size:18px;padding:15px 34px;border-radius:12px;text-decoration:none}</style>
${body}</div>`;
}

// --- Clonador: fetch seguro + extracción a bloques ---------------------------
async function fetchHtmlSafe(startUrl: string): Promise<string | null> {
  let current = startUrl;
  for (let hop = 0; hop < 4; hop++) {
    let parsed: URL;
    try { parsed = new URL(current); } catch { return null; }
    if (!normalizeStoreUrl(current)) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, { signal: ctrl.signal, redirect: 'manual',
        headers: { 'User-Agent': UA, 'Accept-Language': 'es-CO,es;q=0.9', Accept: 'text/html,application/xhtml+xml' } });
    } catch { clearTimeout(timer); return null; }
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return null;
      try { current = new URL(loc, current).toString(); } catch { return null; }
      continue;
    }
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct && !/text\/html|application\/xhtml/i.test(ct)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.subarray(0, MAX_HTML_BYTES).toString('utf8');
  }
  return null;
}
function absUrl(base: string, src: string): string {
  try { const u = new URL(src, base); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : ''; }
  catch { return ''; }
}
function stripForClone(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}
function extractBlocks(html: string, baseUrl: string): { blocks: PageBlock[]; meta: AnyRow } {
  const clean = stripForClone(html);
  const textOf = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim().slice(0, 120);
  const h1s = [...clean.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textOf(m[1])).filter((t) => t.length > 2).slice(0, 2);
  const h2s = [...clean.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => textOf(m[1])).filter((t) => t.length > 2 && t.length < 120).slice(0, 6);
  const paras = [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => textOf(m[1])).filter((t) => t.length > 40 && t.length < 600).slice(0, 8);
  const imgs = [...clean.matchAll(/<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((m) => absUrl(baseUrl, m[1])).filter((u) => u && !/logo|icon|sprite|pixel/i.test(u)).slice(0, 6);
  const priceRe = /\$\s?\d[\d.,]*|\d[\d.,]*\s?(?:COP|USD|MXN|pesos)/i;
  const prices = [...new Set(paras.map((p) => (p.match(priceRe) || [])[0]).filter(Boolean))].slice(0, 3);
  const ctas = [...clean.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => textOf(m[1]))
    .filter((t) => t.length >= 3 && t.length <= 40 && /(comprar|compra|pedir|ordenar|lo quiero|agregar|whatsapp|reservar|cotizar)/i.test(t)).slice(0, 3);
  const accent = (html.match(/<meta[^>]+name\s*=\s*["']theme-color["'][^>]*content\s*=\s*["']([^"']+)["']/i)?.[1] || '').trim();
  const waMatch = html.match(/wa\.me\/(\d+)|api\.whatsapp\.com\/send\?phone=(\d+)/i);
  const blocks: PageBlock[] = [];
  blocks.push(blk('hero', {
    badge: 'Oferta destacada', title: h1s[0] || title || 'Título de la oferta',
    subtitle: paras[0] || '', image: imgs[0] || '', ctaText: ctas[0] || 'Pedir ahora',
  }));
  if (prices.length) blocks.push(blk('producto', {
    name: h2s[0] || h1s[0] || 'Producto', description: paras[1] || '', price: prices[0] || '',
    image: imgs[1] || imgs[0] || '', ctaText: ctas[0] || 'Lo quiero — pedir ahora',
  }));
  h2s.slice(prices.length ? 1 : 0, 4).forEach((h, i) => {
    blocks.push(blk('imagen_texto', { title: h, text: paras[i + 2] || '', image: imgs[i + 2] || '' }));
  });
  if (!blocks.some((b) => b.type === 'imagen_texto') && paras.length > 1) {
    blocks.push(blk('beneficios', { items: paras.slice(1, 4) }));
  }
  blocks.push(blk('garantia', {}));
  blocks.push(blk('checkout', {}));
  blocks.push(blk('footer', {}));
  return { blocks, meta: { title, whatsapp: waMatch ? (waMatch[1] || waMatch[2]) : '', accent: /^#[0-9a-fA-F]{3,6}$/.test(accent) ? accent : '' } };
}

// --- Rutas públicas ------------------------------------------------------------
const memStats = new Map<string, { views: number; clicks: number }>();
function bumpStat(id: string, field: 'views' | 'clicks') {
  const s = memStats.get(id) || { views: 0, clicks: 0 };
  s[field] += 1; memStats.set(id, s);
}

export function setupPageBuilderPublicRoutes(app: Express) {
  // Página pública
  app.get('/p/:slug', async (req: Request, res: Response) => {
    try {
      const slug = cleanText(req.params.slug, 70);
      const page = findPage(slug, null, true);
      if (!page) { res.status(404).type('html').send('<h1 style="font-family:sans-serif">Página no encontrada</h1>'); return; }
      res.type('html').send(renderPageHtml(page));
    } catch { res.status(404).type('html').send('<h1>Página no encontrada</h1>'); }
  });

  // Vista (beacon)
  app.post('/api/public/pages/:id/pageview', async (req: Request, res: Response) => {
    bumpStat(cleanText(req.params.id, 40), 'views');
    res.json({ ok: true });
  });

  // Checkout → Pedidos del CRM (contraentrega y pago anticipado)
  app.post('/api/public/pages/:id/orders', async (req: Request, res: Response) => {
    try {
      if (!checkRate(req, res, 'pb-order', 10)) return;
      const pageId = cleanText(req.params.id, 40);
      const page = findPage(pageId, null, true);
      if (!page) { res.status(404).json({ ok: false, error: 'Página no disponible' }); return; }
      const b = req.body || {};
      const name = cleanText(b.name, 80);
      const phone = normPhone(b.phone);
      const city = cleanText(b.city, 60);
      const address = cleanText(b.address, 160);
      const qty = Math.min(10, Math.max(1, parseInt(String(b.qty || '1'), 10) || 1));
      const pm = b.payment_method === 'prepaid' ? 'prepaid' : 'cod';
      const allowed = (page.settings?.checkoutType || 'both');
      const finalPm = allowed === 'cod' ? 'cod' : allowed === 'prepaid' ? 'prepaid' : pm;
      if (name.length < 2) { res.status(400).json({ ok: false, error: 'Escribe tu nombre' }); return; }
      if (phone.length < 10) { res.status(400).json({ ok: false, error: 'Escribe un WhatsApp válido' }); return; }
      if (city.length < 2 || address.length < 5) { res.status(400).json({ ok: false, error: 'Completa ciudad y dirección' }); return; }
      const order = {
        workspace_id: page.tenant_id || 'default',
        id: uid('pb'),
        phone, customer_name: name, address: `${address} — ${city}`,
        amount: 0, status: 'nuevo', payment_method: finalPm,
        timestamp_text: new Date().toISOString(),
        raw: { source: 'page-builder', page_id: page.id, page_slug: page.slug, page_name: page.name, qty, city },
      };
      const { error } = await db().from('orders').insert(order);
      if (error) throw error;
      res.json({ ok: true });
    } catch (e: any) { res.status(e.status || 500).json({ ok: false, error: 'No se pudo registrar el pedido. Intenta de nuevo.' }); }
  });

  // Métricas de la página
  app.get('/api/page-builder/pages/:id/stats', async (req: Request, res: Response) => {
    try {
      const page = findPage(req.params.id, tenantId(req));
      if (!page) { res.status(404).json({ ok: false, error: 'No encontrada' }); return; }
      const mem = memStats.get(page.id) || { views: 0, clicks: 0 };
      let orderCount = 0;
      try {
        const { count } = await db().from('orders').select('id', { count: 'exact', head: true })
          .eq('workspace_id', page.tenant_id || 'default').like('id', 'pb-%');
        orderCount = count || 0;
      } catch { /* tabla orders puede no existir aún */ }
      res.json({ ok: true, stats: { views: mem.views, orders: orderCount } });
    } catch (e: any) { res.status(500).json({ ok: false, error: 'Error' }); }
  });
}
