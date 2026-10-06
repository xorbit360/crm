const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 80;
const BASE_DIR = __dirname;

// Credenciales oficiales de Bold
const BOLD_CONFIG = {
  merchantId: 'FFVSR3C7Y1',
  production: {
    apiKey: 'l_5Wz-8KQmld8Vb_iyy05KWBQ0A3zz5LOtAgMmCjfbk',
    secretKey: '53nBWst7REiVw9So1Zf5aQ'
  },
  sandbox: {
    apiKey: '4WNmFtfCADr2E95U0Wdqn-ita0l1K3jw5P-N7VmeP-E',
    secretKey: 'Am5e0hFkKAO_OUrl_K7ycQ'
  }
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        resolve(json);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers para flexibilidad
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

// Supabase Configuration
const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || 'https://wmxilttilpcnnqodkbqf.supabase.co',
  secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

// In-memory cache for pending orders
const PENDING_ORDERS = new Map();

/**
 * Guarda o actualiza la transacción de recarga y el balance de IA en Supabase (app_state)
 */
async function recordRechargeInSupabase({ orderId, packageName, conversations, msgsPerConv, amountUsd, amountCop, customer, paymentType = 'Bold Payments' }) {
  try {
    const fetchRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/app_state?id=eq.appState&select=data`, {
      headers: {
        'apikey': SUPABASE_CONFIG.secretKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.secretKey}`
      }
    });

    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch app_state: ${fetchRes.statusText}`);
    }

    const rows = await fetchRes.json();
    if (!rows || !rows.length) {
      throw new Error('app_state row not found');
    }

    const currentData = rows[0].data || {};
    const recId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const reference = orderId || `BOLD-REC-${Date.now()}`;

    const newTx = {
      id: recId,
      bank: 'Bold Payments',
      date: new Date().toISOString().split('T')[0],
      amount: Number(amountUsd) || (amountCop ? Math.round(amountCop / 4000) : 0),
      status: 'Completado',
      gateway: 'Bold Payments',
      amountCOP: Number(amountCop) || 0,
      reference: reference,
      timestamp: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      packageName: packageName || 'Recarga Paquete IA',
      packageType: 'conversations',
      paymentType: paymentType,
      creditsAdded: `+${(Number(conversations) || 0).toLocaleString()} Conv. / ${msgsPerConv || 40} msg`,
      customerEmail: customer?.email || 'cliente@xorbit360.com',
      customerPhone: customer?.phone || ''
    };

    const recharges = Array.isArray(currentData.rechargeTransactions) ? currentData.rechargeTransactions : [];
    const existingIndex = recharges.findIndex(t => t.reference === reference);

    if (existingIndex >= 0) {
      recharges[existingIndex] = { ...recharges[existingIndex], ...newTx, status: 'Completado' };
    } else {
      recharges.unshift(newTx);
    }

    const aiBalance = currentData.aiBalance || { conversations: 0, packagesBought: 0, aiMessagesPerConv: 40, audioMinutes: 0 };
    if (existingIndex < 0) {
      aiBalance.conversations = (aiBalance.conversations || 0) + (parseInt(conversations, 10) || 0);
      aiBalance.packagesBought = (aiBalance.packagesBought || 0) + 1;
      if (msgsPerConv) aiBalance.aiMessagesPerConv = parseInt(msgsPerConv, 10);
    }

    // Auto-create / activate user account for CRM access
    const customerEmail = (customer?.email || 'cliente@xorbit360.com').trim().toLowerCase();
    const tempPassword = `Xorbit${Math.floor(100000 + Math.random() * 900000)}!`;
    const users = Array.isArray(currentData.users) ? currentData.users : [];
    const userIndex = users.findIndex(u => (u.email || '').toLowerCase() === customerEmail);

    if (userIndex >= 0) {
      users[userIndex].status = 'activo';
      users[userIndex].plan = packageName || 'Paquete Pro';
    } else {
      users.push({
        id: Date.now(),
        name: customer?.name || 'Cliente Xorbit',
        email: customerEmail,
        role: 'droshipper',
        status: 'activo',
        plan: packageName || 'Paquete Pro',
        phone: customer?.phone || '',
        tempPassword: tempPassword,
        created_at: new Date().toISOString()
      });
    }

    currentData.users = users;
    currentData.rechargeTransactions = recharges;
    currentData.aiBalance = aiBalance;

    const patchRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/app_state?id=eq.appState`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_CONFIG.secretKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.secretKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        data: currentData,
        updated_at: new Date().toISOString()
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`Failed to patch app_state: ${patchRes.status} ${errText}`);
    }

    console.log(`[Supabase] Recarga ${recId} guardada. Nuevo balance: ${aiBalance.conversations} conv. Usuario ${customerEmail} activo.`);
    return { success: true, transaction: newTx, aiBalance, customerEmail, tempPassword };
  } catch (err) {
    console.error('[Supabase Error] Error guardando recarga:', err);
    return { success: false, error: err.message };
  }
}

  // --------------------------------------------------------------------------
  // API: Crear Pago y Generar Firma de Integridad Bold (SHA-256)
  // --------------------------------------------------------------------------
  if (pathname === '/api/create-payment' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const isSandbox = Boolean(data.isSandbox);
      const keys = isSandbox ? BOLD_CONFIG.sandbox : BOLD_CONFIG.production;

      const orderId = `XOR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const amount = String(parseInt(data.amountCop, 10) || 76000);
      const currency = 'COP';

      // Cálculo oficial de la firma: SHA-256 de (orderId + amount + currency + secretKey)
      const concatenation = `${orderId}${amount}${currency}${keys.secretKey}`;
      const integritySignature = crypto.createHash('sha256').update(concatenation).digest('hex');

      // Guardamos la orden pendiente en memoria para reconciliación y confirmación
      PENDING_ORDERS.set(orderId, {
        orderId,
        packageId: data.packageId,
        packageName: data.packageName,
        conversations: data.conversations,
        msgsPerConv: data.msgsPerConv,
        channelsCount: data.channelsCount,
        amountUsd: data.amountUsd,
        amountCop: data.amountCop,
        customer: data.customer,
        isSandbox,
        createdAt: new Date()
      });

      const responsePayload = {
        success: true,
        orderId: orderId,
        amount: amount,
        currency: currency,
        apiKey: keys.apiKey,
        integritySignature: integritySignature,
        merchantId: BOLD_CONFIG.merchantId,
        description: data.description || `Recarga Xorbit 360 AI - ${data.packageName || 'Paquete'}`,
        renderMode: 'embedded',
        redirectionUrl: `https://xorbit360.com/?payment_status=completed&order=${orderId}`,
        isSandbox: isSandbox
      };

      console.log(`[Bold] Orden creada: ${orderId} | Monto: $${amount} COP | Modo: ${isSandbox ? 'Sandbox' : 'Producción'}`);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(responsePayload));
    } catch (error) {
      console.error('[Bold] Error creando pago:', error);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  // --------------------------------------------------------------------------
  // API: Confirmar Recarga y Sincronizar con Supabase
  // --------------------------------------------------------------------------
  if (pathname === '/api/confirm-recharge' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const orderId = body.orderId || body.order;
      const cachedOrder = PENDING_ORDERS.get(orderId) || {};

      const rechargeData = {
        orderId: orderId,
        packageName: body.packageName || cachedOrder.packageName || 'Paquete Pro',
        conversations: body.conversations || cachedOrder.conversations || 3000,
        msgsPerConv: body.msgsPerConv || cachedOrder.msgsPerConv || 50,
        amountUsd: body.amountUsd || cachedOrder.amountUsd || 69,
        amountCop: body.amountCop || cachedOrder.amountCop || 276000,
        customer: body.customer || cachedOrder.customer || {},
        paymentType: body.paymentType || 'Bold Payments'
      };

      const result = await recordRechargeInSupabase(rechargeData);

      const customerEmail = result.customerEmail || rechargeData.customer?.email || 'cliente@xorbit360.com';
      const tempPassword = result.tempPassword || `Xorbit${Math.floor(100000 + Math.random() * 900000)}!`;
      const appLoginUrl = `https://crm.xorbit360.com/?email=${encodeURIComponent(customerEmail)}&auto_login=1&payment_status=completed&order=${encodeURIComponent(orderId)}`;

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        success: result.success,
        orderId: orderId,
        aiBalance: result.aiBalance,
        customer: {
          email: customerEmail,
          tempPassword: tempPassword,
          name: rechargeData.customer?.name || 'Cliente Xorbit'
        },
        appLoginUrl: appLoginUrl,
        message: 'Recarga y credenciales generadas con éxito'
      }));
    } catch (err) {
      console.error('[Confirm Recharge Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // --------------------------------------------------------------------------
  // API: Webhook Oficial de Bold (https://xorbit360.com/api/integrations/bold/webhook)
  // --------------------------------------------------------------------------
  if (pathname === '/api/integrations/bold/webhook') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        status: 'active',
        service: 'Xorbit 360 - Bold Webhook Listener',
        merchantId: BOLD_CONFIG.merchantId,
        supabaseConnected: true,
        appDomain: 'https://crm.xorbit360.com',
        timestamp: new Date().toISOString()
      }));
    }

    if (req.method === 'POST') {
      try {
        const webhookPayload = await parseJsonBody(req);
        console.log('\n================ BOLD WEBHOOK EVENT RECIBIDO ================');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
        console.log('=============================================================\n');

        // Si el webhook reporta estado exitoso, acreditamos en Supabase
        const eventType = webhookPayload.event || webhookPayload.type || '';
        const orderId = webhookPayload.data?.order_id || webhookPayload.data?.metadata?.order_id || webhookPayload.order_id;
        const status = webhookPayload.data?.status || webhookPayload.status || '';

        if (status === 'APPROVED' || status === 'PAID' || eventType.includes('approved') || eventType.includes('paid')) {
          const cached = PENDING_ORDERS.get(orderId) || {};
          await recordRechargeInSupabase({
            orderId: orderId,
            packageName: cached.packageName,
            conversations: cached.conversations,
            msgsPerConv: cached.msgsPerConv,
            amountUsd: cached.amountUsd,
            amountCop: cached.amountCop,
            customer: cached.customer
          });
        }

        // Respondemos inmediatamente con HTTP 200 para confirmar la recepción
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          status: 'success',
          received: true,
          message: 'Webhook recibido y procesado correctamente'
        }));
      } catch (err) {
        console.error('[Bold Webhook] Error procesando payload:', err);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    }
  }

  // --------------------------------------------------------------------------
  // SERVIR ARCHIVOS ESTÁTICOS
  // --------------------------------------------------------------------------
  let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback a index.html para rutas SPA
        if (!ext || ext === '.html') {
          fs.readFile(path.join(BASE_DIR, 'index.html'), (fallbackErr, fallbackContent) => {
            if (fallbackErr) {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('500 Internal Server Error');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(fallbackContent, 'utf-8');
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Xorbit 360 Web & API Server activo en el puerto ${PORT}`);
  console.log(`📌 Webhook Endpoint listo: http://localhost:${PORT}/api/integrations/bold/webhook\n`);
});
