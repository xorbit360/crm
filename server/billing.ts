/**
 * billing.ts — Facturación freemium de Xorbit 360 (2026-10-16).
 *
 * Modelo:
 * - Registro gratis → plan 'free' (view-only).
 * - POST /api/billing/activate-plan {planId, couponCode?} → orden Bold SOLO del plan (sin canal).
 * - POST /api/billing/buy-channel                       → orden Bold $10 USD/mes por canal (aparte del plan).
 * - El canal queda activo solo mientras el pago esté vigente; si vence/falla se
 *   suspende automáticamente (status='suspended' + desconexión del proveedor).
 * - Llamadas y videos se compran SUELTOS sin necesidad de plan (verifica que el
 *   flujo Bold de recargas no exija plan: /api/integrations/bold/create-payment es genérico).
 * - requirePaidPlan: middleware que responde 402 si el usuario es plan 'free'.
 *
 * Webhook Bold: las órdenes PLAN-* y CHAN-* se procesan en onPaymentApproved
 * (ver server.ts). Órdenes REG-* legacy siguen usando activateUserForBoldOrder.
 *
 * Radar de Anuncios (producto aparte, 2026-10-16):
 * - Suscripción mensual INDEPENDIENTE del plan: usuarios free también pueden comprarla.
 * - GET  /api/billing/radar-tiers    (público) → catálogo de tiers.
 * - POST /api/billing/subscribe-radar {tierId} → orden Bold RADAR-* ($19/$49/$119 USD).
 * - Webhook Bold: activateRadarForBoldOrder (server.ts → onPaymentApproved).
 * - Helpers para server/radar.ts: getRadarTier, consumeRadarSearch, getRadarAlertLimit.
 * - suspendExpiredRadar: enganchar en el cron diario (server/cron/inactiveCleanup.ts).
 */
import type { Express, Request, Response, NextFunction } from 'express';
import { getSession } from './auth.ts';
import { PAID_PLANS, CHANNEL_PRICE_COP, CHANNEL_PRICE_USD } from './authPublic.ts';
import { BOLD_PRODUCTION_CONFIG, calculateBoldIntegritySignature } from './bold.ts';

export const CHANNEL_SUBSCRIPTION_DAYS = 30;

/** Cupones vigentes para activación de plan. */
const COUPONS: Record<string, { discountPct: number; label: string }> = {
  EFFIX2026: { discountPct: 20, label: 'Feria Effix 2026 — 20% OFF primer mes' },
};

/** Vigencia de la suscripción del Radar de Anuncios: 30 días. */
export const RADAR_SUBSCRIPTION_DAYS = 30;

/** Cuota diaria "ilimitada" del Radar Élite (número grande en vez de Infinity para JSON). */
export const RADAR_UNLIMITED = 999999;

export interface RadarTier {
  id: 'basico' | 'pro' | 'elite';
  name: string;
  priceUsd: number;
  priceCop: number;
  searchesPerDay: number;
  alerts: number;
  features: string[];
}

/**
 * Tiers del Radar de Anuncios. Suscripción APARTE del plan (producto independiente:
 * un usuario free puede comprarla sin plan pago). Tasa ~4000 COP/USD.
 */
export const RADAR_TIERS: RadarTier[] = [
  {
    id: 'basico',
    name: 'Radar Básico',
    priceUsd: 19,
    priceCop: 76000,
    searchesPerDay: 100,
    alerts: 3,
    features: ['100 búsquedas/día', '3 alertas WhatsApp', 'Meta + TikTok + Google'],
  },
  {
    id: 'pro',
    name: 'Radar Pro',
    priceUsd: 49,
    priceCop: 196000,
    searchesPerDay: 500,
    alerts: 15,
    features: ['500 búsquedas/día', 'Análisis profundo con IA', '15 alertas WhatsApp'],
  },
  {
    id: 'elite',
    name: 'Radar Élite',
    priceUsd: 119,
    priceCop: 476000,
    searchesPerDay: RADAR_UNLIMITED,
    alerts: RADAR_UNLIMITED,
    features: ['Búsquedas ilimitadas', 'Alertas ilimitadas', 'Todo el análisis IA'],
  },
];

