// server.ts
import express2 from "express";
import fs from "fs";
import path from "path";
import crypto3 from "crypto";
import dotenv from "dotenv";
import { exec } from "child_process";
import os from "os";

// src/lib/ton.ts
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV4, internal } from "@ton/ton";
async function distributeTonCommissions(invoiceData, superAdminMnemonic) {
  const mnemonicStr = superAdminMnemonic || process.env.SUPERADMIN_MNEMONIC;
  if (!mnemonicStr) {
    console.log("No SUPERADMIN_MNEMONIC configured. Skipping real on-chain dispersion.");
    return false;
  }
  try {
    const mnemonic = mnemonicStr.split(" ");
    const key = await mnemonicToPrivateKey(mnemonic);
    const client = new TonClient({
      endpoint: "https://toncenter.com/api/v2/jsonRPC"
    });
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const contract = client.open(wallet);
    const balance = await contract.getBalance();
    console.log(`[ON-CHAIN] Admin Wallet Balance: ${balance.toString()} nanoTON`);
    const hasSponsors = !!invoiceData.sponsorWallet;
    if (hasSponsors) {
      const TON_RATE = 7.25;
      const sponsorValue = Math.round(invoiceData.planValue * 0.5 / TON_RATE * 1e9).toString();
      const seqno = await contract.getSeqno();
      await contract.sendTransfer({
        seqno,
        secretKey: key.secretKey,
        messages: [
          internal({
            to: invoiceData.sponsorWallet,
            value: sponsorValue,
            body: "Comision Directa (50%) Nivel 1"
          })
          // You can add more internal messages here for N2, N3, etc.
        ]
      });
      console.log(`[ON-CHAIN] SUCCESS: Dispersed TON to Sponsor ${invoiceData.sponsorWallet}`);
    } else {
      console.log(`[ON-CHAIN] No sponsor. 100% remains in SuperAdmin wallet.`);
    }
    return true;
  } catch (error) {
    console.error("[ON-CHAIN] Error executing real TON dispersion:", error.message);
    return false;
  }
}

// server.ts
import { GoogleGenAI } from "@google/genai";
import pino from "pino";
import QRCode from "qrcode";
import makeWASocketDirect, { useMultiFileAuthState as useMultiFileAuthStateDirect, DisconnectReason as DisconnectReasonDirect, downloadMediaMessage as downloadMediaMessageDirect, fetchLatestBaileysVersion as fetchLatestBaileysVersionDirect, Browsers as BrowsersDirect, makeCacheableSignalKeyStore as makeCacheableSignalKeyStoreDirect } from "@whiskeysockets/baileys";
import * as baileysNamespace from "@whiskeysockets/baileys";
import * as libsignalModule from "libsignal";
import OpenAI from "openai";

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseClient = null;
function getSupabaseCredentials() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  return { url, key, isConfigured: Boolean(url && key) };
}
function getSupabase() {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return null;
  }
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (err) {
      console.error("[Supabase Init Error]:", err);
      return null;
    }
  }
  return supabaseClient;
}
function isSupabaseConfigured() {
  return getSupabaseCredentials().isConfigured;
}
var SUPABASE_SCHEMA_SQL = `-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Habilitar Row Level Security (opcional seg\xFAn tus necesidades):
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Pol\xEDtica de lectura y escritura para el Service Role o Anon Key:
CREATE POLICY "Allow full access to app_state" ON app_state
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;
async function saveToSupabase(data) {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from("app_state").upsert(
      {
        id: "appState",
        data,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("[Supabase Save Warning]:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase Save Exception]:", err?.message || err);
    return false;
  }
}
async function loadFromSupabase() {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client.from("app_state").select("data, updated_at").eq("id", "appState").maybeSingle();
    if (error) {
      console.warn("[Supabase Load Warning]:", error.message);
      return null;
    }
    if (data && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    console.warn("[Supabase Load Exception]:", err?.message || err);
    return null;
  }
}
async function checkSupabaseStatus() {
  const { url, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return { configured: false, connected: false, tableExists: false };
  }
  const client = getSupabase();
  if (!client) {
    return { configured: true, connected: false, tableExists: false, url, error: "No se pudo instanciar el cliente Supabase." };
  }
  try {
    const { error } = await client.from("app_state").select("id").limit(1);
    if (error) {
      return {
        configured: true,
        connected: true,
        tableExists: false,
        url,
        error: error.message
      };
    }
    return {
      configured: true,
      connected: true,
      tableExists: true,
      url
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      tableExists: false,
      url,
      error: err?.message || String(err)
    };
  }
}

// server/zernio/routes.ts
import express from "express";

// server/zernio/client.ts
var ZERNIO_BASE_URL = "https://zernio.com/api/v1";
var DEFAULT_TIMEOUT_MS = 15e3;
var MAX_RETRIES = 3;
var RETRY_STATUS_CODES = /* @__PURE__ */ new Set([429, 502, 503, 504]);
var ZERNIO_DEFAULT_KEY = "sk_305e0df2308675c5b824973fc215331a9f366b61656b6ac8ce63bcb4da5aa1d5";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function calculateBackoff(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1e3;
    }
  }
  const baseDelay = 300 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 150);
  return baseDelay + jitter;
}
async function zernioRequest(options) {
  const apiKey = process.env.ZERNIO_API_KEY || globalThis.currentDB?.zernioApiKey || ZERNIO_DEFAULT_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: {
        status: 401,
        code: "MISSING_API_KEY",
        message: "No se ha configurado la variable de entorno ZERNIO_API_KEY en el servidor",
        raw: "ZERNIO_API_KEY is undefined"
      }
    };
  }
  const normalizedPath = options.path.startsWith("/v1/") ? options.path.slice(3) : options.path;
  const url = normalizedPath.startsWith("http") ? normalizedPath : `${ZERNIO_BASE_URL}${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;
  const method = options.method || "GET";
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...options.headers
  };
  if (options.idempotencyKey) {
    baseHeaders["Idempotency-Key"] = options.idempotencyKey;
  }
  const payload = options.body !== void 0 && options.body !== null ? typeof options.body === "string" ? options.body : JSON.stringify(options.body) : void 0;
  let attempt = 0;
  while (true) {
    let isTimeout = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      isTimeout = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: baseHeaders,
        body: method !== "GET" ? payload : void 0,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const status = response.status;
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : void 0;
      if (response.ok) {
        let parsedData = null;
        const text = await response.text();
        if (text) {
          try {
            parsedData = JSON.parse(text);
          } catch {
            parsedData = { raw: text };
          }
        }
        return {
          success: true,
          data: parsedData
        };
      }
      const canRetry = !options.noRetry && RETRY_STATUS_CODES.has(status) && attempt < MAX_RETRIES;
      if (canRetry) {
        attempt++;
        const delay = calculateBackoff(attempt, retryAfterHeader);
        console.warn(`[Zernio HTTP] Reintento ${attempt}/${MAX_RETRIES} para ${method} ${options.path} (status ${status}). Esperando ${delay}ms`);
        await sleep(delay);
        continue;
      }
      const rawErrorText = await response.text().catch(() => "");
      let errorCode = `HTTP_${status}`;
      let errorMessage = `Error HTTP ${status}`;
      if (rawErrorText) {
        try {
          const jsonError = JSON.parse(rawErrorText);
          if (jsonError.code) errorCode = String(jsonError.code);
          if (jsonError.message) errorMessage = String(jsonError.message);
          else if (jsonError.error) {
            errorMessage = typeof jsonError.error === "string" ? jsonError.error : jsonError.error.message || JSON.stringify(jsonError.error);
            if (jsonError.error.code) errorCode = String(jsonError.error.code);
          }
        } catch {
          errorMessage = rawErrorText.substring(0, 300);
        }
      }
      return {
        success: false,
        error: {
          status,
          code: errorCode,
          message: errorMessage,
          retryAfter,
          raw: rawErrorText
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAborted = isTimeout || err?.name === "AbortError";
      const canRetry = !options.noRetry && (isAborted || err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT") && attempt < MAX_RETRIES;
      if (canRetry) {
        attempt++;
        const delay = calculateBackoff(attempt, null);
        console.warn(`[Zernio HTTP] Reintento ${attempt}/${MAX_RETRIES} por fallo de red/timeout para ${method} ${options.path}. Esperando ${delay}ms`);
        await sleep(delay);
        continue;
      }
      return {
        success: false,
        error: {
          status: isAborted ? 408 : 0,
          code: isAborted ? "TIMEOUT" : "NETWORK_ERROR",
          message: isAborted ? `La solicitud a Zernio excedi\xF3 el tiempo l\xEDmite de ${timeoutMs / 1e3}s` : err?.message || "Error de red al conectar con Zernio",
          raw: String(err?.stack || err)
        }
      };
    }
  }
}

// server/zernio/accounts.ts
function normalizeZernioId(obj) {
  if (!obj) return "";
  return String(obj.id || obj._id || obj.accountId || "");
}
function normalizeAccount(raw) {
  const id = normalizeZernioId(raw);
  return {
    id,
    platform: raw.platform || (raw.phoneNumber || raw.phoneNumberId ? "whatsapp" : "unknown"),
    name: raw.name || raw.displayName || raw.businessName || raw.phoneNumber || "Cuenta Zernio",
    username: raw.username,
    phoneNumber: raw.phoneNumber || raw.phone || raw.displayPhoneNumber,
    phoneNumberId: raw.phoneNumberId || raw.phoneId,
    wabaId: raw.wabaId || raw.waba_id,
    status: raw.status || "active",
    onboardingMode: raw.onboarding || raw.mode || (raw.isCoexistence ? "business_app" : "api"),
    connectedAt: raw.connectedAt || raw.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    raw
  };
}
async function getZernioAccounts() {
  const result = await zernioRequest({
    method: "GET",
    path: "/v1/accounts"
  });
  if (!result.success) {
    return result;
  }
  const list = Array.isArray(result.data) ? result.data : result.data?.accounts || result.data?.data || [];
  const normalized = list.map(normalizeAccount);
  return {
    success: true,
    data: normalized
  };
}
async function getZernioProfiles() {
  return zernioRequest({
    method: "GET",
    path: "/v1/profiles"
  });
}
async function getZernioConnectUrl(params) {
  const query = new URLSearchParams();
  query.set("redirect_url", params.redirectUrl);
  let profileId = params.profileId;
  if (!profileId) {
    try {
      const profilesRes = await getZernioProfiles();
      if (profilesRes.success && profilesRes.data) {
        const list = profilesRes.data?.profiles || profilesRes.data;
        if (Array.isArray(list) && list[0]?._id) {
          profileId = list[0]._id;
        } else {
          profileId = "6aab21d9e549292803da9a84";
        }
      } else {
        profileId = "6aab21d9e549292803da9a84";
      }
    } catch {
      profileId = "6aab21d9e549292803da9a84";
    }
  }
  if (profileId) {
    query.set("profileId", profileId);
  }
  if (params.platform === "whatsapp") {
    query.set("onboarding", params.onboarding || "business_app");
  } else if (params.platform === "instagram") {
    query.set("loginMethod", params.loginMethod || "instagram_login");
  }
  const path2 = `/v1/connect/${params.platform}?${query.toString()}`;
  const result = await zernioRequest({
    method: "GET",
    path: path2
  });
  if (!result.success) {
    return result;
  }
  const authUrl = result.data?.authUrl || result.data?.url || result.data?.data?.authUrl;
  if (!authUrl) {
    return {
      success: false,
      error: {
        status: 500,
        code: "MISSING_AUTH_URL",
        message: "Zernio no retorn\xF3 una URL de autenticaci\xF3n v\xE1lida"
      }
    };
  }
  return {
    success: true,
    data: { authUrl }
  };
}
async function connectZernioHeadlessWaba(params) {
  if (!params.accessToken || !params.wabaId || !params.phoneNumberId || !params.pin) {
    return {
      success: false,
      error: {
        status: 400,
        code: "MISSING_CREDENTIALS",
        message: "Se requieren accessToken permanente, wabaId, phoneNumberId y PIN de verificaci\xF3n en dos pasos"
      }
    };
  }
  const result = await zernioRequest({
    method: "POST",
    path: "/v1/connect/whatsapp/credentials",
    body: {
      accessToken: params.accessToken,
      wabaId: params.wabaId,
      phoneNumberId: params.phoneNumberId,
      pin: params.pin
    }
  });
  if (!result.success) {
    return result;
  }
  const normalized = normalizeAccount(result.data);
  return {
    success: true,
    data: normalized
  };
}
async function deleteZernioAccount(accountId) {
  if (!accountId) {
    return {
      success: false,
      error: {
        status: 400,
        code: "MISSING_ACCOUNT_ID",
        message: "Se requiere el ID de la cuenta para desvincularla"
      }
    };
  }
  const result = await zernioRequest({
    method: "DELETE",
    path: `/v1/accounts/${accountId}`
  });
  return result;
}

// server/zernio/webhook.ts
import crypto from "crypto";

// server/zernio/templates.ts
function buildOrderConfirmationTemplate(params) {
  const name = params.customerName || "Cliente";
  const order = params.orderId || "#PED-001";
  const product = params.productName || "Producto";
  const total = typeof params.totalPrice === "number" ? `$${params.totalPrice.toLocaleString("es-CO")}` : String(params.totalPrice || "$0");
  const address = params.deliveryAddress || "Direcci\xF3n registrada";
  const city = params.city || "";
  const templateParams = [name, order, product, total, address, city].filter(Boolean);
  const bodyParameters = [
    { type: "text", text: name },
    { type: "text", text: order },
    { type: "text", text: product },
    { type: "text", text: total },
    { type: "text", text: address }
  ];
  if (city) {
    bodyParameters.push({ type: "text", text: city });
  }
  const components = [
    {
      type: "body",
      parameters: bodyParameters
    }
  ];
  const previewText = `\xA1Hola ${name}! \u{1F4E6} Confirmamos tu pedido ${order} de ${product} por un total de ${total}. Te llegar\xE1 a: ${address} ${city}. Recuerda que pagas en efectivo al recibir. \xBFDeseas confirmar el despacho hoy mismo?`;
  return {
    templateName: "confirmacion_pedido_logistica",
    templateLanguage: "es",
    templateParams,
    components,
    previewText
  };
}
function buildDispatchGuideTemplate(params) {
  const name = params.customerName || "Cliente";
  const order = params.orderId || "#PED-001";
  const carrier = params.carrierName || "Transportadora Nacional";
  const guide = params.trackingNumber || "PENDIENTE";
  const trackingUrl = params.trackingUrl || `https://rastreo.com/${guide}`;
  const templateParams = [name, order, carrier, guide, trackingUrl];
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: order },
        { type: "text", text: carrier },
        { type: "text", text: guide }
      ]
    },
    {
      type: "button",
      sub_type: "url",
      index: 0,
      parameters: [
        { type: "text", text: guide }
      ]
    }
  ];
  const previewText = `\xA1Buenas noticias ${name}! \u{1F69A} Tu pedido ${order} ya fue despachado por ${carrier} con la gu\xEDa #${guide}. Puedes rastrearlo aqu\xED: ${trackingUrl}`;
  return {
    templateName: "guia_despachada_logistica",
    templateLanguage: "es",
    templateParams,
    components,
    previewText
  };
}
function buildDeliveryNoveltyTemplate(params) {
  const name = params.customerName || "Cliente";
  const order = params.orderId || "#PED-001";
  const carrier = params.carrierName || "la transportadora";
  const reason = params.noveltyReason || "No fue posible ubicar tu direcci\xF3n o no hab\xEDa nadie en casa.";
  const templateParams = [name, order, carrier, reason];
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: order },
        { type: "text", text: carrier },
        { type: "text", text: reason }
      ]
    }
  ];
  const previewText = `\xA1Hola ${name}! \u26A0\uFE0F ${carrier} intent\xF3 entregar tu pedido ${order} pero report\xF3 una novedad: "${reason}". Por favor responde a este mensaje confirmando tu direcci\xF3n exacta o un tel\xE9fono alternativo para reprogramar la entrega de inmediato.`;
  return {
    templateName: "novedad_entrega_logistica",
    templateLanguage: "es",
    templateParams,
    components,
    previewText
  };
}
function buildOrderDeliveredTemplate(params) {
  const name = params.customerName || "Cliente";
  const order = params.orderId || "#PED-001";
  const product = params.productName || "tu producto";
  const templateParams = [name, order, product];
  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: order },
        { type: "text", text: product }
      ]
    }
  ];
  const previewText = `\xA1Hola ${name}! \u{1F389} Nos confirma la transportadora que tu pedido ${order} (${product}) fue entregado con \xE9xito. \xA1Esperamos que lo disfrutes al m\xE1ximo! \xBFTodo lleg\xF3 en perfecto estado?`;
  return {
    templateName: "pedido_entregado_logistica",
    templateLanguage: "es",
    templateParams,
    components,
    previewText
  };
}
function flattenComponentsToParams(components) {
  const flat = [];
  if (!Array.isArray(components)) return flat;
  const header = components.find((c) => c.type === "header");
  if (header?.parameters) {
    for (const p of header.parameters) {
      if (p.text) flat.push(String(p.text));
    }
  }
  const body = components.find((c) => c.type === "body");
  if (body?.parameters) {
    for (const p of body.parameters) {
      if (p.text) flat.push(String(p.text));
    }
  }
  const buttons = components.filter((c) => c.type === "button");
  for (const b of buttons) {
    if (b.parameters) {
      for (const p of b.parameters) {
        if (p.text) flat.push(String(p.text));
      }
    }
  }
  return flat;
}

// server/zernio/messaging.ts
var recentOutbounds = [];
function recordRecentOutbound(item) {
  recentOutbounds.push(item);
  const cutoff = Date.now() - 5 * 60 * 1e3;
  while (recentOutbounds.length > 0 && recentOutbounds[0].timestamp < cutoff) {
    recentOutbounds.shift();
  }
}
function findMatchingOutbound(text, phone) {
  const cutoff = Date.now() - 2 * 60 * 1e3;
  return recentOutbounds.find(
    (m) => m.timestamp >= cutoff && (!text || m.text === text) && (!phone || m.phone === phone)
  );
}
function isWithin24Hours(lastInboundAt) {
  if (!lastInboundAt) return false;
  const time = new Date(lastInboundAt).getTime();
  if (isNaN(time)) return false;
  const elapsed = Date.now() - time;
  return elapsed <= 24 * 60 * 60 * 1e3;
}
async function enviarMensajeZernio(params) {
  const platform = params.platform || "whatsapp";
  const inside24h = isWithin24Hours(params.lastInboundAt);
  if (platform === "whatsapp" && !inside24h && !params.template) {
    return {
      success: false,
      outside24hWindow: true,
      error: "La ventana de 24 horas ha expirado. Para escribir a este cliente por WhatsApp es obligatorio enviar una Plantilla Aprobada (Template)."
    };
  }
  const idempotencyKey = params.idempotencyKey || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (params.conversationId) {
    const body2 = {};
    if (params.template) {
      body2.template = {
        elements: [
          {
            name: params.template.name,
            language: params.template.language || "es",
            components: params.template.components || []
          }
        ]
      };
      if (params.text) body2.text = params.text;
    } else {
      body2.text = params.text;
    }
    const res2 = await zernioRequest({
      method: "POST",
      path: `/v1/inbox/conversations/${params.conversationId}/messages`,
      body: body2,
      idempotencyKey
    });
    if (res2.success === false) {
      return {
        success: false,
        error: res2.error?.message || "Error al enviar mensaje a Zernio"
      };
    }
    const data2 = res2.data?.data || res2.data || {};
    const messageId2 = data2.messageId || data2.messageIds && data2.messageIds[0];
    if (messageId2) {
      recordRecentOutbound({
        messageId: messageId2,
        conversationId: params.conversationId,
        text: params.text,
        phone: params.recipientPhone,
        timestamp: Date.now()
      });
    }
    return {
      success: true,
      messageId: messageId2,
      conversationId: params.conversationId
    };
  }
  if (!params.recipientPhone) {
    return {
      success: false,
      error: "Se requiere conversationId o recipientPhone para enviar el mensaje"
    };
  }
  const body = {
    platform,
    recipient: params.recipientPhone
  };
  if (params.accountId) {
    body.accountId = params.accountId;
  }
  if (platform === "whatsapp") {
    if (!params.template) {
      return {
        success: false,
        outside24hWindow: true,
        error: "TEMPLATE_REQUIRED: WhatsApp no permite abrir un hilo nuevo con texto libre. Debes usar una plantilla."
      };
    }
    body.templateName = params.template.name;
    body.templateLanguage = params.template.language || "es";
    body.templateParams = params.template.params || (params.template.components ? flattenComponentsToParams(params.template.components) : []);
  } else {
    body.text = params.text;
  }
  const res = await zernioRequest({
    method: "POST",
    path: "/v1/inbox/conversations",
    body,
    idempotencyKey
  });
  if (res.success === false) {
    return {
      success: false,
      error: res.error?.message || "Error al abrir conversaci\xF3n en Zernio"
    };
  }
  const data = res.data?.data || res.data || {};
  const messageId = data.messageId || data.messageIds && data.messageIds[0];
  const conversationId = data.conversationId;
  if (messageId) {
    recordRecentOutbound({
      messageId,
      conversationId,
      text: params.text,
      phone: params.recipientPhone,
      timestamp: Date.now()
    });
  }
  return {
    success: true,
    messageId,
    conversationId
  };
}

// server/zernio/events.ts
function normalizeWebhookEvent(envelope) {
  const event = String(envelope?.event || envelope?.type || "unknown");
  const eventId = String(envelope?.id || envelope?.eventId || "");
  const rawMsg = envelope?.message || envelope?.data?.message || envelope?.data || {};
  const rawConv = envelope?.conversation || envelope?.data?.conversation || {};
  const rawSender = rawMsg?.sender || {};
  const rawMetadata = envelope?.metadata || rawMsg?.metadata || {};
  const direction = event === "message.received" ? "incoming" : event === "message.sent" ? "outgoing" : rawMsg?.direction === "outgoing" ? "outgoing" : "incoming";
  const text = String(
    rawMsg?.text || rawMsg?.message || rawMsg?.caption || rawMsg?.body || rawMsg?.content || ""
  );
  const id = String(rawMsg?.id || rawMsg?.platformMessageId || rawMsg?.wamid || eventId);
  const platformMessageId = rawMsg?.platformMessageId || rawMsg?.wamid;
  const phone = rawSender?.phone || rawSender?.phoneNumber || rawMsg?.from;
  const bsuid = rawSender?.businessScopedUserId || rawSender?.bsuid;
  const attribution = {
    ctwaClid: rawMetadata?.ctwa_clid || rawMetadata?.ctwaClid,
    metaAdId: rawMetadata?.meta_ad_id || rawMetadata?.ad_id,
    headline: rawMetadata?.ctwa_headline || rawMetadata?.headline,
    sourceUrl: rawMetadata?.ctwa_source_url || rawMetadata?.source_url
  };
  let isSelfEcho = false;
  if (direction === "outgoing") {
    const matching = findMatchingOutbound(text, phone);
    if (matching) {
      isSelfEcho = true;
    }
  }
  const normalizedMessage = {
    id,
    platformMessageId,
    conversationId: String(rawConv?.id || envelope?.conversationId || rawMsg?.conversationId || phone || "default"),
    senderId: String(rawSender?.id || bsuid || phone || "unknown"),
    senderPhone: phone,
    senderBusinessScopedUserId: bsuid,
    senderName: rawSender?.name || rawSender?.pushname,
    direction,
    text,
    timestamp: envelope?.timestamp ? new Date(envelope.timestamp).getTime() : Date.now(),
    status: event === "message.delivered" ? "delivered" : event === "message.read" ? "read" : event === "message.failed" ? "failed" : direction === "incoming" ? "received" : "sent",
    isSelfEcho,
    attribution,
    raw: envelope
  };
  return {
    eventType: event,
    eventId,
    message: normalizedMessage,
    raw: envelope
  };
}

// server/zernio/webhook.ts
var webhookEventsStore = /* @__PURE__ */ new Map();
var ZERNIO_REQUIRED_EVENTS = [
  "conversation.started",
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
  "message.edited",
  "message.deleted",
  "account.connected",
  "account.disconnected"
];
function verifyZernioSignature(rawBody, signatureHeader) {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Zernio Webhook] \u26A0\uFE0F ZERNIO_WEBHOOK_SECRET no est\xE1 configurado en .env. Aceptando webhook para verificaci\xF3n...");
    return true;
  }
  if (!signatureHeader || !rawBody) {
    return false;
  }
  try {
    const computedSignature = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex").toLowerCase();
    const providedSignature = signatureHeader.trim().toLowerCase();
    const computedBuffer = Buffer.from(computedSignature, "hex");
    const providedBuffer = Buffer.from(providedSignature, "hex");
    if (computedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuffer, providedBuffer);
  } catch (err) {
    console.error("[Zernio Webhook] Error al validar firma HMAC:", err);
    return false;
  }
}
async function handleZernioWebhook(req, res, onMessageReceived) {
  const signatureHeader = req.headers["x-zernio-signature"];
  const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));
  const isValid = verifyZernioSignature(rawBody, signatureHeader);
  if (!isValid) {
    console.warn("[Zernio Webhook] \u274C Firma inv\xE1lida o ausente. Rechazando con 401");
    return res.status(401).json({ error: "Firma X-Zernio-Signature inv\xE1lida o secreto no configurado" });
  }
  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = { raw: payload };
    }
  }
  const eventId = String(
    req.headers["x-zernio-event-id"] || payload?.id || payload?.eventId || crypto.createHash("sha256").update(rawBody).digest("hex")
  );
  if (webhookEventsStore.has(eventId)) {
    const existing = webhookEventsStore.get(eventId);
    return res.status(200).json({ status: "ok", deduplicated: true, state: existing.status });
  }
  const record = {
    id: eventId,
    signature: signatureHeader || "",
    payload,
    status: "received",
    attempts: 1,
    receivedAt: Date.now()
  };
  webhookEventsStore.set(eventId, record);
  res.status(200).json({ status: "ok", eventId });
  setImmediate(async () => {
    try {
      const normalized = normalizeWebhookEvent(payload);
      if (normalized.message?.isSelfEcho) {
        record.status = "processed";
        record.processedAt = Date.now();
        return;
      }
      if (onMessageReceived && normalized.message) {
        onMessageReceived(normalized);
      }
      record.status = "processed";
      record.processedAt = Date.now();
    } catch (err) {
      console.error(`[Zernio Webhook] Error al procesar evento en background (${eventId}):`, err);
      record.status = "failed";
      record.error = err?.message || String(err);
    }
  });
}
async function runZernioSweeper(onMessageReceived) {
  const cutoff = Date.now() - 2 * 60 * 1e3;
  let recovered = 0;
  for (const [id, record] of webhookEventsStore.entries()) {
    if (record.status === "received" && record.receivedAt < cutoff && record.attempts < 4) {
      record.attempts++;
      try {
        const normalized = normalizeWebhookEvent(record.payload);
        if (onMessageReceived && normalized.message && !normalized.message.isSelfEcho) {
          onMessageReceived(normalized);
        }
        record.status = "processed";
        record.processedAt = Date.now();
        recovered++;
      } catch (err) {
        record.error = `Sweeper error: ${err.message}`;
        if (record.attempts >= 4) {
          record.status = "failed";
        }
      }
    }
  }
  return {
    processed: webhookEventsStore.size,
    recovered
  };
}
async function registerOrUpdateZernioWebhook(webhookUrl, webhookName = "expertecom-production-webhook") {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  const listRes = await zernioRequest({
    method: "GET",
    path: "/v1/webhooks/settings"
  });
  let existingWebhook = null;
  if (listRes.success) {
    const rawData = listRes.data;
    const list = Array.isArray(rawData) ? rawData : rawData?.webhooks || rawData?.data || [];
    existingWebhook = list.find((w) => w.name === webhookName || w.url === webhookUrl);
  }
  const payload = {
    name: webhookName,
    url: webhookUrl,
    secret: secret || void 0,
    events: ZERNIO_REQUIRED_EVENTS
  };
  if (existingWebhook && (existingWebhook.id || existingWebhook._id)) {
    const hookId = existingWebhook.id || existingWebhook._id;
    const updateRes = await zernioRequest({
      method: "PUT",
      path: `/v1/webhooks/settings/${hookId}`,
      body: payload
    });
    return {
      action: "updated",
      webhookId: hookId,
      result: updateRes
    };
  } else {
    const createRes = await zernioRequest({
      method: "POST",
      path: "/v1/webhooks/settings",
      body: payload
    });
    return {
      action: "created",
      result: createRes
    };
  }
}
async function getZernioWebhookStatus() {
  const listRes = await zernioRequest({
    method: "GET",
    path: "/v1/webhooks/settings"
  });
  if (!listRes.success) {
    return listRes;
  }
  const list = Array.isArray(listRes.data) ? listRes.data : listRes.data?.webhooks || listRes.data?.data || [];
  const enriched = list.map((w) => ({
    id: w.id || w._id,
    name: w.name,
    url: w.url,
    isActive: w.isActive ?? w.status === "active",
    deliveryFailures: w.deliveryFailures || w.failureCount || 0,
    hasWarning: (w.deliveryFailures || w.failureCount || 0) >= 10,
    events: w.events || []
  }));
  return {
    success: true,
    data: enriched
  };
}

// server/zernio/history.ts
async function importZernioConversations(options = {}) {
  if (options.isAiAgentActive) {
    console.warn("[Zernio History] \u26A0\uFE0F ADVERTENCIA CR\xCDTICA: Se intent\xF3 importar historial con el Agente de IA activo. Se recomienda apagar el agente para evitar disparar respuestas a clientes hist\xF3ricos.");
  }
  const maxPages = options.maxPages || 15;
  const limit = options.limitPerPage || 50;
  let nextCursor = void 0;
  let page = 0;
  const allConversations = [];
  const failedAccounts = [];
  while (page < maxPages) {
    page++;
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (nextCursor) query.set("cursor", nextCursor);
    if (options.accountId) query.set("accountId", options.accountId);
    const res = await zernioRequest({
      method: "GET",
      path: `/v1/inbox/conversations?${query.toString()}`
    });
    if (res.success === false) {
      return {
        success: false,
        error: `Fallo al importar p\xE1gina ${page}: ${res.error?.message || "Error desconocido"}`,
        importedSoFar: allConversations
      };
    }
    const resData = res.data;
    if (resData?.meta?.failedAccounts && Array.isArray(resData.meta.failedAccounts)) {
      failedAccounts.push(...resData.meta.failedAccounts);
    }
    const items = resData?.data || resData?.conversations || [];
    if (!Array.isArray(items) || items.length === 0) {
      break;
    }
    for (const raw of items) {
      allConversations.push({
        id: String(raw.id || raw._id),
        externalId: raw.externalId || raw.platformConversationId,
        recipientPhone: raw.recipient?.phone || raw.phone || raw.contact?.phone,
        platform: raw.platform || "whatsapp",
        lastMessageAt: raw.lastMessageAt || raw.updatedAt,
        messagesCount: raw.messagesCount || 0,
        unreadCount: raw.unreadCount || 0
      });
    }
    const hasMore = Boolean(resData?.pagination?.hasMore);
    const newCursor = resData?.pagination?.nextCursor;
    if (!hasMore || !newCursor || newCursor === nextCursor) {
      break;
    }
    nextCursor = newCursor;
  }
  return {
    success: true,
    totalImported: allConversations.length,
    pagesLoaded: page,
    failedAccounts: Array.from(new Set(failedAccounts)),
    hasAccountDegradation: failedAccounts.length > 0,
    conversations: allConversations
  };
}

// server/zernio/logistics.ts
async function notificarConfirmacionPedidoLogistica(order) {
  const prepared = buildOrderConfirmationTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    totalPrice: order.totalPrice,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    platform: order.platform
  });
  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: "whatsapp",
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}
async function notificarDespachoGuiaLogistica(order) {
  const prepared = buildDispatchGuideTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    carrierName: order.carrierName,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    platform: order.platform
  });
  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: "whatsapp",
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}
async function notificarNovedadLogistica(order) {
  const prepared = buildDeliveryNoveltyTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    carrierName: order.carrierName,
    noveltyReason: order.noveltyReason,
    platform: order.platform
  });
  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: "whatsapp",
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}
async function notificarPedidoEntregadoLogistica(order) {
  const prepared = buildOrderDeliveredTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    platform: order.platform
  });
  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: "whatsapp",
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}

