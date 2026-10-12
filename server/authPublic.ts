/**
 * authPublic.ts — Registro público con pago Bold integrado + recuperación de contraseña.
 *
 * - GET  /api/auth/plans           → lista de planes (público)
 * - POST /api/auth/register        → crea usuario (pendiente_pago) + orden Bold (público)
 * - GET  /api/auth/order-status    → estado del pago; activa al usuario si fue aprobado (público con orderId)
 * - POST /api/auth/forgot-password → envía email de restablecimiento vía Resend @xorbit360.com (público)
 * - POST /api/auth/reset-password  → cambia la contraseña con token válido (público)
 *
 * Los correos salen SIEMPRE del dominio propio @xorbit360.com vía Resend
 * (misma clave cifrada que usa el Diagnóstico). Nunca se usa el remitente de Supabase.
 */
import type { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { setSessionCookie } from './auth.ts';
import { isEncryptedSecret, decryptSecret } from './secretBox.ts';
import { getSupabase } from './supabase.ts';
import { BOLD_PRODUCTION_CONFIG, calculateBoldIntegritySignature } from './bold.ts';

export interface RegisterPlan {
  id: string;
  name: string;
  priceUsd: number;
  priceCop: number;
  conversations: number;
  aiMessages: number;
  tagline: string;
  featured?: boolean;
}

export const REGISTER_PLANS: RegisterPlan[] = [
  { id: 'starter', name: 'Starter', priceUsd: 19, priceCop: 76000, conversations: 500, aiMessages: 25, tagline: 'Para empezar a automatizar' },
  { id: 'standard', name: 'Standard', priceUsd: 33, priceCop: 132000, conversations: 1000, aiMessages: 40, tagline: 'Para negocios en crecimiento' },
  { id: 'pro', name: 'Pro', priceUsd: 69, priceCop: 276000, conversations: 3000, aiMessages: 50, tagline: 'Para operación seria', featured: true },
  { id: 'enterprise', name: 'Enterprise', priceUsd: 319, priceCop: 1276000, conversations: 20000, aiMessages: 65, tagline: 'Para agencias y alto volumen' },
];

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

// --- Resend (dominio propio) -------------------------------------------------
async function getResendConfig(): Promise<{ apiKey: string; from: string } | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await (supabase
      .from('app_settings')
      .select('value')
      .eq('workspace_id', 'default')
      .eq('key', 'diagnostic.settings')
      .maybeSingle() as any);
    const raw = data?.value;
    const settings = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    const keyRaw = String(settings.emailApiKey || '').trim();
    const apiKey = (isEncryptedSecret(keyRaw) ? decryptSecret(keyRaw) : keyRaw).trim();
    if (!apiKey) return null;
    const from = String(settings.emailFrom || '').trim() || 'Xorbit 360 <noreply@xorbit360.com>';
    return { apiKey, from };
  } catch {
    return null;
  }
}

export async function sendAuthEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  const cfg = await getResendConfig();
  if (!cfg) return { ok: false, detail: 'sin-proveedor: falta la clave de Resend en Configuración' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.from, to: [to], subject, html }),
      signal: AbortSignal.timeout(15000),
    });
    const bodyText = await res.text().catch(() => '');
    return { ok: res.ok, detail: `Resend HTTP ${res.status}${res.ok ? '' : `: ${bodyText.slice(0, 160)}`}` };
  } catch (err: any) {
    return { ok: false, detail: `Resend error: ${String(err?.message || err).slice(0, 160)}` };
  }
}

