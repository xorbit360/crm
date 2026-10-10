import React, { useEffect, useState } from 'react';
import {
  CalendarClock, Check, Copy, ExternalLink, Gauge, KeyRound, Mail, MessageSquare,
  RefreshCw, Save, ShieldCheck,
} from 'lucide-react';

// ============================================================================
// Diagnóstico de Conversión (Xorbit 360): sección dentro de Landings con la
// URL pública compartible, la lista de diagnósticos/leads y los ajustes de
// notificación (correo de aviso, WhatsApp del botón y clave del proveedor de
// correo cifrada de solo escritura; jamás se muestra la clave guardada).
// ============================================================================

interface DiagLead {
  id: string;
  store_url: string;
  domain: string;
  name: string;
  whatsapp: string;
  score_total: number | null;
  scores: any;
  findings: any[];
  status: string;
  preferred_at: string | null;
  source: string;
  notify_status: string | null;
  created_at: string;
}

interface DiagSettings {
  notifyEmail: string;
  whatsappNumber: string;
  whatsappInstance: string;
  notifyOnDiagnostic: boolean;
  notifyOnSchedule: boolean;
  emailFrom: string;
  emailApiKeySet: boolean;
  emailApiKeyMasked: string | null;
  emailReady: boolean;
  encryptionEnabled: boolean;
  publicUrl: string;
}

const inputCls = 'w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-gold/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';
const btnGold = 'inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50 cursor-pointer';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800 disabled:opacity-50 cursor-pointer';

