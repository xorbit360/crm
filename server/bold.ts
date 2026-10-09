import express from 'express';
import crypto from 'crypto';
import { getSupabase } from './supabase.ts';

export interface BoldConfig {
  merchantId: string;
  apiKey: string;
  secretKey: string;
  checkoutUrl: string;
  webhookUrl: string;
  environment: 'production' | 'sandbox';
}

export const BOLD_PRODUCTION_CONFIG: BoldConfig = {
  merchantId: process.env.BOLD_MERCHANT_ID || '',
  apiKey: process.env.BOLD_API_KEY || '',
  secretKey: process.env.BOLD_SECRET_KEY || '',
  checkoutUrl: 'https://checkout.bold.co',
  webhookUrl: 'https://crm.xorbit360.com/api/integrations/bold/webhook',
  environment: 'production'
};

export interface BoldTransaction {
  id: string;
  orderId: string;
  merchantId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED';
  customerEmail?: string;
  customerName?: string;
  signature: string;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

// In-memory transaction registry (synced with Supabase if configured)
const inMemoryTransactions: Map<string, BoldTransaction> = new Map();
const inMemoryWebhookLogs: Array<{ id: string; timestamp: string; event: string; payload: any; status: string }> = [];

export function calculateBoldIntegritySignature(orderId: string, amount: number, currency: string, secretKey: string): string {
  // Bold formula: SHA256(orderId + amount + currency + secretKey)
  const rawString = `${orderId}${amount}${currency}${secretKey}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

export function setupBoldRoutes(app: express.Express, getCurrentDB?: () => any, saveCurrentDB?: (data: any) => void) {
  console.log(`[Bold Gateway] Inicializando servicios de pago Bold con Merchant ID: ${BOLD_PRODUCTION_CONFIG.merchantId} (Modo: ${BOLD_PRODUCTION_CONFIG.environment})`);

  // 1. Health & Configuration Status Check
  const getStatusHandler = (req: express.Request, res: express.Response) => {
    res.json({
      success: true,
      service: 'Bold Payments Integration',
      status: 'active',
      environment: BOLD_PRODUCTION_CONFIG.environment,
      merchantIdConfigured: Boolean(BOLD_PRODUCTION_CONFIG.merchantId),
      apiKeyConfigured: Boolean(BOLD_PRODUCTION_CONFIG.apiKey),
      secretKeyConfigured: Boolean(BOLD_PRODUCTION_CONFIG.secretKey),
      webhookUrl: BOLD_PRODUCTION_CONFIG.webhookUrl,
      webhookConfigured: true,
      totalTransactions: inMemoryTransactions.size,
      recentWebhookLogs: inMemoryWebhookLogs.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  };

  app.get('/api/integrations/bold/status', getStatusHandler);
  app.get('/api/payments/bold/status', getStatusHandler);

  // 2. Webhook Endpoints (GET for Verification & Health check, POST for Real Bold Events)
  const webhookGetHandler = (req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'bold-webhook',
      mode: 'production',
      merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
      message: 'Bold Webhook endpoint is active and listening for payment notifications',
      verified: true,
      timestamp: new Date().toISOString()
    });
  };

  app.get('/api/integrations/bold/webhook', webhookGetHandler);
  app.get('/api/payments/bold/webhook', webhookGetHandler);

  function getPackageDetailsFromAmount(amount: number, description?: string) {
    const desc = (description || '').toLowerCase();
    const amt = Number(amount);
    
    if (desc.includes('enterprise') || amt >= 1000000 || amt === 319) {
      return { id: 'enterprise', name: 'Paquete Enterprise', conversations: 20000, aiMessagesPerConv: 65, audioMinutes: 0 };
    }
    if (desc.includes('pro audio') || amt === 100000 || amt === 25) {
      return { id: 'audio_pro', name: 'Paquete Pro Audio', conversations: 90, aiMessagesPerConv: 40, audioMinutes: 90 };
    }
    if (desc.includes('audio standard') || amt === 40000 || amt === 10) {
      return { id: 'audio_standard', name: 'Paquete Standard Audio', conversations: 30, aiMessagesPerConv: 40, audioMinutes: 30 };
    }
    if (desc.includes('pro') || (amt >= 250000 && amt <= 300000) || amt === 69) {
      return { id: 'pro', name: 'Paquete Pro', conversations: 3000, aiMessagesPerConv: 50, audioMinutes: 0 };
    }
    if (desc.includes('standard') || (amt >= 120000 && amt <= 150000) || amt === 33) {
      return { id: 'standard', name: 'Paquete Standard', conversations: 1000, aiMessagesPerConv: 40, audioMinutes: 0 };
    }
    // Default or Starter ($19 USD / 76,000 COP)
    return { id: 'starter', name: 'Paquete Starter', conversations: 500, aiMessagesPerConv: 25, audioMinutes: 0 };
  }

  const webhookPostHandler = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body || {};
      const eventId = `WH-BOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`[Bold Webhook] Recibida notificación de evento Bold:`, JSON.stringify(payload).substring(0, 300));

