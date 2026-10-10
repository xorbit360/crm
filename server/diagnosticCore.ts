// ============================================================================
// Diagnóstico de Conversión Xorbit 360 — motor de análisis público.
// Descarga hasta 3 páginas reales de la tienda del visitante (inicio y, si se
// descubren, colección y producto) y corre chequeos heurísticos verificables
// sobre el HTML servido: nada de puntajes inventados; cada hallazgo cita la
// evidencia concreta detectada en la página (o su ausencia comprobada).
// ============================================================================

export type PageKind = 'home' | 'collection' | 'product';

export interface PageSnapshot {
  kind: PageKind;
  url: string;
  finalUrl: string;
  status: number;
  https: boolean;
  ms: number;
  htmlBytes: number;
  title: string;
  hasMetaDescription: boolean;
  hasViewport: boolean;
  hasFavicon: boolean;
  h1: string[];
  textLength: number;
  imgTotal: number;
  imgNoAlt: number;
  priceHits: number;
  hasWhatsapp: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  socials: string[];
  ctaTexts: string[];
  trust: { shipping: boolean; returns: boolean; warranty: boolean; cod: boolean; securePay: boolean };
  reviewSignals: boolean;
  benefitWordsInH1: boolean;
}

export interface BlockScore {
  key: 'presentacion' | 'oferta' | 'confianza' | 'contacto';
  label: string;
  score: number;
  weight: number;
}

export interface Finding {
  id: string;
  title: string;
  severity: 'critico' | 'mejorable';
  category: 'Copy' | 'Oferta' | 'Confianza' | 'Creativo' | 'UI/UX';
  page: PageKind | 'general';
  evidence: string;
  impact: string;
  rank: number;
}

export interface DiagnosticResult {
  inputUrl: string;
  domain: string;
  analyzedAt: string;
  pagesAnalyzed: PageSnapshot[];
  pagesNote: string;
  score: number;
  grade: string;
  gradeLabel: string;
  blocks: BlockScore[];
  pageScores: { kind: PageKind; label: string; url: string; score: number; weight: number; note: string }[];
  findings: Finding[];
  stats: { avgMs: number; problems: number; critical: number };
}

const FETCH_TIMEOUT_MS = 14_000;
const MAX_HTML_BYTES = 3_000_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Xorbit360-Diagnostico/1.0';

const BENEFIT_WORDS = /(gratis|env[ií]o|garant|descuento|oferta|ahorra|resultados?|pierde|gana|mejora|transforma|sin riesgo|contraentrega|pago al recibir|calidad|original|certificad)/i;
const CTA_WORDS = /(comprar|compra ahora|agregar al carrito|a[ñn]adir|pedir|ordenar|lo quiero|reservar|cotizar|whatsapp|escr[ií]benos|quiero el m[ií]o|shop now|buy now|add to cart)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n) || 32));
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (h.includes(':')) return true; // IPv6 literales fuera de alcance
  return false;
}

export function normalizeStoreUrl(input: string): string | null {
  let raw = String(input || '').trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname.includes('.')) return null;
  if (isPrivateHost(url.hostname)) return null;
  url.hash = '';
  return url.toString();
}

async function fetchPage(startUrl: string, kind: PageKind): Promise<PageSnapshot | null> {
  let current = startUrl;
  const started = Date.now();
  for (let hop = 0; hop < 4; hop++) {
    const parsed = new URL(current);
    if (isPrivateHost(parsed.hostname)) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        signal: ctrl.signal,
        redirect: 'manual',
        headers: { 'User-Agent': UA, 'Accept-Language': 'es-CO,es;q=0.9', Accept: 'text/html,application/xhtml+xml' },
      });
    } catch {
      clearTimeout(timer);
      return null;
    }
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return null;
      try { current = new URL(loc, current).toString(); } catch { return null; }
      continue;
    }
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const html = buf.subarray(0, MAX_HTML_BYTES).toString('utf8');
    const ms = Date.now() - started;
    return analyzeHtml(html, startUrl, current, res.status, ms, buf.length, kind);
  }
  return null;
}

