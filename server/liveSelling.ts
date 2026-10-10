import type { Express, Request, Response } from 'express';
import { getSupabase } from './supabase.ts';
import { renderLivePage } from './livePage.ts';

// ============================================================================
// Live Selling real: landings multi-tenant, API pública y panel CRM.
// Las tablas live_* viven en Supabase (RLS solo service_role). Ninguna ruta
// pública usa la sesión del CRM; se valida y limita por separado.
// ============================================================================

const DEFAULT_TENANT = 'default';
const MAIN_HOSTS = new Set([
  'crm.xorbit360.com',
  'xorbit360.com',
  'www.xorbit360.com',
  'localhost',
  '127.0.0.1',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnyRow = Record<string, any>;

function db(): any {
  const client = getSupabase();
  if (!client) {
    const err: any = new Error('Supabase no está configurado en el servidor');
    err.status = 503;
    throw err;
  }
  return client;
}

function tenantId(req: Request): string {
  const user: any = (req as any).authUser || {};
  return String(user.workspaceId || user.tenantId || DEFAULT_TENANT).slice(0, 80);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.trunc(cleanNumber(value, fallback));
  return Math.min(max, Math.max(min, n));
}

function slugify(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeDomain(value: unknown): string {
  const domain = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
  if (!domain || domain.length > 253) return '';
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) return '';
  return domain;
}

const PLATFORM_SUFFIX = (process.env.LIVE_PLATFORM_DOMAIN || 'xorbit360.com').toLowerCase().replace(/^\./, '');

function requestHost(req: Request): string {
  return normalizeDomain(String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]);
}

function isMainHost(host: string): boolean {
  if (!host) return true;
  if (MAIN_HOSTS.has(host)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true; // acceso directo por IP (uso interno/MCP)
  return false;
}

// Subdominio de plataforma: <slug>.<dominio-plataforma>. Los subdominios ya
// usados por la plataforma (crm, www, api, mail) quedan excluidos.
function platformSubdomainSlug(host: string): string {
  const suffix = `.${PLATFORM_SUFFIX}`;
  if (!host.endsWith(suffix)) return '';
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes('.')) return '';
  if (['crm', 'www', 'api', 'mail'].includes(label)) return '';
  return slugify(label);
}

// Extrae numero y mensaje de un link completo de WhatsApp pegado por el
// usuario (wa.me/<numero>?text=... o api.whatsapp.com/send?phone=...&text=...).
// Los acortadores (wa.link y similares) no se pueden descomponer sin seguir
// el redirect; en ese caso el link se guarda tal cual y la pagina lo abre.
export function parseWhatsAppLink(raw: unknown): { number: string; text: string } | null {
  const value = cleanText(raw, 1200);
  if (!value) return null;
  let url: URL;
  try { url = new URL(value.startsWith('http') ? value : `https://${value}`); } catch { return null; }
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
  return { number: number.slice(0, 20), text: cleanText(text, 300) };
}

export function cleanHttpUrl(value: unknown): string {
  const raw = cleanText(value, 1200);
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().slice(0, 1200);
  } catch { return ''; }
}

export function extractVideo(
  rawValue: unknown,
  providerHint?: unknown,
): { provider: 'youtube' | 'vimeo'; videoId: string; videoUrl: string } | null {
  const raw = cleanText(rawValue, 1000);
  const hint = cleanText(providerHint, 20).toLowerCase();
  if (!raw) return null;

  const ytPatterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = raw.match(pattern);
    if (match) return { provider: 'youtube', videoId: match[1], videoUrl: raw };
  }
  const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (vimeoMatch) return { provider: 'vimeo', videoId: vimeoMatch[1], videoUrl: raw };

  if (/^\d{6,}$/.test(raw)) return { provider: 'vimeo', videoId: raw, videoUrl: raw };
  if (/^[A-Za-z0-9_-]{11}$/.test(raw) && hint !== 'vimeo') {
    return { provider: 'youtube', videoId: raw, videoUrl: raw };
  }
  if (hint === 'youtube' || hint === 'vimeo') {
    return { provider: hint, videoId: raw, videoUrl: raw };
  }
  return null;
}

export function normalizePhoneCO(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith('57') && digits[2] === '3') return digits;
  return '';
}

function cleanUtm(value: unknown): AnyRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: AnyRow = {};
  for (const [key, raw] of Object.entries(value as AnyRow).slice(0, 30)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue;
    out[key] = cleanText(raw, 300);
  }
  return out;
}

function requestIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

// Rate-limit básico en memoria por IP + ruta (suficiente para una instancia;
// si se escala a varias réplicas debe moverse a Redis/Upstash).
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRate(req: Request, res: Response, bucket: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const key = `${bucket}:${requestIp(req)}`;
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  if (current.count > maxPerMinute) {
    res.status(429).json({ success: false, error: 'Demasiadas solicitudes. Espera un momento.' });
    return false;
  }
  return true;
}

