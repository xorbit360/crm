/**
 * inactiveCleanup.ts — Cron diario de mantenimiento freemium.
 *
 * 1. Cuentas inactivas: usuarios con plan 'free' cuya última actividad
 *    (lastActivityAt, o createdAt si no hay) supere 7 días → se eliminan.
 *    Solo aplica al plan gratuito; los usuarios pagos NUNCA se eliminan aquí.
 * 2. Canales vencidos: suspende suscripciones de canal sin pago vigente
 *    (ver billing.ts → suspendExpiredChannels).
 *
 * Se ejecuta una vez al día desde server.ts (setInterval 24h).
 * Log de eliminaciones en consola + db.maintenanceLog (auditoría).
 */
import { suspendExpiredChannels } from '../billing.ts';

const INACTIVE_DAYS = 7;

function isFreeUser(user: any): boolean {
  const planId = String(user?.planId || '').trim().toLowerCase();
  const plan = String(user?.plan || '').trim().toLowerCase();
  return planId === 'free' || plan === 'free' || plan === 'gratuito';
}

export interface CleanupResult {
  deletedUsers: string[];
  suspendedChannels: string[];
  ranAt: string;
}

export function runInactiveCleanup(
  getDB: () => any,
  saveDB: (db: any) => void,
  disconnectChannel?: (userEmail: string) => Promise<void> | void,
): CleanupResult {
  const result: CleanupResult = { deletedUsers: [], suspendedChannels: [], ranAt: new Date().toISOString() };
  try {
    const db = getDB();
    const cutoff = Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000;

    // 1. Eliminar cuentas gratuitas inactivas
    if (Array.isArray(db.users)) {
      const before = db.users.length;
      const survivors: any[] = [];
      for (const u of db.users) {
        // Nunca tocar: superadmin/admin, effix (plan respetado), usuarios pagos
        const role = String(u?.role || '').toLowerCase();
        if (role === 'superadmin' || role === 'admin') { survivors.push(u); continue; }
        if (String(u?.email || '').toLowerCase() === 'effix@xorbit360.com') { survivors.push(u); continue; }
        if (!isFreeUser(u)) { survivors.push(u); continue; }

        const lastSeen = u.lastActivityAt || u.createdAt;
        const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
        if (lastSeenMs && lastSeenMs < cutoff) {
          result.deletedUsers.push(String(u.email || u.id));
          console.log(`[InactiveCleanup] Cuenta gratuita inactiva eliminada: ${u.email} (última actividad: ${lastSeen})`);
          continue;
        }
        survivors.push(u);
      }
      if (survivors.length !== before) {
        db.users = survivors;
        if (!Array.isArray(db.maintenanceLog)) db.maintenanceLog = [];
        db.maintenanceLog.unshift({
          type: 'inactive-cleanup',
          deleted: result.deletedUsers,
          at: result.ranAt,
        });
        if (db.maintenanceLog.length > 100) db.maintenanceLog = db.maintenanceLog.slice(0, 100);
        saveDB(db);
      }
    }

    // 2. Suspender canales con pago vencido
    result.suspendedChannels = suspendExpiredChannels(getDB, saveDB, disconnectChannel);
  } catch (err) {
    console.warn('[InactiveCleanup] Error en limpieza:', err);
  }
  return result;
}

/** Actualiza lastActivityAt del usuario (llamar en login y acciones clave). */
export function touchUserActivity(getDB: () => any, saveDB: (db: any) => void, email: string): void {
  try {
    const db = getDB();
    const users: any[] = Array.isArray(db?.users) ? db.users : [];
    const norm = String(email || '').trim().toLowerCase();
    const user = users.find((u: any) => String(u.email || '').trim().toLowerCase() === norm);
    if (user) {
      user.lastActivityAt = new Date().toISOString();
      saveDB(db);
    }
  } catch { /* nunca bloquea */ }
}
