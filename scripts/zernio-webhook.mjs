#!/usr/bin/env node
// scripts/zernio-webhook.mjs
// Script oficial para registrar y verificar el webhook de Zernio por API (Prompt 4)
//
// Uso:
//   node scripts/zernio-webhook.mjs                       -> Lista los existentes y fallos
//   node scripts/zernio-webhook.mjs --url https://tu.app  -> Crea o actualiza buscando por nombre
//   node scripts/zernio-webhook.mjs --url ... --test      -> Dispara un webhook.test

import https from 'https';

const API_KEY = process.env.ZERNIO_API_KEY;
const WEBHOOK_SECRET = process.env.ZERNIO_WEBHOOK_SECRET;
const BASE_URL = 'https://zernio.com/api/v1';

const REQUIRED_EVENTS = [
  'conversation.started',
  'message.received',
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'message.edited',
  'message.deleted',
  'account.connected',
  'account.disconnected'
];

function printHelp() {
  console.log(`
Uso de scripts/zernio-webhook.mjs:
  node scripts/zernio-webhook.mjs                      Listar webhooks existentes
  node scripts/zernio-webhook.mjs --url <URL>          Crear o actualizar webhook
  node scripts/zernio-webhook.mjs --url <URL> --test   Disparar evento de prueba (webhook.test)
`);
}

async function apiRequest(path, method = 'GET', body = null) {
  if (!API_KEY) {
    throw new Error('❌ Falta ZERNIO_API_KEY en las variables de entorno.');
  }

  const url = `${BASE_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const payload = body ? JSON.stringify(body) : undefined;

  const res = await fetch(url, {
    method,
    headers,
    body: payload
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${json.message || json.error || text}`);
  }

  return json;
}

async function main() {
  const args = process.argv.slice(2);
  let targetUrl = null;
  let isTest = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      targetUrl = args[i + 1];
      i++;
    } else if (args[i] === '--test') {
      isTest = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  console.log('📡 [Zernio Webhook CLI] Conectando con https://zernio.com/api/v1/webhooks/settings ...');

  // 1. Listar Webhooks
  const listData = await apiRequest('/webhooks/settings', 'GET');
  const webhooks = Array.isArray(listData) ? listData : (listData.data || listData.webhooks || []);

  console.log(`\n📋 Webhooks registrados actualmente (${webhooks.length}/50):`);
  if (webhooks.length === 0) {
    console.log('   (Ningún webhook registrado)');
  } else {
    for (const w of webhooks) {
      const failures = w.deliveryFailures || w.failureCount || 0;
      const statusIcon = failures >= 10 ? '🚨 APAGADO POR 10 FALLOS' : (w.isActive ? '✅ ACTIVO' : '⏸️ INACTIVO');
      console.log(`   - [${w.id || w._id}] "${w.name || 'Sin nombre'}" -> ${w.url}`);
      console.log(`     Estado: ${statusIcon} | Fallos consecutivos: ${failures}`);
      console.log(`     Eventos: ${Array.isArray(w.events) ? w.events.length : 0} suscritos`);
    }
  }

  // 2. Si no se especificó --url, terminamos el listado
  if (!targetUrl) {
    console.log('\n💡 Para registrar o actualizar tu webhook usa:');
    console.log('   node scripts/zernio-webhook.mjs --url https://crm.xorbit360.com/api/zernio/webhook\n');
    return;
  }

  // Asegurar path /api/zernio/webhook si pasaron solo el dominio
  if (!targetUrl.includes('/api/zernio/webhook')) {
    targetUrl = targetUrl.replace(/\/+$/, '') + '/api/zernio/webhook';
  }

  const webhookName = 'expertecom-production-webhook';
  const existing = webhooks.find(w => w.name === webhookName || w.url === targetUrl);

  const payload = {
    name: webhookName,
    url: targetUrl,
    secret: WEBHOOK_SECRET || undefined,
    events: REQUIRED_EVENTS
  };

  if (existing && (existing.id || existing._id)) {
    const id = existing.id || existing._id;
    console.log(`\n🔄 Actualizando suscripción existente [${id}] para evitar duplicados...`);
    const updateRes = await apiRequest(`/webhooks/settings/${id}`, 'PUT', payload);
    console.log('✅ Webhook actualizado con éxito:', updateRes);
  } else {
    console.log(`\n✨ Creando nueva suscripción única para ${targetUrl}...`);
    const createRes = await apiRequest('/webhooks/settings', 'POST', payload);
    console.log('✅ Webhook creado con éxito:', createRes);
  }

  // 3. Test si se solicitó
  if (isTest) {
    console.log('\n🧪 Disparando evento de prueba (webhook.test)...');
    try {
      const testRes = await apiRequest('/webhooks/test', 'POST', { url: targetUrl });
      console.log('✅ Test disparado:', testRes);
    } catch (err) {
      console.warn('⚠️ No se pudo disparar test directo o endpoint no disponible:', err.message);
    }
  }

  console.log('\n🚀 Verificación completada.');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