function landingToAdmin(row: AnyRow): AnyRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    customDomain: row.custom_domain || '',
    status: row.status,
    title: row.title,
    liveLabel: row.live_label || '',
    disclosureText: row.disclosure_text || 'Transmisión pregrabada',
    titleBackground: row.title_background || '#e898db',
    buttonText: row.button_text || '¡COMPRAR!',
    buttonColor: row.button_color || '#e11d48',
    productName: row.product_name || '',
    productImageUrl: row.product_image_url || '',
    productPrice: Number(row.product_price || 0),
    productComparePrice: row.product_compare_price == null ? null : Number(row.product_compare_price),
    shippingPrice: Number(row.shipping_price || 0),
    shippingText: row.shipping_text || '',
    couponCode: row.coupon_code || '',
    couponDiscountPercent: Number(row.coupon_discount_percent || 0),
    videoProvider: row.video_provider || '',
    videoId: row.video_id || '',
    videoUrl: row.video_url || '',
    allowLoop: row.allow_loop !== false,
    whatsappNumber: row.whatsapp_number || '',
    whatsappText: row.whatsapp_text || '',
    checkoutMode: row.checkout_mode || 'crm',
    shopifyUrl: row.shopify_url || '',
    whatsappLink: row.whatsapp_link || '',
    commentMode: row.comment_mode || 'sequence',
    viewersMin: Number(row.viewers_min ?? 40),
    viewersMax: Number(row.viewers_max ?? 60),
    domainVerified: !!row.domain_verified,
    domainStatus: row.domain_status || 'not_configured',
    domainVerifiedAt: row.domain_verified_at || null,
    domainCheck: row.domain_check || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function landingToPublic(row: AnyRow, fakeComments: AnyRow[]): AnyRow {
  const admin = landingToAdmin(row);
  return {
    id: admin.id,
    slug: admin.slug,
    title: admin.title,
    liveLabel: admin.liveLabel,
    disclosureText: admin.disclosureText,
    titleBackground: admin.titleBackground,
    buttonText: admin.buttonText,
    buttonColor: admin.buttonColor,
    productName: admin.productName,
    productImageUrl: admin.productImageUrl,
    productPrice: admin.productPrice,
    productComparePrice: admin.productComparePrice,
    shippingPrice: admin.shippingPrice,
    shippingText: admin.shippingText,
    videoProvider: admin.videoProvider,
    videoId: admin.videoId,
    allowLoop: admin.allowLoop,
    whatsappNumber: admin.whatsappNumber,
    whatsappText: admin.whatsappText,
    whatsappLink: admin.whatsappLink,
    checkoutMode: admin.checkoutMode,
    shopifyUrl: admin.shopifyUrl,
    commentMode: admin.commentMode,
    viewersMin: admin.viewersMin,
    viewersMax: admin.viewersMax,
    fakeComments: fakeComments.map((c) => ({
      id: c.id,
      author: c.author,
      content: c.content,
      avatarUrl: c.avatar_url || '',
      second: c.at_second == null ? null : Number(c.at_second),
    })),
  };
}