function analyzeHtml(html: string, inputUrl: string, finalUrl: string, status: number, ms: number, htmlBytes: number, kind: PageKind): PageSnapshot {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim().slice(0, 160) : '';
  const hasMetaDescription = /<meta[^>]+name\s*=\s*["']description["'][^>]*content\s*=\s*["'][^"']{10,}["']/i.test(html)
    || /<meta[^>]+content\s*=\s*["'][^"']{10,}["'][^>]*name\s*=\s*["']description["']/i.test(html);
  const hasViewport = /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html);
  const hasFavicon = /<link[^>]+rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html);
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => stripTags(m[1]).slice(0, 140))
    .filter(Boolean)
    .slice(0, 3);
  const text = stripTags(html);
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgNoAlt = imgTags.filter((t) => {
    const alt = t.match(/\balt\s*=\s*"([^"]*)"/i) || t.match(/\balt\s*=\s*'([^']*)'/i);
    return !alt || !alt[1].trim();
  }).length;
  const priceHits = (text.match(/\$\s?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\$\s?\d{3,}|\d{1,3}(?:[.,]\d{3})+\s?(?:COP|USD|MXN|EUR|pesos)/gi) || []).length;
  const lower = text.toLowerCase();
  const ctaTexts = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length >= 3 && t.length <= 60 && CTA_WORDS.test(t))
    .slice(0, 6);
  const socials: string[] = [];
  if (/instagram\.com/i.test(html)) socials.push('Instagram');
  if (/facebook\.com|fb\.com/i.test(html)) socials.push('Facebook');
  if (/tiktok\.com/i.test(html)) socials.push('TikTok');
  if (/youtube\.com|youtu\.be/i.test(html)) socials.push('YouTube');
  return {
    kind,
    url: inputUrl,
    finalUrl,
    status,
    https: finalUrl.startsWith('https://'),
    ms,
    htmlBytes,
    title,
    hasMetaDescription,
    hasViewport,
    hasFavicon,
    h1,
    textLength: text.length,
    imgTotal: imgTags.length,
    imgNoAlt,
    priceHits,
    hasWhatsapp: /wa\.me\/|api\.whatsapp\.com|whatsapp\.com\/send/i.test(html),
    hasPhone: /href\s*=\s*["']tel:/i.test(html) || /\b(?:\+?57)?\s?3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/.test(text),
    hasEmail: /href\s*=\s*["']mailto:/i.test(html),
    socials,
    ctaTexts,
    trust: {
      shipping: /env[ií]o/.test(lower),
      returns: /devoluci/.test(lower),
      warranty: /garant/.test(lower),
      cod: /contraentrega|pago al recibir|pago contra entrega/.test(lower),
      securePay: /pago seguro|compra segura|checkout seguro/.test(lower),
    },
    reviewSignals: /(rese[ñn]as?|reviews?|opiniones|calificaciones|testimonios|\u2605)/i.test(text),
    benefitWordsInH1: h1.some((t) => BENEFIT_WORDS.test(t)),
  };
}

function discoverLinks(home: PageSnapshot, html: string): { collection: string | null; product: string | null } {
  let collection: string | null = null;
  let product: string | null = null;
  const base = new URL(home.finalUrl);
  const anchors = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  for (const m of anchors) {
    const href = m[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    let u: URL;
    try { u = new URL(href, base); } catch { continue; }
    if (u.hostname !== base.hostname) continue;
    const path = u.pathname.toLowerCase();
    if (!collection && /(^|\/)(collections?|coleccion(es)?|categor(i|í)as?|catalogo|cat[aá]logo|shop|tienda|ver-todo|all-products)(\/|$)/.test(path)) {
      collection = u.toString();
    }
    if (!product && /(^|\/)(products?|productos?|p|item|items|dp)(\/[^/]+)/.test(path) && !/(collections?|categor)/.test(path)) {
      product = u.toString();
    }
    if (collection && product) break;
  }
  return { collection, product };
}

interface CheckDef {
  id: string;
  block: BlockScore['key'];
  page: PageKind | 'best';
  failTitle: string;
  severity: 'critico' | 'mejorable';
  category: Finding['category'];
  rank: number;
  test: (pages: PageSnapshot[]) => { pass: boolean; evidence: string };
  impact: string;
}

const pick = (pages: PageSnapshot[], kind: PageKind) => pages.find((p) => p.kind === kind);
const bestOf = (pages: PageSnapshot[], kind: PageKind | 'best') => (kind === 'best' ? pages[0] : pick(pages, kind) || pages[0]);

const CHECKS: CheckDef[] = [
  {
    id: 'https', block: 'presentacion', page: 'home', rank: 55, severity: 'critico', category: 'Confianza',
    failTitle: 'Tu tienda no abre con candado seguro (HTTPS)',
    test: (ps) => { const p = bestOf(ps, 'home'); return { pass: !!p?.https, evidence: p ? `La dirección final de tu página es ${p.finalUrl}, ${p.https ? 'con HTTPS activo' : 'SIN HTTPS: el navegador puede marcarla como no segura'}.` : 'No pudimos abrir tu página.' }; },
    impact: 'Sin candado seguro, muchos navegadores advierten “sitio no seguro” y el visitante se devuelve antes de ver tu oferta.',
  },
  {
    id: 'speed', block: 'presentacion', page: 'home', rank: 85, severity: 'critico', category: 'UI/UX',
    failTitle: 'La página tarda demasiado en responder',
    test: (ps) => { const p = bestOf(ps, 'home'); return { pass: !!p && p.ms <= 4000, evidence: p ? `Tu página respondió en ${(p.ms / 1000).toFixed(1)} segundos en nuestra medición.` : 'Sin medición.' }; },
    impact: 'Cada segundo extra de espera hace que más visitantes abandonen antes de ver el producto; en celular el efecto es peor.',
  },
  {
    id: 'viewport', block: 'presentacion', page: 'home', rank: 70, severity: 'critico', category: 'UI/UX',
    failTitle: 'La página no está adaptada para celular',
    test: (ps) => { const p = bestOf(ps, 'home'); return { pass: !!p?.hasViewport, evidence: p?.hasViewport ? 'Detectamos la etiqueta de adaptación móvil (viewport).' : 'No encontramos la etiqueta viewport: en el celular la página puede verse como en escritorio, obligando a hacer zoom.' }; },
    impact: 'La mayoría de tus visitas llegan desde el celular; si la página no se adapta, leer y tocar botones se vuelve una fricción que mata la compra.',
  },
  {
    id: 'title', block: 'presentacion', page: 'home', rank: 60, severity: 'mejorable', category: 'Copy',
    failTitle: 'Falta un título claro que diga qué vendes',
    test: (ps) => { const p = bestOf(ps, 'home'); const ok = !!p && p.title.length >= 10; return { pass: ok, evidence: p?.title ? `El título actual de tu página es: “${p.title}”.` : 'Tu página no muestra un título visible (etiqueta <title> vacía o ausente).' }; },
    impact: 'El título es lo primero que se lee en Google, en la pestaña y al compartir el link; si no dice qué vendes ni para quién, pierdes clics y confianza.',
  },
  {
    id: 'metadesc', block: 'presentacion', page: 'home', rank: 40, severity: 'mejorable', category: 'Copy',
    failTitle: 'Sin descripción para buscadores',
    test: (ps) => { const p = bestOf(ps, 'home'); return { pass: !!p?.hasMetaDescription, evidence: p?.hasMetaDescription ? 'Tu página sí tiene meta descripción.' : 'No detectamos meta descripción: Google mostrará un fragmento cualquiera de tu página en los resultados.' }; },
    impact: 'Esa descripción es tu aviso gratuito en Google; si falta, decides menos y el clic se lo lleva otro resultado.',
  },
  {
    id: 'h1-benefit', block: 'presentacion', page: 'home', rank: 95, severity: 'critico', category: 'Copy',
    failTitle: 'El titular principal no promete un beneficio concreto',
    test: (ps) => { const p = bestOf(ps, 'home'); const ok = !!p && p.h1.length > 0 && p.benefitWordsInH1; return { pass: ok, evidence: p && p.h1.length ? `Tu titular principal dice: “${p.h1[0]}”${p.benefitWordsInH1 ? ' e incluye una promesa o beneficio.' : ' y no encontramos en él una promesa o beneficio concreto (precio, garantía, envío, resultado).'}` : 'No encontramos un titular principal (H1) en tu página de inicio.' }; },
    impact: 'El visitante decide en segundos si se queda; un titular sin beneficio claro hace que pagues el clic y la persona se vaya sin entender por qué comprarte.',
  },
  {
    id: 'imgalt', block: 'presentacion', page: 'best', rank: 30, severity: 'mejorable', category: 'Creativo',
    failTitle: 'Imágenes sin texto alternativo',
    test: (ps) => { const t = ps.reduce((s, p) => s + p.imgTotal, 0); const n = ps.reduce((s, p) => s + p.imgNoAlt, 0); const pass = t === 0 || n / Math.max(t, 1) <= 0.4; return { pass, evidence: `De ${t} imágenes detectadas, ${n} no tienen texto alternativo (alt).` }; },
    impact: 'Sin texto alternativo pierdes visibilidad en buscadores de imágenes y, si una foto no carga, el visitante ve un hueco vacío justo donde debía convencerse.',
  },
  {
    id: 'prices', block: 'oferta', page: 'best', rank: 88, severity: 'critico', category: 'Oferta',
    failTitle: 'Los precios no se ven con claridad',
    test: (ps) => { const any = ps.some((p) => p.priceHits >= 1); const best = ps.reduce((m, p) => Math.max(m, p.priceHits), 0); return { pass: any, evidence: any ? `Detectamos ${best} precios visibles en la página con más precios.` : 'No encontramos precios visibles en las páginas revisadas.' }; },
    impact: 'Si el precio no se encuentra de inmediato, el visitante asume que es caro o se cansa de buscar; la duda se resuelve saliendo de tu tienda.',
  },
  {
    id: 'product-guarantee', block: 'oferta', page: 'product', rank: 82, severity: 'critico', category: 'Confianza',
    failTitle: 'En el producto no se ve garantía ni devolución junto a la compra',
    test: (ps) => { const p = pick(ps, 'product'); if (!p) return { pass: false, evidence: 'No logramos abrir una página de producto para verificarlo.' }; const ok = p.trust.warranty || p.trust.returns; return { pass: ok, evidence: ok ? 'En tu producto sí se menciona garantía o devolución.' : 'En la página de producto no encontramos mención de garantía ni de devoluciones.' }; },
    impact: 'Justo antes de pagar, la persona busca qué pasa si algo sale mal; sin garantía visible, el miedo le gana al deseo.',
  },
  {
    id: 'product-photos', block: 'oferta', page: 'product', rank: 58, severity: 'mejorable', category: 'Creativo',
    failTitle: 'El producto se muestra con pocas fotos',
    test: (ps) => { const p = pick(ps, 'product'); if (!p) return { pass: false, evidence: 'No logramos abrir una página de producto para verificarlo.' }; return { pass: p.imgTotal >= 4, evidence: `En la página de producto contamos ${p.imgTotal} imágenes en total (incluye logos y banners).` }; },
    impact: 'Comprar sin tocar el producto exige verlo desde varios ángulos; con pocas fotos crecen las dudas y las preguntas que nunca te hacen.',
  },
  {
    id: 'product-reviews', block: 'oferta', page: 'product', rank: 66, severity: 'mejorable', category: 'Confianza',
    failTitle: 'No se ven reseñas ni prueba social en el producto',
    test: (ps) => { const p = pick(ps, 'product'); if (!p) return { pass: false, evidence: 'No logramos abrir una página de producto para verificarlo.' }; return { pass: p.reviewSignals, evidence: p.reviewSignals ? 'Detectamos señales de reseñas u opiniones en el producto.' : 'No detectamos reseñas, calificaciones ni testimonios en la página de producto.' }; },
    impact: 'La gente le cree a otros compradores, no a la tienda; sin prueba social, tu producto compite solo contra el miedo a equivocarse.',
  },
  {
    id: 'collection-speed', block: 'oferta', page: 'collection', rank: 62, severity: 'mejorable', category: 'Oferta',
    failTitle: 'En tu colección los productos no se distinguen rápido',
    test: (ps) => { const p = pick(ps, 'collection'); if (!p) return { pass: false, evidence: 'No encontramos una página de colección o categoría enlazada desde el inicio.' }; const ok = p.priceHits >= 3 && p.imgTotal >= 4; return { pass: ok, evidence: `En tu colección detectamos ${p.priceHits} precios visibles y ${p.imgTotal} imágenes.` }; },
    impact: 'Si al entrar a la colección no se ven precios ni productos de un vistazo, el visitante no compara: se va a otra tienda donde sí entiende todo rápido.',
  },
  {
    id: 'trust-signals', block: 'confianza', page: 'home', rank: 78, severity: 'critico', category: 'Confianza',
    failTitle: 'Faltan señales de confianza en la primera pantalla',
    test: (ps) => { const p = bestOf(ps, 'home'); const hits = p ? [p.trust.shipping, p.trust.returns, p.trust.warranty, p.trust.cod, p.trust.securePay].filter(Boolean).length : 0; return { pass: hits >= 2, evidence: p ? `En tu inicio detectamos ${hits} de 5 señales de confianza buscadas (envíos, devoluciones, garantía, contraentrega, pago seguro).` : 'Sin página de inicio.' }; },
    impact: 'Un desconocido no te entrega su plata sin señales de respaldo; sin envíos claros, devoluciones o contraentrega visibles, la desconfianza frena la primera compra.',
  },
  {
    id: 'whatsapp', block: 'contacto', page: 'best', rank: 100, severity: 'critico', category: 'UI/UX',
    failTitle: 'No tienes un botón de WhatsApp visible',
    test: (ps) => { const any = ps.some((p) => p.hasWhatsapp); return { pass: any, evidence: any ? 'Detectamos enlace de WhatsApp en tus páginas.' : 'No encontramos ningún enlace de WhatsApp (wa.me o api.whatsapp.com) en las páginas revisadas.' }; },
    impact: 'En Latinoamérica la venta se cierra conversando; sin un botón de WhatsApp a un toque, el interesado se enfría y le escribe a tu competencia.',
  },
  {
    id: 'cta', block: 'contacto', page: 'best', rank: 90, severity: 'critico', category: 'UI/UX',
    failTitle: 'No se ve un llamado a la acción claro',
    test: (ps) => { const total = ps.reduce((s, p) => s + p.ctaTexts.length, 0); return { pass: total > 0, evidence: total > 0 ? `Detectamos botones o enlaces de acción como: ${[...new Set(ps.flatMap((p) => p.ctaTexts))].slice(0, 3).join(' · ')}.` : 'No encontramos botones o enlaces con textos de acción (comprar, pedir, agregar al carrito, etc.).' }; },
    impact: 'Si el siguiente paso no es obvio y visible, el visitante interesado no adivina: simplemente se va con las ganas a otra parte.',
  },
  {
    id: 'contact-direct', block: 'contacto', page: 'best', rank: 52, severity: 'mejorable', category: 'Confianza',
    failTitle: 'Cuesta encontrarte un canal de contacto directo',
    test: (ps) => { const any = ps.some((p) => p.hasPhone || p.hasEmail); return { pass: any, evidence: any ? 'Detectamos teléfono o correo de contacto clicable.' : 'No detectamos teléfono ni correo clicable (tel: o mailto:) en las páginas revisadas.' }; },
    impact: 'Un canal directo visible baja la desconfianza y rescata ventas de quienes solo necesitaban hacer una pregunta rápida.',
  },
  {
    id: 'socials', block: 'contacto', page: 'home', rank: 38, severity: 'mejorable', category: 'Creativo',
    failTitle: 'No enlazas tus redes sociales',
    test: (ps) => { const p = bestOf(ps, 'home'); return { pass: !!p && p.socials.length > 0, evidence: p && p.socials.length ? `Detectamos enlaces a: ${p.socials.join(', ')}.` : 'No encontramos enlaces a tus redes sociales desde la página de inicio.' }; },
    impact: 'Tus redes son tu vitrina de todos los días; sin enlace desde la tienda, pierdes la visita de vuelta y la prueba social que traen tus seguidores.',
  },
];

export function gradeFor(score: number): { grade: string; label: string } {
  if (score >= 85) return { grade: 'A', label: 'Por encima del promedio: tu tienda convierte bien' };
  if (score >= 70) return { grade: 'B', label: 'En el promedio alto: vende, con fugas corregibles' };
  if (score >= 55) return { grade: 'C', label: 'En el promedio: vende, pero deja plata en la mesa' };
  if (score >= 40) return { grade: 'D', label: 'Por debajo del promedio: fugas importantes' };
  return { grade: 'E', label: 'Muy por debajo: la tienda está perdiendo la mayoría de las ventas' };
}

/**
 * Corre el diagnóstico completo. `onPhase` reporta el avance real para que la
 * pantalla de progreso refleje el trabajo del servidor (no es decorativa).
 */
export async function runDiagnostic(
  inputUrl: string,
  onPhase?: (phase: string) => void,
): Promise<DiagnosticResult> {
  const normalized = normalizeStoreUrl(inputUrl);
  if (!normalized) {
    const err: any = new Error('La URL no es válida. Pega la dirección completa de tu tienda, por ejemplo https://tutienda.com');
    err.status = 400;
    throw err;
  }
  onPhase?.('capturing');
  const home = await fetchPage(normalized, 'home');
  if (!home) {
    const err: any = new Error('No pudimos abrir tu tienda. Revisa que la dirección esté bien escrita y que la página abra en tu navegador.');
    err.status = 422;
    throw err;
  }
  const pages: PageSnapshot[] = [home];

  // Descubrimiento de colección y producto desde el HTML crudo: volvemos a
  // pedir la respuesta cruda solo para extraer enlaces si hace falta.
  onPhase?.('measuring');
  let discovered: { collection: string | null; product: string | null } = { collection: null, product: null };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(home.finalUrl, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    });
    clearTimeout(timer);
    if (res.ok) {
      const htmlRaw = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_HTML_BYTES).toString('utf8');
      discovered = discoverLinks(home, htmlRaw);
    }
  } catch { /* el descubrimiento es opcional; el diagnóstico sigue con la portada */ }

  onPhase?.('analyzing');
  if (discovered.collection) {
    const col = await fetchPage(discovered.collection, 'collection').catch(() => null);
    if (col) pages.push(col);
  }
  if (discovered.product) {
    const prod = await fetchPage(discovered.product, 'product').catch(() => null);
    if (prod) pages.push(prod);
  }

  onPhase?.('scoring');
  const findings: Finding[] = [];
  const blockResults: Record<BlockScore['key'], { pass: number; total: number; label: string; weight: number }> = {
    presentacion: { pass: 0, total: 0, label: 'Presentación', weight: 25 },
    oferta: { pass: 0, total: 0, label: 'Producto y oferta', weight: 30 },
    confianza: { pass: 0, total: 0, label: 'Confianza', weight: 20 },
    contacto: { pass: 0, total: 0, label: 'Contacto y ventas', weight: 25 },
  };
  for (const check of CHECKS) {
    const applies = check.page === 'best' || check.page === 'home' || pages.some((p) => p.kind === check.page);
    const bucket = blockResults[check.block];
    bucket.total += 1;
    let result: { pass: boolean; evidence: string };
    try { result = check.test(pages); } catch { result = { pass: false, evidence: 'No pudimos verificar este punto.' }; }
    if (result.pass || !applies) bucket.pass += 1;
    if (!result.pass && applies) {
      findings.push({
        id: check.id,
        title: check.failTitle,
        severity: check.severity,
        category: check.category,
        page: check.page === 'best' ? 'general' : check.page,
        evidence: result.evidence,
        impact: check.impact,
        rank: check.rank,
      });
    }
  }

  const blocks: BlockScore[] = (Object.keys(blockResults) as BlockScore['key'][]).map((key) => {
    const b = blockResults[key];
    return { key, label: b.label, score: b.total ? Math.round((b.pass / b.total) * 100) : 100, weight: b.weight };
  });
  const score = Math.round(blocks.reduce((s, b) => s + (b.score * b.weight) / 100, 0));
  const { grade, label } = gradeFor(score);

  const pageScores = pages.map((p, i) => {
    const related = CHECKS.filter((c) => c.page === p.kind || (p.kind === 'home' && c.page === 'home'));
    const ownChecks = CHECKS.filter((c) => c.page === p.kind);
    const pool = ownChecks.length ? ownChecks : related;
    let pass = 0;
    for (const c of pool) { try { if (c.test(pages).pass) pass += 1; } catch { /* cuenta como no pasado */ } }
    const own = pool.length ? Math.round((pass / pool.length) * 100) : score;
    const weights = [55, 20, 25];
    return {
      kind: p.kind,
      label: p.kind === 'home' ? 'Inicio' : p.kind === 'collection' ? 'Colección' : 'Producto',
      url: p.finalUrl,
      score: own,
      weight: weights[i] ?? 20,
      note: p.title || p.finalUrl.replace(/^https?:\/\//, ''),
    };
  });

  findings.sort((a, b) => b.rank - a.rank);
  const topFindings = findings.slice(0, 10);
  const avgMs = Math.round(pages.reduce((s, p) => s + p.ms, 0) / Math.max(pages.length, 1));
  const domain = (() => { try { return new URL(home.finalUrl).hostname; } catch { return normalized; } })();
  const foundKinds = pages.map((p) => p.kind);
  const pagesNote = foundKinds.length === 3
    ? 'Analizamos tu inicio, tu colección y un producto.'
    : foundKinds.includes('collection')
      ? 'Analizamos tu inicio y tu colección; no encontramos una página de producto enlazada.'
      : foundKinds.includes('product')
        ? 'Analizamos tu inicio y un producto; no encontramos una colección enlazada.'
        : 'Solo pudimos analizar tu página de inicio: no encontramos enlaces a una colección ni a un producto.';

  return {
    inputUrl: normalized,
    domain,
    analyzedAt: new Date().toISOString(),
    pagesAnalyzed: pages,
    pagesNote,
    score,
    grade,
    gradeLabel: label,
    blocks,
    pageScores,
    findings: topFindings,
    stats: { avgMs, problems: topFindings.length, critical: topFindings.filter((f) => f.severity === 'critico').length },
  };
}