function emailShell(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0d0d0f;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<div style="border-bottom:3px solid #d4a437;padding-bottom:16px;margin-bottom:24px;">
<div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:2px;">XORBIT <span style="color:#d4a437;">360</span></div>
</div>
<div style="color:#e8e8e8;font-size:15px;line-height:1.7;">
<h2 style="color:#d4a437;font-size:19px;margin:0 0 12px;">${title}</h2>
${bodyHtml}
${cta ? `<div style="margin:24px 0;"><a href="${cta.url}" style="display:inline-block;background:#d4a437;color:#000;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;">${cta.label}</a></div>` : ''}
</div>
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #2a2a2a;color:#8a8a8a;font-size:12px;">
Este correo fue enviado por Xorbit 360. Si no solicitaste esta acción, ignóralo.
</div>
</div></body></html>`;
}

// --- Rutas ------------------------------------------------------------------
export function setupAuthPublicRoutes(
  app: Express,
  getDB: () => any,
  saveDB: (db: any) => void,
) {
  const getUsers = (): any[] => {
    const db = getDB();
    if (!Array.isArray(db.users)) db.users = [];
    return db.users;
  };

  // Lista de planes
  app.get('/api/auth/plans', (_req: Request, res: Response) => {
    res.json({ success: true, plans: REGISTER_PLANS });
  });

  // Registro + creación de orden Bold
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, whatsapp, password, planId, referralCode } = req.body || {};
      const normName = String(name || '').trim();
      const normEmail = String(email || '').trim().toLowerCase();
      const normPhone = String(whatsapp || '').replace(/\D/g, '');
      const pass = String(password || '');
      const plan = REGISTER_PLANS.find((p) => p.id === String(planId || '').trim().toLowerCase());

      if (!normName || normName.length < 2) return res.status(400).json({ success: false, error: 'Ingresa tu nombre completo.' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) return res.status(400).json({ success: false, error: 'Ingresa un correo válido.' });
      if (pass.length < 6) return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
      if (!plan) return res.status(400).json({ success: false, error: 'Selecciona un plan.' });

      const users = getUsers();
      if (users.some((u: any) => String(u.email || '').trim().toLowerCase() === normEmail)) {
        return res.status(409).json({ success: false, error: 'Este correo ya está registrado. Inicia sesión o restablece tu contraseña.' });
      }

      if (!BOLD_PRODUCTION_CONFIG.merchantId || !BOLD_PRODUCTION_CONFIG.apiKey || !BOLD_PRODUCTION_CONFIG.secretKey) {
        return res.status(503).json({ success: false, error: 'La pasarela de pagos no está configurada. Inténtalo más tarde.' });
      }

      const passwordHash = await bcrypt.hash(pass, 12);
      const orderId = `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const username = normEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || `user${Date.now().toString().slice(-6)}`;

      const newUser: any = {
        id: `u-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        name: normName,
        email: normEmail,
        username,
        phone: normPhone,
        password: passwordHash,
        role: 'user',
        plan: plan.name,
        planId: plan.id,
        status: 'pendiente_pago',
        pendingOrderId: orderId,
        createdAt: new Date().toISOString(),
      };
      if (referralCode) newUser.referralCode = String(referralCode).trim();
      users.push(newUser);
      saveDB(getDB());

      // Orden Bold (misma firma que /api/integrations/bold/create-payment)
      const amount = plan.priceCop;
      const currency = 'COP';
      const signature = calculateBoldIntegritySignature(orderId, amount, currency, BOLD_PRODUCTION_CONFIG.secretKey);
      const description = `Registro Xorbit 360 - Plan ${plan.name}`;
      const redirectionUrl = `https://crm.xorbit360.com/?view=register&payment_status=completed&order=${orderId}`;

      // Email de bienvenida (no bloquea el registro si falla)
      const appUrl = 'https://crm.xorbit360.com';
      sendAuthEmail(
        normEmail,
        `Bienvenido a Xorbit 360 — completa tu registro`,
        emailShell(
          `Hola ${normName.split(' ')[0]}, tu cuenta está casi lista`,
          `<p>Te registraste al plan <b style="color:#d4a437;">${plan.name}</b> (USD ${plan.priceUsd}). Completa el pago para activar tu acceso al CRM.</p><p>Si ya pagaste, tu cuenta se activará automáticamente en unos segundos.</p>`,
          { label: 'Ir a Xorbit 360', url: appUrl },
        ),
      ).catch(() => {});

      return res.json({
        success: true,
        orderId,
        plan: { id: plan.id, name: plan.name, priceUsd: plan.priceUsd, priceCop: plan.priceCop },
        bold: {
          merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
          apiKey: BOLD_PRODUCTION_CONFIG.apiKey,
          orderId,
          amount: String(amount),
          currency,
          integritySignature: signature,
          description,
          redirectionUrl,
          renderMode: 'embedded',
        },
      });
    } catch (err: any) {
      console.error('[AuthPublic] Error en registro:', err);
      return res.status(500).json({ success: false, error: 'Error interno. Inténtalo de nuevo.' });
    }
  });

  // Estado de la orden + activación al aprobarse
  app.get('/api/auth/order-status', async (req: Request, res: Response) => {
    try {
      const orderId = String(req.query.orderId || '').trim();
      if (!orderId) return res.status(400).json({ success: false, error: 'Falta orderId.' });

      const db = getDB();
      const txs: any[] = Array.isArray(db.boldTransactions) ? db.boldTransactions : [];
      const tx = txs.find((t: any) => String(t.orderId) === orderId);
      const status = String(tx?.status || 'PENDING').toUpperCase();
      const approved = status.includes('APPROV') || status === 'PAID' || status === 'SUCCESS';

      if (approved) {
        const users = getUsers();
        const user = users.find((u: any) => String(u.pendingOrderId || '') === orderId);
        if (user && user.status !== 'activo') {
          user.status = 'activo';
          user.activatedAt = new Date().toISOString();
          delete user.pendingOrderId;
          saveDB(getDB());
          setSessionCookie(res, {
            name: user.name, email: user.email, role: user.role || 'user',
            username: user.username, phone: user.phone || '', plan: user.plan || 'Starter',
          });
          return res.json({ success: true, approved: true, activated: true, user: { name: user.name, email: user.email, plan: user.plan } });
        }
        return res.json({ success: true, approved: true, activated: false });
      }
      return res.json({ success: true, approved: false, status });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Error consultando el pago.' });
    }
  });

  // Solicitar restablecimiento de contraseña
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const normEmail = String(req.body?.email || '').trim().toLowerCase();
      // Respuesta genérica para no revelar si el correo existe
      const generic = { success: true, message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) return res.json(generic);

      const users = getUsers();
      const user = users.find((u: any) => String(u.email || '').trim().toLowerCase() === normEmail);
      if (!user) return res.json(generic);

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      user.resetTokenHash = tokenHash;
      user.resetTokenExp = Date.now() + RESET_TOKEN_TTL_MS;
      saveDB(getDB());

      const resetUrl = `https://crm.xorbit360.com/?view=register&reset_token=${token}&email=${encodeURIComponent(normEmail)}`;
      const sent = await sendAuthEmail(
        normEmail,
        'Restablece tu contraseña — Xorbit 360',
        emailShell(
          'Restablece tu contraseña',
          `<p>Hola ${String(user.name || '').split(' ')[0] || ''}, recibimos una solicitud para restablecer tu contraseña de Xorbit 360.</p><p>El enlace vence en <b>1 hora</b>.</p>`,
          { label: 'Restablecer contraseña', url: resetUrl },
        ),
      );
      if (!sent.ok) console.warn('[AuthPublic] No se pudo enviar email de reset:', sent.detail);
      return res.json(generic);
    } catch (err: any) {
      console.error('[AuthPublic] Error en forgot-password:', err);
      return res.status(500).json({ success: false, error: 'Error interno.' });
    }
  });

  // Restablecer contraseña con token
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, token, newPassword } = req.body || {};
      const normEmail = String(email || '').trim().toLowerCase();
      const pass = String(newPassword || '');
      if (pass.length < 6) return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
      if (!token) return res.status(400).json({ success: false, error: 'Token inválido.' });

      const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
      const users = getUsers();
      const user = users.find((u: any) => String(u.email || '').trim().toLowerCase() === normEmail);
      if (!user || user.resetTokenHash !== tokenHash || !user.resetTokenExp || Date.now() > Number(user.resetTokenExp)) {
        return res.status(400).json({ success: false, error: 'El enlace es inválido o venció. Solicita uno nuevo.' });
      }

      user.password = await bcrypt.hash(pass, 12);
      delete user.resetTokenHash;
      delete user.resetTokenExp;
      delete user.tempPassword;
      saveDB(getDB());
      return res.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    } catch (err: any) {
      console.error('[AuthPublic] Error en reset-password:', err);
      return res.status(500).json({ success: false, error: 'Error interno.' });
    }
  });
}

/**
 * Activa al usuario con la orden REG-* cuando el webhook de Bold confirma el pago.
 * Llamar desde el webhook de Bold al aprobarse un pago.
 */
export function activateUserForBoldOrder(getDB: () => any, saveDB: (db: any) => void, orderId: string): boolean {
  try {
    if (!String(orderId || '').startsWith('REG-')) return false;
    const db = getDB();
    const users: any[] = Array.isArray(db.users) ? db.users : [];
    const user = users.find((u: any) => String(u.pendingOrderId || '') === String(orderId));
    if (!user || user.status === 'activo') return false;
    user.status = 'activo';
    user.activatedAt = new Date().toISOString();
    delete user.pendingOrderId;
    saveDB(db);
    console.log(`[AuthPublic] Usuario activado por pago Bold: ${user.email} (${orderId})`);
    return true;
  } catch (err) {
    console.warn('[AuthPublic] Error activando usuario:', err);
    return false;
  }
}