function findRadarTier(tierId: string): RadarTier | null {
  return RADAR_TIERS.find((t) => t.id === String(tierId || '').trim().toLowerCase()) || null;
}

/** Clave de día YYYY-MM-DD (UTC) para la cuota diaria del Radar. */
function radarTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ¿El tier del usuario está vigente (radarTierExpiresAt > ahora)? */
function isRadarTierActive(user: any): boolean {
  if (!user) return false;
  const tier = findRadarTier(String(user.radarTier || ''));
  if (!tier) return false;
  const expiresAt = user.radarTierExpiresAt ? new Date(user.radarTierExpiresAt).getTime() : 0;
  return expiresAt > Date.now();
}

/** Contador de búsquedas consumidas hoy por el usuario (db.radarQuota). */
function getRadarSearchCountToday(db: any, userEmail: string): number {
  const quota = db?.radarQuota;
  if (!quota || quota.date !== radarTodayKey()) return 0;
  const norm = String(userEmail || '').toLowerCase();
  return Number(quota.counts?.[norm] || 0);
}

function findUserByEmail(db: any, email: string): any | null {
  const users: any[] = Array.isArray(db?.users) ? db.users : [];
  const norm = String(email || '').trim().toLowerCase();
  return users.find((u: any) => String(u.email || '').trim().toLowerCase() === norm) || null;
}

function isFreeUser(user: any): boolean {
  if (!user) return true;
  const planId = String(user.planId || '').trim().toLowerCase();
  const plan = String(user.plan || '').trim().toLowerCase();
  return planId === 'free' || plan === 'free' || plan === 'gratuito';
}

/**
 * Middleware paywall: bloquea con 402 a usuarios del plan gratuito en
 * endpoints que generan costo o mutan estado (conectar canal, llamadas, videos...).
 * Superadmin/admin siempre pasan.
 */
export function requirePaidPlan(getDB: () => any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ success: false, error: 'Sesión requerida' });
      return;
    }
    if (['superadmin', 'admin'].includes(String(session.role || ''))) {
      next();
      return;
    }
    const user = findUserByEmail(getDB(), session.email || '');
    if (isFreeUser(user)) {
      res.status(402).json({
        success: false,
        paywall: true,
        error: 'Esta función requiere un plan activo. Activa tu plan para continuar.',
      });
      return;
    }
    next();
  };
}

/** ¿El usuario autenticado es gratuito? (para que el frontend muestre banner/modal) */
export function isSessionFree(getDB: () => any, req: Request): boolean {
  const session = getSession(req);
  if (!session) return true;
  if (['superadmin', 'admin'].includes(String(session.role || ''))) return false;
  return isFreeUser(findUserByEmail(getDB(), session.email || ''));
}

function boldReady(): boolean {
  return Boolean(BOLD_PRODUCTION_CONFIG.merchantId && BOLD_PRODUCTION_CONFIG.apiKey && BOLD_PRODUCTION_CONFIG.secretKey);
}

function buildBoldOrder(orderId: string, amountCop: number, description: string, redirectionView: string) {
  const currency = 'COP';
  const signature = calculateBoldIntegritySignature(orderId, amountCop, currency, BOLD_PRODUCTION_CONFIG.secretKey);
  return {
    merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
    apiKey: BOLD_PRODUCTION_CONFIG.apiKey,
    orderId,
    amount: String(amountCop),
    currency,
    integritySignature: signature,
    description,
    redirectionUrl: `https://crm.xorbit360.com/?view=${redirectionView}&payment_status=completed&order=${orderId}`,
    renderMode: 'embedded',
  };
}

