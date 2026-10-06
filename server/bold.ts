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
  merchantId: process.env.BOLD_MERCHANT_ID || 'FFVSR3C7Y1',
  apiKey: process.env.BOLD_API_KEY || 'l_5Wz-8KQmld8Vb_iyy05KWBQ0A3zz5LOtagMmCjfbk',
  secretKey: process.env.BOLD_SECRET_KEY || '53nBWst7REiVw9So1Zf5aQ',
  checkoutUrl: process.env.BOLD_CHECKOUT_URL || 'https://checkout.bold.co/payment',
  webhookUrl: 'https://expert360.ai.studio/api/integrations/bold/webhook',
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
      merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
      merchantIdIntegrated: BOLD_PRODUCTION_CONFIG.merchantId === 'FFVSR3C7Y1',
      apiKeyMasked: `${BOLD_PRODUCTION_CONFIG.apiKey.substring(0, 8)}...${BOLD_PRODUCTION_CONFIG.apiKey.slice(-4)}`,
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

  const webhookPostHandler = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body || {};
      const eventId = `WH-BOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`[Bold Webhook] Recibida notificación de evento Bold:`, JSON.stringify(payload).substring(0, 300));

      const eventType = payload.event || payload.type || payload.status || 'PAYMENT_EVENT';
      const orderId = payload.orderId || payload.reference || payload.id || payload.data?.orderId || payload.data?.reference;
      const status = (payload.status || payload.data?.status || 'APPROVED').toUpperCase();
      const amount = payload.amount || payload.data?.amount || 0;

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
        if (status.includes('APPROV') || status === 'PAID' || status === 'SUCCESS') {
          tx.status = 'APPROVED';
        } else if (status.includes('REJECT') || status === 'FAILED') {
          tx.status = 'REJECTED';
        }
        tx.updatedAt = new Date().toISOString();
        tx.metadata = payload;
        inMemoryTransactions.set(orderId, tx);
      }

      // Sync with Supabase / currentDB if functions provided
      try {
        const supabase = getSupabase();
        if (supabase) {
          try {
            await (supabase.from('transactions').insert({
              order_id: orderId || eventId,
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
      const { amount, description, customerEmail, customerName, currency = 'COP' } = req.body || {};

      const numericAmount = Number(amount);
      if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Monto de pago inválido. Debe ser mayor a 0.'
        });
      }

      const orderId = `REC-BOLD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const signature = calculateBoldIntegritySignature(
        orderId,
        numericAmount,
        currency,
        BOLD_PRODUCTION_CONFIG.secretKey
      );

      // Generate production Bold Checkout URL for merchant FFVSR3C7Y1
      const encodedDesc = encodeURIComponent(description || 'Recarga de Saldo - Xorbit 360 AI');
      const checkoutUrl = `https://checkout.bold.co/payment/${BOLD_PRODUCTION_CONFIG.merchantId}?amount=${numericAmount}&currency=${currency}&description=${encodedDesc}&reference=${orderId}&apiKey=${encodeURIComponent(
        BOLD_PRODUCTION_CONFIG.apiKey
      )}&integritySignature=${signature}&callbackUrl=${encodeURIComponent(
        'https://crm.xorbit360.com/#/recargas'
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