async function fetchLandingBySlug(client: any, slug: string, activeOnly: boolean): Promise<AnyRow | null> {
  let query = client.from('live_landings').select('*').eq('slug', slug).limit(1);
  if (activeOnly) query = query.eq('status', 'active');
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

async function fetchLandingByRef(client: any, ref: string, activeOnly: boolean): Promise<AnyRow | null> {
  if (UUID_RE.test(ref)) {
    let query = client.from('live_landings').select('*').eq('id', ref).limit(1);
    if (activeOnly) query = query.eq('status', 'active');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (data?.[0]) return data[0];
  }
  return fetchLandingBySlug(client, slugify(ref), activeOnly);
}

async function fetchLandingByDomain(client: any, domain: string): Promise<AnyRow | null> {
  if (!domain) return null;
  const { data, error } = await client
    .from('live_landings')
    .select('*')
    .eq('custom_domain', domain)
    .eq('status', 'active')
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

async function fetchFakeComments(client: any, landingId: string): Promise<AnyRow[]> {
  const { data, error } = await client
    .from('live_fake_comments')
    .select('*')
    .eq('landing_id', landingId)
    .order('sort_order', { ascending: true })
    .order('at_second', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);
  return data || [];
}

async function publicConfig(client: any, landing: AnyRow): Promise<AnyRow> {
  const fakeComments = await fetchFakeComments(client, landing.id);
  return landingToPublic(landing, fakeComments);
}

function productSnapshot(landing: AnyRow): AnyRow {
  return {
    name: landing.product_name || 'Producto en vivo',
    price: Number(landing.product_price || 0),
    comparePrice: landing.product_compare_price == null ? null : Number(landing.product_compare_price),
    imageUrl: landing.product_image_url || '',
  };
}

function computeTotals(landing: AnyRow, quantity: number, couponCode?: string) {
  const price = Number(landing.product_price || 0);
  const subtotal = price * quantity;
  const expected = cleanText(landing.coupon_code, 60).toUpperCase();
  const given = cleanText(couponCode, 60).toUpperCase();
  const percent = expected && given && expected === given ? Number(landing.coupon_discount_percent || 0) : 0;
  const discount = Math.round((subtotal * Math.min(90, Math.max(0, percent))) / 100);
  const shipping = Number(landing.shipping_price || 0);
  return { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping) };
}

function newOrderRef(): string {
  return `LIVE-${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
}

function parseLandingBody(body: AnyRow, partial: boolean): AnyRow {
  const patch: AnyRow = {};
  const set = (column: string, value: unknown) => {
    if (!partial || value !== undefined) patch[column] = value;
  };
  if (!partial || body.title !== undefined) set('title', cleanText(body.title, 160) || 'Live sin título');
  if (!partial || body.liveLabel !== undefined) set('live_label', cleanText(body.liveLabel, 160) || null);
  if (!partial || body.disclosureText !== undefined) {
    set('disclosure_text', cleanText(body.disclosureText, 120) || 'Transmisión pregrabada');
  }
  if (!partial || body.titleBackground !== undefined) set('title_background', cleanText(body.titleBackground, 40) || '#e898db');
  if (!partial || body.buttonText !== undefined) set('button_text', cleanText(body.buttonText, 60) || '¡COMPRAR!');
  if (!partial || body.buttonColor !== undefined) set('button_color', cleanText(body.buttonColor, 40) || '#e11d48');
  if (!partial || body.productName !== undefined) set('product_name', cleanText(body.productName, 180) || null);
  if (!partial || body.productImageUrl !== undefined) set('product_image_url', cleanText(body.productImageUrl, 1200) || null);
  if (!partial || body.productPrice !== undefined) set('product_price', Math.max(0, cleanNumber(body.productPrice, 0)));
  if (!partial || body.productComparePrice !== undefined) {
    set('product_compare_price', body.productComparePrice === null || body.productComparePrice === '' ? null : Math.max(0, cleanNumber(body.productComparePrice, 0)));
  }
  if (!partial || body.shippingPrice !== undefined) set('shipping_price', Math.max(0, cleanNumber(body.shippingPrice, 0)));
  if (!partial || body.shippingText !== undefined) set('shipping_text', cleanText(body.shippingText, 240) || null);
  if (!partial || body.couponCode !== undefined) set('coupon_code', cleanText(body.couponCode, 60).toUpperCase() || null);
  if (!partial || body.couponDiscountPercent !== undefined) {
    set('coupon_discount_percent', Math.min(90, Math.max(0, cleanNumber(body.couponDiscountPercent, 0))));
  }
  if (!partial || body.allowLoop !== undefined) set('allow_loop', body.allowLoop !== false);
  if (!partial || body.whatsappNumber !== undefined) {
    set('whatsapp_number', String(body.whatsappNumber ?? '').replace(/\D/g, '').slice(0, 20) || null);
  }
  if (!partial || body.whatsappText !== undefined) set('whatsapp_text', cleanText(body.whatsappText, 300) || null);
  if (!partial || body.commentMode !== undefined) {
    set('comment_mode', body.commentMode === 'countdown' ? 'countdown' : 'sequence');
  }
  if (!partial || body.checkoutMode !== undefined) {
    set('checkout_mode', ['crm', 'shopify', 'whatsapp'].includes(body.checkoutMode) ? body.checkoutMode : 'crm');
  }
  if (!partial || body.shopifyUrl !== undefined) {
    set('shopify_url', cleanHttpUrl(body.shopifyUrl) || null);
  }
  if (!partial || body.whatsappLink !== undefined) {
    // Si el usuario pego el link completo de WhatsApp, el link manda: se
    // guarda tal cual y, cuando es wa.me/api.whatsapp.com, numero y mensaje
    // se extraen solos para mostrarlos en el panel y construir el boton.
    const link = cleanHttpUrl(body.whatsappLink);
    patch.whatsapp_link = link || null;
    if (link) {
      const parsed = parseWhatsAppLink(link);
      if (parsed) {
        patch.whatsapp_number = parsed.number;
        if (parsed.text) patch.whatsapp_text = parsed.text;
      }
    }
  }
  if (!partial || body.viewersMin !== undefined) set('viewers_min', cleanInt(body.viewersMin, 40, 0, 100000));
  if (!partial || body.viewersMax !== undefined) set('viewers_max', cleanInt(body.viewersMax, 60, 1, 100000));
  if (!partial || body.status !== undefined) {
    set('status', ['draft', 'active', 'paused', 'archived'].includes(body.status) ? body.status : 'draft');
  }
  const videoRaw = body.videoUrl ?? body.videoId;
  if (!partial || videoRaw !== undefined) {
    const video = extractVideo(videoRaw, body.videoProvider);
    if (video) {
      patch.video_provider = video.provider;
      patch.video_id = video.videoId;
      patch.video_url = video.videoUrl;
    } else if (!partial) {
      patch.video_provider = null;
      patch.video_id = null;
      patch.video_url = null;
    }
  }
  return patch;
}

function sendError(res: Response, err: any) {
  const status = Number(err?.status || 500);
  if (status >= 500) console.error('[LiveSelling]', err?.message || err);
  res.status(status).json({ success: false, error: err?.message || 'Error interno' });
}

type Handler = (req: Request, res: Response) => Promise<void>;
function route(handler: Handler) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err) => sendError(res, err));
  };
}

// ---------------------------------------------------------------------------
// Rutas públicas (sin sesión)
// ---------------------------------------------------------------------------
export function setupLiveSellingPublicRoutes(app: Express): void {
  app.get('/api/public/live/by-host', route(async (req, res) => {
    if (!checkRate(req, res, 'live-get', 180)) return;
    const client = db();
    const host = normalizeDomain(String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]);
    const landing = await fetchLandingByDomain(client, host);
    if (!landing) {
      res.status(404).json({ success: false, error: 'Live no encontrado para este dominio' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, landing: await publicConfig(client, landing) });
  }));

  app.get('/api/public/live/:slug', route(async (req, res) => {
    if (!checkRate(req, res, 'live-get', 180)) return;
    const client = db();
    const landing = await fetchLandingBySlug(client, slugify(req.params.slug), true);
    if (!landing) {
      res.status(404).json({ success: false, error: 'Live no encontrado o no activo' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, landing: await publicConfig(client, landing) });
  }));

  app.post('/api/public/live/:id/comments', route(async (req, res) => {
    if (!checkRate(req, res, 'live-comment', 12)) return;
    const client = db();
    const landing = await fetchLandingByRef(client, req.params.id, true);
    if (!landing) { res.status(404).json({ success: false, error: 'Live no encontrado o no activo' }); return; }
    const content = cleanText(req.body?.content, 500);
    if (!content) { res.status(400).json({ success: false, error: 'El comentario no puede estar vacío' }); return; }
    const phoneRaw = cleanText(req.body?.phone, 30);
    const phone = phoneRaw ? normalizePhoneCO(phoneRaw) : '';
    const { data, error } = await client
      .from('live_visitor_comments')
      .insert({
        landing_id: landing.id,
        tenant_id: landing.tenant_id,
        visitor_id: cleanText(req.body?.visitorId, 80) || null,
        content,
        phone: phone || null,
        utm: cleanUtm(req.body?.utm),
        user_agent: cleanText(req.headers['user-agent'], 400) || null,
      })
      .select('id, created_at')
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, commentId: data.id, createdAt: data.created_at });
  }));

  app.post('/api/public/live/:id/leads', route(async (req, res) => {
    if (!checkRate(req, res, 'live-lead', 20)) return;
    const client = db();
    const landing = await fetchLandingByRef(client, req.params.id, true);
    if (!landing) { res.status(404).json({ success: false, error: 'Live no encontrado o no activo' }); return; }
    const phone = normalizePhoneCO(req.body?.phone);
    if (!phone) { res.status(400).json({ success: false, error: 'WhatsApp colombiano válido requerido' }); return; }
    const quantity = cleanInt(req.body?.quantity, 1, 1, 99);
    const totals = computeTotals(landing, quantity);
    const visitorId = cleanText(req.body?.visitorId, 80) || null;
    const base: AnyRow = {
      landing_id: landing.id,
      tenant_id: landing.tenant_id,
      status: 'lead',
      product_snapshot: productSnapshot(landing),
      product_name: landing.product_name || 'Producto en vivo',
      product_price: Number(landing.product_price || 0),
      quantity,
      subtotal: totals.subtotal,
      discount: 0,
      shipping: totals.shipping,
      total: totals.subtotal + totals.shipping,
      phone,
      visitor_id: visitorId,
      utm: cleanUtm(req.body?.utm),
      user_agent: cleanText(req.headers['user-agent'], 400) || null,
    };

    const leadId = cleanText(req.body?.leadId, 80);
    if (leadId && UUID_RE.test(leadId)) {
      const { data, error } = await client
        .from('live_orders')
        .update(base)
        .eq('id', leadId)
        .eq('landing_id', landing.id)
        .eq('status', 'lead')
        .select('id, order_ref')
        .single();
      if (!error && data) {
        res.json({ success: true, leadId: data.id, orderRef: data.order_ref, status: 'lead' });
        return;
      }
    }
    if (visitorId) {
      const { data: existing } = await client
        .from('live_orders')
        .select('id, order_ref')
        .eq('landing_id', landing.id)
        .eq('visitor_id', visitorId)
        .eq('status', 'lead')
        .order('created_at', { ascending: false })
        .limit(1);
      if (existing?.[0]) {
        const { data, error } = await client
          .from('live_orders')
          .update(base)
          .eq('id', existing[0].id)
          .select('id, order_ref')
          .single();
        if (error) throw new Error(error.message);
        res.json({ success: true, leadId: data.id, orderRef: data.order_ref, status: 'lead' });
        return;
      }
    }
    const { data, error } = await client
      .from('live_orders')
      .insert({ ...base, order_ref: newOrderRef() })
      .select('id, order_ref')
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, leadId: data.id, orderRef: data.order_ref, status: 'lead' });
  }));

  app.post('/api/public/live/:id/orders', route(async (req, res) => {
    if (!checkRate(req, res, 'live-order', 12)) return;
    const client = db();
    const landing = await fetchLandingByRef(client, req.params.id, true);
    if (!landing) { res.status(404).json({ success: false, error: 'Live no encontrado o no activo' }); return; }

    const phone = normalizePhoneCO(req.body?.phone);
    const customerName = cleanText(req.body?.customerName, 140);
    const address = cleanText(req.body?.address, 300);
    const department = cleanText(req.body?.department, 100);
    const city = cleanText(req.body?.city, 100);
    const email = cleanText(req.body?.email, 180);
    if (!customerName) { res.status(400).json({ success: false, error: 'Nombre y apellido requeridos' }); return; }
    if (!phone) { res.status(400).json({ success: false, error: 'WhatsApp colombiano válido requerido' }); return; }
    if (!address || !department || !city) {
      res.status(400).json({ success: false, error: 'Dirección, departamento y ciudad requeridos' });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, error: 'Correo electrónico inválido' });
      return;
    }

    const quantity = cleanInt(req.body?.quantity, 1, 1, 99);
    const couponCode = cleanText(req.body?.couponCode, 60).toUpperCase() || null;
    const totals = computeTotals(landing, quantity, couponCode || undefined);
    const orderData: AnyRow = {
      landing_id: landing.id,
      tenant_id: landing.tenant_id,
      status: 'order',
      product_snapshot: productSnapshot(landing),
      product_name: landing.product_name || 'Producto en vivo',
      product_price: Number(landing.product_price || 0),
      quantity,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      coupon_code: couponCode,
      customer_name: customerName,
      phone,
      address,
      department,
      city,
      email: email || null,
      visitor_id: cleanText(req.body?.visitorId, 80) || null,
      event_id: cleanText(req.body?.eventId, 120) || `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      utm: cleanUtm(req.body?.utm),
      user_agent: cleanText(req.headers['user-agent'], 400) || null,
    };

    const leadId = cleanText(req.body?.leadId, 80);
    if (leadId && UUID_RE.test(leadId)) {
      const { data, error } = await client
        .from('live_orders')
        .update(orderData)
        .eq('id', leadId)
        .eq('landing_id', landing.id)
        .select('id, order_ref, subtotal, discount, shipping, total')
        .single();
      if (!error && data) {
        res.json({ success: true, orderId: data.id, orderRef: data.order_ref, ...totals, status: 'order' });
        return;
      }
    }
    const { data, error } = await client
      .from('live_orders')
      .insert({ ...orderData, order_ref: newOrderRef() })
      .select('id, order_ref')
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, orderId: data.id, orderRef: data.order_ref, ...totals, status: 'order' });
  }));

  app.post('/api/public/live/:id/pageview', route(async (req, res) => {
    if (!checkRate(req, res, 'live-pageview', 120)) return;
    const client = db();
    const landing = await fetchLandingByRef(client, req.params.id, true);
    if (!landing) { res.status(404).json({ success: false, error: 'Live no encontrado o no activo' }); return; }
    const { data, error } = await client
      .from('live_pageviews')
      .insert({
        landing_id: landing.id,
        tenant_id: landing.tenant_id,
        visitor_id: cleanText(req.body?.visitorId, 80) || null,
        utm: cleanUtm(req.body?.utm),
        user_agent: cleanText(req.headers['user-agent'], 400) || null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, pageviewId: data.id });
  }));

  app.post('/api/public/live/:id/checkout-click', route(async (req, res) => {
    if (!checkRate(req, res, 'live-checkout', 60)) return;
    const client = db();
    const landing = await fetchLandingByRef(client, req.params.id, true);
    if (!landing) { res.status(404).json({ success: false, error: 'Live no encontrado o no activo' }); return; }
    const { data, error } = await client
      .from('live_checkout_clicks')
      .insert({
        landing_id: landing.id,
        tenant_id: landing.tenant_id,
        mode: landing.checkout_mode || 'crm',
        visitor_id: cleanText(req.body?.visitorId, 80) || null,
        utm: cleanUtm(req.body?.utm),
        user_agent: cleanText(req.headers['user-agent'], 400) || null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, clickId: data.id });
  }));

  app.post('/api/public/live/:id/whatsapp-click', route(async (req, res) => {
    if (!checkRate(req, res, 'live-wa', 40)) return;
    const client = db();
    const landing = await fetchLandingByRef(client, req.params.id, true);
    if (!landing) { res.status(404).json({ success: false, error: 'Live no encontrado o no activo' }); return; }
    const { data, error } = await client
      .from('live_whatsapp_clicks')
      .insert({
        landing_id: landing.id,
        tenant_id: landing.tenant_id,
        visitor_id: cleanText(req.body?.visitorId, 80) || null,
        utm: cleanUtm(req.body?.utm),
        user_agent: cleanText(req.headers['user-agent'], 400) || null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, clickId: data.id });
  }));

  // Página pública del vivo por slug.
  app.get('/live/:slug', route(async (req, res) => {
    const client = db();
    const landing = await fetchLandingBySlug(client, slugify(req.params.slug), true);
    if (!landing) {
      res.status(404).type('html').send('<!doctype html><html lang="es"><body style="background:#000;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Este live no está disponible.</body></html>');
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(renderLivePage(landing.slug));
  }));

  // Resolución por Host en la raíz: dominios propios registrados y
  // subdominios de plataforma (<slug>.<dominio-plataforma>). Un Host que no
  // sea principal, no tenga landing activa y no sea IP/local recibe 404 en
  // la raíz en vez de la SPA del CRM.
  app.get('/', (req, res, next) => {
    (async () => {
      const host = requestHost(req);
      if (isMainHost(host)) { next(); return; }
      const client = db();
      const byDomain = await fetchLandingByDomain(client, host);
      if (byDomain) {
        res.setHeader('Cache-Control', 'no-store');
        res.type('html').send(renderLivePage(byDomain.slug));
        return;
      }
      const subdomainSlug = platformSubdomainSlug(host);
      if (subdomainSlug) {
        const bySlug = await fetchLandingBySlug(client, subdomainSlug, true);
        if (bySlug) {
          res.setHeader('Cache-Control', 'no-store');
          res.type('html').send(renderLivePage(bySlug.slug));
          return;
        }
      }
      res.status(404).type('html').send('<!doctype html><html lang="es"><body style="background:#000;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Dominio no conectado.</body></html>');
    })().catch(next);
  });

  // Bajo un dominio propio o subdominio de plataforma solo se sirven la
  // pagina del vivo y su API publica; cualquier otra ruta es 404 (la SPA y
  // el panel del CRM no se exponen bajo dominios de clientes).
  app.use((req, res, next) => {
    const host = requestHost(req);
    if (isMainHost(host)) { next(); return; }
    if (req.path === '/' || req.path.startsWith('/live/') || req.path.startsWith('/api/public/')) { next(); return; }
    res.status(404).json({ success: false, error: 'No encontrado' });
  });
}