export function setupBillingRoutes(app: Express, getDB: () => any, saveDB: (db: any) => void) {
  // ¿Soy usuario gratuito? (el frontend lo usa para banner + interceptar acciones)
  app.get('/api/billing/me', (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });
    const user = findUserByEmail(getDB(), session.email || '');
    res.json({
      success: true,
      free: isFreeUser(user),
      plan: user?.plan || 'Gratuito',
      planId: user?.planId || 'free',
      channelPriceUsd: CHANNEL_PRICE_USD,
      radar: {
        tier: getRadarTier(getDB, session.email || ''),
        active: user ? isRadarTierActive(user) : false,
        searchesLeftToday: getRadarSearchesLeft(getDB, session.email || ''),
      },
    });
  });

  // Catálogo de tiers del Radar de Anuncios (PÚBLICO: el upsell lo muestra sin sesión).
  app.get('/api/billing/radar-tiers', (_req: Request, res: Response) => {
    return res.json({ success: true, tiers: RADAR_TIERS });
  });

  // Crear orden Bold para suscribirse al Radar de Anuncios (producto APARTE del plan;
  // NO exige plan pago: usuarios free también pueden comprarlo).
  app.post('/api/billing/subscribe-radar', async (req: Request, res: Response) => {
    try {
      const session = getSession(req);
      if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });
      if (!boldReady()) return res.status(503).json({ success: false, error: 'La pasarela de pagos no está configurada. Inténtalo más tarde.' });

      const { tierId } = req.body || {};
      const tier = findRadarTier(String(tierId || ''));
      if (!tier) return res.status(400).json({ success: false, error: 'Selecciona un plan del Radar válido.' });

      const user = findUserByEmail(getDB(), session.email || '');
      if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

      const orderId = `RADAR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const description = `Xorbit 360 - ${tier.name} mensual`;

      const db = getDB();
      if (!Array.isArray(db.radarOrders)) db.radarOrders = [];
      db.radarOrders.unshift({
        orderId,
        userEmail: String(user.email).toLowerCase(),
        tierId: tier.id,
        amountCop: tier.priceCop,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      saveDB(db);

      return res.json({
        success: true,
        orderId,
        tier,
        bold: buildBoldOrder(orderId, tier.priceCop, description, 'radar'),
      });
    } catch (err: any) {
      console.error('[Billing] Error en subscribe-radar:', err);
      return res.status(500).json({ success: false, error: 'Error interno. Inténtalo de nuevo.' });
    }
  });

  // Crear orden Bold para ACTIVAR un plan (sin canal). Cupón EFFIX2026 = 20% OFF primer mes.
  app.post('/api/billing/activate-plan', async (req: Request, res: Response) => {
    try {
      const session = getSession(req);
      if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });
      if (!boldReady()) return res.status(503).json({ success: false, error: 'La pasarela de pagos no está configurada. Inténtalo más tarde.' });

      const { planId } = req.body || {};
      const plan = PAID_PLANS.find((p) => p.id === String(planId || '').trim().toLowerCase());
      if (!plan) return res.status(400).json({ success: false, error: 'Selecciona un plan válido.' });

      const user = findUserByEmail(getDB(), session.email || '');
      if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      if (!isFreeUser(user)) {
        return res.status(400).json({ success: false, error: `Ya tienes el plan ${user.plan} activo.` });
      }

      // Cupón EFFIX2026: SOLO para usuarios de Feria Effix (referralCode === 'EFFIX2026').
      // Se aplica automáticamente; NO hay campo visible de cupón para no incentivar su uso general.
      let discountPct = 0;
      let appliedCoupon = '';
      const userReferral = String((user as any).referralCode || '').trim().toUpperCase();
      if (userReferral === 'EFFIX2026' && COUPONS['EFFIX2026'] && !(user as any).couponUsed) {
        discountPct = COUPONS['EFFIX2026'].discountPct;
        appliedCoupon = 'EFFIX2026';
      }

      const baseAmount = plan.priceCop;
      const amount = discountPct > 0 ? Math.round(baseAmount * (1 - discountPct / 100)) : baseAmount;
      const orderId = `PLAN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const description = `Xorbit 360 - Plan ${plan.name} mensual${appliedCoupon ? ` (Cupón ${appliedCoupon} -${discountPct}%)` : ''}`;

      user.pendingPlanOrderId = orderId;
      user.pendingPlanId = plan.id;
      if (appliedCoupon) {
        user.couponUsed = appliedCoupon;
        user.couponDiscountPct = discountPct;
      }
      saveDB(getDB());

      return res.json({
        success: true,
        orderId,
        plan: { id: plan.id, name: plan.name, priceUsd: plan.priceUsd, priceCop: plan.priceCop },
        coupon: appliedCoupon ? { code: appliedCoupon, discountPct, finalAmount: amount } : null,
        bold: buildBoldOrder(orderId, amount, description, 'billing'),
      });
    } catch (err: any) {
      console.error('[Billing] Error en activate-plan:', err);
      return res.status(500).json({ success: false, error: 'Error interno. Inténtalo de nuevo.' });
    }
  });

  // Crear orden Bold para comprar UN canal ($10 USD/mes, aparte del plan).
  app.post('/api/billing/buy-channel', async (req: Request, res: Response) => {
    try {
      const session = getSession(req);
      if (!session) return res.status(401).json({ success: false, error: 'Sesión requerida' });
      if (!boldReady()) return res.status(503).json({ success: false, error: 'La pasarela de pagos no está configurada. Inténtalo más tarde.' });

      const user = findUserByEmail(getDB(), session.email || '');
      if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
      if (isFreeUser(user)) {
        return res.status(402).json({ success: false, paywall: true, error: 'Activa tu plan antes de comprar un canal.' });
      }

      const orderId = `CHAN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const description = `Xorbit 360 - Canal WhatsApp mensual ($${CHANNEL_PRICE_USD} USD)`;

      const db = getDB();
      if (!Array.isArray(db.channelOrders)) db.channelOrders = [];
      db.channelOrders.unshift({
        orderId, userEmail: String(user.email).toLowerCase(),
        amountCop: CHANNEL_PRICE_COP, status: 'PENDING', createdAt: new Date().toISOString(),
      });
      saveDB(db);

      return res.json({
        success: true,
        orderId,
        channel: { priceUsd: CHANNEL_PRICE_USD, priceCop: CHANNEL_PRICE_COP, days: CHANNEL_SUBSCRIPTION_DAYS },
        bold: buildBoldOrder(orderId, CHANNEL_PRICE_COP, description, 'billing'),
      });
    } catch (err: any) {
      console.error('[Billing] Error en buy-channel:', err);
      return res.status(500).json({ success: false, error: 'Error interno. Inténtalo de nuevo.' });
    }
  });

  // Estado de una orden PLAN-* o CHAN-* (el frontend lo sondea tras el pago)
  app.get('/api/billing/order-status', async (req: Request, res: Response) => {
    try {
      const orderId = String(req.query.orderId || '').trim();
      if (!orderId) return res.status(400).json({ success: false, error: 'Falta orderId.' });
      const db = getDB();
      const txs: any[] = Array.isArray(db.boldTransactions) ? db.boldTransactions : [];
      const tx = txs.find((t: any) => String(t.orderId) === orderId);
      const status = String(tx?.status || 'PENDING').toUpperCase();
      const approved = status.includes('APPROV') || status === 'PAID' || status === 'SUCCESS';
      return res.json({ success: true, approved, status });
    } catch {
      return res.status(500).json({ success: false, error: 'Error consultando el pago.' });
    }
  });
}

/**
 * Webhook Bold: activa el plan del usuario cuando se aprueba una orden PLAN-*.
 * Llamar desde onPaymentApproved en server.ts.
 */
export function activatePlanForBoldOrder(getDB: () => any, saveDB: (db: any) => void, orderId: string): boolean {
  try {
    if (!String(orderId || '').startsWith('PLAN-')) return false;
    const db = getDB();
    const users: any[] = Array.isArray(db.users) ? db.users : [];
    const user = users.find((u: any) => String(u.pendingPlanOrderId || '') === String(orderId));
    if (!user) return false;
    const plan = PAID_PLANS.find((p) => p.id === String(user.pendingPlanId || '').toLowerCase());
    if (!plan) return false;
    user.plan = plan.name;
    user.planId = plan.id;
    user.planActivatedAt = new Date().toISOString();
    delete user.pendingPlanOrderId;
    delete user.pendingPlanId;
    saveDB(db);
    console.log(`[Billing] Plan activado por pago Bold: ${user.email} → ${plan.name} (${orderId})`);
    return true;
  } catch (err) {
    console.warn('[Billing] Error activando plan:', err);
    return false;
  }
}

/**
 * Webhook Bold: activa la suscripción del canal cuando se aprueba una orden CHAN-*.
 * El canal queda vigente CHANNEL_SUBSCRIPTION_DAYS días.
 */
export function activateChannelForBoldOrder(getDB: () => any, saveDB: (db: any) => void, orderId: string): boolean {
  try {
    if (!String(orderId || '').startsWith('CHAN-')) return false;
    const db = getDB();
    const orders: any[] = Array.isArray(db.channelOrders) ? db.channelOrders : [];
    const order = orders.find((o: any) => String(o.orderId) === String(orderId));
    if (!order || order.status === 'ACTIVE') return false;
    const expiresAt = new Date(Date.now() + CHANNEL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    order.status = 'ACTIVE';
    order.activatedAt = new Date().toISOString();
    order.expiresAt = expiresAt;
    if (!Array.isArray(db.channelSubscriptions)) db.channelSubscriptions = [];
    db.channelSubscriptions.unshift({
      id: `chsub-${Date.now()}`,
      userEmail: String(order.userEmail).toLowerCase(),
      orderId, status: 'active', activatedAt: order.activatedAt, expiresAt,
    });
    saveDB(db);
    console.log(`[Billing] Canal activado por pago Bold: ${order.userEmail} (${orderId}, vence ${expiresAt})`);
    return true;
  } catch (err) {
    console.warn('[Billing] Error activando canal:', err);
    return false;
  }
}

/**
 * Suspende suscripciones de canal vencidas.
 *
 * DÓNDE ENGANCHAR:
 * 1. Webhook Bold (server.ts → onPaymentApproved): si llega un evento de
 *    pago fallido/reembolsado asociado a una orden CHAN-*, llamar
 *    suspendChannelSubscription(getDB, saveDB, orderId, 'pago-fallido').
 * 2. Cron diario (server/cron/channelBilling.ts o el cron de limpieza):
 *    llamar suspendExpiredChannels() una vez al día.
 *
 * Al suspender: marca status='suspended' y desconecta el canal del proveedor
 * (Evolution API logout + cierre de socket) para que no siga generando costo.
 */
export function suspendExpiredChannels(
  getDB: () => any,
  saveDB: (db: any) => void,
  disconnectChannel?: (userEmail: string) => Promise<void> | void,
): string[] {
  const suspended: string[] = [];
  try {
    const db = getDB();
    const subs: any[] = Array.isArray(db.channelSubscriptions) ? db.channelSubscriptions : [];
    const now = Date.now();
    let changed = false;
    for (const sub of subs) {
      if (String(sub.status) !== 'active') continue;
      if (sub.expiresAt && new Date(sub.expiresAt).getTime() > now) continue;
      sub.status = 'suspended';
      sub.suspendedAt = new Date().toISOString();
      sub.suspendReason = 'pago-vencido';
      suspended.push(String(sub.userEmail || ''));
      changed = true;
      if (disconnectChannel) {
        try {
          const r = disconnectChannel(String(sub.userEmail || ''));
          if (r && typeof (r as any).catch === 'function') (r as Promise<void>).catch(() => {});
        } catch { /* no bloquea */ }
      }
      console.log(`[Billing] Canal suspendido por pago vencido: ${sub.userEmail} (${sub.orderId})`);
    }
    if (changed) saveDB(db);
  } catch (err) {
    console.warn('[Billing] Error suspendiendo canales vencidos:', err);
  }
  return suspended;
}

/** ¿El usuario tiene al menos un canal con suscripción activa? */
export function hasActiveChannel(getDB: () => any, userEmail: string): boolean {
  try {
    const db = getDB();
    const subs: any[] = Array.isArray(db.channelSubscriptions) ? db.channelSubscriptions : [];
    const now = Date.now();
    const norm = String(userEmail || '').toLowerCase();
    return subs.some((s: any) =>
      String(s.userEmail || '').toLowerCase() === norm &&
      String(s.status) === 'active' &&
      (!s.expiresAt || new Date(s.expiresAt).getTime() > now),
    );
  } catch {
    return false;
  }
}

/* ==========================================================================
 * RADAR DE ANUNCIOS — suscripción aparte del plan
 * ========================================================================== */

/**
 * Webhook Bold: activa el tier del Radar de Anuncios cuando se aprueba una
 * orden RADAR-*. La suscripción queda vigente RADAR_SUBSCRIPTION_DAYS días.
 * Llamar desde onPaymentApproved en server.ts (junto a las otras dos).
 */
export function activateRadarForBoldOrder(getDB: () => any, saveDB: (db: any) => void, orderId: string): boolean {
  try {
    if (!String(orderId || '').startsWith('RADAR-')) return false;
    const db = getDB();
    const orders: any[] = Array.isArray(db.radarOrders) ? db.radarOrders : [];
    const order = orders.find((o: any) => String(o.orderId) === String(orderId));
    if (!order || order.status === 'ACTIVE') return false;
    const tier = findRadarTier(String(order.tierId || ''));
    if (!tier) return false;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RADAR_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    order.status = 'ACTIVE';
    order.activatedAt = now.toISOString();
    order.expiresAt = expiresAt;
    const user = findUserByEmail(db, String(order.userEmail || ''));
    if (user) {
      user.radarTier = tier.id;
      user.radarTierActivatedAt = now.toISOString();
      user.radarTierExpiresAt = expiresAt;
    }
    saveDB(db);
    console.log(`[Billing] Radar activado por pago Bold: ${order.userEmail} → ${tier.name} (${orderId}, vence ${expiresAt})`);
    return true;
  } catch (err) {
    console.warn('[Billing] Error activando radar:', err);
    return false;
  }
}

/**
 * Tier vigente del Radar de Anuncios para un usuario.
 * - superadmin/admin → 'elite' (acceso total).
 * - Devuelve el tier solo si radarTierExpiresAt > ahora; si no, 'none'.
 * Uso: server/radar.ts (backend del Radar).
 */
export function getRadarTier(getDB: () => any, email: string): 'none' | 'basico' | 'pro' | 'elite' {
  try {
    const db = getDB();
    const user = findUserByEmail(db, email);
    if (!user) return 'none';
    const role = String(user.role || '').toLowerCase();
    if (role === 'superadmin' || role === 'admin') return 'elite';
    if (!isRadarTierActive(user)) return 'none';
    const tierId = String(user.radarTier || '').toLowerCase();
    if (tierId === 'basico' || tierId === 'pro' || tierId === 'elite') return tierId;
    return 'none';
  } catch {
    return 'none';
  }
}

/** Límite diario de búsquedas según el tier del usuario (RADAR_UNLIMITED = sin tope). */
export function getRadarSearchLimit(getDB: () => any, email: string): number {
  const tier = findRadarTier(getRadarTier(getDB, email));
  return tier ? tier.searchesPerDay : 0;
}

/** Número de alertas WhatsApp permitidas según el tier del usuario. */
export function getRadarAlertLimit(getDB: () => any, email: string): number {
  const tier = findRadarTier(getRadarTier(getDB, email));
  return tier ? tier.alerts : 0;
}

/** Búsquedas restantes hoy (null = sin tier o ilimitado). */
export function getRadarSearchesLeft(getDB: () => any, email: string): number | null {
  try {
    const db = getDB();
    const user = findUserByEmail(db, email);
    if (!user) return null;
    const role = String(user.role || '').toLowerCase();
    if (role === 'superadmin' || role === 'admin') return null;
    if (!isRadarTierActive(user)) return null;
    const tier = findRadarTier(String(user.radarTier || ''));
    if (!tier) return null;
    if (tier.searchesPerDay >= RADAR_UNLIMITED) return null;
    return Math.max(0, tier.searchesPerDay - getRadarSearchCountToday(db, email));
  } catch {
    return null;
  }
}

/**
 * Consume 1 búsqueda del Radar para el usuario (cuota diaria en db.radarQuota).
 * - Devuelve true y descuenta si el tier lo permite; false si no hay tier vigente
 *   o se agotó la cuota del día.
 * - El tier elite (y superadmin/admin) siempre devuelve true.
 * Uso: server/radar.ts antes de ejecutar cada búsqueda.
 */
export function consumeRadarSearch(getDB: () => any, saveDB: (db: any) => void, email: string): boolean {
  try {
    const db = getDB();
    const user = findUserByEmail(db, email);
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    if (role === 'superadmin' || role === 'admin') return true;
    if (!isRadarTierActive(user)) return false;
    const tier = findRadarTier(String(user.radarTier || ''));
    if (!tier) return false;
    if (tier.searchesPerDay >= RADAR_UNLIMITED) return true;
    const norm = String(email || '').toLowerCase();
    if (!db.radarQuota || db.radarQuota.date !== radarTodayKey()) {
      db.radarQuota = { date: radarTodayKey(), counts: {} };
    }
    const counts = db.radarQuota.counts || (db.radarQuota.counts = {});
    const used = Number(counts[norm] || 0);
    if (used >= tier.searchesPerDay) return false;
    counts[norm] = used + 1;
    saveDB(db);
    return true;
  } catch (err) {
    console.warn('[Billing] Error consumiendo búsqueda del Radar:', err);
    return false;
  }
}

/**
 * Suspende suscripciones del Radar vencidas: marca radarTier='none' y limpia
 * las fechas de vigencia. NO elimina el historial de órdenes.
 *
 * DÓNDE ENGANCHAR:
 * - Cron diario: server/cron/inactiveCleanup.ts → runInactiveCleanup(), junto
 *   a la llamada existente de suspendExpiredChannels:
 *     result.suspendedRadar = suspendExpiredRadar(getDB, saveDB);
 *   (añadir 'suspendedRadar: string[]' a CleanupResult).
 *
 * Devuelve los emails de los usuarios suspendidos.
 */
export function suspendExpiredRadar(getDB: () => any, saveDB: (db: any) => void): string[] {
  const suspended: string[] = [];
  try {
    const db = getDB();
    const users: any[] = Array.isArray(db.users) ? db.users : [];
    const now = Date.now();
    let changed = false;
    for (const user of users) {
      const tierId = String(user?.radarTier || '').toLowerCase();
      if (!tierId || tierId === 'none') continue;
      const expiresAt = user.radarTierExpiresAt ? new Date(user.radarTierExpiresAt).getTime() : 0;
      if (expiresAt > now) continue;
      user.radarTier = 'none';
      delete user.radarTierActivatedAt;
      delete user.radarTierExpiresAt;
      suspended.push(String(user.email || ''));
      changed = true;
      console.log(`[Billing] Radar suspendido por suscripción vencida: ${user.email} (tier ${tierId})`);
    }
    if (changed) saveDB(db);
  } catch (err) {
    console.warn('[Billing] Error suspendiendo radar vencido:', err);
  }
  return suspended;
}
