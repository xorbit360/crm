// server/zernio/client.ts
// Cliente HTTP robusto para la API de Zernio (https://zernio.com/api/v1)
// Cumple estrictamente con el Prompt 1:
// - Auth Header: Authorization: Bearer <ZERNIO_API_KEY>
// - Nunca lanza excepciones, retorna Result discriminado: { success: true, data } | { success: false, error }
// - Timeout de 15 segundos
// - Reintento automático con backoff exponencial y jitter SOLO en 429, 502, 503, 504 y timeout
// - Opción noRetry para webhooks y llamadas con presupuesto de tiempo ajustado
// - Idempotency-Key y headers personalizados
// - Parseo defensivo de errores JSON o texto plano

export type ZernioResult<T> = 
  | { success: true; data: T }
  | { 
      success: false; 
      error: { 
        status: number; 
        code: string; 
        message: string; 
        retryAfter?: number; 
        raw?: string 
      } 
    };

export interface ZernioRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string; // ej. "/v1/accounts" o "https://zernio.com/api/v1/..."
  body?: any;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  noRetry?: boolean;
  timeoutMs?: number;
}

const ZERNIO_BASE_URL = 'https://zernio.com/api/v1';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const RETRY_STATUS_CODES = new Set([429, 502, 503, 504]);
// Never ship a live API key in the application bundle. Configure it only on the server.
export const ZERNIO_DEFAULT_KEY = '';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  // Exponential backoff: 300ms, 600ms, 1200ms... + jitter
  const baseDelay = 300 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 150);
  return baseDelay + jitter;
}

export async function zernioRequest<T = any>(options: ZernioRequestOptions): Promise<ZernioResult<T>> {
  const apiKey = process.env.ZERNIO_API_KEY || (globalThis as any).currentDB?.zernioApiKey || ZERNIO_DEFAULT_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: {
        status: 401,
        code: 'MISSING_API_KEY',
        message: 'No se ha configurado la variable de entorno ZERNIO_API_KEY en el servidor',
        raw: 'ZERNIO_API_KEY is undefined'
      }
    };
  }

  const normalizedPath = options.path.startsWith('/v1/') 
    ? options.path.slice(3) 
    : options.path;

  const url = normalizedPath.startsWith('http') 
    ? normalizedPath 
    : `${ZERNIO_BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;

  const method = options.method || 'GET';
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const baseHeaders: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  if (options.idempotencyKey) {
    baseHeaders['Idempotency-Key'] = options.idempotencyKey;
  }

  const payload = options.body !== undefined && options.body !== null 
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : undefined;

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
        body: method !== 'GET' ? payload : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const status = response.status;
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

      // Éxito (2xx)
      if (response.ok) {
        let parsedData: any = null;
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
          data: parsedData as T
        };
      }

      // Reintento SOLO en 429, 502, 503, 504 (nunca en 4xx de validación como 400, 401, 403, 404)
      const canRetry = !options.noRetry && RETRY_STATUS_CODES.has(status) && attempt < MAX_RETRIES;
      if (canRetry) {
        attempt++;
        const delay = calculateBackoff(attempt, retryAfterHeader);
        console.warn(`[Zernio HTTP] Reintento ${attempt}/${MAX_RETRIES} para ${method} ${options.path} (status ${status}). Esperando ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // Error no recuperable o reintentos agotados
      const rawErrorText = await response.text().catch(() => '');
      let errorCode = `HTTP_${status}`;
      let errorMessage = `Error HTTP ${status}`;

      if (rawErrorText) {
        try {
          const jsonError = JSON.parse(rawErrorText);
          if (jsonError.code) errorCode = String(jsonError.code);
          if (jsonError.message) errorMessage = String(jsonError.message);
          else if (jsonError.error) {
            errorMessage = typeof jsonError.error === 'string' ? jsonError.error : (jsonError.error.message || JSON.stringify(jsonError.error));
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
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAborted = isTimeout || err?.name === 'AbortError';
      const canRetry = !options.noRetry && (isAborted || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') && attempt < MAX_RETRIES;

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
          code: isAborted ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isAborted 
            ? `La solicitud a Zernio excedió el tiempo límite de ${timeoutMs / 1000}s` 
            : (err?.message || 'Error de red al conectar con Zernio'),
          raw: String(err?.stack || err)
        }
      };
    }
  }
}