async function api(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...(options || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

function gradeOf(scores: any): string {
  return scores && scores.grade ? String(scores.grade) : '';
}

export default function DiagnosticoView() {
  const [leads, setLeads] = useState<DiagLead[]>([]);
  const [settings, setSettings] = useState<DiagSettings | null>(null);
  const [emailKeyInput, setEmailKeyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function flash(text: string) { setMessage(text); setError(''); }
  function fail(e: any) { setError(String(e?.message || e)); }

  async function loadAll() {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([api('/api/diagnostic/leads'), api('/api/diagnostic/settings')]);
      setLeads(l.leads || []);
      setSettings(s.settings || null);
    } catch (e: any) { fail(e); } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSaveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: any = {
        notifyEmail: settings.notifyEmail,
        whatsappNumber: settings.whatsappNumber,
        whatsappInstance: settings.whatsappInstance,
        notifyOnDiagnostic: settings.notifyOnDiagnostic,
        notifyOnSchedule: settings.notifyOnSchedule,
        emailFrom: settings.emailFrom,
      };
      if (emailKeyInput.trim()) payload.emailApiKey = emailKeyInput.trim();
      const json = await api('/api/diagnostic/settings', { method: 'PUT', body: JSON.stringify(payload) });
      setSettings(json.settings);
      setEmailKeyInput('');
      flash('Ajustes del diagnóstico guardados.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  async function handleClearKey() {
    setSaving(true);
    try {
      const json = await api('/api/diagnostic/settings', { method: 'PUT', body: JSON.stringify({ clearEmailApiKey: true }) });
      setSettings(json.settings);
      flash('Clave del proveedor de correo eliminada.');
    } catch (e: any) { fail(e); } finally { setSaving(false); }
  }

  function copyPublicUrl() {
    if (!settings) return;
    navigator.clipboard?.writeText(settings.publicUrl).catch(() => {});
    flash('URL del diagnóstico copiada. Compártela donde quieras.');
  }

  function set<K extends keyof DiagSettings>(key: K, value: DiagSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const scheduled = leads.filter((l) => l.status === 'agendado').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-3 text-gold">
            <Gauge size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Diagnóstico de Conversión</h2>
            <p className="max-w-2xl text-sm text-gray-400">
              Tu página pública gratuita de análisis de tiendas: el visitante pega su URL, recibe su puntaje con las
              fugas detectadas y puede agendar una llamada contigo. Cada diagnóstico queda guardado aquí como lead.
            </p>
          </div>
        </div>
        <button className={btnGhost} onClick={loadAll} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
          {error || message}
        </div>
      )}

      {/* URL pública */}
      <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
        <label className={labelCls}>URL pública para compartir (gratis para tus prospectos)</label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-emerald-300">
            {settings?.publicUrl || 'https://crm.xorbit360.com/diagnostico'}
          </code>
          <button className={btnGhost} onClick={copyPublicUrl}><Copy size={13} /> Copiar</button>
          <a className={btnGhost} href={settings?.publicUrl || 'https://crm.xorbit360.com/diagnostico'} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> Ver en directo
          </a>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {leads.length} diagnóstico(s) recibidos · {scheduled} con llamada agendada.
        </p>
      </div>

      {/* Leads */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-white">Diagnósticos y agendas</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : !leads.length ? (
          <p className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-5 text-sm text-gray-500">
            Aún no llega el primer diagnóstico. Comparte la URL de arriba en tus redes o con tus prospectos.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/80 text-gray-500">
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Fecha</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Tienda</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Puntaje</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Nombre</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">WhatsApp</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Agenda pedida</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Aviso</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-800/60 bg-gray-950/40 text-gray-300">
                    <td className="px-3 py-2.5 whitespace-nowrap">{new Date(lead.created_at).toLocaleString('es-CO')}</td>
                    <td className="px-3 py-2.5">
                      {lead.store_url ? (
                        <a href={lead.store_url} target="_blank" rel="noreferrer" className="font-semibold text-gold hover:underline">
                          {lead.domain || lead.store_url}
                        </a>
                      ) : (
                        <span className="text-gray-500">Agenda directa</span>
                      )}
                      <div className="text-[10px] text-gray-500">{Array.isArray(lead.findings) ? lead.findings.length : 0} fugas detectadas</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {lead.score_total == null ? '—' : (
                        <span className="font-black text-white">{lead.score_total}<span className="text-gray-500">/100</span>{gradeOf(lead.scores) ? ` · ${gradeOf(lead.scores)}` : ''}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{lead.name || '—'}</td>
                    <td className="px-3 py-2.5 font-mono">{lead.whatsapp || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lead.status === 'agendado' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-700/40 text-gray-300'}`}>
                        {lead.status === 'agendado' ? 'AGENDADO' : 'NUEVO'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {lead.preferred_at ? new Date(lead.preferred_at).toLocaleString('es-CO') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-gray-500">{lead.notify_status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ajustes */}
      {settings && (
        <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 sm:p-5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck size={15} className="text-gold" /> Ajustes de notificación</h3>
          <p className="mb-4 text-xs text-gray-500">
            Estos datos viven solo en tu servidor: el correo nunca aparece en la página pública. El número de WhatsApp
            se usa para avisarte a ti y como destino del botón flotante de la página.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}><span className="inline-flex items-center gap-1.5"><Mail size={12} /> Correo que recibe los avisos</span></label>
              <input className={inputCls} type="email" value={settings.notifyEmail} onChange={(e) => set('notifyEmail', e.target.value)} placeholder="tucorreo@ejemplo.com" />
            </div>
            <div>
              <label className={labelCls}><span className="inline-flex items-center gap-1.5"><MessageSquare size={12} /> Tu WhatsApp (avisos y botón de la página)</span></label>
              <input className={inputCls} value={settings.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="573001234567" />
            </div>
            <div>
              <label className={labelCls}>Instancia de WhatsApp del servidor (opcional)</label>
              <input className={inputCls} value={settings.whatsappInstance} onChange={(e) => set('whatsappInstance', e.target.value)} placeholder="Se detecta automática si lo dejas vacío" />
            </div>
            <div>
              <label className={labelCls}>Remitente del correo (opcional)</label>
              <input className={inputCls} value={settings.emailFrom} onChange={(e) => set('emailFrom', e.target.value)} placeholder="Xorbit 360 <avisos@tudominio.com>" />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-gray-300">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={settings.notifyOnSchedule} onChange={(e) => set('notifyOnSchedule', e.target.checked)} />
              <CalendarClock size={14} className="text-gold" /> Avisarme cuando alguien agenda una llamada
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={settings.notifyOnDiagnostic} onChange={(e) => set('notifyOnDiagnostic', e.target.checked)} />
              <Gauge size={14} className="text-gold" /> Avisarme también con cada diagnóstico nuevo (sin agenda)
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/30 p-4">
            <label className={labelCls}><span className="inline-flex items-center gap-1.5"><KeyRound size={12} /> Clave del proveedor de correo (Resend)</span></label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputCls} flex-1`}
                type="password"
                value={emailKeyInput}
                onChange={(e) => setEmailKeyInput(e.target.value)}
                placeholder={settings.emailApiKeySet ? 'Clave guardada: pega otra solo si la vas a reemplazar' : 'Pega aquí la clave de tu proveedor de correo'}
                autoComplete="new-password"
              />
              {settings.emailApiKeySet && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  <Check size={12} /> Guardada {settings.emailApiKeyMasked || ''}
                </span>
              )}
              {settings.emailApiKeySet && (
                <button className={btnGhost} onClick={handleClearKey} disabled={saving}>Eliminar clave</button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {settings.emailReady
                ? 'El aviso por correo está listo: tienes clave del proveedor y correo de destino.'
                : 'Estado del correo: pendiente. Sin clave del proveedor, los avisos salen por WhatsApp y quedan registrados aquí; pega tu clave de Resend y desde ese momento también llega el correo. La clave se guarda cifrada en el servidor y nunca se muestra.'}
              {!settings.encryptionEnabled && ' (El cifrado del servidor no está disponible: no pegues la clave todavía.)'}
            </p>
          </div>

          <div className="mt-5">
            <button className={btnGold} onClick={handleSaveSettings} disabled={saving}>
              <Save size={14} /> {saving ? 'Guardando…' : 'Guardar ajustes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