      const eventType = payload.event || payload.type || payload.status || 'PAYMENT_EVENT';
      const orderId = payload.orderId || payload.reference || payload.id || payload.data?.orderId || payload.data?.reference || eventId;
      const status = (payload.status || payload.data?.status || 'APPROVED').toUpperCase();
      const amount = Number(payload.amount || payload.data?.amount || 0);
      const description = payload.description || payload.data?.description || '';

      const isApproved = status.includes('APPROV') || status === 'PAID' || status === 'SUCCESS';

      const logEntry = {
        id: eventId,
        timestamp: new Date().toISOString(),
        event: eventType,
        payload,
        status: 'RECEIVED'
      };
      inMemoryWebhookLogs.unshift(logEntry);
      if (inMemoryWebhookLogs.length > 50) inMemoryWebhookLogs.pop();

      // If we have an existing transaction, update its status
      if (orderId && inMemoryTransactions.has(orderId)) {
        const tx = inMemoryTransactions.get(orderId)!;
        if (isApproved) {
          tx.status = 'APPROVED';
        } else if (status.includes('REJECT') || status === 'FAILED') {
          tx.status = 'REJECTED';
        }
        tx.updatedAt = new Date().toISOString();
        tx.metadata = payload;
        inMemoryTransactions.set(orderId, tx);
      }

      // Sync with Supabase
      try {
        const supabase = getSupabase();
        if (supabase) {
          try {
            await (supabase.from('transactions').insert({
              order_id: orderId,
              merchant_id: BOLD_PRODUCTION_CONFIG.merchantId,
              gateway: 'bold',
              amount,
              status,
              payload: JSON.stringify(payload),
              created_at: new Date().toISOString()
            }) as any);
          } catch {}
        }
      } catch (dbErr) {
        console.warn('[Bold Webhook] Supabase sync notice:', dbErr);
      }

      // Update AI Balance and packages in currentDB
      if (getCurrentDB && saveCurrentDB) {
        try {
          const db = getCurrentDB();
          if (db) {
            if (!db.boldTransactions) db.boldTransactions = [];
            db.boldTransactions.unshift({
              eventId,
              orderId,
              status,
              amount,
              merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
              timestamp: new Date().toISOString()
            });
            if (db.boldTransactions.length > 100) db.boldTransactions = db.boldTransactions.slice(0, 100);

            if (isApproved) {
              const pkg = getPackageDetailsFromAmount(amount, description);
              if (!db.aiBalance) {
                db.aiBalance = {
                  conversations: 500,
                  aiMessagesPerConv: 25,
                  audioMinutes: 0,
                  packagesBought: 0
                };
              }
              db.aiBalance.conversations = (db.aiBalance.conversations || 0) + pkg.conversations;
              db.aiBalance.packagesBought = (db.aiBalance.packagesBought || 0) + 1;
              db.aiBalance.aiMessagesPerConv = Math.max(db.aiBalance.aiMessagesPerConv || 25, pkg.aiMessagesPerConv);
              db.aiBalance.audioMinutes = (db.aiBalance.audioMinutes || 0) + (pkg.audioMinutes || 0);
              db.aiBalance.lastRechargeAt = new Date().toISOString();

              if (!db.rechargeHistory) db.rechargeHistory = [];
              db.rechargeHistory.unshift({
                id: orderId,
                date: new Date().toISOString().split('T')[0],
                packageName: pkg.name,
                type: pkg.audioMinutes > 0 ? 'Audio' : 'Texto',
                amount,
                creditsAdded: `+${pkg.conversations.toLocaleString()} chats (${pkg.aiMessagesPerConv} msgs/chat)`,
                status: 'Completado'
              });
              if (db.rechargeHistory.length > 50) db.rechargeHistory = db.rechargeHistory.slice(0, 50);

              console.log(`[Bold Gateway] Recarga procesada exitosamente: ${pkg.name} (+${pkg.conversations} conv, ${pkg.aiMessagesPerConv} msgs/conv). Nuevo balance: ${db.aiBalance.conversations} conversaciones.`);
            }

            saveCurrentDB(db);
          }
        } catch (dbSaveErr) {
          console.warn('[Bold Webhook] Local DB save notice:', dbSaveErr);
        }
      }

