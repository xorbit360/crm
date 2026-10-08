import type { Express, Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);

type McpRole = 'superadmin' | 'user';
type McpDeps = {
  projectRoot: string;
  getDB: () => any;
  saveDB: (next: any) => void;
};

const PROTOCOL_VERSION = '2025-06-18';
const SUPER_TOKEN = () => process.env.MCP_SUPERADMIN_TOKEN || '';
const USER_TOKEN = () => process.env.MCP_USER_TOKEN || '';

function tokenFor(req: Request, role: McpRole): boolean {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const expected = role === 'superadmin' ? SUPER_TOKEN() : USER_TOKEN();
  return Boolean(expected && token && token.length >= 32 && token === expected);
}

function jsonRpc(res: Response, id: unknown, result: unknown, status = 200) {
  return res.status(status).json({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(res: Response, id: unknown, code: number, message: string, status = 400) {
  return res.status(status).json({ jsonrpc: '2.0', id, error: { code, message } });
}

function textResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

const userTools = [
  { name: 'health_check', description: 'Consulta el estado operativo del CRM.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'analytics_summary', description: 'Obtiene un resumen de KPIs visibles para el usuario.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'catalog_list', description: 'Consulta el catálogo del usuario.', inputSchema: { type: 'object', properties: { limit: { type: 'number', maximum: 100 } }, additionalProperties: false } },
  { name: 'chatbot_config_get', description: 'Lee la configuración del chatbot del usuario, sin revelar secretos.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'chatbot_config_update', description: 'Actualiza campos permitidos de configuración del chatbot.', inputSchema: { type: 'object', properties: { greeting: { type: 'string', maxLength: 2000 }, rules: { type: 'array', maxItems: 50 }, enabled: { type: 'boolean' } }, additionalProperties: false } }
];

const superTools = [
  ...userTools,
  { name: 'project_read_file', description: 'Lee un archivo de código permitido del proyecto. Nunca devuelve secretos.', inputSchema: { type: 'object', required: ['path'], properties: { path: { type: 'string', maxLength: 240 } }, additionalProperties: false } },
  { name: 'project_write_file', description: 'Escribe un archivo de código permitido del proyecto sin secretos.', inputSchema: { type: 'object', required: ['path', 'content'], properties: { path: { type: 'string', maxLength: 240 }, content: { type: 'string', maxLength: 300000 } }, additionalProperties: false } },
  { name: 'git_status', description: 'Consulta el estado del repositorio Git.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'git_diff', description: 'Consulta diferencias no comprometidas del repositorio.', inputSchema: { type: 'object', properties: { staged: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'git_commit', description: 'Crea un commit solo con rutas de código indicadas.', inputSchema: { type: 'object', required: ['message'], properties: { message: { type: 'string', minLength: 5, maxLength: 120 }, paths: { type: 'array', items: { type: 'string', maxLength: 240 }, maxItems: 25 } }, additionalProperties: false } },
  { name: 'git_push', description: 'Publica el branch actual en su remoto Git configurado.', inputSchema: { type: 'object', properties: { branch: { type: 'string', pattern: '^[a-zA-Z0-9._/-]+$' } }, additionalProperties: false } },
  { name: 'app_state_summary', description: 'Resume el estado operativo sin exponer tokens ni contraseñas.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'app_state_update', description: 'Actualiza campos operativos explícitamente autorizados.', inputSchema: { type: 'object', required: ['patch'], properties: { patch: { type: 'object' } }, additionalProperties: false } }
];

function safeProjectPath(projectRoot: string, requested: string): string {
  const normalized = requested.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.startsWith('.env') || normalized.includes('/.env')) {
    throw new Error('Ruta no permitida');
  }
  const allowed = /^(src|server|landing|css|js|public|README\.md|package\.json|vite\.config\.(ts|js))\//.test(normalized) || /^(README\.md|package\.json|vite\.config\.(ts|js))$/.test(normalized);
  if (!allowed) throw new Error('Solo se pueden leer archivos de código del proyecto');
  const resolved = path.resolve(projectRoot, normalized);
  if (!resolved.startsWith(path.resolve(projectRoot) + path.sep)) throw new Error('Ruta fuera del proyecto');
  return resolved;
}

function safeGitPath(requested: string): string {
  const normalized = requested.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.startsWith('.env') || normalized.includes('/.env') || normalized === 'dist' || normalized.startsWith('dist/')) {
    throw new Error(`Ruta Git no permitida: ${requested}`);
  }
  const allowed = /^(src|server|landing|css|js|public)(\/|$)/.test(normalized) || /^(README\.md|package\.json|package-lock\.json|vite\.config\.(ts|js)|server\.ts|Dockerfile)$/.test(normalized);
  if (!allowed) throw new Error(`Ruta Git fuera del alcance seguro: ${requested}`);
  return normalized;
}

function redact(value: any): any {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out: any = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|apikey|api_key|privatekey|service.?role/i.test(key)) out[key] = '[REDACTED]';
    else out[key] = redact(item);
  }
  return out;
}

async function runGit(projectRoot: string, args: string[]) {
  const result = await execFileAsync('git', args, { cwd: projectRoot, maxBuffer: 1024 * 1024 });
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

async function callTool(role: McpRole, name: string, args: any, deps: McpDeps): Promise<unknown> {
  const db = deps.getDB() || {};
  if (name === 'health_check') return { status: 'ok', service: 'crm', at: new Date().toISOString() };
  if (name === 'analytics_summary') return redact({ analytics: db.analytics || {}, orders: Array.isArray(db.orders) ? db.orders.length : 0, chats: Array.isArray(db.chats) ? db.chats.length : 0 });
  if (name === 'catalog_list') return redact({ products: (Array.isArray(db.products) ? db.products : []).slice(0, Math.min(100, Math.max(1, Number(args?.limit) || 50))) });
  if (name === 'chatbot_config_get') return redact({ chatbot: db.chatbotConfig || db.whatsappBotConfig || {} });
  if (name === 'chatbot_config_update') {
    const patch = args || {};
    const next = { ...(db.chatbotConfig || db.whatsappBotConfig || {}) };
    if (typeof patch.greeting === 'string') next.greeting = patch.greeting;
    if (Array.isArray(patch.rules)) next.rules = patch.rules;
    if (typeof patch.enabled === 'boolean') next.enabled = patch.enabled;
    db.chatbotConfig = next;
    deps.saveDB(db);
    return { success: true, chatbot: redact(next) };
  }
  if (role !== 'superadmin') throw new Error('Herramienta reservada para Super Admin');
  if (name === 'project_read_file') {
    const file = safeProjectPath(deps.projectRoot, String(args?.path || ''));
    const content = await fs.readFile(file, 'utf8');
    return { path: path.relative(deps.projectRoot, file).replace(/\\/g, '/'), content: content.slice(0, 200000), truncated: content.length > 200000 };
  }
  if (name === 'project_write_file') {
    const requested = String(args?.path || '');
    const content = String(args?.content ?? '');
    if (content.length > 300000) throw new Error('El archivo supera el límite de 300 KB');
    const file = safeProjectPath(deps.projectRoot, requested);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf8');
    return { success: true, path: path.relative(deps.projectRoot, file).replace(/\\/g, '/'), bytes: Buffer.byteLength(content, 'utf8') };
  }
  if (name === 'git_status') return runGit(deps.projectRoot, ['status', '--short', '--branch']);
  if (name === 'git_diff') return runGit(deps.projectRoot, args?.staged ? ['diff', '--cached', '--stat'] : ['diff', '--stat']);
  if (name === 'git_commit') {
    const message = String(args?.message || '').trim();
    if (!message || message.length < 5) throw new Error('El mensaje del commit es obligatorio');
    const requestedPaths = Array.isArray(args?.paths) && args.paths.length > 0 ? args.paths : ['src', 'server', 'package.json', 'package-lock.json', 'vite.config.ts', 'server.ts'];
    const paths = requestedPaths.map((item: unknown) => safeGitPath(String(item)));
    await runGit(deps.projectRoot, ['add', '--', ...paths]);
    return runGit(deps.projectRoot, ['commit', '-m', message]);
  }
  if (name === 'git_push') return runGit(deps.projectRoot, ['push', 'origin', String(args?.branch || 'main')]);
  if (name === 'app_state_summary') return redact({ keys: Object.keys(db), users: Array.isArray(db.users) ? db.users.length : 0, chats: Array.isArray(db.chats) ? db.chats.length : 0, channels: db.channels || [] });
  if (name === 'app_state_update') {
    const patch = args?.patch;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('patch debe ser un objeto');
    const forbidden = Object.keys(patch).filter(key => /token|secret|password|credential|api.?key/i.test(key));
    if (forbidden.length) throw new Error(`Campos protegidos: ${forbidden.join(', ')}`);
    deps.saveDB({ ...db, ...patch });
    return { success: true, updated: Object.keys(patch) };
  }
  throw new Error(`Herramienta desconocida: ${name}`);
}

export function setupMcpRoutes(app: Express, deps: McpDeps) {
  const handler = (role: McpRole) => async (req: Request, res: Response) => {
    if (!tokenFor(req, role)) return res.status(401).json({ error: 'MCP no autorizado' });
    const body = req.body || {};
    const id = body.id ?? null;
    if (!body.method) return jsonRpcError(res, id, -32600, 'Solicitud MCP inválida');
    if (body.method === 'notifications/initialized' || body.method === 'notifications/cancelled') return res.status(202).end();
    if (body.method === 'initialize') return jsonRpc(res, id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: role === 'superadmin' ? 'xorbit360-superadmin' : 'xorbit360-user', version: '1.0.0' } });
    if (body.method === 'ping') return jsonRpc(res, id, {});
    if (body.method === 'tools/list') return jsonRpc(res, id, { tools: role === 'superadmin' ? superTools : userTools });
    if (body.method === 'tools/call') {
      try {
        const output = await callTool(role, String(body.params?.name || ''), body.params?.arguments || {}, deps);
        return jsonRpc(res, id, output);
      } catch (error: any) {
        return jsonRpcError(res, id, -32000, error?.message || 'Error ejecutando herramienta', 400);
      }
    }
    return jsonRpcError(res, id, -32601, `Método no soportado: ${body.method}`);
  };

  app.get('/api/mcp/manifest', (_req, res) => res.json({ name: 'Xorbit 360 MCP', protocol: PROTOCOL_VERSION, endpoints: { superadmin: '/api/mcp/superadmin', user: '/api/mcp/user' }, authentication: 'Bearer token in Authorization header', tools: { superadmin: superTools.map(t => t.name), user: userTools.map(t => t.name) } }));
  app.post('/api/mcp/superadmin', handler('superadmin'));
  app.post('/api/mcp/user', handler('user'));
  // Alias conservado para clientes antiguos; requiere token de Super Admin.
  app.post('/api/mcp/execute', handler('superadmin'));
}
