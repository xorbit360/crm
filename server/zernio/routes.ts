// server/zernio/routes.ts
// Rutas Express para la integración con Zernio & Meta Cloud API

import express from 'express';
import { getZernioAccounts, getZernioConnectUrl, connectZernioHeadlessWaba, deleteZernioAccount } from './accounts.ts';
import { ZERNIO_DEFAULT_KEY } from './client.ts';
import { zernioRequest } from './client.ts';
import { handleZernioWebhook, registerOrUpdateZernioWebhook, getZernioWebhookStatus, runZernioSweeper } from './webhook.ts';
import { enviarMensajeZernio } from './messaging.ts';
import { importZernioConversations } from './history.ts';
import {
  notificarConfirmacionPedidoLogistica,
  notificarDespachoGuiaLogistica,
  notificarNovedadLogistica,
  notificarPedidoEntregadoLogistica
} from './logistics.ts';
import type { LogisticsOrderPayload } from './logistics.ts';

export function setupZernioRoutes(app: express.Express, onIncomingMessage?: (msg: any) => void) {
  const router = express.Router();

  // 1. Estado y configuración de variables
  router.get('/config-status', (req, res) => {
    const hasApiKey = Boolean(process.env.ZERNIO_API_KEY || (globalThis as any).currentDB?.zernioApiKey || ZERNIO_DEFAULT_KEY);
    const hasWebhookSecret = Boolean(process.env.ZERNIO_WEBHOOK_SECRET);
    res.json({
      configured: hasApiKey,
      hasApiKey,
      hasWebhookSecret,
      baseUrl: 'https://zernio.com/api/v1',
      supportedPlatforms: ['instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'threads', 'pinterest', 'reddit', 'bluesky', 'telegram', 'googlebusiness', 'snapchat', 'discord', 'slack'],
      logisticsSupported: ['dropi', 'mastershop', 'effix']
    });
  });

  // 2. Listar cuentas conectadas (Prompt 2)
  router.get('/accounts', async (req, res) => {
    const result = await getZernioAccounts();
    if (result.success === false) {
      const status = (result as any).error?.status || 500;
      return res.status(status).json(result);
    }
    res.json(result);
  });

  // 3. Generar URL de conexión OAuth (Prompt 2)
  router.get('/connect-url', async (req, res) => {
    const platform = (req.query.platform as any) || 'whatsapp';
    const onboarding = (req.query.onboarding as any) || 'business_app';
    const loginMethod = (req.query.loginMethod as any) || 'instagram_login';
    
    // URL de retorno segura
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUrl = (req.query.redirect_url as string) || `${protocol}://${host}/auth/meta/callback`;

    const result = await getZernioConnectUrl({
      platform,
      redirectUrl,
      onboarding,
      loginMethod,
      ...(req.query.shop ? { shop: String(req.query.shop) } : {})
    });

    if (result.success === false) {
      const status = (result as any).error?.status || 500;
      return res.status(status).json(result);
    }
    res.json(result);
  });

  // Callback de OAuth Meta y Redes Sociales Oficiales
  router.get('/callback', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conexión Exitosa</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f17; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #111827; border: 1px solid #1f2937; padding: 32px; border-radius: 16px; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
    button { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>¡Canal Conectado Exitosamente!</h2>
    <p>La cuenta se ha sincronizado correctamente. Esta ventana se cerrará automáticamente.</p>
    <button onclick="window.close()">Cerrar Ventana</button>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'META_WABA_CONNECTED', success: true }, '*');
        window.opener.postMessage({ type: 'CHANNEL_CONNECTED', success: true }, '*');
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', success: true }, '*');
      }
    } catch(e) {}
    setTimeout(function() { window.close(); }, 1800);
  </script>
