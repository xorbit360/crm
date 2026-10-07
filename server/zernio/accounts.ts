// server/zernio/accounts.ts
// Gestión de Cuentas Zernio (Prompt 2):
// - Conexión OAuth: GET /v1/connect/{platform} con redirect_url y onboarding (business_app vs api)
// - Conexión Headless (BYO-WABA): POST /v1/connect/whatsapp/credentials con accessToken permanente, wabaId, phoneNumberId y pin
// - Listado de cuentas y perfiles: GET /v1/accounts, GET /v1/profiles
// - Normalización de id / _id

import { zernioRequest } from './client.ts';

export interface ZernioAccount {
  id: string;
  platform: 'whatsapp' | 'instagram' | 'messenger' | string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  wabaId?: string;
  status?: string;
  onboardingMode?: 'business_app' | 'api' | 'headless';
  connectedAt?: string;
  raw?: any;
}

export function normalizeZernioId(obj: any): string {
  if (!obj) return '';
  return String(obj.id || obj._id || obj.accountId || '');
}

export function normalizeAccount(raw: any): ZernioAccount {
  const id = normalizeZernioId(raw);
  return {
    id,
    platform: raw.platform || (raw.phoneNumber || raw.phoneNumberId ? 'whatsapp' : 'unknown'),
    name: raw.name || raw.displayName || raw.businessName || raw.phoneNumber || 'Cuenta Zernio',
    username: raw.username,
    phoneNumber: raw.phoneNumber || raw.phone || raw.displayPhoneNumber,
    phoneNumberId: raw.phoneNumberId || raw.phoneId,
    wabaId: raw.wabaId || raw.waba_id,
    status: raw.status || 'active',
    onboardingMode: raw.onboarding || raw.mode || (raw.isCoexistence ? 'business_app' : 'api'),
    connectedAt: raw.connectedAt || raw.createdAt || new Date().toISOString(),
    raw
  };
}

// 1. Obtener cuentas conectadas
export async function getZernioAccounts() {
  const result = await zernioRequest<{ accounts?: any[]; data?: any[] }>({
    method: 'GET',
    path: '/v1/accounts'
  });

  if (!result.success) {
    return result;
  }

  const list = Array.isArray(result.data) 
    ? result.data 
    : (result.data?.accounts || result.data?.data || []);

  const normalized = list.map(normalizeAccount);
  return {
    success: true as const,
    data: normalized
  };
}

// 2. Obtener perfiles de agrupación
export async function getZernioProfiles() {
  return zernioRequest({
    method: 'GET',
    path: '/v1/profiles'
  });
}

// 3. Iniciar flujo OAuth (Devuelve authUrl segura para popup en navegador)
export interface ConnectPlatformParams {
  platform: string;
  shop?: string;
  redirectUrl: string;
  // WhatsApp: business_app (coexistencia con app móvil) vs api (Cloud API directa)
  onboarding?: 'business_app' | 'api';
  // Instagram: instagram_login vs facebook_login
  loginMethod?: 'instagram_login' | 'facebook_login';
}

export async function getZernioConnectUrl(params: ConnectPlatformParams) {
  const query = new URLSearchParams();
  query.set('redirect_url', params.redirectUrl);

  let profileId = (params as any).profileId;
  if (!profileId) {
    try {
      const profilesRes = await getZernioProfiles();
      if (profilesRes.success && profilesRes.data) {
        const list = (profilesRes.data as any)?.profiles || (profilesRes.data as any);
        if (Array.isArray(list) && list[0]?._id) {
          profileId = list[0]._id;
        } else {
          profileId = '6aab21d9e549292803da9a84';
        }
      } else {
        profileId = '6aab21d9e549292803da9a84';
      }
    } catch {
      profileId = '6aab21d9e549292803da9a84';
    }
  }
  if (profileId) {
    query.set('profileId', profileId);
  }
  if (params.shop) query.set('shop', params.shop);

  if (params.platform === 'whatsapp') {
    // Parámetro CRÍTICO: business_app vs api
    query.set('onboarding', params.onboarding || 'business_app');
  } else if (params.platform === 'instagram') {
    query.set('loginMethod', params.loginMethod || 'instagram_login');
  }

  const path = `/v1/connect/${params.platform}?${query.toString()}`;

  const result = await zernioRequest<{ authUrl?: string; url?: string; data?: { authUrl?: string } }>({
    method: 'GET',
    path
  });

  if (!result.success) {
    return result;
  }

  const authUrl = result.data?.authUrl || result.data?.url || result.data?.data?.authUrl;
  if (!authUrl) {
    return {
      success: false as const,
      error: {
        status: 500,
        code: 'MISSING_AUTH_URL',
        message: 'Zernio no retornó una URL de autenticación válida'
      }
    };
  }

  return {
    success: true as const,
    data: { authUrl }
  };
}

// 4. Conexión Headless (BYO-WABA cuando el número ya está en una WABA de Meta)
export interface ConnectHeadlessWabaParams {
  accessToken: string; // Token permanente de System User con whatsapp_business_management y messaging
  wabaId: string;
  phoneNumberId: string;
  pin: string; // PIN 2FA obligatorio de Meta (evita error 133005)
}

export async function connectZernioHeadlessWaba(params: ConnectHeadlessWabaParams) {
  if (!params.accessToken || !params.wabaId || !params.phoneNumberId || !params.pin) {
    return {
      success: false as const,
      error: {
        status: 400,
        code: 'MISSING_CREDENTIALS',
        message: 'Se requieren accessToken permanente, wabaId, phoneNumberId y PIN de verificación en dos pasos'
      }
    };
  }

  const result = await zernioRequest({
    method: 'POST',
    path: '/v1/connect/whatsapp/credentials',
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
    success: true as const,
    data: normalized
  };
}

export async function deleteZernioAccount(accountId: string) {
  if (!accountId) {
    return {
      success: false as const,
      error: {
        status: 400,
        code: 'MISSING_ACCOUNT_ID',
        message: 'Se requiere el ID de la cuenta para desvincularla'
      }
    };
  }

  const result = await zernioRequest({
    method: 'DELETE',
    path: `/v1/accounts/${accountId}`
  });

  return result;
}