      return res.status(200).json({
        success: true,
        received: true,
        eventId,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
        message: 'Notification processed successfully'
      });
    } catch (err: any) {
      console.error('[Bold Webhook] Error procesando webhook:', err);
      return res.status(200).json({
        success: false,
        error: err.message,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId
      });
    }
  };

  app.post('/api/integrations/bold/webhook', webhookPostHandler);
  app.post('/api/payments/bold/webhook', webhookPostHandler);

  // 3. Create Real Payment Order & Signed Checkout URL
  const createPaymentHandler = async (req: express.Request, res: express.Response) => {
    try {
      if (!BOLD_PRODUCTION_CONFIG.merchantId || !BOLD_PRODUCTION_CONFIG.apiKey || !BOLD_PRODUCTION_CONFIG.secretKey) {
        return res.status(503).json({ success: false, error: 'La pasarela de pagos no está configurada en el servidor.' });
      }
      const body = req.body || {};
      const { description, customerEmail, customerName, currency = 'COP', orderId: reqOrderId } = body;
      
      const rawAmount = body.amount ?? body.amountCop ?? (body.amountUsd ? body.amountUsd * 4000 : 76000);
      const numericAmount = Number(rawAmount);

      if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Monto de pago inválido. Debe ser mayor a 0.'
        });
      }

      const orderId = reqOrderId || `XOR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const amountStr = String(Math.round(numericAmount));
      const signature = calculateBoldIntegritySignature(
        orderId,
        numericAmount,
        currency,
        BOLD_PRODUCTION_CONFIG.secretKey
      );

      // Generate production Bold Checkout URL for merchant FFVSR3C7Y1
      const encodedDesc = encodeURIComponent(description || 'Recarga de Saldo - Xorbit 360 AI');
      const checkoutUrl = `https://checkout.bold.co/payment/${BOLD_PRODUCTION_CONFIG.merchantId}?amount=${amountStr}&currency=${currency}&description=${encodedDesc}&reference=${orderId}&order-id=${encodeURIComponent(orderId)}&apiKey=${encodeURIComponent(
        BOLD_PRODUCTION_CONFIG.apiKey
      )}&integritySignature=${signature}&redirection-url=${encodeURIComponent(
        'https://crm.xorbit360.com/#/recargas?payment_status=completed'
      )}`;

      const newTx: BoldTransaction = {
        id: orderId,
        orderId,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
        amount: numericAmount,
        currency,
        description: description || 'Recarga de Saldo - Xorbit 360 AI',
        status: 'PENDING',
        customerEmail: customerEmail || 'usuario@xorbit360.com',
        customerName: customerName || 'Cliente Xorbit 360',
        signature,
        checkoutUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      inMemoryTransactions.set(orderId, newTx);

      console.log(`[Bold Gateway] Orden de pago generada exitosamente: ${orderId} por $${numericAmount} ${currency} (Merchant: ${BOLD_PRODUCTION_CONFIG.merchantId})`);

      return res.status(200).json({
        success: true,
        orderId,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
        amount: numericAmount,
        currency,
        signature,
        integritySignature: signature,
        apiKey: BOLD_PRODUCTION_CONFIG.apiKey,
        description: description || 'Recarga de Saldo - Xorbit 360 AI',
        renderMode: 'embedded',
        redirectionUrl: `https://crm.xorbit360.com/#/recargas?payment_status=completed&order=${orderId}`,
        checkoutUrl,
        boldConfig: {
          merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
          apiKeyMasked: `${BOLD_PRODUCTION_CONFIG.apiKey.substring(0, 8)}...`,
          environment: BOLD_PRODUCTION_CONFIG.environment
        }
      });
    } catch (err: any) {
      console.error('[Bold Gateway] Error creando orden de pago:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error interno al generar orden de pago en Bold'
      });
    }
  };

  app.post('/api/integrations/bold/create-payment', createPaymentHandler);
  app.post('/api/payments/bold/create-payment', createPaymentHandler);
  app.post('/api/create-payment', createPaymentHandler);

  // 4. List Transactions
  app.get('/api/integrations/bold/transactions', (req, res) => {
    const list = Array.from(inMemoryTransactions.values()).reverse();
    res.json({
      success: true,
      merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
      transactions: list
    });
  });
}