</body>
</html>`);
  });

  // 3b. Desvincular cuenta / canal
  router.delete('/accounts/:id', async (req, res) => {
    const accountId = req.params.id;
    const result = await deleteZernioAccount(accountId);
    if (result.success === false) {
      const status = (result as any).error?.status || 400;
      return res.status(status).json(result);
    }
    res.json(result);
  });

  // 4. Conexión Headless BYO-WABA (Prompt 2)
  router.post('/connect/credentials', async (req, res) => {
    const { accessToken, wabaId, phoneNumberId, pin } = req.body;
    const result = await connectZernioHeadlessWaba({
      accessToken,
      wabaId,
      phoneNumberId,
      pin
    });

    if (result.success === false) {
      const status = (result as any).error?.status || 400;
      return res.status(status).json(result);
    }
    res.json(result);
  });

  // 5. Receptor de Webhook (Prompt 3)
  router.get('/webhook', (req, res) => {
    const challenge = req.query['hub.challenge'] || req.query.challenge || req.query['zernio.challenge'];
    if (challenge) {
      return res.status(200).send(String(challenge));
    }
    return res.status(200).json({ status: 'ok', service: 'zernio-webhook', timestamp: Date.now() });
  });

  router.post('/webhook', (req, res) => {
    return handleZernioWebhook(req, res, onIncomingMessage);
  });

  // 6. Registro / Actualización de Webhook en Zernio por API (Prompt 4)
  router.post('/webhook/register', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const dynamicUrl = `${protocol}://${host}/api/zernio/webhook`;
    const defaultUrl = process.env.APP_BASE_URL 
      ? `${process.env.APP_BASE_URL.replace(/\/+$/, '')}/api/zernio/webhook`
      : 'https://crm.xorbit360.com/api/zernio/webhook';
    const targetUrl = req.body.url || defaultUrl || dynamicUrl;

    const result = await registerOrUpdateZernioWebhook(targetUrl, req.body.name);
    res.json(result);
  });

  // Plantillas de WhatsApp: sincronización unificada desde Xorbit.
  router.post('/templates/sync', async (req, res) => {
    const accountResult: any = await getZernioAccounts();
    const accountId = String(req.body?.accountId || accountResult?.data?.find((a: any) => a.platform === 'whatsapp')?.id || '');
    if (!accountId) return res.status(400).json({ success: false, error: 'No hay una cuenta WhatsApp oficial conectada.' });
    const result = await zernioRequest({ method: 'GET', path: `/v1/whatsapp/templates?accountId=${encodeURIComponent(accountId)}` });
    if (!result.success) return res.status((result as any).error?.status || 502).json(result);
    res.json({ success: true, data: result.data });
  });

  router.post('/templates', async (req, res) => {
    const result = await zernioRequest({ method: 'POST', path: '/v1/whatsapp/templates', body: req.body });
    if (!result.success) return res.status((result as any).error?.status || 502).json(result);
    res.json({ success: true, data: result.data });
  });

  router.delete('/webhook/:id', async (req, res) => {
    const result = await zernioRequest({ method: 'DELETE', path: `/v1/webhooks/settings/${encodeURIComponent(req.params.id)}` });
    if (!result.success) return res.status((result as any).error?.status || 400).json(result);
    res.json(result);
  });

  // 7. Estado de suscripción del Webhook (Prompt 4)
  router.get('/webhook/status', async (req, res) => {
    const result = await getZernioWebhookStatus();
    if (result.success === false) {
      const status = (result as any).error?.status || 500;
      return res.status(status).json(result);
    }
    res.json(result);
  });

  // 8. Sweeper de recuperación (Prompt 3)
  router.post('/webhook/sweeper', async (req, res) => {
    const secret = req.headers['x-sweeper-secret'];
    const expectedSecret = process.env.ZERNIO_SWEEPER_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(403).json({ error: 'Secret de sweeper no autorizado' });
    }

    const summary = await runZernioSweeper(onIncomingMessage);
    res.json({ success: true, summary });
  });

  // 9. Enviar mensaje o plantilla unificada (Prompt 6)
  router.post('/send-message', async (req, res) => {
    const result = await enviarMensajeZernio(req.body);
    if (!result.success) {
      return res.status(result.outside24hWindow ? 422 : 400).json(result);
    }
    res.json(result);
  });

  // Marcar conversación como leída en Zernio (actualiza también el recibo
  // de lectura del canal cuando la plataforma lo permite).
  router.post('/conversations/:conversationId/read', async (req, res) => {
    const accountId = String(req.body?.accountId || '');
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId requerido' });
    const result = await zernioRequest({ method: 'POST', path: `/v1/inbox/conversations/${encodeURIComponent(req.params.conversationId)}/read`, body: { accountId } });
    if (!result.success) return res.status((result as any).error?.status || 400).json(result);
    res.json({ success: true, data: result.data });
  });

  // 10. Disparadores de Logística Automatizada (Dropi, MasterShop, Effix)
  router.post('/logistics/notify', async (req, res) => {
    const { action, order }: { action: 'confirm' | 'dispatch' | 'novelty' | 'delivered'; order: LogisticsOrderPayload } = req.body;

    if (!order || !order.customerPhone) {
      return res.status(400).json({ success: false, error: 'Se requieren los datos del pedido y el teléfono del cliente' });
    }

    let result;
    if (action === 'confirm') {
      result = await notificarConfirmacionPedidoLogistica(order);
    } else if (action === 'dispatch') {
      result = await notificarDespachoGuiaLogistica(order);
    } else if (action === 'novelty') {
      result = await notificarNovedadLogistica(order);
    } else if (action === 'delivered') {
      result = await notificarPedidoEntregadoLogistica(order);
    } else {
      return res.status(400).json({ success: false, error: 'Acción de logística no reconocida (use: confirm, dispatch, novelty, delivered)' });
    }

    res.json(result);
  });

  // 11. Importación de historial (Prompt 7)
  router.post('/history/import', async (req, res) => {
    const { accountId, maxPages, isAiAgentActive } = req.body;
    const result = await importZernioConversations({
      accountId,
      maxPages,
      isAiAgentActive
    });
    res.json(result);
  });

  // Montar en Express
  app.use('/api/zernio', router);
  // Alias de conveniencia por si se especifica la URL de ejemplo /webhooks/zernio
  app.all('/webhooks/zernio', (req, res) => {
    if (req.method === 'GET') {
      const challenge = req.query['hub.challenge'] || req.query.challenge || req.query['zernio.challenge'];
      if (challenge) {
        return res.status(200).send(String(challenge));
      }
      return res.status(200).json({ status: 'ok', service: 'zernio-webhook', timestamp: Date.now() });
    }
    return handleZernioWebhook(req, res, onIncomingMessage);
  });
}
