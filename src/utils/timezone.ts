// Timezone Detection & Synchronization Utility for Xorbit 360
// Automatically detects device/browser timezone and synchronizes with server and IP location.

let cachedTimezone: string = 'America/Bogota';

try {
  const saved = localStorage.getItem('XORBIT 360_TIMEZONE');
  if (saved) {
    cachedTimezone = saved;
  } else {
    // La operación está fijada a Colombia; no usar la zona del dispositivo
    // porque puede cambiar las métricas y los horarios entre usuarios.
    cachedTimezone = 'America/Bogota';
    localStorage.setItem('XORBIT 360_TIMEZONE', cachedTimezone);
  }
} catch (_) {
  cachedTimezone = 'America/Bogota';
}

export function getTimezone(): string {
  return cachedTimezone || 'America/Bogota';
}

export function setTimezone(tz: string): void {
  if (!tz) return;
  cachedTimezone = tz;
  try {
    localStorage.setItem('XORBIT 360_TIMEZONE', tz);
  } catch (_) {}
}

/**
 * Formats a Date or timestamp strictly to Colombia Time (America/Bogota / UTC-5)
 * E.g. '03:30 p. m.' or '15:30'
 */
export function formatColombiaTime(date: Date | number | string = new Date(), hour12: boolean = true): string {
  try {
    if (!date) return '';
    if (typeof date === 'string') {
      if (date.toLowerCase().includes('hace') || date.toLowerCase().includes('ahora') || date.toLowerCase().includes('ayer')) {
        return date;
      }
      const parsed = Date.parse(date);
      if (!isNaN(parsed)) {
        return new Intl.DateTimeFormat('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12,
          timeZone: 'America/Bogota'
        }).format(new Date(parsed));
      }
      return date;
    }
    const d = typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12,
      timeZone: 'America/Bogota'
    }).format(d);
  } catch (_) {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  }
}

/**
 * Formats a Date or timestamp according to the detected timezone (e.g. America/Bogota / Colombia)
 */
export function formatLocalTime(date: Date | number | string = new Date(), options?: Intl.DateTimeFormatOptions): string {
  try {
    if (typeof date === 'string') {
      if (/^\d{1,2}:\d{2}/.test(date) || date.toLowerCase().includes('ayer') || date.toLowerCase().includes('hace') || date.toLowerCase().includes('ahora')) {
        return date;
      }
    }
    const d = typeof date === 'number' ? new Date(date) : (typeof date === 'string' ? new Date(date) : date);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
    }

    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota',
      ...options
    }).format(d);
  } catch (_) {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota'
    }).format(new Date());
  }
}

/**
 * Formats date and time
 */
export function formatLocalDateTime(date: Date | number | string = new Date()): string {
  try {
    const d = typeof date === 'number' ? new Date(date) : (typeof date === 'string' ? new Date(date) : date);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: getTimezone()
    }).format(d);
  } catch (_) {
    return new Date().toLocaleString();
  }
}

/**
 * Initializes automatic timezone detection by checking device Intl and notifying backend
 */
export async function initAutoTimezone(): Promise<string> {
  let detectedTz = 'America/Bogota';
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved) detectedTz = resolved;
  } catch (_) {}

  setTimezone(detectedTz);

  try {
    const res = await fetch('/api/detect-timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: detectedTz })
    });
    const data = await res.json();
    if (data.success && data.timezone) {
      detectedTz = data.timezone;
      setTimezone(detectedTz);
    }
  } catch (_) {
    // Keep local detected
  }

  return detectedTz;
}

// Auto-run on module import
if (typeof window !== 'undefined') {
  initAutoTimezone().catch(() => {});
}
