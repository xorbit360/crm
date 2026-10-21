/**
 * migrate-freemium.ts — Migración al modelo freemium (DRY-RUN por defecto).
 *
 * Uso:
 *   npx tsx scripts/migrate-freemium.ts            → dry-run: imprime lo que haría
 *   npx tsx scripts/migrate-freemium.ts --execute → EJECUTA la migración (requiere confirmación)
 *
 * Reglas (decisiones de Oscar 2026-10-16):
 * - effix@xorbit360.com: EXCLUIDO, conserva su plan actual.
 * - superadmin/admin: no se tocan.
 * - Usuarios con plan pago (Starter/Standard/Pro/Enterprise) y status='activo':
 *   se mantienen, pero se les asigna planId normalizado si falta.
 * - Usuarios 'pendiente_pago' (registro legacy sin pago completado):
 *   se migran a plan 'free' (pueden activar después).
 * - Usuarios sin plan o con plan desconocido: se migran a 'free'.
 *
 * La migración real se hace contra la DB de producción vía MCP; este script
 * opera sobre menu_data.json local como referencia del formato.
 */
import fs from 'fs';
import path from 'path';

const EXCLUDED_EMAILS = ['effix@xorbit360.com'];
const EXECUTE = process.argv.includes('--execute');

const PLAN_IDS: Record<string, string> = {
  starter: 'starter',
  standard: 'standard',
  pro: 'pro',
  enterprise: 'enterprise',
  gratuito: 'free',
  free: 'free',
};

interface MigrationAction {
  email: string;
  current: string;
  proposed: string;
  reason: string;
  excluded?: boolean;
}

function main() {
  const dbPath = path.resolve(process.cwd(), 'menu_data.json');
  if (!fs.existsSync(dbPath)) {
    console.error(`No se encontró ${dbPath}. Ejecuta desde la raíz del repo.`);
    process.exit(1);
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const users: any[] = Array.isArray(db.users) ? db.users : [];

  const actions: MigrationAction[] = [];
  for (const u of users) {
    const email = String(u.email || '').toLowerCase();
    const role = String(u.role || '').toLowerCase();
    const planName = String(u.plan || '');
    const planId = String(u.planId || '').toLowerCase();
    const status = String(u.status || '');

    if (EXCLUDED_EMAILS.includes(email)) {
      actions.push({ email, current: `${planName} (${status})`, proposed: '(sin cambios)', reason: 'Excluido: conserva su plan', excluded: true });
      continue;
    }
    if (role === 'superadmin' || role === 'admin') {
      actions.push({ email, current: `${planName} (${status})`, proposed: '(sin cambios)', reason: 'Rol administrativo', excluded: true });
      continue;
    }
    if (status === 'activo' && PLAN_IDS[planId]) {
      const proposed = planId === 'free' ? 'free (ya es gratuito)' : `${planId} (normalizar planId)`;
      actions.push({ email, current: `${planName} (${status})`, proposed, reason: 'Usuario pago activo: se mantiene' });
      continue;
    }
    if (status === 'pendiente_pago') {
      actions.push({ email, current: `${planName} (${status})`, proposed: 'free', reason: 'Registro legacy sin pago → freemium' });
      continue;
    }
    actions.push({ email, current: `${planName || '(sin plan)'} (${status || 'sin estado'})`, proposed: 'free', reason: 'Sin plan válido → freemium' });
  }

  console.log('=== MIGRACIÓN FREEMIUM — ' + (EXECUTE ? 'EJECUCIÓN' : 'DRY-RUN') + ' ===\n');
  for (const a of actions) {
    const tag = a.excluded ? '[EXCLUIDO]' : '[MIGRAR]  ';
    console.log(`${tag} ${a.email}`);
    console.log(`          actual: ${a.current} → propuesto: ${a.proposed}`);
    console.log(`          motivo: ${a.reason}`);
  }
  const toMigrate = actions.filter((a) => !a.excluded && !a.proposed.startsWith('(sin cambios)') && !a.proposed.includes('ya es gratuito') && !a.proposed.includes('normalizar'));
  const toNormalize = actions.filter((a) => a.proposed.includes('normalizar'));
  console.log(`\nTotal usuarios: ${actions.length} | A migrar a free: ${toMigrate.length} | A normalizar: ${toNormalize.length} | Excluidos: ${actions.filter((a) => a.excluded).length}`);

  if (!EXECUTE) {
    console.log('\n(DRY-RUN) No se modificó nada. Para ejecutar: npx tsx scripts/migrate-freemium.ts --execute');
    return;
  }

  // --- Ejecución real (solo con --execute) ---
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\n¿Confirmas la migración? Escribe SI: ', (answer: string) => {
    rl.close();
    if (String(answer).trim().toUpperCase() !== 'SI') {
      console.log('Cancelado.');
      return;
    }
    let changed = 0;
    for (const u of users) {
      const email = String(u.email || '').toLowerCase();
      const role = String(u.role || '').toLowerCase();
      if (EXCLUDED_EMAILS.includes(email) || role === 'superadmin' || role === 'admin') continue;
      const planId = String(u.planId || '').toLowerCase();
      const status = String(u.status || '');
      if (status === 'activo' && PLAN_IDS[planId] && planId !== 'free') {
        u.planId = planId; // normalizar
        changed++;
        continue;
      }
      // Migrar a free
      u.plan = 'Gratuito';
      u.planId = 'free';
      u.status = 'activo';
      if (!u.lastActivityAt) u.lastActivityAt = u.createdAt || new Date().toISOString();
      delete u.pendingOrderId;
      changed++;
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`\nMigración completada: ${changed} usuarios actualizados.`);
    console.log('IMPORTANTE: esto modificó menu_data.json LOCAL. La migración de producción debe hacerse vía MCP contra la DB real.');
  });
}

main();