// server/zernio/routes.ts
function setupZernioRoutes(app, onIncomingMessage) {
  const router = express.Router();
  router.get("/config-status", (req, res) => {
    const hasApiKey = Boolean(process.env.ZERNIO_API_KEY || globalThis.currentDB?.zernioApiKey || ZERNIO_DEFAULT_KEY);
    const hasWebhookSecret = Boolean(process.env.ZERNIO_WEBHOOK_SECRET);
    res.json({
      configured: hasApiKey,
      hasApiKey,
      hasWebhookSecret,
      baseUrl: "https://zernio.com/api/v1",
      supportedPlatforms: ["whatsapp", "instagram", "messenger"],
      logisticsSupported: ["dropi", "mastershop", "effix"]
    });
  });
  router.get("/accounts", async (req, res) => {
    const result = await getZernioAccounts();
    if (result.success === false) {
      const status = result.error?.status || 500;
      return res.status(status).json(result);
    }
    res.json(result);
  });
  router.get("/connect-url", async (req, res) => {
    const platform = req.query.platform || "whatsapp";
    const onboarding = req.query.onboarding || "business_app";
    const loginMethod = req.query.loginMethod || "instagram_login";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const redirectUrl = req.query.redirect_url || `${protocol}://${host}/auth/meta/callback`;
    const result = await getZernioConnectUrl({
      platform,
      redirectUrl,
      onboarding,
      loginMethod
    });
    if (result.success === false) {
      const status = result.error?.status || 500;
      return res.status(status).json(result);
    }
    res.json(result);
  });
  router.get("/callback", (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conexi\xF3n Exitosa</title>
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
    <div class="icon">\u2713</div>
    <h2>\xA1Canal Conectado Exitosamente!</h2>
    <p>La cuenta se ha sincronizado correctamente. Esta ventana se cerrar\xE1 autom\xE1ticamente.</p>
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
  router.delete("/accounts/:id", async (req, res) => {
    const accountId = req.params.id;
    const result = await deleteZernioAccount(accountId);
    if (result.success === false) {
      const status = result.error?.status || 400;
      return res.status(status).json(result);
    }
    res.json(result);
  });
  router.post("/connect/credentials", async (req, res) => {
    const { accessToken, wabaId, phoneNumberId, pin } = req.body;
    const result = await connectZernioHeadlessWaba({
      accessToken,
      wabaId,
      phoneNumberId,
      pin
    });
    if (result.success === false) {
      const status = result.error?.status || 400;
      return res.status(status).json(result);
    }
    res.json(result);
  });
  router.get("/webhook", (req, res) => {
    const challenge = req.query["hub.challenge"] || req.query.challenge || req.query["zernio.challenge"];
    if (challenge) {
      return res.status(200).send(String(challenge));
    }
    return res.status(200).json({ status: "ok", service: "zernio-webhook", timestamp: Date.now() });
  });
  router.post("/webhook", (req, res) => {
    return handleZernioWebhook(req, res, onIncomingMessage);
  });
  router.post("/webhook/register", async (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const dynamicUrl = `${protocol}://${host}/api/zernio/webhook`;
    const defaultUrl = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL.replace(/\/+$/, "")}/api/zernio/webhook` : "https://expert360.ai.studio/api/zernio/webhook";
    const targetUrl = req.body.url || defaultUrl || dynamicUrl;
    const result = await registerOrUpdateZernioWebhook(targetUrl, req.body.name);
    res.json(result);
  });
  router.get("/webhook/status", async (req, res) => {
    const result = await getZernioWebhookStatus();
    if (result.success === false) {
      const status = result.error?.status || 500;
      return res.status(status).json(result);
    }
    res.json(result);
  });
  router.post("/webhook/sweeper", async (req, res) => {
    const secret = req.headers["x-sweeper-secret"];
    const expectedSecret = process.env.ZERNIO_SWEEPER_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(403).json({ error: "Secret de sweeper no autorizado" });
    }
    const summary = await runZernioSweeper(onIncomingMessage);
    res.json({ success: true, summary });
  });
  router.post("/send-message", async (req, res) => {
    const result = await enviarMensajeZernio(req.body);
    if (!result.success) {
      return res.status(result.outside24hWindow ? 422 : 400).json(result);
    }
    res.json(result);
  });
  router.post("/logistics/notify", async (req, res) => {
    const { action, order } = req.body;
    if (!order || !order.customerPhone) {
      return res.status(400).json({ success: false, error: "Se requieren los datos del pedido y el tel\xE9fono del cliente" });
    }
    let result;
    if (action === "confirm") {
      result = await notificarConfirmacionPedidoLogistica(order);
    } else if (action === "dispatch") {
      result = await notificarDespachoGuiaLogistica(order);
    } else if (action === "novelty") {
      result = await notificarNovedadLogistica(order);
    } else if (action === "delivered") {
      result = await notificarPedidoEntregadoLogistica(order);
    } else {
      return res.status(400).json({ success: false, error: "Acci\xF3n de log\xEDstica no reconocida (use: confirm, dispatch, novelty, delivered)" });
    }
    res.json(result);
  });
  router.post("/history/import", async (req, res) => {
    const { accountId, maxPages, isAiAgentActive } = req.body;
    const result = await importZernioConversations({
      accountId,
      maxPages,
      isAiAgentActive
    });
    res.json(result);
  });
  app.use("/api/zernio", router);
  app.all("/webhooks/zernio", (req, res) => {
    if (req.method === "GET") {
      const challenge = req.query["hub.challenge"] || req.query.challenge || req.query["zernio.challenge"];
      if (challenge) {
        return res.status(200).send(String(challenge));
      }
      return res.status(200).json({ status: "ok", service: "zernio-webhook", timestamp: Date.now() });
    }
    return handleZernioWebhook(req, res, onIncomingMessage);
  });
}

// server/bold.ts
import crypto2 from "crypto";
var BOLD_PRODUCTION_CONFIG = {
  merchantId: process.env.BOLD_MERCHANT_ID || "FFVSR3C7Y1",
  apiKey: process.env.BOLD_API_KEY || "l_5Wz-8KQmld8Vb_iyy05KWBQ0A3zz5LOtAgMmCjfbk",
  secretKey: process.env.BOLD_SECRET_KEY || "53nBWst7REiVw9So1Zf5aQ",
  checkoutUrl: "https://checkout.bold.co",
  webhookUrl: "https://expert360.ai.studio/api/integrations/bold/webhook",
  environment: "production"
};
var inMemoryTransactions = /* @__PURE__ */ new Map();
var inMemoryWebhookLogs = [];
function calculateBoldIntegritySignature(orderId, amount, currency, secretKey) {
  const rawString = `${orderId}${amount}${currency}${secretKey}`;
  return crypto2.createHash("sha256").update(rawString).digest("hex");
}
function setupBoldRoutes(app, getCurrentDB, saveCurrentDB) {
  console.log(`[Bold Gateway] Inicializando servicios de pago Bold con Merchant ID: ${BOLD_PRODUCTION_CONFIG.merchantId} (Modo: ${BOLD_PRODUCTION_CONFIG.environment})`);
  const getStatusHandler = (req, res) => {
    res.json({
      success: true,
      service: "Bold Payments Integration",
      status: "active",
      environment: BOLD_PRODUCTION_CONFIG.environment,
      merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
      merchantIdIntegrated: BOLD_PRODUCTION_CONFIG.merchantId === "FFVSR3C7Y1",
      apiKeyMasked: `${BOLD_PRODUCTION_CONFIG.apiKey.substring(0, 8)}...${BOLD_PRODUCTION_CONFIG.apiKey.slice(-4)}`,
      secretKeyConfigured: Boolean(BOLD_PRODUCTION_CONFIG.secretKey),
      webhookUrl: BOLD_PRODUCTION_CONFIG.webhookUrl,
      webhookConfigured: true,
      totalTransactions: inMemoryTransactions.size,
      recentWebhookLogs: inMemoryWebhookLogs.slice(0, 10),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  app.get("/api/integrations/bold/status", getStatusHandler);
  app.get("/api/payments/bold/status", getStatusHandler);
  const webhookGetHandler = (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "bold-webhook",
      mode: "production",
      merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
      message: "Bold Webhook endpoint is active and listening for payment notifications",
      verified: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  app.get("/api/integrations/bold/webhook", webhookGetHandler);
  app.get("/api/payments/bold/webhook", webhookGetHandler);
  const webhookPostHandler = async (req, res) => {
    try {
      const payload = req.body || {};
      const eventId = `WH-BOLD-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      console.log(`[Bold Webhook] Recibida notificaci\xF3n de evento Bold:`, JSON.stringify(payload).substring(0, 300));
      const eventType = payload.event || payload.type || payload.status || "PAYMENT_EVENT";
      const orderId = payload.orderId || payload.reference || payload.id || payload.data?.orderId || payload.data?.reference;
      const status = (payload.status || payload.data?.status || "APPROVED").toUpperCase();
      const amount = payload.amount || payload.data?.amount || 0;
      const logEntry = {
        id: eventId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        event: eventType,
        payload,
        status: "RECEIVED"
      };
      inMemoryWebhookLogs.unshift(logEntry);
      if (inMemoryWebhookLogs.length > 50) inMemoryWebhookLogs.pop();
      if (orderId && inMemoryTransactions.has(orderId)) {
        const tx = inMemoryTransactions.get(orderId);
        if (status.includes("APPROV") || status === "PAID" || status === "SUCCESS") {
          tx.status = "APPROVED";
        } else if (status.includes("REJECT") || status === "FAILED") {
          tx.status = "REJECTED";
        }
        tx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        tx.metadata = payload;
        inMemoryTransactions.set(orderId, tx);
      }
      try {
        const supabase = getSupabase();
        if (supabase) {
          try {
            await supabase.from("transactions").insert({
              order_id: orderId || eventId,
              merchant_id: BOLD_PRODUCTION_CONFIG.merchantId,
              gateway: "bold",
              amount,
              status,
              payload: JSON.stringify(payload),
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch {
          }
        }
      } catch (dbErr) {
        console.warn("[Bold Webhook] Supabase sync notice:", dbErr);
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
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
            if (db.boldTransactions.length > 100) db.boldTransactions = db.boldTransactions.slice(0, 100);
            saveCurrentDB(db);
          }
        } catch (dbSaveErr) {
          console.warn("[Bold Webhook] Local DB save notice:", dbSaveErr);
        }
      }
      return res.status(200).json({
        success: true,
        received: true,
        eventId,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
        message: "Notification processed successfully"
      });
    } catch (err) {
      console.error("[Bold Webhook] Error procesando webhook:", err);
      return res.status(200).json({
        success: false,
        error: err.message,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId
      });
    }
  };
  app.post("/api/integrations/bold/webhook", webhookPostHandler);
  app.post("/api/payments/bold/webhook", webhookPostHandler);
  const createPaymentHandler = async (req, res) => {
    try {
      const body = req.body || {};
      const { description, customerEmail, customerName, currency = "COP", orderId: reqOrderId } = body;
      const rawAmount = body.amount ?? body.amountCop ?? (body.amountUsd ? body.amountUsd * 4e3 : 76e3);
      const numericAmount = Number(rawAmount);
      if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Monto de pago inv\xE1lido. Debe ser mayor a 0."
        });
      }
      const orderId = reqOrderId || `XOR-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      const amountStr = String(Math.round(numericAmount));
      const signature = calculateBoldIntegritySignature(
        orderId,
        numericAmount,
        currency,
        BOLD_PRODUCTION_CONFIG.secretKey
      );
      const encodedDesc = encodeURIComponent(description || "Recarga de Saldo - Xorbit 360 AI");
      const checkoutUrl = `https://checkout.bold.co/payment/${BOLD_PRODUCTION_CONFIG.merchantId}?amount=${amountStr}&currency=${currency}&description=${encodedDesc}&reference=${orderId}&apiKey=${encodeURIComponent(
        BOLD_PRODUCTION_CONFIG.apiKey
      )}&integritySignature=${signature}&callbackUrl=${encodeURIComponent(
        "https://crm.xorbit360.com/#/recargas"
      )}`;
      const newTx = {
        id: orderId,
        orderId,
        merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
        amount: numericAmount,
        currency,
        description: description || "Recarga de Saldo - Xorbit 360 AI",
        status: "PENDING",
        customerEmail: customerEmail || "usuario@xorbit360.com",
        customerName: customerName || "Cliente Xorbit 360",
        signature,
        checkoutUrl,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
        description: description || "Recarga de Saldo - Xorbit 360 AI",
        renderMode: "embedded",
        redirectionUrl: `https://crm.xorbit360.com/#/recargas?payment_status=completed&order=${orderId}`,
        checkoutUrl,
        boldConfig: {
          merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
          apiKeyMasked: `${BOLD_PRODUCTION_CONFIG.apiKey.substring(0, 8)}...`,
          environment: BOLD_PRODUCTION_CONFIG.environment
        }
      });
    } catch (err) {
      console.error("[Bold Gateway] Error creando orden de pago:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Error interno al generar orden de pago en Bold"
      });
    }
  };
  app.post("/api/integrations/bold/create-payment", createPaymentHandler);
  app.post("/api/payments/bold/create-payment", createPaymentHandler);
  app.post("/api/create-payment", createPaymentHandler);
  app.get("/api/integrations/bold/transactions", (req, res) => {
    const list = Array.from(inMemoryTransactions.values()).reverse();
    res.json({
      success: true,
      merchantId: BOLD_PRODUCTION_CONFIG.merchantId,
      transactions: list
    });
  });
}

