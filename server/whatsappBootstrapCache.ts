// server/whatsappBootstrapCache.ts
// Caché corta en memoria (30 s) de la respuesta YA ARMADA del bootstrap de
// Conversaciones (GET /api/backoffice/whatsapp). Ese endpoint tarda ~1,6 s
// porque consulta las tablas normalizadas de Supabase en cada apertura; con
// esta caché, las reaperturas dentro de la ventana responden al instante.
// El refresco en vivo de la UI usa /api/backoffice/inbox y NO depende de
// este bootstrap, así que la ventana de 30 s no congela la bandeja abierta.
// La caché se invalida explícitamente en los puntos de escritura:
// guardados de configuración (POST /api/backoffice/state), sincronización
// manual (POST /api/whatsapp/sync-recent-chats) y envíos de mensajes
// (POST /api/whatsapp/reply y POST /api/zernio/send-message).

const BOOTSTRAP_CACHE_TTL_MS = 30 * 1000;

interface BootstrapCacheEntry {
  expiresAt: number;
  payload: any;
}

const bootstrapCache = new Map<string, BootstrapCacheEntry>();

export function getWhatsappBootstrapCache(key: string): any | null {
  const entry = bootstrapCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    bootstrapCache.delete(key);
    return null;
  }
  return entry.payload;
}

export function setWhatsappBootstrapCache(key: string, payload: any): void {
  bootstrapCache.set(key, { payload, expiresAt: Date.now() + BOOTSTRAP_CACHE_TTL_MS });
}

// Borra TODAS las entradas: no todo punto de escritura conoce la clave
// exacta del solicitante que cacheó (p. ej. los envíos del router Zernio),
// y el costo de reconstruir es una sola consulta por admin activo.
export function invalidateWhatsappBootstrapCache(): void {
  bootstrapCache.clear();
}