// ---------------------------------------------------------------------------
// Rutas del panel CRM (después del middleware de sesión)
// ---------------------------------------------------------------------------
export function setupLiveSellingAdminRoutes(app: Express): void {
  const listLandings = route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    const { data, error } = await client
      .from('live_landings')
      .select('*')
      .eq('tenant_id', tenant)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const landings = await Promise.all((data || []).map(async (row: AnyRow) => {
      const [fakeCount, visits, leads, orders, clicks] = await Promise.all([
        client.from('live_fake_comments').select('id', { count: 'exact', head: true }).eq('landing_id', row.id),
        client.from('live_visitor_comments').select('id', { count: 'exact', head: true }).eq('landing_id', row.id),
        client.from('live_orders').select('id', { count: 'exact', head: true }).eq('landing_id', row.id).eq('status', 'lead'),
        client.from('live_orders').select('id', { count: 'exact', head: true }).eq('landing_id', row.id).neq('status', 'lead'),
        client.from('live_whatsapp_clicks').select('id', { count: 'exact', head: true }).eq('landing_id', row.id),
      ]);
      return {
        ...landingToAdmin(row),
        counts: {
          fakeComments: fakeCount.count || 0,
          visitorComments: visits.count || 0,
          leads: leads.count || 0,
          orders: orders.count || 0,
          whatsappClicks: clicks.count || 0,
        },
      };
    }));
    res.json({ success: true, landings });
  });

  app.get('/api/live-selling/landings', listLandings);

  app.get('/api/live-selling/metrics', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    const days = cleanInt(req.query.days, 30, 0, 3650);
    const since = days > 0 ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

    const countFor = async (table: string, landingId?: string, extra?: (q: any) => any) => {
      let query = client.from(table).select('id', { count: 'exact', head: true }).eq('tenant_id', tenant);
      if (landingId) query = query.eq('landing_id', landingId);
      if (since) query = query.gte('created_at', since);
      if (extra) query = extra(query);
      const { count, error } = await query;
      if (error) throw new Error(error.message);
      return count || 0;
    };

    const { data: landingRows, error: landingsError } = await client
      .from('live_landings')
      .select('id, slug, title, status')
      .eq('tenant_id', tenant)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (landingsError) throw new Error(landingsError.message);

    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

    const landings = await Promise.all((landingRows || []).map(async (row: AnyRow) => {
      const [pageviews, whatsappClicks, checkoutClicks, visitorComments, leads, orders] = await Promise.all([
        countFor('live_pageviews', row.id),
        countFor('live_whatsapp_clicks', row.id),
        countFor('live_checkout_clicks', row.id),
        countFor('live_visitor_comments', row.id),
        countFor('live_orders', row.id, (q) => q.eq('status', 'lead')),
        countFor('live_orders', row.id, (q) => q.neq('status', 'lead')),
      ]);
      return {
        landingId: row.id, slug: row.slug, title: row.title, status: row.status,
        pageviews, whatsappClicks, checkoutClicks, visitorComments, leads, orders,
        leadConversion: pct(leads, pageviews),
        orderConversion: pct(orders, pageviews),
      };
    }));

    const [tPageviews, tWa, tCheckout, tComments, tLeads, tOrders] = await Promise.all([
      countFor('live_pageviews'),
      countFor('live_whatsapp_clicks'),
      countFor('live_checkout_clicks'),
      countFor('live_visitor_comments'),
      countFor('live_orders', undefined, (q) => q.eq('status', 'lead')),
      countFor('live_orders', undefined, (q) => q.neq('status', 'lead')),
    ]);

    res.json({
      success: true,
      days,
      totals: {
        pageviews: tPageviews, whatsappClicks: tWa, checkoutClicks: tCheckout,
        visitorComments: tComments, leads: tLeads, orders: tOrders,
        leadConversion: pct(tLeads, tPageviews),
        orderConversion: pct(tOrders, tPageviews),
      },
      landings,
    });
  }));

  app.post('/api/live-selling/landings', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    const patch = parseLandingBody(req.body || {}, false);
    let slug = slugify(req.body?.slug || req.body?.title || patch.title || 'live');
    if (!slug) slug = `live-${Date.now().toString(36)}`;
    const domain = req.body?.customDomain !== undefined ? normalizeDomain(req.body.customDomain) : '';
    if (req.body?.customDomain && !domain) {
      res.status(400).json({ success: false, error: 'Dominio propio inválido' });
      return;
    }
    const { data: slugTaken } = await client.from('live_landings').select('id').eq('slug', slug).limit(1);
    if (slugTaken?.length) {
      res.status(409).json({ success: false, error: `El slug "${slug}" ya está en uso` });
      return;
    }
    if (domain) {
      const { data: domainTaken } = await client.from('live_landings').select('id').eq('custom_domain', domain).limit(1);
      if (domainTaken?.length) {
        res.status(409).json({ success: false, error: 'Ese dominio ya está asignado a otra landing' });
        return;
      }
    }
    const { data, error } = await client
      .from('live_landings')
      .insert({
        ...patch,
        tenant_id: tenant,
        slug,
        custom_domain: domain || null,
        domain_status: domain ? 'pending' : 'not_configured',
        created_by: cleanText((req as any).authUser?.email || (req as any).authUser?.sub, 160) || null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    if (Array.isArray(req.body?.fakeComments) && req.body.fakeComments.length) {
      const rows = sanitizeFakeComments(req.body.fakeComments, data.id, tenant);
      if (rows.length) {
        const { error: fakeError } = await client.from('live_fake_comments').insert(rows);
        if (fakeError) throw new Error(fakeError.message);
      }
    }
    res.status(201).json({ success: true, landing: landingToAdmin(data) });
  }));

  app.get('/api/live-selling/landings/:id', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data, error } = await client
      .from('live_landings')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .single();
    if (error || !data) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }

    const [fakeComments, visitorComments, orders] = await Promise.all([
      fetchFakeComments(client, data.id),
      client.from('live_visitor_comments').select('*').eq('landing_id', data.id).order('created_at', { ascending: false }).limit(200),
      client.from('live_orders').select('*').eq('landing_id', data.id).order('created_at', { ascending: false }).limit(200),
    ]);
    if (visitorComments.error) throw new Error(visitorComments.error.message);
    if (orders.error) throw new Error(orders.error.message);

    res.json({
      success: true,
      landing: landingToAdmin(data),
      fakeComments: fakeComments.map((c) => ({
        id: c.id,
        author: c.author,
        content: c.content,
        avatarUrl: c.avatar_url || '',
        second: c.at_second == null ? null : Number(c.at_second),
        sortOrder: Number(c.sort_order || 0),
      })),
      visitorComments: (visitorComments.data || []).map((c: AnyRow) => ({
        id: c.id, content: c.content, phone: c.phone || '', visitorId: c.visitor_id || '',
        utm: c.utm || {}, createdAt: c.created_at,
      })),
      orders: (orders.data || []).map((o: AnyRow) => ({
        id: o.id, orderRef: o.order_ref, status: o.status, productName: o.product_name || '',
        quantity: Number(o.quantity || 1), subtotal: Number(o.subtotal || 0), discount: Number(o.discount || 0),
        shipping: Number(o.shipping || 0), total: Number(o.total || 0), couponCode: o.coupon_code || '',
        customerName: o.customer_name || '', phone: o.phone || '', address: o.address || '',
        department: o.department || '', city: o.city || '', email: o.email || '',
        utm: o.utm || {}, createdAt: o.created_at,
      })),
    });
  }));

  app.patch('/api/live-selling/landings/:id', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data: current, error: readError } = await client
      .from('live_landings')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .single();
    if (readError || !current) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }

    const patch = parseLandingBody(req.body || {}, true);
    if (req.body?.slug !== undefined) {
      const slug = slugify(req.body.slug);
      if (!slug) { res.status(400).json({ success: false, error: 'Slug inválido' }); return; }
      if (slug !== current.slug) {
        const { data: taken } = await client.from('live_landings').select('id').eq('slug', slug).neq('id', current.id).limit(1);
        if (taken?.length) { res.status(409).json({ success: false, error: `El slug "${slug}" ya está en uso` }); return; }
      }
      patch.slug = slug;
    }
    if (req.body?.customDomain !== undefined) {
      const domain = normalizeDomain(req.body.customDomain);
      if (req.body.customDomain && !domain) { res.status(400).json({ success: false, error: 'Dominio propio inválido' }); return; }
      if (domain && domain !== current.custom_domain) {
        const { data: taken } = await client.from('live_landings').select('id').eq('custom_domain', domain).neq('id', current.id).limit(1);
        if (taken?.length) { res.status(409).json({ success: false, error: 'Ese dominio ya está asignado a otra landing' }); return; }
      }
      patch.custom_domain = domain || null;
      patch.domain_verified = false;
      patch.domain_verified_at = null;
      patch.domain_status = domain ? 'pending' : 'not_configured';
      patch.domain_check = {};
    }

    const { data, error } = await client
      .from('live_landings')
      .update(patch)
      .eq('id', current.id)
      .eq('tenant_id', tenant)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    res.json({ success: true, landing: landingToAdmin(data) });
  }));

  app.post('/api/live-selling/landings/:id/duplicate', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data: source, error } = await client
      .from('live_landings')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .single();
    if (error || !source) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }

    let slug = `${source.slug}-copia`;
    for (let attempt = 2; attempt < 50; attempt += 1) {
      const { data: taken } = await client.from('live_landings').select('id').eq('slug', slug).limit(1);
      if (!taken?.length) break;
      slug = `${source.slug}-copia-${attempt}`;
    }
    const copy: AnyRow = { ...source };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy.slug = slug;
    copy.title = `${source.title} (copia)`.slice(0, 160);
    copy.status = 'draft';
    copy.custom_domain = null;
    copy.domain_verified = false;
    copy.domain_status = 'not_configured';
    copy.domain_verified_at = null;
    copy.domain_check = {};
    const { data, error: insertError } = await client.from('live_landings').insert(copy).select('*').single();
    if (insertError) throw new Error(insertError.message);

    const fakeComments = await fetchFakeComments(client, source.id);
    if (fakeComments.length) {
      const rows = fakeComments.map((c, index) => ({
        landing_id: data.id,
        tenant_id: tenant,
        author: c.author,
        content: c.content,
        avatar_url: c.avatar_url || null,
        at_second: c.at_second,
        sort_order: Number(c.sort_order ?? index),
      }));
      const { error: fakeError } = await client.from('live_fake_comments').insert(rows);
      if (fakeError) throw new Error(fakeError.message);
    }
    res.status(201).json({ success: true, landing: landingToAdmin(data) });
  }));

  app.delete('/api/live-selling/landings/:id', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data, error } = await client
      .from('live_landings')
      .update({ status: 'archived' })
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .select('id')
      .single();
    if (error || !data) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    res.json({ success: true, archived: true });
  }));

  app.put('/api/live-selling/landings/:id/fake-comments', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data: landing, error } = await client
      .from('live_landings')
      .select('id')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .single();
    if (error || !landing) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const rows = sanitizeFakeComments(req.body?.comments, landing.id, tenant);
    const { error: deleteError } = await client.from('live_fake_comments').delete().eq('landing_id', landing.id);
    if (deleteError) throw new Error(deleteError.message);
    if (rows.length) {
      const { error: insertError } = await client.from('live_fake_comments').insert(rows);
      if (insertError) throw new Error(insertError.message);
    }
    const saved = await fetchFakeComments(client, landing.id);
    res.json({
      success: true,
      fakeComments: saved.map((c) => ({
        id: c.id, author: c.author, content: c.content, avatarUrl: c.avatar_url || '',
        second: c.at_second == null ? null : Number(c.at_second), sortOrder: Number(c.sort_order || 0),
      })),
    });
  }));

  app.get('/api/live-selling/landings/:id/visitor-comments', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data, error } = await client
      .from('live_visitor_comments')
      .select('*')
      .eq('landing_id', req.params.id)
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    res.json({ success: true, visitorComments: data || [] });
  }));

  app.get('/api/live-selling/landings/:id/orders', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    let query = client
      .from('live_orders')
      .select('*')
      .eq('landing_id', req.params.id)
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false })
      .limit(200);
    const status = cleanText(req.query.status, 30);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ success: true, orders: data || [] });
  }));

  app.patch('/api/live-selling/orders/:id/status', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Pedido no encontrado' }); return; }
    const status = cleanText(req.body?.status, 30);
    if (!['lead', 'order', 'confirmed', 'ready', 'delivered', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, error: 'Estado inválido' });
      return;
    }
    const { data, error } = await client
      .from('live_orders')
      .update({ status })
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .select('id, status')
      .single();
    if (error || !data) { res.status(404).json({ success: false, error: 'Pedido no encontrado' }); return; }
    res.json({ success: true, order: data });
  }));

  app.post('/api/live-selling/landings/:id/verify-domain', route(async (req, res) => {
    const client = db();
    const tenant = tenantId(req);
    if (!UUID_RE.test(req.params.id)) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }
    const { data: landing, error } = await client
      .from('live_landings')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenant)
      .single();
    if (error || !landing) { res.status(404).json({ success: false, error: 'Landing no encontrada' }); return; }

    const domain = normalizeDomain(req.body?.domain ?? landing.custom_domain);
    if (!domain) { res.status(400).json({ success: false, error: 'Dominio requerido' }); return; }
    const target = normalizeDomain(process.env.LIVE_LANDING_CNAME_TARGET || 'crm.xorbit360.com') || 'crm.xorbit360.com';

    const lookup = async (name: string, type: string) => {
      try {
        const response = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        const json: any = await response.json();
        return (json?.Answer || []).map((a: any) => String(a.data || '').replace(/\.$/, '').toLowerCase());
      } catch {
        return [] as string[];
      }
    };

    const [cname, a, aaaa, targetA, targetAaaa] = await Promise.all([
      lookup(domain, 'CNAME'),
      lookup(domain, 'A'),
      lookup(domain, 'AAAA'),
      lookup(target, 'A'),
      lookup(target, 'AAAA'),
    ]);
    const cnameMatch = cname.some((value: string) => value === target || value.endsWith(`.${target}`));
    const addressMatch = [...a, ...aaaa].some((value: string) => [...targetA, ...targetAaaa].includes(value));
    const verified = cnameMatch || addressMatch;
    const check = {
      domain,
      target,
      cname,
      a,
      aaaa,
      cnameMatch,
      addressMatch,
      checkedAt: new Date().toISOString(),
      instructions: `En tu proveedor de DNS (Namecheap, GoDaddy, Hostinger, Cloudflare, etc.) crea un CNAME de ${domain} hacia ${target}, o un registro A a 2.25.221.151. La raíz del dominio no admite CNAME en la mayoría de proveedores: usa un subdominio como live.${domain}.`,
      tls: 'El certificado HTTPS se emite automáticamente cuando el dominio apunta al servidor (puede tardar unos minutos en el primer acceso). Sin dominio propio, tu landing ya vende con el link de la plataforma /live/<slug>. Para subdominios de la plataforma (<slug>.xorbit360.com) aún falta crear en Namecheap el registro comodín * -> 2.25.221.151.',
    };

    const { data, error: updateError } = await client
      .from('live_landings')
      .update({
        custom_domain: domain,
        domain_verified: verified,
        domain_status: verified ? 'verified' : 'pending',
        domain_verified_at: verified ? new Date().toISOString() : null,
        domain_check: check,
      })
      .eq('id', landing.id)
      .eq('tenant_id', tenant)
      .select('*')
      .single();
    if (updateError) throw new Error(updateError.message);

    res.json({
      success: true,
      verified,
      target,
      records: { cname, a, aaaa },
      instructions: check.instructions,
      tls: check.tls,
      landing: landingToAdmin(data),
    });
  }));
}

function sanitizeFakeComments(input: unknown, landingId: string, tenant: string): AnyRow[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 500).flatMap((item: any, index: number) => {
    const author = cleanText(item?.author, 80);
    const content = cleanText(item?.content, 500);
    if (!author || !content) return [];
    const avatar = cleanText(item?.avatarUrl ?? item?.avatar_url, 1200);
    const secondRaw = item?.second ?? item?.at_second;
    const second = secondRaw === null || secondRaw === undefined || secondRaw === ''
      ? null
      : cleanInt(secondRaw, 0, 0, 86400);
    return [{
      landing_id: landingId,
      tenant_id: tenant,
      author,
      content,
      avatar_url: avatar.startsWith('http') ? avatar : null,
      at_second: second,
      sort_order: cleanInt(item?.sortOrder ?? item?.sort_order, index, 0, 100000),
    }];
  });
}
