// White-label and Reseller Configuration Utilities
// Supports custom brands, logos, custom domains and personalized affiliate links

export interface WhiteLabelConfig {
  brandName: string;
  tagline: string;
  logoUrl: string;
  customDomain: string;
  officialDomain: string;
  primaryColor: string;
  supportEmail: string;
  supportPhone: string;
  dnsVerified?: boolean;
  hideDashboard?: boolean;
  hiddenMenus?: string[];
  defaultTool?: string;
  customReferralUrl?: string;
  scope?: 'global' | 'user';
  userEmail?: string;
}

export const DEFAULT_WHITELABEL: WhiteLabelConfig = {
  brandName: 'Xorbit 360',
  tagline: 'Marketing & Ventas AI',
  logoUrl: '',
  customDomain: '',
  officialDomain: 'https://crm.xorbit360.com/',
  primaryColor: '#d4af37',
  supportEmail: 'admin@xorbit360.com',
  supportPhone: '+57 300 000 0000',
  dnsVerified: false,
  hideDashboard: false,
  hiddenMenus: [],
  defaultTool: 'whatsapp',
  scope: 'global'
};

const STORAGE_KEY = 'xorbit360_whitelabel_config';

export function getUserStorageKey(userEmail?: string): string {
  if (userEmail && userEmail.trim()) {
    return `xorbit360_whitelabel_user_${userEmail.trim().toLowerCase()}`;
  }
  return STORAGE_KEY;
}

export function getCachedWhiteLabel(userEmail?: string): WhiteLabelConfig {
  if (typeof window === 'undefined') return DEFAULT_WHITELABEL;
  try {
    // 1. Try user-specific config if user email provided
    if (userEmail && userEmail.trim()) {
      const userRaw = localStorage.getItem(getUserStorageKey(userEmail));
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        return { ...DEFAULT_WHITELABEL, ...parsed };
      }
    }
    // 2. Fallback to global config
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_WHITELABEL, ...parsed };
    }
  } catch (e) {
    console.error('Error reading cached whitelabel config:', e);
  }
  return DEFAULT_WHITELABEL;
}

export function setCachedWhiteLabel(config: WhiteLabelConfig, userEmail?: string, isGlobal = true) {
  if (typeof window === 'undefined') return;
  try {
    if (isGlobal) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    if (userEmail && userEmail.trim()) {
      localStorage.setItem(getUserStorageKey(userEmail), JSON.stringify({ ...config, userEmail }));
    }
    window.dispatchEvent(new CustomEvent('whitelabel-updated', { detail: config }));
  } catch (e) {
    console.error('Error caching whitelabel config:', e);
  }
}

export async function fetchWhiteLabelConfig(userEmail?: string): Promise<WhiteLabelConfig> {
  try {
    const url = userEmail ? `/api/whitelabel/config?email=${encodeURIComponent(userEmail)}` : '/api/whitelabel/config';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        setCachedWhiteLabel(data.config, userEmail, false);
        return data.config;
      }
    }
  } catch (e) {
    console.warn('Could not fetch remote whitelabel config, using cached:', e);
  }
  return getCachedWhiteLabel(userEmail);
}

export async function saveWhiteLabelConfig(config: WhiteLabelConfig, userEmail?: string, isGlobal = true): Promise<{ success: boolean; config?: WhiteLabelConfig; error?: string }> {
  setCachedWhiteLabel(config, userEmail, isGlobal);
  try {
    const res = await fetch('/api/whitelabel/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, userEmail, isGlobal })
    });
    const data = await res.json();
    if (data.success && data.config) {
      setCachedWhiteLabel(data.config, userEmail, isGlobal);
      return { success: true, config: data.config };
    }
    return { success: true, config };
  } catch (err: any) {
    console.error('Error saving remote whitelabel config:', err);
    return { success: true, config };
  }
}

/**
 * Returns the effective public base URL for links and referrals.
 * Prioritizes the reseller's customDomain (e.g. https://xorbit360.com),
 * or current window.location.origin (if not localhost),
 * and falls back to https://crm.xorbit360.com/
 */
export function getEffectiveDomain(config?: Partial<WhiteLabelConfig>): string {
  const currentConfig = config || getCachedWhiteLabel();

  if (currentConfig.customDomain && currentConfig.customDomain.trim().length > 0) {
    const clean = currentConfig.customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (clean) {
      return `https://${clean}`;
    }
  }

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const host = window.location.host;
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return window.location.origin;
    }
  }

  return 'https://crm.xorbit360.com';
}

/**
 * Generates the live referral URL for an affiliate or reseller using their custom domain.
 */
export function getReferralLink(referralCode: string, config?: Partial<WhiteLabelConfig>): string {
  const base = getEffectiveDomain(config);
  const code = (referralCode || '').trim();
  if (!code) return base;
  return `${base}/?ref=${encodeURIComponent(code)}`;
}