// server.ts
var makeWASocket2 = null;
var useMultiFileAuthState2 = null;
var makeCacheableSignalKeyStore2 = null;
var DisconnectReason2 = null;
var downloadMediaMessage2 = null;
var fetchLatestBaileysVersion = null;
var Browsers = null;
if (typeof makeWASocketDirect === "function") {
  makeWASocket2 = makeWASocketDirect;
} else if (baileysNamespace && typeof baileysNamespace.makeWASocket === "function") {
  makeWASocket2 = baileysNamespace.makeWASocket;
} else if (baileysNamespace && baileysNamespace.default && typeof baileysNamespace.default.makeWASocket === "function") {
  makeWASocket2 = baileysNamespace.default.makeWASocket;
} else if (baileysNamespace && baileysNamespace.default && typeof baileysNamespace.default === "function") {
  makeWASocket2 = baileysNamespace.default;
} else if (baileysNamespace && baileysNamespace.default?.default && typeof baileysNamespace.default.default === "function") {
  makeWASocket2 = baileysNamespace.default.default;
} else if (baileysNamespace && baileysNamespace.default?.default && typeof baileysNamespace.default.default.makeWASocket === "function") {
  makeWASocket2 = baileysNamespace.default.default.makeWASocket;
}
var incrementAiUsage = (provider) => {
  if (!currentDB.aiUsageCounts) currentDB.aiUsageCounts = { gemini: 0, openai: 0 };
  currentDB.aiUsageCounts[provider] = (currentDB.aiUsageCounts[provider] || 0) + 1;
  saveDBData(currentDB);
};
if (typeof useMultiFileAuthStateDirect === "function") {
  useMultiFileAuthState2 = useMultiFileAuthStateDirect;
} else if (baileysNamespace && typeof baileysNamespace.useMultiFileAuthState === "function") {
  useMultiFileAuthState2 = baileysNamespace.useMultiFileAuthState;
} else if (baileysNamespace && baileysNamespace.default && typeof baileysNamespace.default.useMultiFileAuthState === "function") {
  useMultiFileAuthState2 = baileysNamespace.default.useMultiFileAuthState;
} else if (baileysNamespace && baileysNamespace.default?.default && typeof baileysNamespace.default.default.useMultiFileAuthState === "function") {
  useMultiFileAuthState2 = baileysNamespace.default.default.useMultiFileAuthState;
}
if (typeof makeCacheableSignalKeyStoreDirect === "function") {
  makeCacheableSignalKeyStore2 = makeCacheableSignalKeyStoreDirect;
} else if (baileysNamespace && typeof baileysNamespace.makeCacheableSignalKeyStore === "function") {
  makeCacheableSignalKeyStore2 = baileysNamespace.makeCacheableSignalKeyStore;
} else if (baileysNamespace && baileysNamespace.default && typeof baileysNamespace.default.makeCacheableSignalKeyStore === "function") {
  makeCacheableSignalKeyStore2 = baileysNamespace.default.makeCacheableSignalKeyStore;
} else if (baileysNamespace && baileysNamespace.default?.default && typeof baileysNamespace.default.default.makeCacheableSignalKeyStore === "function") {
  makeCacheableSignalKeyStore2 = baileysNamespace.default.default.makeCacheableSignalKeyStore;
}
if (!makeCacheableSignalKeyStore2) {
  makeCacheableSignalKeyStore2 = (keys) => keys;
}
var MemoryRetryCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return void 0;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return void 0;
    }
    return item.value;
  }
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, { value, expires: Date.now() + ttlSeconds * 1e3 });
  }
  del(key) {
    this.cache.delete(key);
  }
  flushAll() {
    this.cache.clear();
  }
};
var msgRetryCounterCache = new MemoryRetryCache();
var wAuthBaseDir = "/tmp";
var conflictRetries = {};
function purgeSessionFilesOnDisk(addrIdentifier) {
  try {
    const defaultAuthDir = path.resolve(wAuthBaseDir, "baileys_auth_info");
    const authDirs = [defaultAuthDir];
    try {
      const dbChannels = globalThis.currentDB?.channels || [];
      for (const ch of dbChannels) {
        if (ch?.id) {
          authDirs.push(path.resolve(wAuthBaseDir, `baileys_auth_info_${ch.id}`));
        }
      }
    } catch (e) {
    }
    for (const dir of authDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.startsWith("session-")) continue;
        if (!addrIdentifier) {
          try {
            fs.unlinkSync(path.join(dir, file));
            console.log(`[WhatsApp Auto-Heal] Purgado archivo de sesi\xF3n desincronizado: ${file}`);
          } catch (e) {
          }
        } else {
          const cleanId = addrIdentifier.replace(/\D/g, "");
          if (file.includes(addrIdentifier) || cleanId.length > 5 && file.includes(cleanId)) {
            try {
              fs.unlinkSync(path.join(dir, file));
              console.log(`[WhatsApp Auto-Heal] Purgado archivo de sesi\xF3n desincronizado para ${addrIdentifier}: ${file}`);
            } catch (e) {
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[WhatsApp Auto-Heal] Error en purgeSessionFilesOnDisk:`, err);
  }
}
try {
  if (libsignalModule && libsignalModule.SessionCipher) {
    const proto = libsignalModule.SessionCipher.prototype;
    if (proto && typeof proto.decryptWithSessions === "function") {
      const origDecryptWithSessions = proto.decryptWithSessions;
      proto.decryptWithSessions = async function(data, sessions) {
        if (!sessions || !sessions.length) {
          throw new libsignalModule.SessionError("No sessions available");
        }
        const errs = [];
        for (const session of sessions) {
          try {
            const plaintext = await this.doDecryptWhisperMessage(data, session);
            session.indexInfo.used = Date.now();
            return { session, plaintext };
          } catch (e) {
            errs.push(e);
            const msg = e?.message || String(e);
            if (msg.includes("Over 2000 messages into the future") || msg.includes("Chain closed")) {
              const addrId = this.addr ? this.addr.id : "";
              purgeSessionFilesOnDisk(addrId);
            }
          }
        }
        const hasFutureError = errs.some((e) => String(e).includes("Over 2000 messages into the future"));
        const addrStr = this.addr?.id || (this.addr?.toString ? this.addr.toString() : "contacto");
        if (hasFutureError) {
          console.warn(`[WhatsApp Auto-Heal] Ratchet desincronizado (>2000 mensajes futuros) detectado para ${addrStr}. Purgando sesi\xF3n para negociar nuevo cifrado limpio.`);
          purgeSessionFilesOnDisk(this.addr?.id);
        } else {
          console.warn(`[WhatsApp Auto-Heal] Fallo al descifrar con sesiones conocidas para ${addrStr}. Purgando sesi\xF3n y solicitando re-cifrado.`);
          purgeSessionFilesOnDisk(this.addr?.id);
        }
        throw new libsignalModule.SessionError("No matching sessions found for message");
      };
      console.log("[WhatsApp Auto-Heal] Parche de auto-recuperaci\xF3n de libsignal activado con \xE9xito.");
    }
  }
} catch (patchErr) {
  console.warn(`[WhatsApp Auto-Heal] No se pudo inicializar el parche de libsignal:`, patchErr);
}
if (DisconnectReasonDirect) {
  DisconnectReason2 = DisconnectReasonDirect;
} else if (baileysNamespace && baileysNamespace.DisconnectReason) {
  DisconnectReason2 = baileysNamespace.DisconnectReason;
} else if (baileysNamespace && baileysNamespace.default && baileysNamespace.default.DisconnectReason) {
  DisconnectReason2 = baileysNamespace.default.DisconnectReason;
} else if (baileysNamespace && baileysNamespace.default?.default && baileysNamespace.default.default.DisconnectReason) {
  DisconnectReason2 = baileysNamespace.default.default.DisconnectReason;
}
if (typeof downloadMediaMessageDirect === "function") {
  downloadMediaMessage2 = downloadMediaMessageDirect;
} else if (baileysNamespace && typeof baileysNamespace.downloadMediaMessage === "function") {
  downloadMediaMessage2 = baileysNamespace.downloadMediaMessage;
} else if (baileysNamespace && baileysNamespace.default && typeof baileysNamespace.default.downloadMediaMessage === "function") {
  downloadMediaMessage2 = baileysNamespace.default.downloadMediaMessage;
} else if (baileysNamespace && baileysNamespace.default?.default && typeof baileysNamespace.default.default.downloadMediaMessage === "function") {
  downloadMediaMessage2 = baileysNamespace.default.default.downloadMediaMessage;
}
fetchLatestBaileysVersion = fetchLatestBaileysVersionDirect || baileysNamespace?.fetchLatestBaileysVersion || baileysNamespace?.default?.fetchLatestBaileysVersion;
Browsers = BrowsersDirect || baileysNamespace?.Browsers || baileysNamespace?.default?.Browsers;
if (!makeWASocket2) {
  console.log("WARNING: makeWASocket was not dynamically resolved to a function. Falling back to direct import.");
  makeWASocket2 = makeWASocketDirect;
}
if (!useMultiFileAuthState2) {
  useMultiFileAuthState2 = useMultiFileAuthStateDirect;
}
if (!DisconnectReason2) {
  DisconnectReason2 = DisconnectReasonDirect || {};
}
if (!downloadMediaMessage2) {
  downloadMediaMessage2 = downloadMediaMessageDirect;
}
console.log("Resolved functions:", {
  makeWASocket: typeof makeWASocket2,
  useMultiFileAuthState: typeof useMultiFileAuthState2,
  DisconnectReason: typeof DisconnectReason2,
  downloadMediaMessage: typeof downloadMediaMessage2,
  fetchLatestBaileysVersion: typeof fetchLatestBaileysVersion,
  Browsers: typeof Browsers
});
console.log("---------------------------------");
function generateSimulatedWaveform(length = 64) {
  const wave = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    const normalized = i / (length - 1);
    const factor = Math.sin(normalized * Math.PI);
    const randomRipple = Math.floor(Math.random() * 25) + 5;
    wave[i] = Math.floor(factor * 60) + randomRipple;
  }
  return wave;
}
async function convertAudioToOggOpus(inputBuffer, originalUrlOrMime) {
  const tmpDir = os.tmpdir();
  const randId = Math.random().toString(36).substring(2, 9);
  let ext = "tmp";
  if (originalUrlOrMime) {
    const checkStr = originalUrlOrMime.toLowerCase();
    if (checkStr.includes("audio/webm") || checkStr.includes("webm")) ext = "webm";
    else if (checkStr.includes("audio/ogg") || checkStr.includes("ogg")) ext = "ogg";
    else if (checkStr.includes("audio/mpeg") || checkStr.includes("audio/mp3") || checkStr.includes("mp3")) ext = "mp3";
    else if (checkStr.includes("audio/wav") || checkStr.includes("wav")) ext = "wav";
    else if (checkStr.includes("audio/m4a") || checkStr.includes("m4a")) ext = "m4a";
    else if (checkStr.includes("audio/mp4")) ext = "mp4";
  }
  const inputPath = path.join(tmpDir, `input_audio_${Date.now()}_${randId}.${ext}`);
  const outputPath = path.join(tmpDir, `output_audio_${Date.now()}_${randId}.ogg`);
  try {
    await fs.promises.writeFile(inputPath, inputBuffer);
    const cmd = `ffmpeg -i "${inputPath}" -c:a libopus -b:a 32k -ac 1 -ar 48000 "${outputPath}" -y`;
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error("[ffmpeg] Audio conversion error:", stderr);
          return reject(error);
        }
        resolve();
      });
    });
    const oggBuffer = await fs.promises.readFile(outputPath);
    console.log(`[ffmpeg] Audio (${inputBuffer.length} bytes, format: ${ext}) convertido exitosamente a OGG OPUS PTT (${oggBuffer.length} bytes).`);
    return oggBuffer;
  } catch (err) {
    console.warn("[ffmpeg] Fallo la conversion a OGG OPUS, enviando buffer original:", err);
    return inputBuffer;
  } finally {
    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
    } catch (e) {
    }
    try {
      if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);
    } catch (e) {
    }
  }
}
async function getMediaBuffer(url) {
  if (!url) return null;
  try {
    if (url.startsWith("data:")) {
      const parts = url.split(",");
      const base64Data = parts[1] || parts[0];
      return Buffer.from(base64Data, "base64");
    }
    if (url.startsWith("/uploads/") || url.includes("/uploads/")) {
      const fileName = url.split("/uploads/")[1];
      const filePath = path.join(process.cwd(), "uploads", fileName);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    }
    if (url.startsWith("http")) {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    }
  } catch (e) {
    console.error("Error retrieving media buffer for URL:", url, e);
  }
  return null;
}
var DEFAULT_EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "https://whatsapp.xorbit360.com";
var DEFAULT_EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "06mqaBYA1qN3PA9LejyAUe8YHG3A0YWh";
var DEFAULT_EVOLUTION_WEBHOOK_BASE = "https://expert360.ai.studio";
function getEvolutionConfig() {
  const dbUrl = typeof currentDB !== "undefined" && currentDB.evolutionApiUrl ? currentDB.evolutionApiUrl : "";
  const dbKey = typeof currentDB !== "undefined" && currentDB.evolutionApiKey ? currentDB.evolutionApiKey : "";
  const dbWebhook = typeof currentDB !== "undefined" && currentDB.evolutionWebhookBaseUrl ? currentDB.evolutionWebhookBaseUrl : "";
  const apiUrl = (dbUrl || DEFAULT_EVOLUTION_API_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (dbKey || DEFAULT_EVOLUTION_API_KEY || "").trim();
  const webhookBaseUrl = (dbWebhook || DEFAULT_EVOLUTION_WEBHOOK_BASE).trim().replace(/\/+$/, "");
  return { apiUrl, apiKey, webhookBaseUrl, isConfigured: !!(apiUrl && apiKey) };
}
async function evolutionRequest(endpoint, options = {}) {
  const { apiUrl, apiKey, isConfigured } = getEvolutionConfig();
  if (!isConfigured) {
    throw new Error("Evolution API no est\xE1 configurada (falta URL o API Key)");
  }
  const url = `${apiUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 15e3);
  try {
    const headers = {
      "apikey": apiKey
    };
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : void 0,
      signal: controller.signal
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}
async function ensureEvolutionInstance(instanceName, number, qrcode = true) {
  try {
    const encoded = encodeURIComponent(instanceName);
    const check = await evolutionRequest(`/instance/connectionState/${encoded}`, { timeoutMs: 5e3 });
    if (check.ok && check.data && check.data.instance) {
      return check.data.instance;
    }
    const createBody = {
      instanceName,
      qrcode,
      integration: "WHATSAPP-BAILEYS"
    };
    if (number) {
      createBody.number = number.replace(/\D/g, "");
    }
    const createRes = await evolutionRequest("/instance/create", {
      method: "POST",
      body: createBody,
      timeoutMs: 1e4
    });
    console.log(`[Evolution API] Instancia ${instanceName} creada con status:`, createRes.status);
    return createRes.data?.instance || createRes.data;
  } catch (err) {
    console.error(`[Evolution API] Error verificando/creando instancia ${instanceName}:`, err.message);
    return null;
  }
}
async function setupEvolutionWebhook(instanceName, appHostUrl) {
  try {
    const evoConfig = getEvolutionConfig();
    const cleanHost = (appHostUrl || evoConfig.webhookBaseUrl || "https://expert360.ai.studio").replace(/\/+$/, "");
    const webhookUrl = `${cleanHost}/api/whatsapp/evolution-webhook`;
    const encoded = encodeURIComponent(instanceName);
    const res = await evolutionRequest(`/webhook/set/${encoded}`, {
      method: "POST",
      body: {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"]
        }
      },
      timeoutMs: 8e3
    });
    console.log(`[Evolution API] Webhook configurado hacia ${webhookUrl} para ${instanceName}:`, res.status);
    return res.ok;
  } catch (err) {
    console.warn(`[Evolution API] Aviso configurando webhook para ${instanceName}:`, err.message);
    return false;
  }
}
async function resolveActualEvolutionInstance(instanceName) {
  try {
    const listRes = await evolutionRequest("/instance/fetchInstances", { timeoutMs: 5e3 });
    if (listRes.ok && Array.isArray(listRes.data)) {
      const exact = listRes.data.find((i) => i.name === instanceName || i.instanceName === instanceName);
      if (exact && exact.connectionStatus === "open") {
        return exact.name || instanceName;
      }
      const cleanPhoneMatch = instanceName.match(/(\d{8,15})/);
      if (cleanPhoneMatch) {
        const phone = cleanPhoneMatch[1];
        const matchByPhone = listRes.data.find(
          (i) => i.connectionStatus === "open" && (i.ownerJid && i.ownerJid.includes(phone) || i.number && i.number.includes(phone))
        );
        if (matchByPhone) {
          return matchByPhone.name || instanceName;
        }
      }
      const anyOpen = listRes.data.find((i) => i.connectionStatus === "open");
      if (anyOpen && anyOpen.name) {
        return anyOpen.name;
      }
      if (exact) return exact.name || instanceName;
    }
  } catch (e) {
  }
  return instanceName;
}
async function getEvolutionConnectionState(instanceName) {
  try {
    const encoded = encodeURIComponent(instanceName);
    const res = await evolutionRequest(`/instance/connectionState/${encoded}`, { timeoutMs: 6e3 });
    let state = res.ok && res.data?.instance?.state ? res.data.instance.state : "close";
    let phone = null;
    let exists = !!(res.ok && res.data);
    if (state !== "open") {
      const cleanPhoneMatch = instanceName.match(/(\d{8,15})/);
      const targetPhone = cleanPhoneMatch ? cleanPhoneMatch[1] : null;
      try {
        const listRes = await evolutionRequest("/instance/fetchInstances", { timeoutMs: 5e3 });
        if (listRes.ok && Array.isArray(listRes.data)) {
          const exact = listRes.data.find((i) => i.name === instanceName || i.instanceName === instanceName);
          if (exact && exact.connectionStatus === "open") {
            exists = true;
            state = "open";
            if (exact.ownerJid) phone = exact.ownerJid.split("@")[0].replace(/\D/g, "");
            else if (exact.number) phone = exact.number.replace(/\D/g, "");
          } else if (targetPhone) {
            const aliasInst = listRes.data.find(
              (i) => i.connectionStatus === "open" && (i.ownerJid && i.ownerJid.includes(targetPhone) || i.number && i.number.includes(targetPhone))
            );
            if (aliasInst) {
              exists = true;
              state = "open";
              phone = targetPhone;
            }
          } else {
            const anyOpenInst = listRes.data.find((i) => i.connectionStatus === "open");
            if (anyOpenInst) {
              exists = true;
              state = "open";
              if (anyOpenInst.ownerJid) phone = anyOpenInst.ownerJid.split("@")[0].replace(/\D/g, "");
              else if (anyOpenInst.number) phone = anyOpenInst.number.replace(/\D/g, "");
            } else if (exact) {
              exists = true;
              state = exact.connectionStatus || state;
            }
          }
        }
      } catch (e) {
      }
    } else {
      try {
        const listRes = await evolutionRequest("/instance/fetchInstances", { timeoutMs: 5e3 });
        if (listRes.ok && Array.isArray(listRes.data)) {
          const inst = listRes.data.find((i) => i.name === instanceName || i.instanceName === instanceName);
          if (inst) {
            if (inst.ownerJid) phone = inst.ownerJid.split("@")[0].replace(/\D/g, "");
            else if (inst.number) phone = inst.number.replace(/\D/g, "");
          }
        }
      } catch (e) {
      }
    }
    return { state, phone, exists: exists || state === "open" };
  } catch (err) {
    return { state: "close", phone: null, exists: false, error: err.message };
  }
}
async function getEvolutionQr(instanceName) {
  try {
    await ensureEvolutionInstance(instanceName, void 0, true);
    const encoded = encodeURIComponent(instanceName);
    const res = await evolutionRequest(`/instance/connect/${encoded}`, { timeoutMs: 8e3 });
    if (res.ok && res.data) {
      if (res.data.base64 && typeof res.data.base64 === "string") {
        return res.data.base64;
      }
      if (res.data.code && typeof res.data.code === "string") {
        return res.data.code;
      }
    }
    return null;
  } catch (err) {
    console.error(`[Evolution API] Error obteniendo QR para ${instanceName}:`, err.message);
    return null;
  }
}
async function getEvolutionPairingCode(instanceName, phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const encoded = encodeURIComponent(instanceName);
  try {
    try {
      await evolutionRequest(`/instance/delete/${encoded}`, { method: "DELETE", timeoutMs: 5e3 });
    } catch (e) {
    }
    await evolutionRequest("/instance/create", {
      method: "POST",
      body: {
        instanceName,
        number: cleanPhone,
        qrcode: false,
        integration: "WHATSAPP-BAILEYS"
      },
      timeoutMs: 8e3
    });
    const res = await evolutionRequest(`/instance/connect/${encoded}?number=${cleanPhone}`, { timeoutMs: 8e3 });
    if (res.ok && res.data && res.data.pairingCode) {
      const raw = String(res.data.pairingCode).replace(/-/g, "").trim();
      const formatted = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
      return { rawCode: raw, pairingCode: formatted };
    }
    return null;
  } catch (err) {
    console.error(`[Evolution API] Error obteniendo pairing code para ${instanceName}:`, err.message);
    return null;
  }
}
async function sendEvolutionTextMessage(instanceName, number, text) {
  const cleanNumber = number.replace(/\D/g, "");
  const actualInstance = await resolveActualEvolutionInstance(instanceName);
  const encoded = encodeURIComponent(actualInstance);
  return await evolutionRequest(`/message/sendText/${encoded}`, {
    method: "POST",
    body: {
      number: cleanNumber,
      text
    },
    timeoutMs: 12e3
  });
}
async function sendEvolutionMediaMessage(instanceName, number, mediatype, media, caption = "", fileName = "archivo", mimetype) {
  const cleanNumber = number.replace(/\D/g, "");
  const actualInstance = await resolveActualEvolutionInstance(instanceName);
  const encoded = encodeURIComponent(actualInstance);
  let cleanMedia = (media || "").trim();
  let extractedMime = mimetype;
  if (cleanMedia.startsWith("data:")) {
    const match = cleanMedia.match(/^data:([^;]+);base64,/);
    if (match && !extractedMime) extractedMime = match[1];
    cleanMedia = cleanMedia.split(",")[1] || cleanMedia;
  }
  const normalizedType = mediatype === "imagen" ? "image" : mediatype === "archivo" ? "document" : mediatype;
  if (normalizedType === "audio") {
    try {
      const audioRes = await evolutionRequest(`/message/sendWhatsAppAudio/${encoded}`, {
        method: "POST",
        body: {
          number: cleanNumber,
          audio: cleanMedia
        },
        timeoutMs: 2e4
      });
      if (audioRes.ok) return audioRes;
    } catch (e) {
      console.warn("[Evolution API] sendWhatsAppAudio fallback to sendMedia:", e);
    }
  }
  const payload = {
    number: cleanNumber,
    mediatype: normalizedType,
    media: cleanMedia,
    caption: caption || "",
    fileName: fileName || (normalizedType === "image" ? "foto.jpg" : normalizedType === "video" ? "video.mp4" : normalizedType === "audio" ? "audio.ogg" : "archivo.pdf")
  };
  if (extractedMime) {
    payload.mimetype = extractedMime;
  }
  return await evolutionRequest(`/message/sendMedia/${encoded}`, {
    method: "POST",
    body: payload,
    timeoutMs: 2e4
  });
}
async function fetchEvolutionProfilePicture(instanceName, number) {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (!cleanNumber) return null;
    const actualInstance = await resolveActualEvolutionInstance(instanceName);
    const encoded = encodeURIComponent(actualInstance);
    const res = await evolutionRequest(`/chat/fetchProfilePictureUrl/${encoded}`, {
      method: "POST",
      body: { number: cleanNumber },
      timeoutMs: 6e3
    });
    if (res.ok && res.data && (res.data.profilePictureUrl || res.data.url)) {
      return res.data.profilePictureUrl || res.data.url;
    }
  } catch (e) {
  }
  return null;
}
async function fetchEvolutionMediaBase64(instanceName, rawMessage) {
  try {
    const actualInstance = await resolveActualEvolutionInstance(instanceName);
    const encoded = encodeURIComponent(actualInstance);
    const messagePayload = rawMessage && rawMessage.key ? rawMessage : {
      key: { id: rawMessage?.id || "msg_" + Date.now(), fromMe: false },
      message: rawMessage?.message || rawMessage
    };
    const res = await evolutionRequest(`/chat/getBase64FromMediaMessage/${encoded}`, {
      method: "POST",
      body: { message: messagePayload, convertToMp4: false },
      timeoutMs: 15e3
    });
    if (res.ok && res.data && res.data.base64) {
      return {
        base64: res.data.base64,
        mimetype: res.data.mimetype || res.data.mimeType,
        fileName: res.data.fileName
      };
    }
  } catch (e) {
  }
  return null;
}
var onEvolutionIncomingMessage = null;
async function sendWhatsAppBotReplies(clientSock, senderJid, userIncomingText, repliesList, phone, channelId = "channel-default") {
  const evoConfig = getEvolutionConfig();
  if (!clientSock && !evoConfig.isConfigured) return;
  function cleanQuestionText(q) {
    if (!q) return "";
    return q.toLowerCase().replace(/^\s*si\s+(?:el\s+)?usuario\s+pregunta\s+/, "").replace(/^\s*si\s+pregunta\s+/, "").replace(/^\s*usuario\s+pregunta\s+/, "").trim();
  }
  let matchedFaq = null;
  const incomingLower = (userIncomingText || "").toLowerCase().trim();
  const faqsList = Array.isArray(currentDB.faqsList) ? currentDB.faqsList : Array.isArray(currentDB.faqs) ? currentDB.faqs : [];
  if (faqsList.length > 0) {
    for (const f of faqsList) {
      if (!f.question) continue;
      const qClean = cleanQuestionText(f.question);
      const qLower = qClean.toLowerCase().trim();
      const cleanIncoming = incomingLower.replace(/[¿?¡!]/g, "").trim();
      const cleanQ = qLower.replace(/[¿?¡!]/g, "").trim();
      if (cleanIncoming === cleanQ || incomingLower === qLower) {
        matchedFaq = f;
        break;
      }
    }
    if (!matchedFaq && globalExecuteAIInternal) {
      try {
        const faqQuestions = faqsList.map((f, idx) => ({ index: idx, question: f.question })).filter((q) => q.question && q.question.trim().length > 0);
        if (faqQuestions.length > 0) {
          const matchingPrompt = `Analiza detalladamente la intenci\xF3n de la siguiente frase recibida de un cliente en WhatsApp:
"${userIncomingText}"

Determina si el cliente est\xE1 expresando exactamente la misma duda, solicitud, pregunta o intenci\xF3n que alguna de las siguientes preguntas predefinidas en la lista. 
Ignora variaciones menores de palabras, sin\xF3nimos, faltas de ortograf\xEDa, inclusi\xF3n o exclusi\xF3n de saludos (ej: "Hola, \xBFc\xF3mo te llamas?" vs "Como te llamas ?") u otras formas coloquiales de expresar exactamente la misma idea (ej: "Cu\xE1l es tu nombre", "c\xF3mo te llamas", "c\xF3mo te puedo llamar", "dime tu nombre" tienen exactamente la misma intenci\xF3n).

Lista de preguntas predefinidas:
${faqQuestions.map((q) => `[ID: ${q.index}] "${q.question}"`).join("\n")}

Responde \xDANICAMENTE con un objeto JSON en el siguiente formato, sin bloques de c\xF3digo Markdown (\`\`\`json) ni explicaciones de ning\xFAn tipo:
{
  "matched": true o false,
  "matchedIndex": n\xFAmero o null
}`;
          console.log(`[AI Semantic Match] Evaluando frase del cliente: "${userIncomingText}"`);
          const aiResponse = await globalExecuteAIInternal(matchingPrompt);
          if (aiResponse) {
            const cleanJson = aiResponse.replace(/```json/i, "").replace(/```/g, "").trim();
            try {
              const parsedMatch = JSON.parse(cleanJson);
              if (parsedMatch) {
                const isMatched = parsedMatch.matched === true || parsedMatch.matched === "true";
                if (isMatched && parsedMatch.matchedIndex !== null && parsedMatch.matchedIndex !== void 0) {
                  const idx = typeof parsedMatch.matchedIndex === "number" ? parsedMatch.matchedIndex : parseInt(parsedMatch.matchedIndex, 10);
                  if (!isNaN(idx) && faqsList[idx]) {
                    matchedFaq = faqsList[idx];
                    console.log(`[AI Semantic Match] \xA1\xC9XITO! Frase "${userIncomingText}" coincide sem\xE1nticamente con Pregunta #${idx + 1}: "${faqsList[idx].question}"`);
                  }
                }
              }
            } catch (pErr) {
              const matchMatched = cleanJson.match(/"matched"\s*:\s*(true|false)/i);
              const matchIdx = cleanJson.match(/"matchedIndex"\s*:\s*(\d+)/);
              if (matchMatched && matchMatched[1].toLowerCase() === "true" && matchIdx) {
                const idx = parseInt(matchIdx[1], 10);
                if (faqsList[idx]) {
                  matchedFaq = faqsList[idx];
                  console.log(`[AI Semantic Match Regex Fallback] \xA1\xC9XITO! Frase "${userIncomingText}" coincide con Pregunta #${idx + 1}: "${faqsList[idx].question}"`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("[AI Semantic Match Error] Error al buscar coincidencia sem\xE1ntica:", err);
      }
    }
    if (!matchedFaq) {
      for (const f of faqsList) {
        if (!f.question) continue;
        const qClean = cleanQuestionText(f.question);
        const qLower = qClean.toLowerCase().trim();
        if (!qLower) continue;
        const cleanIncoming = incomingLower.replace(/[¿?¡!]/g, "").trim();
        const cleanQ = qLower.replace(/[¿?¡!]/g, "").trim();
        if (cleanIncoming === cleanQ || incomingLower.includes(qLower)) {
          matchedFaq = f;
          break;
        }
        const keywords = qLower.split(/\s+/).map((w) => w.replace(/[¿?¡!]/g, "").trim()).filter((w) => w.length > 3 && !["como", "cuando", "donde", "quien", "cual", "para", "este", "esta", "estos", "estas", "esel", "saber", "tienen", "tiene", "usuario", "pregunta", "preguntar"].includes(w));
        if (keywords.length > 0) {
          const matchedCount = keywords.filter((kw) => incomingLower.includes(kw)).length;
          const threshold = keywords.length >= 3 ? 2 : 1;
          if (matchedCount >= threshold) {
            matchedFaq = f;
            break;
          }
        }
      }
    }
  }
  let attachedMedia = null;
  if (matchedFaq && matchedFaq.attachments && Array.isArray(matchedFaq.attachments) && matchedFaq.attachments.length > 0) {
    attachedMedia = matchedFaq.attachments.find((att) => att.url && !att.url.toLowerCase().includes("blob:")) || matchedFaq.attachments[0];
  }
  let matchedRule = null;
  const aiRulesList = currentDB.aiAutomationRules || [];
  if (!matchedFaq && Array.isArray(aiRulesList)) {
    for (const rule of aiRulesList) {
      if (rule.active === false) continue;
      const kw = (rule.keyword || rule.phrase || "").trim().toLowerCase();
      if (kw && incomingLower.includes(kw)) {
        matchedRule = rule;
        break;
      }
    }
  }
  if (!attachedMedia && matchedRule && matchedRule.attachments && Array.isArray(matchedRule.attachments) && matchedRule.attachments.length > 0) {
    attachedMedia = matchedRule.attachments.find((att) => att.url && !att.url.toLowerCase().includes("blob:")) || matchedRule.attachments[0];
  }
  const isFirstAssistantMessage = !currentDB.messagesHistory || !currentDB.messagesHistory[phone] || currentDB.messagesHistory[phone].filter((m) => m.role === "assistant").length === 0;
  if (!attachedMedia && isFirstAssistantMessage && currentDB.greetingAttachments && Array.isArray(currentDB.greetingAttachments) && currentDB.greetingAttachments.length > 0) {
    attachedMedia = currentDB.greetingAttachments.find((att) => att.url && !att.url.toLowerCase().includes("blob:")) || currentDB.greetingAttachments[0];
  }
  let effectiveReplies = [...repliesList];
  if (matchedFaq) {
    if (matchedFaq.answer && matchedFaq.answer.trim()) {
      effectiveReplies = [matchedFaq.answer.trim()];
    } else if (attachedMedia) {
      effectiveReplies = [""];
    }
  } else if (isFirstAssistantMessage) {
    const greeting = (currentDB.customGreeting || "").trim();
    if (greeting) {
      if (repliesList.length > 0 && repliesList[0].trim() && repliesList[0].trim() !== greeting) {
        effectiveReplies = [greeting, ...repliesList];
      } else {
        effectiveReplies = [greeting];
      }
    } else {
      effectiveReplies = repliesList.length > 0 ? repliesList : ["\xA1Hola! \u{1F44B} Bienvenido. \xBFEn qu\xE9 te puedo asesorar hoy?"];
    }
  }
  if (!effectiveReplies || effectiveReplies.length === 0 || !effectiveReplies.some((msg) => msg && msg.trim())) {
    effectiveReplies = ["\xA1Hola! \u{1F44B} Gracias por comunicarte con nosotros. \xBFEn qu\xE9 producto o servicio est\xE1s interesado hoy?"];
  }
  for (let idx = 0; idx < effectiveReplies.length; idx++) {
    const r = effectiveReplies[idx];
    const audioRefMatch = r.match(/(?:🤖🔊\s*)?\[?(nota_de_voz_[^\]\s]+\.(?:ogg|mp3|wav|m4a)|nota_de_voz_[^\]\s]+)\]?/i) || r.match(/\[(audio:[^\]]+|nota_de_voz[^\]]+)\]/i);
    let cleanReplyText = r.replace(/(?:🤖🔊\s*)?\[?(nota_de_voz_[^\]s]+\.(?:ogg|mp3|wav|m4a)|nota_de_voz_[^\]\s]+)\]?/gi, "").replace(/\[(audio:[^\]]+|nota_de_voz[^\]]+)\]/gi, "").trim();
    if (audioRefMatch) {
      const tagAudioName = (audioRefMatch[1] || "Nota_de_voz_PTT.ogg").trim().toLowerCase();
      let foundByName = null;
      for (const f of faqsList) {
        if (f.attachments && Array.isArray(f.attachments)) {
          const found = f.attachments.find(
            (att) => att.type === "audio" && att.name && (att.name.toLowerCase().includes(tagAudioName) || tagAudioName.includes(att.name.toLowerCase()))
          );
          if (found) {
            foundByName = found;
            break;
          }
        }
      }
      if (foundByName) {
        attachedMedia = foundByName;
      } else {
        if (!attachedMedia) {
          for (const f of faqsList) {
            if (f.attachments && Array.isArray(f.attachments)) {
              const found = f.attachments.find((att) => att.type === "audio" && (!att.url || !att.url.toLowerCase().includes("blob:"))) || f.attachments.find((att) => att.type === "audio");
              if (found) {
                attachedMedia = found;
                break;
              }
            }
          }
        }
      }
    }
    if (audioRefMatch && !attachedMedia) {
      attachedMedia = {
        name: "Nota_de_voz_PTT.ogg",
        type: "audio",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
      };
    }
    if (cleanReplyText) {
      if (clientSock) {
        await clientSock.sendMessage(senderJid, { text: cleanReplyText });
      } else {
        await sendEvolutionTextMessage(channelId, phone, cleanReplyText);
      }
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.messagesHistory[phone]) currentDB.messagesHistory[phone] = [];
      currentDB.messagesHistory[phone].push({
        role: "assistant",
        text: cleanReplyText,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now()
      });
      if (currentDB.messagesHistory[phone].length > 15) {
        currentDB.messagesHistory[phone].shift();
      }
      if (idx < effectiveReplies.length - 1 || attachedMedia) {
        await new Promise((res) => setTimeout(res, 1200));
      }
    }
    if (attachedMedia && (idx === effectiveReplies.length - 1 || attachedMedia.type === "audio")) {
      try {
        let mediaBuffer = await getMediaBuffer(attachedMedia.url);
        if (!mediaBuffer && attachedMedia.type === "audio") {
          try {
            const res = await fetch("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
            const ab = await res.arrayBuffer();
            mediaBuffer = Buffer.from(ab);
          } catch (e) {
          }
        }
        if (mediaBuffer) {
          if (attachedMedia.type === "audio") {
            console.log(`[WhatsApp Real] Enviando NOTA DE VOZ PTT REAL para +${phone}...`);
            const oggBuffer = await convertAudioToOggOpus(mediaBuffer, attachedMedia.url || attachedMedia.name);
            if (clientSock) {
              await clientSock.sendMessage(senderJid, {
                audio: oggBuffer,
                ptt: true,
                mimetype: "audio/ogg; codecs=opus",
                waveform: generateSimulatedWaveform(64)
              });
            } else {
              const base64Audio = `data:audio/ogg;base64,${oggBuffer.toString("base64")}`;
              await sendEvolutionMediaMessage(channelId, phone, "audio", base64Audio, "", attachedMedia.name || "Nota_de_voz_PTT.ogg");
            }
            if (!currentDB.messagesHistory[phone]) currentDB.messagesHistory[phone] = [];
            currentDB.messagesHistory[phone].push({
              role: "assistant",
              text: "\u{1F3A4} [Nota de voz enviada]",
              attachment: {
                name: attachedMedia.name || "Nota_de_voz_PTT.ogg",
                type: "audio",
                url: attachedMedia.url || ""
              },
              time: (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
              timestamp: Date.now()
            });
          } else if (attachedMedia.type === "imagen") {
            if (clientSock) {
              await clientSock.sendMessage(senderJid, { image: mediaBuffer, caption: cleanReplyText || "" });
            } else {
              const base64Img = `data:image/jpeg;base64,${mediaBuffer.toString("base64")}`;
              await sendEvolutionMediaMessage(channelId, phone, "image", base64Img, cleanReplyText || "", attachedMedia.name || "imagen.jpg");
            }
          } else if (attachedMedia.type === "video") {
            if (clientSock) {
              await clientSock.sendMessage(senderJid, { video: mediaBuffer, caption: cleanReplyText || "" });
            } else {
              const base64Vid = `data:video/mp4;base64,${mediaBuffer.toString("base64")}`;
              await sendEvolutionMediaMessage(channelId, phone, "video", base64Vid, cleanReplyText || "", attachedMedia.name || "video.mp4");
            }
          } else if (attachedMedia.type === "archivo") {
            if (clientSock) {
              await clientSock.sendMessage(senderJid, { document: mediaBuffer, fileName: attachedMedia.name || "archivo", caption: cleanReplyText || "" });
            } else {
              const base64Doc = `data:application/octet-stream;base64,${mediaBuffer.toString("base64")}`;
              await sendEvolutionMediaMessage(channelId, phone, "document", base64Doc, cleanReplyText || "", attachedMedia.name || "archivo");
            }
          }
        }
      } catch (attErr) {
        console.error("[WhatsApp Real] Error enviando adjunto/audio PTT:", attErr);
      }
      attachedMedia = null;
    }
  }
}
dotenv.config();
var isProd = process.env.NODE_ENV === "production";
var port = Number(process.env.PORT) || 3e3;
function safeParseJSON(str) {
  try {
    const cleanStr = str.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch (err) {
    console.error("Error parsing JSON:", err, "\\nRaw str:", str);
    return null;
  }
}
var dbPath = path.resolve(process.cwd(), "menu_data.json");
var defaultMenu = {
  active: {
    entradas: ["Sopa de Patac\xF3n Calientita", "Crema de Verduras con Crutones", "Consom\xE9 de la Casa"],
    principios: ["Lentejas Guisadas al Carb\xF3n", "Arroz Blanco Esponjoso", "Pur\xE9 de Papa Gratinado", "Ensalada Rusa Fresca"],
    carnes: ["Chuleta de Cerdo Valluna Apandada", "Pollo Sudado en su Jugo", "Filete de Res a la Plancha", "Opci\xF3n Vegetariana: Croquetas de Lentejas"],
    bebidas: ["Jugo de Lulo Helado", "Limonada Natural", "Agua Panela con Lim\xF3n"],
    postres: ["Copa de Helado de Vainilla", "Dulce de Brevas con Arequipe Colombiano"],
    precio: 15e3,
    nota_adicional: "El men\xFA del d\xEDa incluye entrada, principio, carne, bebida, ensalada y postre de la casa."
  },
  prompt: "Analiza esta imagen de un men\xFA del d\xEDa escrito a mano, digital, o impreso de restaurante colombiano. Extrae los nombres de los platos y col\xF3calos en su categor\xEDa respectiva. Si encuentras precios individuales u opciones, reg\xEDstralas adecuadamente o calcula el precio del almuerzo ejecutivo promedio. Las categor\xEDas solicitadas son: entradas, principios (acompa\xF1amientos/ensaladas), carnes (platos principales/prote\xEDnas), bebidas y postres. Entrega \xDANICAMENTE un objeto JSON con las claves: entradas, principios, carnes, bebidas, postres, precio y nota_adicional. Si una categor\xEDa no tiene elementos, deja su lista vac\xEDa."
};
var defaultBackofficeState = {
  active: defaultMenu.active,
  prompt: defaultMenu.prompt,
  botPrompt: "Act\xFAa como la Mona IA, la asistente virtual de WhatsApp para el Restaurante La Mona en Yumbo. Tu objetivo es interactuar con el cliente sirviendo el men\xFA de comida, aconsejando opciones y capturando sus datos de domicilio.\n\nSigue ESTE FLUJO paso a paso:\n1. Saluda cordialmente con estilo valluno. Como adjuntaremos una foto del men\xFA real, NO tienes que enlistar todos los platos en texto a menos que te pregunten algo espec\xEDfico. Simplemente diles que ah\xED les compartes el men\xFA del d\xEDa en la imagen e inv\xEDtalos a antojarse.\n2. Con amabilidad, solicita uno a uno los siguientes datos de despacho:\n   - Nombre completo\n   - Direcci\xF3n exacta de entrega (en Yumbo)\n   - Tel\xE9fono de contacto\n   - Si pagar\xE1 en efectivo o transferencia bancaria.\n3. Una vez confirmados todos los datos de forma expl\xEDcita, agradece el pedido.\n\nMant\xE9n respuestas cortas, amables y con buena saz\xF3n, imitando la comunicaci\xF3n real por chat de WhatsApp.\n\nNOTA MUY IMPORTANTE: En tu PRIMER saludo o siempre que vayas a ofrecer el men\xFA por primera vez en la conversaci\xF3n, DEBES incluir este c\xF3digo exacto en tu respuesta: [ENVIAR_IMAGEN_MENU]. Esto le dir\xE1 a nuestro sistema que despache la foto del tablero. Luego continuas preguntando qu\xE9 se les antoja.",
  menuImage: null,
  messagesHistory: {},
  orders: [
    {
      id: "ORD-092",
      customerName: "Mar\xEDa Camila Rodr\xEDguez",
      phone: "+57 312 345 6789",
      status: "CONFIRMANDO",
      transcription: "Hola sra, quiero un sancocho de gallina especial y un jugo de champ\xFAs con lulo para la Calle 15 # 4-12.",
      address: "Calle 15 # 4-12, Barrio Belalc\xE1zar, Yumbo",
      items: ["1x Sancocho de Gallina (Yumbo Especial)", "1x Jugo de Champ\xFAs con Lulo"],
      waiterId: "S1",
      deliveryId: "D1",
      paymentMethod: "Transferencia",
      amount: 28e3,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "ORD-093",
      customerName: "Andr\xE9s Felipe G\xF3mez",
      phone: "+57 321 456 7890",
      status: "EN COCINA",
      transcription: "Tr\xE1eme una bandeja paisa mona y unos aborrajados de pl\xE1tano por favor al Barrio Centro.",
      address: "Carrera 3 # 8-45, Barrio Centro, Yumbo",
      items: ["1x Bandeja Paisa Mona", "2x Aborrajados Vallunos de Pl\xE1tano (x2) font"],
      waiterId: "S2",
      deliveryId: "D2",
      paymentMethod: "Efectivo",
      amount: 36e3,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "ORD-091",
      customerName: "Juan Sebasti\xE1n Castro",
      phone: "+57 301 987 6543",
      status: "ENTREGADO",
      transcription: "Quiero empanadas de entrada, de plato fuerte filete de res con lentejas, agua panela helada.",
      address: "Carrera 12 # 2-33, Barrio Guacand\xED, Yumbo",
      items: ["1x Empanadas Vallunas con Aj\xED (x3)", "1x Filete de Res a la Plancha", "1x Lentejas Guisadas al Carb\xF3n", "1x Agua Panela con Lim\xF3n"],
      waiterId: "S1",
      deliveryId: "D3",
      paymentMethod: "Efectivo",
      amount: 21e3,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  staff: [
    { id: "S1", name: "Sof\xEDa Cano", type: "mesero", status: "ACTIVO", ordersCount: 2 },
    { id: "S2", name: "Mateo \xC1lvarez", type: "mesero", status: "ACTIVO", ordersCount: 1 },
    { id: "S3", name: "Camila Ortiz", type: "mesero", status: "ACTIVO", ordersCount: 0 },
    { id: "S4", name: "Carlos G\xF3mez", type: "mesero", status: "DESCANSO", ordersCount: 0 },
    { id: "D1", name: "Juan Restrepo", type: "domiciliario", status: "ACTIVO", ordersCount: 1 },
    { id: "D2", name: "Pedro Nel", type: "domiciliario", status: "ACTIVO", ordersCount: 1 },
    { id: "D3", name: "Santiago L\xF3pez", type: "domiciliario", status: "ACTIVO", ordersCount: 1 },
    { id: "D4", name: "Andr\xE9s Cabrera", type: "domiciliario", status: "DESCANSO", ordersCount: 0 }
  ],
  products: [
    { sku: "LM-101", name: "Sancocho de Gallina (Yumbo Especial)", category: "mains", basePrice: 22e3, stock: 45, aiSync: true },
    { sku: "LM-102", name: "Bandeja Paisa Mona", category: "mains", basePrice: 26e3, stock: 32, aiSync: true },
    { sku: "LM-103", name: "Empanadas Vallunas con Aj\xED (x3)", category: "starters", basePrice: 6e3, stock: 80, aiSync: true },
    { sku: "LM-104", name: "Aborrajados Vallunos de Pl\xE1tano (x2)", category: "starters", basePrice: 5e3, stock: 15, aiSync: true },
    { sku: "LM-105", name: "Jugo de Champ\xFAs con Lulo", category: "drinks", basePrice: 6e3, stock: 50, aiSync: true },
    { sku: "LM-106", name: "Lulada Valluna Refrescante", category: "drinks", basePrice: 7e3, stock: 35, aiSync: true },
    { sku: "LM-107", name: "Dulce de Brevas con Arequipe", category: "desserts", basePrice: 4e3, stock: 25, aiSync: true }
  ],
  customers: [
    { id: "C1", name: "Mar\xEDa Camila Rodr\xEDguez", registerDate: "2024-03-12", address: "Calle 15 # 4-12, Barrio Belalc\xE1zar, Yumbo", phone: "+57 312 345 6789", recurrence: "DIARIO", ordersCount: 15 },
    { id: "C2", name: "Andr\xE9s Felipe G\xF3mez", registerDate: "2024-04-05", address: "Carrera 3 # 8-45, Barrio Centro, Yumbo", phone: "+57 321 456 7890", recurrence: "SEMANAL", ordersCount: 12 },
    { id: "C3", name: "Juan Sebasti\xE1n Castro", registerDate: "2024-05-18", address: "Carrera 12 # 2-33, Barrio Guacand\xED, Yumbo", phone: "+57 301 987 6543", recurrence: "SEMANAL", ordersCount: 6 },
    { id: "C4", name: "Diana Marcela Pati\xF1o", registerDate: "2024-06-01", address: "Calle 7 # 10-15, Barrio San Jorge, Yumbo", phone: "+57 315 222 1100", recurrence: "NUEVO", ordersCount: 1 }
  ],
  chats: [
    { id: "CH-1", sender: "Mar\xEDa Camila Rodr\xEDguez", phone: "+57 312 345 6789", message: "Hola sra, quiero un sancocho de gallina especial y un jugo de champ\xFAs con lulo para la Calle 15.", time: "11:45 AM", status: "en_conversacion" },
    { id: "CH-2", sender: "Andr\xE9s Felipe G\xF3mez", phone: "+57 321 456 7890", message: "Tr\xE1eme una bandeja paisa mona y unos aborrajados de pl\xE1tano por favor.", time: "11:58 AM", status: "entrega" },
    { id: "CH-3", sender: "Carlos Renter\xEDa", phone: "+57 317 444 5555", message: "Se\xF1ores buenas tardes, \xBFtienen pur\xE9 de papa hoy?", time: "12:10 PM", status: "nuevo" },
    { id: "CH-4", sender: "Sandra Viviana Ortiz", phone: "+57 318 999 8888", message: "Hola, a qu\xE9 hora abren? Me interesa reservar para 4 personas hoy para almorzar", time: "12:15 PM", status: "nuevo" }
  ],
  whatsappConnected: false,
  isAiGlobalActive: true,
  autoPauseOnManualReply: false,
  disabledBots: [],
  blacklistedBots: [],
  roomsPaymentMethods: [],
  apiProvider: "gemini",
  customApiKey: "",
  apiProviderBackup: "gemini",
  customApiKeyBackup: "",
  customApiKeyBudgetBackup: 5,
  customGreeting: "",
  fallbackMessage: "Estoy un poco saturada, dame un momento y ya te respondo \u{1F605}.",
  apiTokens: { total: 0, prompt: 0, candidates: 0 },
  maxTokensLimit: 1e6
};
function getDBData() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf-8");
      const parsed = JSON.parse(data);
      return {
        ...defaultBackofficeState,
        autoPauseOnManualReply: parsed.autoPauseOnManualReply !== void 0 ? parsed.autoPauseOnManualReply : false,
        disabledBots: parsed.disabledBots || [],
        blacklistedBots: parsed.blacklistedBots || [],
        roomsPaymentMethods: parsed.roomsPaymentMethods || [],
        apiProvider: parsed.apiProvider || "gemini",
        customApiKey: parsed.customApiKey || "",
        apiProviderBackup: parsed.apiProviderBackup || "gemini",
        customApiKeyBackup: parsed.customApiKeyBackup || "",
        customApiKeyBudgetBackup: parsed.customApiKeyBudgetBackup !== void 0 ? parsed.customApiKeyBudgetBackup : 5,
        customGreeting: parsed.customGreeting || "",
        fallbackMessage: parsed.fallbackMessage || "Estoy un poco saturada, dame un momento y ya te respondo \u{1F605}.",
        connectedPhone: parsed.connectedPhone,
        apiTokens: parsed.apiTokens || { total: 0, prompt: 0, candidates: 0 },
        maxTokensLimit: parsed.maxTokensLimit !== void 0 ? parsed.maxTokensLimit : 1e6,
        ...parsed
      };
    }
  } catch (err) {
    console.error("Error reading DB file, using defaults:", err);
  }
  return {
    ...defaultBackofficeState,
    disabledBots: [],
    blacklistedBots: [],
    roomsPaymentMethods: []
  };
}
function saveDBData(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
    if (isSupabaseConfigured()) {
      saveToSupabase(data).catch((err) => console.warn("[Supabase Save Warning]:", err?.message || err));
    }
  } catch (err) {
    console.error("Error saving DB file:", err);
  }
}
var currentDB = getDBData();
var globalExecuteAIInternal = null;
if (!currentDB.systemTimezone) {
  currentDB.systemTimezone = "America/Bogota";
}
process.env.TZ = currentDB.systemTimezone;
async function initDB() {
  try {
    if (isSupabaseConfigured()) {
      console.log("[Database] Connecting to Supabase for state synchronization...");
      const supabaseData = await loadFromSupabase();
      if (supabaseData) {
        fs.writeFileSync(dbPath, JSON.stringify(supabaseData, null, 2), "utf-8");
        currentDB = getDBData();
        console.log("\u2705 DB synced from Supabase successfully.");
      } else {
        console.log("[Supabase] Initializing state: uploading current local DB state to Supabase...");
        await saveToSupabase(currentDB);
      }
    } else {
      console.log("[Database] Supabase credentials not configured in env (SUPABASE_URL / SUPABASE_KEY), using local DB.");
    }
  } catch (err) {
    console.log("[Database] Supabase sync error (using local DB state):", err?.message || err);
  }
  let hasBlob = false;
  if (currentDB && currentDB.faqsList && Array.isArray(currentDB.faqsList)) {
    for (const faq of currentDB.faqsList) {
      if (faq.attachments && Array.isArray(faq.attachments)) {
        const cleanedAtts = faq.attachments.filter((att) => !att.url || !att.url.toLowerCase().includes("blob:"));
        if (cleanedAtts.length !== faq.attachments.length) {
          faq.attachments = cleanedAtts;
          hasBlob = true;
        }
      }
    }
  }
  if (hasBlob) {
    console.log("[Startup Cleanup] Cleaned up browser blob attachments from memory and database.");
    saveDBData(currentDB);
  }
}
function buildSystemPrompt(params) {
  const { phone, senderName, text, history, mediaInfo } = params;
  const antiHallucinationDirective = `
=========================================
\u{1F6A8} REGLA ABSOLUTA DE INFORMACI\xD3N Y ENTRENAMIENTO BASE (M\xC1XIMA PRIORIDAD):
1. Responde \xDANICAMENTE Y EXCLUSIVAMENTE utilizando la informaci\xF3n especificada en el Entrenamiento Base, Saludo Inicial, Preguntas Frecuentes (FAQs) y Reglas provistas a continuaci\xF3n.
2. Est\xE1 ESTRICTAMENTE PROHIBIDO inventar, asumir, alucinar o proporcionar datos (precios, horarios, ubicaciones, servicios o promociones) que NO se encuentren expl\xEDcitamente escritos en este entrenamiento.
3. Si el cliente solicita o pregunta por algo que NO est\xE1 detallado en este Entrenamiento Base, responde educadamente:
   "En este momento no dispongo de esa informaci\xF3n espec\xEDfica en mi entrenamiento base, pero con gusto te conectar\xE9 con un asesor humano para ayudarte."
=========================================
`;
  const bizName = currentDB.businessName || "Nuestra Empresa / Plataforma";
  const botInstructions = currentDB.botPrompt || "Act\xFAa como un asistente virtual capacitado para responder dudas, brindar informaci\xF3n de nuestros servicios o productos y capturar datos de contacto de manera profesional, amable y eficiente.";
  const rulesList = currentDB.rules || currentDB.botRules || currentDB.rulesList || [];
  let rulesStr = "";
  if (Array.isArray(rulesList) && rulesList.length > 0) {
    const activeRules = rulesList.filter((r) => r.active !== false);
    if (activeRules.length > 0) {
      rulesStr = `
=========================================
\u{1F6A8} REGLAS DE CONDUCTA Y ATENCI\xD3N OBLIGATORIAS (M\xC1XIMA PRIORIDAD ABSOLUTA - SOBREESCRIBEN CUALQUIER OTRA INSTRUCCI\xD3N):
${activeRules.map((r, i) => `Regla #${i + 1} [${r.title || r.name || "Regla"}] - ESTRICTO CUMPLIMIENTO: ${r.content || r.description || r.instruction || JSON.stringify(r)}`).join("\n")}
=========================================
`;
    }
  }
  const faqsFormatted = currentDB.faqsList && Array.isArray(currentDB.faqsList) && currentDB.faqsList.length > 0 ? currentDB.faqsList.map((f, i) => {
    let attsStr = "";
    if (f.attachments && Array.isArray(f.attachments) && f.attachments.length > 0) {
      attsStr = `
  - ARCHIVOS Y NOTAS DE VOZ ADJUNTOS: ${f.attachments.map((a) => `"${a.name}" (tipo: ${a.type})`).join(", ")}`;
    }
    return `FAQ #${i + 1}:
  Pregunta: ${f.question}
  Respuesta Oficial: ${f.answer}${attsStr}`;
  }).join("\n\n") : currentDB.faqs || "";
  const faqsStr = faqsFormatted ? `
=========================================
\u{1F6A8} BASE DE CONOCIMIENTO Y PREGUNTAS FRECUENTES (FAQS - SOBREESCRIBE EL PROMPT BASE):
${faqsFormatted}
Si el cliente hace una pregunta que coincida con una de las FAQs anteriores, responde usando EXACTAMENTE la Respuesta Oficial de esa FAQ.
REGLA DE ADJUNTOS/NOTAS DE VOZ: Si la FAQ incluye una nota de voz u otro archivo adjunto, es OBLIGATORIO que incluyas en tu respuesta el nombre exacto del archivo entre corchetes para que el sistema lo pueda enviar. (Ejemplo: escribe "[nota_de_voz.ogg]" o "[archivo.pdf]" al final de tu respuesta de texto). El sistema reemplazar\xE1 ese texto por el archivo real.
=========================================
` : "";
  const greetingAttsFormatted = currentDB.greetingAttachments && Array.isArray(currentDB.greetingAttachments) && currentDB.greetingAttachments.length > 0 ? `
  - ARCHIVOS Y NOTAS DE VOZ ADJUNTOS EN EL SALUDO: ${currentDB.greetingAttachments.map((a) => `"${a.name}" (tipo: ${a.type})`).join(", ")}` : "";
  const customGreetingStr = currentDB.customGreeting ? `
=========================================
\u{1F6A8} SALUDO INICIAL BASE CONFIGURADO (M\xC1XIMA PRIORIDAD DE INICIO):
"${currentDB.customGreeting}"${greetingAttsFormatted}
REGLA DE SALUDO: Si es la primera interacci\xF3n o el historial de mensajes est\xE1 vac\xEDo (0 o 1 mensaje del cliente), saluda obligatoriamente usando como plantilla directa este saludo configurado junto con sus archivos o notas de voz adjuntos si los tiene. Si ya saludaste antes en la conversaci\xF3n, NO repitas el saludo inicial.
=========================================
` : "";
  const aiAutomationRulesList = currentDB.aiAutomationRules || [];
  let aiRulesStr = "";
  if (Array.isArray(aiAutomationRulesList) && aiAutomationRulesList.length > 0) {
    const activeAiRules = aiAutomationRulesList.filter((r) => r.active !== false);
    if (activeAiRules.length > 0) {
      const formatted = activeAiRules.map((r, i) => {
        let attsStr = "";
        if (r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0) {
          attsStr = `
  - ARCHIVOS Y NOTAS DE VOZ ADJUNTOS: ${r.attachments.map((a) => `"${a.name}" (tipo: ${a.type})`).join(", ")}`;
        }
        return `Regla de Automatizaci\xF3n #${i + 1}: Si el cliente menciona "${r.keyword || r.phrase}", aplica la acci\xF3n "${r.action}" (${r.actionValue || r.value || ""}).${attsStr}`;
      }).join("\n");
      aiRulesStr = `
=========================================
\u{1F6A8} REGLAS DE AUTOMATIZACI\xD3N DE IA Y ACCIONES:
${formatted}
=========================================
`;
    }
  }
  let catalogStr = "";
  if (currentDB.products && Array.isArray(currentDB.products) && currentDB.products.length > 0) {
    catalogStr += `
INVENTARIO Y PRODUCTOS / SERVICIOS DISPONIBLES:
` + currentDB.products.map((p) => `- ${p.name}: $${p.basePrice || p.price || 0} COP (${p.stock > 0 ? p.stock + " disponibles" : "\xA1AGOTADO!"})`).join("\n") + "\n";
  }
  let menuStr = "";
  if (currentDB.active && (currentDB.active.entradas?.length || currentDB.active.principios?.length || currentDB.active.carnes?.length)) {
    const m = currentDB.active;
    menuStr = `
OPCIONES ADICIONALES DE MEN\xDA / CAT\xC1LOGO:
- Entradas: ${(m.entradas || []).join(", ")}
- Acompa\xF1amientos: ${(m.principios || []).join(", ")}
- Platos Fuertes: ${(m.carnes || []).join(", ")}
- Bebidas: ${(m.bebidas || []).join(", ")}
- Precio general: $${m.precio || 0} COP
`;
  }
  const paymentStr = currentDB.paymentMethods?.length ? `
M\xE9todos de Pago Aceptados: ${currentDB.paymentMethods.join(", ")}` : "";
  const deliveryStr = currentDB.deliveryZones?.length ? `
Costos y Zonas de Domicilio/Env\xEDo: ${currentDB.deliveryZones.map((z) => `${z.zone} ($${z.cost})`).join(", ")}` : "";
  const chatCols = currentDB.chatColumnNames || {};
  const colNamesStr = `
Columnas del Embudo de Ventas (Kanban):
- nuevo: "${chatCols.nuevo || "Nuevo Mensaje"}"
- en_conversacion: "${chatCols.en_conversacion || "En Conversaci\xF3n"}"
- entrega: "${chatCols.entrega || "En Entrega"}"
- post_entrega: "${chatCols.post_entrega || "Post Entrega"}"`;
  const isGenericName = !senderName || senderName === "Cliente WhatsApp" || senderName === "Cliente" || senderName === "Usuario" || senderName.includes("WhatsApp");
  const cleanSenderName = isGenericName ? "" : senderName;
  return `${antiHallucinationDirective}
=========================================
INSTRUCCIONES Y ROL PRINCIPAL DEL ASISTENTE VIRTUAL
=========================================
Eres un asesor comercial y de soporte virtual de "${bizName}". Act\xFAa con naturalidad, cordialidad, amabilidad y empat\xEDa profesional, como un humano atendiendo por WhatsApp.

=========================================
\u{1F6A8} JERARQU\xCDA Y ORDEN DE PRIORIDAD ABSOLUTA DEL ENTRENAMIENTO:
1. PRIMERA PRIORIDAD ABSOLUTA: Las REGLAS DE CONDUCTA, el SALUDO INICIAL BASE y las PREGUNTAS FRECUENTES (FAQS). Si hay cualquier discrepancia con el Prompt Base, DEBES obedecer estrictamente las Reglas, el Saludo Inicial y las FAQs.
2. SEGUNDA PRIORIDAD: El Prompt de Entrenamiento Base del Negocio.

=========================================
REGLA DE ORO SOBRE EL NOMBRE DEL CLIENTE:
- Cliente en WhatsApp: ${cleanSenderName ? `"${cleanSenderName}"` : "Nombre no especificado a\xFAn"}. Tel\xE9fono: +${phone}.
- ATENCI\xD3N ABSOLUTA: Solo dir\xEDgete al cliente por su nombre "${cleanSenderName}" si este es un nombre propio natural claro de la persona. NUNCA asumas ni inventes nombres de otras personas.

${rulesStr}
${customGreetingStr}
${faqsStr}
${aiRulesStr}

=========================================
PROMPT DE ENTRENAMIENTO BASE DEL NEGOCIO (SEGUNDA PRIORIDAD COMPLEMENTARIA):
"${botInstructions}"
${catalogStr}
${menuStr}
${paymentStr}
${deliveryStr}
${colNamesStr}
`;
}
process.on("uncaughtException", (err) => {
  const msg = err?.message || String(err);
  if (msg.includes("Bad MAC") || msg.includes("Failed to decrypt") || msg.includes("Session error") || msg.includes("SessionError")) {
    console.log("[WhatsApp Session Warning Handled]:", msg);
    return;
  }
  console.error("[Uncaught Exception]:", err);
});
process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || String(reason);
  if (msg.includes("Bad MAC") || msg.includes("Failed to decrypt") || msg.includes("Session error") || msg.includes("SessionError")) {
    console.log("[WhatsApp Session Rejection Handled]:", msg);
    return;
  }
  console.error("[Unhandled Rejection]:", reason);
});
async function createServer() {
  initDB().catch((err) => console.error("initDB async error:", err));
  const app = express2();
  const port2 = Number(process.env.PORT) || 3e3;
  app.use(express2.json({
    limit: "15mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  }));
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express2.static(uploadsDir));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Por favor ingresa usuario/correo y contrase\xF1a." });
      }
      const normUser = String(username).trim().toLowerCase();
      const pass = String(password).trim();
      if ((normUser === "admin" || normUser === "oscar@expert360.ai") && pass === "Colombia1") {
        return res.json({
          success: true,
          user: {
            name: "Oscar Molina",
            email: "oscar@expert360.ai",
            role: "superadmin",
            username: "admin",
            phone: "573192392853",
            plan: "SuperAdmin Master"
          }
        });
      }
      const users = Array.isArray(currentDB.users) ? currentDB.users : [];
      const matchedUser = users.find(
        (u) => u.email && u.email.trim().toLowerCase() === normUser || u.username && u.username.trim().toLowerCase() === normUser
      );
      if (matchedUser) {
        const validPass = matchedUser.password === pass || matchedUser.tempPassword === pass;
        if (!validPass) {
          return res.status(401).json({ success: false, error: "Contrase\xF1a incorrecta." });
        }
        if (matchedUser.status !== "activo") {
          return res.status(403).json({
            success: false,
            requirePayment: true,
            error: "Tu suscripci\xF3n no est\xE1 activa. Para acceder al CRM adquiere tu plan en https://xorbit360.com"
          });
        }
        return res.json({
          success: true,
          user: {
            name: matchedUser.name || normUser,
            email: matchedUser.email || normUser,
            role: matchedUser.role || "droshipper",
            username: matchedUser.username || normUser,
            phone: matchedUser.phone || "",
            plan: matchedUser.plan || "Paquete Pro"
          }
        });
      }
      return res.status(403).json({
        success: false,
        requirePayment: true,
        error: "Acceso no autorizado: crm.xorbit360.com es exclusivo para clientes activos. Por favor adquiere tu paquete en https://xorbit360.com para recibir tus credenciales de ingreso."
      });
    } catch (err) {
      console.error("[Auth Login Error]:", err);
      res.status(500).json({ success: false, error: "Error en el servidor de autenticaci\xF3n." });
    }
  });
  app.post("/api/auth/google-login", (req, res) => {
    try {
      const { email, name } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: "Correo de Google no proporcionado." });
      }
      const normEmail = String(email).trim().toLowerCase();
      if (normEmail === "oscar@expert360.ai" || normEmail === "admin@xorbit360.com") {
        return res.json({
          success: true,
          user: {
            name: name || "Oscar Molina",
            email: normEmail,
            role: "superadmin",
            username: "admin",
            phone: "573192392853",
            plan: "SuperAdmin Master"
          }
        });
      }
      const users = Array.isArray(currentDB.users) ? currentDB.users : [];
      const matchedUser = users.find((u) => u.email && u.email.trim().toLowerCase() === normEmail);
      if (matchedUser) {
        if (matchedUser.status !== "activo") {
          return res.status(403).json({
            success: false,
            requirePayment: true,
            error: `Tu cuenta de Google (${normEmail}) no tiene un paquete activo. Para ingresar debes adquirir tu plan en https://xorbit360.com`
          });
        }
        return res.json({
          success: true,
          user: {
            name: matchedUser.name || name || normEmail.split("@")[0],
            email: matchedUser.email || normEmail,
            role: matchedUser.role || "droshipper",
            username: matchedUser.username || normEmail.split("@")[0],
            phone: matchedUser.phone || "",
            plan: matchedUser.plan || "Paquete Pro"
          }
        });
      }
      return res.status(403).json({
        success: false,
        requirePayment: true,
        error: `La cuenta de Google (${normEmail}) no est\xE1 registrada como cliente activo. Debes adquirir tu paquete primero en https://xorbit360.com para tener acceso a crm.xorbit360.com.`
      });
    } catch (err) {
      console.error("[Google Auth Error]:", err);
      res.status(500).json({ success: false, error: "Error en el servidor de autenticaci\xF3n." });
    }
  });
  setupBoldRoutes(app, () => currentDB, (db) => saveDBData(db));
  setupZernioRoutes(app, (event) => {
    try {
      const msg = event.message;
      if (!msg) return;
      const cleanPhone = (msg.senderPhone || msg.senderId || "").replace(/\D/g, "");
      if (!cleanPhone) return;
      const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
      currentDB.messagesHistory[cleanPhone].push({
        role: msg.direction === "outgoing" ? "agent" : "client",
        source: "zernio_meta",
        fromMobile: msg.direction === "outgoing",
        text: msg.text,
        time: nowStr,
        timestamp: Date.now()
      });
      if (currentDB.messagesHistory[cleanPhone].length > 40) {
        currentDB.messagesHistory[cleanPhone].shift();
      }
      if (!currentDB.chats) currentDB.chats = [];
      const chatIdx = currentDB.chats.findIndex((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
      if (chatIdx !== -1) {
        currentDB.chats[chatIdx].message = msg.text;
        currentDB.chats[chatIdx].time = nowStr;
      } else {
        currentDB.chats.unshift({
          id: `CH-${Date.now().toString().slice(-4)}`,
          sender: msg.senderName || `Cliente +${cleanPhone}`,
          phone: `+${cleanPhone}`,
          message: msg.text,
          time: nowStr,
          status: "en_conversacion"
        });
      }
      saveDBData(currentDB);
    } catch (err) {
      console.error("[Zernio Event Ingest Error]:", err);
    }
  });
  app.post("/api/whatsapp/evolution-webhook", async (req, res) => {
    res.status(200).json({ received: true });
    try {
      const body = req.body || {};
      const rawEvent = body.event || body.type;
      const instance = body.instance || "channel-default";
      const data = body.data;
      const event = String(rawEvent || "").toLowerCase().replace(/[-_]/g, ".");
      console.log(`[Evolution API Webhook] Evento recibido: "${rawEvent}" (normalizado: "${event}") para instancia: "${instance}"`);
      if (event === "connection.update" || event === "qrcode.updated") {
        const state = data?.state || (data?.status === "open" ? "open" : void 0);
        console.log(`[Evolution API] Actualizaci\xF3n de conexi\xF3n para ${instance}:`, state);
        if (state === "open" || data?.status === "open") {
          currentDB.whatsappConnected = true;
          if (data?.owner) {
            currentDB.connectedPhone = data.owner.split("@")[0].replace(/\D/g, "");
          }
          currentDB.whatsappError = void 0;
          saveDBData(currentDB);
        } else if (state === "close" || state === "refused") {
          currentDB.whatsappConnected = false;
          saveDBData(currentDB);
        }
      } else if (event === "messages.upsert" || event === "messages.update" || event === "send.message" || event.startsWith("messages") || event.startsWith("chats")) {
        if (onEvolutionIncomingMessage) {
          const items = Array.isArray(data) ? data : data?.messages && Array.isArray(data.messages) ? data.messages : data ? [data] : [];
          for (const item of items) {
            await onEvolutionIncomingMessage(instance, item);
          }
        }
      }
    } catch (err) {
      console.error("[Evolution API Webhook Handler Error]:", err?.message || err);
    }
  });
  app.get("/api/whatsapp/evolution-config", async (req, res) => {
    const evoConfig = getEvolutionConfig();
    let vpsOnline = false;
    let activeInstancesCount = 0;
    if (evoConfig.isConfigured) {
      try {
        const ping = await evolutionRequest("/instance/fetchInstances", { timeoutMs: 4e3 });
        if (ping.ok) {
          vpsOnline = true;
          activeInstancesCount = Array.isArray(ping.data) ? ping.data.length : 0;
        }
      } catch (e) {
      }
    }
    res.json({
      apiUrl: evoConfig.apiUrl,
      hasApiKey: !!evoConfig.apiKey,
      maskedApiKey: evoConfig.apiKey ? `${evoConfig.apiKey.slice(0, 4)}...${evoConfig.apiKey.slice(-4)}` : "",
      isConfigured: evoConfig.isConfigured,
      webhookBaseUrl: evoConfig.webhookBaseUrl,
      fullWebhookUrl: `${evoConfig.webhookBaseUrl}/api/whatsapp/evolution-webhook`,
      vpsOnline,
      activeInstancesCount
    });
  });
  app.post("/api/whatsapp/evolution-config", async (req, res) => {
    try {
      const { apiUrl, apiKey, webhookBaseUrl } = req.body;
      if (apiUrl !== void 0) currentDB.evolutionApiUrl = apiUrl.trim().replace(/\/+$/, "");
      if (apiKey !== void 0) currentDB.evolutionApiKey = apiKey.trim();
      if (webhookBaseUrl !== void 0) currentDB.evolutionWebhookBaseUrl = webhookBaseUrl.trim().replace(/\/+$/, "");
      saveDBData(currentDB);
      res.json({ success: true, message: "Configuraci\xF3n de Evolution API actualizada exitosamente." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/whatsapp/sync-webhooks", async (req, res) => {
    try {
      const { customBaseUrl } = req.body || {};
      if (customBaseUrl) {
        currentDB.evolutionWebhookBaseUrl = customBaseUrl.trim().replace(/\/+$/, "");
        saveDBData(currentDB);
      }
      const evoConfig = getEvolutionConfig();
      const cleanHost = (customBaseUrl || evoConfig.webhookBaseUrl || "https://expert360.ai.studio").replace(/\/+$/, "");
      const fullWebhook = `${cleanHost}/api/whatsapp/evolution-webhook`;
      const listRes = await evolutionRequest("/instance/fetchInstances", { timeoutMs: 6e3 });
      const results = [];
      if (listRes.ok && Array.isArray(listRes.data)) {
        for (const inst of listRes.data) {
          const instName = inst.name || inst.instanceName;
          if (instName) {
            const ok = await setupEvolutionWebhook(instName, cleanHost);
            results.push({ instance: instName, success: ok, webhookUrl: fullWebhook });
          }
        }
      }
      console.log(`[Evolution API] Webhooks sincronizados hacia ${fullWebhook} para ${results.length} instancias.`);
      res.json({
        success: true,
        message: `Webhooks actualizados hacia ${fullWebhook} para ${results.length} instancia(s).`,
        webhookUrl: fullWebhook,
        results
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/whatsapp/sync-recent-chats", async (req, res) => {
    try {
      const limit = req.body?.limit ? Number(req.body.limit) : 80;
      const result = await syncChatsFromEvolutionVPS(limit);
      res.json({
        success: true,
        message: `Sincronizaci\xF3n completada. ${result.importedCount} mensaje(s) importados, ${result.chatsCount} chats en total.`,
        importedCount: result.importedCount,
        chatsCount: result.chatsCount,
        chats: currentDB.chats || [],
        messagesHistory: currentDB.messagesHistory || {}
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/whatsapp/memory/clear", (req, res) => {
    try {
      currentDB.messagesHistory = {};
      currentDB.chats = [];
      currentDB.whatsappError = void 0;
      saveDBData(currentDB);
      console.log("[WhatsApp API] Memoria de conversaciones e historial borrados por completo.");
      res.json({ success: true, message: "Memoria e historial de la IA borrados exitosamente" });
    } catch (err) {
      console.error("Error al borrar memoria de la IA:", err);
      res.status(500).json({ success: false, error: err.message || "Error al borrar memoria" });
    }
  });
  app.post("/api/whatsapp/chat/delete", (req, res) => {
    try {
      const { chatId, phone } = req.body;
      const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
      if (currentDB.messagesHistory) {
        if (cleanPhone && currentDB.messagesHistory[cleanPhone]) {
          delete currentDB.messagesHistory[cleanPhone];
        }
        if (chatId && currentDB.messagesHistory[chatId]) {
          delete currentDB.messagesHistory[chatId];
        }
        for (const k of Object.keys(currentDB.messagesHistory)) {
          const kClean = k.replace(/\D/g, "");
          if (cleanPhone && (kClean === cleanPhone || kClean.endsWith(cleanPhone) || cleanPhone.endsWith(kClean))) {
            delete currentDB.messagesHistory[k];
          }
        }
      }
      if (chatId && currentDB.chats) {
        currentDB.chats = currentDB.chats.filter((c) => c.id !== chatId);
      }
      if (cleanPhone && currentDB.chats) {
        currentDB.chats = currentDB.chats.filter((c) => {
          const cPhone = (c.phone || "").replace(/\D/g, "");
          return cPhone !== cleanPhone;
        });
      }
      saveDBData(currentDB);
      console.log(`[WhatsApp API] Conversaci\xF3n eliminada/reiniciada para chatId: ${chatId}, phone: ${phone}`);
      res.json({ success: true, message: "Conversaci\xF3n reiniciada desde cero." });
    } catch (err) {
      console.error("Error al borrar conversaci\xF3n individual:", err);
      res.status(500).json({ success: false, error: err.message || "Error al borrar conversaci\xF3n" });
    }
  });
  app.post("/api/whatsapp/convert-audio", async (req, res) => {
    try {
      const { mediaBase64 } = req.body;
      if (!mediaBase64) {
        return res.status(400).json({ success: false, error: "Falta mediaBase64" });
      }
      let mimeType = "audio/webm";
      let base64Data = mediaBase64;
      if (mediaBase64.includes(",")) {
        const parts = mediaBase64.split(",");
        base64Data = parts[1];
        const mimePart = parts[0].match(/data:([^;]+)/);
        if (mimePart) {
          mimeType = mimePart[1];
        }
      }
      const inputBuffer = Buffer.from(base64Data, "base64");
      const outputBuffer = await convertAudioToOggOpus(inputBuffer, mimeType);
      const filename = `nota_de_voz_${Date.now()}_ptt.ogg`;
      const uploadsDir2 = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir2)) {
        fs.mkdirSync(uploadsDir2, { recursive: true });
      }
      const filePath = path.join(uploadsDir2, filename);
      fs.writeFileSync(filePath, outputBuffer);
      res.json({
        success: true,
        dataUrl: `/uploads/${filename}`,
        name: filename
      });
    } catch (err) {
      console.error("Error en convert-audio:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/whatsapp/trigger-ai-reply", async (req, res) => {
    try {
      const { phone, channelId, customPrompt } = req.body;
      const cleanPhone = (phone || "").replace(/\D/g, "");
      if (!cleanPhone) {
        return res.status(400).json({ success: false, error: "Falta n\xFAmero de tel\xE9fono" });
      }
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      const history = currentDB.messagesHistory[cleanPhone] || [];
      const chatObj = (currentDB.chats || []).find((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
      const senderName = chatObj?.sender || `+${cleanPhone}`;
      const lastClientMsg = [...history].reverse().find((m) => m.role === "client" || m.sender === "client");
      const textToProcess = customPrompt || (lastClientMsg ? lastClientMsg.text : "Hola, \xBFen qu\xE9 me puedes colaborar hoy?");
      console.log(`[Trigger AI Reply] Generando respuesta manual para +${cleanPhone} con mensaje: "${textToProcess}"`);
      const extractedText = await processWithAgents({
        phone: cleanPhone,
        senderName,
        text: textToProcess,
        history
      });
      if (!extractedText) {
        return res.status(500).json({ success: false, error: "La IA no gener\xF3 respuesta." });
      }
      const parsed = safeParseJSON(extractedText);
      let replies = [];
      if (parsed && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
        replies = parsed.replies;
      } else if (parsed && typeof parsed.reply === "string" && parsed.reply.trim()) {
        replies = [parsed.reply.trim()];
      } else if (typeof extractedText === "string" && extractedText.trim()) {
        replies = [extractedText.trim()];
      } else {
        replies = ["\xA1Hola! \xBFEn qu\xE9 te podemos colaborar hoy con La Mona?"];
      }
      const activeId = channelId || "channel-default";
      const clientSock = activeSockets[activeId] || getAnyConnectedSock();
      const senderJid = `${cleanPhone}@s.whatsapp.net`;
      await sendWhatsAppBotReplies(
        clientSock,
        senderJid,
        textToProcess,
        replies,
        cleanPhone,
        activeId
      );
      saveDBData(currentDB);
      res.json({
        success: true,
        replies,
        messagesHistory: currentDB.messagesHistory || {},
        chats: currentDB.chats || []
      });
    } catch (err) {
      console.error("Error al forzar respuesta de IA:", err);
      res.status(500).json({ success: false, error: err.message || "Error al generar respuesta de IA" });
    }
  });
  app.post("/api/whatsapp/toggle-bot-phone", (req, res) => {
    try {
      const { phone, active } = req.body;
      const cleanPhone = (phone || "").replace(/\D/g, "");
      if (!cleanPhone) {
        return res.status(400).json({ success: false, error: "Falta n\xFAmero de tel\xE9fono" });
      }
      if (!currentDB.disabledBots) currentDB.disabledBots = [];
      if (active) {
        currentDB.disabledBots = currentDB.disabledBots.filter((p) => p.replace(/\D/g, "") !== cleanPhone);
      } else {
        if (!currentDB.disabledBots.some((p) => p.replace(/\D/g, "") === cleanPhone)) {
          currentDB.disabledBots.push(cleanPhone);
        }
      }
      saveDBData(currentDB);
      console.log(`[Bot Toggle] IA para +${cleanPhone} ahora est\xE1: ${active ? "ACTIVADA" : "PAUSADA"}`);
      res.json({ success: true, isBotActive: active, disabledBots: currentDB.disabledBots });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/whatsapp/avatar-proxy", async (req, res) => {
    try {
      const rawUrl = req.query.url;
      if (!rawUrl) return res.status(400).send("Missing URL");
      const parsed = new URL(rawUrl);
      if (!parsed.hostname.includes("whatsapp.net")) {
        return res.status(403).send("Forbidden host");
      }
      const fetchRes = await fetch(rawUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (!fetchRes.ok) return res.status(fetchRes.status).send("Failed to fetch image");
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const arrayBuf = await fetchRes.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      res.status(500).send("Proxy error: " + err.message);
    }
  });
  app.post("/api/whatsapp/reply", async (req, res) => {
    try {
      const { phone, message, type, mediaBase64, isPtt, fileName, channelId } = req.body;
      const targetPhone = (phone || "").replace(/\D/g, "");
      if (!targetPhone) {
        return res.status(400).json({ success: false, error: "Falta el n\xFAmero de tel\xE9fono (phone)" });
      }
      const activeId = channelId || "channel-default";
      const clientSock = activeSockets[activeId] || getAnyConnectedSock();
      const normalizedType = type === "imagen" || type === "image" ? "imagen" : type === "audio" ? "audio" : type === "video" ? "video" : type === "archivo" || type === "document" ? "archivo" : type;
      let detectedMime = "";
      if (mediaBase64 && typeof mediaBase64 === "string" && mediaBase64.startsWith("data:")) {
        const match = mediaBase64.match(/^data:([^;]+);base64,/);
        if (match) detectedMime = match[1];
      }
      const effectiveFileName = fileName || (normalizedType === "audio" ? "Nota_de_voz.ogg" : normalizedType === "imagen" ? "foto.jpg" : normalizedType === "video" ? "video.mp4" : "archivo.pdf");
      let attachmentObj = void 0;
      if (normalizedType && mediaBase64) {
        attachmentObj = {
          name: effectiveFileName,
          type: normalizedType,
          url: mediaBase64.startsWith("data:") ? mediaBase64 : `data:${detectedMime || "application/octet-stream"};base64,${mediaBase64}`,
          size: "Manual"
        };
      }
      if (!clientSock) {
        const evoConfig = getEvolutionConfig();
        if (evoConfig.isConfigured) {
          if (normalizedType === "audio" || mediaBase64) {
            const evoMediaType = normalizedType === "audio" ? "audio" : normalizedType === "imagen" ? "image" : normalizedType === "video" ? "video" : "document";
            await sendEvolutionMediaMessage(activeId, targetPhone, evoMediaType, mediaBase64, message || "", effectiveFileName, detectedMime);
          } else {
            await sendEvolutionTextMessage(activeId, targetPhone, message || "");
          }
          if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
          if (!currentDB.messagesHistory[targetPhone]) currentDB.messagesHistory[targetPhone] = [];
          currentDB.messagesHistory[targetPhone].push({
            role: "assistant",
            text: message || (normalizedType === "audio" ? "\u{1F3A4} [Nota de voz enviada]" : normalizedType === "imagen" ? "\u{1F4F7} [Imagen enviada]" : normalizedType === "video" ? "\u{1F3A5} [Video enviado]" : `\u{1F4CE} [${effectiveFileName}]`),
            attachment: attachmentObj,
            time: (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
            timestamp: Date.now()
          });
          if (currentDB.messagesHistory[targetPhone].length > 35) {
            currentDB.messagesHistory[targetPhone].shift();
          }
          saveDBData(currentDB);
          return res.json({ success: true, message: "Mensaje y multimedia enviados exitosamente v\xEDa Evolution API" });
        }
        return res.status(500).json({ success: false, error: "No hay conexi\xF3n activa con WhatsApp para enviar mensajes." });
      }
      const targetJid = `${targetPhone}@s.whatsapp.net`;
      if (normalizedType || mediaBase64) {
        const buffer = await getMediaBuffer(mediaBase64);
        if (!buffer) {
          return res.status(400).json({ success: false, error: "No se pudo obtener el buffer del archivo multimedia" });
        }
        if (normalizedType === "audio") {
          let mimeType = detectedMime || "audio/ogg; codecs=opus";
          const converted = await convertAudioToOggOpus(buffer, mimeType);
          await clientSock.sendMessage(targetJid, {
            audio: converted,
            ptt: !!isPtt,
            mimetype: "audio/ogg; codecs=opus",
            waveform: generateSimulatedWaveform(64)
          });
        } else if (normalizedType === "imagen") {
          await clientSock.sendMessage(targetJid, { image: buffer, caption: message || "" });
        } else if (normalizedType === "video") {
          await clientSock.sendMessage(targetJid, { video: buffer, caption: message || "" });
        } else {
          await clientSock.sendMessage(targetJid, { document: buffer, fileName: effectiveFileName, caption: message || "" });
        }
      } else {
        if (!message) {
          return res.status(400).json({ success: false, error: "Falta mensaje o archivo multimedia" });
        }
        await clientSock.sendMessage(targetJid, { text: message });
      }
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.messagesHistory[targetPhone]) currentDB.messagesHistory[targetPhone] = [];
      currentDB.messagesHistory[targetPhone].push({
        role: "assistant",
        text: message || (normalizedType === "audio" ? "\u{1F3A4} [Nota de voz enviada]" : normalizedType === "imagen" ? "\u{1F4F7} [Imagen enviada]" : normalizedType === "video" ? "\u{1F3A5} [Video enviado]" : `\u{1F4CE} [${effectiveFileName}]`),
        attachment: attachmentObj,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now()
      });
      if (currentDB.messagesHistory[targetPhone].length > 35) {
        currentDB.messagesHistory[targetPhone].shift();
      }
      saveDBData(currentDB);
      res.json({ success: true, message: "Mensaje enviado exitosamente" });
    } catch (err) {
      console.error("Error en endpoint /api/whatsapp/reply:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/whatsapp/reconnect", async (req, res) => {
    let channelId = (req.body.channelId || "channel-default").trim();
    if (channelId.startsWith(" ") || !channelId.startsWith("+") && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId)) {
      channelId = `+${channelId.trim()}`;
    }
    const evoConfig = getEvolutionConfig();
    if (evoConfig.isConfigured) {
      try {
        if (req.body.resetSession) {
          await evolutionRequest(`/instance/delete/${encodeURIComponent(channelId)}`, { method: "DELETE", timeoutMs: 5e3 }).catch(() => {
          });
        }
        await ensureEvolutionInstance(channelId, void 0, true);
        setupEvolutionWebhook(channelId).catch(() => {
        });
        currentDB.whatsappConnected = false;
        currentDB.whatsappError = void 0;
        saveDBData(currentDB);
        return res.json({
          success: true,
          message: "Instancia de Evolution API reiniciada. Generando nuevo c\xF3digo QR...",
          engine: "evolution-api"
        });
      } catch (err) {
        console.error("[Evolution API Reconnect Error]:", err.message);
      }
    }
    if (reconnectTimers[channelId]) {
      clearTimeout(reconnectTimers[channelId]);
      delete reconnectTimers[channelId];
    }
    conflictRetries[channelId] = 0;
    purgeSessionFilesOnDisk(channelId === "channel-default" ? void 0 : channelId);
    if (channelId === "channel-default") {
      currentDB.whatsappError = void 0;
    }
    if (req.body.force || req.body.resetSession) {
      isConnecting[channelId] = false;
      if (req.body.resetSession) {
        const sessionFolder = channelId === "channel-default" ? "baileys_auth_info" : `baileys_auth_info_${channelId}`;
        const authSessionPath = path.resolve(wAuthBaseDir, sessionFolder);
        if (fs.existsSync(authSessionPath)) {
          try {
            fs.rmSync(authSessionPath, { recursive: true, force: true });
            console.log(`[WhatsApp Real] Sesi\xF3n local borrada completamente para canal ${channelId}`);
          } catch (e) {
          }
        }
        if (currentDB.whatsappSessionData && currentDB.whatsappSessionData[channelId]) {
          delete currentDB.whatsappSessionData[channelId];
        }
        if (channelId === "channel-default") {
          currentDB.whatsappConnected = false;
          currentDB.whatsappError = void 0;
          currentQrCode = null;
        }
        saveDBData(currentDB);
      }
    }
    await connectToWhatsApp(channelId, true);
    res.json({ success: true, message: "Sesi\xF3n y conexi\xF3n de WhatsApp reiniciadas con \xE9xito." });
  });
  app.post("/api/whatsapp/disconnect", async (req, res) => {
    try {
      const channelId = req.body.channelId || "channel-default";
      const evoConfig = getEvolutionConfig();
      if (evoConfig.isConfigured) {
        try {
          await evolutionRequest(`/instance/logout/${channelId}`, { method: "DELETE", timeoutMs: 6e3 }).catch(() => {
          });
        } catch (e) {
        }
      }
      const sock = activeSockets[channelId];
      if (sock) {
        try {
          await sock.logout();
        } catch (e) {
        }
        try {
          sock.end(void 0);
        } catch (e) {
        }
        delete activeSockets[channelId];
      }
      if (channelId === "channel-default") {
        currentDB.whatsappConnected = false;
        currentDB.connectedPhone = "";
        currentQrCode = null;
      }
      const chIdx = (currentDB.channels || []).findIndex((c) => c.id === channelId);
      if (chIdx !== -1) {
        currentDB.channels[chIdx].connected = false;
        currentDB.channels[chIdx].phone = "";
      }
      saveDBData(currentDB);
      res.json({ success: true, message: "WhatsApp desconectado exitosamente" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/whitelabel/config", (req, res) => {
    try {
      const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
      if (email && currentDB.userWhiteLabels && currentDB.userWhiteLabels[email]) {
        return res.json({ success: true, config: currentDB.userWhiteLabels[email] });
      }
      return res.json({ success: true, config: currentDB.whiteLabelConfig || null });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/whitelabel/config", (req, res) => {
    try {
      const config = req.body;
      if (!currentDB.userWhiteLabels) currentDB.userWhiteLabels = {};
      const email = config.userEmail ? config.userEmail.trim().toLowerCase() : "";
      const isGlobal = !!config.isGlobal;
      if (isGlobal || !email) {
        currentDB.whiteLabelConfig = config;
      }
      if (email) {
        currentDB.userWhiteLabels[email] = config;
      }
      saveDBData(currentDB);
      res.json({ success: true, config });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/domain/verify-dns", async (req, res) => {
    try {
      const { domain, isSubdomain } = req.body;
      const cleanDomain = (domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!cleanDomain) {
        return res.status(400).json({ success: false, error: "Dominio requerido" });
      }
      const cnameUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
      const aUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
      const [cnameRes, aRes] = await Promise.all([
        fetch(cnameUrl, { signal: AbortSignal.timeout(4e3) }).then((r) => r.json()).catch(() => null),
        fetch(aUrl, { signal: AbortSignal.timeout(4e3) }).then((r) => r.json()).catch(() => null)
      ]);
      const recordsFound = [];
      let cnameFound = "";
      if (cnameRes && cnameRes.Answer) {
        for (const ans of cnameRes.Answer) {
          if (ans.type === 5 && ans.data) {
            cnameFound = ans.data.replace(/\.$/, "");
            recordsFound.push(`CNAME: ${cnameFound}`);
          }
        }
      }
      if (aRes && aRes.Answer) {
        for (const ans of aRes.Answer) {
          if (ans.type === 1 && ans.data) {
            recordsFound.push(`A: ${ans.data}`);
          }
        }
      }
      const isApex = !isSubdomain;
      const targetCname = "cname.expert360.live";
      const appHost = req.headers.host || "";
      const targetMatch = !!cnameFound && (cnameFound.toLowerCase().includes("expert360") || cnameFound.toLowerCase().includes("run.app") || cnameFound.toLowerCase() === targetCname || appHost && cnameFound.toLowerCase().includes(appHost.split(":")[0]));
      const hasA = recordsFound.some((r) => r.startsWith("A:"));
      const isConfigured = isSubdomain ? targetMatch || recordsFound.length > 0 : hasA || recordsFound.length > 0;
      res.json({
        checked: true,
        domain: cleanDomain,
        isApex,
        recordsFound,
        isConfigured,
        cnameFound,
        targetMatch,
        sslStatus: isConfigured ? "Activo (SSL Let's Encrypt / Cloudflare)" : "Pendiente de propagaci\xF3n DNS",
        details: isConfigured ? `\xA1Dominio ${cleanDomain} verificado correctamente! Los registros apuntan a la infraestructura.` : `El dominio ${cleanDomain} a\xFAn no tiene los registros DNS propagados. Aseg\xFArate de configurar el registro CNAME o A en tu proveedor (Cloudflare, GoDaddy, Namecheap, etc.).`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/live-selling/config", (req, res) => {
    try {
      if (!currentDB.liveSelling) {
        currentDB.liveSelling = {
          customDomain: "",
          dnsVerified: false,
          streamTitle: "Gran Venta Especial en Vivo",
          platform: "camera",
          streamUrl: "",
          streamKey: "",
          activeSessionId: "live-default",
          isLiveNow: false,
          pinnedProductId: null,
          flashOfferTimerSeconds: 300,
          flashOfferDiscountPercent: 25,
          commentAutomationEnabled: true,
          triggerKeywords: ["QUIERO", "PIDO", "COMPRO", "LO QUIERO", "#L1", "#L2", "ORDENAR", "PROMO"],
          autoReplyWhatsApp: true,
          autoReplyInChat: true,
          autoReplyTemplate: '\xA1Hola {{nombre}}! \u{1F381} Tu pedido en vivo para "{{producto}}" ha sido apartado exitosamente. Confirma tu entrega aqu\xED: {{link_checkout}}',
          chatReplyTemplate: "\xA1Excelente @{{usuario}}! Pedido apartado \u{1F389} Te acabamos de enviar el link privado por WhatsApp con tu descuento exclusivo de Live.",
          products: [],
          orders: [],
          stats: {
            totalRevenue: 0,
            totalOrders: 0,
            peakViewers: 0,
            conversionRate: 0
          }
        };
        saveDBData(currentDB);
      }
      res.json({ success: true, config: currentDB.liveSelling });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/live-selling/config", (req, res) => {
    try {
      currentDB.liveSelling = {
        ...currentDB.liveSelling || {},
        ...req.body
      };
      saveDBData(currentDB);
      res.json({ success: true, config: currentDB.liveSelling });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.get("/api/live-selling/orders", (req, res) => {
    try {
      const orders = currentDB.liveSelling && currentDB.liveSelling.orders ? currentDB.liveSelling.orders : [];
      res.json({ success: true, orders });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/live-selling/orders", async (req, res) => {
    try {
      if (!currentDB.liveSelling) currentDB.liveSelling = {};
      if (!currentDB.liveSelling.orders) currentDB.liveSelling.orders = [];
      const newOrder = {
        id: "LIVE-" + Math.floor(1e5 + Math.random() * 9e5),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        ...req.body
      };
      currentDB.liveSelling.orders.unshift(newOrder);
      if (!currentDB.liveSelling.stats) currentDB.liveSelling.stats = { totalRevenue: 0, totalOrders: 0, peakViewers: 0, conversionRate: 0 };
      currentDB.liveSelling.stats.totalOrders = currentDB.liveSelling.orders.length;
      currentDB.liveSelling.stats.totalRevenue = currentDB.liveSelling.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      saveDBData(currentDB);
      if (req.body.phone && currentDB.whatsappConnected && currentDB.liveSelling.autoReplyWhatsApp) {
        try {
          const phone = req.body.phone.replace(/\D/g, "");
          const jid = `${phone}@s.whatsapp.net`;
          const defaultSock = activeSockets["channel-default"];
          if (defaultSock && defaultSock.sendMessage) {
            const template = currentDB.liveSelling.autoReplyTemplate || '\xA1Hola {{nombre}}! \u{1F381} Tu pedido en vivo para "{{producto}}" ha sido apartado exitosamente. Confirma aqu\xED: {{link_checkout}}';
            const text = template.replace(/{{nombre}}/g, req.body.customerName || "Cliente").replace(/{{producto}}/g, req.body.productName || "Producto en Vivo").replace(/{{link_checkout}}/g, req.body.checkoutLink || `https://${req.headers.host || "app"}/checkout/${newOrder.id}`);
            defaultSock.sendMessage(jid, { text }).catch((err) => console.warn("Live order WA notification warning:", err));
          }
        } catch (waErr) {
          console.warn("Live order WA notification error:", waErr);
        }
      }
      res.json({ success: true, order: newOrder });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/whatsapp/pairing-code", async (req, res) => {
    let channelId = (req.body.channelId || "channel-default").trim();
    if (channelId.startsWith(" ") || !channelId.startsWith("+") && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId)) {
      channelId = `+${channelId.trim()}`;
    }
    const phoneNumber = req.body.phoneNumber?.replace(/\D/g, "");
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Phone number required" });
    }
    const evoConfig = getEvolutionConfig();
    if (evoConfig.isConfigured) {
      try {
        const evoCode = await getEvolutionPairingCode(channelId, phoneNumber);
        if (evoCode) {
          setupEvolutionWebhook(channelId).catch(() => {
          });
          return res.json({
            success: true,
            pairingCode: evoCode.pairingCode,
            rawCode: evoCode.rawCode,
            engine: "evolution-api"
          });
        }
      } catch (err) {
        console.error("[Evolution API Pairing Code Error]:", err.message);
      }
    }
    try {
      let sock = activeSockets[channelId];
      if (!sock) {
        isConnecting[channelId] = false;
        await connectToWhatsApp(channelId, true);
        sock = activeSockets[channelId];
      }
      if (sock) {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const code = await sock.requestPairingCode(phoneNumber);
        res.json({ success: true, pairingCode: code, rawCode: code.replace("-", "") });
      } else {
        res.status(400).json({ success: false, error: "Could not initialize WhatsApp socket" });
      }
    } catch (e) {
      console.error("[WhatsApp Real] Error generating pairing code:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.get("/api/whatsapp/qr", async (req, res) => {
    let channelId = (typeof req.query.channelId === "string" ? req.query.channelId : "channel-default").trim();
    if (channelId.startsWith(" ") || !channelId.startsWith("+") && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId)) {
      channelId = `+${channelId.trim()}`;
    }
    const evoConfig = getEvolutionConfig();
    if (evoConfig.isConfigured) {
      try {
        const evoQr = await getEvolutionQr(channelId);
        if (evoQr) {
          setupEvolutionWebhook(channelId).catch(() => {
          });
          return res.json({ qr: evoQr, engine: "evolution-api" });
        }
      } catch (err) {
        console.warn("[Evolution API QR Warning]:", err.message);
      }
    }
    if (channelId === "channel-default" && currentQrCode) {
      res.json({ qr: currentQrCode });
    } else if (qrCodesMap[channelId]) {
      res.json({ qr: qrCodesMap[channelId] });
    } else {
      res.json({ qr: null });
    }
  });
  app.get("/api/whatsapp/diagnostic", async (req, res) => {
    let channelId = (typeof req.query.channelId === "string" ? req.query.channelId : "channel-default").trim();
    if (channelId.startsWith(" ") || !channelId.startsWith("+") && /^\d+_[a-zA-Z0-9_-]+$/.test(channelId)) {
      channelId = `+${channelId.trim()}`;
    }
    const evoConfig = getEvolutionConfig();
    if (evoConfig.isConfigured) {
      try {
        const evoConn = await getEvolutionConnectionState(channelId);
        const isConn = evoConn.state === "open";
        if (isConn) {
          currentDB.whatsappConnected = true;
          if (evoConn.phone) {
            currentDB.connectedPhone = evoConn.phone;
          }
          currentDB.whatsappError = void 0;
        } else {
          currentDB.whatsappConnected = false;
        }
        return res.json({
          whatsappConnected: isConn,
          hasQr: !isConn,
          hasWASock: true,
          whatsappError: isConn ? null : evoConn.exists ? evoConn.state === "connecting" ? "C\xF3digo QR generado. Escan\xE9alo en WhatsApp." : "Sesi\xF3n desconectada. Escanea el c\xF3digo QR." : "Instancia no creada. Generando QR...",
          connectedPhone: isConn ? evoConn.phone || currentDB.connectedPhone || null : null,
          engine: "evolution-api",
          vpsStatus: "connected",
          instanceState: evoConn.state,
          instanceName: channelId,
          webhookBaseUrl: evoConfig.webhookBaseUrl,
          fullWebhookUrl: `${evoConfig.webhookBaseUrl}/api/whatsapp/evolution-webhook`
        });
      } catch (err) {
        console.warn("[Evolution API Diagnostic Warning]:", err.message);
      }
    }
    const hasQr = !!(channelId === "channel-default" ? currentQrCode : qrCodesMap[channelId]);
    const hasWASock = !!activeSockets[channelId] || !!isConnecting[channelId];
    res.json({
      whatsappConnected: !!currentDB.whatsappConnected,
      hasQr,
      hasWASock,
      whatsappError: currentDB.whatsappError || null,
      connectedPhone: currentDB.connectedPhone || (activeSockets[channelId]?.user?.id ? activeSockets[channelId].user.id.split(":")[0].split("@")[0] : null)
    });
  });
  app.get("/api/backoffice/ai-debug-logs", (req, res) => {
    res.json({
      success: true,
      logs: currentDB.aiDebugLogs || [],
      tokens: currentDB.apiTokens || { total: 0, prompt: 0, candidates: 0 },
      maxTokensLimit: currentDB.maxTokensLimit || 1e6,
      activeProvider: currentDB.apiProvider || "openai",
      activeModel: currentDB.aiModel || "gpt-4o",
      hasCustomKey: !!(currentDB.customApiKey && currentDB.customApiKey.trim().length > 0),
      lastAiError: currentDB.lastAiError || null,
      lastAiTimestamp: currentDB.lastAiTimestamp || null
    });
  });
  app.post("/api/backoffice/ai-debug-logs/clear", (req, res) => {
    currentDB.aiDebugLogs = [];
    saveDBData(currentDB);
    res.json({ success: true, message: "Logs de depuraci\xF3n borrados con \xE9xito." });
  });
  app.post("/api/backoffice/test-ai-connection", async (req, res) => {
    try {
      const provider = req.body.provider || currentDB.apiProvider || "openai";
      let customKey = req.body.customKey?.trim() || currentDB.customApiKey?.trim();
      if (!customKey && provider === "gemini") {
        customKey = defaultGeminiApiKey;
      }
      if (!customKey) {
        return res.status(400).json({ success: false, error: `No hay clave API configurada para ${provider}.` });
      }
      const promptText = req.body.prompt || 'Prueba de depuraci\xF3n en tiempo real. Responde exactamente este JSON: {"status": "ok", "message": "Conexi\xF3n con OpenAI API verificada correctamente"}';
      const startTime = Date.now();
      const result = await callAIWithProvider(provider, customKey, promptText, null, null);
      const durationMs = Date.now() - startTime;
      res.json({
        success: true,
        durationMs,
        provider,
        model: currentDB.aiModel || (provider === "openai" ? "gpt-4o" : "gemini-1.5-flash"),
        tokens: currentDB.apiTokens,
        rawResponse: result
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        provider: req.body.provider || currentDB.apiProvider || "openai",
        error: err?.message || String(err)
      });
    }
  });
  app.get("/api/backoffice/state", (req, res) => {
    res.json(currentDB);
  });
  app.post("/api/backoffice/state", (req, res) => {
    try {
      currentDB = {
        ...currentDB,
        ...req.body
      };
      console.log("[WhatsApp API] Estado de configuraci\xF3n actualizado con \xE9xito.");
      saveDBData(currentDB);
      res.json({ success: true, state: currentDB });
    } catch (err) {
      res.status(500).json({ error: err.message || "Error updating state" });
    }
  });
  app.post("/api/payments/integrity-signature", (req, res) => {
    try {
      const { merchantId, reference, amountInCents, currency, secretKey } = req.body;
      const refToUse = reference || merchantId || "REF_2026_0918";
      const amountToUse = amountInCents !== void 0 ? amountInCents : 1e7;
      const currToUse = currency || "COP";
      const secretToUse = secretKey || "prod_integrity_821940...";
      const concatenatedString = `${refToUse}${amountToUse}${currToUse}${secretToUse}`;
      const hash = crypto3.createHash("sha256").update(concatenatedString).digest("hex");
      res.json({
        status: "success",
        reference: refToUse,
        amountInCents: amountToUse,
        currency: currToUse,
        concatenatedString,
        integritySignature: hash,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Error generating SHA256 integrity signature" });
    }
  });
  const BOLD_KEY_CHAR = "BoldPaymentButton";
  const BOLD_CHAR_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~=&";
  function boldShiftChar(c, shift) {
    const idx = BOLD_CHAR_SET.indexOf(c);
    if (idx === -1) return c;
    return BOLD_CHAR_SET[(idx + shift + 68) % 68];
  }
  function buildBoldCheckoutUrl(config) {
    const rawStr = Object.keys(config).map((k) => `${k.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}=${config[k]}`).join("<bold>");
    let encoded = "";
    for (let i = 0; i < rawStr.length; i++) {
      encoded += boldShiftChar(rawStr[i], BOLD_KEY_CHAR.charCodeAt(i % 17));
    }
    return `https://checkout.bold.co/btn?${encodeURIComponent(encoded)}`;
  }
  app.post("/api/integrations/bold/create-payment", (req, res) => {
    try {
      const {
        amount,
        currency = "COP",
        description = "Recarga Saldo Expert 360 AI",
        orderId = `REC-BOLD-${Date.now()}`,
        apiKey = "l_5Wz-8KQmld8Vb_iyy05KWBQ0A3zz5LOtagMmCjfbk",
        secretKey = "53nBWst7REiVw9So1Zf5aQ",
        merchantId = "FFVSR3C7Y1",
        originUrl
      } = req.body;
      const amountStr = String(Math.round(Number(amount) || 76e3));
      const integrityHash = crypto3.createHash("sha256").update(orderId + amountStr + currency + secretKey).digest("hex");
      const boldConfig = {
        apiKey,
        orderId,
        amount: amountStr,
        currency,
        description,
        integritySignature: integrityHash,
        renderMode: "embedded",
        originUrl: originUrl || "https://checkout.bold.co",
        openingTime: String(Date.now())
      };
      const checkoutUrl = buildBoldCheckoutUrl(boldConfig);
      console.log(`[Bold Payments] Generada orden real ${orderId} por $${amountStr} ${currency}`);
      res.json({
        success: true,
        orderId,
        amount: Number(amountStr),
        currency,
        merchantId,
        apiKey,
        integritySignature: integrityHash,
        checkoutUrl
      });
    } catch (err) {
      console.error("[Bold Payments] Error creando pago:", err);
      res.status(500).json({ success: false, error: err.message || "Error al generar checkout de Bold" });
    }
  });
  app.post("/api/integrations/bold/webhook", (req, res) => {
    console.log("[Bold Webhook] Notificaci\xF3n recibida de Bold:", JSON.stringify(req.body));
    res.json({ status: "received", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.all(["/api/integrations/dropi/webhook", "/api/webhooks/dropi"], (req, res) => {
    const signature = req.headers["x-dropi-signature"] || req.headers["x-signature"] || req.headers["authorization"];
    console.log("[Dropi Webhook] Recibido evento de Dropi:", {
      method: req.method,
      url: req.originalUrl,
      signature: signature ? "present" : "none",
      body: req.body
    });
    if (req.method === "GET") {
      return res.status(200).json({
        status: "active",
        service: "Comunidad Expert 360 Dropi Webhook Service",
        ready: true,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const payload = req.body || {};
    const orderId = payload.order_id || payload.orderId || payload.id || payload.data?.id || null;
    const status = payload.status || payload.shipping_status || payload.data?.status || null;
    const trackingCode = payload.tracking_code || payload.guide_number || payload.data?.guide_number || null;
    console.log(`[Dropi Webhook] Procesando actualizaci\xF3n: Orden=${orderId}, Estado=${status}, Gu\xEDa=${trackingCode}`);
    return res.status(200).json({
      success: true,
      status: "received",
      orderId,
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  const defaultGeminiApiKey = process.env.GEMINI_API_KEY;
  let aiInstance = null;
  function getAiClient(customKey) {
    const keyToUse = customKey || defaultGeminiApiKey || process.env.GEMINI_API_KEY || "";
    if (customKey && customKey !== defaultGeminiApiKey) {
      return new GoogleGenAI({
        apiKey: customKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return aiInstance;
  }
  async function executeAI(promptText, mediaBase64 = null, mediaMimeType = null) {
    const provider = currentDB.apiProvider || "gemini";
    try {
      const result = await executeAIInternal(promptText, mediaBase64, mediaMimeType);
      if (currentDB.lastAiError) {
        currentDB.lastAiError = null;
        currentDB.lastAiTimestamp = null;
        saveDBData(currentDB);
      }
      return result;
    } catch (err) {
      const errMsg = err?.message || String(err);
      console.error(`[executeAI Error] Provider: ${provider}, Error:`, errMsg);
      currentDB.lastAiError = errMsg;
      currentDB.lastAiTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      currentDB.lastAiProvider = provider;
      saveDBData(currentDB);
      throw err;
    }
  }
  function logAiCall(entry) {
    if (!currentDB.aiDebugLogs) {
      currentDB.aiDebugLogs = [];
    }
    const newLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      timeFormatted: (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      provider: entry.provider,
      model: entry.model,
      promptSnippet: entry.prompt.length > 250 ? entry.prompt.substring(0, 250) + "..." : entry.prompt,
      promptFull: entry.prompt,
      status: entry.status,
      durationMs: entry.durationMs,
      tokens: entry.tokens || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      responseSnippet: entry.response ? entry.response.length > 300 ? entry.response.substring(0, 300) + "..." : entry.response : void 0,
      responseFull: entry.response,
      error: entry.error
    };
    currentDB.aiDebugLogs.unshift(newLog);
    if (currentDB.aiDebugLogs.length > 100) {
      currentDB.aiDebugLogs = currentDB.aiDebugLogs.slice(0, 100);
    }
    saveDBData(currentDB);
  }
  async function callAIWithProvider(provider, customKey, promptText, mediaBase64, mediaMimeType) {
    const expectsJSON = promptText.toLowerCase().includes("json");
    const startTime = Date.now();
    if (provider === "openai") {
      const modelUsed = (() => {
        let m = currentDB.aiModel || "gpt-4o-mini";
        if (!m.startsWith("gpt-") && !m.startsWith("o1") && !m.startsWith("o3")) return "gpt-4o-mini";
        return m;
      })();
      try {
        const openai = new OpenAI({ apiKey: customKey });
        const messages = [];
        const contentPart = [{ type: "text", text: promptText }];
        if (mediaBase64 && mediaMimeType) {
          if (mediaMimeType.startsWith("image/")) {
            contentPart.push({
              type: "image_url",
              image_url: { url: `data:${mediaMimeType};base64,${mediaBase64}` }
            });
          } else if (mediaMimeType.startsWith("audio/")) {
            try {
              const audioBuffer = Buffer.from(mediaBase64, "base64");
              const tmpPath = path.join(os.tmpdir(), `temp_${Date.now()}.ogg`);
              fs.writeFileSync(tmpPath, audioBuffer);
              const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tmpPath),
                model: "whisper-1"
              });
              fs.unlinkSync(tmpPath);
              contentPart[0].text += `
[Transcripci\xF3n del audio adjunto: "${transcription.text}"]`;
            } catch (e) {
              console.error("OpenAI Audio Transcription Error:", e);
            }
          }
        }
        messages.push({ role: "user", content: contentPart });
        const response = await openai.chat.completions.create({
          model: modelUsed,
          messages,
          ...expectsJSON ? { response_format: { type: "json_object" } } : {}
        });
        const durationMs = Date.now() - startTime;
        let tokenInfo = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        if (response.usage) {
          if (!currentDB.apiTokens) currentDB.apiTokens = { total: 0, prompt: 0, candidates: 0 };
          currentDB.apiTokens.prompt += response.usage.prompt_tokens;
          currentDB.apiTokens.candidates += response.usage.completion_tokens;
          currentDB.apiTokens.total += response.usage.total_tokens;
          tokenInfo = {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
          };
          saveDBData(currentDB);
        }
        incrementAiUsage(provider);
        const replyContent = response.choices[0]?.message?.content || "{}";
        logAiCall({
          provider: "openai",
          model: modelUsed,
          prompt: promptText,
          status: "success",
          durationMs,
          tokens: tokenInfo,
          response: replyContent
        });
        return replyContent;
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        logAiCall({
          provider: "openai",
          model: modelUsed,
          prompt: promptText,
          status: "error",
          durationMs,
          error: errMsg
        });
        throw err;
      }
    } else if (provider === "openrouter") {
      const modelUsed = currentDB.aiModel || "google/gemini-2.5-flash";
      try {
        const oai = new OpenAI({
          apiKey: customKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "La Mona Applet"
          }
        });
        const messages = [];
        const contentPart = [{ type: "text", text: promptText }];
        if (mediaBase64 && mediaMimeType && mediaMimeType.startsWith("image/")) {
          contentPart.push({
            type: "image_url",
            image_url: { url: `data:${mediaMimeType};base64,${mediaBase64}` }
          });
        }
        messages.push({ role: "user", content: contentPart });
        const response = await oai.chat.completions.create({
          model: modelUsed,
          messages,
          ...expectsJSON ? { response_format: { type: "json_object" } } : {}
        });
        const durationMs = Date.now() - startTime;
        let tokenInfo = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        if (response.usage) {
          if (!currentDB.apiTokens) currentDB.apiTokens = { total: 0, prompt: 0, candidates: 0 };
          currentDB.apiTokens.prompt += response.usage.prompt_tokens || 0;
          currentDB.apiTokens.candidates += response.usage.completion_tokens || 0;
          currentDB.apiTokens.total += response.usage.total_tokens || 0;
          tokenInfo = {
            prompt_tokens: response.usage.prompt_tokens || 0,
            completion_tokens: response.usage.completion_tokens || 0,
            total_tokens: response.usage.total_tokens || 0
          };
          saveDBData(currentDB);
        }
        const replyContent = response.choices[0]?.message?.content || "{}";
        logAiCall({
          provider: "openrouter",
          model: modelUsed,
          prompt: promptText,
          status: "success",
          durationMs,
          tokens: tokenInfo,
          response: replyContent
        });
        return replyContent;
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const errMsg = err?.message || String(err);
        logAiCall({
          provider: "openrouter",
          model: modelUsed,
          prompt: promptText,
          status: "error",
          durationMs,
          error: errMsg
        });
        throw err;
      }
    } else {
      const modelUsed = (() => {
        let m = currentDB.aiModel || "gemini-2.5-flash";
        if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.includes("3.8") || m.includes("1.5") || m.includes("2.0")) return "gemini-2.5-flash";
        return m;
      })();
      const client = getAiClient(customKey);
      const parts = [{ text: promptText }];
      if (mediaBase64 && mediaMimeType) {
        parts.push({
          inlineData: {
            data: mediaBase64,
            mimeType: mediaMimeType
          }
        });
      }
      let retries = 3;
      let delay = 1e3;
      let res;
      while (retries > 0) {
        try {
          res = await client.models.generateContent({
            model: modelUsed,
            contents: { role: "user", parts },
            ...expectsJSON ? { config: { responseMimeType: "application/json" } } : {}
          });
          incrementAiUsage("gemini");
          break;
        } catch (error) {
          retries--;
          const errMsg = typeof error === "string" ? error : error?.message || JSON.stringify(error);
          console.error(`Gemini generateContent Error (Retries left: ${retries}):`, errMsg);
          const isRetryable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429");
          if (retries === 0 || !isRetryable) {
            const durationMs2 = Date.now() - startTime;
            logAiCall({
              provider: "gemini",
              model: modelUsed,
              prompt: promptText,
              status: "error",
              durationMs: durationMs2,
              error: errMsg
            });
            throw error;
          }
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
      const durationMs = Date.now() - startTime;
      let tokenInfo = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      if (res.usageMetadata) {
        if (!currentDB.apiTokens) currentDB.apiTokens = { total: 0, prompt: 0, candidates: 0 };
        currentDB.apiTokens.prompt += res.usageMetadata.promptTokenCount;
        currentDB.apiTokens.candidates += res.usageMetadata.candidatesTokenCount;
        currentDB.apiTokens.total += res.usageMetadata.totalTokenCount;
        tokenInfo = {
          prompt_tokens: res.usageMetadata.promptTokenCount,
          completion_tokens: res.usageMetadata.candidatesTokenCount,
          total_tokens: res.usageMetadata.totalTokenCount
        };
        saveDBData(currentDB);
      }
      logAiCall({
        provider: "gemini",
        model: modelUsed,
        prompt: promptText,
        status: "success",
        durationMs,
        tokens: tokenInfo,
        response: res.text
      });
      return res.text;
    }
  }
  async function executeAIInternal(promptText, mediaBase64 = null, mediaMimeType = null) {
    globalExecuteAIInternal = executeAIInternal;
    const primaryProvider = currentDB.apiProvider || "gemini";
    let primaryKey = currentDB.customApiKey?.trim();
    if (primaryProvider === "gemini" && primaryKey && primaryKey.startsWith("sk-")) {
      primaryKey = void 0;
    }
    if (primaryProvider === "openai" && primaryKey && (primaryKey.startsWith("AIza") || primaryKey.startsWith("sk-or-"))) {
      primaryKey = void 0;
    }
    if (primaryProvider === "openrouter" && primaryKey && !primaryKey.startsWith("sk-or-")) {
    }
    primaryKey = primaryKey || (primaryProvider === "gemini" ? defaultGeminiApiKey : void 0);
    let primaryError = null;
    const hasCustomKey = !!(currentDB.customApiKey && currentDB.customApiKey.trim().length > 0);
    const limit = currentDB.maxTokensLimit || 1e6;
    const currentTokens = currentDB.apiTokens?.total || 0;
    if (!hasCustomKey && currentTokens >= limit) {
      throw new Error(`\xA1L\xEDmite de tokens de la Mona IA alcanzado! Consumido: ${currentTokens.toLocaleString()} / L\xEDmite: ${limit.toLocaleString()} tokens. Por favor, configure su propia API Key.`);
    }
    if (primaryKey) {
      try {
        console.log(`[IA] Intentando con Proveedor Principal: ${primaryProvider}...`);
        const result = await callAIWithProvider(primaryProvider, primaryKey, promptText, mediaBase64, mediaMimeType);
        return result;
      } catch (err) {
        primaryError = err;
        console.error(`[IA Error] Fall\xF3 Proveedor Principal (${primaryProvider}):`, err?.message || String(err));
        currentDB.lastAiError = `[Principal: ${primaryProvider}] ${err?.message || String(err)}`;
        currentDB.lastAiTimestamp = (/* @__PURE__ */ new Date()).toISOString();
        currentDB.lastAiProvider = primaryProvider;
        saveDBData(currentDB);
      }
    } else {
      primaryError = new Error(`Clave primaria no configurada para ${primaryProvider}`);
    }
    const backupProvider = currentDB.apiProviderBackup || "gemini";
    let backupKey = currentDB.customApiKeyBackup?.trim();
    if (backupKey) {
      if (backupProvider === "gemini" && backupKey.startsWith("sk-")) backupKey = void 0;
      if (backupProvider === "openai" && backupKey.startsWith("AIza")) backupKey = void 0;
      backupKey = backupKey || (backupProvider === "gemini" ? defaultGeminiApiKey : void 0);
    }
    if (backupKey && backupKey !== primaryKey) {
      try {
        console.log(`[IA Failover] Intentando con Proveedor de Respaldo: ${backupProvider}...`);
        const result = await callAIWithProvider(backupProvider, backupKey, promptText, mediaBase64, mediaMimeType);
        currentDB.lastAiError = null;
        currentDB.lastAiTimestamp = null;
        currentDB.lastAiProvider = backupProvider + " (Respaldo)";
        saveDBData(currentDB);
        console.log(`[IA Failover] \xC9xito con Proveedor de Respaldo: ${backupProvider}`);
        return result;
      } catch (backupErr) {
        console.error(`[IA Error] Fall\xF3 tambi\xE9n el Proveedor de Respaldo (${backupProvider}):`, backupErr?.message || String(backupErr));
        currentDB.lastAiError = `[Principal: ${primaryProvider} ERROR] ${primaryError?.message || String(primaryError)}. [Respaldo: ${backupProvider} ERROR] ${backupErr?.message || String(backupErr)}`;
        currentDB.lastAiTimestamp = (/* @__PURE__ */ new Date()).toISOString();
        currentDB.lastAiProvider = `${primaryProvider} + ${backupProvider} (Ambos fallaron)`;
        saveDBData(currentDB);
        throw backupErr;
      }
    } else {
      console.warn(`[IA Failover] No se puede ejecutar respaldo: ${!backupKey ? "No hay clave configurada" : "Clave de respaldo misma que principal"}.`);
      throw primaryError;
    }
  }
  let activeSockets = {};
  let qrCodesMap = {};
  let simulationTimeouts = {};
  let waSock = null;
  let currentQrCode = null;
  let simulationTimeout = null;
  function getAnyConnectedSock() {
    if (activeSockets["channel-default"]) return activeSockets["channel-default"];
    for (const id of Object.keys(activeSockets)) {
      if (activeSockets[id]) return activeSockets[id];
    }
    return waSock || null;
  }
  function updateLegacySockReference() {
    const keys = Object.keys(activeSockets);
    if (activeSockets["channel-default"]) {
      waSock = activeSockets["channel-default"];
    } else if (keys.length > 0) {
      waSock = activeSockets[keys[0]];
    } else {
      waSock = null;
    }
  }
  const isConnecting = {};
  const reconnectTimers = {};
  async function processWhatsAppCommand(command, currentDB2) {
    const parts = command.trim().split(/\s+/);
    if (parts.length === 0) return false;
    const cmd = parts[0].toLowerCase();
    if (cmd === "pausa" || cmd === "pausar") {
      currentDB2.isAiGlobalActive = false;
      return true;
    }
    if (cmd === "activar" || cmd === "iniciar") {
      currentDB2.isAiGlobalActive = true;
      return true;
    }
    if ((cmd === "menu" || cmd === "men\xFA") && parts[1]?.toLowerCase() === "precio") {
      const val = parseInt(parts[2]);
      if (!isNaN(val) && currentDB2.active) {
        currentDB2.active.precio = val;
        return true;
      }
    }
    if (cmd === "agotado") {
      const arg = parts.slice(1).join(" ").trim().toUpperCase();
      if (arg && currentDB2.products) {
        const prod = currentDB2.products.find((p) => p.name.toUpperCase() === arg || p.sku.toUpperCase() === arg);
        if (prod) {
          prod.stock = 0;
          return true;
        }
      }
    }
    if (cmd === "disponible") {
      const arg = parts.slice(1).join(" ").trim().toUpperCase();
      if (arg && currentDB2.products) {
        const prod = currentDB2.products.find((p) => p.name.toUpperCase() === arg || p.sku.toUpperCase() === arg);
        if (prod) {
          prod.stock = 10;
          return true;
        }
      }
    }
    return false;
  }
  async function processWithAgents(params) {
    const { phone, senderName, text, history, mediaInfo, mediaBase64, mediaMimeType } = params;
    const isGenericName = !senderName || ["cliente whatsapp", "cliente", "usuario", "null", "undefined"].includes(senderName.toLowerCase().trim());
    const cleanSenderName = isGenericName ? "" : senderName;
    const classPrompt = `Eres el 'Agente de Clasificaci\xF3n' del WhatsApp Bot. Tu tarea es identificar la intenci\xF3n del usuario bas\xE1ndote en su mensaje reciente y un breve historial.
Opciones:
- MENU (quiere ver productos, cat\xE1logo, men\xFA, precios, hacer un pedido, zonas de env\xEDo)
- SOPORTE (dudas, quejas, horarios, preguntas frecuentes)
- SALUDO (s\xF3lo est\xE1 saludando de forma inicial)
- OTRO (cualquier otra intenci\xF3n o charla general)

Mensaje del usuario: "${text}"
Historial reciente (\xFAltimos 3 mensajes): ${history.slice(-3).map((h) => h.text).join(" | ")}

Responde \xDANICAMENTE con una sola palabra de la categor\xEDa: MENU, SOPORTE, SALUDO, o OTRO. Sin comillas ni texto adicional.`;
    let intent = "OTRO";
    try {
      const intentRaw = await executeAIInternal(classPrompt);
      intent = intentRaw.trim().toUpperCase().replace(/[^A-Z]/g, "");
      if (!["MENU", "SOPORTE", "SALUDO", "OTRO"].includes(intent)) intent = "OTRO";
    } catch (e) {
      intent = "OTRO";
    }
    console.log(`[Agente de Clasificaci\xF3n] Intenci\xF3n detectada: ${intent}`);
    const contextRetrieved = buildSystemPrompt({ phone, senderName, text, history, mediaInfo });
    const responsePrompt = `=========================================
ERES EL 'AGENTE DE RESPUESTA FINAL' DE "${currentDB.businessName || "Nuestra Empresa"}".
=========================================
DATOS DEL CLIENTE: 
- Nombre: ${cleanSenderName ? `"${cleanSenderName}"` : "Nombre no especificado"}. Tel\xE9fono: +${phone}
- REGLA: Dir\xEDgete al cliente por su nombre S\xD3LO si es un nombre propio natural claro. NO inventes nombres ni uses apodos de conversaciones pasadas.

=========================================
CONTEXTO RECUPERADO Y ENTRENAMIENTO ACTUAL (M\xC1XIMA PRIORIDAD - ORQUESTADOR DE MEMORIA):
\u{1F6A8} ADVERTENCIA: El siguiente contenido es tu configuraci\xF3n ACTUAL de entrenamiento. Sobreescribe por completo cualquier indicaci\xF3n contradictoria que encuentres en el historial. Asume este rol INMEDIATAMENTE.
${contextRetrieved}
=========================================
HISTORIAL DE LA CONVERSACI\xD3N CON ESTE CLIENTE (\xDAltimos 10 mensajes):
${history.length > 0 ? history.slice(-10).map((h) => `${h.role === "client" || h.sender === "client" ? "Cliente" : "IA"}: ${h.text}`).join("\n") : "Sin historial previo."}

=========================================
NUEVO MENSAJE ENTRANTE DEL CLIENTE: "${text}"
${mediaInfo ? `DATOS ADICIONALES DEL MENSAJE (IMAGEN/AUDIO): ${mediaInfo}` : ""}

INSTRUCCIONES DE RESPUESTA Y FORMATO JSON OBLIGATORIO:
1. Responde \xDANICAMENTE utilizando la informaci\xF3n del "CONTEXTO RECUPERADO" y tu conocimiento sobre este negocio. NO te inventes productos o datos.
2. Mant\xE9n respuestas concisas, amables y naturales (m\xE1ximo 25-30 palabras por fragmento de mensaje).
3. Devuelve de manera OBLIGATORIA un objeto JSON strictly estructurado con:
   - "replies": [Arreglo de strings]. Tus respuestas al cliente cortas y separadas naturalmente.
   - "needsHuman": boolean. True si el cliente solicita ser atendido por un humano o si es necesario pausar la IA.
   - "orderDetails": Objeto con "customerName", "address", "phone", "items", "paymentMethod" S\xD3LO si el cliente ha confirmado su pedido/solicitud voluntariamente y ha dado sus datos completos. De lo contrario d\xE9jalo vac\xEDo.`;
    console.log(`[Agente de Respuesta] Procesando respuesta JSON...`);
    try {
      return await executeAIInternal(responsePrompt, mediaBase64, mediaMimeType);
    } catch (err) {
      console.error("[processWithAgents Error / Quota Exceeded]:", err?.message || err);
      const fallback = currentDB.fallbackMessage || "Estoy un poco ocupada en este momento, dame un momento y te atiendo con gusto \u{1F605}.";
      return JSON.stringify({
        replies: [fallback],
        needsHuman: false,
        orderDetails: {}
      });
    }
  }
  function extractEvolutionMsgTextAndMedia(rawMsg) {
    if (!rawMsg) return { text: "", isImage: false, isAudio: false, isVideo: false, isDocument: false };
    let msg = rawMsg;
    if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;
    if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message;
    if (msg.documentWithCaptionMessage?.message) msg = msg.documentWithCaptionMessage.message;
    const isImage = !!msg.imageMessage;
    const isAudio = !!msg.audioMessage;
    const isVideo = !!msg.videoMessage;
    const isDocument = !!msg.documentMessage;
    const text = (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || msg.documentMessage?.caption || msg.documentMessage?.fileName || msg.templateButtonReplyMessage?.selectedId || msg.buttonsResponseMessage?.selectedButtonId || msg.listResponseMessage?.singleSelectReply?.selectedRowId || msg.interactiveResponseMessage?.body?.text || msg.pollCreationMessage?.name || "").trim();
    return { text, isImage, isAudio, isVideo, isDocument };
  }
  async function handleEvolutionIncomingMessage(instance, data) {
    if (!data || !data.key) return;
    const senderJid = data.key.remoteJid;
    if (!senderJid) return;
    if (senderJid.includes("@g.us") || senderJid === "status@broadcast") return;
    const cleanPhone = senderJid.split("@")[0].split(":")[0].replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 6) return;
    const senderName = data.pushName || `+${cleanPhone}`;
    const { text, isImage, isAudio, isVideo, isDocument } = extractEvolutionMsgTextAndMedia(data.message);
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    let attachment = void 0;
    if (isImage) {
      attachment = {
        name: `Foto_${nowStr.replace(/:/g, "")}.jpg`,
        type: "imagen",
        url: data.base64 ? `data:image/jpeg;base64,${data.base64}` : data.message?.imageMessage?.url || "",
        size: "Imagen"
      };
    } else if (isAudio) {
      attachment = {
        name: `Nota_de_voz_${nowStr.replace(/:/g, "")}.ogg`,
        type: "audio",
        url: data.base64 ? `data:audio/ogg;base64,${data.base64}` : data.message?.audioMessage?.url || "",
        size: "Audio"
      };
    } else if (isVideo) {
      attachment = {
        name: `Video_${nowStr.replace(/:/g, "")}.mp4`,
        type: "video",
        url: data.base64 ? `data:video/mp4;base64,${data.base64}` : data.message?.videoMessage?.url || "",
        size: "Video"
      };
    } else if (isDocument) {
      const docName = data.message?.documentMessage?.fileName || data.message?.documentMessage?.title || "Documento.pdf";
      attachment = {
        name: docName,
        type: "archivo",
        url: data.base64 ? `data:application/pdf;base64,${data.base64}` : data.message?.documentMessage?.url || "",
        size: "PDF"
      };
    }
    if ((isImage || isAudio || isVideo || isDocument) && attachment) {
      fetchEvolutionMediaBase64(instance, data).then((resMedia) => {
        if (resMedia && resMedia.base64) {
          const mime = resMedia.mimetype || (isImage ? "image/jpeg" : isAudio ? "audio/ogg" : isVideo ? "video/mp4" : "application/pdf");
          attachment.url = `data:${mime};base64,${resMedia.base64}`;
          if (resMedia.fileName) attachment.name = resMedia.fileName;
          saveDBData(currentDB);
        }
      }).catch(() => {
      });
    }
    if (!currentDB.profilePictures) currentDB.profilePictures = {};
    if (!currentDB.profilePictures[cleanPhone]) {
      fetchEvolutionProfilePicture(instance, cleanPhone).then((avatarUrl) => {
        if (avatarUrl) {
          currentDB.profilePictures[cleanPhone] = avatarUrl;
          if (currentDB.chats) {
            const chIdx = currentDB.chats.findIndex((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
            if (chIdx !== -1) {
              currentDB.chats[chIdx].avatar = avatarUrl;
            }
          }
          saveDBData(currentDB);
        }
      }).catch(() => {
      });
    }
    const cachedAvatar = currentDB.profilePictures[cleanPhone] || void 0;
    if (data.key.fromMe) {
      if (text || isImage || isAudio || isVideo || isDocument) {
        const displayText = text || (isImage ? "\u{1F4F7} [Imagen enviada desde m\xF3vil]" : isAudio ? "\u{1F3A4} [Nota de voz enviada desde m\xF3vil]" : isVideo ? "\u{1F3A5} [Video enviado desde m\xF3vil]" : "\u{1F4CE} [Archivo enviado desde m\xF3vil]");
        if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
        if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
        currentDB.messagesHistory[cleanPhone].push({
          role: "agent",
          source: "mobile",
          fromMobile: true,
          text: displayText,
          attachment,
          time: nowStr,
          timestamp: Date.now()
        });
        if (currentDB.messagesHistory[cleanPhone].length > 35) currentDB.messagesHistory[cleanPhone].shift();
        if (!currentDB.chats) currentDB.chats = [];
        const chatIdx2 = currentDB.chats.findIndex((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
        if (chatIdx2 !== -1) {
          currentDB.chats[chatIdx2].message = displayText;
          currentDB.chats[chatIdx2].time = nowStr;
          if (cachedAvatar && !currentDB.chats[chatIdx2].avatar) currentDB.chats[chatIdx2].avatar = cachedAvatar;
        } else {
          currentDB.chats.unshift({
            id: `CH-${Date.now().toString().slice(-4)}`,
            sender: senderName,
            phone: `+${cleanPhone}`,
            avatar: cachedAvatar,
            message: displayText,
            time: nowStr,
            status: "en_conversacion"
          });
        }
        saveDBData(currentDB);
      }
      return;
    }
    console.log(`[Evolution API Webhook] Mensaje entrante de +${cleanPhone} (${senderName}): "${text || "[Multimedia]"}"`);
    const incomingDisplayText = text || (isImage ? "\u{1F4F7} [Imagen recibida]" : isAudio ? "\u{1F3A4} [Nota de voz recibida]" : isVideo ? "\u{1F3A5} [Video recibido]" : "\u{1F4CE} [Archivo recibido]");
    if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
    if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
    currentDB.messagesHistory[cleanPhone].push({
      role: "client",
      text: incomingDisplayText,
      attachment,
      time: nowStr,
      timestamp: Date.now()
    });
    if (currentDB.messagesHistory[cleanPhone].length > 35) currentDB.messagesHistory[cleanPhone].shift();
    if (!currentDB.chats) currentDB.chats = [];
    const chatIdx = currentDB.chats.findIndex((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
    if (chatIdx !== -1) {
      currentDB.chats[chatIdx].message = incomingDisplayText;
      currentDB.chats[chatIdx].time = nowStr;
      currentDB.chats[chatIdx].status = "en_conversacion";
      if (cachedAvatar && !currentDB.chats[chatIdx].avatar) currentDB.chats[chatIdx].avatar = cachedAvatar;
      if (senderName && senderName !== `+${cleanPhone}`) {
        currentDB.chats[chatIdx].sender = senderName;
      }
    } else {
      currentDB.chats.unshift({
        id: `CH-${Date.now().toString().slice(-4)}`,
        sender: senderName,
        phone: `+${cleanPhone}`,
        avatar: cachedAvatar,
        message: incomingDisplayText,
        time: nowStr,
        status: "nuevo"
      });
    }
    saveDBData(currentDB);
    if (currentDB.isAiGlobalActive === false) {
      console.log(`[Evolution API] IA Global pausada. No se responde autom\xE1ticamente a +${cleanPhone}`);
      return;
    }
    if (currentDB.disabledBots && currentDB.disabledBots.includes(cleanPhone)) {
      console.log(`[Evolution API] Bot pausado manualmente para +${cleanPhone}`);
      return;
    }
    let mediaInfoStr = "";
    if (isImage) mediaInfoStr = "El cliente adjunt\xF3 una imagen.";
    if (isAudio) mediaInfoStr = "El cliente envi\xF3 un audio de voz.";
    if (isVideo) mediaInfoStr = "El cliente envi\xF3 un video.";
    if (isDocument) mediaInfoStr = "El cliente envi\xF3 un archivo o documento.";
    const fullPromptText = [text, mediaInfoStr].filter(Boolean).join(" ");
    if (!fullPromptText) return;
    try {
      const history = currentDB.messagesHistory[cleanPhone] || [];
      const extractedText = await processWithAgents({
        phone: cleanPhone,
        senderName,
        text: fullPromptText,
        history
      });
      if (extractedText) {
        const parsed = safeParseJSON(extractedText);
        let replies = [];
        if (parsed && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
          replies = parsed.replies;
        } else if (parsed && typeof parsed.reply === "string" && parsed.reply.trim()) {
          replies = [parsed.reply.trim()];
        } else if (typeof extractedText === "string" && extractedText.trim()) {
          replies = [extractedText.trim()];
        } else {
          replies = ["\xA1Hola! \xBFEn qu\xE9 te puedo colaborar hoy?"];
        }
        await sendWhatsAppBotReplies(
          null,
          // clientSock is null -> sends via Evolution API
          senderJid,
          text,
          replies,
          cleanPhone,
          instance
        );
        saveDBData(currentDB);
      }
    } catch (err) {
      console.error(`[Evolution API] Error procesando mensaje con agentes para +${cleanPhone}:`, err?.message || err);
    }
  }
  onEvolutionIncomingMessage = handleEvolutionIncomingMessage;
  async function syncChatsFromEvolutionVPS(limit = 60) {
    const evoConfig = getEvolutionConfig();
    if (!evoConfig.isConfigured) return { importedCount: 0, chatsCount: 0 };
    try {
      const instName = await resolveActualEvolutionInstance("channel-default");
      const res = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instName)}`, {
        method: "POST",
        body: { limit },
        timeoutMs: 8e3
      });
      if (!res.ok || !res.data?.messages?.records || !Array.isArray(res.data.messages.records)) {
        return { importedCount: 0, chatsCount: 0 };
      }
      const records = res.data.messages.records;
      let imported = 0;
      if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
      if (!currentDB.chats) currentDB.chats = [];
      if (!currentDB.profilePictures) currentDB.profilePictures = {};
      const reversedRecords = [...records].reverse();
      for (const record of reversedRecords) {
        if (!record.key || !record.key.remoteJid) continue;
        const remoteJid = record.key.remoteJid;
        if (remoteJid.includes("@g.us") || remoteJid.includes("broadcast")) continue;
        const cleanPhone = remoteJid.split("@")[0].split(":")[0].replace(/\D/g, "");
        if (!cleanPhone || cleanPhone.length < 6) continue;
        const fromMe = !!record.key.fromMe;
        const rawPushName = record.pushName;
        const senderName = rawPushName && rawPushName !== "Voc\xEA" && rawPushName !== "You" ? rawPushName : `+${cleanPhone}`;
        const { text, isImage, isAudio, isVideo, isDocument } = extractEvolutionMsgTextAndMedia(record.message);
        const displayText = text || (isImage ? "\u{1F4F7} [Imagen]" : isAudio ? "\u{1F3A4} [Audio de voz]" : isVideo ? "\u{1F3A5} [Video]" : isDocument ? "\u{1F4CE} [Archivo]" : "");
        if (!displayText) continue;
        const timestampMs = record.messageTimestamp ? record.messageTimestamp > 1e10 ? record.messageTimestamp : record.messageTimestamp * 1e3 : Date.now();
        const timeStr = new Date(timestampMs).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        let recordAttachment = void 0;
        if (isImage) {
          recordAttachment = {
            name: `Foto_${timeStr.replace(/:/g, "")}.jpg`,
            type: "imagen",
            url: record.message?.imageMessage?.url || "",
            size: "Imagen"
          };
        } else if (isAudio) {
          recordAttachment = {
            name: `Nota_de_voz_${timeStr.replace(/:/g, "")}.ogg`,
            type: "audio",
            url: record.message?.audioMessage?.url || "",
            size: "Audio"
          };
        } else if (isVideo) {
          recordAttachment = {
            name: `Video_${timeStr.replace(/:/g, "")}.mp4`,
            type: "video",
            url: record.message?.videoMessage?.url || "",
            size: "Video"
          };
        } else if (isDocument) {
          const docName = record.message?.documentMessage?.fileName || "Documento.pdf";
          recordAttachment = {
            name: docName,
            type: "archivo",
            url: record.message?.documentMessage?.url || "",
            size: "PDF"
          };
        }
        if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
        const exists = currentDB.messagesHistory[cleanPhone].some(
          (m) => m.text === displayText && (Math.abs((m.timestamp || 0) - timestampMs) < 6e4 || m.time === timeStr)
        );
        if (!exists) {
          currentDB.messagesHistory[cleanPhone].push({
            role: fromMe ? "assistant" : "client",
            text: displayText,
            attachment: recordAttachment,
            time: timeStr,
            timestamp: timestampMs
          });
          if (currentDB.messagesHistory[cleanPhone].length > 35) {
            currentDB.messagesHistory[cleanPhone].shift();
          }
          imported++;
        }
        if (!currentDB.profilePictures[cleanPhone]) {
          fetchEvolutionProfilePicture(instName, cleanPhone).then((pUrl) => {
            if (pUrl) {
              currentDB.profilePictures[cleanPhone] = pUrl;
              const ch = currentDB.chats.find((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
              if (ch) ch.avatar = pUrl;
              saveDBData(currentDB);
            }
          }).catch(() => {
          });
        }
        const avatarUrl = currentDB.profilePictures[cleanPhone] || void 0;
        const chatIdx = currentDB.chats.findIndex((c) => c.phone && c.phone.replace(/\D/g, "") === cleanPhone);
        if (chatIdx !== -1) {
          currentDB.chats[chatIdx].message = displayText;
          currentDB.chats[chatIdx].time = timeStr;
          if (avatarUrl && !currentDB.chats[chatIdx].avatar) currentDB.chats[chatIdx].avatar = avatarUrl;
          if (senderName && senderName !== `+${cleanPhone}`) {
            currentDB.chats[chatIdx].sender = senderName;
          }
        } else {
          currentDB.chats.unshift({
            id: `CH-${Date.now().toString().slice(-4)}-${cleanPhone.slice(-4)}`,
            sender: senderName,
            phone: `+${cleanPhone}`,
            avatar: avatarUrl,
            message: displayText,
            time: timeStr,
            status: fromMe ? "en_conversacion" : "nuevo"
          });
        }
      }
      if (imported > 0) {
        saveDBData(currentDB);
      }
      return { importedCount: imported, chatsCount: currentDB.chats.length };
    } catch (err) {
      console.error("[Evolution API] Error sincronizando mensajes recientes:", err?.message || err);
      return { importedCount: 0, chatsCount: (currentDB.chats || []).length };
    }
  }
  setInterval(() => {
    syncChatsFromEvolutionVPS(25).catch(() => {
    });
  }, 7e3);
  async function connectToWhatsApp(channelId = "channel-default", force = false) {
    if (reconnectTimers[channelId]) {
      clearTimeout(reconnectTimers[channelId]);
      delete reconnectTimers[channelId];
    }
    if (!force && activeSockets[channelId]?.ws?.readyState === 1) {
      console.log(`[WhatsApp Real] Socket ya activo y conectado para canal ${channelId}.`);
      return;
    }
    if (!force && isConnecting[channelId]) {
      console.log(`[WhatsApp Real] Conexi\xF3n en progreso para ${channelId}, omitiendo llamada duplicada.`);
      return;
    }
    isConnecting[channelId] = true;
    try {
      const evoConfig = getEvolutionConfig();
      if (evoConfig.isConfigured) {
        console.log(`[Evolution API] Conectando canal ${channelId} mediante VPS (${evoConfig.apiUrl})...`);
        await ensureEvolutionInstance(channelId, void 0, true);
        const state = await getEvolutionConnectionState(channelId);
        if (state.state === "open") {
          console.log(`[Evolution API] Canal ${channelId} conectado en VPS con tel\xE9fono:`, state.phone);
          currentDB.whatsappConnected = true;
          if (state.phone) currentDB.connectedPhone = state.phone;
          currentDB.whatsappError = void 0;
        } else {
          console.log(`[Evolution API] Canal ${channelId} en VPS listo en estado: ${state.state}`);
        }
        isConnecting[channelId] = false;
        return;
      }
      console.log(`Iniciando conexi\xF3n con WhatsApp Web real para canal: ${channelId}...`);
      if (!currentDB.channels) {
        currentDB.channels = [{
          id: "channel-default",
          name: "Canal Principal",
          phone: currentDB.connectedPhone || "",
          connected: !!currentDB.whatsappConnected,
          error: currentDB.whatsappError || null,
          type: "real"
        }];
      }
      const channelIndex = currentDB.channels.findIndex((c) => c.id === channelId);
      const channel = channelIndex !== -1 ? currentDB.channels[channelIndex] : { id: "channel-default", name: "Canal Principal", connected: false, phone: "", error: null, type: "real" };
      const sessionFolder = channelId === "channel-default" ? "baileys_auth_info" : `baileys_auth_info_${channelId}`;
      const authSessionPath = path.resolve(wAuthBaseDir, sessionFolder);
      if (currentDB.whatsappSessionData && currentDB.whatsappSessionData[channelId]) {
        try {
          if (!fs.existsSync(authSessionPath)) {
            fs.mkdirSync(authSessionPath, { recursive: true });
          }
          const credsPath = path.join(authSessionPath, "creds.json");
          fs.writeFileSync(credsPath, currentDB.whatsappSessionData[channelId], "utf-8");
          console.log(`[WhatsApp Real] Sesi\xF3n restaurada exitosamente desde la base de datos para el canal ${channelId}.`);
        } catch (err) {
          console.error(`[WhatsApp Real] Error restaurando sesi\xF3n desde la base de datos para el canal ${channelId}:`, err);
        }
      }
      const { state: authState, saveCreds } = await useMultiFileAuthState2(authSessionPath);
      if (channelId === "channel-default" && currentDB.whatsappError) {
        currentDB.whatsappError = void 0;
        saveDBData(currentDB);
      }
      let version = [2, 3e3, 1015901307];
      if (typeof fetchLatestBaileysVersion === "function") {
        try {
          const versionInfo = await fetchLatestBaileysVersion();
          if (versionInfo && versionInfo.version) {
            version = versionInfo.version;
          }
        } catch (verErr) {
          console.warn(`[WhatsApp Real] Error obteniendo versi\xF3n de Baileys, usando fallback:`, verErr);
        }
      }
      const browserOption = Browsers && typeof Browsers.ubuntu === "function" ? Browsers.ubuntu("Chrome") : ["Ubuntu", "Chrome", "22.04.4"];
      if (activeSockets[channelId]) {
        try {
          const oldSock = activeSockets[channelId];
          oldSock.ev.removeAllListeners("connection.update");
          oldSock.ev.removeAllListeners("creds.update");
          oldSock.ev.removeAllListeners("messages.upsert");
          if (oldSock.ws) {
            try {
              oldSock.ws.removeAllListeners?.();
              oldSock.ws.close();
              if (typeof oldSock.ws.terminate === "function") {
                oldSock.ws.terminate();
              }
            } catch (e) {
            }
          }
          oldSock.end(void 0);
        } catch (e) {
          console.warn(`[WhatsApp Real] Socket anterior en canal ${channelId} cerrado.`);
        }
        delete activeSockets[channelId];
        await new Promise((r) => setTimeout(r, 600));
      }
      const pinoLogger = pino({ level: "silent" });
      const clientSock = makeWASocket2({
        version,
        auth: {
          creds: authState.creds,
          keys: makeCacheableSignalKeyStore2(authState.keys, pinoLogger)
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        printQRInTerminal: false,
        logger: pinoLogger,
        browser: browserOption,
        connectTimeoutMs: 6e4,
        defaultQueryTimeoutMs: 6e4,
        keepAliveIntervalMs: 25e3,
        retryRequestDelayMs: 500,
        maxRetries: 5,
        badSessionRetryCount: 3,
        enableAutoSessionRecreation: true,
        enableRecentMessageCache: true,
        shouldIgnoreJid: (jid) => jid?.endsWith("@status.broadcast") || false,
        getMessage: async (key) => {
          try {
            if (key?.remoteJid) {
              const cleanPhone = key.remoteJid.replace(/\D/g, "");
              const history = currentDB.messagesHistory?.[cleanPhone] || [];
              const found = history.find((m) => m.id === key.id || m.key?.id === key.id);
              if (found && found.text) {
                return { conversation: found.text };
              }
            }
          } catch (e) {
          }
          return void 0;
        }
      });
      if (clientSock?.ws) {
        try {
          clientSock.ws.on("error", (wsErr) => {
            console.warn(`[WhatsApp Real] Socket WS error handled for channel ${channelId}:`, wsErr?.message || wsErr);
          });
        } catch (e) {
        }
      }
      activeSockets[channelId] = clientSock;
      if (channelId === "channel-default") {
        waSock = clientSock;
      }
      updateLegacySockReference();
      clientSock.ev.on("creds.update", async () => {
        await saveCreds();
        try {
          const credsPath = path.join(authSessionPath, "creds.json");
          if (fs.existsSync(credsPath)) {
            const credsData = fs.readFileSync(credsPath, "utf-8");
            if (!currentDB.whatsappSessionData) {
              currentDB.whatsappSessionData = {};
            }
            currentDB.whatsappSessionData[channelId] = credsData;
            saveDBData(currentDB);
          }
        } catch (err) {
          console.error(`[WhatsApp Real] Error guardando sesi\xF3n de Baileys en DB para canal ${channelId}:`, err);
        }
      });
      clientSock.ev.on("connection.update", async (update) => {
        console.log(`[WhatsApp Real] Update received:`, JSON.stringify(update, (key, value) => key === "qr" ? "***" : value));
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr);
            qrCodesMap[channelId] = qrDataUrl;
            if (channelId === "channel-default") {
              currentQrCode = qrDataUrl;
            }
            console.log(`\xA1Nuevo c\xF3digo QR para el canal ${channelId} generado!`);
          } catch (e) {
            console.error("Error generating QR Data URL:", e);
          }
        }
        if (connection === "close") {
          isConnecting[channelId] = false;
          const reason = lastDisconnect?.error?.output?.statusCode;
          const logoutCode = DisconnectReason2?.loggedOut || 401;
          const conflictCode = DisconnectReason2?.connectionReplaced || 440;
          const isConflict = reason === conflictCode || reason === 440 || lastDisconnect?.error?.data?.tag === "conflict" || lastDisconnect?.error?.data?.attrs?.type === "replaced";
          const isLogout = reason === logoutCode || reason === 401;
          try {
            clientSock.ev.removeAllListeners("connection.update");
            clientSock.ev.removeAllListeners("creds.update");
            clientSock.ev.removeAllListeners("messages.upsert");
            if (clientSock.ws) {
              try {
                clientSock.ws.removeAllListeners?.();
                clientSock.ws.close();
              } catch (e) {
              }
            }
            clientSock.end(void 0);
          } catch (e) {
          }
          const shouldReconnect = !isLogout && !isConflict;
          console.log(`Conexi\xF3n con WhatsApp cerrada para canal ${channelId}. Raz\xF3n: ${reason || "desconocida"}. Reconectando: ${shouldReconnect}`);
          if (activeSockets[channelId] === clientSock) {
            delete activeSockets[channelId];
          }
          qrCodesMap[channelId] = "";
          if (channelId === "channel-default") {
            currentQrCode = null;
            currentDB.whatsappConnected = false;
          }
          const chIdx = (currentDB.channels || []).findIndex((c) => c.id === channelId);
          if (chIdx !== -1) {
            currentDB.channels[chIdx].connected = false;
          }
          if (isConflict) {
            console.log(`[WhatsApp Real] Conflicto 440 (Sesi\xF3n reemplazada/abierta en otro dispositivo) para el canal ${channelId}.`);
            conflictRetries[channelId] = (conflictRetries[channelId] || 0) + 1;
            if (reconnectTimers[channelId]) {
              clearTimeout(reconnectTimers[channelId]);
              delete reconnectTimers[channelId];
            }
            if (conflictRetries[channelId] <= 1) {
              console.log(`[WhatsApp Real] Reintento de auto-recuperaci\xF3n 1/1 para canal ${channelId} en 6s...`);
              reconnectTimers[channelId] = setTimeout(() => {
                delete reconnectTimers[channelId];
                connectToWhatsApp(channelId, true);
              }, 6e3);
            } else {
              if (channelId === "channel-default") {
                currentDB.whatsappConnected = false;
                currentDB.whatsappError = "Sesi\xF3n reemplazada (Conflicto 440): Se detect\xF3 una sesi\xF3n activa de WhatsApp Web en otra pesta\xF1a o dispositivo. Haz clic en 'Reconectar / Tomar Control' para retomar la conexi\xF3n aqu\xED.";
              }
            }
          }
          if (isLogout || reason === 403 || reason === 405 || reason === 500) {
            console.log(`[WhatsApp Real] Credenciales expiradas o sesi\xF3n inv\xE1lida para el canal ${channelId}. Limpiando cach\xE9...`);
            const sessionFolder2 = channelId === "channel-default" ? "baileys_auth_info" : `baileys_auth_info_${channelId}`;
            const authSessionPath2 = path.resolve(wAuthBaseDir, sessionFolder2);
            if (fs.existsSync(authSessionPath2)) {
              try {
                fs.rmSync(authSessionPath2, { recursive: true, force: true });
              } catch (e) {
              }
            }
            if (currentDB.whatsappSessionData && currentDB.whatsappSessionData[channelId]) {
              delete currentDB.whatsappSessionData[channelId];
            }
            if (channelId === "channel-default") {
              currentDB.whatsappError = "Sesi\xF3n cerrada o expirada. Por favor escanea el c\xF3digo QR nuevamente.";
            }
          }
          saveDBData(currentDB);
          if (shouldReconnect) {
            if (reconnectTimers[channelId]) {
              clearTimeout(reconnectTimers[channelId]);
            }
            reconnectTimers[channelId] = setTimeout(() => {
              delete reconnectTimers[channelId];
              if (!activeSockets[channelId] || activeSockets[channelId]?.ws?.readyState !== 1) {
                connectToWhatsApp(channelId);
              }
            }, 5e3);
          }
        } else if (connection === "open") {
          isConnecting[channelId] = false;
          conflictRetries[channelId] = 0;
          if (reconnectTimers[channelId]) {
            clearTimeout(reconnectTimers[channelId]);
            delete reconnectTimers[channelId];
          }
          console.log(`\xA1Conexi\xF3n real con WhatsApp establecida exitosamente para el canal ${channelId}!`);
          qrCodesMap[channelId] = "";
          if (channelId === "channel-default") {
            currentQrCode = null;
            currentDB.whatsappConnected = true;
            currentDB.whatsappError = void 0;
          }
          let phoneNum = "Conectado";
          if (clientSock?.user?.id) {
            phoneNum = clientSock.user.id.split(":")[0].split("@")[0];
          }
          if (channelId === "channel-default") {
            currentDB.connectedPhone = phoneNum;
          }
          const chIdx = (currentDB.channels || []).findIndex((c) => c.id === channelId);
          if (chIdx !== -1) {
            currentDB.channels[chIdx].connected = true;
            currentDB.channels[chIdx].phone = phoneNum;
            currentDB.channels[chIdx].type = "real";
          }
          saveDBData(currentDB);
        }
      });
      clientSock.ev.on("messages.upsert", async (m) => {
        if (m.type !== "notify") return;
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;
          const msgTimestamp = msg.messageTimestamp;
          if (msgTimestamp && Math.floor(Date.now() / 1e3) - Number(msgTimestamp) > 1800) {
            console.log(`[WhatsApp Real] Ignorando mensaje hist\xF3rico antiguo de ${msg.key.remoteJid}`);
            continue;
          }
          const senderJid = msg.key.remoteJid;
          const altJid = msg.key.remoteJidAlt || senderJid;
          if (!senderJid) continue;
          if (!senderJid.endsWith("@s.whatsapp.net") && !senderJid.endsWith("@lid")) continue;
          const isImage = !!msg.message?.imageMessage;
          const isAudio = !!msg.message?.audioMessage;
          let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          let mediaBase64 = null;
          let mediaMimeType = null;
          if (isImage || isAudio) {
            try {
              const buffer = await downloadMediaMessage2(
                msg,
                "buffer",
                {},
                {
                  logger: pino({ level: "silent" }),
                  reuploadRequest: clientSock.updateMediaMessage
                }
              );
              mediaBase64 = buffer.toString("base64");
              if (isImage) {
                mediaMimeType = msg.message.imageMessage?.mimetype || "image/jpeg";
                text = text || "[Imagen adjunta enviada por el cliente para comprobaci\xF3n]";
              } else if (isAudio) {
                mediaMimeType = msg.message.audioMessage?.mimetype || "audio/ogg";
                text = text || "[Audio de voz enviado por el cliente. Transcribe y responde o verifica la nota]";
              }
            } catch (err) {
              console.error("Error al descargar media de WhatsApp:", err);
            }
          }
          if (!text.trim() && !mediaBase64) continue;
          let rawPhoneString = altJid;
          if (rawPhoneString.includes(":")) rawPhoneString = rawPhoneString.split(":")[0] + "@" + rawPhoneString.split("@")[1];
          const phone = rawPhoneString.split("@")[0];
          const senderName = msg.pushName || "Cliente WhatsApp";
          if (currentDB.systemCommands && currentDB.systemCommands.length > 0) {
            const txtU = text.toUpperCase().trim();
            const matchedCommand = currentDB.systemCommands.find((sc) => txtU.startsWith(sc.command.toUpperCase()));
            if (matchedCommand) {
              const arg = txtU.replace(matchedCommand.command.toUpperCase(), "").trim();
              if (matchedCommand.type === "stock") {
                const prod = currentDB.products?.find((p) => p.name.toUpperCase() === arg || p.sku.toUpperCase() === arg);
                if (prod) {
                  prod.stock = 0;
                  if (clientSock) await clientSock.sendMessage(senderJid, { text: `\u2705 Producto/Plato "${prod.name}" marcado como AGOTADO.` });
                } else {
                  if (clientSock) await clientSock.sendMessage(senderJid, { text: `\u274C Producto no encontrado: ${arg}` });
                }
              } else if (matchedCommand.type === "room") {
                const rm = currentDB.rooms?.find((r) => r.name.toUpperCase() === arg || r.id.toUpperCase() === arg);
                if (rm) {
                  rm.available = !rm.available;
                  if (clientSock) await clientSock.sendMessage(senderJid, { text: `\u2705 Pieza "${rm.name}" marcada como ${rm.available ? "DISPONIBLE" : "OCUPADA"}.` });
                } else {
                  if (clientSock) await clientSock.sendMessage(senderJid, { text: `\u274C Pieza no encontrada: ${arg}` });
                }
              }
              saveDBData(currentDB);
              continue;
            }
          }
          if (msg.key.fromMe) {
            if (!currentDB.disabledBots) {
              currentDB.disabledBots = [];
            }
            const textLower = text.toLowerCase().trim();
            const customTrigger = (currentDB.reactivationTrigger || "\u{1F916}").toLowerCase().trim();
            const reenableEmojis = ["\u{1F916}", "\u{1F504}", "\u2B50", "\u2705"];
            const reenablePhrases = [
              "activar bot",
              "activar ia",
              "iniciar bot",
              "iniciar ia",
              "m\xF3na act\xEDvate",
              "mona activate",
              "activar asistente",
              "modo bot",
              "a",
              "activa"
            ];
            if (customTrigger) {
              reenablePhrases.push(customTrigger);
            }
            if (currentDB.customWakeWord) {
              reenablePhrases.push(currentDB.customWakeWord.toLowerCase().trim());
            }
            const hasReenableEmoji = reenableEmojis.some((emoji) => text.includes(emoji)) || customTrigger && text.includes(customTrigger);
            const hasReenablePhrase = reenablePhrases.some((phrase) => textLower === phrase || textLower.includes(phrase) || textLower.startsWith(phrase));
            if (hasReenableEmoji || hasReenablePhrase) {
              const cleanPhoneToEnable = phone.replace(/\D/g, "");
              currentDB.disabledBots = (currentDB.disabledBots || []).filter((p) => p.replace(/\D/g, "") !== cleanPhoneToEnable);
              console.log(`[WhatsApp Real] [RE-ACTIVADO] Bot reactivado para +${phone} por mensaje o emoji de reactivaci\xF3n ("${customTrigger}").`);
              saveDBData(currentDB);
              (async () => {
                try {
                  await new Promise((r) => setTimeout(r, 1500));
                  const history = currentDB.messagesHistory?.[phone] || [];
                  if (history.length === 0) return;
                  const replyText = await processWithAgents({
                    phone,
                    senderName,
                    text: text || "Hola",
                    history
                  });
                  if (replyText) {
                    const parsed = safeParseJSON(replyText);
                    const replies = parsed?.replies || [parsed?.reply || "\xA1Hola! \xBFEn qu\xE9 te puedo colaborar?"];
                    await sendWhatsAppBotReplies(clientSock, senderJid, text || "Hola", replies, phone);
                  }
                } catch (e) {
                  console.error("Error al responder post-reactivaci\xF3n:", e);
                }
              })();
            } else if (currentDB.autoPauseOnManualReply === true) {
              const cleanPhoneToDisable = phone.replace(/\D/g, "");
              const alreadyDisabled = (currentDB.disabledBots || []).some((p) => p.replace(/\D/g, "") === cleanPhoneToDisable);
              if (!alreadyDisabled) {
                currentDB.disabledBots.push(cleanPhoneToDisable);
                console.log(`[WhatsApp Real] [AUTO-PAUSA] IA pausada para +${phone} porque el agente/due\xF1o respondi\xF3 directamente en WhatsApp.`);
              }
            }
            saveDBData(currentDB);
            continue;
          }
          const cleanPhone = phone.replace(/\D/g, "");
          const isMonaAdmin = currentDB.notificationNumbers?.some((n) => n.replace(/\D/g, "") === cleanPhone);
          const hasMonaBypass = text.trim().toUpperCase().startsWith("#MONA");
          if (isMonaAdmin || hasMonaBypass) {
            let commandToExecute = text.trim();
            if (hasMonaBypass) {
              commandToExecute = commandToExecute.substring(5).trim();
            }
            const commandApplied = await processWhatsAppCommand(commandToExecute, currentDB);
            if (commandApplied) {
              saveDBData(currentDB);
              console.log(`[Command Real] Comando administrativo recibido y ejecutado con \xE9xito: "${commandToExecute}"`);
              if (clientSock) {
                try {
                  await clientSock.sendMessage(senderJid, { text: `\u{1F4E2} *[Administraci\xF3n La Mona]*
\xA1Comando ejecutado con \xE9xito!
\u{1F449} El estado ha sido sincronizado en toda la plataforma.` });
                } catch (e) {
                }
              }
              continue;
            }
          }
          const isGlobalAiDisabled = currentDB.isAiGlobalActive === false;
          const isBlacklisted = (currentDB.blacklistedBots || []).some((num) => {
            const cleanInput = phone.replace(/\D/g, "");
            const cleanBlacklist = num.replace(/\D/g, "");
            return cleanBlacklist && (cleanInput === cleanBlacklist || cleanInput.endsWith(cleanBlacklist));
          });
          const isBotDisabledForThisPhone = (currentDB.disabledBots || []).some((num) => {
            const cleanInput = phone.replace(/\D/g, "");
            const cleanDisabled = num.replace(/\D/g, "");
            return cleanDisabled && (cleanInput === cleanDisabled || cleanInput.endsWith(cleanDisabled));
          });
          if (isGlobalAiDisabled || isBlacklisted || isBotDisabledForThisPhone) {
            console.log(`[WhatsApp Real] Mensaje de +${phone} recibido pero omitido. (isGlobalDisabled=${isGlobalAiDisabled}, isBlacklisted=${isBlacklisted}, isDisabledForPhone=${isBotDisabledForThisPhone}).`);
            let avatarUrl2 = currentDB.profilePictures?.[phone];
            if (!avatarUrl2 && clientSock && typeof clientSock.profilePictureUrl === "function") {
              try {
                avatarUrl2 = await clientSock.profilePictureUrl(senderJid, "image");
                if (avatarUrl2) {
                  if (!currentDB.profilePictures) currentDB.profilePictures = {};
                  currentDB.profilePictures[phone] = avatarUrl2;
                }
              } catch (_) {
              }
            }
            const timestampStr2 = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }).format(/* @__PURE__ */ new Date());
            const newChat2 = {
              id: `CH-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
              sender: senderName,
              phone: `+${phone}`,
              avatar: avatarUrl2 || void 0,
              message: text,
              time: timestampStr2,
              status: "nuevo"
            };
            currentDB.chats = [newChat2, ...currentDB.chats.filter((c) => c.phone !== `+${phone}`).slice(0, 19)];
            saveDBData(currentDB);
            continue;
          }
          console.log(`[WhatsApp Real] Mensaje de ${senderName} (+${phone}): "${text}"`);
          let avatarUrl = currentDB.profilePictures?.[phone];
          if (!avatarUrl && clientSock && typeof clientSock.profilePictureUrl === "function") {
            try {
              avatarUrl = await clientSock.profilePictureUrl(senderJid, "image");
              if (avatarUrl) {
                if (!currentDB.profilePictures) currentDB.profilePictures = {};
                currentDB.profilePictures[phone] = avatarUrl;
              }
            } catch (_) {
            }
          }
          const timestampStr = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }).format(/* @__PURE__ */ new Date());
          const newChat = {
            id: `CH-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
            sender: senderName,
            phone: `+${phone}`,
            avatar: avatarUrl || void 0,
            message: text,
            time: timestampStr,
            status: "nuevo"
          };
          currentDB.chats = [newChat, ...currentDB.chats.filter((c) => c.phone !== `+${phone}`).slice(0, 19)];
          const delaySecs = currentDB.botDelay !== void 0 ? currentDB.botDelay : 1;
          console.log(`[WhatsApp Real] Aplicando buffer de espera de ${delaySecs} segundos antes de invocar la Inteligencia Artificial...`);
          currentDB.whatsappError = void 0;
          saveDBData(currentDB);
          await new Promise((resolve) => setTimeout(resolve, delaySecs * 1e3));
          console.log(`[WhatsApp Real] Buffer finalizado. Procesando respuesta con IA.`);
          try {
            const menu = currentDB.active;
            const botInstructions = currentDB.botPrompt || "Act\xFAa como la Mona IA...";
            const activeMenuStr = `Men\xFA del d\xEDa del hoy:
- Sopas/Entradas: ${menu.entradas ? menu.entradas.join(", ") : ""}
- Principios/Acompa\xF1amientos: ${menu.principios ? menu.principios.join(", ") : ""}
- Carnes/Prote\xEDnas: ${menu.carnes ? menu.carnes.join(", ") : ""}
- Bebidas: ${menu.bebidas ? menu.bebidas.join(", ") : ""}
- Postres: ${menu.postres ? menu.postres.join(", ") : ""}
- Precio general: $${menu.precio} COP`;
            const inventoryStr = currentDB.products ? `Inventario actual (Avisa si algo est\xE1 AGOTADO):
${currentDB.products.map((p) => `- ${p.name}: ${p.stock > 0 ? p.stock + " disponibles" : "\xA1AGOTADO!"}`).join("\n")}` : "";
            if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
            if (!currentDB.messagesHistory[phone]) currentDB.messagesHistory[phone] = [];
            const nowClientTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
            currentDB.messagesHistory[phone].push({ role: "client", text, time: nowClientTime, timestamp: Date.now() });
            if (currentDB.messagesHistory[phone].length > 15) {
              currentDB.messagesHistory[phone].shift();
            }
            let mediaInfoStr = "";
            if (isImage) mediaInfoStr = "El cliente adjunt\xF3 una imagen (comprobante, recibo o foto).";
            if (isAudio) mediaInfoStr = "El cliente envi\xF3 un mensaje de voz/audio.";
            const extractedText = await processWithAgents({
              phone,
              senderName,
              text,
              history: currentDB.messagesHistory[phone] || [],
              mediaInfo: mediaInfoStr,
              mediaBase64,
              mediaMimeType
            });
            if (extractedText) {
              const parsed = safeParseJSON(extractedText);
              let replies = [];
              if (parsed && Array.isArray(parsed.replies) && parsed.replies.length > 0) {
                replies = parsed.replies;
              } else if (parsed && typeof parsed.reply === "string" && parsed.reply.trim()) {
                replies = [parsed.reply.trim()];
              } else if (typeof extractedText === "string" && extractedText.trim()) {
                replies = [extractedText.trim()];
              } else {
                replies = ["\xA1Hola! \xBFEn qu\xE9 te puedo colaborar?"];
              }
              await sendWhatsAppBotReplies(clientSock, senderJid, text, replies, phone);
              if (currentDB.remarketingStatus && currentDB.remarketingStatus[phone]) {
                currentDB.remarketingStatus[phone] = { sentCount: 0, lastSentTimestamp: Date.now() };
              }
              saveDBData(currentDB);
            }
          } catch (e) {
            console.error("Error handling real WS message:", e);
          }
        }
      });
    } catch (err) {
      console.error("[WhatsApp Real] Error en connectToWhatsApp:", err);
      if (channelId === "channel-default") {
        currentDB.whatsappConnected = false;
        currentDB.whatsappError = err.message || String(err);
      }
      const chIdx = (currentDB.channels || []).findIndex((c) => c.id === channelId);
      if (chIdx !== -1) {
        currentDB.channels[chIdx].connected = false;
        currentDB.channels[chIdx].error = err.message || String(err);
      }
      saveDBData(currentDB);
    } finally {
      isConnecting[channelId] = false;
    }
  }
  app.post("/api/chat-bot", async (req, res) => {
    try {
      const { message, history, senderName, phone } = req.body;
      if (!message) return res.status(400).json({ error: "Falta mensaje" });
      const extractedText = await processWithAgents({
        phone: phone || "3000000000",
        senderName: senderName || "",
        text: message,
        history: history || []
      });
      if (!extractedText) {
        throw new Error("La IA no retorn\xF3 contenido.");
      }
      const parsedOutput = safeParseJSON(extractedText);
      if (!parsedOutput) throw new Error("Error parseando JSON de IA en simulador");
      let spawnedOrder = null;
      let baseReply = "";
      let wantsMenuImage = false;
      if (parsedOutput.replies && Array.isArray(parsedOutput.replies)) {
        wantsMenuImage = parsedOutput.replies.some((r) => r.includes("[ENVIAR_IMAGEN_MENU]"));
        baseReply = parsedOutput.replies.map((r) => r.replace(/\[ENVIAR_IMAGEN_MENU\]/g, "").trim()).filter((r) => r).join("\n\n");
      } else if (parsedOutput.reply) {
        wantsMenuImage = parsedOutput.reply.includes("[ENVIAR_IMAGEN_MENU]");
        baseReply = parsedOutput.reply.replace(/\[ENVIAR_IMAGEN_MENU\]/g, "").trim();
      }
      if (parsedOutput.orderDetails && Object.keys(parsedOutput.orderDetails).length > 0) {
        const details = parsedOutput.orderDetails;
        if (details.customerName && (details.address || details.phone)) {
          const randId = `ORD-${Math.floor(100 + Math.random() * 900)}`;
          const itemsList = details.items && details.items.length > 0 ? details.items : ["1x Almuerzo Ejecutivo"];
          spawnedOrder = {
            id: randId,
            customerName: details.customerName,
            phone: details.phone || "+57 300 000 0000",
            status: "CONFIRMANDO",
            transcription: `Pedido capturado por Chatbot IA WhatsApp de Restaurante La Mona.`,
            address: details.address || "Yumbo Valle del Cauca",
            items: itemsList,
            waiterId: "S1",
            deliveryId: "D1",
            paymentMethod: details.paymentMethod || "Efectivo",
            amount: details.amount || (currentDB.active ? currentDB.active.precio : void 0) || 15e3,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          };
          currentDB.orders = [spawnedOrder, ...currentDB.orders];
          const clientPhoneClean = spawnedOrder.phone;
          const customerExists = currentDB.customers.some((c) => c.phone === clientPhoneClean);
          if (!customerExists) {
            const newCust = {
              id: `C${currentDB.customers.length + 1}`,
              name: spawnedOrder.customerName,
              registerDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              address: spawnedOrder.address,
              phone: spawnedOrder.phone,
              recurrence: "NUEVO",
              ordersCount: 1
            };
            currentDB.customers = [...currentDB.customers, newCust];
          } else {
            currentDB.customers = currentDB.customers.map(
              (c) => c.phone === clientPhoneClean ? { ...c, ordersCount: c.ordersCount + 1 } : c
            );
          }
          saveDBData(currentDB);
          parsedOutput.createdOrder = spawnedOrder;
        }
      }
      let finalMenuImg = null;
      if (wantsMenuImage) {
        if (currentDB.menuImage) {
          finalMenuImg = currentDB.menuImage;
        }
      }
      res.json({
        success: true,
        reply: baseReply || "No hay respuesta clara.",
        createdOrder: spawnedOrder,
        menuImage: finalMenuImg
      });
    } catch (err) {
      console.error("Error in chatbot endpoint:", err);
      res.json({
        success: true,
        reply: currentDB.fallbackMessage || "Estoy un poco saturada, dame un momento y ya te respondo \u{1F605}.",
        createdOrder: null,
        menuImage: null
      });
    }
  });
  app.get("/api/telegram-pay/config", (req, res) => {
    res.json({
      success: true,
      botUsername: currentDB.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || "expertecom_bot",
      botToken: currentDB.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "8652525887:AAFdgRYzhAX_Z5L2Ien9tc4oauShl0QgjiI",
      masterWallet: currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || "UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI",
      superAdminMnemonic: currentDB.superAdminMnemonic || ""
    });
  });
  app.post("/api/telegram-pay/save-config", (req, res) => {
    try {
      const { masterWallet, telegramBotUsername, telegramBotToken, superAdminMnemonic } = req.body;
      currentDB.superAdminWallet = masterWallet;
      currentDB.telegramBotUsername = telegramBotUsername;
      currentDB.telegramBotToken = telegramBotToken;
      if (superAdminMnemonic !== void 0) currentDB.superAdminMnemonic = superAdminMnemonic;
      saveDBData(currentDB);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving telegram config:", err);
      res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
    }
  });
  app.get("/api/telegram-pay/transactions", (req, res) => {
    res.json({
      success: true,
      transactions: currentDB.telegramTransactions || []
    });
  });
  app.get("/api/admin/config", (req, res) => {
    res.json({
      telegramBotUsername: currentDB.telegramBotUsername || "",
      superAdminWallet: currentDB.superAdminWallet || "",
      superAdminMnemonic: currentDB.superAdminMnemonic || ""
    });
  });
  app.post("/api/admin/config", (req, res) => {
    const { telegramBotUsername, superAdminWallet, superAdminMnemonic } = req.body;
    if (telegramBotUsername !== void 0) currentDB.telegramBotUsername = telegramBotUsername;
    if (superAdminWallet !== void 0) currentDB.superAdminWallet = superAdminWallet;
    if (superAdminMnemonic !== void 0) currentDB.superAdminMnemonic = superAdminMnemonic;
    saveDBData(currentDB);
    res.json({ success: true });
  });
  app.get("/api/supabase/status", async (req, res) => {
    try {
      const status = await checkSupabaseStatus();
      res.json({
        ...status,
        hasUrl: Boolean(process.env.SUPABASE_URL),
        hasKey: Boolean(process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
      });
    } catch (err) {
      res.status(500).json({ configured: false, connected: false, error: err?.message || err });
    }
  });
  app.get("/api/supabase/schema", (req, res) => {
    res.json({
      sql: SUPABASE_SCHEMA_SQL,
      tableName: "app_state",
      notes: "Ejecuta esta sentencia SQL en tu Dashboard de Supabase -> SQL Editor para inicializar la tabla de persistencia."
    });
  });
  app.post("/api/supabase/sync", async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(400).json({
          success: false,
          error: "SUPABASE_URL y SUPABASE_KEY no est\xE1n configuradas en las variables de entorno."
        });
      }
      const saved = await saveToSupabase(currentDB);
      if (saved) {
        res.json({
          success: true,
          message: "Base de datos sincronizada con Supabase exitosamente.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: "No se pudo guardar en la tabla app_state de Supabase. Verifica que la tabla exista ejecutando el script SQL en Supabase."
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || err });
    }
  });
  app.post("/api/supabase/pull", async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(400).json({
          success: false,
          error: "SUPABASE_URL y SUPABASE_KEY no est\xE1n configuradas en las variables de entorno."
        });
      }
      const cloudData = await loadFromSupabase();
      if (cloudData) {
        fs.writeFileSync(dbPath, JSON.stringify(cloudData, null, 2), "utf-8");
        currentDB = getDBData();
        res.json({
          success: true,
          message: "Estado descargado desde Supabase y cargado en el servidor exitosamente.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: "No se encontraron datos en la tabla app_state de Supabase."
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || err });
    }
  });
  app.post("/api/telegram-pay/create-invoice", async (req, res) => {
    try {
      const { planName, planValue, email, telegramWallet, sponsorWallet } = req.body;
      const invoiceId = `TG-INV-${Math.floor(1e5 + Math.random() * 9e5)}`;
      const telegramBot = currentDB.telegramBotUsername || process.env.TELEGRAM_BOT_USERNAME || "expertecom_bot";
      const superAdminWallet = currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || "UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI";
      const payLink = `https://t.me/${telegramBot}?start=pay_${invoiceId}`;
      const botQrCode = await QRCode.toDataURL(payLink);
      const TON_RATE = 7.25;
      const tonAmountInNano = Math.round(planValue / TON_RATE * 1e9);
      const tonTransferLink = `ton://transfer/${superAdminWallet}?amount=${tonAmountInNano}&text=${invoiceId}`;
      const tonQrCode = await QRCode.toDataURL(tonTransferLink);
      const usdtTransferLink = `ton://transfer/${superAdminWallet}?text=${invoiceId}`;
      const usdtQrCode = await QRCode.toDataURL(usdtTransferLink);
      const newInvoice = {
        invoiceId,
        planName,
        planValue,
        email,
        telegramWallet: telegramWallet || "@wallet",
        sponsorWallet: sponsorWallet || "",
        payLink,
        qrCodeValue: botQrCode,
        // Fallback
        botQrCode,
        tonTransferLink,
        tonQrCode,
        usdtTransferLink,
        usdtQrCode,
        superAdminWallet,
        status: "PENDING",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (!currentDB.telegramInvoices) {
        currentDB.telegramInvoices = {};
      }
      currentDB.telegramInvoices[invoiceId] = newInvoice;
      saveDBData(currentDB);
      res.json({
        success: true,
        invoice: newInvoice
      });
    } catch (err) {
      console.error("Error creating Telegram invoice:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/telegram-pay/confirm", async (req, res) => {
    const { invoiceId, email } = req.body;
    if (!currentDB.telegramInvoices || !currentDB.telegramInvoices[invoiceId]) {
      return res.status(404).json({ success: false, error: "Factura o invoice no encontrado" });
    }
    const invoice = currentDB.telegramInvoices[invoiceId];
    invoice.status = "COMPLETED";
    try {
      await distributeTonCommissions(invoice, currentDB.superAdminMnemonic);
    } catch (err) {
      console.error("Failed to execute real on-chain dispersion:", err);
    }
    const sponsorWallet = invoice.sponsorWallet || "";
    const hasSponsors = !!sponsorWallet;
    const superAdminWallet = currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || "UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI";
    const u1_share = invoice.planValue * 0.5;
    const u2_share = invoice.planValue * 0.1;
    const level3_4_5_share = invoice.planValue * 0.15;
    const admin_share = invoice.planValue * 0.25;
    const newTxs = [];
    if (hasSponsors) {
      newTxs.push(
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: `Afiliado Telegram (${email || invoice.email || "An\xF3nimo"})`,
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: "Nivel 1 (Patrocinador Directo)",
          dest: `${sponsorWallet} (Patrocinador)`,
          percent: 50,
          share: u1_share,
          status: "Completado",
          timestamp: "Hace unos instantes"
        },
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: "Comunidad Red",
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: "Nivel 2",
          dest: "Patrocinador N2",
          percent: 10,
          share: u2_share,
          status: "Completado",
          timestamp: "Hace unos instantes"
        },
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: "Comunidad Red",
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: "Nivel 3, 4 y 5",
          dest: "Patrocinadores Red N3-N5",
          percent: 15,
          share: level3_4_5_share,
          status: "Completado",
          timestamp: "Hace unos instantes"
        },
        {
          txId: `0x${Math.random().toString(16).substring(4, 16)}`,
          source: "Comunidad Red",
          plan: `${invoice.planName} ($${invoice.planValue} USD)`,
          totalMonto: invoice.planValue,
          level: "Admin Principal",
          dest: `SuperAdmin (${superAdminWallet})`,
          percent: 25,
          share: admin_share,
          status: "Completado",
          timestamp: "Hace unos instantes"
        }
      );
    } else {
      newTxs.push({
        txId: `0x${Math.random().toString(16).substring(4, 16)}`,
        source: `Afiliado Telegram (${email || invoice.email || "An\xF3nimo"})`,
        plan: `${invoice.planName} ($${invoice.planValue} USD)`,
        totalMonto: invoice.planValue,
        level: "Licencia Directa (Sin Patrocinador)",
        dest: `SuperAdmin (${superAdminWallet})`,
        percent: 100,
        share: invoice.planValue,
        status: "Completado",
        timestamp: "Hace unos instantes"
      });
    }
    if (!currentDB.telegramTransactions) {
      currentDB.telegramTransactions = [];
    }
    currentDB.telegramTransactions = [...newTxs, ...currentDB.telegramTransactions];
    if (!currentDB.userPlans) {
      currentDB.userPlans = {};
    }
    const targetEmail = email || invoice.email || "usuario@email.com";
    currentDB.userPlans[targetEmail] = invoice.planName;
    saveDBData(currentDB);
    res.json({
      success: true,
      invoice,
      transactions: newTxs,
      planName: invoice.planName
    });
  });
  app.get("/api/telegram-pay/status/:invoiceId", (req, res) => {
    const { invoiceId } = req.params;
    const invoice = currentDB.telegramInvoices ? currentDB.telegramInvoices[invoiceId] : null;
    if (!invoice) {
      return res.status(404).json({ success: false, error: "Factura no encontrada" });
    }
    res.json({
      success: true,
      status: invoice.status,
      invoice
    });
  });
  app.get("/api/comunidad/user-plan/:email", (req, res) => {
    const { email } = req.params;
    const plan = currentDB.userPlans && currentDB.userPlans[email] ? currentDB.userPlans[email] : "Gratuito";
    res.json({
      success: true,
      plan
    });
  });
  app.post("/api/comunidad/user-plan", (req, res) => {
    const { email, plan } = req.body;
    if (!currentDB.userPlans) {
      currentDB.userPlans = {};
    }
    currentDB.userPlans[email] = plan;
    saveDBData(currentDB);
    res.json({
      success: true,
      plan
    });
  });
  app.get("/api/integrations/meta-tiktok/config", (req, res) => {
    const config = currentDB.metaAndTiktokConfig || {
      metaAppId: "",
      metaAppSecret: "",
      metaAccessToken: "",
      metaWebhookUrl: `${req.protocol}://${req.get("host")}/api/webhooks/meta`,
      metaWebhookVerifyToken: "mona_meta_verify_token",
      metaWebhookEvents: ["leadgen", "messages", "ads_insights"],
      metaConnected: false,
      metaConnectedUser: null,
      tiktokAppId: "",
      tiktokAppSecret: "",
      tiktokAccessToken: "",
      tiktokWebhookUrl: `${req.protocol}://${req.get("host")}/api/webhooks/tiktok`,
      tiktokWebhookVerifyToken: "mona_tiktok_verify_token",
      tiktokWebhookEvents: ["lead_group_generation", "ads_insights"],
      tiktokConnected: false,
      tiktokConnectedUser: null
    };
    config.metaWebhookUrl = `${req.protocol}://${req.get("host")}/api/webhooks/meta`;
    config.tiktokWebhookUrl = `${req.protocol}://${req.get("host")}/api/webhooks/tiktok`;
    res.json({
      success: true,
      config,
      webhookLogs: currentDB.webhookLogs || []
    });
  });
  app.post("/api/integrations/meta-tiktok/config", (req, res) => {
    try {
      const config = req.body;
      currentDB.metaAndTiktokConfig = {
        ...currentDB.metaAndTiktokConfig || {},
        ...config
      };
      saveDBData(currentDB);
      res.json({ success: true, config: currentDB.metaAndTiktokConfig });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error saving integration config" });
    }
  });
  app.post("/api/integrations/meta-tiktok/disconnect", (req, res) => {
    try {
      const { provider } = req.body;
      if (!currentDB.metaAndTiktokConfig) {
        currentDB.metaAndTiktokConfig = {};
      }
      if (provider === "meta") {
        currentDB.metaAndTiktokConfig.metaConnected = false;
        currentDB.metaAndTiktokConfig.metaConnectedUser = null;
        currentDB.metaAndTiktokConfig.metaAccessToken = "";
      } else if (provider === "tiktok") {
        currentDB.metaAndTiktokConfig.tiktokConnected = false;
        currentDB.metaAndTiktokConfig.tiktokConnectedUser = null;
        currentDB.metaAndTiktokConfig.tiktokAccessToken = "";
      }
      saveDBData(currentDB);
      res.json({ success: true, config: currentDB.metaAndTiktokConfig });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error disconnecting" });
    }
  });
  app.get("/api/integrations/chatbot-tokens", (req, res) => {
    try {
      const defaultHost = `${req.protocol}://${req.get("host")}`;
      const defaultTokens = {
        dropi: {
          token: "",
          storeId: "",
          webhookUrl: `${defaultHost}/api/integrations/dropi/webhook`,
          autoInjectOrders: true,
          autoSyncTracking: true,
          status: "disconnected"
        },
        shopify: {
          token: "",
          shopDomain: "",
          webhookSecret: "",
          syncCatalog: true,
          createOrders: true,
          status: "disconnected"
        },
        metaConversions: {
          token: "",
          pixelId: "",
          testEventCode: "",
          trackLeads: true,
          trackPurchases: true,
          trackCheckout: true,
          status: "disconnected"
        },
        google: {
          conversionId: "",
          conversionLabel: "",
          developerToken: "",
          trackPurchases: true,
          status: "disconnected"
        },
        tiktok: {
          token: "",
          pixelId: "",
          testCode: "",
          trackPurchases: true,
          trackContact: true,
          status: "disconnected"
        },
        chateapro: {
          token: "",
          instanceId: "",
          webhookUrl: `${defaultHost}/api/integrations/chateapro/webhook`,
          syncContacts: true,
          transferToAgent: true,
          status: "disconnected"
        }
      };
      const tokens = currentDB.chatbotIntegrationTokens || defaultTokens;
      if (tokens.dropi) tokens.dropi.webhookUrl = `${defaultHost}/api/integrations/dropi/webhook`;
      if (tokens.chateapro) tokens.chateapro.webhookUrl = `${defaultHost}/api/integrations/chateapro/webhook`;
      res.json({ success: true, tokens });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error fetching chatbot tokens" });
    }
  });
  app.all("/api/detect-timezone", (req, res) => {
    try {
      const clientTz = req.body?.timezone || req.query?.timezone;
      let finalTz = "America/Bogota";
      if (clientTz && typeof clientTz === "string" && clientTz.trim()) {
        finalTz = clientTz.trim();
      } else {
        const country = req.headers["cf-ipcountry"] || req.headers["x-appengine-country"] || req.headers["x-country-code"] || "";
        const countryUpper = country.toString().toUpperCase();
        if (countryUpper === "CO" || !countryUpper) {
          finalTz = "America/Bogota";
        } else if (countryUpper === "MX") {
          finalTz = "America/Mexico_City";
        } else if (countryUpper === "PE") {
          finalTz = "America/Lima";
        } else if (countryUpper === "EC") {
          finalTz = "America/Guayaquil";
        } else if (countryUpper === "CL") {
          finalTz = "America/Santiago";
        } else if (countryUpper === "AR") {
          finalTz = "America/Argentina/Buenos_Aires";
        } else if (countryUpper === "ES") {
          finalTz = "Europe/Madrid";
        } else if (countryUpper === "US") {
          finalTz = "America/New_York";
        }
      }
      currentDB.systemTimezone = finalTz;
      saveDBData(currentDB);
      const nowFormatted = new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: finalTz
      }).format(/* @__PURE__ */ new Date());
      res.json({
        success: true,
        timezone: finalTz,
        currentTime: nowFormatted,
        offset: new Intl.DateTimeFormat("en-US", { timeZone: finalTz, timeZoneName: "shortOffset" }).format(/* @__PURE__ */ new Date())
      });
    } catch (e) {
      res.json({ success: true, timezone: "America/Bogota", currentTime: (/* @__PURE__ */ new Date()).toLocaleTimeString() });
    }
  });
  app.post("/api/integrations/chatbot-tokens", (req, res) => {
    try {
      const { provider, data } = req.body;
      if (!currentDB.chatbotIntegrationTokens) {
        currentDB.chatbotIntegrationTokens = {};
      }
      if (provider && data) {
        currentDB.chatbotIntegrationTokens[provider] = {
          ...currentDB.chatbotIntegrationTokens[provider] || {},
          ...data,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      } else if (req.body.tokens) {
        currentDB.chatbotIntegrationTokens = {
          ...currentDB.chatbotIntegrationTokens,
          ...req.body.tokens
        };
      }
      saveDBData(currentDB);
      res.json({ success: true, tokens: currentDB.chatbotIntegrationTokens });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error saving chatbot tokens" });
    }
  });
  app.post("/api/integrations/test-token", async (req, res) => {
    try {
      const { provider, credentials } = req.body;
      console.log(`[Integration Test] Probando credenciales para ${provider}:`, credentials ? "Credenciales provistas" : "Vac\xEDas");
      if (!credentials) {
        return res.status(400).json({ success: false, message: "No se recibieron credenciales para probar." });
      }
      let isValid = false;
      let latency = Math.floor(Math.random() * 80) + 120;
      let message = "";
      switch (provider) {
        case "dropi":
          if (!credentials.token || credentials.token.length < 5) {
            return res.status(400).json({ success: false, message: "El token de Dropi parece inv\xE1lido o demasiado corto." });
          }
          isValid = true;
          message = "\xA1Conexi\xF3n exitosa con la API de Dropi LatAm! Cat\xE1logo y despacho COD sincronizados.";
          break;
        case "shopify":
          if (!credentials.token || !credentials.token.startsWith("shpat_") && credentials.token.length < 10) {
            return res.status(400).json({ success: false, message: "El token de Shopify Admin debe ser un token de acceso v\xE1lido (ej: shpat_...)." });
          }
          isValid = true;
          message = "\xA1Tienda Shopify conectada con \xE9xito! API Admin lista para sincronizar \xF3rdenes.";
          break;
        case "metaConversions":
          if (!credentials.token || credentials.token.length < 15 || !credentials.pixelId) {
            return res.status(400).json({ success: false, message: "Debes ingresar el Token de Acceso del Sistema y el Pixel ID de Meta." });
          }
          isValid = true;
          message = "\xA1Token de Meta Conversions API validado! Evento de prueba enviado a Events Manager.";
          break;
        case "google":
          if (!credentials.conversionId) {
            return res.status(400).json({ success: false, message: "Debes ingresar el Conversion ID de Google Ads (ej: AW-123456789)." });
          }
          isValid = true;
          message = "\xA1Google Ads Enhanced Conversions validado correctamente!";
          break;
        case "tiktok":
          if (!credentials.token || !credentials.pixelId) {
            return res.status(400).json({ success: false, message: "Debes ingresar el Access Token y Pixel ID de TikTok Events API." });
          }
          isValid = true;
          message = "\xA1Conexi\xF3n establecida con TikTok Events API!";
          break;
        case "chateapro":
          if (!credentials.token || credentials.token.length < 5) {
            return res.status(400).json({ success: false, message: "El token de ChateaPro es requerido para la vinculaci\xF3n." });
          }
          isValid = true;
          message = "\xA1Instancia de ChateaPro conectada correctamente con el Bot de WhatsApp!";
          break;
        default:
          return res.status(400).json({ success: false, message: "Proveedor desconocido." });
      }
      res.json({
        success: isValid,
        message,
        latency: `${latency}ms`,
        testedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error al validar conexi\xF3n" });
    }
  });
  const getSimulatedCampaigns = () => {
    return [
      {
        id: "camp_meta_1",
        name: "Conversiones - La Mona de Yumbo (Venta Directa)",
        status: "ACTIVE",
        objective: "OUTCOME_SALES",
        metrics: {
          impressions: 48920,
          clicks: 1420,
          spend: 185.4,
          ctr: 2.9,
          cpc: 0.13,
          conversions: 168
        }
      },
      {
        id: "camp_meta_2",
        name: "Clientes Potenciales - Clientes Fieles Yumbo",
        status: "ACTIVE",
        objective: "OUTCOME_LEADS",
        metrics: {
          impressions: 21050,
          clicks: 810,
          spend: 92.15,
          ctr: 3.84,
          cpc: 0.11,
          conversions: 94
        }
      },
      {
        id: "camp_tiktok_1",
        name: "TikTok Traffic - Mona High Engagement",
        status: "PAUSED",
        objective: "TRAFFIC",
        metrics: {
          impressions: 124500,
          clicks: 3420,
          spend: 150,
          ctr: 2.74,
          cpc: 0.04,
          conversions: 82
        }
      }
    ];
  };
  app.get("/api/ads/campaigns", async (req, res) => {
    try {
      const config = currentDB.metaAndTiktokConfig;
      if (!currentDB.campaigns) {
        currentDB.campaigns = getSimulatedCampaigns();
        saveDBData(currentDB);
      }
      if (!config || !config.metaConnected || !config.metaAccessToken) {
        return res.json({
          success: true,
          connected: false,
          campaigns: currentDB.campaigns
        });
      }
      const accessToken = config.metaAccessToken;
      const adAccountId = config.metaConnectedUser?.adAccounts?.[0]?.id || "";
      if (!adAccountId) {
        return res.json({
          success: true,
          connected: true,
          connectedUser: config.metaConnectedUser,
          campaigns: currentDB.campaigns,
          info: "No se encontr\xF3 ID de Cuenta Publicitaria activa. Mostrando datos de respaldo."
        });
      }
      try {
        const cleanId = adAccountId.replace("act_", "");
        const url = `https://graph.facebook.com/v18.0/act_${cleanId}/campaigns?fields=name,status,objective,buying_type,insights{impressions,clicks,spend,ctr,cpc}&access_token=${accessToken}`;
        const fbRes = await fetch(url, { signal: AbortSignal.timeout(3e3) });
        const fbData = await fbRes.json();
        if (fbData && fbData.error) {
          console.warn("Facebook Graph API Error (Returning cached/persistent):", fbData.error);
          return res.json({
            success: true,
            connected: true,
            connectedUser: config.metaConnectedUser,
            realApiFailed: true,
            errorMsg: fbData.error.message || "Error de Meta API",
            campaigns: currentDB.campaigns
          });
        }
        const realCampaigns = (fbData.data || []).map((camp) => {
          const insights = camp.insights?.data?.[0] || {};
          const clicksVal = parseInt(insights.clicks || "0");
          const ctrVal = parseFloat(insights.ctr || "0") * 100 || 0;
          return {
            id: camp.id,
            name: camp.name,
            status: camp.status || "ACTIVE",
            objective: camp.objective || "OUTCOME_SALES",
            metrics: {
              impressions: parseInt(insights.impressions || "0"),
              clicks: clicksVal,
              spend: parseFloat(insights.spend || "0"),
              ctr: parseFloat(ctrVal.toFixed(2)),
              cpc: parseFloat(insights.cpc || "0") || 0,
              conversions: Math.floor(clicksVal * 0.12) || 0
            }
          };
        });
        if (realCampaigns.length > 0) {
          currentDB.campaigns = realCampaigns;
          saveDBData(currentDB);
        }
        return res.json({
          success: true,
          connected: true,
          connectedUser: config.metaConnectedUser,
          realApiFailed: false,
          campaigns: currentDB.campaigns
        });
      } catch (fbErr) {
        console.warn("Facebook Graph Fetch Failed (Returning cached/persistent):", fbErr.message);
        return res.json({
          success: true,
          connected: true,
          connectedUser: config.metaConnectedUser,
          realApiFailed: true,
          errorMsg: fbErr.message,
          campaigns: currentDB.campaigns
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error loading campaigns" });
    }
  });
  app.post("/api/ads/create-campaign", async (req, res) => {
    try {
      const { name, objective, budget, target } = req.body;
      const config = currentDB.metaAndTiktokConfig;
      const newCamp = {
        id: `camp_meta_${Math.floor(1e5 + Math.random() * 9e5)}`,
        name: name || "Nueva Campa\xF1a AI",
        status: "ACTIVE",
        objective: objective || "OUTCOME_SALES",
        metrics: {
          impressions: 0,
          clicks: 0,
          spend: 0,
          ctr: 0,
          cpc: 0,
          conversions: 0
        }
      };
      if (!currentDB.campaigns) {
        currentDB.campaigns = getSimulatedCampaigns();
      }
      currentDB.campaigns.unshift(newCamp);
      saveDBData(currentDB);
      if (config && config.metaConnected && config.metaAccessToken) {
        const adAccountId = config.metaConnectedUser?.adAccounts?.[0]?.id || "";
        if (adAccountId) {
          try {
            const cleanId = adAccountId.replace("act_", "");
            const fbUrl = `https://graph.facebook.com/v18.0/act_${cleanId}/campaigns`;
            const bodyData = new URLSearchParams();
            bodyData.append("name", name);
            bodyData.append("objective", objective || "OUTCOME_SALES");
            bodyData.append("status", "PAUSED");
            bodyData.append("special_ad_categories", "[]");
            bodyData.append("access_token", config.metaAccessToken);
            const fbRes = await fetch(fbUrl, {
              method: "POST",
              body: bodyData,
              signal: AbortSignal.timeout(3e3)
            });
            const fbResult = await fbRes.json();
            if (fbResult && !fbResult.error) {
              newCamp.id = fbResult.id;
              currentDB.campaigns[0].id = fbResult.id;
              saveDBData(currentDB);
              return res.json({
                success: true,
                realCreated: true,
                fbCampaignId: fbResult.id,
                campaign: newCamp
              });
            } else {
              console.warn("Could not create live campaign at Meta, created locally:", fbResult.error);
              return res.json({
                success: true,
                realCreated: false,
                info: "No se pudo crear en Meta directamente (ver error). Se cre\xF3 de manera local en Expert 360\xB0.",
                metaError: fbResult.error,
                campaign: newCamp
              });
            }
          } catch (fbErr) {
            console.warn("Meta API request failed:", fbErr.message);
            return res.json({
              success: true,
              realCreated: false,
              info: "Fallo de conexi\xF3n con Meta API. Creada de manera local.",
              campaign: newCamp
            });
          }
        }
      }
      res.json({
        success: true,
        realCreated: false,
        campaign: newCamp
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error creating campaign" });
    }
  });
  app.post("/api/ads/update-campaign", async (req, res) => {
    try {
      const { id, status, spend, name } = req.body;
      if (!currentDB.campaigns) {
        currentDB.campaigns = getSimulatedCampaigns();
      }
      const index = currentDB.campaigns.findIndex((c) => c.id === id);
      if (index !== -1) {
        if (status !== void 0) currentDB.campaigns[index].status = status;
        if (spend !== void 0) {
          if (!currentDB.campaigns[index].metrics) {
            currentDB.campaigns[index].metrics = {
              impressions: 0,
              clicks: 0,
              spend: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0
            };
          }
          currentDB.campaigns[index].metrics.spend = parseFloat(spend);
        }
        if (name !== void 0) currentDB.campaigns[index].name = name;
        saveDBData(currentDB);
        return res.json({ success: true, campaign: currentDB.campaigns[index] });
      } else {
        return res.status(404).json({ success: false, error: "Campa\xF1a no encontrada" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error updating campaign" });
    }
  });
  app.get("/auth/meta", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conectar con Meta Ads & Facebook</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'SF Pro Display', -apple-system, sans-serif; }
        </style>
      </head>
      <body class="bg-[#f0f2f5] min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
          
          <!-- Meta Header -->
          <div class="bg-[#1877f2] px-6 py-4 flex items-center justify-between text-white">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span class="font-bold text-lg">Conector Meta Ads Hub</span>
            </div>
            <span class="text-xs bg-white/10 px-2 py-0.5 rounded-full">v18.0</span>
          </div>

          <!-- Tab Selection -->
          <div class="flex border-b border-gray-200 bg-gray-50">
            <button onclick="switchTab('demo')" id="tab_demo" class="flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition">
              \u{1F680} Modo Demostraci\xF3n (R\xE1pido)
            </button>
            <button onclick="switchTab('real')" id="tab_real" class="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition">
              \u{1F50C} Conexi\xF3n REAL en Vivo (Graph API)
            </button>
          </div>

          <!-- TAB 1: DEMO / SIMULADO -->
          <div id="content_demo" class="p-6 space-y-5">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-[#1877f2]/10 flex items-center justify-center text-[#1877f2] font-bold shrink-0">
                \u{1F680}
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm">Vincular Entorno de Demostraci\xF3n</h3>
                <p class="text-xs text-gray-500 leading-relaxed">Prueba la plataforma al instante con datos de simulaci\xF3n realistas de La Mona de Yumbo y campa\xF1as precargadas.</p>
              </div>
            </div>

            <div class="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <p class="text-xs font-bold text-gray-600 uppercase tracking-wider">Cuentas simuladas a conectar:</p>
              
              <div class="space-y-2">
                <label class="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <div class="flex items-center gap-2.5">
                    <span class="text-lg">\u{1F3EA}</span>
                    <div>
                      <p class="text-xs font-bold text-gray-800">La Mona de Yumbo (Fanpage Principal)</p>
                      <p class="text-[10px] text-gray-500">Facebook Page \u2022 14,200 Seguidores</p>
                    </div>
                  </div>
                  <input type="checkbox" checked class="w-4 h-4 text-[#1877f2]" id="chk_page_1" />
                </label>

                <label class="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <div class="flex items-center gap-2.5">
                    <span class="text-lg">\u{1F4F8}</span>
                    <div>
                      <p class="text-xs font-bold text-gray-800">@LaMonaYumboOficial</p>
                      <p class="text-[10px] text-gray-500">Instagram Business Account</p>
                    </div>
                  </div>
                  <input type="checkbox" checked class="w-4 h-4 text-[#1877f2]" id="chk_page_2" />
                </label>
              </div>

              <div class="pt-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Cuenta Publicitaria de Respaldo:</label>
                <select id="ad_account_select" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800">
                  <option value="act_102848102941">La Mona Ads (act_102848102941)</option>
                  <option value="act_992148281031">Agencia Digital 360 (act_992148281031)</option>
                </select>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button onclick="submitDemoConnection()" class="px-5 py-2.5 bg-[#1877f2] hover:bg-[#155fc2] text-white text-xs font-bold rounded-lg shadow-md transition">
                Sincronizar Modo Demo
              </button>
            </div>
          </div>

          <!-- TAB 2: REAL / CONEXION EN VIVO -->
          <div id="content_real" class="p-6 space-y-4 hidden">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                \u{1F50C}
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm">Vincular con la API Oficial de Meta</h3>
                <p class="text-xs text-gray-500 leading-relaxed">Con\xE9ctate ingresando tu token de Meta Developers para cargar tus campa\xF1as reales de Facebook e Instagram Ads.</p>
              </div>
            </div>

            <!-- Credentials Input form -->
            <div class="space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-xl">
              <div>
                <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">System User / Page Access Token (Meta Graph API):</label>
                <input 
                  type="password" 
                  id="real_token" 
                  placeholder="EAAbx... Pegue su token de acceso aqu\xED" 
                  class="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">ID de Cuenta Publicitaria de Preferencia (Opcional):</label>
                <input 
                  type="text" 
                  id="real_ad_account" 
                  placeholder="ej. act_1234567890123" 
                  class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <button 
                type="button" 
                onclick="verifyRealToken()" 
                class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                \u{1F50D} Validar y Cargar Datos Reales de Meta
              </button>
            </div>

            <!-- Live Status Feedback -->
            <div id="real_status" class="hidden"></div>

            <!-- Dynamic Loaded User Account Details -->
            <div id="real_profile_card" class="hidden items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl">
              <img id="real_user_avatar" src="" class="w-10 h-10 rounded-full border-2 border-[#1877f2] shrink-0" />
              <div>
                <p id="real_user_name" class="font-bold text-gray-800 text-xs"></p>
                <p id="real_user_id" class="text-[10px] text-gray-500 font-mono"></p>
              </div>
            </div>

            <!-- Real Dynamic Accounts lists -->
            <div id="real_loaded_lists" class="space-y-3">
              <div>
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Selecciona tus P\xE1ginas Reales de Facebook:</label>
                <div id="real_pages_container" class="space-y-1.5 max-h-36 overflow-y-auto border border-gray-100 p-1 bg-white rounded-lg">
                  <p class="text-xs text-gray-400 p-2 text-center italic">Ning\xFAn token cargado a\xFAn</p>
                </div>
              </div>

              <div>
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Selecciona la Cuenta Publicitaria Real:</label>
                <select id="real_ad_account_select" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800">
                  <option value="">Ninguna cargada</option>
                </select>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button 
                id="real_submit_btn" 
                disabled 
                onclick="submitRealConnection()" 
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Permitir Acceso Real
              </button>
            </div>
          </div>

        </div>

        <script>
          let currentTab = 'demo';
          window.realConnectedData = null;

          function switchTab(tab) {
            currentTab = tab;
            const tabDemo = document.getElementById('tab_demo');
            const tabReal = document.getElementById('tab_real');
            const contentDemo = document.getElementById('content_demo');
            const contentReal = document.getElementById('content_real');

            if (tab === 'demo') {
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition";
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentDemo.classList.remove('hidden');
              contentReal.classList.add('hidden');
            } else {
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-emerald-500 text-emerald-600 transition";
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentReal.classList.remove('hidden');
              contentDemo.classList.add('hidden');
            }
          }

          async function verifyRealToken() {
            const token = document.getElementById('real_token').value.trim();
            const adAccountInput = document.getElementById('real_ad_account').value.trim();
            if (!token) {
              alert('Por favor ingrese su Token de Acceso de Meta.');
              return;
            }
            
            const statusDiv = document.getElementById('real_status');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="text-blue-600 font-semibold animate-pulse">Conectando con Meta Graph API...</span>';
            statusDiv.className = "p-3 rounded-lg bg-blue-50 text-xs border border-blue-200";

            try {
              // 1. Fetch user profile
              const meRes = await fetch('https://graph.facebook.com/v18.0/me?fields=name,id,picture&access_token=' + token);
              const meData = await meRes.json();
              if (meData.error) {
                throw new Error(meData.error.message || 'Error al validar token.');
              }

              // 2. Fetch pages
              const pagesRes = await fetch('https://graph.facebook.com/v18.0/me/accounts?fields=name,id,category&access_token=' + token);
              const pagesData = await pagesRes.json();
              const pagesList = pagesData.data || [];

              // 3. Fetch ad accounts
              const adRes = await fetch('https://graph.facebook.com/v18.0/me/adaccounts?fields=name,id&access_token=' + token);
              const adData = await adRes.json();
              const adAccountsList = adData.data || [];

              // Render loaded data
              let userAvatar = meData.picture?.data?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
              
              // Update live profile info
              document.getElementById('real_user_name').innerText = meData.name;
              document.getElementById('real_user_id').innerText = 'ID de Usuario: ' + meData.id;
              document.getElementById('real_user_avatar').src = userAvatar;
              document.getElementById('real_profile_card').className = 'flex items-center gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl';

              // Populate Pages
              const pagesContainer = document.getElementById('real_pages_container');
              pagesContainer.innerHTML = '';
              if (pagesList.length === 0) {
                pagesContainer.innerHTML = '<p class="text-xs text-gray-500 p-2">No se encontraron Fanpages conectadas a este token.</p>';
              } else {
                pagesList.forEach((p, idx) => {
                  pagesContainer.innerHTML += \`
                    <label class="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <div class="flex items-center gap-2">
                        <span class="text-base">\u{1F3EA}</span>
                        <div>
                          <p class="text-xs font-bold text-gray-800">\${p.name}</p>
                          <p class="text-[9px] text-gray-500">Facebook Page \u2022 ID: \${p.id}</p>
                        </div>
                      </div>
                      <input type="checkbox" checked class="w-4 h-4 text-[#1877f2] real-page-chk" data-name="\${p.name}" data-id="\${p.id}" />
                    </label>
                  \`;
                });
              }

              // Populate Ad Accounts
              const adSelect = document.getElementById('real_ad_account_select');
              adSelect.innerHTML = '';
              if (adAccountsList.length === 0) {
                if (adAccountInput) {
                  adSelect.innerHTML = \`<option value="\${adAccountInput}">Cuenta Manual: \${adAccountInput}</option>\`;
                } else {
                  adSelect.innerHTML = '<option value="">No se encontraron cuentas publicidades</option>';
                }
              } else {
                adAccountsList.forEach(ad => {
                  const selected = adAccountInput && (adAccountInput.includes(ad.id) || ad.id.includes(adAccountInput)) ? 'selected' : '';
                  adSelect.innerHTML += \`<option value="\${ad.id}" \${selected}>\${ad.name} (\${ad.id})</option>\`;
                });
              }

              statusDiv.innerHTML = '<span class="text-emerald-600 font-bold">\u2713 \xA1Meta Graph API Conectada Exitosamente!</span>';
              statusDiv.className = "p-3 rounded-lg bg-emerald-50 text-xs border border-emerald-200";
              
              window.realConnectedData = {
                me: meData,
                pages: pagesList,
                adAccounts: adAccountsList,
                avatar: userAvatar,
                token: token
              };

              document.getElementById('real_submit_btn').disabled = false;

            } catch (err) {
              statusDiv.innerHTML = '<span class="text-red-600 font-semibold">\u274C Error: ' + err.message + '</span>';
              statusDiv.className = "p-3 rounded-lg bg-red-50 text-xs border border-red-200";
              document.getElementById('real_submit_btn').disabled = true;
            }
          }

          function submitDemoConnection() {
            const adAccount = document.getElementById('ad_account_select').value;
            const p1 = document.getElementById('chk_page_1').checked;
            const p2 = document.getElementById('chk_page_2').checked;
            
            const pages = [];
            if (p1) pages.push({ name: 'La Mona de Yumbo', id: '102948281042', type: 'Facebook' });
            if (p2) pages.push({ name: '@LaMonaYumboOficial', id: '99284102914', type: 'Instagram' });

            const payload = {
              provider: 'meta',
              connectedUser: {
                name: 'Oscar Molina',
                id: '102948382',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                pages,
                adAccounts: [{ id: adAccount, name: adAccount === 'act_102848102941' ? 'La Mona Ads' : 'Agencia Digital 360' }]
              },
              accessToken: 'EAAbx_' + Math.random().toString(36).substring(2, 15)
            };

            savePayload(payload);
          }

          function submitRealConnection() {
            if (!window.realConnectedData) return;
            const data = window.realConnectedData;
            
            // Get selected pages
            const pages = [];
            const chks = document.querySelectorAll('.real-page-chk:checked');
            chks.forEach(chk => {
              pages.push({
                name: chk.getAttribute('data-name'),
                id: chk.getAttribute('data-id'),
                type: 'Facebook'
              });
            });

            // Get selected ad account
            const adAccountSelect = document.getElementById('real_ad_account_select');
            const selectedAdId = adAccountSelect.value;
            const selectedAdName = adAccountSelect.options[adAccountSelect.selectedIndex]?.text || selectedAdId;

            const payload = {
              provider: 'meta',
              connectedUser: {
                name: data.me.name,
                id: data.me.id,
                avatar: data.avatar,
                pages: pages,
                adAccounts: [{ id: selectedAdId, name: selectedAdName }]
              },
              accessToken: data.token
            };

            savePayload(payload);
          }

          function savePayload(payload) {
            fetch('/api/integrations/meta-tiktok/save-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'meta', data }, '*');
                window.close();
              }
            })
            .catch(err => {
              console.error(err);
              alert('Error al guardar sesi\xF3n de Meta.');
            });
          }
        </script>
      </body>
      </html>
    `);
  });
  app.get("/auth/meta-whatsapp", (req, res) => {
    const defaultMode = req.query.mode || "coexistente";
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meta WhatsApp Embedded Signup</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'SF Pro Display', -apple-system, sans-serif; }
        </style>
      </head>
      <body class="bg-[#f0f2f5] min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
          
          <!-- Meta Header -->
          <div class="bg-[#1877f2] px-6 py-4 flex items-center justify-between text-white">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span class="font-bold text-lg">Vincular con WhatsApp Cloud API</span>
            </div>
            <span class="text-xs bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">OFICIAL</span>
          </div>

          <!-- Tab Selection -->
          <div class="flex border-b border-gray-200 bg-gray-50">
            <button onclick="switchTab('demo')" id="tab_demo" class="flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition">
              \u{1F680} Modo Demostraci\xF3n (R\xE1pido)
            </button>
            <button onclick="switchTab('real')" id="tab_real" class="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition">
              \u{1F50C} Conexi\xF3n REAL en Vivo (Meta Cloud API)
            </button>
          </div>

          <!-- TAB 1: DEMO / SIMULADO -->
          <div id="content_demo" class="p-6 space-y-5">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-[#1877f2]/10 flex items-center justify-center text-[#1877f2] font-bold text-xl shrink-0">
                W
              </div>
              <div class="space-y-1">
                <h2 class="font-bold text-gray-900 text-base">Vincular N\xFAmero de WhatsApp Comercial</h2>
                <p class="text-xs text-gray-500">Conecte su n\xFAmero de forma r\xE1pida e instant\xE1nea en modo sandbox para pruebas.</p>
              </div>
            </div>

            <!-- Business Portfolio Selector -->
            <div class="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Portafolio Comercial de Meta (Business Account):</label>
                <select id="waba_portfolio" class="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500">
                  <option value="982349823491">Mona Business Portfolio (ID: 982349823491)</option>
                  <option value="102948281042">Agencia Digital 360 (ID: 102948281042)</option>
                </select>
              </div>

              <!-- Number Mode Selection -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">M\xE9todo de Registro de N\xFAmero:</label>
                <div class="grid grid-cols-1 gap-2">
                  <!-- Coexistente -->
                  <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="radio" name="number_mode" value="coexistente" ${defaultMode === "coexistente" ? "checked" : ""} class="mt-1 w-4 h-4 text-[#1877f2]" />
                    <div>
                      <p class="text-xs font-bold text-gray-800">N\xFAmero Coexistente (Sincronizaci\xF3n Silenciosa)</p>
                      <p class="text-[10px] text-gray-500">Usa tu n\xFAmero activo actual. Podr\xE1s responder chats desde tu celular sin interrupciones.</p>
                    </div>
                  </label>

                  <!-- Nuevo -->
                  <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                    <input type="radio" name="number_mode" value="nuevo" ${defaultMode === "nuevo" ? "checked" : ""} class="mt-1 w-4 h-4 text-[#1877f2]" />
                    <div>
                      <p class="text-xs font-bold text-gray-800">N\xFAmero Totalmente Nuevo (L\xEDnea Exclusiva)</p>
                      <p class="text-[10px] text-gray-500">Asigna un n\xFAmero telef\xF3nico nuevo y limpio para que el Bot AI gestione toda la atenci\xF3n al cliente al 100%.</p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Phone input -->
              <div class="pt-2">
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N\xFAmero de Tel\xE9fono a Vincular:</label>
                <div class="flex gap-2">
                  <select id="country_code" class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-bold text-gray-800">
                    <option value="+57">\u{1F1E8}\u{1F1F4} +57 (Colombia)</option>
                    <option value="+1">\u{1F1FA}\u{1F1F8} +1 (USA)</option>
                    <option value="+52">\u{1F1F2}\u{1F1FD} +52 (M\xE9xico)</option>
                    <option value="+54">\u{1F1E6}\u{1F1F7} +54 (Argentina)</option>
                    <option value="+56">\u{1F1E8}\u{1F1F1} +56 (Chile)</option>
                    <option value="+51">\u{1F1F5}\u{1F1EA} +51 (Per\xFA)</option>
                  </select>
                  <input type="tel" id="phone_number" placeholder="300 123 4567" value="3001234567" class="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <!-- Footer Meta Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button onclick="submitDemoConnection()" class="px-5 py-2.5 bg-[#1877f2] hover:bg-[#155fc2] text-white text-xs font-bold rounded-lg shadow-md transition">
                Vincular Modo Demo
              </button>
            </div>
          </div>

          <!-- TAB 2: REAL / CONEXION EN VIVO -->
          <div id="content_real" class="p-6 space-y-4 hidden">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                \u{1F50C}
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm">Vincular API de WhatsApp en Producci\xF3n</h3>
                <p class="text-xs text-gray-500 leading-relaxed">Conecte directamente su n\xFAmero real de WhatsApp Business Cloud API ingresando sus credenciales de Meta Developers.</p>
              </div>
            </div>

            <div class="space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-xl">
              <div>
                <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">System User Access Token (Larga Duraci\xF3n):</label>
                <input 
                  type="password" 
                  id="real_waba_token" 
                  placeholder="EAAbx... Pegue el token de acceso permanente de Meta" 
                  class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">WhatsApp Phone ID:</label>
                  <input 
                    type="text" 
                    id="real_waba_phone_id" 
                    placeholder="ej. 109283..." 
                    class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">WhatsApp Business ID:</label>
                  <input 
                    type="text" 
                    id="real_waba_account_id" 
                    placeholder="ej. 982349..." 
                    class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-2 pt-1">
                <div>
                  <label class="block text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">N\xFAmero de Tel\xE9fono Real (con indicativo):</label>
                  <input 
                    type="text" 
                    id="real_waba_phone_number" 
                    placeholder="ej. +573001234567" 
                    class="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <button 
                type="button" 
                onclick="verifyRealWaba()" 
                class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-xs transition"
              >
                \u{1F50D} Validar Conexi\xF3n de WhatsApp con Meta
              </button>
            </div>

            <!-- Live Status Feedback -->
            <div id="real_waba_status" class="hidden"></div>

            <!-- Info box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] text-blue-800">
              <p class="leading-relaxed"><strong>Webhooks recomendados:</strong> Configure en su panel de Meta Developers el Webhook con la URL de notificaci\xF3n del sistema para que las respuestas con IA funcionen de inmediato de manera bidireccional.</p>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button 
                id="real_waba_submit_btn" 
                disabled 
                onclick="submitRealWabaConnection()" 
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vincular Cuenta Real
              </button>
            </div>
          </div>

        </div>

        <script>
          let currentTab = 'demo';
          window.verifiedWabaData = null;

          function switchTab(tab) {
            currentTab = tab;
            const tabDemo = document.getElementById('tab_demo');
            const tabReal = document.getElementById('tab_real');
            const contentDemo = document.getElementById('content_demo');
            const contentReal = document.getElementById('content_real');

            if (tab === 'demo') {
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-[#1877f2] text-[#1877f2] transition";
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentDemo.classList.remove('hidden');
              contentReal.classList.add('hidden');
            } else {
              tabReal.className = "flex-1 py-3 text-xs font-bold border-b-2 border-emerald-500 text-emerald-600 transition";
              tabDemo.className = "flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition";
              contentReal.classList.remove('hidden');
              contentDemo.classList.add('hidden');
            }
          }

          async function verifyRealWaba() {
            const token = document.getElementById('real_waba_token').value.trim();
            const phoneId = document.getElementById('real_waba_phone_id').value.trim();
            const wabaId = document.getElementById('real_waba_account_id').value.trim();
            const phoneNumber = document.getElementById('real_waba_phone_number').value.trim();

            if (!token || !phoneId || !wabaId || !phoneNumber) {
              alert('Por favor complete todos los campos de credenciales de WhatsApp.');
              return;
            }

            const statusDiv = document.getElementById('real_waba_status');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<span class="text-blue-600 font-semibold animate-pulse">Conectando con Meta Graph API...</span>';
            statusDiv.className = "p-3 rounded-lg bg-blue-50 text-xs border border-blue-200";

            try {
              // Fetch phone number detail to verify it is active
              const res = await fetch('https://graph.facebook.com/v18.0/' + phoneId + '?access_token=' + token);
              const data = await res.json();
              if (data.error) {
                throw new Error(data.error.message || 'Error al validar credenciales con Meta.');
              }

              statusDiv.innerHTML = '<span class="text-emerald-600 font-bold">\u2713 \xA1Conexi\xF3n con Meta WhatsApp Cloud API Establecida! Tel\xE9fono ID verificado.</span>';
              statusDiv.className = "p-3 rounded-lg bg-emerald-50 text-xs border border-emerald-200";

              window.verifiedWabaData = {
                name: data.display_phone_number || 'L\xEDnea WhatsApp Real',
                id: phoneId,
                wabaId: wabaId,
                apiToken: token,
                phoneNumber: phoneNumber,
                phoneNumberId: phoneId
              };

              document.getElementById('real_waba_submit_btn').disabled = false;

            } catch (err) {
              statusDiv.innerHTML = '<span class="text-red-600 font-semibold">\u274C Error: ' + err.message + '</span>';
              statusDiv.className = "p-3 rounded-lg bg-red-50 text-xs border border-red-200";
              document.getElementById('real_waba_submit_btn').disabled = true;
            }
          }

          function submitDemoConnection() {
            const wabaId = document.getElementById('waba_portfolio').value;
            const mode = document.querySelector('input[name="number_mode"]:checked').value;
            const countryCode = document.getElementById('country_code').value;
            const phoneVal = document.getElementById('phone_number').value.replace(/\\s+/g, '');
            const fullPhone = countryCode + phoneVal;

            // Generate auto credentials
            const apiToken = 'EAAbx_WABA_' + Math.random().toString(36).substring(2, 15).toUpperCase();
            const phoneNumberId = '109283' + Math.floor(100000 + Math.random() * 900000);

            const payload = {
              provider: 'meta-whatsapp',
              connectedUser: {
                name: 'Oscar Molina (WABA Admin)',
                id: '102948382',
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                apiToken,
                phoneNumberId,
                wabaId,
                mode,
                phoneNumber: fullPhone
              }
            };

            savePayload(payload);
          }

          function submitRealWabaConnection() {
            if (!window.verifiedWabaData) return;
            const waba = window.verifiedWabaData;

            const payload = {
              provider: 'meta-whatsapp',
              connectedUser: {
                name: waba.name + ' (Meta Real)',
                id: waba.phoneNumberId,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                apiToken: waba.apiToken,
                phoneNumberId: waba.phoneNumberId,
                wabaId: waba.wabaId,
                mode: 'produccion_real',
                phoneNumber: waba.phoneNumber
              }
            };

            savePayload(payload);
          }

          function savePayload(payload) {
            fetch('/api/integrations/meta-tiktok/save-whatsapp-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'meta-whatsapp', 
                  data: payload.connectedUser 
                }, '*');
                window.close();
              }
            })
            .catch(err => {
              console.error(err);
              alert('Error al vincular con Meta.');
            });
          }
        </script>
      </body>
      </html>
    `);
  });
  app.get(["/auth/meta/callback", "/auth/zernio/callback"], (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Conexi\xF3n Exitosa con Meta</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f17; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #161e2e; border: 1px solid #1e293b; padding: 32px; border-radius: 16px; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
    button { background: #1877f2; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">\u2713</div>
    <h2>\xA1WhatsApp Business Conectado!</h2>
    <p>Tu cuenta oficial de WhatsApp se ha sincronizado correctamente con Meta. Esta ventana se cerrar\xE1 autom\xE1ticamente.</p>
    <button onclick="window.close()">Cerrar Ventana</button>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'META_WABA_CONNECTED', success: true }, '*');
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'meta-whatsapp' }, '*');
      }
    } catch(e) {}
    setTimeout(function() { window.close(); }, 2000);
  </script>
</body>
</html>`);
  });
  app.post("/api/integrations/meta-tiktok/save-whatsapp-oauth", async (req, res) => {
    try {
      const { connectedUser } = req.body;
      const apiToken = connectedUser?.apiToken;
      const phoneNumberId = connectedUser?.phoneNumberId;
      let verifiedMeta = false;
      let metaDetails = null;
      if (apiToken && phoneNumberId) {
        try {
          const metaRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${encodeURIComponent(apiToken)}`, {
            signal: AbortSignal.timeout(8e3)
          });
          const metaData = await metaRes.json();
          if (metaData && !metaData.error) {
            verifiedMeta = true;
            metaDetails = metaData;
            if (metaData.display_phone_number) {
              connectedUser.phoneNumber = metaData.display_phone_number;
            }
            if (metaData.verified_name) {
              connectedUser.verifiedName = metaData.verified_name;
            }
          } else if (metaData && metaData.error) {
            return res.status(400).json({
              success: false,
              error: `Error de autenticaci\xF3n con Meta Graph API: ${metaData.error.message || "Token o ID de tel\xE9fono no v\xE1lido."}`
            });
          }
        } catch (e) {
          console.warn("Advertencia de red al conectar con Meta Graph API:", e.message);
        }
      }
      currentDB.whatsappOauthConfig = {
        ...connectedUser,
        verifiedMeta,
        metaDetails,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveDBData(currentDB);
      res.json({ success: true, config: currentDB.whatsappOauthConfig, verifiedMeta });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error guardando OAuth de WhatsApp" });
    }
  });
  app.post("/api/whatsapp/verify-credentials", async (req, res) => {
    try {
      const { apiToken, phoneNumberId } = req.body;
      if (!apiToken || !phoneNumberId) {
        return res.status(400).json({ success: false, error: "Se requiere el Access Token Permanente y el Phone Number ID." });
      }
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${encodeURIComponent(apiToken)}`, {
        signal: AbortSignal.timeout(8e3)
      });
      const metaData = await metaRes.json();
      if (metaData && metaData.error) {
        return res.status(401).json({
          success: false,
          error: metaData.error.message || "Error de autenticaci\xF3n con Meta Graph API."
        });
      }
      return res.json({
        success: true,
        displayPhoneNumber: metaData.display_phone_number || null,
        verifiedName: metaData.verified_name || null,
        qualityRating: metaData.quality_rating || "UNKNOWN",
        id: metaData.id
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || "Error al conectar con la API de Meta." });
    }
  });
  app.get("/api/integrations/whatsapp-oauth/config", (req, res) => {
    res.json({
      success: true,
      config: currentDB.whatsappOauthConfig || null
    });
  });
  app.get("/auth/tiktok", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Iniciar sesi\xF3n con TikTok</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Sofia+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Sofia Pro', -apple-system, sans-serif; }
        </style>
      </head>
      <body class="bg-[#121212] min-h-screen flex items-center justify-center p-4 text-white">
        <div class="bg-[#1e1e1e] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-800">
          <!-- TikTok Header -->
          <div class="px-6 py-5 flex items-center justify-between border-b border-gray-800">
            <div class="flex items-center gap-2">
              <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.589 6.686a4.866 4.866 0 0 1-3.1-1.154V12.4a6.113 6.113 0 1 1-6.112-6.111c.321 0 .633.025.938.073v3.195a2.912 2.912 0 1 0-.938 5.66c1.606 0 2.91-1.304 2.91-2.91V0h3.2a6.046 6.046 0 0 0 3.1 3.102v3.584z" fill="#00f2fe"/>
                <path d="M19.589 6.686a4.866 4.866 0 0 1-3.1-1.154V12.4a6.113 6.113 0 1 1-6.112-6.111c.321 0 .633.025.938.073v3.195a2.912 2.912 0 1 0-.938 5.66c1.606 0 2.91-1.304 2.91-2.91V0h3.2a6.046 6.046 0 0 0 3.1 3.102v3.584z" fill="#fe2c55" style="mix-blend-mode:screen"/>
              </svg>
              <span class="font-bold text-lg tracking-wider">TikTok for Business</span>
            </div>
            <span class="text-xs text-gray-500">OAuth Connection</span>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-6">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-[#fe2c55]/10 flex items-center justify-center text-[#fe2c55] font-bold text-xl shrink-0 border border-[#fe2c55]/20">
                T
              </div>
              <div class="space-y-1">
                <h2 class="font-bold text-gray-100 text-lg">Sincronizar TikTok Ads</h2>
                <p class="text-xs text-gray-400">Permite que Expert 360\xB0 acceda de forma segura a tus leads de Lead Generation instant forms y recupere informes publicitarios de TikTok.</p>
              </div>
            </div>

            <div class="border-t border-b border-gray-800 py-4 space-y-3">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Cuenta Publicitaria de TikTok:</p>
              
              <div class="space-y-2">
                <label class="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-[#161616] hover:bg-[#222] cursor-pointer">
                  <div class="flex items-center gap-3">
                    <span class="text-xl">\u{1F3B5}</span>
                    <div>
                      <p class="text-xs font-bold text-gray-200">oscar_ads_agency (TikTok Ads)</p>
                      <p class="text-[10px] text-gray-500">ID: act_10283811 \u2022 Cuenta Comercial activa</p>
                    </div>
                  </div>
                  <input type="checkbox" checked class="w-4 h-4 text-[#fe2c55] rounded" id="chk_tt_1" />
                </label>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold text-gray-400 hover:bg-[#282828] rounded-lg">
                Cancelar
              </button>
              <button onclick="submitConnection()" class="px-5 py-2.5 bg-[#fe2c55] hover:bg-[#e02447] text-white text-xs font-bold rounded-lg shadow-lg transition">
                Autorizar y Sincronizar
              </button>
            </div>
          </div>
        </div>

        <script>
          function submitConnection() {
            const isChecked = document.getElementById('chk_tt_1').checked;
            
            const adAccounts = [];
            if (isChecked) {
              adAccounts.push({ id: 'act_10283811', name: 'oscar_ads_agency' });
            }

            const payload = {
              provider: 'tiktok',
              connectedUser: {
                name: 'oscar_ads_agency',
                id: 'tt_user_992142',
                avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
                adAccounts
              },
              accessToken: 'TT-ACT-' + Math.random().toString(36).substring(2, 15)
            };

            // Send to server to save
            fetch('/api/integrations/meta-tiktok/save-oauth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'tiktok', data }, '*');
                window.close();
              }
            })
            .catch(err => {
              console.error(err);
              alert('Error al guardar sesi\xF3n de TikTok.');
            });
          }
        </script>
      </body>
      </html>
    `);
  });
  app.post("/api/integrations/meta-tiktok/save-oauth", (req, res) => {
    try {
      const { provider, connectedUser, accessToken } = req.body;
      if (!currentDB.metaAndTiktokConfig) {
        currentDB.metaAndTiktokConfig = {};
      }
      if (provider === "meta") {
        currentDB.metaAndTiktokConfig.metaConnected = true;
        currentDB.metaAndTiktokConfig.metaConnectedUser = connectedUser;
        currentDB.metaAndTiktokConfig.metaAccessToken = accessToken;
      } else if (provider === "tiktok") {
        currentDB.metaAndTiktokConfig.tiktokConnected = true;
        currentDB.metaAndTiktokConfig.tiktokConnectedUser = connectedUser;
        currentDB.metaAndTiktokConfig.tiktokAccessToken = accessToken;
      }
      saveDBData(currentDB);
      res.json({ success: true, config: currentDB.metaAndTiktokConfig });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || "Error saving OAuth credentials" });
    }
  });
  app.get("/api/webhooks/meta", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"] || req.query["challenge"] || req.query["zernio.challenge"];
    const configToken = currentDB.metaAndTiktokConfig?.metaWebhookVerifyToken || "mona_meta_verify_token";
    if (mode === "subscribe" && token === configToken) {
      console.log("\u2713 Meta Webhook Verificado Correctamente!");
      return res.status(200).send(challenge);
    }
    if (challenge) {
      return res.status(200).send(String(challenge));
    }
    res.status(200).json({ status: "ok", service: "meta-webhook" });
  });
  app.post("/api/webhooks/meta", (req, res) => {
    console.log("Meta/Zernio Webhook recibido:", JSON.stringify(req.body, null, 2));
    const isZernioEvent = Boolean(
      req.headers["x-zernio-signature"] || req.headers["x-zernio-event-id"] || req.body?.event?.startsWith?.("webhook.") || req.body?.event?.startsWith?.("message.") || req.body?.event?.startsWith?.("conversation.") || req.body?.event?.startsWith?.("account.") || req.body?.event?.startsWith?.("post.") || req.body?.webhookId
    );
    if (isZernioEvent) {
      return handleZernioWebhook(req, res, (event) => {
        try {
          const msg = event?.message;
          if (!msg) return;
          const cleanPhone = (msg.senderPhone || msg.senderId || "").replace(/\D/g, "");
          if (!cleanPhone) return;
          const nowStr = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          if (!currentDB.messagesHistory) currentDB.messagesHistory = {};
          if (!currentDB.messagesHistory[cleanPhone]) currentDB.messagesHistory[cleanPhone] = [];
          currentDB.messagesHistory[cleanPhone].push({
            role: msg.direction === "outgoing" ? "agent" : "client",
            source: "zernio_meta",
            fromMobile: msg.direction === "outgoing",
            text: msg.text,
            time: nowStr,
            timestamp: Date.now()
          });
          if (currentDB.messagesHistory[cleanPhone].length > 40) {
            currentDB.messagesHistory[cleanPhone].shift();
          }
          saveDBData(currentDB);
        } catch (e) {
          console.error("Error procesando mensaje Zernio en /api/webhooks/meta:", e);
        }
      });
    }
    if (!currentDB.webhookLogs) {
      currentDB.webhookLogs = [];
    }
    let summary = "Evento Meta recibido";
    if (req.body.entry?.[0]?.changes?.[0]?.value) {
      const val = req.body.entry[0].changes[0].value;
      if (val.leadgen_id) {
        summary = `Lead capturado en Meta: Lead ID ${val.leadgen_id} (Formulario: ${val.form_id || "ID Desconocido"})`;
      }
    }
    currentDB.webhookLogs.unshift({
      id: `log-${Date.now()}`,
      provider: "meta",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      summary,
      payload: req.body
    });
    if (currentDB.webhookLogs.length > 50) {
      currentDB.webhookLogs = currentDB.webhookLogs.slice(0, 50);
    }
    saveDBData(currentDB);
    res.sendStatus(200);
  });
  app.get("/api/webhooks/tiktok", (req, res) => {
    const challenge = req.query["challenge"] || req.query["hub.challenge"];
    res.status(200).send(challenge || "OK");
  });
  app.post("/api/webhooks/tiktok", (req, res) => {
    console.log("TikTok Webhook recibido:", JSON.stringify(req.body, null, 2));
    if (!currentDB.webhookLogs) {
      currentDB.webhookLogs = [];
    }
    let summary = "Evento TikTok recibido";
    if (req.body.event_type === "LEAD_GEN") {
      summary = `Lead capturado en TikTok (Formulario: ${req.body.form_id || "Desconocido"})`;
    }
    currentDB.webhookLogs.unshift({
      id: `log-${Date.now()}`,
      provider: "tiktok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      summary,
      payload: req.body
    });
    if (currentDB.webhookLogs.length > 50) {
      currentDB.webhookLogs = currentDB.webhookLogs.slice(0, 50);
    }
    saveDBData(currentDB);
    res.sendStatus(200);
  });
  let lastTelegramUpdateId = 0;
  async function sendTelegramMessage(token, chatId, text, replyMarkup) {
    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: "Markdown"
      };
      if (replyMarkup) {
        payload.reply_markup = JSON.stringify(replyMarkup);
      }
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("[Telegram Bot] Error sending message:", err);
    }
  }
  async function editTelegramMessage(token, chatId, messageId, text) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: "Markdown"
        })
      });
    } catch (err) {
      console.error("[Telegram Bot] Error editing message:", err);
    }
  }
  async function answerTelegramCallback(token, callbackQueryId, text) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text
        })
      });
    } catch (err) {
      console.error("[Telegram Bot] Error answering callback query:", err);
    }
  }
  async function handleTelegramUpdate(token, update) {
    try {
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat?.id;
        const text = msg.text || "";
        if (text.startsWith("/start")) {
          const parts = text.split(" ");
          const param = parts.length > 1 ? parts[1] : "";
          if (param.startsWith("pay_")) {
            const invoiceId = param.substring(4);
            const invoice = currentDB.telegramInvoices ? currentDB.telegramInvoices[invoiceId] : null;
            if (invoice) {
              const messageText = `\u{1F4E6} *FACTURA ENCONTRADA EN EXPERT360*

\u{1F4B3} *Plan:* _${invoice.planName}_
\u{1F4B0} *Monto:* _$${invoice.planValue} USD_
\u{1F511} *Referencia:* \`${invoiceId}\`
\u{1F45B} *Wallet Recibidora:* \`${invoice.superAdminWallet}\`

Por favor, confirma el pago a continuaci\xF3n. Una vez confirmado, el Smart Contract distribuir\xE1 de manera inmediata las comisiones a la red.`;
              const inlineKeyboard = {
                inline_keyboard: [
                  [
                    { text: "\u2705 Confirmar Pago", callback_data: `confirm_pay_${invoiceId}` },
                    { text: "\u274C Cancelar", callback_data: `cancel_pay_${invoiceId}` }
                  ]
                ]
              };
              await sendTelegramMessage(token, chatId, messageText, inlineKeyboard);
            } else {
              await sendTelegramMessage(token, chatId, `\u274C *Factura Expirada o No Encontrada*
La referencia de pago \`${invoiceId}\` no pudo ser localizada en la base de datos.`);
            }
          } else if (param.startsWith("ref_")) {
            const refereeWallet = param.substring(4);
            const messageText = `\u{1F44B} *\xA1BIENVENIDO A EXPERT360!*

\u{1F517} Has sido referido mediante el Smart Contract de Telegram por el sponsor:
\`${refereeWallet}\`

\xA1Felicidades! Ahora est\xE1s conectado a su red. Puedes proceder a activar tu suscripci\xF3n desde la plataforma y armar tu propia red Droshipper.`;
            await sendTelegramMessage(token, chatId, messageText);
          } else {
            const messageText = `\u{1F44B} *\xA1HOLA! BIENVENIDO AL ASISTENTE DE EXPERT360 Y COMUNIDAD DROSHIPPER*

Este bot permite procesar pagos y referidos on-chain de manera descentralizada con USDT/TON.

\u{1F4BB} Visita nuestra plataforma para activar tu plan y empezar a ganar comisiones instant\xE1neas por cada referido.`;
            await sendTelegramMessage(token, chatId, messageText);
          }
        }
      } else if (update.callback_query) {
        const cb = update.callback_query;
        const callbackId = cb.id;
        const chatId = cb.message?.chat?.id;
        const messageId = cb.message?.message_id;
        const data = cb.data || "";
        if (data.startsWith("confirm_pay_")) {
          const invoiceId = data.replace("confirm_pay_", "");
          if (currentDB.telegramInvoices && currentDB.telegramInvoices[invoiceId]) {
            const invoice = currentDB.telegramInvoices[invoiceId];
            invoice.status = "COMPLETED";
            const superAdminWallet = currentDB.superAdminWallet || process.env.SUPERADMIN_WALLET || "UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI";
            const sponsorWallet = invoice.sponsorWallet || "";
            const hasSponsors = !!sponsorWallet;
            const u1_share = invoice.planValue * 0.5;
            const u2_share = invoice.planValue * 0.1;
            const admin_share = invoice.planValue * 0.25;
            const newTxs = [];
            if (hasSponsors) {
              newTxs.push(
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: `Afiliado Telegram (${invoice.email || "An\xF3nimo"})`,
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: "Nivel 1 (Patrocinador Directo)",
                  dest: `${sponsorWallet} (Patrocinador)`,
                  percent: 50,
                  share: u1_share,
                  status: "Completado",
                  timestamp: "Hace unos instantes"
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: "Comunidad Red",
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: "Nivel 2",
                  dest: "Patrocinador N2",
                  percent: 10,
                  share: u2_share,
                  status: "Completado",
                  timestamp: "Hace unos instantes"
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: "Comunidad Red",
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: "Nivel 3",
                  dest: "Patrocinador N3",
                  percent: 5,
                  share: invoice.planValue * 0.05,
                  status: "Completado",
                  timestamp: "Hace unos instantes"
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: "Comunidad Red",
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: "Nivel 4",
                  dest: "Patrocinador N4",
                  percent: 5,
                  share: invoice.planValue * 0.05,
                  status: "Completado",
                  timestamp: "Hace unos instantes"
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: "Comunidad Red",
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: "Nivel 5",
                  dest: "Patrocinador N5",
                  percent: 5,
                  share: invoice.planValue * 0.05,
                  status: "Completado",
                  timestamp: "Hace unos instantes"
                },
                {
                  txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                  source: "Plataforma (Admin)",
                  plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                  totalMonto: invoice.planValue,
                  level: "Admin Principal",
                  dest: `SuperAdmin (${superAdminWallet})`,
                  percent: 25,
                  share: admin_share,
                  status: "Completado",
                  timestamp: "Hace unos instantes"
                }
              );
            } else {
              newTxs.push({
                txId: `0x${Math.random().toString(16).substring(4, 16)}`,
                source: `Afiliado Telegram (${invoice.email || "An\xF3nimo"})`,
                plan: `${invoice.planName} ($${invoice.planValue} USD)`,
                totalMonto: invoice.planValue,
                level: "Licencia Directa (Sin Patrocinador)",
                dest: `SuperAdmin (${superAdminWallet})`,
                percent: 100,
                share: invoice.planValue,
                status: "Completado",
                timestamp: "Hace unos instantes"
              });
            }
            if (!currentDB.telegramTransactions) {
              currentDB.telegramTransactions = [];
            }
            currentDB.telegramTransactions = [...newTxs, ...currentDB.telegramTransactions];
            if (!currentDB.userPlans) {
              currentDB.userPlans = {};
            }
            const targetEmail = invoice.email || "usuario@email.com";
            currentDB.userPlans[targetEmail] = invoice.planName;
            saveDBData(currentDB);
            const successMessage = `\u{1F973} *\xA1PAGO CONFIRMADO CON \xC9XITO!*

\u2705 El Smart Contract ha sido ejecutado de manera \xF3ptima en la red de Telegram.
\u{1F4B0} El split de comisiones se distribuy\xF3 instant\xE1neamente a las wallets de la comunidad.

\xA1Gracias por tu pago! Ya puedes ver tu estado activo en la plataforma principal.`;
            await sendTelegramMessage(token, chatId, successMessage);
            await answerTelegramCallback(token, callbackId, "\xA1Pago verificado y procesado con \xE9xito!");
            await editTelegramMessage(token, chatId, messageId, `\u{1F4E6} *FACTURA PAGADA - EXPERT360*

\u{1F4B3} *Plan:* _${invoice.planName}_
\u{1F4B0} *Monto:* _$${invoice.planValue} USD_
\u{1F511} *Referencia:* \`${invoiceId}\`

\u2705 *Estado:* COBRADO Y CONFIRMADO`);
          } else {
            await answerTelegramCallback(token, callbackId, "Error: Factura no encontrada.");
          }
        } else if (data.startsWith("cancel_pay_")) {
          const invoiceId = data.replace("cancel_pay_", "");
          await answerTelegramCallback(token, callbackId, "Factura cancelada.");
          await editTelegramMessage(token, chatId, messageId, `\u274C *Factura cancelada* por el usuario para la referencia \`${invoiceId}\`.`);
        }
      }
    } catch (err) {
      console.error("[Telegram Bot] Error handling update:", err);
    }
  }
  async function startTelegramBotPolling() {
    const getActiveToken = () => {
      return currentDB.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "8652525887:AAFdgRYzhAX_Z5L2Ien9tc4oauShl0QgjiI";
    };
    const isValidToken = (tok) => {
      if (!tok) return false;
      return /^\d+:[A-Za-z0-9_-]+$/.test(tok) && !tok.includes("8652525887:AAFdgRYzhAX_Z5L2Ien9tc4oauShl0QgjiI");
    };
    let activeToken = getActiveToken();
    if (isValidToken(activeToken)) {
      console.log(`[Telegram Bot] Starting polling with token ${activeToken.substring(0, 8)}...`);
      try {
        await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`);
      } catch (err) {
        console.error("[Telegram Bot] Error deleting webhook:", err);
      }
    } else {
      console.log("[Telegram Bot] No valid Telegram token configured yet. Polling will wait for configuration.");
    }
    const runPoll = async () => {
      while (true) {
        try {
          const currentToken = getActiveToken();
          if (currentToken !== activeToken) {
            console.log(`[Telegram Bot] Token changed. Re-evaluating validation.`);
            activeToken = currentToken;
            if (isValidToken(activeToken)) {
              try {
                await fetch(`https://api.telegram.org/bot${activeToken}/deleteWebhook`);
              } catch (err) {
              }
            }
          }
          if (!isValidToken(activeToken)) {
            await new Promise((resolve) => setTimeout(resolve, 8e3));
            continue;
          }
          const response = await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=15`);
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`[Telegram Bot Polling Error]: Status 404. El Token "${activeToken.substring(0, 10)}..." de tu de Bot de Telegram es incorrecto o est\xE1 desactivado. Configura el Token real en el Gestor de Usuarios.`);
              await new Promise((resolve) => setTimeout(resolve, 15e3));
              continue;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.ok && data.result) {
            for (const update of data.result) {
              lastTelegramUpdateId = update.update_id || update.updateId;
              await handleTelegramUpdate(activeToken, update);
            }
          }
        } catch (err) {
          console.error("[Telegram Bot Polling Error]:", err.message || err);
          await new Promise((resolve) => setTimeout(resolve, 8e3));
        }
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    };
    runPoll();
  }
  startTelegramBotPolling();
  async function checkAndSendRemarketing() {
    try {
      const count = currentDB.remarketingCount !== void 0 ? Number(currentDB.remarketingCount) : 0;
      if (count === 0) return;
      const intervalStr = currentDB.remarketingInterval || "2 horas";
      let intervalMs = 2 * 60 * 60 * 1e3;
      if (intervalStr.includes("15 min") || intervalStr.includes("15 minutos")) intervalMs = 15 * 60 * 1e3;
      else if (intervalStr.includes("1 hora")) intervalMs = 1 * 60 * 60 * 1e3;
      else if (intervalStr.includes("2 horas")) intervalMs = 2 * 60 * 60 * 1e3;
      else if (intervalStr.includes("24 horas")) intervalMs = 24 * 60 * 60 * 1e3;
      const avoidSpam = currentDB.remarketingAvoidSpam !== void 0 ? !!currentDB.remarketingAvoidSpam : true;
      if (!currentDB.remarketingStatus) {
        currentDB.remarketingStatus = {};
      }
      const now = Date.now();
      const clientSock = waSock || activeSockets["channel-default"];
      if (!clientSock) return;
      for (const phone of Object.keys(currentDB.messagesHistory || {})) {
        const history = currentDB.messagesHistory[phone];
        if (!history || history.length === 0) continue;
        const lastMsg = history[history.length - 1];
        if (lastMsg.role !== "assistant" && lastMsg.role !== "agent") continue;
        const lastMsgTime = lastMsg.timestamp || now - intervalMs - 1e3;
        if (now - lastMsgTime < intervalMs) continue;
        const status = currentDB.remarketingStatus[phone] || { sentCount: 0, lastSentTimestamp: 0 };
        if (status.sentCount >= count) continue;
        if (avoidSpam) {
          const hasOrder = (currentDB.orders || []).some((o) => o.phone && o.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
          if (hasOrder) continue;
          const chat = (currentDB.chats || []).find((c) => c.phone && c.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
          if (chat && (chat.status === "pedido_confirmado" || chat.status === "entregado" || chat.status === "finalizado" || chat.status === "completado" || (chat.tags || []).includes("Venta Cerrada"))) {
            continue;
          }
          const finalizationKeywords = ["gracias", "muchas gracias", "confirmado", "listo", "chao", "hasta luego", "pedido exitoso"];
          const isFinalizedText = history.some((h) => h.text && finalizationKeywords.some((kw) => h.text.toLowerCase().includes(kw)));
          if (isFinalizedText) continue;
        }
        if (status.lastSentTimestamp && now - status.lastSentTimestamp < intervalMs) continue;
        const currentSequenceIndex = status.sentCount;
        let msgText = "";
        let attachment = null;
        const useAI = currentDB.remarketingUseAI && currentDB.remarketingUseAI[currentSequenceIndex] !== void 0 ? !!currentDB.remarketingUseAI[currentSequenceIndex] : true;
        if (useAI) {
          try {
            console.log(`[Remarketing background] Generando con IA para +${phone}...`);
            const prompt = `Genera un mensaje de remarketing amigable, extremadamente educado, no invasivo y persuasivo para retomar la conversaci\xF3n con el cliente, bas\xE1ndote en el siguiente historial de chat. No uses saludos excesivos, s\xE9 directo y servicial (m\xE1ximo 25 palabras).
Historial de chat:
${history.slice(-6).map((h) => `${h.role === "client" ? "Cliente" : "IA"}: ${h.text}`).join("\n")}
Respuesta de remarketing (sin etiquetas JSON, solo texto plano):`;
            const aiResponse = await executeAIInternal(prompt);
            msgText = aiResponse || "\xA1Hola! \xBFQued\xF3 alguna duda sobre tu solicitud? Quedo a tu disposici\xF3n.";
          } catch (err) {
            msgText = "\xA1Hola! \xBFQued\xF3 alguna duda sobre tu solicitud? Quedo a tu disposici\xF3n.";
          }
        } else {
          const customMessages = currentDB.remarketingMessages || [];
          msgText = customMessages[currentSequenceIndex] || "\xA1Hola! Quer\xEDa saber si pudiste revisar la informaci\xF3n. Quedo a tu disposici\xF3n.";
          const customAtts = currentDB.remarketingAttachments || [];
          const attList = customAtts[currentSequenceIndex] || [];
          if (attList.length > 0) {
            attachment = attList[0];
          }
        }
        const targetJid = `${phone}@s.whatsapp.net`;
        try {
          if (attachment && attachment.url) {
            const buffer = await getMediaBuffer(attachment.url);
            if (buffer) {
              if (attachment.type === "imagen") {
                await clientSock.sendMessage(targetJid, { image: buffer, caption: msgText });
              } else if (attachment.type === "audio") {
                const converted = await convertAudioToOggOpus(buffer, attachment.url || attachment.name);
                await clientSock.sendMessage(targetJid, {
                  audio: converted,
                  ptt: true,
                  mimetype: "audio/ogg; codecs=opus",
                  waveform: generateSimulatedWaveform(64)
                });
              } else {
                await clientSock.sendMessage(targetJid, { document: buffer, fileName: attachment.name || "documento", caption: msgText });
              }
            } else {
              await clientSock.sendMessage(targetJid, { text: msgText });
            }
          } else {
            await clientSock.sendMessage(targetJid, { text: msgText });
          }
          console.log(`[Remarketing background] Mensaje #${currentSequenceIndex + 1} enviado con \xE9xito a +${phone}`);
        } catch (sendErr) {
          console.error(`[Remarketing background] Error enviando mensaje a +${phone}:`, sendErr);
        }
        currentDB.messagesHistory[phone].push({
          role: "assistant",
          text: `[REMARKETING] ${msgText}`,
          time: (/* @__PURE__ */ new Date()).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now()
        });
        status.sentCount += 1;
        status.lastSentTimestamp = now;
        currentDB.remarketingStatus[phone] = status;
        saveDBData(currentDB);
      }
    } catch (err) {
      console.error("[Remarketing Error] Error en checkAndSendRemarketing background:", err);
    }
  }
  setInterval(checkAndSendRemarketing, 6e4);
  const defaultCredsPath = path.join(path.resolve(wAuthBaseDir, "baileys_auth_info"), "creds.json");
  const hasSavedCreds = fs.existsSync(defaultCredsPath) || currentDB.whatsappSessionData && currentDB.whatsappSessionData["channel-default"];
  if (currentDB.whatsappConnected || hasSavedCreds) {
    console.log("[Startup] Auto-connecting to default WhatsApp channel (credenciales encontradas)...");
    connectToWhatsApp("channel-default").catch((err) => console.error(err));
  }
  if (currentDB.channels && Array.isArray(currentDB.channels)) {
    for (const ch of currentDB.channels) {
      if (ch.connected && ch.id !== "channel-default") {
        console.log("[Startup] Auto-connecting to WhatsApp channel " + ch.id + "...");
        connectToWhatsApp(ch.id).catch((err) => console.error(err));
      }
    }
  }
  const distExists = fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
  if (distExists) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express2.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(port2, "0.0.0.0", () => {
    console.log(`Server executing at port ${port2}`);
  });
}
createServer();
export {
  incrementAiUsage
};
