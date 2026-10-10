import crypto from 'crypto';

/**
 * Cifrado de secretos de configuracion (claves de proveedores de IA).
 *
 * Formato guardado: `enc:v1:<base64(iv | tag | ciphertext)>` con
 * AES-256-GCM. La llave maestra vive SOLO en el entorno del servidor
 * (SETTINGS_ENCRYPTION_KEY, 32 bytes en hex o base64); nunca en Git,
 * nunca en la base de datos y nunca se devuelve por la API.
 *
 * Los valores legados en texto plano se siguen leyendo tal cual
 * (decryptSecret los devuelve sin cambios) y se migran al formato
 * cifrado al arrancar o en el proximo guardado.
 */

const ENCRYPTED_PREFIX = 'enc:v1:';

let cachedKey: Buffer | null = null;
let warnedInvalid = false;
let warnedUndecryptable = false;

function loadMasterKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const raw = String(process.env.SETTINGS_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  try {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      cachedKey = Buffer.from(raw, 'hex');
    } else {
      const decoded = Buffer.from(raw, 'base64');
      if (decoded.length === 32) cachedKey = decoded;
    }
  } catch {
    cachedKey = null;
  }
  if (!cachedKey && !warnedInvalid) {
    warnedInvalid = true;
    console.warn('[SecretBox] SETTINGS_ENCRYPTION_KEY presente pero invalida (se esperan 32 bytes en hex o base64); el cifrado queda deshabilitado.');
  }
  return cachedKey;
}

export function isSecretEncryptionEnabled(): boolean {
  return loadMasterKey() !== null;
}

export function isEncryptedSecret(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptSecret(plain: string): string {
  const key = loadMasterKey();
  if (!key) {
    throw new Error('El servidor no tiene SETTINGS_ENCRYPTION_KEY configurada; no se puede guardar la clave cifrada.');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENCRYPTED_PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Descifra un valor guardado. Si el valor es legado (texto plano), lo
 * devuelve tal cual para no romper la operacion; si esta cifrado pero
 * no se puede descifrar (sin llave maestra o dato corrupto), devuelve ''.
 */
export function decryptSecret(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (!isEncryptedSecret(value)) return value;
  const key = loadMasterKey();
  if (!key) {
    if (!warnedUndecryptable) {
      warnedUndecryptable = true;
      console.warn('[SecretBox] Hay secretos cifrados pero SETTINGS_ENCRYPTION_KEY no esta disponible; no se pueden descifrar.');
    }
    return '';
  }
  try {
    const raw = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (err: any) {
    console.warn('[SecretBox] No se pudo descifrar un secreto guardado:', err?.message || err);
    return '';
  }
}

/** Mascara segura para confirmar en la UI del dueño: •••• + ultimos 4. */
export function maskSecret(value: unknown): string | null {
  const plain = decryptSecret(value);
  if (!plain) return null;
  return `••••${plain.slice(-4)}`;
}
